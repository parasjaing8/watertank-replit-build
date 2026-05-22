import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { EmptyState } from "@/components/EmptyState";
import { EventRow } from "@/components/EventRow";
import { useDevice } from "@/context/DeviceContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { EventType, WaterEvent } from "@/models/Event";
import {
  addDays,
  formatDuration,
  formatHeaderDate,
  isToday,
} from "@/utils/formatters";

export default function RecordsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { getEventsForDate, getStats, refreshKey } = useDevice();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [internalKey, setInternalKey] = useState(0);
  const [mode, setMode] = useState<"today" | "week">("today");

  const events: WaterEvent[] = getEventsForDate(currentDate);
  const atToday = isToday(currentDate);
  const dateLabel = atToday ? t("today") : formatHeaderDate(currentDate);

  const motorRuns = useMemo(
    () => events.filter((e) => e.type === EventType.MOTOR_OFF && e.durationSec > 0).length,
    [events]
  );

  function goBack() {
    setCurrentDate((d) => addDays(d, -1));
  }
  function goForward() {
    if (!atToday) setCurrentDate((d) => addDays(d, 1));
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInternalKey((k) => k + 1);
    setRefreshing(false);
  }, []);

  const footerText = (() => {
    if (motorRuns === 0) return t("noMotorRunsToday");
    if (motorRuns === 1) return t("motorRanOnce");
    return t("motorRanNTimes").replace("%n", String(motorRuns));
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Today / This Week tab toggle */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          onPress={() => setMode("today")}
          style={[
            styles.tabChip,
            { backgroundColor: mode === "today" ? colors.primary : colors.muted },
          ]}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabChipText,
              {
                color:
                  mode === "today" ? colors.primaryForeground : colors.foreground,
              },
            ]}
          >
            {t("today2")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode("week")}
          style={[
            styles.tabChip,
            { backgroundColor: mode === "week" ? colors.primary : colors.muted },
          ]}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabChipText,
              {
                color:
                  mode === "week" ? colors.primaryForeground : colors.foreground,
              },
            ]}
          >
            {t("thisWeek")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Today mode */}
      {mode === "today" && (
        <>
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.background,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity onPress={goBack} style={styles.arrowBtn} activeOpacity={0.6}>
              <Feather name="chevron-left" size={24} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={[styles.dateLabel, { color: colors.foreground }]}>
                {dateLabel}
              </Text>
            </View>
            <TouchableOpacity
              onPress={goForward}
              style={styles.arrowBtn}
              activeOpacity={atToday ? 1 : 0.6}
              disabled={atToday}
            >
              <Feather
                name="chevron-right"
                size={24}
                color={atToday ? colors.mutedForeground : colors.primary}
              />
            </TouchableOpacity>
          </View>

          <FlatList
            key={`${currentDate.toDateString()}-${refreshKey}-${internalKey}`}
            data={events}
            keyExtractor={(item) => `${item.id}-${item.epoch}`}
            renderItem={({ item }) => <EventRow event={item} />}
            contentContainerStyle={styles.listContent}
            scrollEnabled={events.length > 0}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon={atToday ? "clock" : "calendar"}
                title={atToday ? t("noEventsToday") : t("noEventsDate")}
                message={atToday ? t("waitingMessage") : ""}
              />
            }
          />

          {atToday && (
            <View
              style={[
                styles.footer,
                {
                  backgroundColor: colors.card,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.footerText, { color: colors.foreground }]}>
                {footerText}
              </Text>
            </View>
          )}
        </>
      )}

      {/* Weekly mode */}
      {mode === "week" && (() => {
        const stats = getStats();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
        const weekStats = stats.filter((s) => s.day >= sevenDaysAgoStr);
        const totalRuns = weekStats.reduce((sum, s) => sum + s.runs, 0);
        const totalSec = weekStats.reduce((sum, s) => sum + s.totalSec, 0);

        if (totalRuns === 0) {
          return (
            <View style={styles.weekEmpty}>
              <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
              <Text style={[styles.weekEmptyText, { color: colors.mutedForeground }]}>
                {t("weeklyNoData")}
              </Text>
            </View>
          );
        }

        return (
          <ScrollView contentContainerStyle={styles.weekContent}>
            <View
              style={[
                styles.weekSummary,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.weekTitle, { color: colors.foreground }]}>
                {t("weeklyTitle")}
              </Text>
              <View style={styles.weekKpis}>
                <View style={styles.weekKpi}>
                  <Text style={[styles.weekKpiValue, { color: colors.primary }]}>
                    {totalRuns}
                  </Text>
                  <Text
                    style={[styles.weekKpiLabel, { color: colors.mutedForeground }]}
                  >
                    {t("weeklyRuns")}
                  </Text>
                </View>
                <View style={styles.weekKpi}>
                  <Text style={[styles.weekKpiValue, { color: colors.primary }]}>
                    {formatDuration(totalSec)}
                  </Text>
                  <Text
                    style={[styles.weekKpiLabel, { color: colors.mutedForeground }]}
                  >
                    {t("weeklyRuntime")}
                  </Text>
                </View>
              </View>
            </View>
            {weekStats.map((s) => (
              <View
                key={s.day}
                style={[
                  styles.weekDayRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.weekDayLabel, { color: colors.foreground }]}>
                  {s.day}
                </Text>
                <Text
                  style={[styles.weekDayStat, { color: colors.mutedForeground }]}
                >
                  {s.runs} · {formatDuration(s.totalSec)}
                </Text>
              </View>
            ))}
          </ScrollView>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: "center",
  },
  tabChipText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  arrowBtn: {
    padding: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
    paddingBottom: 120,
  },
  footer: {
    position: "absolute",
    bottom: 84,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  weekContent: { padding: 16, gap: 8, paddingBottom: 120 },
  weekSummary: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    marginBottom: 8,
  },
  weekTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  weekKpis: { flexDirection: "row", gap: 24 },
  weekKpi: { flex: 1, gap: 4 },
  weekKpiValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  weekKpiLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  weekDayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  weekDayLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  weekDayStat: { fontSize: 13, fontFamily: "Inter_400Regular" },
  weekEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  weekEmptyText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
