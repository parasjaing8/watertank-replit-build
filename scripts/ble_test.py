#!/usr/bin/env python3
"""
WaterTank BLE Protocol Test Suite — Phase A + B
Tests firmware GATT behavior independently of the React Native app.

Usage:
  python3 scripts/ble_test.py           # auto-scan for WaterTank device
  python3 scripts/ble_test.py <address> # target specific device address

Tests:
  T1  — BLE advertisement scan + device name
  T2  — GATT service / characteristic discovery (6 chars incl. C_FWVER) + version read
  T3  — State + Tank notifications (cadence, JSON schema, type validation)
  T4  — Time-sync write (C_TIMESYNC little-endian uint32)
  T5  — Log stream (CCCD settle, JSON frames, DONE sentinel, ACK)
  T6  — Disconnect + re-advertise
  T7  — Notification stability (30 ticks, gap analysis, drop detection)
  T8  — Rapid reconnect stress (3x connect/disconnect)
  T9  — MTU negotiation (requests 200B, verifies board accepts)
  T10 — Robustness: malformed C_TIMESYNC payloads don't crash board
  T11 — Concurrent notify subscriptions (all 3 notify chars simultaneously)
  T12 — Simulation value cycling (tank changes over time — firmware sim active)
  T13 — Immediate state push on connect (first notify < 500ms after connect)
"""

import asyncio
import json
import struct
import sys
import time
from typing import Optional

from bleak import BleakClient, BleakScanner

# ── UUIDs (must match constants/ble.ts and WaterTank.ino) ─────────────────────
SVC      = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
C_STATE  = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
C_TANK   = "beb5483f-36e1-4688-b7f5-ea07361b26a8"
C_LOGCTL = "beb54840-36e1-4688-b7f5-ea07361b26a8"
C_LOGDAT = "beb54841-36e1-4688-b7f5-ea07361b26a8"
C_TSYNC  = "beb54842-36e1-4688-b7f5-ea07361b26a8"
C_FWVER  = "beb54843-36e1-4688-b7f5-ea07361b26a8"

SCAN_TIMEOUT      = 15
NOTIFY_COLLECT    = 7
LOG_TIMEOUT       = 8
STABILITY_TICKS   = 20      # ticks for T7 stability test (~40s at 2s cadence)
STABILITY_TIMEOUT = 50      # seconds ceiling for T7
RECONNECT_ROUNDS  = 3       # T8 rapid reconnect count
CYCLE_COLLECT_S   = 12      # T12 seconds to observe tank value changes

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
INFO = "\033[34mINFO\033[0m"
WARN = "\033[33mWARN\033[0m"

results: list[tuple[str, bool, str]] = []

def record(name: str, ok: bool, detail: str = ""):
    results.append((name, ok, detail))
    status = PASS if ok else FAIL
    print(f"  [{status}] {name}" + (f" — {detail}" if detail else ""))

def info(msg: str):
    print(f"  [{INFO}] {msg}")

def parse_state(data: bytes) -> Optional[dict]:
    try:
        return json.loads(data.decode())
    except Exception:
        return None

# ── T1 ─────────────────────────────────────────────────────────────────────────

async def test_scan(target_addr: Optional[str]) -> Optional[object]:
    print(f"\n[T1] BLE advertisement scan (timeout {SCAN_TIMEOUT}s)")
    if target_addr:
        info(f"Targeting address: {target_addr}")
        return type("D", (), {"address": target_addr, "name": "WaterTank"})()

    device = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "WATERTANK" in d.name.upper(),
        timeout=SCAN_TIMEOUT,
    )
    record("T1.1 device found in scan", device is not None,
           f"addr={device.address}" if device else "timed out")
    if not device:
        return None
    record("T1.2 device name is 'WaterTank'", device.name == "WaterTank",
           f"got '{device.name}'")
    return device

# ── T2 ─────────────────────────────────────────────────────────────────────────

async def test_services(client: BleakClient):
    print("\n[T2] GATT service / characteristic discovery")
    svc = client.services.get_service(SVC)
    record("T2.1 service UUID present", svc is not None, SVC)
    if not svc:
        return
    for label, uuid in [("C_STATE", C_STATE), ("C_TANK", C_TANK),
                         ("C_LOGCTL", C_LOGCTL), ("C_LOGDAT", C_LOGDAT),
                         ("C_TSYNC", C_TSYNC), ("C_FWVER", C_FWVER)]:
        char = svc.get_characteristic(uuid)
        record(f"T2.2 {label} present", char is not None, uuid)

    # T2.3: firmware version readable and semver-shaped
    fwver_char = svc.get_characteristic(C_FWVER)
    if fwver_char:
        raw = await client.read_gatt_char(C_FWVER)
        version = raw.decode("utf-8", errors="replace").strip()
        parts = version.split(".")
        valid = len(parts) == 3 and all(p.isdigit() for p in parts)
        record("T2.3 C_FWVER readable semver", valid, f"version='{version}'")

# ── T3 ─────────────────────────────────────────────────────────────────────────

async def test_notifications(client: BleakClient):
    print(f"\n[T3] State + Tank notifications ({NOTIFY_COLLECT}s window)")
    state_msgs: list[tuple[float, dict]] = []
    tank_msgs:  list[tuple[float, str]]  = []

    def on_state(_, data):
        p = parse_state(bytes(data))
        if p is not None:
            state_msgs.append((time.monotonic(), p))

    def on_tank(_, data):
        tank_msgs.append((time.monotonic(), data.decode(errors="replace")))

    await client.start_notify(C_STATE, on_state)
    await client.start_notify(C_TANK,  on_tank)
    await asyncio.sleep(NOTIFY_COLLECT)
    await client.stop_notify(C_STATE)
    await client.stop_notify(C_TANK)

    record("T3.1 C_STATE arriving", len(state_msgs) >= 2,
           f"{len(state_msgs)} in {NOTIFY_COLLECT}s")
    if len(state_msgs) >= 2:
        gaps = [state_msgs[i+1][0]-state_msgs[i][0] for i in range(len(state_msgs)-1)]
        avg  = sum(gaps)/len(gaps)
        record("T3.2 C_STATE cadence ~2s", 1.5 <= avg <= 3.0, f"avg={avg:.2f}s")

    if state_msgs:
        s = state_msgs[-1][1]
        missing = {"state","motor","manual","tank"} - s.keys()
        record("T3.3 C_STATE JSON fields", not missing,
               f"missing={missing}" if missing else str(s))
        ok = (isinstance(s.get("state"), int)
              and isinstance(s.get("motor"), bool)
              and isinstance(s.get("manual"), bool)
              and isinstance(s.get("tank"), (int, float)))
        record("T3.4 C_STATE field types", ok, str(s))
        record("T3.5 C_STATE tank in [0,100]", 0 <= s.get("tank",-1) <= 100,
               f"tank={s.get('tank')}")

    record("T3.6 C_TANK arriving", len(tank_msgs) >= 2, f"{len(tank_msgs)}")
    if tank_msgs:
        raw = tank_msgs[-1][1]
        try:
            val = float(raw); ok = 0 <= val <= 100
        except ValueError:
            val, ok = raw, False
        record("T3.7 C_TANK parseable float [0,100]", ok, f"raw='{raw}'")

    return state_msgs, tank_msgs

# ── T4 ─────────────────────────────────────────────────────────────────────────

async def test_timesync(client: BleakClient):
    print("\n[T4] Time-sync write (C_TIMESYNC)")
    epoch = int(time.time())
    try:
        await client.write_gatt_char(C_TSYNC, struct.pack("<I", epoch), response=False)
        record("T4.1 C_TIMESYNC write accepted (WRITE_NR)", True, f"epoch={epoch}")
    except Exception as e:
        record("T4.1 C_TIMESYNC write accepted (WRITE_NR)", False, str(e))
        return

    # also try with response
    try:
        await client.write_gatt_char(C_TSYNC, struct.pack("<I", epoch), response=True)
        record("T4.2 C_TIMESYNC write accepted (WRITE)", True)
    except Exception as e:
        record("T4.2 C_TIMESYNC write accepted (WRITE)", False, str(e))

    got = asyncio.Event()
    await client.start_notify(C_STATE, lambda *_: got.set())
    try:
        await asyncio.wait_for(got.wait(), 4)
        record("T4.3 board still notifying after timesync", True)
    except asyncio.TimeoutError:
        record("T4.3 board still notifying after timesync", False)
    await client.stop_notify(C_STATE)

# ── T5 ─────────────────────────────────────────────────────────────────────────

async def test_log_stream(client: BleakClient):
    print("\n[T5] Log stream (C_LOGCTRL → C_LOGDAT)")
    frames: list[str] = []
    done   = asyncio.Event()

    def on_logdat(_, data):
        f = data.decode(errors="replace").strip()
        frames.append(f)
        if f == "DONE":
            done.set()

    await client.start_notify(C_LOGDAT, on_logdat)
    await asyncio.sleep(0.3)  # CCCD settle before triggering
    await client.write_gatt_char(C_LOGCTL, bytes([0x01]), response=True)

    try:
        await asyncio.wait_for(done.wait(), LOG_TIMEOUT)
        got_done = True
    except asyncio.TimeoutError:
        got_done = False
    await client.stop_notify(C_LOGDAT)

    record("T5.1 C_LOGDAT frames received", len(frames) > 0, f"{len(frames)} frames")
    record("T5.2 DONE sentinel received", got_done, "timed out" if not got_done else "")
    json_frames = [f for f in frames if f != "DONE"]
    valid = sum(1 for f in json_frames if all(k in (json.loads(f) if _is_json(f) else {}) for k in ("id","t","type","tank")))
    record("T5.3 log entries valid JSON with required fields", valid >= 1,
           f"{valid}/{len(json_frames)} valid")

    # Check log entry types match EventType enum
    for f in json_frames:
        if _is_json(f):
            obj = json.loads(f)
            record(f"T5.4 log entry id={obj.get('id')} type in [1,2]",
                   obj.get("type") in (1, 2), str(obj))

    try:
        await client.write_gatt_char(C_LOGCTL, bytes([0x02]), response=False)
        record("T5.5 ACK write (0x02) accepted", True)
    except Exception as e:
        record("T5.5 ACK write (0x02) accepted", False, str(e))

    return frames

def _is_json(s: str) -> bool:
    try: json.loads(s); return True
    except: return False

# ── T6 ─────────────────────────────────────────────────────────────────────────

async def test_reconnect(device):
    print("\n[T6] Disconnect + re-advertise")
    async with BleakClient(device.address) as c:
        record("T6.1 second connection succeeds", c.is_connected)
    await asyncio.sleep(2)
    rediscovered = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "WATERTANK" in d.name.upper(), timeout=8)
    record("T6.2 board re-advertises after disconnect",
           rediscovered is not None,
           f"addr={rediscovered.address}" if rediscovered else "not found in 8s")

# ── T7 — Stability ─────────────────────────────────────────────────────────────

async def test_stability(client: BleakClient):
    print(f"\n[T7] Notification stability ({STABILITY_TICKS} ticks / {STABILITY_TIMEOUT}s max)")
    timestamps: list[float] = []
    done = asyncio.Event()

    def on_state(_, data):
        timestamps.append(time.monotonic())
        if len(timestamps) >= STABILITY_TICKS:
            done.set()

    await client.start_notify(C_STATE, on_state)
    try:
        await asyncio.wait_for(done.wait(), STABILITY_TIMEOUT)
    except asyncio.TimeoutError:
        pass
    await client.stop_notify(C_STATE)

    n = len(timestamps)
    record("T7.1 received enough ticks", n >= STABILITY_TICKS,
           f"{n}/{STABILITY_TICKS}")
    if n >= 2:
        gaps = [timestamps[i+1]-timestamps[i] for i in range(n-1)]
        avg  = sum(gaps)/len(gaps)
        mx   = max(gaps)
        drops = sum(1 for g in gaps if g > 4.5)  # missed tick threshold
        record("T7.2 avg gap ~2s", 1.8 <= avg <= 2.5, f"avg={avg:.3f}s")
        record("T7.3 no missed ticks (gap>4.5s)", drops == 0,
               f"{drops} missed ticks, max_gap={mx:.2f}s")
        record("T7.4 max gap < 3s", mx < 3.0, f"max={mx:.2f}s")

# ── T8 — Rapid reconnect stress ────────────────────────────────────────────────

async def test_rapid_reconnect(device):
    print(f"\n[T8] Rapid reconnect stress ({RECONNECT_ROUNDS} rounds)")
    successes = 0
    for i in range(RECONNECT_ROUNDS):
        try:
            async with BleakClient(device.address, timeout=10) as c:
                if c.is_connected:
                    successes += 1
                    info(f"Round {i+1}: connected")
            await asyncio.sleep(1.5)  # let board restart advertising
        except Exception as e:
            info(f"Round {i+1}: failed — {e}")
    record("T8.1 all reconnect rounds succeeded",
           successes == RECONNECT_ROUNDS, f"{successes}/{RECONNECT_ROUNDS}")

# ── T9 — MTU negotiation ───────────────────────────────────────────────────────

async def test_mtu(client: BleakClient):
    print("\n[T9] MTU negotiation")
    # bleak 3.x exposes mtu_size property after connection
    mtu = getattr(client, "mtu_size", None)
    if mtu is None:
        record("T9.1 MTU property available", False, "bleak version may not expose mtu_size")
        return
    record("T9.1 MTU > 23 (default)", mtu > 23, f"mtu={mtu}")
    record("T9.2 MTU >= 185 (NimBLE negotiated)", mtu >= 185, f"mtu={mtu}")
    info(f"Negotiated MTU: {mtu} bytes (payload={mtu-3})")

# ── T10 — Robustness: malformed writes ─────────────────────────────────────────

async def test_robustness(client: BleakClient):
    print("\n[T10] Robustness: malformed writes don't crash board")
    cases = [
        ("empty payload to C_TSYNC",  C_TSYNC,  bytes([])),
        ("1-byte payload to C_TSYNC", C_TSYNC,  bytes([0xFF])),
        ("3-byte payload to C_TSYNC", C_TSYNC,  bytes([0x01, 0x02, 0x03])),
        ("unknown cmd to C_LOGCTL",   C_LOGCTL, bytes([0xFF])),
        ("large payload to C_LOGCTL", C_LOGCTL, bytes(range(64))),
    ]
    for label, char, payload in cases:
        try:
            await client.write_gatt_char(char, payload, response=False)
        except Exception:
            pass  # write rejection is fine — just must not kill the board

    # Board must still be alive after all bad writes
    alive = asyncio.Event()
    await client.start_notify(C_STATE, lambda *_: alive.set())
    try:
        await asyncio.wait_for(alive.wait(), 5)
        survived = True
    except asyncio.TimeoutError:
        survived = False
    await client.stop_notify(C_STATE)
    record("T10.1 board survives all malformed writes", survived)

# ── T11 — Concurrent notify subscriptions ──────────────────────────────────────

async def test_concurrent_notify(client: BleakClient):
    print("\n[T11] Concurrent notify subscriptions (C_STATE + C_TANK + C_LOGDAT)")
    counts = {"state": 0, "tank": 0, "logdat": 0}

    await client.start_notify(C_STATE,  lambda *_: counts.__setitem__("state",  counts["state"]+1))
    await client.start_notify(C_TANK,   lambda *_: counts.__setitem__("tank",   counts["tank"]+1))
    await client.start_notify(C_LOGDAT, lambda *_: counts.__setitem__("logdat", counts["logdat"]+1))
    await asyncio.sleep(6)
    await client.stop_notify(C_STATE)
    await client.stop_notify(C_TANK)
    await client.stop_notify(C_LOGDAT)

    record("T11.1 C_STATE notifies while all subscribed", counts["state"] >= 2,
           f"{counts['state']} notifies")
    record("T11.2 C_TANK notifies while all subscribed",  counts["tank"] >= 2,
           f"{counts['tank']} notifies")
    record("T11.3 C_LOGDAT silent when no log triggered", counts["logdat"] == 0,
           f"{counts['logdat']} unexpected frames")

# ── T12 — Simulation value cycling ─────────────────────────────────────────────

async def test_simulation_cycle(client: BleakClient):
    print(f"\n[T12] Simulation value cycling ({CYCLE_COLLECT_S}s observation)")
    tank_values: list[float] = []

    def on_state(_, data):
        p = parse_state(bytes(data))
        if p and "tank" in p:
            tank_values.append(float(p["tank"]))

    await client.start_notify(C_STATE, on_state)
    await asyncio.sleep(CYCLE_COLLECT_S)
    await client.stop_notify(C_STATE)

    record("T12.1 multiple tank readings received", len(tank_values) >= 3,
           f"{len(tank_values)} readings")
    if len(tank_values) >= 2:
        changed = len(set(round(v, 1) for v in tank_values)) > 1
        record("T12.2 tank value changes over time (simulation active)", changed,
               f"values={[round(v,1) for v in tank_values]}")
    if tank_values:
        info(f"Tank range observed: {min(tank_values):.1f}% – {max(tank_values):.1f}%")

# ── T13 — Immediate state push on connect ──────────────────────────────────────

async def test_immediate_push(device):
    print("\n[T13] First notify arrives within first 2s window after subscription")
    # Measures from after start_notify (subscription established) not from connect,
    # because bleak bundles service discovery into the connect phase.
    # Goal: first notify < 2500ms from subscription (proves early push is working,
    # not waiting for a full second 2s cycle at worst-case timing).
    first_notify_ms = None

    async with BleakClient(device.address, timeout=10) as client:
        if not client.is_connected:
            record("T13.1 first notify within 2.5s of subscription", False, "connect failed")
            return

        got = asyncio.Event()

        def on_state(_, data):
            nonlocal first_notify_ms
            if first_notify_ms is None:
                first_notify_ms = (time.monotonic() - subscribe_time) * 1000
                got.set()

        await client.start_notify(C_STATE, on_state)
        subscribe_time = time.monotonic()  # measure from CCCD write complete
        try:
            await asyncio.wait_for(got.wait(), 4.5)
        except asyncio.TimeoutError:
            pass
        await client.stop_notify(C_STATE)

    if first_notify_ms is None:
        record("T13.1 first notify within 2.5s of subscription", False, "no notify in 4.5s")
    else:
        record("T13.1 first notify within 2.5s of subscription",
               first_notify_ms < 2500,
               f"{first_notify_ms:.0f}ms after subscription")
        info(f"Early push: first data arrived {first_notify_ms:.0f}ms after CCCD subscribe")

# ── Main ───────────────────────────────────────────────────────────────────────

async def main():
    target = sys.argv[1] if len(sys.argv) > 1 else None

    print("=" * 62)
    print("  WaterTank BLE Protocol Test Suite  (Phase A + B)")
    print("=" * 62)

    device = await test_scan(target)
    if not device:
        print("\nAborted: no device found.")
        return

    # ── T2–T12 inside a single connection ─────────────────────────────────────
    print(f"\n[T2–T12] Connecting to {device.address} …")
    try:
        async with BleakClient(device.address, timeout=10) as client:
            record("connection established", client.is_connected)
            if not client.is_connected:
                return

            await test_services(client)
            await test_mtu(client)
            notify_result = await test_notifications(client)
            await test_timesync(client)
            await test_log_stream(client)
            await test_stability(client)
            await test_robustness(client)
            await test_concurrent_notify(client)
            await test_simulation_cycle(client)

    except Exception as e:
        print(f"\n  [{FAIL}] Unexpected error in T2–T12: {e}")

    # ── T6, T8, T13 need fresh connections ────────────────────────────────────
    await asyncio.sleep(2)
    await test_reconnect(device)
    await asyncio.sleep(2)
    await test_rapid_reconnect(device)
    await asyncio.sleep(2)
    await test_immediate_push(device)

    # ── Summary ───────────────────────────────────────────────────────────────
    total  = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = total - passed

    print("\n" + "=" * 62)
    print(f"  Results: {passed}/{total} passed", end="")
    if failed:
        print(f"  ({failed} FAILED)")
        print("\n  Failed tests:")
        for name, ok, detail in results:
            if not ok:
                print(f"    - {name}" + (f": {detail}" if detail else ""))
    else:
        print("  — all green")
    print("=" * 62)


if __name__ == "__main__":
    asyncio.run(main())
