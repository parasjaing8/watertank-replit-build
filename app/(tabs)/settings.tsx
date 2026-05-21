import React, { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";

import { useDevice } from "@/context/DeviceContext";
import { useColors } from "@/hooks/useColors";
import { EVENT_LABELS, STOP_REASON_LABELS } from "@/models/Event";
import { formatDate, formatDuration } from "@/utils/formatters";

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
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
    <View style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
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
      style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}>
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
    triggerSync,
  } = useDevice();

  const [showBleLog, setShowBleLog] = useState(false);

  const dbInfo = getDbInfo();
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const handleExport = useCallback(async () => {
    try {
      const events = exportData();
      const rows = events.map((e) => [
        e.id,
        e.epoch,
        formatDate(e.epoch),
        EVENT_LABELS[e.type] ?? e.type,
        e.tankPct.toFixed(1),
        STOP_REASON_LABELS[e.stopReason] ?? e.stopReason,
        e.durationSec > 0 ? formatDuration(e.durationSec) : "",
      ].join(","));
      const header = "ID,Epoch,Date,Event,Tank%,StopReason,Duration";
      const csv = [header, ...rows].join("\n");
      await Share.share({ message: csv, title: "WaterTank Events" });
    } catch (e) {
      Alert.alert("Export failed", String(e));
    }
  }, [exportData]);

  const handleClearData = useCallback(() => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all recorded events and sync history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: () => {
            clearData();
            Alert.alert("Cleared", "All data has been deleted.");
          },
        },
      ],
    );
  }, [clearData]);

  const retentionOptions = [30, 60, 90];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <SectionHeader title="NOTIFICATIONS" colors={colors} />
      <View style={[styles.section, { borderColor: colors.border }]}>
        <SettingRow
          label="Motor started"
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
          label="Motor stopped"
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
          label="Manual override"
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

      <SectionHeader title="DATA" colors={colors} />
      <View style={[styles.section, { borderColor: colors.border }]}>
        <View style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>Retention period</Text>
          <View style={styles.retentionRow}>
            {retentionOptions.map((days) => (
              <TouchableOpacity
                key={days}
                onPress={() => updateSettings({ retentionDays: days })}
                style={[
                  styles.retentionChip,
                  {
                    backgroundColor:
                      settings.retentionDays === days ? colors.primary : colors.muted,
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
        <View style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Events stored</Text>
          <Text style={[styles.rowValue, { color: colors.foreground }]}>{dbInfo.totalEvents}</Text>
        </View>
        {dbInfo.oldestEpoch && (
          <View style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Oldest event</Text>
            <Text style={[styles.rowValue, { color: colors.foreground }]}>
              {formatDate(dbInfo.oldestEpoch)}
            </Text>
          </View>
        )}
        <ActionRow
          label="Export data (CSV)"
          icon="share"
          onPress={handleExport}
          colors={colors}
        />
        <ActionRow
          label="Sync now"
          icon="refresh-cw"
          onPress={triggerSync}
          colors={colors}
        />
        <ActionRow
          label="Clear all data"
          icon="trash-2"
          destructive
          onPress={handleClearData}
          colors={colors}
        />
      </View>

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
            <Text style={[styles.rowLabel, { color: simMode ? colors.mutedForeground : colors.foreground }]}>
              {simMode ? "Demo running…" : "Run demo cycle"}
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
            <View style={[styles.simBadge, { backgroundColor: colors.warning }]}>
              <Text style={styles.simBadgeText}>SIM</Text>
            </View>
          )}
        </TouchableOpacity>
        {!bleAvailable && (
          <View style={[styles.bleNote, { backgroundColor: colors.muted }]}>
            <Text style={[styles.bleNoteText, { color: colors.mutedForeground }]}>
              BLE requires a native Android build with react-native-ble-plx. This app will stay idle until real hardware connects.
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
          <View style={[styles.bleLog, { backgroundColor: colors.background }]}>
            {bleLog.length === 0 ? (
              <Text style={[styles.bleLogEmpty, { color: colors.mutedForeground }]}>
                No BLE events yet
              </Text>
            ) : (
              bleLog.slice(0, 50).map((line, i) => (
                <Text key={i} style={[styles.bleLogLine, { color: colors.foreground }]}>
                  {line}
                </Text>
              ))
            )}
          </View>
        )}
      </View>

      <SectionHeader title="ABOUT" colors={colors} />
      <View style={[styles.section, { borderColor: colors.border }]}>
        <View style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>App version</Text>
          <Text style={[styles.rowValue, { color: colors.foreground }]}>{appVersion}</Text>
        </View>
        <View style={[styles.row, { borderBottomColor: "transparent", backgroundColor: colors.card }]}>
          <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Device</Text>
          <Text style={[styles.rowValue, { color: colors.foreground }]}>WaterTank v3 (ESP32)</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
    paddingTop: 8,
  },
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
