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
import { EventRow } from "@/components/EventRow";
import { useDevice } from "@/context/DeviceContext";
import { useColors } from "@/hooks/useColors";
import { WaterEvent } from "@/models/Event";
import { formatHeaderDate } from "@/utils/formatters";

export default function TodayScreen() {
  const colors = useColors();
  const { getEventsForDate, refreshKey } = useDevice();
  const [refreshing, setRefreshing] = useState(false);
  const [internalKey, setInternalKey] = useState(0);

  const today = new Date();
  const events: WaterEvent[] = getEventsForDate(today);
  const dateLabel = formatHeaderDate(today);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInternalKey((k) => k + 1);
    setRefreshing(false);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.dateLabel, { color: colors.foreground }]}>{dateLabel}</Text>
        <Text style={[styles.eventCount, { color: colors.mutedForeground }]}>
          {events.length} {events.length === 1 ? "event" : "events"}
        </Text>
      </View>

      <FlatList
        key={`${refreshKey}-${internalKey}`}
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
            icon="clock"
            title="No events today"
            message="Waiting for water supply. The motor will start automatically when supply arrives."
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dateLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  eventCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
});
