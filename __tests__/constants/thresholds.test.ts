import {
  STARTUP_DELAY_MS,
} from '@/constants/thresholds';

describe('thresholds', () => {
  it('STARTUP_DELAY_MS is positive', () => {
    expect(STARTUP_DELAY_MS).toBeGreaterThan(0);
  });
});
