import { Platform } from "react-native";

import { DailyStats, EventType, StopReason, WaterEvent } from "@/models/Event";

// expo-sqlite doesn't work on web — all operations are no-ops on web
const isWeb = Platform.OS === "web";

let SQLite: typeof import("expo-sqlite") | null = null;
let db: import("expo-sqlite").SQLiteDatabase | null = null;

if (!isWeb) {
  SQLite = require("expo-sqlite");
}

function getDb(): import("expo-sqlite").SQLiteDatabase | null {
  if (isWeb || !SQLite) return null;
  if (!db) {
    db = SQLite.openDatabaseSync("watertank.db");
  }
  return db;
}

export function initializeDatabase(): void {
  const database = getDb();
  if (!database) return;
  database.execSync(`
    CREATE TABLE IF NOT EXISTS events (
      id           INTEGER NOT NULL,
      epoch        INTEGER NOT NULL,
      type         INTEGER NOT NULL,
      tank_pct     REAL    NOT NULL DEFAULT 0,
      flow_lpm     REAL    NOT NULL DEFAULT 0,
      stop_reason  INTEGER NOT NULL DEFAULT 0,
      duration_sec INTEGER NOT NULL DEFAULT 0,
      synced       INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (id, epoch)
    );
    CREATE INDEX IF NOT EXISTS idx_events_epoch ON events(epoch);
    CREATE INDEX IF NOT EXISTS idx_events_type  ON events(type);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_events_id ON events(id);
    CREATE TABLE IF NOT EXISTS sync_log (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      synced_at INTEGER NOT NULL
    );
  `);
}

// Write operations use the async API so they don't block the JS thread.
// Errors are caught internally; callers do not need to await.

export function insertEvent(event: WaterEvent): void {
  getDb()
    ?.runAsync(
      `INSERT OR IGNORE INTO events
        (id, epoch, type, tank_pct, flow_lpm, stop_reason, duration_sec, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.epoch,
        event.type,
        event.tankPct,
        event.flowLpm,
        event.stopReason,
        event.durationSec,
        event.synced ? 1 : 0,
      ],
    )
    .catch((e) => console.error("DB insertEvent error:", e));
}

export function getEventsForDay(epochStart: number, epochEnd: number): WaterEvent[] {
  try {
    const rows = getDb()?.getAllSync<{
      id: number;
      epoch: number;
      type: number;
      tank_pct: number;
      flow_lpm: number;
      stop_reason: number;
      duration_sec: number;
      synced: number;
    }>(
      `SELECT * FROM events WHERE epoch >= ? AND epoch < ? ORDER BY epoch ASC`,
      [epochStart, epochEnd],
    );
    return (rows ?? []).map(rowToEvent);
  } catch (e) {
    console.error("DB getEventsForDay error:", e);
    return [];
  }
}

export function getDailyStats(limitDays: number): DailyStats[] {
  try {
    const rows = getDb()?.getAllSync<{
      day: string;
      total_sec: number;
      runs: number;
    }>(
      `SELECT
         date(epoch, 'unixepoch', 'localtime') as day,
         SUM(duration_sec) as total_sec,
         COUNT(*) as runs
       FROM events WHERE type = ?
       GROUP BY day ORDER BY day DESC LIMIT ?`,
      [EventType.MOTOR_OFF, limitDays],
    );
    return (rows ?? []).map((r) => ({
      day: r.day,
      totalSec: r.total_sec ?? 0,
      runs: r.runs,
    }));
  } catch (e) {
    console.error("DB getDailyStats error:", e);
    return [];
  }
}

export function getLastSyncTime(): number | null {
  try {
    const row = getDb()?.getFirstSync<{ max_sync: number | null }>(
      `SELECT MAX(synced_at) as max_sync FROM sync_log`,
    );
    return row?.max_sync ?? null;
  } catch {
    return null;
  }
}

export function insertSyncLog(syncedAt: number): void {
  getDb()
    ?.runAsync(`INSERT INTO sync_log (synced_at) VALUES (?)`, [syncedAt])
    .catch((e) => console.error("DB insertSyncLog error:", e));
}

export function deleteOldEvents(retentionDays: number): void {
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 86400;
  const database = getDb();
  database
    ?.runAsync(`DELETE FROM events WHERE epoch < ?`, [cutoff])
    .catch((e) => console.error("DB deleteOldEvents error:", e));
  database
    ?.runAsync(`DELETE FROM sync_log WHERE synced_at < ?`, [cutoff])
    .catch((e) => console.error("DB deleteOldSyncLog error:", e));
}

export function getAllEvents(): WaterEvent[] {
  try {
    return (
      getDb()
        ?.getAllSync<{
          id: number;
          epoch: number;
          type: number;
          tank_pct: number;
          flow_lpm: number;
          stop_reason: number;
          duration_sec: number;
          synced: number;
        }>(`SELECT * FROM events ORDER BY epoch ASC`)
        ?.map(rowToEvent) ?? []
    );
  } catch {
    return [];
  }
}

export function clearAllEvents(): void {
  getDb()
    ?.runAsync(`DELETE FROM events`)
    .catch((e) => console.error("DB clearAllEvents error:", e));
  getDb()
    ?.runAsync(`DELETE FROM sync_log`)
    .catch((e) => console.error("DB clearSyncLog error:", e));
}

export function getDbStats(): { totalEvents: number; oldestEpoch: number | null } {
  try {
    const row = getDb()?.getFirstSync<{ cnt: number; oldest: number | null }>(
      `SELECT COUNT(*) as cnt, MIN(epoch) as oldest FROM events`,
    );
    return { totalEvents: row?.cnt ?? 0, oldestEpoch: row?.oldest ?? null };
  } catch {
    return { totalEvents: 0, oldestEpoch: null };
  }
}

function rowToEvent(r: {
  id: number;
  epoch: number;
  type: number;
  tank_pct: number;
  flow_lpm: number;
  stop_reason: number;
  duration_sec: number;
  synced: number;
}): WaterEvent {
  return {
    id: r.id,
    epoch: r.epoch,
    type: r.type as EventType,
    tankPct: r.tank_pct,
    flowLpm: r.flow_lpm,
    stopReason: r.stop_reason as StopReason,
    durationSec: r.duration_sec,
    synced: r.synced === 1,
  };
}
