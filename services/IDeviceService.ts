import { DeviceState } from "@/models/Event";

export interface IDeviceService {
  start(): void;
  stop(): void;
  subscribe(fn: (state: DeviceState) => void): () => void;
  triggerSync?(): void;
  getBleLog?(): string[];
  addBleLogListener?(fn: (msg: string) => void): () => void;
}
