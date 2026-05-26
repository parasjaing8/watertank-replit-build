import { Buffer } from "buffer";
import {
  BLE_OTA_CHAR_COMMAND,
  BLE_OTA_CHAR_RECV_FW,
  BLE_OTA_SERVICE_UUID,
} from "@/constants/ble";
import { getBleManager } from "@/services/BLEService";

const GITHUB_RELEASES_API =
  "https://api.github.com/repos/parasjaing8/watertank-replit-build/releases/latest";

export interface FirmwareManifest {
  version: string;
  url: string;
  size: number;
  sha256: string;
  changelog: string;
  min_app_version: string;
}

// ── Semver ────────────────────────────────────────────────────────────────────

function semverGt(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
  }
  return false;
}

// ── Version check ─────────────────────────────────────────────────────────────

export async function checkFirmwareUpdate(
  currentVersion: string,
): Promise<FirmwareManifest | null> {
  const releaseRes = await fetch(GITHUB_RELEASES_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!releaseRes.ok) return null;

  const release = (await releaseRes.json()) as {
    tag_name: string;
    assets: { name: string; browser_download_url: string }[];
  };

  if (!release.tag_name.startsWith("fw-v")) return null;

  const manifestAsset = release.assets.find((a) => a.name === "manifest.json");
  if (!manifestAsset) return null;

  const manifestRes = await fetch(manifestAsset.browser_download_url);
  if (!manifestRes.ok) return null;

  const manifest = (await manifestRes.json()) as FirmwareManifest;
  if (!semverGt(manifest.version, currentVersion)) return null;

  return manifest;
}

// ── Download ──────────────────────────────────────────────────────────────────

export async function downloadFirmware(
  url: string,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);

  // React Native / Hermes supports arrayBuffer() on fetch responses
  const buffer = await res.arrayBuffer();
  onProgress?.(100);
  return new Uint8Array(buffer);
}

// ── NimBLEOta protocol ────────────────────────────────────────────────────────
// Reference: h2zero/NimBLEOta NimBLEOta.cpp
// Protocol: 4096-byte sectors, CRC16 per sector, 20-byte COMMAND packets,
//           variable-size RECV_FW packets with [sectorLo,sectorHi,packetNum,...data]

const SECTOR_SIZE   = 4096;           // firmware bytes per OTA sector
const MAX_DATA_PER_PACKET = 509;      // 512 MTU - 3 header bytes

// CRC16 — polynomial 0x1021, matches NimBLEOta::getCrc16()
function crc16(data: Uint8Array, len?: number): number {
  const n = len ?? data.length;
  let crc = 0;
  for (let i = 0; i < n; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
  }
  return crc;
}

// Build the 20-byte COMMAND start packet with file size embedded
function buildStartCommand(fileLen: number): string {
  const buf = new Uint8Array(20);
  buf[0] = 0x01; buf[1] = 0x00;  // startOtaCmd = 0x0001
  buf[2] = (fileLen) & 0xFF;
  buf[3] = (fileLen >> 8) & 0xFF;
  buf[4] = (fileLen >> 16) & 0xFF;
  buf[5] = (fileLen >> 24) & 0xFF;
  const crc = crc16(buf, 18);
  buf[18] = crc & 0xFF;
  buf[19] = (crc >> 8) & 0xFF;
  return Buffer.from(buf).toString("base64");
}

// Parse COMMAND ACK — returns true if accepted (otaAccept = 0x0000 at bytes 4-5)
function isCommandAckAccepted(data: Uint8Array): boolean {
  if (data.length < 6) return false;
  const status = data[4] | (data[5] << 8);
  return status === 0x0000; // otaAccept
}

// Parse RECV_FW ACK — returns true if sector accepted (otaFwSuccess = 0x0000 at bytes 2-3)
function isSectorAckSuccess(data: Uint8Array): boolean {
  if (data.length < 4) return false;
  const status = data[2] | (data[3] << 8);
  return status === 0x0000; // otaFwSuccess
}

// Build all BLE write packets for one sector
function buildSectorPackets(sectorIdx: number, sectorData: Uint8Array): string[] {
  const packets: string[] = [];
  const crcBuf = new Uint8Array(SECTOR_SIZE);
  let crcOffset = 0;
  let offset = 0;
  let packetNum = 0;

  while (offset < sectorData.length) {
    const remaining = sectorData.length - offset;
    const isLast = remaining <= MAX_DATA_PER_PACKET;
    const dataLen = Math.min(remaining, MAX_DATA_PER_PACKET);
    const chunk = sectorData.slice(offset, offset + dataLen);

    crcBuf.set(chunk, crcOffset);
    crcOffset += dataLen;

    if (isLast) {
      const crc = crc16(crcBuf, crcOffset);
      const packet = new Uint8Array(3 + dataLen + 2);
      packet[0] = sectorIdx & 0xFF;
      packet[1] = (sectorIdx >> 8) & 0xFF;
      packet[2] = 0xFF; // last packet marker
      packet.set(chunk, 3);
      packet[3 + dataLen] = crc & 0xFF;
      packet[3 + dataLen + 1] = (crc >> 8) & 0xFF;
      packets.push(Buffer.from(packet).toString("base64"));
    } else {
      const packet = new Uint8Array(3 + dataLen);
      packet[0] = sectorIdx & 0xFF;
      packet[1] = (sectorIdx >> 8) & 0xFF;
      packet[2] = packetNum;
      packet.set(chunk, 3);
      packets.push(Buffer.from(packet).toString("base64"));
      packetNum++;
    }
    offset += dataLen;
  }
  return packets;
}

// ── Main OTA transfer ─────────────────────────────────────────────────────────

export async function performOtaTransfer(
  firmwareBytes: Uint8Array,
  deviceId: string,
  onProgress: (sectorsDone: number, totalSectors: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const manager = getBleManager();
  if (!manager) throw new Error("BLE manager not available");

  const totalSectors = Math.ceil(firmwareBytes.length / SECTOR_SIZE);

  // Helper: wait for next INDICATE from a characteristic
  function waitForIndicate(charUUID: string, timeoutMs = 10000): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        sub.remove();
        reject(new Error(`Indicate timeout on ${charUUID}`));
      }, timeoutMs);

      const sub = manager.monitorCharacteristicForDevice(
        deviceId,
        BLE_OTA_SERVICE_UUID,
        charUUID,
        (err, char) => {
          clearTimeout(timer);
          sub.remove();
          if (err) { reject(err); return; }
          const val = (char as { value?: string } | null)?.value;
          if (!val) { reject(new Error("Empty indicate")); return; }
          resolve(new Uint8Array(Buffer.from(val, "base64")));
        },
      );
    });
  }

  if (signal?.aborted) throw new Error("Aborted");

  // Subscribe to COMMAND indicates before sending the start command
  const cmdAck = waitForIndicate(BLE_OTA_CHAR_COMMAND, 10000);

  // Send START command (WRITE with response to confirm delivery)
  await (manager as {
    writeCharacteristicWithResponseForDevice(d: string, s: string, c: string, v: string): Promise<unknown>
  }).writeCharacteristicWithResponseForDevice(
    deviceId, BLE_OTA_SERVICE_UUID, BLE_OTA_CHAR_COMMAND,
    buildStartCommand(firmwareBytes.length),
  );

  const cmdAckData = await cmdAck;
  if (!isCommandAckAccepted(cmdAckData)) {
    throw new Error("Board rejected OTA start command");
  }

  // Transfer sectors
  for (let s = 0; s < totalSectors; s++) {
    if (signal?.aborted) throw new Error("Aborted");

    const start = s * SECTOR_SIZE;
    const sectorData = firmwareBytes.slice(start, start + SECTOR_SIZE);
    const packets = buildSectorPackets(s, sectorData);

    // Subscribe to sector ACK before sending packets
    const sectorAck = waitForIndicate(BLE_OTA_CHAR_RECV_FW, 15000);

    // Send all packets WITHOUT response (WRITE_NR) for speed
    for (const pkt of packets) {
      if (signal?.aborted) throw new Error("Aborted");
      await (manager as {
        writeCharacteristicWithoutResponseForDevice(d: string, s: string, c: string, v: string): Promise<unknown>
      }).writeCharacteristicWithoutResponseForDevice(
        deviceId, BLE_OTA_SERVICE_UUID, BLE_OTA_CHAR_RECV_FW, pkt,
      );
    }

    const ackData = await sectorAck;
    if (!isSectorAckSuccess(ackData)) {
      const errCode = ackData[2] | (ackData[3] << 8);
      throw new Error(`Sector ${s} rejected by board (code ${errCode})`);
    }

    onProgress(s + 1, totalSectors);
  }
  // Board calls esp_restart() after last sector — no further action needed from app side
}
