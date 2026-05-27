import {
  TANK_FULL_PCT,
  TANK_LOW_PCT,
  TANK_WARN_BLINK_PCT,
  FLOW_ZERO_TIMEOUT_MS,
  STARTUP_DELAY_MS,
  SENSOR_POLL_MS,
  BLE_NOTIFY_INTERVAL,
  DATA_RETENTION_DEFAULT_DAYS,
} from '@/constants/thresholds';

describe('thresholds', () => {
  it('TANK_LOW_PCT is less than TANK_FULL_PCT', () => {
    expect(TANK_LOW_PCT).toBeLessThan(TANK_FULL_PCT);
  });

  it('tank Pct values are within 0-100 range', () => {
    expect(TANK_FULL_PCT).toBeGreaterThan(0);
    expect(TANK_FULL_PCT).toBeLessThanOrEqual(100);
    expect(TANK_LOW_PCT).toBeGreaterThan(0);
    expect(TANK_LOW_PCT).toBeLessThan(100);
    expect(TANK_WARN_BLINK_PCT).toBeGreaterThan(0);
    expect(TANK_WARN_BLINK_PCT).toBeLessThanOrEqual(100);
  });

  it('timing values are positive', () => {
    expect(STARTUP_DELAY_MS).toBeGreaterThan(0);
    expect(SENSOR_POLL_MS).toBeGreaterThan(0);
    expect(FLOW_ZERO_TIMEOUT_MS).toBeGreaterThan(0);
    expect(BLE_NOTIFY_INTERVAL).toBeGreaterThan(0);
  });

  it('DATA_RETENTION_DEFAULT_DAYS is positive', () => {
    expect(DATA_RETENTION_DEFAULT_DAYS).toBeGreaterThan(0);
  });
});
