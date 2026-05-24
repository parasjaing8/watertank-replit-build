import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getBleManager, bleModuleAvailable } from '@/services/BLEService';
import { isTankDevice } from '@/constants/ble';
import { useColors } from '@/hooks/useColors';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function BlePairingSheet({ onClose, onSuccess }: Props) {
  const colors = useColors();
  const [scanning, setScanning] = useState(true);
  const [devices, setDevices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const managerRef = useRef<any>(null);

  useEffect(() => {
    let manager: any;
    const mgr = getBleManager() as any;
    if (!bleModuleAvailable || !mgr) {
      setError('Bluetooth not available');
      setScanning(false);
      return;
    }
    manager = mgr;
    managerRef.current = manager;
    setScanning(true);
    setDevices([]);
    setError(null);
    const found = new Map<string, any>();
    manager.startDeviceScan(null, { allowDuplicates: false }, (err, device) => {
      if (err) {
        setError(err.message);
        setScanning(false);
        return;
      }
      if (isTankDevice(device?.name)) {
        found.set(device.id, device);
        setDevices(Array.from(found.values()));
      }
    });
    const timer = setTimeout(() => {
      manager.stopDeviceScan();
      setScanning(false);
    }, 10000);
    return () => {
      clearTimeout(timer);
      try { manager.stopDeviceScan(); } catch {}
    };
  }, [scanKey]);

  async function connect(device: any) {
    try {
      managerRef.current?.stopDeviceScan();
      await device.connect();
      onSuccess();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>Pair your device</Text>

          {scanning && (
            <View style={styles.scanRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.scanText, { color: colors.mutedForeground }]}>Scanning…</Text>
            </View>
          )}

          {error && (
            <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
          )}

          {!scanning && devices.length === 0 && !error && (
            <>
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                No WATERTANK devices found. Make sure your device is powered on and nearby.
              </Text>
              <TouchableOpacity
                onPress={() => setScanKey((k) => k + 1)}
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry</Text>
              </TouchableOpacity>
            </>
          )}

          {devices.map((d) => (
            <TouchableOpacity
              key={d.id}
              onPress={() => connect(d)}
              style={[styles.deviceRow, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.deviceName, { color: colors.foreground }]}>{d.name}</Text>
              <Text style={[styles.deviceId, { color: colors.mutedForeground }]}>{d.id}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: 24,
    paddingBottom: 36,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 12,
  },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  scanText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  error: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  empty: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20, marginTop: 4 },
  deviceRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    gap: 4,
  },
  deviceName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  deviceId: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  cancelBtn: { alignSelf: 'center', paddingVertical: 12, marginTop: 8 },
  cancelText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  retryBtn: { paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  retryText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
