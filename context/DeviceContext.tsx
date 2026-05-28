import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { DATA_RETENTION_DEFAULT_DAYS, TANK_LOW_PCT } from "@/constants/thresholds";
import { DEFAULT_DEVICE_STATE, DeviceState, EventType, StopReason, WaterEvent } from "@/models/Event";
import { BLEService, bleModuleAvailable, registerBleService } from "@/services/BLEService";
import { checkFirmwareUpdate, FirmwareManifest } from "@/services/FirmwareUpdateService";
import * as NotificationService from "@/services/NotificationService";
import { useLanguage } from "@/context/LanguageContext";
import { IDeviceService } from "@/services/IDeviceService";
import { SimulationService } from "@/services/SimulationService";
import {
  clearAllEvents,
  deleteOldEvents,
  getAllEvents,
  getDbStats,
  getDailyStats,
  getEventsForDay,
  initializeDatabase,
} from "@/storage/database";
import { getDayBounds } from "@/utils/formatters";

export interface AppSettings {
  settingsVersion: number;
  notifyMotorOn: boolean;
  notifyMotorOff: boolean;
  notifyManualOverride: boolean;
  retentionDays: number;
  tankColor: 'black' | 'blue';
  tankSizeLitres: number;
}

const CURRENT_SETTINGS_VERSION = 1;

const DEFAULT_SETTINGS: AppSettings = {
  settingsVersion: CURRENT_SETTINGS_VERSION,
  notifyMotorOn: true,
  notifyMotorOff: true,
  notifyManualOverride: true,
  retentionDays: DATA_RETENTION_DEFAULT_DAYS,
  tankColor: 'blue',
  tankSizeLitres: 0,
};

interface DeviceContextValue {
  deviceState: DeviceState;
  simMode: boolean;
  simDone: boolean;
  bleAvailable: boolean;
  runSimulation: () => void;
  stopSimulation: () => void;
  dismissSimDone: () => void;
  bleLog: string[];
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  triggerSync: () => void;
  setFillTarget: (pct: number) => Promise<void>;
  submitPassword: (password: string) => Promise<'ok' | 'fail' | 'setup_required'>;
  submitSetup: (name: string, password: string) => Promise<void>;
  setVisibility: (on: boolean) => Promise<void>;
  getEventsForDate: (date: Date) => WaterEvent[];
  getStats: () => ReturnType<typeof getDailyStats>;
  getDbInfo: () => ReturnType<typeof getDbStats>;
  clearData: () => void;
  exportData: () => WaterEvent[];
  refreshKey: number;
  refreshData: () => void;
  firmwareUpdateAvailable: boolean;
  firmwareManifest: FirmwareManifest | null;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

const SETTINGS_KEY = "@watertank_settings";

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [deviceState, setDeviceState] = useState<DeviceState>(DEFAULT_DEVICE_STATE);
  const [simMode, setSimMode] = useState(false);
  const [simDone, setSimDone] = useState(false);
  const [bleLog, setBleLog] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [firmwareUpdateAvailable, setFirmwareUpdateAvailable] = useState(false);
  const [firmwareManifest, setFirmwareManifest] = useState<FirmwareManifest | null>(null);
  const serviceRef = useRef<IDeviceService | null>(null);
  const { t } = useLanguage();
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; });
  const prevPumpStateRef = useRef<number>(0);
  const tankLowFiredRef = useRef<boolean>(false);
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const lastStopReasonRef = useRef<StopReason>(StopReason.NONE);
  const prevManualRef = useRef<boolean>(false);
  const simModeRef = useRef(false);
  useEffect(() => { simModeRef.current = simMode; }, [simMode]);
  const bgPausedRef = useRef(false);
  const lastFwCheckRef = useRef<{ at: number; version: string }>({ at: 0, version: '' });

  // When firmware version is read from board on connect, check GitHub for update.
  // Throttled: at most once per 6 hours per version to avoid GitHub rate limiting.
  useEffect(() => {
    const version = deviceState.firmwareVersion;
    if (!version) return;
    const now = Date.now();
    const last = lastFwCheckRef.current;
    if (version === last.version && now - last.at < 6 * 3600 * 1000) return;
    lastFwCheckRef.current = { at: now, version };
    checkFirmwareUpdate(version)
      .then((manifest) => {
        setFirmwareManifest(manifest);
        setFirmwareUpdateAvailable(manifest !== null);
      })
      .catch(() => {
        // no network — silently ignore, do not clear existing update state
      });
  }, [deviceState.firmwareVersion]);

  // Initialise DB, load persisted settings, THEN start BLE service so retention
  // uses the user's actual saved value rather than the default.
  useEffect(() => {
    try {
      initializeDatabase();
    } catch (e) {
      console.error("DB init failed:", e);
      Alert.alert("Storage Error", "Database failed to initialize. Event history won't be saved.");
    }

    let mounted = true;
    loadSettings().then((loaded) => {
      if (!mounted) return;
      startBleService(loaded.retentionDays);
    });

    return () => {
      mounted = false;
      serviceRef.current?.stop();
      serviceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings(): Promise<AppSettings> {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const raw = JSON.parse(saved) as Partial<AppSettings>;
        // Strip keys not present in DEFAULT_SETTINGS so stale fields from old
        // schema versions don't leak into the typed object.
        const clean = (Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]).reduce(
          (acc, k) => ({ ...acc, [k]: k in raw ? raw[k] : DEFAULT_SETTINGS[k] }),
          {} as AppSettings,
        );
        clean.settingsVersion = CURRENT_SETTINGS_VERSION;
        setSettings(clean);
        return clean;
      }
    } catch {}
    return DEFAULT_SETTINGS;
  }

  const startBleService = useCallback((retentionDays?: number) => {
    serviceRef.current?.stop();
    serviceRef.current = null;

    if (!bleModuleAvailable) {
      return;
    }

    const svc = new BLEService();
    serviceRef.current = svc;
    registerBleService(svc);

    svc.subscribe((state) => {
      setDeviceState(state);
    });

    svc.subscribeEvents?.((event) => {
      if (event.type === EventType.MOTOR_OFF) {
        lastStopReasonRef.current = event.stopReason;
      }
      setRefreshKey(k => k + 1);
    });

    svc.addBleLogListener?.((msg) => {
      setBleLog((prev) => [msg, ...prev].slice(0, 200));
    });

    svc.start();

    // Use the explicitly passed retention value (loaded from storage) so we
    // never accidentally apply the default on startup.
    const days = retentionDays ?? DEFAULT_SETTINGS.retentionDays;
    setTimeout(() => {
      try { deleteOldEvents(days); } catch {}
    }, 3000);
  // stable: only uses refs and React state setters (no closure over state/props)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause BLE when app goes to background, resume on foreground.
  // Prevents: (1) battery drain from background scanning, (2) JS bridge event
  // backlog that causes freeze when restoring from recent apps.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' && !simModeRef.current) {
        bgPausedRef.current = true;
        serviceRef.current?.stop();
        serviceRef.current = null;
      } else if (nextState === 'active' && bgPausedRef.current) {
        bgPausedRef.current = false;
        // Small delay lets the JS bridge flush any queued native events before
        // BLE scanning starts, avoiding a freeze on resume.
        setTimeout(() => {
          if (!simModeRef.current) {
            startBleService(settingsRef.current.retentionDays);
          }
        }, 500);
      }
    });
    return () => sub.remove();
  }, [startBleService]);

  const runSimulation = useCallback(() => {
    if (simMode) return;

    serviceRef.current?.stop();
    serviceRef.current = null;

    setSimDone(false);
    setSimMode(true);

    const svc = new SimulationService();

    svc.setOnComplete(() => {
      setSimMode(false);
      setSimDone(true);
      setRefreshKey((k) => k + 1);
      serviceRef.current = null;
      startBleService(settingsRef.current.retentionDays);
    });

    serviceRef.current = svc;

    svc.subscribe((state) => {
      setDeviceState(state);
    });

    svc.subscribeEvents?.((event) => {
      setRefreshKey(k => k + 1);
    });

    svc.start();
  }, [simMode, startBleService]);

  const stopSimulation = useCallback(() => {
    if (!simMode) return;
    serviceRef.current?.stop();
    serviceRef.current = null;
    setSimMode(false);
    setSimDone(false);
    startBleService(settingsRef.current.retentionDays);
  }, [simMode, startBleService]);

  const dismissSimDone = useCallback(() => {
    setSimDone(false);
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settingsRef.current, ...patch };
      setSettings(next);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    },
    [],
  );

  // Increment refreshKey when a BLE sync completes (lastSyncAt changes).
  // This replaces the previous approach of incrementing on every BLE state tick.
  useEffect(() => {
    if (deviceState.lastSyncAt !== null) setRefreshKey(k => k + 1);
  }, [deviceState.lastSyncAt]);

  // Notify on pump state transitions. `t` is intentionally read from a ref so
  // changing the app language does not re-fire these notifications.
  useEffect(() => {
    const prev = prevPumpStateRef.current;
    const cur = deviceState.pumpState;
    if (prev !== 3 && cur === 3 && settings.notifyMotorOn) {
      NotificationService.scheduleMotorOn(deviceState.tank, tRef.current);
    }
    if (prev === 3 && cur !== 3 && settings.notifyMotorOff) {
      NotificationService.scheduleMotorOff(deviceState.tank, lastStopReasonRef.current, tRef.current);
      lastStopReasonRef.current = StopReason.NONE;
    }
    prevPumpStateRef.current = cur;
  }, [deviceState.pumpState, deviceState.tank, settings.notifyMotorOn, settings.notifyMotorOff]);

  useEffect(() => {
    const prev = prevManualRef.current;
    const cur = deviceState.manual;
    if (!prev && cur && settings.notifyManualOverride) {
      NotificationService.scheduleManualOverride(tRef.current);
    }
    prevManualRef.current = cur;
  }, [deviceState.manual, settings.notifyManualOverride]);

  useEffect(() => {
    if (
      deviceState.connected &&
      !deviceState.motorOn &&
      deviceState.tank > 0 &&
      deviceState.tank < TANK_LOW_PCT &&
      settings.notifyMotorOn
    ) {
      if (!tankLowFiredRef.current) {
        tankLowFiredRef.current = true;
        NotificationService.scheduleTankLow(tRef.current);
      }
    } else if (deviceState.tank >= TANK_LOW_PCT) {
      tankLowFiredRef.current = false;
    }
  }, [deviceState.tank, deviceState.motorOn, deviceState.connected, settings.notifyMotorOn]);

  const triggerSync = useCallback(() => {
    serviceRef.current?.triggerSync?.();
  }, []);

  const setFillTarget = useCallback(async (pct: number) => {
    await serviceRef.current?.writeFillTarget?.(pct);
  }, []);

  const submitPassword = useCallback(async (password: string): Promise<'ok' | 'fail' | 'setup_required'> => {
    return (await serviceRef.current?.submitPassword?.(password)) ?? 'fail';
  }, []);

  const submitSetup = useCallback(async (name: string, password: string): Promise<void> => {
    await serviceRef.current?.submitSetup?.(name, password);
  }, []);

  const setVisibility = useCallback(async (on: boolean): Promise<void> => {
    await serviceRef.current?.setVisibility?.(on);
  }, []);

  const getEventsForDate = useCallback(
    (date: Date): WaterEvent[] => {
      const { start, end } = getDayBounds(date);
      return getEventsForDay(start, end);
    },
    [refreshKey],
  );

  const getStats = useCallback(() => getDailyStats(60), [refreshKey]);
  const getDbInfo = useCallback(() => getDbStats(), [refreshKey]);

  const refreshData = useCallback(() => setRefreshKey(k => k + 1), []);

  const clearData = useCallback(() => {
    clearAllEvents();
    setRefreshKey((k) => k + 1);
  }, []);

  const exportData = useCallback(() => getAllEvents(), []);

  return (
    <DeviceContext.Provider
      value={{
        deviceState,
        simMode,
        simDone,
        bleAvailable: bleModuleAvailable,
        runSimulation,
        stopSimulation,
        dismissSimDone,
        bleLog,
        settings,
        updateSettings,
        triggerSync,
        setFillTarget,
        submitPassword,
        submitSetup,
        setVisibility,
        getEventsForDate,
        getStats,
        getDbInfo,
        clearData,
        exportData,
        refreshKey,
        refreshData,
        firmwareUpdateAvailable,
        firmwareManifest,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice(): DeviceContextValue {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error("useDevice must be inside DeviceProvider");
  return ctx;
}

export function useDeviceSafe(): DeviceContextValue | null {
  return useContext(DeviceContext);
}
