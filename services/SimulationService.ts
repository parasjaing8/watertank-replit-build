import { DEFAULT_DEVICE_STATE, DeviceState, EventType, StopReason, WaterEvent } from "@/models/Event";
import { insertEvent, insertSyncLog } from "@/storage/database";

import { IDeviceService } from "./IDeviceService";

type Listener = (state: DeviceState) => void;
type EventListener = (event: WaterEvent) => void;

// Use a timestamp-based start so IDs don't collide with existing DB rows
// after an app restart or hot-reload.
let eventIdCounter = Date.now();
function nextId(): number { return eventIdCounter++; }

/**
 * SimulationService — one-shot demo cycle.
 *
 * Sequence (compressed timings):
 *   1. Connect (1 s)
 *   2. Supply detected → pumpState 1 (2 s)
 *   3. Air purge      → pumpState 2 (3 s, compressed from 45 s)
 *   4. Pumping        → pumpState 3, motorOn (tank 30 → 95 %, 1 s/step)
 *   5. Tank full      → pumpState 0, motorOn false
 *   6. Hold 2 s, then disconnect and call onComplete
 *
 * No looping — runs exactly once per start().
 */
export class SimulationService implements IDeviceService {
  private state: DeviceState = { ...DEFAULT_DEVICE_STATE };
  private listeners: Listener[] = [];
  private eventListeners: EventListener[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private motorStartTime = 0;
  private running = false;
  private _explicitlyStopped = false;
  private onComplete?: () => void;

  setOnComplete(fn: () => void): void {
    this.onComplete = fn;
  }

  start(): void {
    if (this.running) return;
    this._explicitlyStopped = false;
    this.running = true;
    this.state = {
      connected: false,
      tank: 30,
      motorOn: false,
      manual: false,
      pumpState: 0,
      lastSyncAt: null,
    };
    this.schedule(1000, () => this.stepConnect());
  }

  stop(): void {
    this._explicitlyStopped = true;
    this.running = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  subscribe(fn: Listener): () => void {
    this.listeners.push(fn);
    fn({ ...this.state });
    return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
  }

  subscribeEvents(fn: EventListener): () => void {
    this.eventListeners.push(fn);
    return () => { this.eventListeners = this.eventListeners.filter((l) => l !== fn); };
  }

  private schedule(ms: number, fn: () => void): void {
    const id = setTimeout(() => {
      this.timers = this.timers.filter((t) => t !== id);
      if (this.running) fn();
    }, ms);
    this.timers.push(id);
  }

  private emit(patch: Partial<DeviceState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  private logEvent(event: Omit<WaterEvent, "id" | "synced">): void {
    const e: WaterEvent = { ...event, id: nextId(), synced: true };
    try { insertEvent(e); } catch {}
    this.eventListeners.forEach((l) => l(e));
  }

  // ── Cycle steps ──────────────────────────────────────────────────────────

  private stepConnect(): void {
    this.emit({ connected: true });
    try { insertSyncLog(Math.floor(Date.now() / 1000)); } catch {}
    this.schedule(2000, () => this.stepSupplyDetected());
  }

  private stepSupplyDetected(): void {
    this.emit({ pumpState: 1 });
    this.logEvent({
      epoch: Math.floor(Date.now() / 1000),
      type: EventType.WATER_ARRIVED,
      tankPct: this.state.tank,
      flowLpm: 12.5,
      stopReason: StopReason.NONE,
      durationSec: 0,
    });
    this.schedule(3000, () => this.stepAirPurge());
  }

  private stepAirPurge(): void {
    // Compressed 45-second air purge → 3 s in demo
    this.emit({ pumpState: 2 });
    this.schedule(3000, () => this.stepPumpStart());
  }

  private stepPumpStart(): void {
    this.motorStartTime = Date.now();
    this.emit({ pumpState: 3, motorOn: true });
    this.logEvent({
      epoch: Math.floor(Date.now() / 1000),
      type: EventType.MOTOR_ON,
      tankPct: this.state.tank,
      flowLpm: 12.5,
      stopReason: StopReason.NONE,
      durationSec: 0,
    });
    this.scheduleFill();
  }

  private scheduleFill(): void {
    this.schedule(1200, () => this.stepFill());
  }

  private stepFill(): void {
    const newTank = Math.min(95.1, this.state.tank + 5);
    if (newTank >= 95) {
      this.emit({ tank: 95.1 });
      const duration = Math.floor((Date.now() - this.motorStartTime) / 1000);
      this.schedule(400, () => {
        this.emit({ pumpState: 0, motorOn: false });
        this.logEvent({
          epoch: Math.floor(Date.now() / 1000),
          type: EventType.MOTOR_OFF,
          tankPct: 95.1,
          flowLpm: 0,
          stopReason: StopReason.TANK_FULL,
          durationSec: duration,
        });
        try { insertSyncLog(Math.floor(Date.now() / 1000)); } catch {}
        // Hold 2 s on "tank full" so the user can see it, then wrap up
        this.schedule(2000, () => this.stepComplete());
      });
    } else {
      this.emit({ tank: newTank });
      this.scheduleFill();
    }
  }

  private stepComplete(): void {
    this.emit({ connected: false });
    this.running = false;
    const id = setTimeout(() => {
      this.timers = this.timers.filter(t => t !== id);
      if (!this._explicitlyStopped) this.onComplete?.();
    }, 300);
    this.timers.push(id);
  }
}
