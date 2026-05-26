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

export const BLE_LOG_START = 0x01;
export const BLE_LOG_ACK = 0x02;

export const BLE_RECONNECT_DELAYS = [5000, 10000, 20000, 30000];
export const BLE_SCAN_TIMEOUT = 15000;
export const BLE_LOG_STREAM_TIMEOUT = 30000;
export const BLE_MTU_SIZE = 512;
// Firmware notifies every 2s; kept as a constant for reference / future dynamic cadence
export const BLE_NOTIFY_INTERVAL_MS = 2000;
