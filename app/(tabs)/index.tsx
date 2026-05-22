import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WaterTankWidget } from "@/components/WaterTankWidget";
import { useDevice } from "@/context/DeviceContext";
import { useLanguage } from "@/context/LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TANK_LOW_PCT } from "@/constants/thresholds";
import { formatTankPct, formatRelativeTime } from "@/utils/formatters";

const BG         = "#EEF3FA";
const CARD_BG    = "#FFFFFF";
const CARD_BDR   = "#DDE6F0";
const TEXT_DARK  = "#0A1628";
const TEXT_MID   = "#4A5E78";
const TEXT_MUTED = "#8FA3BC";
const ACCENT     = "#1D6FE8";
const SUCCESS    = "#22C55E";
const WARNING    = "#F59E0B";
const DANGER     = "#EF4444";

function PulsingDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const ring  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.35, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 650, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const ringScale   = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 0.3, 0] });
  return (
    <View style={{ width: 18, height: 18, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{
        position: "absolute",
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: color,
        transform: [{ scale: ringScale }],
        opacity: ringOpacity,
      }} />
      <Animated.View style={{
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: color,
        transform: [{ scale: pulse }],
      }} />
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
        Animated.timing(val, { toValue: 1,   duration: 380, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0.3, duration: 380, useNativeDriver: true }),
        Animated.delay(760 - delay),
      ]));
    const anim = Animated.parallel([loop(a, 0), loop(b, 380), loop(c, 760)]);
    anim.start();
    return () => anim.stop();
  }, []);
  const dot = (val: Animated.Value) => (
    <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: val }} />
  );
  return (
    <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
      {dot(a)}{dot(b)}{dot(c)}
    </View>
  );
}

function getTankStatusLabel(pct: number, motorOn: boolean, t: (k: any) => string): string {
  if (motorOn && pct < 95) return t("tankFilling");
  if (pct >= 95) return t("tankFull");
  if (pct >= 30) return t("tankHealthy");
  if (pct > 0)  return t("tankLow");
  return t("tankEmpty");
}

function getTankStatusColor(pct: number, motorOn: boolean): string {
  if (motorOn && pct < 95) return ACCENT;
  if (pct >= 95) return ACCENT;
  if (pct >= 30) return SUCCESS;
  if (pct > 0)  return WARNING;
  return DANGER;
}

export default function DashboardScreen() {
  const { t } = useLanguage();
  const { deviceState, simMode, runSimulation } = useDevice();
  const insets = useSafeAreaInsets();

  const [countdown, setCountdown]         = useState(45);
  const countdownRef                       = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPumpStateRef                   = useRef<number>(deviceState.pumpState);
  const [showFullToast, setShowFullToast]  = useState(false);
  const [disconnectedSec, setDisconnectedSec] = useState(0);
  const [tankSize, setTankSize]            = useState<number>(0);
  const toastAnim                          = useRef(new Animated.Value(0)).current;

  const isStartupDelay = deviceState.pumpState === 2;

  useEffect(() => {
    if (isStartupDelay) {
      setCountdown(45);
      countdownRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [isStartupDelay]);

  useEffect(() => {
    if (prevPumpStateRef.current === 3 && deviceState.pumpState === 0) {
      setShowFullToast(true);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2400),
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setShowFullToast(false));
    }
    prevPumpStateRef.current = deviceState.pumpState;
  }, [deviceState.pumpState]);

  useEffect(() => {
    AsyncStorage.getItem("@watertank_tank_size_litres").then(v => {
      const n = parseInt(v || "0", 10);
      if (!isNaN(n)) setTankSize(n);
    });
  }, [deviceState.tank]);

  useEffect(() => {
    if (!deviceState.connected && !simMode) {
      setDisconnectedSec(0);
      const id = setInterval(() => setDisconnectedSec(s => s + 1), 1000);
      return () => clearInterval(id);
    }
    setDisconnectedSec(0);
  }, [deviceState.connected, simMode]);

  const tankStatusLabel = getTankStatusLabel(deviceState.tank, deviceState.motorOn, t);
  const tankStatusColor = getTankStatusColor(deviceState.tank, deviceState.motorOn);
  const pctColor = deviceState.motorOn ? ACCENT
    : deviceState.tank >= 30 ? ACCENT
    : deviceState.tank > 0 ? WARNING : DANGER;

  const motorSubLabel = isStartupDelay
    ? `${t("motorStarting")} ${countdown}s`
    : deviceState.motorOn
      ? t("waterArrived")
      : t("waitingForWaterSupply");

  const topPad = Platform.OS === "web"
    ? Math.max(insets.top, 52)
    : insets.top + 12;

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad, paddingBottom: Platform.OS === "web" ? 110 : 96 + insets.bottom },
        ]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.appTitle}>WaterTank</Text>
            <View style={styles.statusRow}>
              {deviceState.connected
                ? <PulsingDot color={SUCCESS} />
                : <View style={styles.dotOff} />}
              <Text style={[styles.statusLabel,
                { color: deviceState.connected ? SUCCESS : TEXT_MUTED }]}>
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
            <View style={styles.statsRow}>
              <Text style={[styles.pctText, { color: pctColor }]}>
                {formatTankPct(deviceState.tank)}
              </Text>
              <View style={styles.statsRight}>
                <Text style={[styles.tankStatusLine, { color: tankStatusColor }]}>
                  Tank
                </Text>
                <Text style={[styles.tankStatusLine, { color: tankStatusColor }]}>
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
            <View style={styles.cardIcon}>
              <Feather name="wifi-off" size={20} color={TEXT_MUTED} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>
                {simMode ? t("demoRunning") : t("lookingForDevice")}
              </Text>
              {!simMode && (
                <>
                  <Text style={styles.cardSub}>{t("deviceConnecting")}</Text>
                  <PulsingDots color={ACCENT} />
                  {disconnectedSec > 30 && (
                    <Text style={[styles.cardSub, { marginTop: 6, color: TEXT_MUTED }]}>
                      {t("checkDevicePower")}
                    </Text>
                  )}
                  <TouchableOpacity
                    onPress={runSimulation}
                    style={styles.demoBtn}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.demoBtnText}>Try Demo</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* ── MOTOR STATUS CARD ── */}
        {deviceState.connected && (
          <View style={styles.card}>
            <View style={[
              styles.cardIcon,
              { backgroundColor: deviceState.motorOn ? "#EBF3FF" : "#F1F5F9" }
            ]}>
              <Feather
                name={deviceState.motorOn ? "zap" : "zap-off"}
                size={20}
                color={deviceState.motorOn ? ACCENT : TEXT_MUTED}
              />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>
                {deviceState.motorOn ? t("motorRunning") : "Motor OFF"}
              </Text>
              <Text style={styles.cardSub}>{motorSubLabel}</Text>
            </View>
            {deviceState.motorOn && (
              <View style={styles.motorActiveIndicator} />
            )}
          </View>
        )}
      </ScrollView>

      {/* ── TANK FULL TOAST ── */}
      {showFullToast && (
        <Animated.View style={[
          styles.toast,
          { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }
        ]}>
          <Feather name="check-circle" size={16} color="#FFF" />
          <Text style={styles.toastText}>{t("tankFullCelebration")}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 14,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: { gap: 2 },
  appTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
    letterSpacing: -0.6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  dotOff: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: TEXT_MUTED,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  syncText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
    marginTop: 1,
    marginLeft: 24,
  },
  demoBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 4,
    shadowColor: "#F59E0B",
    shadowOpacity: 0.40,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  demoBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },

  // Banner
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bannerText: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },

  // Tank section
  tankSection: {
    alignItems: "center",
    gap: 6,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 4,
  },
  pctText: {
    fontSize: 58,
    fontFamily: "Inter_700Bold",
    letterSpacing: -2,
    lineHeight: 64,
  },
  statsRight: { gap: 0 },
  tankStatusLine: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 22,
  },
  litresText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
    marginTop: 3,
  },

  // Cards
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BDR,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#1A2A4A",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: TEXT_MID,
  },
  motorActiveIndicator: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },

  demoBtn: {
    marginTop: 12,
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 24,
    alignSelf: "flex-start",
  },
  demoBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  // Toast
  toast: {
    position: "absolute",
    bottom: 110,
    alignSelf: "center",
    backgroundColor: SUCCESS,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  toastText: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
