import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

import { EmptyState } from "@/components/EmptyState";
import { useDevice } from "@/context/DeviceContext";
import { useColors } from "@/hooks/useColors";
import { DailyStats } from "@/models/Event";
import { formatDayLabel, formatDuration } from "@/utils/formatters";

function StatsRow({ item, colors }: { item: DailyStats; colors: ReturnType<typeof useColors> }) {
  const hasRuns = item.runs > 0;
  const [, month, day] = item.day.split("-");
  const dateDisplay = `${parseInt(day, 10)} ${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(month, 10)]}`;
  const dayLabel = formatDayLabel(item.day);

  return (
    <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.dateCol}>
        <Text style={[styles.dateDisplay, { color: colors.foreground }]}>{dateDisplay}</Text>
        <Text style={[styles.dayName, { color: colors.mutedForeground }]}>{dayLabel}</Text>
      </View>
      <View style={styles.durationCol}>
        {hasRuns ? (
          <Text style={[styles.duration, { color: colors.primary }]}>
            {formatDuration(item.totalSec)}
          </Text>
        ) : (
          <Text style={[styles.noDuration, { color: colors.mutedForeground }]}>—</Text>
        )}
      </View>
      <View style={styles.runsCol}>
        <Text
          style={[
            styles.runs,
            { color: hasRuns ? colors.foreground : colors.mutedForeground },
          ]}
        >
          {item.runs} {item.runs === 1 ? "run" : "runs"}
        </Text>
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const colors = useColors();
  const { getStats, refreshKey } = useDevice();
  const [refreshing, setRefreshing] = useState(false);
  const [internalKey, setInternalKey] = useState(0);

  const stats: DailyStats[] = getStats();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInternalKey((k) => k + 1);
    setRefreshing(false);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        key={`${refreshKey}-${internalKey}`}
        data={stats}
        keyExtractor={(item) => item.day}
        renderItem={({ item }) => <StatsRow item={item} colors={colors} />}
        contentContainerStyle={styles.listContent}
        scrollEnabled={stats.length > 0}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          stats.length > 0 ? (
            <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.headerCell, { color: colors.mutedForeground }]}>Date</Text>
              <Text style={[styles.headerCell, styles.right, { color: colors.mutedForeground }]}>Duration</Text>
              <Text style={[styles.headerCell, styles.right, { color: colors.mutedForeground }]}>Runs</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="bar-chart-2"
            title="No motor runs yet"
            message="Motor runtime will appear here once the pump has run at least once. Use Settings → Run Demo to see sample data."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
  },
  headerCell: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  right: {
    textAlign: "right",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 6,
  },
  dateCol: {
    flex: 1.2,
    gap: 2,
  },
  dateDisplay: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  dayName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  durationCol: {
    flex: 1,
    alignItems: "flex-end",
  },
  duration: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  noDuration: {
    fontSize: 15,
  },
  runsCol: {
    flex: 0.8,
    alignItems: "flex-end",
  },
  runs: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
