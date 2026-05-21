/**
 * BLEService — full BLE implementation for WaterTank ESP32.
 *
 * NOTE: Requires react-native-ble-plx ^3.2.0 and a native Android build.
 * In Expo Go / web, BLE is not available. The DeviceContext will
 * automatically fall back to SimulationService when BLE is unavailable.
 *
 * To enable BLE:
 *   1. pnpm --filter @workspace/mobile add react-native-ble-plx
 *   2. Add to app.json plugins: ["react-native-ble-plx"]
 *   3. Run expo prebuild --platform android
 *   4. Run cd android && ./gradlew assembleRelease
 */

import { Platform } from "react-native";
import { Buffer } from "buffer";

import {
  BLE_CHAR_LOG_CTRL,
  BLE_CHAR_LOG_DATA,
  BLE_CHAR_STATE,
  BLE_CHAR_TANK,
  BLE_CHAR_TIME_SYNC,
  BLE_DEVICE_NAME,
  BLE_LOG_ACK,
  BLE_LOG_START,
  BLE_LOG_STREAM_TIMEOUT,
  BLE_MTU_SIZE,
  BLE_RECONNECT_DELAYS,
  BLE_SCAN_TIMEOUT,
  BLE_SERVICE_UUID,
} from "@/constants/ble";
import { DEFAULT_DEVICE_STATE, DeviceState, EventType, StopReason, WaterEvent } from "@/models/Event";
import { insertEvent, insertSyncLog } from "@/storage/database";

import { IDeviceService } from "./IDeviceService";

type Listener = (state: DeviceState) => void;
type EventListener = (event: WaterEvent) => void;
type LogListener = (msg: string) => void;

let BleManagerClass: unknown = null;
let bleModuleAvailable = false;

if (Platform.OS === "android" || Platform.OS === "ios") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-ble-plx");
    BleManagerClass = mod.BleManager;
    bleModuleAvailable = true;
  } catch {
    bleModuleAvailable = false;
  }
}

export { bleModuleAvailable };

let _managerInstance: unknown = null;

function getBleManager(): unknown {
  if (!bleModuleAvailable || !BleManagerClass) return null;
  if (!_managerInstance) {
    _managerInstance = new (BleManagerClass as new () => unknown)();
  }
  return _managerInstance;
}

let eventIdCounter = 1;

function nextId(): number {
  return eventIdCounter++;
}

export class BLEService implements IDeviceService {
  private state: DeviceState = { ...DEFAULT_DEVICE_STATE };
  private listeners: Listener[] = [];
  private eventListeners: EventListener[] = [];
  private logListeners: LogListener[] = [];
  private logMessages: string[] = [];
  private running = false;
  private device: unknown = null;
  private reconnectAttempt = 0;
  private scanTimer: ReturnType<typeof setTimeout> | null = null;
  private logStreamTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: Array<{ remove(): void }> = [];

  start(): void {
    if (!bleModuleAvailable) {
      this.log("BLE not available — use Simulation Mode");
      return;
    }
    this.running = true;
    this.reconnectAttempt = 0;
    this.startScan();
  }

  stop(): void {
    this.running = false;
    this.cleanup();
    this.emit({ ...this.state, connected: false });
  }

  subscribe(fn: Listener): () => void {
    this.listeners.push(fn);
    fn({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  subscribeEvents(fn: EventListener): () => void {
    this.eventListeners.push(fn);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== fn);
    };
  }

  addBleLogListener(fn: LogListener): () => void {
    this.logListeners.push(fn);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== fn);
    };
  }

  getBleLog(): string[] {
    return [...this.logMessages];
  }

  triggerSync(): void {
    if (this.device && this.running) {
      this.requestLogStream().catch(() => {});
    }
  }

  private log(msg: string): void {
    const ts = new Date().toLocaleTimeString();
    const line = `[${ts}] ${msg}`;
    this.logMessages = [line, ...this.logMessages].slice(0, 200);
    this.logListeners.forEach((l) => l(line));
  }

  private emit(state: DeviceState): void {
    this.state = state;
    this.listeners.forEach((l) => l({ ...state }));
  }

  private logEvent(event: Omit<WaterEvent, "id" | "synced">): void {
    const waterEvent: WaterEvent = { ...event, id: nextId(), synced: true };
    try { insertEvent(waterEvent); } catch {}
    this.eventListeners.forEach((l) => l(waterEvent));
  }

  private cleanup(): void {
    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.scanTimer = null;
    if (this.logStreamTimer) clearTimeout(this.logStreamTimer);
    this.logStreamTimer = null;
    this.subscriptions.forEach((s) => { try { s.remove(); } catch {} });
    this.subscriptions = [];
    const mgr = getBleManager() as { stopDeviceScan(): void; cancelDeviceConnection(id: string): Promise<void> } | null;
    if (mgr) {
      try { mgr.stopDeviceScan(); } catch {}
      const dev = this.device as { id?: string } | null;
      if (dev?.id) {
        mgr.cancelDeviceConnection(dev.id).catch(() => {});
      }
    }
    this.device = null;
  }

  private scheduleReconnect(): void {
    if (!this.running) return;
    const delays = BLE_RECONNECT_DELAYS;
    const delay = delays[Math.min(this.reconnectAttempt, delays.length - 1)];
    this.reconnectAttempt++;
    this.log(`Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempt})...`);
    setTimeout(() => {
      if (this.running) this.startScan();
    }, delay);
  }

  private startScan(): void {
    if (!this.running) return;
    const mgr = getBleManager() as {
      startDeviceScan(
        uuids: null,
        opts: null,
        cb: (err: unknown, device: unknown) => void,
      ): void;
      stopDeviceScan(): void;
      state(cb: (err: unknown, state: string) => void): void;
    } | null;
    if (!mgr) return;

    this.log("Scanning for WaterTank...");
    this.emit({ ...this.state, connected: false });

    this.scanTimer = setTimeout(() => {
      if (!this.running) return;
      this.log("Scan timeout — retrying...");
      try { mgr.stopDeviceScan(); } catch {}
      this.scheduleReconnect();
    }, BLE_SCAN_TIMEOUT);

    try {
      mgr.startDeviceScan(null, null, (err, device) => {
        if (err) {
          this.log(`Scan error: ${String(err)}`);
          this.scheduleReconnect();
          return;
        }
        const dev = device as { name?: string; id: string; connect(): Promise<unknown> } | null;
        if (dev?.name === BLE_DEVICE_NAME) {
          if (this.scanTimer) clearTimeout(this.scanTimer);
          this.scanTimer = null;
          try { mgr.stopDeviceScan(); } catch {}
          this.log(`Found ${dev.name} (${dev.id}) — connecting...`);
          this.connectToDevice(dev).catch((e) => {
            this.log(`Connect failed: ${String(e)}`);
            this.scheduleReconnect();
          });
        }
      });
    } catch (e) {
      this.log(`startDeviceScan threw: ${String(e)}`);
      this.scheduleReconnect();
    }
  }

  private async connectToDevice(dev: { id: string; connect(): Promise<unknown> }): Promise<void> {
    try {
      const connected = await dev.connect() as {
        id: string;
        discoverAllServicesAndCharacteristics(): Promise<unknown>;
        requestMTU(size: number): Promise<unknown>;
        onDisconnected(cb: (err: unknown, d: unknown) => void): { remove(): void };
        writeCharacteristicWithResponseForService(
          service: string, char: string, base64: string,
        ): Promise<unknown>;
        monitorCharacteristicForService(
          service: string, char: string,
          cb: (err: unknown, char: unknown) => void,
        ): { remove(): void };
      };
      this.device = connected;
      this.reconnectAttempt = 0;

      await connected.discoverAllServicesAndCharacteristics();
      this.log("Services discovered");

      try {
        await connected.requestMTU(BLE_MTU_SIZE);
      } catch {}

      const ts = Math.floor(Date.now() / 1000);
      const buf = Buffer.alloc(4);
      buf.writeUInt32LE(ts, 0);
      await connected.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_TIME_SYNC,
        buf.toString("base64"),
      );
      this.log(`Time sync sent: ${ts}`);

      const disconnectSub = connected.onDisconnected((err) => {
        this.log(`Disconnected: ${err ? String(err) : "clean"}`);
        this.device = null;
        this.subscriptions.forEach((s) => { try { s.remove(); } catch {} });
        this.subscriptions = [];
        this.emit({ ...this.state, connected: false });
        if (this.running) this.scheduleReconnect();
      });
      this.subscriptions.push(disconnectSub);

      const stateSub = connected.monitorCharacteristicForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_STATE,
        (err, char) => {
          if (err) return;
          try {
            const c = char as { value?: string };
            if (!c?.value) return;
            const json = Buffer.from(c.value, "base64").toString("utf8");
            const parsed = JSON.parse(json) as { state: number; motor: boolean; manual: boolean; tank: number };
            this.emit({
              ...this.state,
              connected: true,
              pumpState: parsed.state,
              motorOn: parsed.motor,
              manual: parsed.manual,
              tank: parsed.tank,
            });
          } catch {}
        },
      );
      this.subscriptions.push(stateSub);

      const tankSub = connected.monitorCharacteristicForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_TANK,
        (err, char) => {
          if (err) return;
          try {
            const c = char as { value?: string };
            if (!c?.value) return;
            const str = Buffer.from(c.value, "base64").toString("utf8");
            const pct = parseFloat(str);
            if (!isNaN(pct)) {
              this.emit({ ...this.state, tank: pct, connected: true });
            }
          } catch {}
        },
      );
      this.subscriptions.push(tankSub);

      this.emit({ ...this.state, connected: true, lastSyncAt: Math.floor(Date.now() / 1000) });

      await this.requestLogStream();
    } catch (e) {
      this.log(`Connection sequence failed: ${String(e)}`);
      this.device = null;
      this.scheduleReconnect();
    }
  }

  private async requestLogStream(): Promise<void> {
    const connected = this.device as {
      writeCharacteristicWithResponseForService(s: string, c: string, v: string): Promise<unknown>;
      monitorCharacteristicForService(s: string, c: string, cb: (e: unknown, c: unknown) => void): { remove(): void };
    } | null;
    if (!connected) return;

    this.log("Starting log stream...");
    const pendingEvents: WaterEvent[] = [];

    return new Promise<void>((resolve) => {
      const timeoutHandle = setTimeout(() => {
        this.log("Log stream timeout — sending ACK anyway");
        sub.remove();
        this.subscriptions = this.subscriptions.filter((s) => s !== sub);
        pendingEvents.forEach((e) => { try { insertEvent(e); } catch {} });
        connected
          .writeCharacteristicWithResponseForService(
            BLE_SERVICE_UUID,
            BLE_CHAR_LOG_CTRL,
            Buffer.from([BLE_LOG_ACK]).toString("base64"),
          )
          .catch(() => {});
        this.emit({ ...this.state, lastSyncAt: Math.floor(Date.now() / 1000) });
        insertSyncLog(Math.floor(Date.now() / 1000));
        resolve();
      }, BLE_LOG_STREAM_TIMEOUT);

      const sub = connected.monitorCharacteristicForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_LOG_DATA,
        (err, char) => {
          if (err) {
            clearTimeout(timeoutHandle);
            sub.remove();
            resolve();
            return;
          }
          try {
            const c = char as { value?: string };
            if (!c?.value) return;
            const str = Buffer.from(c.value, "base64").toString("utf8");
            if (str === "DONE") {
              clearTimeout(timeoutHandle);
              sub.remove();
              this.subscriptions = this.subscriptions.filter((s) => s !== sub);
              this.log(`Log stream done — ${pendingEvents.length} events`);
              pendingEvents.forEach((e) => { try { insertEvent(e); } catch {} });
              connected
                .writeCharacteristicWithResponseForService(
                  BLE_SERVICE_UUID,
                  BLE_CHAR_LOG_CTRL,
                  Buffer.from([BLE_LOG_ACK]).toString("base64"),
                )
                .then(() => {
                  this.emit({ ...this.state, lastSyncAt: Math.floor(Date.now() / 1000) });
                  insertSyncLog(Math.floor(Date.now() / 1000));
                  resolve();
                })
                .catch(() => resolve());
              return;
            }
            const ev = JSON.parse(str) as {
              id: number; t: number; type: number;
              tank: number; dur: number; stop: number;
            };
            pendingEvents.push({
              id: ev.id,
              epoch: ev.t,
              type: ev.type as EventType,
              tankPct: ev.tank,
              flowLpm: 0,
              stopReason: ev.stop as StopReason,
              durationSec: ev.dur,
              synced: true,
            });
          } catch {}
        },
      );
      this.subscriptions.push(sub);

      connected
        .writeCharacteristicWithResponseForService(
          BLE_SERVICE_UUID,
          BLE_CHAR_LOG_CTRL,
          Buffer.from([BLE_LOG_START]).toString("base64"),
        )
        .catch((e: unknown) => {
          this.log(`LOG_CTRL write failed: ${String(e)}`);
          clearTimeout(timeoutHandle);
          resolve();
        });
    });
  }
}
