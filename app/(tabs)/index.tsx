import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { StatusDot } from "@/components/StatusDot";
import { TankLevelBar } from "@/components/TankLevelBar";
import { useDevice } from "@/context/DeviceContext";
import { useColors } from "@/hooks/useColors";
import { PUMP_STATE_LABELS } from "@/models/Event";

export default function DashboardScreen() {
  const colors = useColors();
  const { deviceState, simMode, simDone, dismissSimDone } = useDevice();
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
  const pumpStateLabel = PUMP_STATE_LABELS[deviceState.pumpState] ?? "Unknown";

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

      {/* Demo-completed banner */}
      {simDone && (
        <View style={[styles.doneCard, { backgroundColor: colors.success + "22", borderColor: colors.success }]}>
          <View style={styles.doneCardInner}>
            <View>
              <Text style={[styles.doneTitle, { color: colors.success }]}>Demo completed</Text>
              <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>
                One pump cycle simulated. Connect real hardware or run demo again from Settings.
              </Text>
            </View>
            <TouchableOpacity onPress={dismissSimDone} hitSlop={12}>
              <Text style={[styles.doneDismiss, { color: colors.mutedForeground }]}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Manual override banner */}
      {deviceState.manual && (
        <View style={[styles.manualBanner, { backgroundColor: colors.destructive }]}>
          <Text style={styles.manualBannerText}>⚠ MANUAL OVERRIDE ACTIVE</Text>
        </View>
      )}

      <View style={styles.tankSection}>
        <TankLevelBar pct={deviceState.tank} connected={deviceState.connected} />
      </View>

      {!deviceState.connected && !simDone && (
        <View style={[styles.disconnectedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.disconnectedTitle, { color: colors.mutedForeground }]}>
            {simMode ? "Demo running…" : "Waiting for WaterTank device"}
          </Text>
          {!simMode && (
            <Text style={[styles.disconnectedSub, { color: colors.mutedForeground }]}>
              Go to Settings → Run Demo to test without hardware
            </Text>
          )}
        </View>
      )}

      {deviceState.connected && (
        <View style={[styles.motorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.motorIndicator, { backgroundColor: motorColor }]} />
          <View style={styles.motorInfo}>
            <Text style={[styles.motorLabel, { color: colors.foreground }]}>
              Motor: {deviceState.motorOn ? "RUNNING" : "OFF"}
            </Text>
            {isStartupDelay && (
              <Text style={[styles.motorSub, { color: colors.mutedForeground }]}>
                Air Purge: {countdown}s remaining
              </Text>
            )}
          </View>
        </View>
      )}

      {deviceState.connected && (
        <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.stateLabel, { color: colors.mutedForeground }]}>Pump State</Text>
          <Text style={[styles.stateValue, { color: colors.foreground }]}>{pumpStateLabel}</Text>
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
  doneCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  doneCardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  doneTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  doneSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    maxWidth: "90%",
  },
  doneDismiss: {
    fontSize: 16,
    paddingTop: 1,
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
  stateCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stateLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  stateValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
