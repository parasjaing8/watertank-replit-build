import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { DATA_RETENTION_DEFAULT_DAYS, TANK_LOW_PCT } from "@/constants/thresholds";
import { DEFAULT_DEVICE_STATE, DeviceState, WaterEvent } from "@/models/Event";
import { BLEService, bleModuleAvailable } from "@/services/BLEService";
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
  notifyMotorOn: boolean;
  notifyMotorOff: boolean;
  notifyManualOverride: boolean;
  retentionDays: number;
  tankColor: 'black' | 'blue';
}

const DEFAULT_SETTINGS: AppSettings = {
  notifyMotorOn: true,
  notifyMotorOff: true,
  notifyManualOverride: true,
  retentionDays: DATA_RETENTION_DEFAULT_DAYS,
  tankColor: 'black',
};

interface DeviceContextValue {
  deviceState: DeviceState;
  /** True while a simulation demo cycle is running */
  simMode: boolean;
  /** True after a simulation demo has finished (cleared by dismissSimDone) */
  simDone: boolean;
  bleAvailable: boolean;
  /** Start a one-shot demo cycle. No-op if already running. */
  runSimulation: () => void;
  /** Dismiss the "demo completed" banner */
  dismissSimDone: () => void;
  bleLog: string[];
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  triggerSync: () => void;
  getEventsForDate: (date: Date) => WaterEvent[];
  getStats: () => ReturnType<typeof getDailyStats>;
  getDbInfo: () => ReturnType<typeof getDbStats>;
  clearData: () => void;
  exportData: () => WaterEvent[];
  refreshKey: number;
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
  const serviceRef = useRef<IDeviceService | null>(null);
  const { t } = useLanguage();
  const prevPumpStateRef = useRef<number>(0);
  const tankLowFiredRef = useRef<boolean>(false);

  // Initialise DB and load persisted settings on mount.
  // simMode is intentionally NOT persisted — the app always starts idle.
  useEffect(() => {
    try { initializeDatabase(); } catch (e) { console.error("DB init failed:", e); }
    loadSettings();
    startBleService();

    return () => {
      serviceRef.current?.stop();
      serviceRef.current = null;
    };
  }, []);

  async function loadSettings() {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
    } catch {}
  }

  /** Start the real BLE service (or a silent no-op stub if BLE is unavailable). */
  function startBleService() {
    serviceRef.current?.stop();
    serviceRef.current = null;

    if (!bleModuleAvailable) {
      // No BLE — stay idle. User must press "Run Demo" to see simulation.
      return;
    }

    const svc = new BLEService();
    serviceRef.current = svc;

    svc.subscribe((state) => {
      setDeviceState(state);
      setRefreshKey((k) => k + 1);
    });

    svc.addBleLogListener?.((msg) => {
      setBleLog((prev) => [msg, ...prev].slice(0, 200));
    });

    svc.start();

    setTimeout(() => {
      try { deleteOldEvents(settings.retentionDays); } catch {}
    }, 3000);
  }

  /** Run a single demo cycle, then auto-return to idle. */
  const runSimulation = useCallback(() => {
    if (simMode) return; // already running

    // Stop whatever is running (e.g. BLE service)
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
      // Restart real BLE service after demo (will be idle if no hardware)
      startBleService();
    });

    serviceRef.current = svc;

    svc.subscribe((state) => {
      setDeviceState(state);
      setRefreshKey((k) => k + 1);
    });

    svc.start();
  }, [simMode]);

  const dismissSimDone = useCallback(() => {
    setSimDone(false);
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    },
    [settings],
  );

  useEffect(() => {
    const prev = prevPumpStateRef.current;
    const cur = deviceState.pumpState;
    if (prev !== 3 && cur === 3 && settings.notifyMotorOn) {
      NotificationService.scheduleMotorOn(deviceState.tank, t);
    }
    if (prev === 3 && cur !== 3 && settings.notifyMotorOff) {
      NotificationService.scheduleMotorOff(deviceState.tank, 0, t);
    }
    prevPumpStateRef.current = cur;
  }, [deviceState.pumpState, deviceState.tank, settings.notifyMotorOn, settings.notifyMotorOff, t]);

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
        NotificationService.scheduleTankLow(t);
      }
    } else if (deviceState.tank >= TANK_LOW_PCT) {
      tankLowFiredRef.current = false;
    }
  }, [deviceState.tank, deviceState.motorOn, deviceState.connected, settings.notifyMotorOn, t]);

  const triggerSync = useCallback(() => {
    serviceRef.current?.triggerSync?.();
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
        dismissSimDone,
        bleLog,
        settings,
        updateSettings,
        triggerSync,
        getEventsForDate,
        getStats,
        getDbInfo,
        clearData,
        exportData,
        refreshKey,
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
