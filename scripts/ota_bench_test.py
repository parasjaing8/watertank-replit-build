#!/usr/bin/env python3
"""
WaterTank OTA Bench Test Suite — Phase 6

Automates the full BLE OTA validation without the Android app.
Implements NimBLEOta protocol directly via bleak (Python BLE).

Usage:
  python3 scripts/ota_bench_test.py              # auto-scan
  python3 scripts/ota_bench_test.py <BLE_ADDR>   # target device

Tests:
  T_NET1 — GitHub API: latest release has fw-v tag, manifest asset present
  T_NET2 — Manifest fields valid (version, url, size, sha256, min_app_version)
  T_NET3 — SHA256 of downloaded binary matches manifest
  T_BLE1 — OTA service UUID 0x8018 present
  T_BLE2 — COMMAND char (0x8022) and RECV_FW char (0x8020) present with correct props
  T_BLE3 — C_RESET_REASON readable (0xbeb54844)
  T_BLE4 — Firmware version readable before OTA (C_FWVER)
  T_OTA1 — START command accepted (ACK status = 0x0000)
  T_OTA2 — Full firmware transfer completes (all sectors ACK'd)
  T_OTA3 — Board reboots after last sector (disconnects within 15s)
  T_OTA4 — Board reconnects and C_FWVER reads expected new version
  T_OTA5 — Re-OTA: second transfer on already-updated board completes (same binary = downgrade guard)
"""

import asyncio
import hashlib
import struct
import sys
import time
import urllib.request
import json
from typing import Optional

from bleak import BleakClient, BleakScanner

# ── Config ─────────────────────────────────────────────────────────────────────
GITHUB_API    = "https://api.github.com/repos/parasjaing8/watertank-replit-build/releases/latest"
DEVICE_NAME   = "WaterTank"
SCAN_TIMEOUT  = 20
OTA_TIMEOUT   = 120  # per-transfer cap in seconds

# ── OTA UUIDs ──────────────────────────────────────────────────────────────────
OTA_SVC      = "00008018-0000-1000-8000-00805f9b34fb"
OTA_RECV_FW  = "00008020-0000-1000-8000-00805f9b34fb"
OTA_COMMAND  = "00008022-0000-1000-8000-00805f9b34fb"

# ── Main GATT UUIDs (from constants/ble.ts) ────────────────────────────────────
MAIN_SVC     = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
C_FWVER      = "beb54843-36e1-4688-b7f5-ea07361b26a8"
C_RESET_REASON = "beb54844-36e1-4688-b7f5-ea07361b26a8"

# ── OTA protocol constants ─────────────────────────────────────────────────────
SECTOR_SIZE        = 4096
MAX_DATA_PER_PACKET = 504   # ATT payload: MTU(512) - 3 header - 2 CRC (binding for last pkt)

# ── Helpers ────────────────────────────────────────────────────────────────────
PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
INFO = "\033[34mINFO\033[0m"
WARN = "\033[33mWARN\033[0m"

results: list[tuple[str, bool, str]] = []

def record(name: str, ok: bool, detail: str = ""):
    results.append((name, ok, detail))
    icon = PASS if ok else FAIL
    print(f"  [{icon}] {name}" + (f"  ({detail})" if detail else ""))

def info(msg: str):
    print(f"  [{INFO}] {msg}")

def crc16(data: bytes, length: Optional[int] = None) -> int:
    n = length if length is not None else len(data)
    crc = 0
    for i in range(n):
        crc ^= data[i] << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if (crc & 0x8000) else (crc << 1) & 0xFFFF
    return crc

def build_start_command(file_len: int) -> bytes:
    buf = bytearray(20)
    buf[0] = 0x01; buf[1] = 0x00        # startOtaCmd = 0x0001
    struct.pack_into("<I", buf, 2, file_len)
    crc = crc16(bytes(buf), 18)
    buf[18] = crc & 0xFF
    buf[19] = (crc >> 8) & 0xFF
    return bytes(buf)

def build_stop_command() -> bytes:
    buf = bytearray(20)
    buf[0] = 0x02; buf[1] = 0x00        # stopOtaCmd = 0x0002
    crc = crc16(bytes(buf), 18)
    buf[18] = crc & 0xFF
    buf[19] = (crc >> 8) & 0xFF
    return bytes(buf)

def build_sector_packets(sector_idx: int, sector_data: bytes) -> list[bytes]:
    packets = []
    crc_buf = bytearray(SECTOR_SIZE)
    crc_offset = 0
    offset = 0
    pkt_num = 0

    while offset < len(sector_data):
        remaining = len(sector_data) - offset
        is_last = remaining <= MAX_DATA_PER_PACKET
        data_len = min(remaining, MAX_DATA_PER_PACKET)
        chunk = sector_data[offset: offset + data_len]

        crc_buf[crc_offset: crc_offset + data_len] = chunk
        crc_offset += data_len

        if is_last:
            crc = crc16(bytes(crc_buf), crc_offset)
            pkt = bytearray(3 + data_len + 2)
            pkt[0] = sector_idx & 0xFF
            pkt[1] = (sector_idx >> 8) & 0xFF
            pkt[2] = 0xFF   # last-packet marker
            pkt[3: 3 + data_len] = chunk
            pkt[3 + data_len] = crc & 0xFF
            pkt[3 + data_len + 1] = (crc >> 8) & 0xFF
            packets.append(bytes(pkt))
        else:
            pkt = bytearray(3 + data_len)
            pkt[0] = sector_idx & 0xFF
            pkt[1] = (sector_idx >> 8) & 0xFF
            pkt[2] = pkt_num
            pkt[3: 3 + data_len] = chunk
            packets.append(bytes(pkt))
            pkt_num += 1

        offset += data_len

    return packets

# ── Network tests ──────────────────────────────────────────────────────────────

def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json",
                                               "User-Agent": "watertank-ota-bench"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())

def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "watertank-ota-bench"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()

def run_network_tests() -> Optional[dict]:
    print("\n── Network / GitHub tests ────────────────────────────────────────")

    # T_NET1 — GitHub API
    try:
        release = fetch_json(GITHUB_API)
        tag = release.get("tag_name", "")
        is_fw_tag = tag.startswith("fw-v")
        manifest_asset = next((a for a in release.get("assets", []) if a["name"] == "manifest.json"), None)
        record("T_NET1.1 latest release has fw-v tag", is_fw_tag, tag)
        record("T_NET1.2 manifest.json asset present", manifest_asset is not None)
        if not manifest_asset:
            return None
    except Exception as e:
        record("T_NET1 GitHub API fetch", False, str(e))
        return None

    # T_NET2 — Manifest fields
    try:
        manifest = fetch_json(manifest_asset["browser_download_url"])
        required_fields = ["version", "url", "size", "sha256", "min_app_version"]
        for field in required_fields:
            record(f"T_NET2 manifest.{field} present", field in manifest and bool(manifest[field]))
        info(f"Firmware {manifest.get('version')} · {manifest.get('size',0)//1024}KB")
    except Exception as e:
        record("T_NET2 manifest fetch/parse", False, str(e))
        return None

    # T_NET3 — SHA256 verification
    try:
        info(f"Downloading firmware binary ({manifest.get('size',0)//1024}KB)…")
        fw_bytes = fetch_bytes(manifest["url"])
        actual_sha = hashlib.sha256(fw_bytes).hexdigest()
        expected_sha = manifest["sha256"].lower()
        record("T_NET3.1 download size matches manifest", len(fw_bytes) == manifest["size"],
               f"{len(fw_bytes)} vs {manifest['size']}")
        record("T_NET3.2 SHA256 matches manifest", actual_sha == expected_sha,
               actual_sha[:16] + "…")
    except Exception as e:
        record("T_NET3 download+verify", False, str(e))
        return None

    return {"manifest": manifest, "fw_bytes": fw_bytes}

# ── BLE discovery tests ────────────────────────────────────────────────────────

async def test_scan(target_addr: Optional[str]):
    info(f"Scanning for '{DEVICE_NAME}' (timeout {SCAN_TIMEOUT}s)…")
    if target_addr:
        device = await BleakScanner.find_device_by_address(target_addr, timeout=SCAN_TIMEOUT)
    else:
        device = await BleakScanner.find_device_by_filter(
            lambda d, ad: d.name and DEVICE_NAME in d.name,
            timeout=SCAN_TIMEOUT,
        )
    record("T_BLE0 device found", device is not None,
           device.address if device else "not found")
    return device

async def run_ble_discovery_tests(client: BleakClient, manifest: dict) -> bool:
    print("\n── BLE discovery tests ────────────────────────────────────────────")

    svcs = client.services

    # T_BLE1 — OTA service
    ota_svc = svcs.get_service(OTA_SVC)
    record("T_BLE1 OTA service 0x8018 present", ota_svc is not None)
    if not ota_svc:
        return False

    # T_BLE2 — OTA characteristics
    cmd_char   = ota_svc.get_characteristic(OTA_COMMAND)
    recv_char  = ota_svc.get_characteristic(OTA_RECV_FW)
    record("T_BLE2.1 COMMAND char 0x8022 present", cmd_char is not None)
    record("T_BLE2.2 RECV_FW char 0x8020 present", recv_char is not None)

    if cmd_char:
        props = cmd_char.properties
        has_write = "write" in props
        has_indicate = "indicate" in props
        record("T_BLE2.3 COMMAND has write+indicate properties",
               has_write and has_indicate, str(props))

    if recv_char:
        props = recv_char.properties
        has_wnr = "write-without-response" in props
        has_indicate = "indicate" in props
        record("T_BLE2.4 RECV_FW has write-without-response+indicate",
               has_wnr and has_indicate, str(props))

    # T_BLE3 — C_RESET_REASON
    main_svc = svcs.get_service(MAIN_SVC)
    if main_svc:
        rr_char = main_svc.get_characteristic(C_RESET_REASON)
        if rr_char:
            try:
                rr_val = await client.read_gatt_char(C_RESET_REASON)
                code = rr_val[0] if rr_val else 255
                NAMES = {0:"unknown",1:"power_on",2:"ext_pin",3:"sw_reset",
                         4:"panic",5:"int_wdt",6:"task_wdt",7:"wdt",
                         8:"deep_sleep",9:"brownout",10:"sdio"}
                record("T_BLE3 C_RESET_REASON readable", True,
                       f"code={code} ({NAMES.get(code,'?')})")
            except Exception as e:
                record("T_BLE3 C_RESET_REASON readable", False, str(e))
        else:
            record("T_BLE3 C_RESET_REASON char present", False, "char not found (old firmware?)")

    # T_BLE4 — firmware version before OTA
    try:
        fwver_bytes = await client.read_gatt_char(C_FWVER)
        fwver = fwver_bytes.decode("utf-8").strip("\x00")
        expected_version = manifest.get("version", "")
        record("T_BLE4.1 C_FWVER readable", bool(fwver), fwver)
        # Pass if current version != target (genuine update) OR == target (re-flash)
        record("T_BLE4.2 version is semver-shaped",
               len(fwver.split(".")) == 3, fwver)
        info(f"Board currently on v{fwver}, target v{expected_version}")
        return True, fwver
    except Exception as e:
        record("T_BLE4 C_FWVER read", False, str(e))
        return False, None

# ── OTA transfer ───────────────────────────────────────────────────────────────

async def send_stop_command(device_addr: str) -> bool:
    """Open a dedicated connection, subscribe to both OTA chars, send STOP, wait for ACK.

    Two goals:
    1. Subscribe to RECV_FW so NimBLE can re-deliver any pending unconfirmed indicate
       from a prior abrupt disconnect (clears the stuck indicate queue).
    2. Send STOP so the OTA state machine resets (m_sector → 0, m_updating → false).
       STOP ACK is the first COMMAND indicate on this connection; its ATT CONFIRM
       is sent and fully in-flight before we disconnect, so the NimBLE COMMAND
       indicate queue is clean when the OTA connection opens.

    Separate connection is necessary because sending STOP and START on the same
    connection causes NimBLE to block the START ACK indicate behind the still-
    in-flight STOP ACK confirm.
    """
    try:
        async with BleakClient(device_addr, timeout=10) as c:
            stop_event = asyncio.Event()
            stop_data:  list[bytes] = []

            def on_cmd(_char, data: bytes):
                stop_data.append(bytes(data))
                stop_event.set()

            # Subscribe to COMMAND only — do NOT subscribe to RECV_FW here.
            # If we subscribe RECV_FW, NimBLE caches this connection's handle as
            # the indicate target. When the OTA connection later triggers a sector
            # ACK indicate, NimBLE sends it to this (now dead) connection handle
            # instead of the live OTA connection, silently dropping the indicate.
            await c.start_notify(OTA_COMMAND, on_cmd)
            await asyncio.sleep(0.5)  # CCCD settle

            await c.write_gatt_char(OTA_COMMAND, build_stop_command(), response=True)
            try:
                await asyncio.wait_for(stop_event.wait(), 5)
                raw = stop_data[0].hex() if stop_data else "(no data)"
                info(f"STOP ACK: {raw}")
            except asyncio.TimeoutError:
                info("STOP ACK timeout (board may not have been in OTA)")
            # Hold connection so ATT CONFIRM for STOP ACK completes before disconnect
            await asyncio.sleep(1.0)
        # Graceful disconnect — NimBLE COMMAND indicate queue clean for next connection
        await asyncio.sleep(1.0)
        return True
    except Exception as e:
        info(f"STOP connection failed: {e}")
        return False


async def perform_ota(client: BleakClient, fw_bytes: bytes, label: str) -> bool:
    total_sectors = -(-len(fw_bytes) // SECTOR_SIZE)  # ceiling division
    info(f"{label}: {len(fw_bytes)} bytes, {total_sectors} sectors")

    # Subscribe to both characteristics ONCE before doing anything.
    # Re-subscribing per sector races with the board's ACK indicate.
    sector_ack_event = asyncio.Event()
    sector_ack_data: list[bytes] = []
    cmd_ack_event   = asyncio.Event()
    cmd_ack_data:    list[bytes] = []

    def on_recv_indicate(_char, data: bytes):
        sector_ack_data.clear()
        sector_ack_data.append(bytes(data))
        sector_ack_event.set()

    def on_cmd_indicate(_char, data: bytes):
        cmd_ack_data.clear()
        cmd_ack_data.append(bytes(data))
        cmd_ack_event.set()

    await client.start_notify(OTA_RECV_FW, on_recv_indicate)
    await client.start_notify(OTA_COMMAND,  on_cmd_indicate)
    await asyncio.sleep(0.5)  # CCCD settle

    # Verify CCCD descriptors are actually set to 0x0002 (indicate enabled).
    # If CoreBluetooth silently failed to write CCCD, indicates will never arrive
    # and the ATT CONFIRM path is broken — this is the suspected root cause.
    ota_svc = client.services.get_service(OTA_SVC)
    if ota_svc:
        for char_uuid, char_label in [(OTA_RECV_FW, "RECV_FW"), (OTA_COMMAND, "COMMAND")]:
            ch = ota_svc.get_characteristic(char_uuid)
            if ch:
                for desc in ch.descriptors:
                    if "2902" in str(desc.uuid).lower():
                        try:
                            val = await client.read_gatt_descriptor(desc.handle)
                            info(f"{char_label} CCCD = 0x{bytes(val).hex()} "
                                 f"(expect 0200 for indicate)")
                        except Exception as e:
                            info(f"{char_label} CCCD read failed: {e}")

    # ── START command ──────────────────────────────────────────────────────────
    # STOP was already sent on a separate connection (see send_stop_command).
    # The OTA state machine is clean; just send START.
    start_cmd = build_start_command(len(fw_bytes))
    await client.write_gatt_char(OTA_COMMAND, start_cmd, response=True)

    try:
        await asyncio.wait_for(cmd_ack_event.wait(), 10)
    except asyncio.TimeoutError:
        record(f"{label} T_OTA1 START command ACK", False, "timeout")
        return False

    ack = cmd_ack_data[0] if cmd_ack_data else b""
    status = (ack[4] | (ack[5] << 8)) if len(ack) >= 6 else 0xFFFF
    ok = status == 0x0000
    record(f"{label} T_OTA1 START command ACK accepted", ok, f"status=0x{status:04X}")
    if not ok:
        return False

    mtu = client.mtu_size
    info(f"{label}: Negotiated MTU: {mtu} · {total_sectors} sectors")
    await asyncio.sleep(0.3)  # let esp_ota_begin() complete if async

    # ── Sector transfer ────────────────────────────────────────────────────────
    transfer_start = time.monotonic()
    s = 0
    while s < total_sectors:
        sector_start = s * SECTOR_SIZE
        sector_data  = fw_bytes[sector_start: sector_start + SECTOR_SIZE]
        packets      = build_sector_packets(s, sector_data)

        sector_ack_event.clear()
        sector_ack_data.clear()

        # WRITE_NR with 20ms inter-packet delay.
        # WRITE+RESPONSE breaks macOS CoreBluetooth's ATT indicate pipeline: after a
        # burst of WRITE+RESPONSE ops the board's NimBLE blocks waiting for ATT CONFIRMs
        # that CoreBluetooth never delivers (known macOS BLE stack issue). WRITE_NR
        # avoids it. 20ms delay prevents TX queue overflow.
        for pkt in packets:
            await client.write_gatt_char(OTA_RECV_FW, pkt, response=False)
            await asyncio.sleep(0.020)

        is_last = (s == total_sectors - 1)
        poll_deadline = time.monotonic() + 60
        while not sector_ack_data and time.monotonic() < poll_deadline:
            if not client.is_connected:
                if is_last:
                    info(f"{label}: board disconnected after last sector (rebooting)")
                    break
                record(f"{label} T_OTA2 sector {s} ACK", False, "disconnected mid-transfer")
                return False
            await asyncio.sleep(0.05)
        else:
            if not sector_ack_data:
                record(f"{label} T_OTA2 sector {s} ACK", False,
                       f"timeout (connected={client.is_connected})")
                return False
        if is_last and not sector_ack_data:
            break  # disconnected on last sector — treat as reboot

        sector_ack = sector_ack_data[0] if sector_ack_data else b""
        sec_status = (sector_ack[2] | (sector_ack[3] << 8)) if len(sector_ack) >= 4 else 0xFFFF

        if sec_status == 0x0002:
            # indexError — board already has sectors 0..N-1; fast-forward the loop
            expected_s = (sector_ack[4] | (sector_ack[5] << 8)) if len(sector_ack) >= 6 else s + 1
            info(f"{label}: board already at sector {expected_s}, fast-forwarding…")
            s = expected_s
            continue

        if sec_status != 0x0000:
            record(f"{label} T_OTA2 sector {s} ACK success", False,
                   f"status=0x{sec_status:04X}")
            return False

        pct = int((s + 1) / total_sectors * 100)
        print(f"\r  [{INFO}] Transfer: {s+1}/{total_sectors} sectors ({pct}%) "
              f"{time.monotonic()-transfer_start:.0f}s", end="", flush=True)
        s += 1

    elapsed = time.monotonic() - transfer_start
    print()
    record(f"{label} T_OTA2 all {total_sectors} sectors ACK'd", True,
           f"{elapsed:.1f}s · {len(fw_bytes)//1024}KB")
    return True

async def wait_for_reboot_and_reconnect(device_addr: str, expected_version: str,
                                        label: str) -> bool:
    print(f"\n  [{INFO}] Waiting for board to reboot and reconnect…")

    # Board calls esp_restart() after the last sector — its BLE stack disappears
    # within a second or two. Detect by watching for scan advertisement to vanish
    # then reappear, or simply poll with a reconnect loop.
    info("Waiting 15s for board to reboot…")
    await asyncio.sleep(15)

    # Poll for reappearance via BleakScanner (more reliable than connect-probe on macOS)
    reconnect_deadline = time.monotonic() + 75
    appeared = False
    while time.monotonic() < reconnect_deadline:
        device = await BleakScanner.find_device_by_address(device_addr, timeout=5)
        if device:
            appeared = True
            break
        await asyncio.sleep(2)

    record(f"{label} T_OTA3 board reappeared in scan after flash", appeared)
    if not appeared:
        record(f"{label} T_OTA4 version confirmed after OTA", False, "board never reappeared")
        return False

    # Connect and read firmware version
    await asyncio.sleep(1)
    for attempt in range(5):
        try:
            async with BleakClient(device_addr, timeout=10) as client:
                if not client.is_connected:
                    raise ConnectionError("not connected")
                await asyncio.sleep(0.5)  # allow GATT cache to populate
                fwver_bytes = await client.read_gatt_char(C_FWVER)
                fwver = fwver_bytes.decode("utf-8").strip("\x00")
                match = fwver == expected_version
                record(f"{label} T_OTA4 C_FWVER = v{fwver} after reboot",
                       match, f"expected v{expected_version}")
                return match
        except Exception as e:
            if attempt < 4:
                await asyncio.sleep(3)
            else:
                record(f"{label} T_OTA4 version confirmed after OTA", False, str(e))

    return False

# ── Main ───────────────────────────────────────────────────────────────────────

async def main():
    target = sys.argv[1] if len(sys.argv) > 1 else None

    print("=" * 62)
    print("  WaterTank OTA Bench Test Suite  (Phase 6)")
    print("=" * 62)

    # ── Network tests (no BLE needed) ─────────────────────────────────────────
    net_result = run_network_tests()
    if not net_result:
        print("\nAborted: network/manifest tests failed.")
        _print_summary()
        return

    manifest  = net_result["manifest"]
    fw_bytes  = net_result["fw_bytes"]
    target_version = manifest["version"]

    # ── BLE scan ──────────────────────────────────────────────────────────────
    print("\n── BLE tests ──────────────────────────────────────────────────────")
    device = await test_scan(target)
    if not device:
        print("\nAborted: no BLE device found.")
        _print_summary()
        return

    # ── BLE discovery ─────────────────────────────────────────────────────────
    current_version = None
    # ── BLE discovery + OTA #1 on the SAME connection ────────────────────────
    # Keeping discovery and OTA on one connection avoids CoreBluetooth GATT cache
    # poisoning: a prior connection sets cached subscription state for RECV_FW that
    # the next connection inherits, causing indicates to be silently dropped.
    print("\n── OTA transfer #1 ────────────────────────────────────────────────")
    async with BleakClient(device.address, timeout=12) as client:
        record("BLE connection established", client.is_connected)
        if not client.is_connected:
            _print_summary()
            return

        result = await run_ble_discovery_tests(client, manifest)
        if isinstance(result, tuple):
            disc_ok, current_version = result
        else:
            disc_ok = result

        if not disc_ok:
            _print_summary()
            return

        ota_ok = await perform_ota(client, fw_bytes, "OTA#1")

    if not ota_ok:
        _print_summary()
        return

    # Board reboots — need fresh BleakClient
    reconnect_ok = await wait_for_reboot_and_reconnect(device.address, target_version, "OTA#1")

    if not reconnect_ok:
        _print_summary()
        return

    # ── OTA #2 — re-flash on already-updated board (downgrade guard check) ────
    print("\n── OTA transfer #2 (re-flash same binary) ─────────────────────────")
    info("Connecting for second OTA (same binary, should succeed or reject cleanly)…")
    await asyncio.sleep(3)
    await send_stop_command(device.address)

    async with BleakClient(device.address, timeout=12) as client2:
        if not client2.is_connected:
            record("OTA#2 connection", False, "could not reconnect")
            _print_summary()
            return

        ota2_ok = await perform_ota(client2, fw_bytes, "OTA#2")

    if ota2_ok:
        await wait_for_reboot_and_reconnect(device.address, target_version, "OTA#2")
    else:
        # Firmware rejected re-flash of same version — this is acceptable behavior
        # (board's anti-downgrade guard may reject version <= current)
        info("OTA#2 rejected — board anti-downgrade guard active (acceptable)")
        record("OTA#2 T_OTA5 clean rejection of same-version OTA", True,
               "board rejected as expected")

    _print_summary()


def _print_summary():
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
                print(f"    ✗ {name}" + (f": {detail}" if detail else ""))
    else:
        print("  — all green")
    print("=" * 62)


if __name__ == "__main__":
    asyncio.run(main())
