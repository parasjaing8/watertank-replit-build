import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { StatusDot } from "@/components/StatusDot";
import { TabSwipeWrapper } from "@/components/TabSwipeWrapper";
import { WaterTankWidget } from "@/components/WaterTankWidget";
import { useDevice } from "@/context/DeviceContext";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TANK_LOW_PCT } from "@/constants/thresholds";
import { formatTankPct, getTankColor } from "@/utils/formatters";

function PulsingDots({ color }: { color: string }) {
  const a = useRef(new Animated.Value(0.3)).current;
  const b = useRef(new Animated.Value(0.3)).current;
  const c = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const makeLoop = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay(800 - delay),
        ])
      );
    const anim = Animated.parallel([makeLoop(a, 0), makeLoop(b, 400), makeLoop(c, 800)]);
    anim.start();
    return () => anim.stop();
  }, []);

  const dot = (val: Animated.Value) => (
    <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: val }} />
  );

  return (
    <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
      {dot(a)}
      {dot(b)}
      {dot(c)}
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const { t, lang } = useLanguage();
  const { deviceState, simMode, runSimulation } = useDevice();

  const [countdown, setCountdown] = useState(45);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPumpStateRef = useRef<number>(deviceState.pumpState);
  const [showFullToast, setShowFullToast] = useState(false);
  const [disconnectedSec, setDisconnectedSec] = useState(0);
  const [tankSize, setTankSize] = useState<number>(0);

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

  useEffect(() => {
    if (prevPumpStateRef.current === 3 && deviceState.pumpState === 0) {
      setShowFullToast(true);
      const timer = setTimeout(() => setShowFullToast(false), 3000);
      return () => clearTimeout(timer);
    }
    prevPumpStateRef.current = deviceState.pumpState;
  }, [deviceState.pumpState]);

  useEffect(() => {
    AsyncStorage.getItem("@watertank_tank_size_litres").then((v) => {
      const n = parseInt(v || "0", 10);
      if (!isNaN(n)) setTankSize(n);
    });
  }, [deviceState.tank]);

  useEffect(() => {
    if (!deviceState.connected && !simMode) {
      setDisconnectedSec(0);
      const id = setInterval(() => setDisconnectedSec((s) => s + 1), 1000);
      return () => clearInterval(id);
    }
    setDisconnectedSec(0);
  }, [deviceState.connected, simMode]);

  const motorColor = deviceState.motorOn ? colors.motorOn : colors.motorOff;

  const showLowWarning =
    deviceState.connected &&
    !deviceState.motorOn &&
    deviceState.tank < TANK_LOW_PCT &&
    deviceState.tank > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.container}
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
            <Text style={[styles.manualBannerText, { letterSpacing: lang === "en" ? 1 : 0 }]}>{t("pumpManual")}</Text>
          </View>
        )}

        {/* Tank low warning banner */}
        {showLowWarning && (
          <View style={[styles.lowBanner, { backgroundColor: colors.warning }]}>
            <Text style={styles.lowBannerText}>{t("tankLow")}</Text>
          </View>
        )}

        <View style={styles.tankSection}>
          <WaterTankWidget pct={deviceState.tank} connected={deviceState.connected} />
          {deviceState.connected && (
            <Text style={[styles.bigPct, { color: getTankColor(deviceState.tank, colors) }]}>
              {formatTankPct(deviceState.tank)}
            </Text>
          )}
          {tankSize > 0 && deviceState.connected && (
            <Text style={[styles.litresText, { color: colors.foreground }]}>
              {Math.round((tankSize * deviceState.tank) / 100)} {t("litres")}
            </Text>
          )}
        </View>

        {!deviceState.connected && (
          <View style={[styles.disconnectedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.disconnectedTitle, { color: colors.foreground }]}>
              {simMode ? t("demoRunning") : t("lookingForDevice")}
            </Text>
            {!simMode && (
              <>
                <Text style={[styles.disconnectedSub, { color: colors.mutedForeground }]}>
                  {t("deviceConnecting")}
                </Text>
                <PulsingDots color={colors.primary} />
                {disconnectedSec > 30 && (
                  <Text style={[styles.disconnectedHint, { color: colors.mutedForeground }]}>
                    {t("checkDevicePower")}
                  </Text>
                )}
                <TouchableOpacity
                  onPress={runSimulation}
                  style={[styles.demoBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.demoBtnText, { color: colors.primaryForeground }]}>
                    Try Demo
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {deviceState.connected && (
          <View style={[styles.motorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.motorIndicator, { backgroundColor: motorColor }]} />
            <View style={styles.motorInfo}>
              <Text style={[styles.motorLabel, { color: colors.foreground }]}>
                {deviceState.motorOn ? t("motorRunning") : t("motorOff")}
              </Text>
              {isStartupDelay && (
                <Text style={[styles.motorSub, { color: colors.mutedForeground }]}>
                  {t("motorStarting")} {countdown}s
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {showFullToast && (
        <View style={[styles.toast, { backgroundColor: colors.success }]}>
          <Text style={styles.toastText}>{t("tankFullCelebration")}</Text>
        </View>
      )}
    </View>
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
  lowBanner: {
    width: "100%",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  lowBannerText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
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
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  disconnectedSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  disconnectedHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
    opacity: 0.85,
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
  bigPct: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.5,
    marginTop: -4,
  },
  litresText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: -2,
  },
  demoBtn: {
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
  },
  demoBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  toast: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  toastText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
