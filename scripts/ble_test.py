#!/usr/bin/env python3
"""
WaterTank BLE Protocol Test Suite — Phase A
Tests firmware GATT behavior independently of the React Native app.

Usage:
  python3 scripts/ble_test.py           # auto-scan for WaterTank device
  python3 scripts/ble_test.py <MAC/UUID> # target specific device address

Pass/fail per test case. Summary at end.
"""

import asyncio
import json
import struct
import sys
import time
from dataclasses import dataclass, field
from typing import Optional

from bleak import BleakClient, BleakScanner

# ── UUIDs (must match constants/ble.ts and WaterTank.ino) ─────────────────────
SVC      = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
C_STATE  = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
C_TANK   = "beb5483f-36e1-4688-b7f5-ea07361b26a8"
C_LOGCTL = "beb54840-36e1-4688-b7f5-ea07361b26a8"
C_LOGDAT = "beb54841-36e1-4688-b7f5-ea07361b26a8"
C_TSYNC  = "beb54842-36e1-4688-b7f5-ea07361b26a8"

SCAN_TIMEOUT   = 15   # seconds to scan
NOTIFY_COLLECT = 7    # seconds to collect notifications
LOG_TIMEOUT    = 5    # seconds to wait for DONE sentinel

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
INFO = "\033[34mINFO\033[0m"

# ── Test result tracking ───────────────────────────────────────────────────────
results: list[tuple[str, bool, str]] = []

def record(name: str, ok: bool, detail: str = ""):
    results.append((name, ok, detail))
    status = PASS if ok else FAIL
    print(f"  [{status}] {name}" + (f" — {detail}" if detail else ""))

# ── Helpers ───────────────────────────────────────────────────────────────────
def parse_state(data: bytes) -> Optional[dict]:
    try:
        return json.loads(data.decode())
    except Exception:
        return None

# ── Test implementations ───────────────────────────────────────────────────────

async def test_scan(target_addr: Optional[str]) -> Optional[object]:
    print(f"\n[T1] BLE Advertisement scan (timeout {SCAN_TIMEOUT}s)")
    if target_addr:
        print(f"  [{INFO}] Targeting address: {target_addr}")
        return type("D", (), {"address": target_addr, "name": "WaterTank"})()

    device = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "WATERTANK" in d.name.upper(),
        timeout=SCAN_TIMEOUT,
    )
    record("T1.1 device found in scan", device is not None,
           f"addr={device.address}" if device else "timed out — is board powered on?")
    if not device:
        return None

    record("T1.2 device name is 'WaterTank'", device.name == "WaterTank",
           f"got '{device.name}'")
    return device


async def test_connect_and_services(client: BleakClient):
    print("\n[T2] GATT service / characteristic discovery")
    services = client.services
    svc = services.get_service(SVC)
    record("T2.1 service UUID present", svc is not None, SVC)
    if not svc:
        return

    expected = {
        "C_STATE":  C_STATE,
        "C_TANK":   C_TANK,
        "C_LOGCTL": C_LOGCTL,
        "C_LOGDAT": C_LOGDAT,
        "C_TSYNC":  C_TSYNC,
    }
    for label, uuid in expected.items():
        char = svc.get_characteristic(uuid)
        record(f"T2.2 {label} characteristic exists", char is not None, uuid)


async def test_notifications(client: BleakClient):
    print(f"\n[T3] State + Tank notifications ({NOTIFY_COLLECT}s window)")

    state_msgs: list[tuple[float, dict]] = []
    tank_msgs:  list[tuple[float, str]]  = []

    def on_state(_, data: bytearray):
        parsed = parse_state(bytes(data))
        if parsed is not None:
            state_msgs.append((time.monotonic(), parsed))

    def on_tank(_, data: bytearray):
        tank_msgs.append((time.monotonic(), data.decode(errors="replace")))

    await client.start_notify(C_STATE, on_state)
    await client.start_notify(C_TANK,  on_tank)
    await asyncio.sleep(NOTIFY_COLLECT)
    await client.stop_notify(C_STATE)
    await client.stop_notify(C_TANK)

    # T3.1 — received at least 2 state notifications
    record("T3.1 C_STATE notifications arriving", len(state_msgs) >= 2,
           f"received {len(state_msgs)} in {NOTIFY_COLLECT}s")

    # T3.2 — cadence ~2s
    if len(state_msgs) >= 2:
        gaps = [state_msgs[i+1][0] - state_msgs[i][0]
                for i in range(len(state_msgs) - 1)]
        avg_gap = sum(gaps) / len(gaps)
        record("T3.2 C_STATE cadence ~2s", 1.5 <= avg_gap <= 3.0,
               f"avg gap {avg_gap:.2f}s")

    # T3.3 — state JSON has required fields
    if state_msgs:
        sample = state_msgs[-1][1]
        required = {"state", "motor", "manual", "tank"}
        missing = required - sample.keys()
        record("T3.3 C_STATE JSON has required fields", not missing,
               f"missing={missing}" if missing else str(sample))

        # T3.4 — field types correct
        ok = (isinstance(sample.get("state"), int)
              and isinstance(sample.get("motor"), bool)
              and isinstance(sample.get("manual"), bool)
              and isinstance(sample.get("tank"), (int, float)))
        record("T3.4 C_STATE field types correct", ok, str(sample))

        # T3.5 — tank in [0, 100]
        tank_val = sample.get("tank", -1)
        record("T3.5 C_STATE tank in [0, 100]", 0 <= tank_val <= 100,
               f"tank={tank_val}")

    # T3.6 — C_TANK notification received
    record("T3.6 C_TANK notifications arriving", len(tank_msgs) >= 2,
           f"received {len(tank_msgs)}")

    # T3.7 — C_TANK is parseable float in [0,100]
    if tank_msgs:
        raw = tank_msgs[-1][1]
        try:
            val = float(raw)
            ok = 0 <= val <= 100
        except ValueError:
            val, ok = raw, False
        record("T3.7 C_TANK value parseable float [0,100]", ok, f"raw='{raw}'")

    return state_msgs, tank_msgs


async def test_timesync(client: BleakClient, state_msgs_before: list):
    print("\n[T4] Time-sync write (C_TIMESYNC)")
    epoch = int(time.time())
    payload = struct.pack("<I", epoch)  # little-endian uint32

    try:
        await client.write_gatt_char(C_TSYNC, payload, response=False)
        synced = True
    except Exception as e:
        synced = False
        record("T4.1 C_TIMESYNC write accepted", False, str(e))
        return

    record("T4.1 C_TIMESYNC write accepted", True, f"epoch={epoch}")

    # collect one more state notify to confirm board still alive after write
    got_state = asyncio.Event()
    def on_state_probe(_, __): got_state.set()
    await client.start_notify(C_STATE, on_state_probe)
    try:
        await asyncio.wait_for(got_state.wait(), timeout=4)
        alive = True
    except asyncio.TimeoutError:
        alive = False
    await client.stop_notify(C_STATE)
    record("T4.2 board still notifying after timesync write", alive)


async def test_log_stream(client: BleakClient):
    print("\n[T5] Log stream (C_LOGCTRL write → C_LOGDAT notifications)")

    log_frames: list[str] = []
    done_event = asyncio.Event()

    def on_logdat(_, data: bytearray):
        frame = data.decode(errors="replace").strip()
        log_frames.append(frame)
        if frame == "DONE":
            done_event.set()

    await client.start_notify(C_LOGDAT, on_logdat)
    await asyncio.sleep(0.3)  # let CCCD write reach firmware before triggering log
    await client.write_gatt_char(C_LOGCTL, bytes([0x01]), response=True)

    try:
        await asyncio.wait_for(done_event.wait(), timeout=LOG_TIMEOUT)
        got_done = True
    except asyncio.TimeoutError:
        got_done = False

    await client.stop_notify(C_LOGDAT)

    record("T5.1 C_LOGDAT notifications received", len(log_frames) > 0,
           f"{len(log_frames)} frames")
    record("T5.2 DONE sentinel received", got_done,
           "timed out" if not got_done else "")

    # T5.3 — at least one valid JSON log entry before DONE
    json_frames = [f for f in log_frames if f != "DONE"]
    valid = 0
    for frame in json_frames:
        try:
            obj = json.loads(frame)
            if all(k in obj for k in ("id", "t", "type", "tank")):
                valid += 1
        except Exception:
            pass
    record("T5.3 log entries are valid JSON with required fields", valid >= 1,
           f"{valid}/{len(json_frames)} valid")

    # T5.4 — ACK write (0x02) accepted without error
    try:
        await client.write_gatt_char(C_LOGCTL, bytes([0x02]), response=False)
        record("T5.4 ACK write (0x02) accepted", True)
    except Exception as e:
        record("T5.4 ACK write (0x02) accepted", False, str(e))

    return log_frames


async def test_reconnect(device):
    print("\n[T6] Disconnect + re-advertise")
    # Connect fresh, then disconnect, then check board re-advertises
    async with BleakClient(device.address) as c2:
        connected = c2.is_connected
        record("T6.1 second connection succeeds", connected)

    # After disconnect board should restart advertising
    await asyncio.sleep(2)
    rediscovered = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "WATERTANK" in d.name.upper(),
        timeout=8,
    )
    record("T6.2 board re-advertises after disconnect",
           rediscovered is not None,
           f"addr={rediscovered.address}" if rediscovered else "not found in 8s")


# ── Main ───────────────────────────────────────────────────────────────────────

async def main():
    target = sys.argv[1] if len(sys.argv) > 1 else None

    print("=" * 58)
    print("  WaterTank BLE Protocol Test Suite")
    print("=" * 58)

    device = await test_scan(target)
    if not device:
        print("\nAborted: no device found.")
        return

    print(f"\n[T2-T5] Connecting to {device.address} …")
    state_msgs = []
    try:
        async with BleakClient(device.address, timeout=10) as client:
            record("connection established", client.is_connected)
            if not client.is_connected:
                return

            await test_connect_and_services(client)
            notify_result = await test_notifications(client)
            if notify_result:
                state_msgs, _ = notify_result
            await test_timesync(client, state_msgs)
            await test_log_stream(client)

    except Exception as e:
        print(f"\n  [{FAIL}] Unexpected error during T2-T5: {e}")

    await test_reconnect(device)

    # ── Summary ────────────────────────────────────────────────────────────────
    total  = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = total - passed

    print("\n" + "=" * 58)
    print(f"  Results: {passed}/{total} passed", end="")
    if failed:
        print(f"  ({failed} FAILED)")
        print("\n  Failed tests:")
        for name, ok, detail in results:
            if not ok:
                print(f"    - {name}" + (f": {detail}" if detail else ""))
    else:
        print("  — all green")
    print("=" * 58)


if __name__ == "__main__":
    asyncio.run(main())
