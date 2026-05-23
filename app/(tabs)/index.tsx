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
import AsyncStorage from '@react-native-async-storage/async-storage';

import { WaterTankWidget } from "@/components/WaterTankWidget";
import { useDevice } from "@/context/DeviceContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { formatTankPct, formatRelativeTime } from "@/utils/formatters";
import { STARTUP_DELAY_MS } from "@/constants/thresholds";

// ─── Pulsing connected dot ────────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const ring  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.35, duration: 650, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 650, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 1300, useNativeDriver: true }),
      Animated.timing(ring, { toValue: 0, duration: 0,    useNativeDriver: true }),
    ])).start();
  }, []);
  const ringScale   = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 0.3, 0] });
  return (
    <View style={{ width: 14, height: 14, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{
        position: "absolute", width: 8, height: 8, borderRadius: 4,
        backgroundColor: color, transform: [{ scale: ringScale }], opacity: ringOpacity,
      }} />
      <Animated.View style={{
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: color, transform: [{ scale: pulse }],
      }} />
    </View>
  );
}

// ─── Three searching dots ─────────────────────────────────────────────────────
function SearchingDots({ color }: { color: string }) {
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
    <Animated.View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, opacity: val }} />
  );
  return (
    <View style={{ flexDirection: "row", gap: 5, marginTop: 10 }}>
      {dot(a)}{dot(b)}{dot(c)}
    </View>
  );
}

// ─── Tank status helpers ──────────────────────────────────────────────────────
function getTankStatusLabel(pct: number, motorOn: boolean, t: (k: any) => string): string {
  if (motorOn && pct < 95) return t("tankFilling");
  if (pct >= 95) return t("tankFull");
  if (pct >= 30) return t("tankHealthy");
  if (pct > 0)   return t("tankLow");
  return t("tankEmpty");
}

type ColorTokens = { primary: string; success: string; warning: string; destructive: string };
function getTankStatusColor(pct: number, motorOn: boolean, c: ColorTokens): string {
  if (motorOn && pct < 95) return c.primary;
  if (pct >= 95) return c.primary;
  if (pct >= 30) return c.success;
  if (pct > 0)   return c.warning;
  return c.destructive;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { t } = useLanguage();
  const colors = useColors();
  const { deviceState, simMode, runSimulation, stopSimulation, settings, triggerSync } = useDevice();
  const insets = useSafeAreaInsets();

  const [countdown, setCountdown]             = useState(Math.round(STARTUP_DELAY_MS / 1000));
  const countdownRef                           = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPumpStateRef                       = useRef<number>(deviceState.pumpState);
  const [showFullToast, setShowFullToast]      = useState(false);
  const [disconnectedSec, setDisconnectedSec] = useState(0);
  const [lastKnownTank, setLastKnownTank]     = useState<{ pct: number; at: number } | null>(null);
  const toastAnim                              = useRef(new Animated.Value(0)).current;

  const isStartupDelay = deviceState.pumpState === 2;
  const isLive         = deviceState.connected || simMode;
  const isLastKnown    = !isLive && !!lastKnownTank;
  const showTank       = isLive || isLastKnown;
  const displayPct     = isLive ? deviceState.tank : (lastKnownTank?.pct ?? 0);
  const tankSizeLitres = settings.tankSizeLitres;

  const LAST_KNOWN_KEY = '@watertank_last_known';

  useEffect(() => {
    AsyncStorage.getItem(LAST_KNOWN_KEY)
      .then(v => { if (v) setLastKnownTank(JSON.parse(v)); })
      .catch(() => {});
  }, []);

  // Persist last known reading whenever we have live data
  useEffect(() => {
    if (isLive && deviceState.tank > 0) {
      const next = { pct: deviceState.tank, at: Math.floor(Date.now() / 1000) };
      setLastKnownTank(next);
      AsyncStorage.setItem(LAST_KNOWN_KEY, JSON.stringify(next)).catch(() => {});
    }
  }, [isLive, deviceState.tank]);

  // Countdown timer for motor startup delay
  useEffect(() => {
    if (isStartupDelay) {
      setCountdown(Math.round(STARTUP_DELAY_MS / 1000));
      countdownRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [isStartupDelay]);

  useEffect(() => {
    if (!deviceState.connected) {
      prevPumpStateRef.current = 0;
    }
  }, [deviceState.connected]);

  // Tank full toast when motor transitions off after filling
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

  // Disconnected timer — reveals "check device power" hint after 30 s
  useEffect(() => {
    if (!isLive) {
      setDisconnectedSec(0);
      const id = setInterval(() => setDisconnectedSec(s => s + 1), 1000);
      return () => clearInterval(id);
    }
    setDisconnectedSec(0);
  }, [isLive]);

  // Derived display values
  const motorOn         = isLive ? deviceState.motorOn : false;
  const tankStatusLabel = getTankStatusLabel(displayPct, motorOn, t);
  const tankStatusColor = getTankStatusColor(displayPct, motorOn, colors);
  const pctColor        = motorOn ? colors.primary
    : displayPct >= 30 ? colors.primary
    : displayPct > 0   ? colors.warning
    : colors.destructive;

  const motorSubLabel = isStartupDelay
    ? `${t("motorStarting")} ${countdown}s`
    : motorOn
      ? t("waterArrived")
      : t("waitingForWaterSupply");

  const topPad = Platform.OS === "web"
    ? Math.max(insets.top, 52)
    : insets.top + 12;

  const litresValue = tankSizeLitres > 0
    ? Math.round((tankSizeLitres * displayPct) / 100)
    : null;

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
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.appTitle, { color: colors.foreground }]}>WaterTank</Text>
            {/* Connection status pill */}
            <View style={[
              styles.statusPill,
              {
                backgroundColor: deviceState.connected
                  ? colors.success + "18"
                  : colors.muted,
              },
            ]}>
              {deviceState.connected
                ? <PulsingDot color={colors.success} />
                : <View style={[styles.dotIdle, { backgroundColor: colors.mutedForeground }]} />}
              <Text style={[
                styles.statusPillText,
                { color: deviceState.connected ? colors.success : colors.mutedForeground },
              ]}>
                {deviceState.connected ? t("connected") : t("lookingForDevice")}
              </Text>
            </View>
            {/* Last sync line */}
            {deviceState.connected && deviceState.lastSyncAt && (
              <Text style={[styles.syncLine, { color: colors.mutedForeground }]}>
                {t("lastSync")}: {formatRelativeTime(deviceState.lastSyncAt, t)}
              </Text>
            )}
          </View>

          {/* Right: DEMO badge or sync button */}
          <View style={styles.headerRight}>
            {simMode && (
              <TouchableOpacity
                onPress={stopSimulation}
                style={[styles.demoBadge, { backgroundColor: "#F59E0B" }]}
                activeOpacity={0.75}
                accessibilityLabel="Stop demo"
              >
                <Text style={styles.demoBadgeText}>DEMO</Text>
                <Feather name="x" size={11} color="#FFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
            {deviceState.connected && !simMode && (
              <TouchableOpacity
                onPress={triggerSync}
                style={[styles.syncBtn, { backgroundColor: colors.muted }]}
                activeOpacity={0.7}
                accessibilityLabel={t("syncNow")}
              >
                <Feather name="refresh-cw" size={15} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── MANUAL OVERRIDE BANNER ──────────────────────────────────────── */}
        {deviceState.manual && (
          <View style={[styles.banner, { backgroundColor: colors.destructive }]}>
            <Feather name="alert-triangle" size={14} color="#FFF" />
            <Text style={styles.bannerText}>{t("pumpManual")}</Text>
          </View>
        )}

        {/* ── TANK SECTION ─────────────────────────────────────────────────── */}
        {showTank && (
          <View style={[styles.tankSection, isLastKnown && { opacity: 0.62 }]}>
            {/* Tank widget — pure SVG, guaranteed alignment */}
            <WaterTankWidget
              pct={displayPct}
              connected={isLive}
              motorOn={motorOn}
              tankColor={settings.tankColor}
            />

            {/* Stats block below widget */}
            <View style={styles.statsBlock}>
              <Text style={[styles.pctText, { color: pctColor }]}>
                {formatTankPct(displayPct)}
              </Text>
              <Text style={[styles.statusLabel, { color: tankStatusColor }]}>
                {tankStatusLabel}
              </Text>

              {/* Litres pill */}
              {litresValue !== null && (
                <View style={[styles.litresPill, { backgroundColor: colors.muted }]}>
                  <Feather name="droplet" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.litresText, { color: colors.mutedForeground }]}>
                    {litresValue} {t("litres")}
                  </Text>
                </View>
              )}

              {/* Last-known badge */}
              {isLastKnown && lastKnownTank && (
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

        {/* ── DISCONNECTED CARD ─────────────────────────────────────────────── */}
        {!isLive && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardIconWrap, { backgroundColor: colors.muted }]}>
              <Feather name="bluetooth" size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardSub, { color: colors.subText, marginBottom: 2 }]}>
                {t("deviceConnecting")}
              </Text>
              <SearchingDots color={colors.primary} />
              {disconnectedSec > 30 && (
                <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
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

        {/* ── MOTOR STATUS CARD ─────────────────────────────────────────────── */}
        {isLive && (
          <View style={[
            styles.card,
            {
              backgroundColor: motorOn
                ? colors.success + "0D"
                : colors.card,
              borderColor: motorOn
                ? colors.success + "50"
                : colors.border,
            },
          ]}>
            {/* Colored left accent bar */}
            <View style={[
              styles.motorAccentBar,
              { backgroundColor: motorOn ? colors.success : colors.mutedForeground + "40" },
            ]} />

            <View style={[
              styles.cardIconWrap,
              {
                backgroundColor: motorOn
                  ? colors.success + "22"
                  : colors.muted,
              },
            ]}>
              <Feather
                name={motorOn ? "zap" : "zap-off"}
                size={20}
                color={motorOn ? colors.success : colors.mutedForeground}
              />
            </View>

            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {motorOn ? t("motorRunning") : t("motorOff")}
              </Text>
              <Text style={[styles.cardSub, { color: colors.subText }]}>
                {motorSubLabel}
              </Text>
            </View>

            {/* ON / OFF badge */}
            <View style={[
              styles.motorStatusBadge,
              { backgroundColor: motorOn ? colors.success : colors.muted },
            ]}>
              <Text style={[
                styles.motorStatusBadgeText,
                { color: motorOn ? "#FFF" : colors.mutedForeground },
              ]}>
                {motorOn ? "ON" : "OFF"}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── TANK FULL TOAST ─────────────────────────────────────────────────── */}
      {showFullToast && (
        <Animated.View style={[
          styles.toast,
          {
            opacity: toastAnim,
            transform: [{
              translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
            }],
          },
        ]}>
          <Feather name="check-circle" size={16} color="#FFF" />
          <Text style={styles.toastText}>{t("tankFullCelebration")}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },

  // ── Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: { gap: 5, flex: 1 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  appTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dotIdle: {
    width: 7, height: 7, borderRadius: 3.5,
  },
  statusPillText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  syncLine: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    paddingLeft: 2,
    marginTop: -2,
  },
  syncBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  demoBadge: {
    paddingHorizontal: 10,
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

  // ── Banner
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

  // ── Tank section
  tankSection: {
    alignItems: "center",
    gap: 0,
  },
  statsBlock: {
    alignItems: "center",
    gap: 3,
    marginTop: -6,
  },
  pctText: {
    fontSize: 52,
    fontFamily: "Inter_700Bold",
    letterSpacing: -2,
    lineHeight: 58,
  },
  statusLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.1,
  },
  litresPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 2,
  },
  litresText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  lastKnownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  lastKnownText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },

  // ── Cards (shared)
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    shadowColor: "#1A2A4A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  cardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  hintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    lineHeight: 17,
  },

  // ── Disconnected card specifics
  demoBtn: {
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
    alignSelf: "flex-start",
  },
  demoBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  // ── Motor card specifics
  motorAccentBar: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    width: 4,
  },
  motorStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    minWidth: 40,
    alignItems: "center",
  },
  motorStatusBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },

  // ── Toast
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
