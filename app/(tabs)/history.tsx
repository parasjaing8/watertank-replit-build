import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
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
import { useColors } from "@/hooks/useColors";
import { WaterEvent } from "@/models/Event";
import {
  addDays,
  formatHeaderDate,
  isToday,
} from "@/utils/formatters";

export default function HistoryScreen() {
  const colors = useColors();
  const { getEventsForDate, refreshKey } = useDevice();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [internalKey, setInternalKey] = useState(0);

  const events: WaterEvent[] = getEventsForDate(currentDate);
  const dateLabel = formatHeaderDate(currentDate);
  const atToday = isToday(currentDate);

  function goBack() {
    setCurrentDate((d) => addDays(d, -1));
  }

  function goForward() {
    if (!atToday) {
      setCurrentDate((d) => addDays(d, 1));
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInternalKey((k) => k + 1);
    setRefreshing(false);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.arrowBtn} activeOpacity={0.6}>
          <Feather name="chevron-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.dateLabel, { color: colors.foreground }]}>{dateLabel}</Text>
          <Text style={[styles.eventCount, { color: colors.mutedForeground }]}>
            {events.length} {events.length === 1 ? "event" : "events"}
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
            size={22}
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
            icon="calendar"
            title="No events this day"
            message="No events were recorded on this day."
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  arrowBtn: {
    padding: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  dateLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  eventCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
});
