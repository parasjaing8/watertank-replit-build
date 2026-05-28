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

export type AuthState = 'pending' | 'ok' | 'fail' | 'setup_required';

export interface DeviceState {
  connected: boolean;
  tank: number;
  motorOn: boolean;
  manual: boolean;
  pumpState: number;
  lastSyncAt: number | null;
  firmwareVersion: string | null;
  fillTarget: number | null;
  inletActive: boolean;
  authState: AuthState;
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

export const DEFAULT_DEVICE_STATE: DeviceState = {
  connected: false,
  tank: 0,
  motorOn: false,
  manual: false,
  pumpState: 0,
  lastSyncAt: null,
  firmwareVersion: null,
  fillTarget: null,
  inletActive: false,
  authState: 'pending',
};

export const HIDDEN_EVENT_TYPES: EventType[] = [EventType.BLE_SYNCED];

// App-generated event IDs use a high-bit prefix to avoid collisions with
// board-generated IDs (which start at 1 and increment monotonically).
export const APP_EVENT_ID_PREFIX = 0x80000000;
