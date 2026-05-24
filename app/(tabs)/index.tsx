import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from '@react-native-async-storage/async-storage';

import { WaterTankWidget } from "@/components/WaterTankWidget";
import { PulsingDot, SearchingDots } from "@/components/StatusIndicators";
import { useDevice } from "@/context/DeviceContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { formatTankPct, formatRelativeTime } from "@/utils/formatters";
import { STARTUP_DELAY_MS } from "@/constants/thresholds";
import { Translations } from "@/constants/i18n";
import { styles } from "@/styles/dashboard";

// ─── Tank status helpers ──────────────────────────────────────────────────────
function getTankStatusLabel(pct: number, motorOn: boolean, t: (k: keyof Translations) => string): string {
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
      .then(v => {
        if (!v) return;
        const parsed = JSON.parse(v);
        if (parsed && typeof parsed.pct === 'number' && typeof parsed.at === 'number') {
          setLastKnownTank(parsed);
        }
      })
      .catch(() => {});
  }, []);

  // Persist last known reading from real device only — never from simulation
  useEffect(() => {
    if (isLive && !simMode && deviceState.tank > 0) {
      const next = { pct: deviceState.tank, at: Math.floor(Date.now() / 1000) };
      setLastKnownTank(next);
      AsyncStorage.setItem(LAST_KNOWN_KEY, JSON.stringify(next)).catch(() => {});
    }
  }, [isLive, simMode, deviceState.tank]);

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

  // Tank full inline banner when motor transitions off after filling
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
  const tankStatusLabel = useMemo(() => getTankStatusLabel(displayPct, motorOn, t), [displayPct, motorOn, t]);
  const tankStatusColor = useMemo(() => getTankStatusColor(displayPct, motorOn, colors), [displayPct, motorOn, colors]);
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
          { paddingTop: topPad, paddingBottom: Platform.OS === "web" ? 110 : 96 + insets.bottom, flexGrow: 1 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.appTitle, { color: colors.foreground }]}>WaterTank</Text>
            <View style={[
              styles.statusPill,
              { backgroundColor: deviceState.connected ? colors.success + "18" : colors.muted },
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
            {deviceState.connected && deviceState.lastSyncAt && (
              <Text style={[styles.syncLine, { color: colors.mutedForeground }]}>
                {t("lastSync")}: {formatRelativeTime(deviceState.lastSyncAt, t)}
              </Text>
            )}
          </View>

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
            <WaterTankWidget
              pct={displayPct}
              connected={isLive}
              motorOn={motorOn}
              tankColor={settings.tankColor}
            />

            <View style={styles.statsBlock}>
              <Text style={[styles.pctText, { color: pctColor }]}>
                {formatTankPct(displayPct)}
              </Text>
              <Text style={[styles.statusLabel, { color: tankStatusColor }]}>
                {tankStatusLabel}
              </Text>

              {litresValue !== null && (
                <View style={[styles.litresPill, { backgroundColor: colors.muted }]}>
                  <Feather name="droplet" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.litresText, { color: colors.mutedForeground }]}>
                    {litresValue} {t("litres")}
                  </Text>
                </View>
              )}

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

        {/* ── SPACER — controlled gap between tank section and motor card ── */}
        <View style={{ minHeight: 20, maxHeight: 40 }} />

        {/* ── TANK FULL BANNER — inline, never covers motor card ───────────── */}
        {showFullToast && (
          <Animated.View style={[
            styles.tankFullBanner,
            {
              opacity: toastAnim,
              transform: [{
                translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
              }],
            },
          ]}>
            <Feather name="check-circle" size={15} color="#FFF" />
            <Text style={styles.tankFullBannerText}>{t("tankFullCelebration")}</Text>
          </Animated.View>
        )}

        {/* ── MOTOR STATUS CARD ─────────────────────────────────────────────── */}
        {isLive && (
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {t("motorStatus")}
          </Text>
        )}
        {isLive && (
          <View style={[
            styles.card,
            {
              backgroundColor: motorOn ? colors.success + "1A" : colors.card,
              borderColor:     motorOn ? colors.success + "CC" : colors.border,
              borderWidth:     motorOn ? 2 : 1,
            },
          ]}>
            <View style={[
              styles.motorAccentBar,
              { backgroundColor: motorOn ? colors.success : colors.mutedForeground + "40" },
            ]} />

            <View style={[
              styles.cardIconWrap,
              { backgroundColor: motorOn ? colors.success + "22" : colors.muted },
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
    </View>
  );
}
