import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";

const AUTH_KEY = "@watertank_auth";

export interface StoredDevice {
  deviceMac: string;
  token: string;       // hex-encoded 16-byte session token
  deviceName: string;
}

type StoredMap = Record<string, { token: string; deviceName: string }>;

async function loadAll(): Promise<StoredMap> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw) as StoredMap;
  } catch {}
  return {};
}

export async function storeSession(
  deviceMac: string,
  token: Buffer | Uint8Array,
  deviceName: string,
): Promise<void> {
  const all = await loadAll();
  all[deviceMac] = { token: Buffer.from(token).toString("hex"), deviceName };
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(all));
}

export async function getSession(
  deviceMac: string,
): Promise<{ token: string; deviceName: string } | null> {
  const all = await loadAll();
  return all[deviceMac] ?? null;
}

export async function clearSession(deviceMac: string): Promise<void> {
  const all = await loadAll();
  delete all[deviceMac];
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(all));
}

export async function clearAllSessions(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}

export async function listSessions(): Promise<StoredDevice[]> {
  const all = await loadAll();
  return Object.entries(all).map(([deviceMac, v]) => ({ deviceMac, ...v }));
}
