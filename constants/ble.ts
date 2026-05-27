export const BLE_DEVICE_NAME = "WaterTank";

export function isTankDevice(name?: string | null): boolean {
  return typeof name === "string" && name.toUpperCase().includes("WATERTANK");
}
export const BLE_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
export const BLE_CHAR_STATE = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
export const BLE_CHAR_TANK = "beb5483f-36e1-4688-b7f5-ea07361b26a8";
export const BLE_CHAR_LOG_CTRL = "beb54840-36e1-4688-b7f5-ea07361b26a8";
export const BLE_CHAR_LOG_DATA = "beb54841-36e1-4688-b7f5-ea07361b26a8";
export const BLE_CHAR_TIME_SYNC = "beb54842-36e1-4688-b7f5-ea07361b26a8";
export const BLE_CHAR_FW_VERSION = "beb54843-36e1-4688-b7f5-ea07361b26a8";
export const BLE_CHAR_RESET_REASON = "beb54844-36e1-4688-b7f5-ea07361b26a8";
export const BLE_CHAR_FILL_TARGET  = "beb54845-36e1-4688-b7f5-ea07361b26a8";
// Auth characteristics (firmware v1.3.0+)
export const BLE_CHAR_AUTH         = "beb54846-36e1-4688-b7f5-ea07361b26a8";
export const BLE_CHAR_SESSION      = "beb54847-36e1-4688-b7f5-ea07361b26a8";
export const BLE_CHAR_SETUP        = "beb54848-36e1-4688-b7f5-ea07361b26a8";
export const BLE_CHAR_VISIBILITY   = "beb54849-36e1-4688-b7f5-ea07361b26a8";
export const BLE_CHAR_CLAIMED      = "beb5484a-36e1-4688-b7f5-ea07361b26a8";

// NimBLEOta service — separate GATT service added by h2zero/NimBLEOta
// Short UUIDs 0x8018/0x8020/0x8022 expand to full 128-bit with BT base UUID
export const BLE_OTA_SERVICE_UUID = "00008018-0000-1000-8000-00805f9b34fb";
export const BLE_OTA_CHAR_RECV_FW = "00008020-0000-1000-8000-00805f9b34fb";
export const BLE_OTA_CHAR_COMMAND = "00008022-0000-1000-8000-00805f9b34fb";

export const BLE_LOG_START = 0x01;
export const BLE_LOG_ACK = 0x02;

export const BLE_RECONNECT_DELAYS = [5000, 10000, 20000, 30000];
export const BLE_SCAN_TIMEOUT = 15000;
export const BLE_LOG_STREAM_TIMEOUT = 30000;
export const BLE_MTU_SIZE = 512;
// Firmware notifies every 2s; kept as a constant for reference / future dynamic cadence
export const BLE_NOTIFY_INTERVAL_MS = 2000;
