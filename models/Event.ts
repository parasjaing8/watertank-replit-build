export enum EventType {
  WATER_ARRIVED = 0,
  MOTOR_ON = 1,
  MOTOR_OFF = 2,
  ALREADY_FULL = 3,
  MANUAL_ON = 4,
  MANUAL_OFF = 5,
  BLE_SYNCED = 6,
}

export enum StopReason {
  NONE = 0,
  TANK_FULL = 1,
  SUPPLY_CUT = 2,
  ALREADY_FULL = 3,
}

export interface WaterEvent {
  id: number;
  epoch: number;
  type: EventType;
  tankPct: number;
  flowLpm: number;
  stopReason: StopReason;
  durationSec: number;
  synced: boolean;
}

export interface DeviceState {
  connected: boolean;
  tank: number;
  motorOn: boolean;
  manual: boolean;
  pumpState: number;
  lastSyncAt: number | null;
}

export interface DailyStats {
  day: string;
  totalSec: number;
  runs: number;
}

export const EVENT_LABELS: Record<EventType, string> = {
  [EventType.WATER_ARRIVED]: "Supply Arrived",
  [EventType.MOTOR_ON]: "Motor Started",
  [EventType.MOTOR_OFF]: "Motor Stopped",
  [EventType.ALREADY_FULL]: "Tank Full — Skipped",
  [EventType.MANUAL_ON]: "Manual Override ON",
  [EventType.MANUAL_OFF]: "Manual Override OFF",
  [EventType.BLE_SYNCED]: "Synced to Phone",
};

export const STOP_REASON_LABELS: Record<StopReason, string> = {
  [StopReason.NONE]: "—",
  [StopReason.TANK_FULL]: "Tank Full",
  [StopReason.SUPPLY_CUT]: "Supply Cut",
  [StopReason.ALREADY_FULL]: "Already Full",
};

export const PUMP_STATE_LABELS: Record<number, string> = {
  0: "Idle",
  1: "Supply Detected",
  2: "Air Purge (45s)",
  3: "Pumping",
};

export const DEFAULT_DEVICE_STATE: DeviceState = {
  connected: false,
  tank: 0,
  motorOn: false,
  manual: false,
  pumpState: 0,
  lastSyncAt: null,
};
