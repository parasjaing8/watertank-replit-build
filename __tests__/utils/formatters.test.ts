import {
  formatTime,
  formatDate,
  formatShortDate,
  formatTankPct,
  formatRelativeTime,
  formatDuration,
  formatDayLabel,
  getDayBounds,
  addDays,
  isToday,
  formatHeaderDate,
} from '@/utils/formatters';

describe('formatTankPct', () => {
  it('returns formatted percentage for valid input', () => {
    expect(formatTankPct(72)).toBe('72%');
    expect(formatTankPct(0)).toBe('0%');
    expect(formatTankPct(100)).toBe('100%');
  });

  it('returns en-dash for null/undefined/NaN', () => {
    expect(formatTankPct(null as unknown as number)).toBe('—');
    expect(formatTankPct(undefined as unknown as number)).toBe('—');
    expect(formatTankPct(NaN)).toBe('—');
  });

  it('rounds to nearest integer', () => {
    expect(formatTankPct(72.4)).toBe('72%');
    expect(formatTankPct(72.6)).toBe('73%');
  });
});

describe('formatDuration', () => {
  it('formats seconds under 60 as Ns', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(59)).toBe('59s');
  });

  it('formats minutes under 3600 as Nm', () => {
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(3599)).toBe('59m');
  });

  it('formats hours with optional minutes', () => {
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(5400)).toBe('1h 30m');
    expect(formatDuration(7200)).toBe('2h');
  });

  it('uses translated abbreviations when translator provided', () => {
    const t = (k: string) => ({ sec: 'से', min: 'मि', hr: 'घं' }[k] || k);
    expect(formatDuration(45, t as any)).toBe('45से');
    expect(formatDuration(5400, t as any)).toBe('1घं 30मि');
  });
});

describe('formatRelativeTime', () => {
  it('returns just now for null/0 epoch', () => {
    expect(formatRelativeTime(null)).toBe('just now');
    expect(formatRelativeTime(0)).toBe('just now');
  });

  it('returns just now for epoch within 60s', () => {
    const recent = Math.floor(Date.now() / 1000) - 30;
    expect(formatRelativeTime(recent)).toBe('just now');
  });

  it('returns minute-ago strings for 60-3600s', () => {
    const oneMin = Math.floor(Date.now() / 1000) - 90;
    expect(formatRelativeTime(oneMin)).toBe('1 min ago');
    const fiveMin = Math.floor(Date.now() / 1000) - 300;
    expect(formatRelativeTime(fiveMin)).toContain('min ago');
  });

  it('handles hours and days', () => {
    const twoHours = Math.floor(Date.now() / 1000) - 7200;
    expect(formatRelativeTime(twoHours)).toContain('hours ago');
    const twoDays = Math.floor(Date.now() / 1000) - 172800;
    expect(formatRelativeTime(twoDays)).toContain('d ago');
  });

  it('uses translated labels when translator provided', () => {
    const t = (k: string) => {
      const m: Record<string, string> = { justNow: 'अभी', minuteAgo: '१ मि पहले' };
      return m[k] || k;
    };
    expect(formatRelativeTime(Math.floor(Date.now() / 1000) - 90, t as any)).toBe('१ मि पहले');
  });
});

describe('formatTime', () => {
  it('returns time string for valid epoch', () => {
    // Jan 1, 2026 14:30:00 UTC — locale-dependent format
    const result = formatTime(1735741800, 'en');
    expect(result.length).toBeGreaterThan(3);
    expect(result).not.toBe('Time unknown');
  });

  it('returns fallback for invalid epoch', () => {
    expect(formatTime(0)).toBe('Time unknown');
    expect(formatTime(500)).toBe('Time unknown');
  });
});

describe('formatDate', () => {
  it('returns date string for valid epoch', () => {
    const result = formatDate(1735741800, 'en');
    expect(result.length).toBeGreaterThan(5);
  });

  it('returns fallback for invalid epoch', () => {
    expect(formatDate(0)).toBe('Unknown date');
  });
});

describe('formatShortDate', () => {
  it('returns short date string for valid epoch', () => {
    const result = formatShortDate(1735741800, 'en');
    expect(result.length).toBeGreaterThan(3);
  });

  it('returns fallback for invalid epoch', () => {
    expect(formatShortDate(0)).toBe('Unknown');
  });
});

describe('formatDayLabel', () => {
  it('returns today/yesterday label for recent dates', () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const result = formatDayLabel(todayStr, 'en');
    expect(result.length).toBeGreaterThan(0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const yResult = formatDayLabel(yesterdayStr, 'en');
    expect(yResult.length).toBeGreaterThan(0);
  });

  it('returns formatted date for older dates', () => {
    const result = formatDayLabel('2026-01-15', 'en');
    expect(result.length).toBeGreaterThan(3);
  });
});

describe('formatHeaderDate', () => {
  it('returns long date string', () => {
    const result = formatHeaderDate(new Date('2026-01-15'), 'en');
    expect(result.length).toBeGreaterThan(10);
  });
});

describe('getDayBounds', () => {
  it('returns start-of-day and start-of-next-day in epoch seconds', () => {
    const d = new Date('2026-05-28T14:30:00Z');
    const { start, end } = getDayBounds(d);
    expect(end - start).toBe(86400);
    expect(start).toBeLessThan(end);
  });
});

describe('addDays', () => {
  it('adds days correctly', () => {
    const d = new Date('2026-05-28');
    const result = addDays(d, 5);
    expect(result.getDate()).toBe(2);
    expect(result.getMonth()).toBe(5); // June
  });
});

describe('isToday', () => {
  it('returns true for today', () => {
    expect(isToday(new Date())).toBe(true);
  });

  it('returns false for a past date', () => {
    expect(isToday(new Date('2020-01-01'))).toBe(false);
  });
});
