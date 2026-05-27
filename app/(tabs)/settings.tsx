import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";

import { useDevice } from "@/context/DeviceContext";
import * as AuthService from "@/services/AuthService";
import type { StoredDevice } from "@/services/AuthService";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { TabSwipeWrapper } from "@/components/TabSwipeWrapper";
import { EVENT_LABELS, STOP_REASON_LABELS } from "@/models/Event";
import { formatDate, formatDuration } from "@/utils/formatters";
import { useLanguage } from "@/context/LanguageContext";
import { Lang } from "@/constants/i18n";
import { SetupGuideModal } from "@/components/SetupGuideModal";
import {
  clearLogs,
  exportLogs,
  getLogStats,
} from "@/services/CrashReportService";

function SectionHeader({
  title,
  colors,
}: {
  title: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
      {title}
    </Text>
  );
}

function SettingRow({
  label,
  colors,
  right,
}: {
  label: string;
  colors: ReturnType<typeof useColors>;
  right: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      {right}
    </View>
  );
}

function ActionRow({
  label,
  icon,
  destructive,
  onPress,
  colors,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  destructive?: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.row,
        { borderBottomColor: colors.border, backgroundColor: colors.card },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.rowLabel,
          { color: destructive ? colors.destructive : colors.foreground },
        ]}
      >
        {label}
      </Text>
      <Feather
        name={icon}
        size={18}
        color={destructive ? colors.destructive : colors.mutedForeground}
      />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const { t, lang, setLanguage } = useLanguage();
  const { colorScheme, setColorScheme } = useTheme();
  const {
    settings,
    updateSettings,
    simMode,
    runSimulation,
    bleAvailable,
    bleLog,
    clearData,
    exportData,
    getDbInfo,
    firmwareUpdateAvailable,
    firmwareManifest,
    deviceState,
    setFillTarget,
    setVisibility,
  } = useDevice();

  const [showBleLog, setShowBleLog] = useState(false);
  const [pairedSessions, setPairedSessions] = useState<StoredDevice[]>([]);
  const [pairingWindowEnd, setPairingWindowEnd] = useState<number | null>(null);
  const [pairingWindowSec, setPairingWindowSec] = useState(0);
  const [versionTaps, setVersionTaps] = useState(0);
  const [devMode, setDevMode] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCleared, setShowCleared] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [diagStats, setDiagStats] = useState(() => getLogStats());

  useEffect(() => {
    AuthService.listSessions().then(setPairedSessions);
  }, []);

  useEffect(() => {
    if (!pairingWindowEnd) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((pairingWindowEnd - Date.now()) / 1000));
      setPairingWindowSec(remaining);
      if (remaining === 0) {
        setPairingWindowEnd(null);
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [pairingWindowEnd]);

  // Local fill target state — synced from board on connect, debounced write on change
  const [localFillTarget, setLocalFillTarget] = useState<number>(90);
  const fillSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (deviceState.fillTarget !== null) setLocalFillTarget(deviceState.fillTarget);
  }, [deviceState.fillTarget]);

  const handleFillTarget = useCallback((val: number) => {
    const clamped = Math.max(1, Math.min(98, val));
    setLocalFillTarget(clamped);
    if (fillSaveTimer.current) clearTimeout(fillSaveTimer.current);
    fillSaveTimer.current = setTimeout(() => {
      setFillTarget(clamped).catch(() => {});
    }, 600);
  }, [setFillTarget]);

  const handleExportLogs = useCallback(async () => {
    await exportLogs();
  }, []);

  const handleClearDiagLogs = useCallback(async () => {
    await clearLogs();
    setDiagStats({ count: 0, sizeKb: 0 });
  }, []);

  const dbInfo = getDbInfo();
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  // tankSize is now stored in AppSettings.tankSizeLitres — derive the display
  // string directly from settings so there's a single source of truth.
  const tankSizeStr = settings.tankSizeLitres > 0 ? String(settings.tankSizeLitres) : "";

  const TANK_SIZE_MAX = 99999;

  const saveTankSize = useCallback(
    (v: string) => {
      const clean = v.replace(/[^0-9]/g, "").slice(0, 6);
      const val = clean ? parseInt(clean, 10) : 0;
      updateSettings({ tankSizeLitres: Math.min(val, TANK_SIZE_MAX) });
    },
    [updateSettings],
  );

  const onVersionTap = useCallback(() => {
    setVersionTaps((n) => {
      const next = n + 1;
      if (next >= 7) {
        setDevMode(true);
        Alert.alert("Developer mode", "Developer options unlocked.");
        return 0;
      }
      return next;
    });
  }, []);

  const EXPORT_MAX = 1000;

  const handleExport = useCallback(async () => {
    try {
      const allEvents = exportData();
      const truncated = allEvents.length > EXPORT_MAX;
      const events = truncated ? allEvents.slice(-EXPORT_MAX) : allEvents;
      if (truncated) {
        Alert.alert(
          "Export truncated",
          `Exporting most recent ${EXPORT_MAX} of ${allEvents.length} events.`,
        );
      }
      const rows = events.map((e) =>
        [
          e.id,
          e.epoch,
          formatDate(e.epoch),
          EVENT_LABELS[e.type] ?? e.type,
          e.tankPct.toFixed(1),
          STOP_REASON_LABELS[e.stopReason] ?? e.stopReason,
          e.durationSec > 0 ? formatDuration(e.durationSec) : "",
        ].join(",")
      );
      const header = "ID,Epoch,Date,Event,Tank%,StopReason,Duration";
      const csv = [header, ...rows].join("\n");
      await Share.share({ message: csv, title: "WaterTank Events" });
    } catch (e) {
      Alert.alert("Export failed", String(e));
    }
  }, [exportData]);

  const handleClearData = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const retentionOptions = [30, 60, 90];

  return (
    <TabSwipeWrapper index={2}>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Appearance */}
      <SectionHeader title={t("appearance").toUpperCase()} colors={colors} />
      <View style={[styles.section, { borderColor: colors.border }]}>
        <View
          style={[
            styles.row,
            {
              borderBottomColor: "transparent",
              backgroundColor: colors.card,
              flexWrap: "wrap",
              gap: 8,
            },
          ]}
        >
          {(["light", "dark"] as const).map((mode) => {
            const labels = { light: t("lightMode"), dark: t("darkMode") };
            const icons  = { light: "sun", dark: "moon" } as const;
            const active = colorScheme === mode;
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => setColorScheme(mode)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 20,
                  backgroundColor: active ? colors.primary : colors.muted,
                }}
              >
                <Feather
                  name={icons[mode]}
                  size={14}
                  color={active ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={{
                    color: active ? colors.primaryForeground : colors.foreground,
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                  }}
                >
                  {labels[mode]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tank colour */}
      <SectionHeader title={t("tankColor").toUpperCase()} colors={colors} />
      <View style={[styles.section, { borderColor: colors.border }]}>
        <View
          style={[
            styles.row,
            {
              borderBottomColor: "transparent",
              backgroundColor: colors.card,
              flexWrap: "wrap",
              gap: 8,
            },
          ]}
        >
          {(["blue", "black"] as const).map((variant) => {
            const labels  = { black: t("tankColorBlack"), blue: t("tankColorBlue") };
            const swatches = { black: "#1B2B3C", blue: "#2563A8" };
            const active   = (settings.tankColor ?? "blue") === variant;
            return (
              <TouchableOpacity
                key={variant}
                onPress={() => updateSettings({ tankColor: variant })}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 20,
                  backgroundColor: active ? colors.primary : colors.muted,
                }}
              >
                <View style={{
                  width: 13, height: 13, borderRadius: 6.5,
                  backgroundColor: swatches[variant],
                  borderWidth: 1.5,
                  borderColor: active ? "rgba(255,255,255,0.4)" : colors.border,
                }} />
                <Text style={{
                  color: active ? colors.primaryForeground : colors.foreground,
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                }}>
                  {labels[variant]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Language */}
      <SectionHeader title={t("language").toUpperCase()} colors={colors} />
      <View style={[styles.section, { borderColor: colors.border }]}>
        <View
          style={[
            styles.row,
            {
              borderBottomColor: "transparent",
              backgroundColor: colors.card,
              flexWrap: "wrap",
              gap: 8,
            },
          ]}
        >
          {(["en", "hi", "mr", "kn"] as Lang[]).map((code) => {
            const labels: Record<Lang, string> = {
              en: "English",
              hi: "हिन्दी",
              mr: "मराठी",
              kn: "ಕನ್ನಡ",
            };
            const active = lang === code;
            return (
              <TouchableOpacity
                key={code}
                onPress={() => setLanguage(code)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 18,
                  backgroundColor: active ? colors.primary : colors.muted,
                }}
              >
                <Text
                  style={{
                    color: active ? colors.primaryForeground : colors.foreground,
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                  }}
                >
                  {labels[code]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Notifications */}
      <SectionHeader title={t("notifications").toUpperCase()} colors={colors} />
      <View style={[styles.section, { borderColor: colors.border }]}>
        <SettingRow
          label={t("notifyMotorOn")}
          colors={colors}
          right={
            <Switch
              value={settings.notifyMotorOn}
              onValueChange={(v) => updateSettings({ notifyMotorOn: v })}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          }
        />
        <SettingRow
          label={t("notifyMotorOff")}
          colors={colors}
          right={
            <Switch
              value={settings.notifyMotorOff}
              onValueChange={(v) => updateSettings({ notifyMotorOff: v })}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          }
        />
        <SettingRow
          label={t("notifyManualOverride")}
          colors={colors}
          right={
            <Switch
              value={settings.notifyManualOverride}
              onValueChange={(v) => updateSettings({ notifyManualOverride: v })}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          }
        />
      </View>

      {/* Data */}
      <SectionHeader title={t("data").toUpperCase()} colors={colors} />
      <View style={[styles.section, { borderColor: colors.border }]}>
        {/* Tank size */}
        <View style={{ backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
          <View style={[styles.row, { borderBottomColor: 'transparent' }]}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>
              {t("tankSizeLabel")}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TextInput
                value={tankSizeStr}
                onChangeText={saveTankSize}
                placeholder={t("tankSizePlaceholder")}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={{
                  minWidth: 80,
                  textAlign: "right",
                  color: colors.foreground,
                  fontFamily: "Inter_500Medium",
                  fontSize: 15,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                }}
              />
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                }}
              >
                {t("litres")}
              </Text>
            </View>
          </View>
          <Text style={{ paddingHorizontal: 20, paddingBottom: 10, fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
            Max 99,999 L
          </Text>
        </View>

        {/* Retention */}
        <View
          style={[
            styles.row,
            { borderBottomColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>
            {t("keepRecordsFor")}
          </Text>
          <View style={styles.retentionRow}>
            {retentionOptions.map((days) => (
              <TouchableOpacity
                key={days}
                onPress={() => updateSettings({ retentionDays: days })}
                style={[
                  styles.retentionChip,
                  {
                    backgroundColor:
                      settings.retentionDays === days
                        ? colors.primary
                        : colors.muted,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.retentionChipText,
                    {
                      color:
                        settings.retentionDays === days
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {days}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ActionRow
          label={t("shareRecords")}
          icon="share"
          onPress={handleExport}
          colors={colors}
        />
        <ActionRow
          label={t("clearAllData")}
          icon="trash-2"
          destructive
          onPress={handleClearData}
          colors={colors}
        />
      </View>

      {/* Device firmware */}
      {deviceState.connected && (
        <>
          <SectionHeader title="DEVICE" colors={colors} />
          <View style={[styles.section, { borderColor: colors.border }]}>
            {/* Fill target */}
            <View style={{ backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
              <View style={[styles.row, { borderBottomColor: "transparent" }]}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                  {t("fillTargetLabel")}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleFillTarget(localFillTarget - 1)}
                    onLongPress={() => handleFillTarget(localFillTarget - 5)}
                    style={[styles.stepBtn, { backgroundColor: colors.muted }]}
                    disabled={localFillTarget <= 1}
                  >
                    <Feather name="minus" size={16} color={localFillTarget <= 1 ? colors.border : colors.foreground} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.primary, minWidth: 44, textAlign: "center" }}>
                    {localFillTarget}%
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleFillTarget(localFillTarget + 1)}
                    onLongPress={() => handleFillTarget(localFillTarget + 5)}
                    style={[styles.stepBtn, { backgroundColor: colors.muted }]}
                    disabled={localFillTarget >= 98}
                  >
                    <Feather name="plus" size={16} color={localFillTarget >= 98 ? colors.border : colors.foreground} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={{ paddingHorizontal: 20, paddingBottom: 10, fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                {t("fillTargetHint")}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => router.push("/firmware-update")}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Firmware Update</Text>
                {deviceState.firmwareVersion && (
                  <Text style={[styles.rowValue, { color: colors.mutedForeground, fontSize: 12 }]}>
                    Current: v{deviceState.firmwareVersion}
                    {firmwareManifest ? `  →  v${firmwareManifest.version} available` : "  (up to date)"}
                  </Text>
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {firmwareUpdateAvailable && (
                  <View style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>UPDATE</Text>
                  </View>
                )}
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Paired devices */}
      {deviceState.connected && (
        <>
          <SectionHeader title={t("pairedDevices").toUpperCase()} colors={colors} />
          <View style={[styles.section, { borderColor: colors.border }]}>
            {pairingWindowEnd && (
              <View style={{ backgroundColor: colors.primary + "18", paddingHorizontal: 20, paddingVertical: 12 }}>
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  {t("pairingWindowOpen")} — {Math.floor(pairingWindowSec / 60)}:{String(pairingWindowSec % 60).padStart(2, "0")}
                </Text>
              </View>
            )}
            {pairedSessions.length > 0 && pairedSessions.map((s) => (
              <View key={s.deviceMac} style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>{s.deviceName}</Text>
                <Text style={[styles.rowValue, { color: colors.mutedForeground, fontSize: 12 }]}>
                  {s.deviceMac.slice(-5).toUpperCase()}
                </Text>
              </View>
            ))}
            <ActionRow
              label={t("allowNewPairing")}
              icon="bluetooth"
              onPress={async () => {
                await setVisibility(true);
                const end = Date.now() + 5 * 60 * 1000;
                setPairingWindowEnd(end);
                setPairingWindowSec(300);
              }}
              colors={colors}
            />
            <ActionRow
              label={t("removeThisDevice")}
              icon="trash-2"
              destructive
              onPress={() => {
                Alert.alert(
                  t("removeDeviceConfirmTitle"),
                  t("removeDeviceConfirmMsg"),
                  [
                    { text: t("cancel"), style: "cancel" },
                    {
                      text: t("deleteAll"),
                      style: "destructive",
                      onPress: async () => {
                        for (const s of pairedSessions) await AuthService.clearSession(s.deviceMac);
                        setPairedSessions([]);
                      },
                    },
                  ]
                );
              }}
              colors={colors}
            />
          </View>
        </>
      )}

      {/* Diagnostics */}
      <SectionHeader title="DIAGNOSTICS" colors={colors} />
      <View style={[styles.section, { borderColor: colors.border }]}>
        <View style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>Diagnostic logs</Text>
          <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>
            {diagStats.count} entries · {diagStats.sizeKb} KB
          </Text>
        </View>
        <ActionRow
          label="Export logs"
          icon="share"
          onPress={handleExportLogs}
          colors={colors}
        />
        <ActionRow
          label="Clear logs"
          icon="trash-2"
          destructive
          onPress={() => {
            Alert.alert("Clear diagnostic logs?", "This cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear", style: "destructive", onPress: handleClearDiagLogs },
            ]);
          }}
          colors={colors}
        />
      </View>

      {/* About */}
      <SectionHeader title={t("about").toUpperCase()} colors={colors} />
      <View style={[styles.section, { borderColor: colors.border }]}>
        <ActionRow
          label={t("setupGuide")}
          icon="package"
          onPress={() => setShowSetupGuide(true)}
          colors={colors}
        />
        <ActionRow
          label={t("helpTitle")}
          icon="help-circle"
          onPress={() => router.push("/help")}
          colors={colors}
        />
        <TouchableOpacity
          style={[
            styles.row,
            { borderBottomColor: colors.border, backgroundColor: colors.card },
          ]}
          onPress={onVersionTap}
          activeOpacity={1}
        >
          <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
            {t("appVersion")}
          </Text>
          <Text style={[styles.rowValue, { color: colors.foreground }]}>
            {appVersion}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Debug (dev mode only) */}
      {devMode && (
        <>
          <SectionHeader title="DEBUG" colors={colors} />
          <View style={[styles.section, { borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.row,
                styles.demoRow,
                {
                  borderBottomColor: colors.border,
                  backgroundColor: simMode ? colors.muted : colors.card,
                  opacity: simMode ? 0.6 : 1,
                },
              ]}
              onPress={() => {
                if (!simMode) runSimulation();
              }}
              activeOpacity={0.75}
              disabled={simMode}
            >
              <View style={styles.demoTextCol}>
                <Text
                  style={[
                    styles.rowLabel,
                    {
                      color: simMode
                        ? colors.mutedForeground
                        : colors.foreground,
                    },
                  ]}
                >
                  {simMode ? t("demoRunning") : "Run demo cycle"}
                </Text>
                <Text style={[styles.demoSub, { color: colors.mutedForeground }]}>
                  {simMode
                    ? "One complete pump cycle is being simulated"
                    : "Simulates one full pump cycle for testing"}
                </Text>
              </View>
              {!simMode && (
                <Feather name="play" size={18} color={colors.primary} />
              )}
              {simMode && (
                <View
                  style={[styles.simBadge, { backgroundColor: colors.warning }]}
                >
                  <Text style={styles.simBadgeText}>SIM</Text>
                </View>
              )}
            </TouchableOpacity>
            {!bleAvailable && (
              <View style={[styles.bleNote, { backgroundColor: colors.muted }]}>
                <Text
                  style={[styles.bleNoteText, { color: colors.mutedForeground }]}
                >
                  BLE requires a native Android build with react-native-ble-plx.
                  This app will stay idle until real hardware connects.
                </Text>
              </View>
            )}
            <ActionRow
              label={showBleLog ? "Hide BLE log" : "Show BLE log"}
              icon="radio"
              onPress={() => setShowBleLog((v) => !v)}
              colors={colors}
            />
            {showBleLog && (
              <View
                style={[styles.bleLog, { backgroundColor: colors.background }]}
              >
                {bleLog.length === 0 ? (
                  <Text
                    style={[
                      styles.bleLogEmpty,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    No BLE events yet
                  </Text>
                ) : (
                  bleLog.slice(0, 50).map((line, i) => (
                    <Text
                      key={i}
                      style={[styles.bleLogLine, { color: colors.foreground }]}
                    >
                      {line}
                    </Text>
                  ))
                )}
              </View>
            )}
            <ActionRow
              label={t("hideDeveloperOptions")}
              icon="eye-off"
              onPress={() => setDevMode(false)}
              colors={colors}
            />
          </View>
        </>
      )}
    </ScrollView>

      {/* Delete confirmation modal */}
      <Modal transparent animationType="fade" visible={showClearConfirm} onRequestClose={() => setShowClearConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t("clearConfirmTitle")}</Text>
            <Text style={[styles.modalMessage, { color: colors.mutedForeground }]}>{t("clearConfirmMsg")}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => setShowClearConfirm(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.destructive }]}
                onPress={() => {
                  setShowClearConfirm(false);
                  clearData();
                  setShowCleared(true);
                }}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>{t("deleteAll")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cleared status modal */}
      <Modal transparent animationType="fade" visible={showCleared} onRequestClose={() => setShowCleared(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCleared(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t("cleared")}</Text>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnFull, { backgroundColor: colors.primary, marginTop: 8 }]}
              onPress={() => setShowCleared(false)}
            >
              <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {showSetupGuide && <SetupGuideModal onClose={() => setShowSetupGuide(false)} />}
    </TabSwipeWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingBottom: 100,
    paddingTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnFull: {
    flex: 0,
    width: '100%',
  },
  modalBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  // ── original styles ──
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 6,
  },
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: "space-between",
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    maxWidth: "60%",
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  retentionRow: {
    flexDirection: "row",
    gap: 6,
  },
  retentionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  retentionChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  bleNote: {
    margin: 12,
    padding: 12,
    borderRadius: 10,
  },
  bleNoteText: {
    fontSize: 12,
    lineHeight: 18,
  },
  bleLog: {
    margin: 12,
    padding: 12,
    borderRadius: 10,
    maxHeight: 240,
  },
  bleLogLine: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  bleLogEmpty: {
    fontSize: 13,
    fontStyle: "italic",
  },
  demoRow: {
    alignItems: "center",
    gap: 12,
  },
  demoTextCol: {
    flex: 1,
    gap: 2,
  },
  demoSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  simBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  simBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
});
