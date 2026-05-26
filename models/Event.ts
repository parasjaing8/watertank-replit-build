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
  firmwareVersion: string | null;
}

export interface DailyStats {
  day: string;
  totalSec: number;
  runs: number;
}

export const EVENT_LABELS: Record<EventType, string> = {
  [EventType.WATER_ARRIVED]: 'Water Arrived',
  [EventType.MOTOR_ON]: 'Motor Started',
  [EventType.MOTOR_OFF]: 'Motor Stopped',
  [EventType.ALREADY_FULL]: 'Water Arrived (tank was already full)',
  [EventType.MANUAL_ON]: 'Pump set to manual',
  [EventType.MANUAL_OFF]: 'Manual mode turned off',
  [EventType.BLE_SYNCED]: 'Synced to Phone',
};

export const STOP_REASON_LABELS: Record<StopReason, string> = {
  [StopReason.NONE]: '—',
  [StopReason.TANK_FULL]: 'Tank Full',
  [StopReason.SUPPLY_CUT]: 'Water supply ended',
  [StopReason.ALREADY_FULL]: 'Already full',
};

export const PUMP_STATE_LABELS: Record<number, string> = {
  0: "Idle",
  1: "Water Arrived",
  2: "Motor Starting",
  3: "Pumping",
};

export const DEFAULT_DEVICE_STATE: DeviceState = {
  connected: false,
  tank: 0,
  motorOn: false,
  manual: false,
  pumpState: 0,
  lastSyncAt: null,
  firmwareVersion: null,
};

export const HIDDEN_EVENT_TYPES: EventType[] = [EventType.BLE_SYNCED];
