#!/usr/bin/env python3
"""
WaterTank Auth BLE Test Suite — Phase 4 (firmware v1.3.0+)

Tests firmware auth characteristics against real hardware.
Board must be in factory state (unclaimed). Use --reset-board to OTA-reset automatically.

Usage:
  python3 scripts/auth_test.py                    # auto-scan, board must be factory state
  python3 scripts/auth_test.py <address>           # target device UUID / MAC
  python3 scripts/auth_test.py --skip-reset        # skip RESET_01 (hold BOOT 10s manually)
  python3 scripts/auth_test.py --reset-board       # OTA NVS-clear before test (needs WiFi)

--reset-board requires board on 192.168.0.126 and firmware compiled in firmware/WaterTank/.
"""

import asyncio
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

from bleak import BleakClient, BleakScanner

# ── UUIDs ─────────────────────────────────────────────────────────────────────
SVC           = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
C_STATE       = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
C_TANK        = "beb5483f-36e1-4688-b7f5-ea07361b26a8"
C_LOGCTL      = "beb54840-36e1-4688-b7f5-ea07361b26a8"
C_LOGDAT      = "beb54841-36e1-4688-b7f5-ea07361b26a8"
C_FILL_TARGET = "beb54845-36e1-4688-b7f5-ea07361b26a8"
C_AUTH        = "beb54846-36e1-4688-b7f5-ea07361b26a8"
C_SESSION     = "beb54847-36e1-4688-b7f5-ea07361b26a8"
C_SETUP       = "beb54848-36e1-4688-b7f5-ea07361b26a8"
C_VISIBILITY  = "beb54849-36e1-4688-b7f5-ea07361b26a8"
C_CLAIMED     = "beb5484a-36e1-4688-b7f5-ea07361b26a8"

DEFAULT_PASSWORD = "1234"
SETUP_NAME       = "TestTank"
SETUP_PASSWORD   = "newpass"
SCAN_TIMEOUT     = 15
CONN_TIMEOUT     = 10

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
INFO = "\033[34mINFO\033[0m"
WARN = "\033[33mWARN\033[0m"
SKIP = "\033[90mSKIP\033[0m"

results: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    status = PASS if ok else FAIL
    print(f"  [{status}] {name}" + (f" — {detail}" if detail else ""))


def info(msg: str) -> None:
    print(f"  [{INFO}] {msg}")


def warn(msg: str) -> None:
    print(f"  [{WARN}] {msg}")


def skip_test(name: str, reason: str) -> None:
    results.append((name, True, f"SKIPPED: {reason}"))
    print(f"  [{SKIP}] {name} — {reason}")


# ── Auth helpers ──────────────────────────────────────────────────────────────

async def auth_write_read(client: BleakClient, payload: bytes, delay: float = 0.4) -> str:
    """Write payload to C_AUTH, wait, read response string."""
    await client.write_gatt_char(C_AUTH, payload, response=True)
    await asyncio.sleep(delay)
    raw = await client.read_gatt_char(C_AUTH)
    return bytes(raw).decode("utf-8", errors="replace").strip()


async def password_auth(client: BleakClient, password: str) -> tuple[str, Optional[bytes]]:
    """Write password, return (response, token_bytes)."""
    resp = await auth_write_read(client, password.encode("utf-8"))
    token: Optional[bytes] = None
    if resp in ("OK", "SETUP_REQUIRED"):
        await asyncio.sleep(0.2)
        raw = await client.read_gatt_char(C_SESSION)
        token = bytes(raw)
    return resp, token


async def token_auth(client: BleakClient, token: bytes) -> str:
    """Write 16-byte session token, return response string."""
    return await auth_write_read(client, token)


async def new_client(addr: str) -> BleakClient:
    """Return a connected BleakClient (caller must use as async context manager)."""
    return BleakClient(addr, timeout=CONN_TIMEOUT)


async def reset_board_via_ota() -> bool:
    """OTA-flash NVS-clear firmware then real firmware to return board to factory state."""
    repo   = Path(__file__).parent.parent
    ino    = repo / "firmware/WaterTank/WaterTank.ino"
    bin_f  = repo / "firmware/WaterTank/build/esp32.esp32.esp32wrover/WaterTank.ino.bin"
    espota = next(Path.home().glob(
        "Library/Arduino15/packages/esp32/hardware/esp32/*/tools/espota.py"), None)
    if not espota:
        print(f"  [{FAIL}] espota.py not found"); return False

    orig = ino.read_text()
    patched = orig.replace(
        '  prefs.begin("watertank", false);\n  fullTankPct',
        '  prefs.begin("watertank", false);\n  prefs.clear();  // ONE-TIME NVS WIPE\n  fullTankPct')
    ino.write_text(patched)

    info("Compiling NVS-clear firmware…")
    r = subprocess.run(["arduino-cli","compile","--fqbn","esp32:esp32:esp32wrover",
                        "--export-binaries","."], cwd=ino.parent, capture_output=True)
    ino.write_text(orig)
    if r.returncode != 0:
        print(f"  [{FAIL}] Compile failed"); return False

    info("OTA flashing NVS-clear build…")
    r = subprocess.run(["python3", str(espota), "-i","192.168.0.126","-p","3232",
                        "-f", str(bin_f), "--timeout","60"], capture_output=True)
    if r.returncode != 0:
        print(f"  [{FAIL}] OTA failed"); return False

    info("Compiling real firmware…")
    r = subprocess.run(["arduino-cli","compile","--fqbn","esp32:esp32:esp32wrover",
                        "--export-binaries","."], cwd=ino.parent, capture_output=True)
    if r.returncode != 0:
        print(f"  [{FAIL}] Real firmware compile failed"); return False

    info("Waiting for board to come up in factory state (WaterTank)…")
    for _ in range(25):
        dev = await BleakScanner.find_device_by_filter(
            lambda d, _: d.name and "WATERTANK" in d.name.upper(), timeout=3)
        if dev:
            info(f"Board in factory state: {dev.name} at {dev.address}")
            break
    else:
        print(f"  [{FAIL}] Board did not appear after NVS clear"); return False

    info("OTA flashing real firmware…")
    r = subprocess.run(["python3", str(espota), "-i","192.168.0.126","-p","3232",
                        "-f", str(bin_f), "--timeout","60"], capture_output=True)
    if r.returncode != 0:
        print(f"  [{FAIL}] Real firmware OTA failed"); return False

    info("Waiting for board to come back up (factory state confirmed)…")
    for _ in range(20):
        dev = await BleakScanner.find_device_by_filter(
            lambda d, _: d.name and "WATERTANK" in d.name.upper(), timeout=3)
        if dev:
            info(f"Ready: {dev.name} at {dev.address}")
            return True
    print(f"  [{FAIL}] Board did not reappear after real firmware flash")
    return False


# ── AUTH tests ────────────────────────────────────────────────────────────────

async def test_auth_01(client: BleakClient) -> bool:
    """AUTH_01 — Connect to unclaimed board, C_CLAIMED=0."""
    raw = await client.read_gatt_char(C_CLAIMED)
    val = raw[0] if raw else 255
    ok = (val == 0)
    record("AUTH_01 C_CLAIMED=0 on factory board", ok, f"got={val}")
    return ok


async def test_auth_02(client: BleakClient) -> None:
    """AUTH_02 — Wrong password → FAIL."""
    resp = await auth_write_read(client, b"wrongpass")
    record("AUTH_02 wrong password → FAIL", resp == "FAIL", f"resp='{resp}'")


async def test_auth_03(client: BleakClient) -> Optional[bytes]:
    """AUTH_03 — Default password → SETUP_REQUIRED + C_SESSION 16 bytes."""
    resp, token = await password_auth(client, DEFAULT_PASSWORD)
    record("AUTH_03.1 default password accepted",
           resp in ("OK", "SETUP_REQUIRED"), f"resp='{resp}'")
    record("AUTH_03.2 C_SESSION returns 16 bytes",
           token is not None and len(token) == 16,
           f"len={len(token) if token else 0} token={token.hex()[:16] if token else None}…")
    return token


async def test_auth_04(addr: str, token: bytes) -> None:
    """AUTH_04 — Stored token works on fresh connection.
    On unclaimed device firmware returns SETUP_REQUIRED (not OK) for valid tokens — that's correct.
    The key assertion is that it's NOT 'FAIL' (token was recognized)."""
    async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
        if not client.is_connected:
            record("AUTH_04 token auth on fresh connect", False, "connect failed"); return
        resp = await token_auth(client, token)
        ok = resp in ("OK", "SETUP_REQUIRED")
        record("AUTH_04 stored token accepted on fresh connect", ok, f"resp='{resp}' (SETUP_REQUIRED expected on unclaimed)")


async def test_auth_05(addr: str) -> None:
    """AUTH_05 — Invalid 16-byte token → FAIL."""
    async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
        if not client.is_connected:
            record("AUTH_05 invalid token → FAIL", False, "connect failed"); return
        resp = await token_auth(client, bytes(16))
        record("AUTH_05 all-zero token → FAIL", resp == "FAIL", f"resp='{resp}'")


# ── SETUP tests ───────────────────────────────────────────────────────────────

async def test_setup_01(addr: str) -> None:
    """SETUP_01 — C_SETUP write without auth → ignored (C_CLAIMED still 0)."""
    async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
        if not client.is_connected:
            record("SETUP_01 unauthenticated C_SETUP ignored", False, "connect failed"); return
        payload = f"{SETUP_NAME}|{SETUP_PASSWORD}".encode()
        try:
            await client.write_gatt_char(C_SETUP, payload, response=True)
        except Exception as e:
            record("SETUP_01 unauthenticated C_SETUP ignored", True, f"write rejected: {e}"); return
        await asyncio.sleep(0.4)
        raw = await client.read_gatt_char(C_CLAIMED)
        val = raw[0] if raw else 255
        record("SETUP_01 unauthenticated C_SETUP ignored (C_CLAIMED still 0)", val == 0, f"C_CLAIMED={val}")


async def test_setup_02(client: BleakClient) -> Optional[bytes]:
    """SETUP_02 — Auth + C_SETUP → C_CLAIMED=1, new token issued."""
    resp, _ = await password_auth(client, DEFAULT_PASSWORD)
    if resp not in ("OK", "SETUP_REQUIRED"):
        record("SETUP_02.1 auth before setup", False, f"resp='{resp}'")
        return None
    record("SETUP_02.1 auth before setup", True, f"resp='{resp}'")

    payload = f"{SETUP_NAME}|{SETUP_PASSWORD}".encode()
    try:
        await client.write_gatt_char(C_SETUP, payload, response=True)
    except Exception as e:
        record("SETUP_02.2 C_SETUP write accepted", False, str(e)); return None

    await asyncio.sleep(0.6)
    raw = await client.read_gatt_char(C_CLAIMED)
    val = raw[0] if raw else 255
    record("SETUP_02.2 C_CLAIMED=1 after setup", val == 1, f"got={val}")

    raw_tok = await client.read_gatt_char(C_SESSION)
    tok = bytes(raw_tok)
    record("SETUP_02.3 new session token issued (16 bytes)", len(tok) == 16, f"token={tok.hex()[:16]}…")
    return tok


async def test_setup_03(addr: str) -> None:
    """SETUP_03 — Old default password '1234' rejected after claim."""
    for attempt in range(3):
        try:
            async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
                if not client.is_connected:
                    raise Exception("not connected")
                resp = await auth_write_read(client, DEFAULT_PASSWORD.encode())
                record("SETUP_03 default password '1234' rejected after claim", resp == "FAIL", f"resp='{resp}'")
                return
        except Exception as e:
            if attempt < 2:
                info(f"SETUP_03 connect attempt {attempt+1} failed ({e}), retrying in 4s…")
                await asyncio.sleep(4)
            else:
                record("SETUP_03 default password rejected post-claim", False, f"connect failed after 3 attempts: {e}")


async def test_setup_04(addr: str) -> Optional[bytes]:
    """SETUP_04 — New password works after claim."""
    for attempt in range(3):
        try:
            async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
                if not client.is_connected:
                    raise Exception("not connected")
                resp, tok = await password_auth(client, SETUP_PASSWORD)
                record("SETUP_04 new password 'newpass' accepted", resp == "OK", f"resp='{resp}'")
                return tok
        except Exception as e:
            if attempt < 2:
                info(f"SETUP_04 connect attempt {attempt+1} failed ({e}), retrying in 4s…")
                await asyncio.sleep(4)
            else:
                record("SETUP_04 new password accepted", False, f"connect failed after 3 attempts: {e}")
                return None


# ── VISIBILITY tests ──────────────────────────────────────────────────────────

async def test_vis_01(addr: str) -> None:
    """VIS_01 — unauthenticated C_VISIBILITY write rejected: board stays in current state.
    Run while board IS advertising (post VIS_02). Write 0x00 without auth → board keeps advertising."""
    async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
        if not client.is_connected:
            record("VIS_01 unauthenticated C_VISIBILITY write rejected", False, "connect failed"); return
        try:
            await client.write_gatt_char(C_VISIBILITY, bytes([0x00]), response=True)
        except Exception:
            pass
    await asyncio.sleep(1)
    found = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and ("WATERTANK" in d.name.upper() or "TESTTANK" in d.name.upper()),
        timeout=5)
    record("VIS_01 board STILL advertising after unauthenticated setVisibility(0)",
           found is not None, f"found={found.address if found else 'not found'}")


async def test_vis_02(addr: str) -> None:
    """VIS_02 — Auth + setVisibility(1) → board appears in scan."""
    async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
        if not client.is_connected:
            record("VIS_02 board visible after setVisibility(1)", False, "connect failed"); return
        resp, _ = await password_auth(client, SETUP_PASSWORD)
        if resp != "OK":
            record("VIS_02 board visible after setVisibility(1)", False, f"auth fail: {resp}"); return
        await client.write_gatt_char(C_VISIBILITY, bytes([0x01]), response=True)
        info("setVisibility(1) sent — disconnecting to scan")
    await asyncio.sleep(1.5)
    found = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and ("WATERTANK" in d.name.upper() or "TESTTANK" in d.name.upper()),
        timeout=10)
    record("VIS_02 board visible in scan after setVisibility(1)",
           found is not None, f"addr={found.address if found else 'not found'}")


async def test_vis_03(addr: str) -> None:
    """VIS_03 — Auth + setVisibility(0) → board disappears from scan."""
    async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
        if not client.is_connected:
            record("VIS_03 board not visible after setVisibility(0)", False, "connect failed"); return
        resp, _ = await password_auth(client, SETUP_PASSWORD)
        if resp != "OK":
            record("VIS_03 board not visible after setVisibility(0)", False, f"auth fail: {resp}"); return
        await client.write_gatt_char(C_VISIBILITY, bytes([0x00]), response=True)
        info("setVisibility(0) sent — disconnecting to scan")
    await asyncio.sleep(1.5)
    found = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and ("WATERTANK" in d.name.upper() or "TESTTANK" in d.name.upper()),
        timeout=6)
    record("VIS_03 board NOT visible after setVisibility(0)",
           found is None, f"found={found.address if found else None}")


# ── TOKEN_01 — session slot eviction ─────────────────────────────────────────

async def test_token_01(addr: str, password: str) -> None:
    """TOKEN_01 — Fill 5 session slots, verify oldest evicted on 6th."""
    tokens: list[bytes] = []
    for i in range(5):
        async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
            if not client.is_connected:
                info(f"Round {i+1}: connect failed"); break
            resp, tok = await password_auth(client, password)
            if resp == "OK" and tok:
                tokens.append(tok)
                info(f"Round {i+1}: token {tok.hex()[:8]}…")
        await asyncio.sleep(1.2)

    record("TOKEN_01.1 collected 5 tokens via password auth",
           len(tokens) == 5, f"got {len(tokens)}")
    if len(tokens) < 5:
        record("TOKEN_01.2 oldest token evicted on 6th", False, "insufficient tokens"); return

    oldest = tokens[0]
    sixth_token: Optional[bytes] = None

    async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
        if not client.is_connected:
            record("TOKEN_01.2 oldest token evicted on 6th", False, "connect failed"); return
        resp, sixth_token = await password_auth(client, password)
        record("TOKEN_01.2 6th password auth succeeds", resp == "OK", f"resp='{resp}'")

    await asyncio.sleep(1.2)

    async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
        if not client.is_connected:
            record("TOKEN_01.3 oldest token rejected after eviction", False, "connect failed"); return
        resp = await token_auth(client, oldest)
        record("TOKEN_01.3 oldest token rejected after eviction (slot evicted)",
               resp == "FAIL", f"resp='{resp}'")


# ── RESET_01 — factory reset ──────────────────────────────────────────────────

async def test_reset_01(addr: str) -> None:
    """RESET_01 — Factory reset: C_CLAIMED=0, default password works."""
    print(f"\n  [{WARN}] Hold the BOOT / GPIO0 button for 10 seconds now.")
    print(f"  [{WARN}] Release when LED blinks. Waiting 18s for reboot…")
    await asyncio.sleep(18)

    found = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "WATERTANK" in d.name.upper(), timeout=12)
    record("RESET_01.1 board re-advertises as 'WaterTank' after reset",
           found is not None, f"addr={found.address if found else 'not found'}")
    if not found:
        return

    async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
        if not client.is_connected:
            record("RESET_01.2 C_CLAIMED=0 after reset", False, "connect failed")
            record("RESET_01.3 default password works after reset", False, "connect failed")
            return
        raw = await client.read_gatt_char(C_CLAIMED)
        val = raw[0] if raw else 255
        record("RESET_01.2 C_CLAIMED=0 after reset", val == 0, f"got={val}")
        resp, _ = await password_auth(client, DEFAULT_PASSWORD)
        record("RESET_01.3 default password '1234' works after reset",
               resp in ("OK", "SETUP_REQUIRED"), f"resp='{resp}'")


# ── EXISTING_01 — regression ─────────────────────────────────────────────────

async def test_existing_01(addr: str, password: str) -> None:
    """EXISTING_01 — C_STATE/C_TANK/C_FILL_TARGET/log stream work after auth."""
    async with BleakClient(addr, timeout=12) as client:
        if not client.is_connected:
            record("EXISTING_01 connect", False, "connect failed"); return

        resp, _ = await password_auth(client, password)
        if resp != "OK":
            record("EXISTING_01.1 auth for regression", False, f"auth fail: {resp}"); return
        record("EXISTING_01.1 auth succeeds", True, f"resp='{resp}'")

        # C_STATE notify
        state_count = [0]
        got_state = asyncio.Event()
        def on_state(_, data):
            state_count[0] += 1
            got_state.set()
        await client.start_notify(C_STATE, on_state)
        try:
            await asyncio.wait_for(got_state.wait(), 5)
            await asyncio.sleep(4)
            await client.stop_notify(C_STATE)
            record("EXISTING_01.2 C_STATE notifies after auth",
                   state_count[0] >= 2, f"{state_count[0]} ticks")
        except asyncio.TimeoutError:
            await client.stop_notify(C_STATE)
            record("EXISTING_01.2 C_STATE notifies after auth", False, "no notify in 5s")

        # C_TANK notify
        got_tank = asyncio.Event()
        await client.start_notify(C_TANK, lambda *_: got_tank.set())
        try:
            await asyncio.wait_for(got_tank.wait(), 5)
            await client.stop_notify(C_TANK)
            record("EXISTING_01.3 C_TANK notifies after auth", True)
        except asyncio.TimeoutError:
            await client.stop_notify(C_TANK)
            record("EXISTING_01.3 C_TANK notifies after auth", False, "no notify in 5s")

        # C_FILL_TARGET
        try:
            raw = await client.read_gatt_char(C_FILL_TARGET)
            val_str = bytes(raw).decode("utf-8", errors="replace").strip()
            val = float(val_str)
            record("EXISTING_01.4 C_FILL_TARGET readable", 0 < val <= 100, f"target={val:.0f}%")
        except Exception as e:
            record("EXISTING_01.4 C_FILL_TARGET readable", False, str(e))

        # Log stream
        frames: list[str] = []
        done_evt = asyncio.Event()
        def on_log(_, data):
            f = bytes(data).decode(errors="replace").strip()
            frames.append(f)
            if f == "DONE":
                done_evt.set()
        await client.start_notify(C_LOGDAT, on_log)
        await asyncio.sleep(0.3)
        try:
            await client.write_gatt_char(C_LOGCTL, bytes([0x01]), response=True)
            await asyncio.wait_for(done_evt.wait(), 8)
            await client.stop_notify(C_LOGDAT)
            record("EXISTING_01.5 log stream (C_LOGCTL→C_LOGDAT) works after auth",
                   True, f"{len(frames)} frames incl. DONE")
        except asyncio.TimeoutError:
            await client.stop_notify(C_LOGDAT)
            record("EXISTING_01.5 log stream works after auth", False,
                   f"timed out — {len(frames)} frames, DONE not received")
        except Exception as e:
            await client.stop_notify(C_LOGDAT)
            record("EXISTING_01.5 log stream works after auth", False, str(e))


# ── Main ──────────────────────────────────────────────────────────────────────

async def main() -> None:
    args = sys.argv[1:]
    skip_reset   = "--skip-reset"   in args
    reset_board  = "--reset-board"  in args
    args = [a for a in args if not a.startswith("--")]
    target = args[0] if args else None

    print("=" * 68)
    print("  WaterTank Auth BLE Test Suite  (Phase 4 — firmware v1.3.0+)")
    print("=" * 68)

    if reset_board:
        print("\n[RESET] OTA-resetting board to factory state…")
        ok = await reset_board_via_ota()
        if not ok:
            print(f"  [{FAIL}] Board reset failed — aborting"); return

    if not skip_reset:
        print()
        print("  RESET_01 will prompt you to hold the BOOT button for 10s.")
        print("  Run with --skip-reset to skip that test.")

    # ── Find board (always scan to populate CoreBluetooth cache) ─────────────
    # macOS CoreBluetooth requires a scan in the current session before UUID-based
    # direct connects will work — even if the address is known.
    print(f"\n[SCAN] Looking for board ({SCAN_TIMEOUT}s)…")
    dev = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and (
            "WATERTANK" in d.name.upper() or "TESTTANK" in d.name.upper()),
        timeout=SCAN_TIMEOUT)
    if target:
        addr = target
        if dev:
            info(f"Pre-scan found: '{dev.name}'  using addr={addr}")
        else:
            info(f"Pre-scan found nothing — will attempt direct connect to {addr}")
    else:
        if not dev:
            print(f"  [{FAIL}] No device found. Is the board powered and advertising?")
            return
        addr = dev.address
        info(f"Found: '{dev.name}'  addr={addr}")

    # ── Phase A: Auth characteristics ─────────────────────────────────────────
    print(f"\n{'─'*68}")
    print("  Phase A — Authentication")
    print(f"{'─'*68}")

    first_token: Optional[bytes] = None

    async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
        if not client.is_connected:
            print(f"  [{FAIL}] Could not connect to {addr}"); return
        info(f"Connected. MTU={getattr(client,'mtu_size','?')}")

        is_factory = await test_auth_01(client)
        if not is_factory:
            warn("Board already claimed — AUTH_02/03 may behave differently")

        await test_auth_02(client)
        first_token = await test_auth_03(client)

    await asyncio.sleep(2)
    if first_token:
        await test_auth_04(addr, first_token)
    await asyncio.sleep(2)
    await test_auth_05(addr)

    # ── Phase B: Device setup ─────────────────────────────────────────────────
    print(f"\n{'─'*68}")
    print("  Phase B — Device setup (first-time claim)")
    print(f"{'─'*68}")

    await asyncio.sleep(2)
    await test_setup_01(addr)

    await asyncio.sleep(2)
    async with BleakClient(addr, timeout=CONN_TIMEOUT) as client:
        if not client.is_connected:
            print(f"  [{FAIL}] Could not connect for SETUP_02"); return
        await test_setup_02(client)

    # Board is now claimed — firmware opens a 30s visibility window after claim.
    # SETUP_03/04 connect during this window while board is advertising as TestTank.
    info("Board claimed — running SETUP_03/04 while 30s post-claim visibility window is active…")
    await asyncio.sleep(4)
    await test_setup_03(addr)
    await asyncio.sleep(2)
    await test_setup_04(addr)

    # ── Phase C — Visibility control ──────────────────────────────────────────
    print(f"\n{'─'*68}")
    print("  Phase C — Visibility control")
    print(f"{'─'*68}")
    # VIS_02 first: auth + C_VISIBILITY=1 extends advertising to 5-min window.
    # All subsequent phases use this advertising window for connections.
    await asyncio.sleep(2)
    await test_vis_02(addr)
    await asyncio.sleep(1)

    # VIS_01: while board IS advertising (from VIS_02), unauthenticated write
    # C_VISIBILITY=0 is rejected → board KEEPS advertising.
    await test_vis_01(addr)
    await asyncio.sleep(2)

    # ── Phase D: Token slot management (while advertising from VIS_02) ────────
    print(f"\n{'─'*68}")
    print("  Phase D — Session slot management (TOKEN_01)")
    print(f"{'─'*68}")
    await test_token_01(addr, SETUP_PASSWORD)
    await asyncio.sleep(2)

    # ── Phase F: Regression (while advertising from VIS_02) ───────────────────
    print(f"\n{'─'*68}")
    print("  Phase F — Regression: existing characteristics post-auth")
    print(f"{'─'*68}")
    await test_existing_01(addr, SETUP_PASSWORD)
    await asyncio.sleep(2)

    # VIS_03 last: stops advertising (no further connects needed after this).
    await test_vis_03(addr)

    # ── Phase E: Factory reset ─────────────────────────────────────────────────
    print(f"\n{'─'*68}")
    print("  Phase E — Factory reset regression (RESET_01)")
    print(f"{'─'*68}")
    if skip_reset:
        skip_test("RESET_01 factory reset", "--skip-reset passed")
    else:
        await test_reset_01(addr)

    # ── Summary ───────────────────────────────────────────────────────────────
    total  = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = total - passed

    print("\n" + "=" * 68)
    print(f"  Results: {passed}/{total} passed", end="")
    if failed:
        print(f"  ({failed} FAILED)")
        print("\n  Failed tests:")
        for name, ok, detail in results:
            if not ok:
                print(f"    ✗ {name}" + (f": {detail}" if detail else ""))
    else:
        print("  — all green")
    print("=" * 68)


if __name__ == "__main__":
    asyncio.run(main())
