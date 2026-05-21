import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StatusDot } from "@/components/StatusDot";
import { WaterTankWidget } from '@/components/WaterTankWidget';
import { useDevice } from "@/context/DeviceContext";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from '@/context/LanguageContext';

export default function DashboardScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { deviceState, simMode } = useDevice();
  const [countdown, setCountdown] = useState(45);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isStartupDelay = deviceState.pumpState === 2;

  useEffect(() => {
    if (isStartupDelay) {
      setCountdown(45);
      countdownRef.current = setInterval(() => {
        setCountdown((c) => Math.max(0, c - 1));
      }, 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isStartupDelay]);

  const motorColor = deviceState.motorOn ? colors.motorOn : colors.motorOff;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      scrollEnabled={false}
    >
      <StatusDot
        connected={deviceState.connected}
        simMode={simMode}
        lastSyncAt={deviceState.lastSyncAt}
      />

      {/* Manual override banner */}
      {deviceState.manual && (
        <View style={[styles.manualBanner, { backgroundColor: colors.destructive }]}>
          <Text style={styles.manualBannerText}>{t('pumpManual')}</Text>
        </View>
      )}

      <View style={styles.tankSection}>
        <WaterTankWidget pct={deviceState.tank} connected={deviceState.connected} />
      </View>

      {!deviceState.connected && (
        <View style={[styles.disconnectedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.disconnectedTitle, { color: colors.mutedForeground }]}>
            {simMode ? 'Demo running…' : t('lookingForDevice')}
          </Text>
          {!simMode && (
            <Text style={[styles.disconnectedSub, { color: colors.mutedForeground }]}>
              {t('waitingForWater')}
            </Text>
          )}
        </View>
      )}

      {deviceState.connected && (
        <View style={[styles.motorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.motorIndicator, { backgroundColor: motorColor }]} />
          <View style={styles.motorInfo}>
            <Text style={[styles.motorLabel, { color: colors.foreground }]}>
              {deviceState.motorOn ? t('motorRunning') : t('motorOff')}
            </Text>
            {isStartupDelay && (
              <Text style={[styles.motorSub, { color: colors.mutedForeground }]}>
                {t('motorStarting')} {countdown}s
              </Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 16,
    alignItems: "center",
  },
  manualBanner: {
    width: "100%",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  manualBannerText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  tankSection: {
    alignItems: "center",
    paddingVertical: 8,
  },
  disconnectedCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  disconnectedTitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  disconnectedSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  motorCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  motorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  motorInfo: { flex: 1, gap: 2 },
  motorLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  motorSub: { fontSize: 13 },
});
