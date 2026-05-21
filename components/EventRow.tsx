import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  EventType,
  StopReason,
  WaterEvent,
  EVENT_LABELS,
  STOP_REASON_LABELS,
} from "@/models/Event";
import { useColors } from "@/hooks/useColors";
import { formatTime, formatDuration } from "@/utils/formatters";

interface EventRowProps {
  event: WaterEvent;
}

function getLeftBorderColor(
  event: WaterEvent,
  colors: { tankGreen: string; tankOrange: string; tankRed: string; supplyBlue: string; manualOverride: string; mutedForeground: string; primary: string },
): string {
  switch (event.type) {
    case EventType.MOTOR_ON:
      return colors.tankGreen;
    case EventType.MOTOR_OFF:
      if (event.stopReason === StopReason.SUPPLY_CUT) return colors.tankOrange;
      return colors.primary;
    case EventType.MANUAL_ON:
      return colors.manualOverride;
    case EventType.WATER_ARRIVED:
      return colors.supplyBlue;
    case EventType.ALREADY_FULL:
      return colors.mutedForeground;
    default:
      return colors.mutedForeground;
  }
}

function getStopReasonColor(
  reason: StopReason,
  colors: { tankGreen: string; tankOrange: string; primary: string; mutedForeground: string },
): string {
  switch (reason) {
    case StopReason.TANK_FULL:
      return colors.primary;
    case StopReason.SUPPLY_CUT:
      return colors.tankOrange;
    default:
      return colors.mutedForeground;
  }
}

export function EventRow({ event }: EventRowProps) {
  const colors = useColors();
  const borderColor = getLeftBorderColor(event, colors);
  const timeStr = formatTime(event.epoch);
  const label = EVENT_LABELS[event.type] ?? `Event ${event.type}`;
  const tankStr = `${event.tankPct.toFixed(1)}%`;
  const showStopReason = event.type === EventType.MOTOR_OFF && event.stopReason !== StopReason.NONE;
  const showDuration = event.type === EventType.MOTOR_OFF && event.durationSec > 0;

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.leftBorder, { backgroundColor: borderColor }]} />
      <View style={styles.content}>
        <View style={styles.mainRow}>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{timeStr}</Text>
          <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.tank, { color: colors.mutedForeground }]}>{tankStr}</Text>
        </View>
        {(showStopReason || showDuration) && (
          <View style={styles.subRow}>
            {showStopReason && (
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: getStopReasonColor(event.stopReason, colors) + "22",
                    borderColor: getStopReasonColor(event.stopReason, colors) + "44",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: getStopReasonColor(event.stopReason, colors) },
                  ]}
                >
                  {STOP_REASON_LABELS[event.stopReason]}
                </Text>
              </View>
            )}
            {showDuration && (
              <Text style={[styles.duration, { color: colors.mutedForeground }]}>
                {formatDuration(event.durationSec)}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 6,
  },
  leftBorder: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    width: 72,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  tank: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 80,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  duration: {
    fontSize: 12,
  },
});
