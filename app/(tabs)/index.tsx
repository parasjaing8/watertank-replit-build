import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { WaterTankWidget } from "@/components/WaterTankWidget";
import { TabSwipeWrapper } from "@/components/TabSwipeWrapper";
import { useDevice } from "@/context/DeviceContext";
import { useLanguage } from "@/context/LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TANK_LOW_PCT } from "@/constants/thresholds";
import { formatTankPct, formatRelativeTime } from "@/utils/formatters";

// Light theme for dashboard regardless of system dark mode
const BG = "#F0F4FA";
const CARD_BG = "#FFFFFF";
const CARD_BORDER = "#E2E8F0";
const TEXT_DARK = "#0F172A";
const TEXT_MID = "#475569";
const TEXT_MUTED = "#94A3B8";
const ACCENT = "#2563EB";
const SUCCESS = "#22C55E";
const WARNING = "#F59E0B";
const DANGER = "#EF4444";

function PulsingDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.5, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
    return () => scale.stopAnimation();
  }, []);
  return (
    <View style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, transform: [{ scale }] }} />
    </View>
  );
}

function PulsingDots({ color }: { color: string }) {
  const a = useRef(new Animated.Value(0.3)).current;
  const b = useRef(new Animated.Value(0.3)).current;
  const c = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = (val: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        Animated.delay(800 - delay),
      ]));
    const anim = Animated.parallel([loop(a, 0), loop(b, 400), loop(c, 800)]);
    anim.start();
    return () => anim.stop();
  }, []);
  const dot = (val: Animated.Value) => (
    <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: val }} />
  );
  return (
    <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
      {dot(a)}{dot(b)}{dot(c)}
    </View>
  );
}

function getTankStatusLabel(pct: number, motorOn: boolean, t: (k: any) => string): string {
  if (motorOn && pct < 95) return t("tankFilling");
  if (pct >= 95) return t("tankFull");
  if (pct >= 30) return t("tankHealthy");
  if (pct > 0) return t("tankLow");
  return t("tankEmpty");
}

function getTankStatusColor(pct: number, motorOn: boolean): string {
  if (motorOn && pct < 95) return ACCENT;
  if (pct >= 95) return ACCENT;
  if (pct >= 30) return SUCCESS;
  if (pct > 0) return WARNING;
  return DANGER;
}

export default function DashboardScreen() {
  const { t } = useLanguage();
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
      countdownRef.current = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
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

  const showLowWarning =
    deviceState.connected && !deviceState.motorOn &&
    deviceState.tank < TANK_LOW_PCT && deviceState.tank > 0;

  const tankStatusLabel = getTankStatusLabel(deviceState.tank, deviceState.motorOn, t);
  const tankStatusColor = getTankStatusColor(deviceState.tank, deviceState.motorOn);
  const pctColor = deviceState.tank >= 95 ? ACCENT : deviceState.tank >= 30 ? ACCENT : WARNING;

  // Motor card sub-label
  const motorSubLabel = isStartupDelay
    ? `${t("motorStarting")} ${countdown}s`
    : deviceState.motorOn
      ? t("waterArrived")
      : t("waitingForWaterSupply");

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>WaterTank</Text>
            {/* Connection row */}
            <View style={styles.statusRow}>
              {deviceState.connected ? (
                <PulsingDot color={SUCCESS} />
              ) : (
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: TEXT_MUTED }} />
              )}
              <Text style={[styles.statusLabel, { color: deviceState.connected ? SUCCESS : TEXT_MUTED }]}>
                {deviceState.connected ? t("connected") : t("lookingForDevice")}
              </Text>
            </View>
            {deviceState.connected && deviceState.lastSyncAt && (
              <Text style={styles.syncText}>
                Last Sync: {formatRelativeTime(deviceState.lastSyncAt, t)}
              </Text>
            )}
          </View>
          {simMode && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>DEMO</Text>
            </View>
          )}
        </View>

        {/* ── MANUAL OVERRIDE BANNER ── */}
        {deviceState.manual && (
          <View style={[styles.banner, { backgroundColor: DANGER }]}>
            <Feather name="alert-triangle" size={14} color="#FFF" />
            <Text style={styles.bannerText}>{t("pumpManual")}</Text>
          </View>
        )}

        {/* ── TANK SECTION ── */}
        <View style={styles.tankSection}>
          <WaterTankWidget
            pct={deviceState.tank}
            connected={deviceState.connected}
            motorOn={deviceState.motorOn}
          />

          {deviceState.connected && (
            <View style={styles.pctRow}>
              <Text style={[styles.pctText, { color: pctColor }]}>
                {formatTankPct(deviceState.tank)}
              </Text>
              <View>
                <Text style={[styles.tankStatusLabel, { color: tankStatusColor }]}>
                  {tankStatusLabel}
                </Text>
                {tankSize > 0 && (
                  <Text style={styles.litresText}>
                    {Math.round((tankSize * deviceState.tank) / 100)} {t("litres")}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* ── DISCONNECTED CARD ── */}
        {!deviceState.connected && (
          <View style={styles.card}>
            <Text style={styles.disconnTitle}>
              {simMode ? t("demoRunning") : t("lookingForDevice")}
            </Text>
            {!simMode && (
              <>
                <Text style={styles.disconnSub}>{t("deviceConnecting")}</Text>
                <PulsingDots color={ACCENT} />
                {disconnectedSec > 30 && (
                  <Text style={styles.disconnHint}>{t("checkDevicePower")}</Text>
                )}
                <TouchableOpacity
                  onPress={runSimulation}
                  style={styles.demoBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.demoBtnText}>Try Demo</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── MOTOR STATUS CARD ── */}
        {deviceState.connected && (
          <View style={styles.card}>
            <View style={[styles.motorIconWrap, { backgroundColor: deviceState.motorOn ? '#EFF6FF' : '#F1F5F9' }]}>
              <Feather
                name={deviceState.motorOn ? "zap" : "zap-off"}
                size={20}
                color={deviceState.motorOn ? ACCENT : TEXT_MUTED}
              />
            </View>
            <View style={styles.motorInfo}>
              <Text style={styles.motorLabel}>
                {deviceState.motorOn ? t("motorRunning") : "Motor OFF"}
              </Text>
              <Text style={styles.motorSub}>{motorSubLabel}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── TANK FULL TOAST ── */}
      {showFullToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{t("tankFullCelebration")}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
    gap: 16,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 4,
  },
  appTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  syncText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
    marginLeft: 21,
  },
  demoBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  demoBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },

  // Banner
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bannerText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },

  // Tank
  tankSection: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  pctRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  pctText: {
    fontSize: 52,
    fontFamily: "Inter_700Bold",
    letterSpacing: -2,
    lineHeight: 58,
  },
  tankStatusLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  litresText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // Card (shared for disconnected + motor)
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  disconnTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: TEXT_DARK,
    flex: 1,
  },
  disconnSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT_MID,
    flex: 1,
  },
  disconnHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
    flex: 1,
    marginTop: 4,
  },
  demoBtn: {
    marginTop: 10,
    backgroundColor: ACCENT,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
    alignSelf: "center",
  },
  demoBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  // Motor card
  motorIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  motorInfo: { flex: 1, gap: 3 },
  motorLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
  },
  motorSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: TEXT_MID,
  },

  // Toast
  toast: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    backgroundColor: "#22C55E",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  toastText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
