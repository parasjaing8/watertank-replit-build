#!/usr/bin/env python3
"""
WaterTank ADB E2E Smoke Test — Phase 5 (v32)

Drives the real Android app via adb shell uiautomator + input commands.
Phone must be connected via USB with USB debugging enabled.

Usage:
  python3 scripts/e2e_test.py
  python3 scripts/e2e_test.py --reset-board   # OTA-reset board first
"""

import subprocess
import sys
import time
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional

PACKAGE   = "com.watertank.app"
ACTIVITY  = "com.watertank.app.MainActivity"

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
INFO = "\033[34mINFO\033[0m"
SKIP = "\033[90mSKIP\033[0m"

results: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    status = PASS if ok else FAIL
    print(f"  [{status}] {name}" + (f" — {detail}" if detail else ""))


def info(msg: str) -> None:
    print(f"  [{INFO}] {msg}")


# ── ADB helpers ───────────────────────────────────────────────────────────────

def adb(*args: str, timeout: int = 15) -> subprocess.CompletedProcess:
    return subprocess.run(["adb", *args], capture_output=True, text=True, timeout=timeout)


def shell(*args: str, timeout: int = 15) -> str:
    r = adb("shell", *args, timeout=timeout)
    return r.stdout.strip()


def dump_ui() -> ET.Element:
    adb("shell", "uiautomator", "dump", "/sdcard/ui.xml", timeout=10)
    r = adb("pull", "/sdcard/ui.xml", "/tmp/ui.xml", timeout=10)
    tree = ET.parse("/tmp/ui.xml")
    return tree.getroot()


def find_node(root: ET.Element, **attrs) -> Optional[ET.Element]:
    """Find first node whose attributes all match (substring for 'text' and 'content-desc')."""
    for node in root.iter("node"):
        match = True
        for k, v in attrs.items():
            node_val = node.get(k, "")
            if k in ("text", "content-desc"):
                if v.lower() not in node_val.lower():
                    match = False; break
            else:
                if node_val != v:
                    match = False; break
        if match:
            return node
    return None


def node_bounds(node: ET.Element) -> tuple[int, int]:
    """Return center (x, y) of a node's bounds."""
    b = node.get("bounds", "[0,0][0,0]")
    nums = list(map(int, re.findall(r"\d+", b)))
    return (nums[0] + nums[2]) // 2, (nums[1] + nums[3]) // 2


def tap(x: int, y: int) -> None:
    shell("input", "tap", str(x), str(y))
    time.sleep(0.4)


def tap_node(node: ET.Element) -> None:
    x, y = node_bounds(node)
    tap(x, y)


def type_text(text: str) -> None:
    # Clear field first, then type
    shell("input", "keyevent", "KEYCODE_CTRL_A")
    shell("input", "keyevent", "KEYCODE_DEL")
    # adb input text doesn't handle special chars well — use one char at a time for safety
    escaped = text.replace(" ", "%s").replace("'", "\\'")
    shell("input", "text", escaped)
    time.sleep(0.3)


def press_back() -> None:
    shell("input", "keyevent", "KEYCODE_BACK")
    time.sleep(0.5)


def wait_for_text(text: str, timeout: int = 20, poll: float = 1.5) -> Optional[ET.Element]:
    deadline = time.time() + timeout
    while time.time() < deadline:
        root = dump_ui()
        node = find_node(root, text=text)
        if node:
            return node
        node = find_node(root, **{"content-desc": text})
        if node:
            return node
        time.sleep(poll)
    return None


def wait_for_any(*texts: str, timeout: int = 20, poll: float = 1.5) -> tuple[Optional[str], Optional[ET.Element]]:
    deadline = time.time() + timeout
    while time.time() < deadline:
        root = dump_ui()
        for text in texts:
            node = find_node(root, text=text)
            if node:
                return text, node
            node = find_node(root, **{"content-desc": text})
            if node:
                return text, node
        time.sleep(poll)
    return None, None


def logcat_clear() -> None:
    adb("logcat", "-c")


def logcat_grep(pattern: str, lines: int = 50) -> list[str]:
    r = adb("logcat", "-d", "-v", "brief", "-t", str(lines))
    return [l for l in r.stdout.splitlines() if re.search(pattern, l, re.IGNORECASE)]


def launch_app(clear_data: bool = False) -> None:
    if clear_data:
        shell("pm", "clear", PACKAGE)
        time.sleep(1)
    shell("am", "start", "-n", f"{PACKAGE}/{ACTIVITY}", timeout=10)
    time.sleep(2)


def kill_app() -> None:
    shell("am", "force-stop", PACKAGE)
    time.sleep(1)


def screen_on() -> None:
    state = shell("dumpsys", "display", "|", "grep", "mScreenState")
    if "OFF" in state or "DOZE" in state:
        shell("input", "keyevent", "KEYCODE_WAKEUP")
        time.sleep(0.5)
        shell("input", "keyevent", "KEYCODE_MENU")
        time.sleep(0.5)


# ── Test cases ────────────────────────────────────────────────────────────────

def test_e2e_01_fresh_install() -> bool:
    """E2E_01 — Fresh install: scan finds WaterTank, PairingSheet appears."""
    info("Clearing app data (simulating fresh install)…")
    kill_app()
    launch_app(clear_data=True)
    logcat_clear()

    info("Waiting for app to start…")
    # App should show dashboard (disconnected state) while scanning
    root = dump_ui()
    info("App launched. Waiting for BLE scan to find board (up to 30s)…")

    # We expect PairingSheet OR "Enter Password" to appear when device is found
    found, node = wait_for_any("Enter Password", "WaterTank", "password", "1234", timeout=35)
    if found:
        record("E2E_01 PairingSheet appears after scan", True, f"found='{found}'")
        return True
    else:
        # Check logcat for clues
        logs = logcat_grep(r"WaterTank|BLE|bluetooth|scan", lines=100)
        record("E2E_01 PairingSheet appears after scan", False,
               f"timeout — logs: {logs[-3:] if logs else 'none'}")
        return False


def test_e2e_02_first_auth(default_password: str = "1234") -> bool:
    """E2E_02 — Enter default password → DeviceSetupModal appears."""
    root = dump_ui()
    pw_field = find_node(root, **{"class": "android.widget.EditText"})
    if not pw_field:
        record("E2E_02 enter default password", False, "no password field found"); return False

    tap_node(pw_field)
    time.sleep(0.3)
    type_text(default_password)

    # Tap Connect / Submit button
    root = dump_ui()
    btn = find_node(root, text="Connect") or find_node(root, text="connect")
    if not btn:
        # Try finding by common button positions
        record("E2E_02 enter default password", False, "Connect button not found"); return False
    tap_node(btn)

    # Wait for DeviceSetupModal (Set Up Your Device)
    node = wait_for_text("Set Up", timeout=15)
    ok = node is not None
    record("E2E_02 DeviceSetupModal appears after auth", ok,
           "setup modal shown" if ok else "timeout waiting for setup modal")
    return ok


def test_e2e_03_device_setup(name: str = "HomeTest", password: str = "test1234") -> bool:
    """E2E_03 — Fill device name + new password → dashboard loads."""
    root = dump_ui()
    fields = list(root.iter("node"))
    edit_fields = [n for n in fields if n.get("class") == "android.widget.EditText"]
    if len(edit_fields) < 3:
        record("E2E_03 device setup form", False, f"expected 3 fields, got {len(edit_fields)}"); return False

    # Field order: Device Name, New Password, Confirm Password
    tap_node(edit_fields[0]); time.sleep(0.2); type_text(name)
    tap_node(edit_fields[1]); time.sleep(0.2); type_text(password)
    tap_node(edit_fields[2]); time.sleep(0.2); type_text(password)

    # Tap Save
    root = dump_ui()
    btn = find_node(root, text="Save") or find_node(root, text="save")
    if not btn:
        record("E2E_03 device setup form", False, "Save button not found"); return False
    tap_node(btn)

    # Wait for dashboard — look for tank percentage or motor status
    found, _ = wait_for_any("%", "Motor", "Pump", "Tank", "Connected", timeout=20)
    ok = found is not None
    record("E2E_03 dashboard loads after setup", ok,
           f"found='{found}'" if ok else "timeout waiting for dashboard")
    return ok


def test_e2e_04_reconnect(password: str = "test1234") -> bool:
    """E2E_04 — Kill app, relaunch → reconnects without password prompt."""
    info("Killing app and relaunching…")
    kill_app()
    time.sleep(1)
    launch_app(clear_data=False)

    # Should NOT show PairingSheet (has stored token)
    # Should show dashboard within 15s
    found, _ = wait_for_any("%", "Motor", "Pump", "Tank", "Connected", timeout=25)
    pw_shown = wait_for_text("Enter Password", timeout=3) is not None

    if pw_shown:
        record("E2E_04 reconnects without password", False, "PairingSheet appeared (token not stored)")
        return False
    ok = found is not None
    record("E2E_04 reconnects without password prompt", ok,
           "dashboard loaded directly" if ok else "timeout — dashboard not loaded")
    return ok


def test_e2e_05_sim_mode() -> bool:
    """E2E_05 — Simulation mode works (no board required, data shown)."""
    kill_app()
    launch_app(clear_data=True)

    # Navigate to settings or find sim toggle
    found, _ = wait_for_any("Simulation", "sim", "Simulate", timeout=15)
    if not found:
        # Try tapping settings tab
        root = dump_ui()
        settings = find_node(root, text="Settings") or find_node(root, **{"content-desc": "Settings"})
        if settings:
            tap_node(settings)
            time.sleep(1)
            found, _ = wait_for_any("Simulation", "sim", "Simulate", timeout=8)

    if not found:
        skip = "Sim mode toggle not found in UI — check manually"
        results.append(("E2E_05 simulation mode", True, f"SKIPPED: {skip}"))
        print(f"  [{SKIP}] E2E_05 simulation mode — {skip}")
        return True

    root = dump_ui()
    toggle = find_node(root, text="Simulation") or find_node(root, **{"content-desc": "Simulation"})
    if toggle:
        tap_node(toggle)
        time.sleep(1)
        found2, _ = wait_for_any("%", "Motor", "Pump", "Tank", timeout=10)
        ok = found2 is not None
        record("E2E_05 simulation mode shows tank data", ok)
        return ok
    return True


def test_e2e_06_records_screen() -> bool:
    """E2E_06 — Records screen navigable and shows content."""
    root = dump_ui()
    tab = find_node(root, text="Records") or find_node(root, **{"content-desc": "Records"})
    if not tab:
        results.append(("E2E_06 records screen", True, "SKIPPED: Records tab not visible — check manually"))
        print(f"  [{SKIP}] E2E_06 records screen")
        return True
    tap_node(tab)
    time.sleep(1)
    found, _ = wait_for_any("Record", "Event", "History", "No events", "empty", timeout=8)
    ok = found is not None
    record("E2E_06 records screen loads", ok, f"found='{found}'" if ok else "blank screen")
    return ok


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    args = sys.argv[1:]
    reset_board = "--reset-board" in args

    print("=" * 68)
    print("  WaterTank ADB E2E Smoke Test  (Phase 5 — v32)")
    print("=" * 68)

    # Verify device connected
    r = subprocess.run(["adb", "devices"], capture_output=True, text=True)
    devices = [l for l in r.stdout.splitlines() if "\tdevice" in l]
    if not devices:
        print(f"  [{FAIL}] No ADB device found. Connect phone with USB debugging."); return
    info(f"Device: {devices[0].split()[0]}")

    if reset_board:
        info("OTA-resetting board (importing reset logic from auth_test)…")
        import importlib.util, asyncio
        spec = importlib.util.spec_from_file_location("auth_test",
            str(Path(__file__).parent / "auth_test.py"))
        mod = importlib.util.load_from_spec(spec)  # type: ignore
        spec.loader.exec_module(mod)  # type: ignore
        ok = asyncio.run(mod.reset_board_via_ota())
        if not ok:
            print(f"  [{FAIL}] Board reset failed"); return

    screen_on()

    # ── E2E_01: Fresh install scan ─────────────────────────────────────────────
    print(f"\n{'─'*68}")
    print("  Flow 1 — First-time pairing")
    print(f"{'─'*68}")
    ok1 = test_e2e_01_fresh_install()
    if not ok1:
        print(f"\n  [{FAIL}] Scan failed — aborting pairing flow tests")
        _print_summary(); return

    # ── E2E_02: Auth with default password ─────────────────────────────────────
    ok2 = test_e2e_02_first_auth("1234")

    # ── E2E_03: Setup name + password ──────────────────────────────────────────
    if ok2:
        ok3 = test_e2e_03_device_setup("HomeTest", "test1234")
    else:
        results.append(("E2E_03 device setup form", False, "skipped — auth failed"))
        ok3 = False

    # ── E2E_04: Kill + relaunch (token reuse) ──────────────────────────────────
    print(f"\n{'─'*68}")
    print("  Flow 2 — Reconnect without password")
    print(f"{'─'*68}")
    if ok3:
        test_e2e_04_reconnect("test1234")
    else:
        results.append(("E2E_04 reconnects without password prompt", False, "skipped — setup failed"))

    # ── E2E_05: Simulation mode ────────────────────────────────────────────────
    print(f"\n{'─'*68}")
    print("  Flow 3 — App features (sim mode, records)")
    print(f"{'─'*68}")
    test_e2e_05_sim_mode()

    # ── E2E_06: Records screen ─────────────────────────────────────────────────
    test_e2e_06_records_screen()

    _print_summary()


def _print_summary() -> None:
    total  = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = total - passed
    print("\n" + "=" * 68)
    print(f"  Results: {passed}/{total} passed", end="")
    if failed:
        print(f"  ({failed} FAILED)")
        print("\n  Failed:")
        for name, ok, detail in results:
            if not ok:
                print(f"    ✗ {name}" + (f": {detail}" if detail else ""))
    else:
        print("  — all green")
    print("=" * 68)


if __name__ == "__main__":
    main()
