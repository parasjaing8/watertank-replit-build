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
  BLE_CHAR_FILL_TARGET,
  BLE_CHAR_FW_VERSION,
  BLE_CHAR_LOG_CTRL,
  BLE_CHAR_LOG_DATA,
  BLE_CHAR_RESET_REASON,
  BLE_CHAR_STATE,
  BLE_CHAR_TANK,
  BLE_CHAR_TIME_SYNC,
  BLE_DEVICE_NAME,
  isTankDevice,
  BLE_LOG_ACK,
  BLE_LOG_START,
  BLE_LOG_STREAM_TIMEOUT,
  BLE_MTU_SIZE,
  BLE_RECONNECT_DELAYS,
  BLE_SCAN_TIMEOUT,
  BLE_SERVICE_UUID,
} from "@/constants/ble";
import { logBleInfo, logBleError, logBoardReset } from "@/services/CrashReportService";
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
let _bleServiceInstance: BLEService | null = null;

export function getBleManager(): unknown {
  if (!bleModuleAvailable || !BleManagerClass) return null;
  if (!_managerInstance) {
    _managerInstance = new (BleManagerClass as new () => unknown)();
  }
  return _managerInstance;
}

export function getBleService(): BLEService | null { return _bleServiceInstance; }
export function registerBleService(svc: BLEService): void { _bleServiceInstance = svc; }

// Initialise from current timestamp so IDs are always higher than any
// previously stored value after an app restart or hot-reload.
let eventIdCounter = Date.now();

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
    this.emit({ ...this.state, connected: false, pumpState: 0, motorOn: false });
  }

  subscribe(fn: Listener): () => void {
    this.listeners.push(fn);
    fn({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  getConnectedDeviceId(): string | null {
    return (this.device as { id?: string } | null)?.id ?? null;
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
    logBleInfo("scan start", { attempt: this.reconnectAttempt });
    if (!this.running) return;
    const mgr = getBleManager() as {
      startDeviceScan(
        uuids: string[] | null,
        opts: null,
        cb: (err: unknown, device: unknown) => void,
      ): void;
      stopDeviceScan(): void;
      state(): Promise<string>;
    } | null;
    if (!mgr) return;

    this.log("Scanning for WaterTank...");
    this.emit({ ...this.state, connected: false });

    const doScan = () => {
      this.scanTimer = setTimeout(() => {
        if (!this.running) return;
        this.log("Scan timeout — retrying...");
        try { mgr.stopDeviceScan(); } catch {}
        this.scheduleReconnect();
      }, BLE_SCAN_TIMEOUT);

      // Guard: native BLE callbacks for multiple matching devices can arrive
      // before stopDeviceScan() flushes — this prevents double connectToDevice.
      let connecting = false;

      try {
        // Filter by service UUID so Android matches on the advertising packet.
        // Device name ("WaterTank") is in the scan response — it arrives after
        // the advertising packet, so dev.name is often null at callback time when
        // scanning with null UUIDs. UUID filtering bypasses this entirely.
        mgr.startDeviceScan([BLE_SERVICE_UUID], null, (err, device) => {
          if (err) {
            this.log(`Scan error: ${String(err)}`);
            logBleError("scan error", { error: String(err) });
            this.scheduleReconnect();
            return;
          }
          if (connecting) return;
          const dev = device as { name?: string; id: string; connect(): Promise<unknown> } | null;
          if (!dev?.id) return;
          connecting = true;
          if (this.scanTimer) clearTimeout(this.scanTimer);
          this.scanTimer = null;
          try { mgr.stopDeviceScan(); } catch {}
          this.log(`Found ${dev.name ?? "WaterTank"} (${dev.id}) — connecting...`);
          const devId = dev.id;
          this.connectToDevice(dev).catch((e) => {
            this.log(`Connect failed: ${String(e)}`);
            logBleError("connect failed", { deviceId: devId, error: String(e) });
            this.scheduleReconnect();
          });
        });
      } catch (e) {
        this.log(`startDeviceScan threw: ${String(e)}`);
        this.scheduleReconnect();
      }
    };

    // On Android, BLE adapter may be in Resetting/Unknown state briefly after
    // app resumes from background. Check before scanning; retry in 1s if not ready.
    mgr.state().then((s) => {
      if (!this.running) return;
      if (s !== 'PoweredOn') {
        this.log(`BLE adapter not ready (${s}) — retry in 1s`);
        setTimeout(() => { if (this.running) this.startScan(); }, 1000);
        return;
      }
      doScan();
    }).catch(() => doScan());
  }

  private async connectToDevice(dev: { id: string; connect(): Promise<unknown> }): Promise<void> {
    try {
      const connected = await dev.connect() as {
        id: string;
        discoverAllServicesAndCharacteristics(): Promise<unknown>;
        requestMTU(size: number): Promise<unknown>;
        onDisconnected(cb: (err: unknown, d: unknown) => void): { remove(): void };
        readCharacteristicForService(
          service: string, char: string,
        ): Promise<{ value?: string }>;
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

      let connectedFwVersion: string | undefined;
      try {
        const fwChar = await connected.readCharacteristicForService(BLE_SERVICE_UUID, BLE_CHAR_FW_VERSION);
        if (fwChar?.value) {
          const version = Buffer.from(fwChar.value, "base64").toString("utf8").trim();
          this.state = { ...this.state, firmwareVersion: version };
          connectedFwVersion = version;
          this.log(`Firmware version: ${version}`);
        }
      } catch {}

      try {
        const rstChar = await connected.readCharacteristicForService(BLE_SERVICE_UUID, BLE_CHAR_RESET_REASON);
        if (rstChar?.value) {
          const code = Buffer.from(rstChar.value, "base64")[0];
          logBoardReset(code);
        }
      } catch {}

      try {
        const ftChar = await connected.readCharacteristicForService(BLE_SERVICE_UUID, BLE_CHAR_FILL_TARGET);
        if (ftChar?.value) {
          const pct = parseInt(Buffer.from(ftChar.value, "base64").toString("utf8").trim(), 10);
          if (!isNaN(pct)) this.state = { ...this.state, fillTarget: pct };
        }
      } catch {}

      logBleInfo("connected", { deviceId: connected.id, firmwareVersion: connectedFwVersion });

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
        logBleInfo("disconnected", { reason: err ? String(err) : "clean" });
        this.device = null;
        this.subscriptions.forEach((s) => { try { s.remove(); } catch {} });
        this.subscriptions = [];
        this.emit({ ...this.state, connected: false, firmwareVersion: null });
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
            const parsed = JSON.parse(json) as { state: number; motor: boolean; manual: boolean; tank: number; inlet?: boolean };
            const manual = !!parsed.manual;
            this.emit({
              ...this.state,
              connected: true,
              pumpState: parsed.state,
              motorOn: parsed.state === 3 || manual,
              manual,
              tank: Math.max(0, Math.min(100, parsed.tank)),
              inletActive: !!parsed.inlet,
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
              this.emit({ ...this.state, tank: Math.max(0, Math.min(100, pct)), connected: true });
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

  async writeFillTarget(pct: number): Promise<void> {
    const connected = this.device as {
      writeCharacteristicWithResponseForService(s: string, c: string, v: string): Promise<unknown>;
    } | null;
    if (!connected) throw new Error("Not connected");
    const clamped = Math.max(1, Math.min(98, Math.round(pct)));
    await connected.writeCharacteristicWithResponseForService(
      BLE_SERVICE_UUID,
      BLE_CHAR_FILL_TARGET,
      Buffer.from(String(clamped)).toString("base64"),
    );
    this.state = { ...this.state, fillTarget: clamped };
    this.emit({ ...this.state });
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
      // `sub` is declared with `let` before the timeout so the timeout callback
      // can reference it safely — avoids a temporal dead zone risk.
      let sub: { remove(): void };

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

      sub = connected.monitorCharacteristicForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_LOG_DATA,
        (err, char) => {
          if (err) {
            clearTimeout(timeoutHandle);
            sub.remove();
            this.subscriptions = this.subscriptions.filter(s => s !== sub);
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
