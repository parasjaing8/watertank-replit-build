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
import { useColors } from "@/hooks/useColors";
import { TANK_LOW_PCT } from "@/constants/thresholds";
import { formatTankPct, formatRelativeTime } from "@/utils/formatters";

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

type ColorTokens = { primary: string; success: string; warning: string; destructive: string };
function getTankStatusColor(pct: number, motorOn: boolean, c: ColorTokens): string {
  if (motorOn && pct < 95) return c.primary;
  if (pct >= 95) return c.primary;
  if (pct >= 30) return c.success;
  if (pct > 0)  return c.warning;
  return c.destructive;
}

export default function DashboardScreen() {
  const { t } = useLanguage();
  const colors = useColors();
  const { deviceState, simMode, runSimulation, settings, triggerSync } = useDevice();
  const insets = useSafeAreaInsets();

  const [countdown, setCountdown]         = useState(45);
  const countdownRef                       = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPumpStateRef                   = useRef<number>(deviceState.pumpState);
  const [showFullToast, setShowFullToast]  = useState(false);
  const [disconnectedSec, setDisconnectedSec] = useState(0);
  const toastAnim                          = useRef(new Animated.Value(0)).current;

  // Track the last known tank reading so farmers still see data when temporarily
  // out of BLE range rather than a blank disconnected screen.
  const [lastKnownTank, setLastKnownTank] = useState<{ pct: number; at: number } | null>(null);

  const isStartupDelay = deviceState.pumpState === 2;

  // Persist last known tank state whenever we have a live reading
  useEffect(() => {
    if ((deviceState.connected || simMode) && deviceState.tank > 0) {
      setLastKnownTank({ pct: deviceState.tank, at: Math.floor(Date.now() / 1000) });
    }
  }, [deviceState.connected, deviceState.tank, simMode]);

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
    if (!deviceState.connected && !simMode) {
      setDisconnectedSec(0);
      const id = setInterval(() => setDisconnectedSec(s => s + 1), 1000);
      return () => clearInterval(id);
    }
    setDisconnectedSec(0);
  }, [deviceState.connected, simMode]);

  const isLive = deviceState.connected || simMode;
  const isLastKnownMode = !isLive && !!lastKnownTank;

  // What to display in the tank widget: live value or last-known
  const displayPct = isLive ? deviceState.tank : (lastKnownTank?.pct ?? 0);
  const showTankSection = isLive || isLastKnownMode;

  const tankStatusLabel = getTankStatusLabel(displayPct, isLive ? deviceState.motorOn : false, t);
  const tankStatusColor = getTankStatusColor(displayPct, isLive ? deviceState.motorOn : false, colors);
  const pctColor = (isLive && deviceState.motorOn)
    ? colors.primary
    : displayPct >= 30 ? colors.primary
    : displayPct > 0 ? colors.warning : colors.destructive;

  const motorSubLabel = isStartupDelay
    ? `${t("motorStarting")} ${countdown}s`
    : deviceState.motorOn
      ? t("waterArrived")
      : t("waitingForWaterSupply");

  const topPad = Platform.OS === "web"
    ? Math.max(insets.top, 52)
    : insets.top + 12;

  const tankSizeLitres = settings.tankSizeLitres;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
            <Text style={[styles.appTitle, { color: colors.foreground }]}>WaterTank</Text>
            <View style={styles.statusRow}>
              {deviceState.connected
                ? <PulsingDot color={colors.success} />
                : <View style={[styles.dotOff, { backgroundColor: colors.mutedForeground }]} />}
              <Text style={[styles.statusLabel,
                { color: deviceState.connected ? colors.success : colors.mutedForeground }]}>
                {deviceState.connected ? t("connected") : t("lookingForDevice")}
              </Text>
            </View>
            {deviceState.connected && deviceState.lastSyncAt && (
              <Text style={[styles.syncText, { color: colors.mutedForeground }]}>
                {t("lastSync")}: {formatRelativeTime(deviceState.lastSyncAt, t)}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {simMode && (
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>DEMO</Text>
              </View>
            )}
            {deviceState.connected && !simMode && (
              <TouchableOpacity
                onPress={triggerSync}
                style={[styles.syncBtn, { backgroundColor: colors.muted }]}
                activeOpacity={0.7}
                accessibilityLabel={t("syncNow")}
              >
                <Feather name="refresh-cw" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── MANUAL OVERRIDE BANNER ── */}
        {deviceState.manual && (
          <View style={[styles.banner, { backgroundColor: colors.destructive }]}>
            <Feather name="alert-triangle" size={14} color="#FFF" />
            <Text style={styles.bannerText}>{t("pumpManual")}</Text>
          </View>
        )}

        {/* ── TANK SECTION — shown with live data OR last-known data ── */}
        {showTankSection && (
          <View style={[styles.tankSection, isLastKnownMode && styles.tankSectionFaded]}>
            <WaterTankWidget
              pct={displayPct}
              connected={isLive}
              motorOn={isLive ? deviceState.motorOn : false}
              tankColor={settings.tankColor}
            />
            <View style={styles.statsStack}>
              <Text style={[styles.pctText, { color: pctColor }]}>
                {formatTankPct(displayPct)}
              </Text>
              <Text style={[styles.tankStatusLabel, { color: tankStatusColor }]}>
                {tankStatusLabel}
              </Text>
              {tankSizeLitres > 0 && (
                <Text style={[styles.litresText, { color: colors.mutedForeground }]}>
                  {Math.round((tankSizeLitres * displayPct) / 100)} {t("litres")}
                </Text>
              )}
              {isLastKnownMode && lastKnownTank && (
                <View style={[styles.lastKnownBadge, { backgroundColor: colors.muted }]}>
                  <Feather name="clock" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.lastKnownText, { color: colors.mutedForeground }]}>
                    {t("lastKnown")} · {formatRelativeTime(lastKnownTank.at, t)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── DISCONNECTED CARD ── */}
        {!isLive && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardIcon}>
              <Feather name="wifi-off" size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {t("lookingForDevice")}
              </Text>
              <Text style={[styles.cardSub, { color: colors.subText }]}>{t("deviceConnecting")}</Text>
              <PulsingDots color={colors.primary} />
              {disconnectedSec > 30 && (
                <Text style={[styles.cardSub, { marginTop: 6, color: colors.mutedForeground }]}>
                  {t("checkDevicePower")}
                </Text>
              )}
              <TouchableOpacity
                onPress={runSimulation}
                style={[styles.demoBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.82}
              >
                <Text style={styles.demoBtnText}>{t("tryDemo")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── MOTOR STATUS CARD ── */}
        {isLive && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[
              styles.cardIcon,
              { backgroundColor: deviceState.motorOn ? colors.accent : colors.muted }
            ]}>
              <Feather
                name={deviceState.motorOn ? "zap" : "zap-off"}
                size={20}
                color={deviceState.motorOn ? colors.primary : colors.mutedForeground}
              />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {deviceState.motorOn ? t("motorRunning") : t("motorOff")}
              </Text>
              <Text style={[styles.cardSub, { color: colors.subText }]}>{motorSubLabel}</Text>
            </View>
            {deviceState.motorOn && (
              <View style={[styles.motorActiveIndicator, { backgroundColor: colors.primary, shadowColor: colors.primary }]} />
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
  headerLeft: { gap: 2, flex: 1 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  appTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
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
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  syncText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
    marginLeft: 24,
  },
  syncBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  demoBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 10,
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
    gap: 2,
  },
  tankSectionFaded: {
    opacity: 0.65,
  },
  statsStack: {
    alignItems: "center",
    paddingTop: 4,
    gap: 2,
  },
  pctText: {
    fontSize: 64,
    fontFamily: "Inter_700Bold",
    letterSpacing: -3,
    lineHeight: 70,
  },
  tankStatusLabel: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.2,
  },
  litresText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  lastKnownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  lastKnownText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  // Cards
  card: {
    borderRadius: 18,
    borderWidth: 1,
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
  },
  cardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  motorActiveIndicator: {
    width: 8, height: 8, borderRadius: 4,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },

  demoBtn: {
    marginTop: 12,
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
    backgroundColor: "#22C55E",
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
