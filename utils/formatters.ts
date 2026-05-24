const LOCALE_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  kn: 'kn-IN',
};

import type { Translations } from '@/constants/i18n';

type Lang = 'en' | 'hi' | 'mr' | 'kn';
type Translator = (key: keyof Translations) => string;

function resolveLocale(lang?: Lang | string): string {
  if (!lang) return 'en-IN';
  return LOCALE_MAP[lang] ?? 'en-IN';
}

export function formatTime(epoch: number, lang?: Lang): string {
  if (!epoch || epoch < 1000000) return 'Time unknown';
  const d = new Date(epoch * 1000);
  return d.toLocaleTimeString(resolveLocale(lang), {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(epoch: number, lang?: Lang): string {
  if (!epoch || epoch < 1000000) return "Unknown date";
  const d = new Date(epoch * 1000);
  return d.toLocaleDateString(resolveLocale(lang), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(epoch: number, lang?: Lang): string {
  if (!epoch || epoch < 1000000) return "Unknown";
  const d = new Date(epoch * 1000);
  return d.toLocaleDateString(resolveLocale(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDayLabel(dayStr: string, lang?: Lang): string {
  const d = new Date(dayStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const locale = resolveLocale(lang);
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (d.toDateString() === today.toDateString()) return rtf.format(0, 'day');
    if (d.toDateString() === yesterday.toDateString()) return rtf.format(-1, 'day');
  } catch {
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  }
  return d.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatDuration(seconds: number, t?: Translator): string {
  const s = t ? t('sec') : 's';
  const m = t ? t('min') : 'm';
  const h = t ? t('hr') : 'h';
  if (seconds < 60) return `${seconds}${s}`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}${m}`;
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  return mm > 0 ? `${hh}${h} ${mm}${m}` : `${hh}${h}`;
}

export function formatRelativeTime(epoch: number | null, t?: Translator): string {
  if (!epoch) return t ? t('justNow') : 'just now';
  const diff = Math.floor(Date.now() / 1000) - epoch;
  if (diff < 60) return t ? t('justNow') : 'just now';
  if (diff < 120) return t ? t('minuteAgo') : '1 min ago';
  if (diff < 3600) return (t ? t('minutesAgo') : '%n min ago').replace('%n', String(Math.floor(diff / 60)));
  if (diff < 7200) return t ? t('hourAgoOne') : '1 hour ago';
  if (diff < 86400) return (t ? t('hoursAgo') : '%n hours ago').replace('%n', String(Math.floor(diff / 3600)));
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatTankPct(pct: number): string {
  if (pct === null || pct === undefined || isNaN(pct)) return '—';
  return `${Math.round(pct)}%`;
}

export function getTankColor(
  pct: number,
  theme: { tankEmpty: string; tankLow: string; tankMid: string; tankHigh: string; tankFull: string },
): string {
  if (pct >= 95) return theme.tankFull;
  if (pct >= 60) return theme.tankHigh;
  if (pct >= 30) return theme.tankMid;
  if (pct >= 10) return theme.tankLow;
  return theme.tankEmpty;
}

export function getDayBounds(date: Date): { start: number; end: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = Math.floor(d.getTime() / 1000);
  const end = start + 86400;
  return { start, end };
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function formatHeaderDate(date: Date, lang?: Lang): string {
  return date.toLocaleDateString(resolveLocale(lang), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
