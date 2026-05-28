import { DeviceState, WaterEvent } from "@/models/Event";
import { DiscoveredDevice } from "./BLEService";

export interface IDeviceService {
  start(): void;
  stop(): void;
  subscribe(fn: (state: DeviceState) => void): () => void;
  subscribeEvents?(fn: (event: WaterEvent) => void): () => void;
  triggerSync?(): void;
  getBleLog?(): string[];
  addBleLogListener?(fn: (msg: string) => void): () => void;
  getConnectedDeviceId?(): string | null;
  writeFillTarget?(pct: number): Promise<void>;
  submitPassword?(password: string): Promise<'ok' | 'fail' | 'setup_required'>;
  submitSetup?(name: string, password: string): Promise<void>;
  setVisibility?(on: boolean): Promise<void>;
  discoverDevices?(timeoutMs?: number): Promise<DiscoveredDevice[]>;
  stopDiscovery?(): void;
  connectToDevice?(deviceId: string): Promise<void>;
}
