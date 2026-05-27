import {
  EventType,
  StopReason,
  DEFAULT_DEVICE_STATE,
  EVENT_LABELS,
  STOP_REASON_LABELS,
  HIDDEN_EVENT_TYPES,
} from '@/models/Event';

describe('EventType enum', () => {
  it('has expected numeric values', () => {
    expect(EventType.WATER_ARRIVED).toBe(0);
    expect(EventType.MOTOR_ON).toBe(1);
    expect(EventType.MOTOR_OFF).toBe(2);
    expect(EventType.ALREADY_FULL).toBe(3);
    expect(EventType.MANUAL_ON).toBe(4);
    expect(EventType.MANUAL_OFF).toBe(5);
    expect(EventType.BLE_SYNCED).toBe(6);
  });
});

describe('StopReason enum', () => {
  it('has expected numeric values', () => {
    expect(StopReason.NONE).toBe(0);
    expect(StopReason.TANK_FULL).toBe(1);
    expect(StopReason.SUPPLY_CUT).toBe(2);
    expect(StopReason.ALREADY_FULL).toBe(3);
  });
});

describe('DEFAULT_DEVICE_STATE', () => {
  it('has expected shape with correct default values', () => {
    expect(DEFAULT_DEVICE_STATE).toEqual({
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
    });
  });

  it('is a snapshot that can be safely spread', () => {
    const copy = { ...DEFAULT_DEVICE_STATE };
    expect(copy.connected).toBe(false);
    copy.connected = true;
    expect(DEFAULT_DEVICE_STATE.connected).toBe(false);
  });
});

describe('EVENT_LABELS', () => {
  it('has labels for all EventType values', () => {
    for (const v of Object.values(EventType).filter((x) => typeof x === 'number') as number[]) {
      expect(EVENT_LABELS[v as EventType]).toBeDefined();
    }
  });

  it('has non-empty labels', () => {
    for (const v of Object.values(EventType).filter((x) => typeof x === 'number') as number[]) {
      expect(EVENT_LABELS[v as EventType].length).toBeGreaterThan(0);
    }
  });
});

describe('STOP_REASON_LABELS', () => {
  it('has labels for all StopReason values', () => {
    for (const v of Object.values(StopReason).filter((x) => typeof x === 'number') as number[]) {
      expect(STOP_REASON_LABELS[v as StopReason]).toBeDefined();
    }
  });
});

describe('HIDDEN_EVENT_TYPES', () => {
  it('includes BLE_SYNCED', () => {
    expect(HIDDEN_EVENT_TYPES).toContain(EventType.BLE_SYNCED);
  });
});
