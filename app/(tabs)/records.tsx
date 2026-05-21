import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { EmptyState } from '@/components/EmptyState';
import { EventRow } from '@/components/EventRow';
import { useDevice } from '@/context/DeviceContext';
import { useLanguage } from '@/context/LanguageContext';
import { useColors } from '@/hooks/useColors';
import { EventType, WaterEvent } from '@/models/Event';
import {
  addDays,
  formatHeaderDate,
  isToday,
} from '@/utils/formatters';

export default function RecordsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { getEventsForDate, refreshKey } = useDevice();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [internalKey, setInternalKey] = useState(0);

  const events: WaterEvent[] = getEventsForDate(currentDate);
  const atToday = isToday(currentDate);
  const dateLabel = atToday ? t('today') : formatHeaderDate(currentDate);

  const motorRuns = useMemo(
    () => events.filter((e) => e.type === EventType.MOTOR_OFF && e.durationSec > 0).length,
    [events],
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.arrowBtn} activeOpacity={0.6}>
          <Feather name="chevron-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.dateLabel, { color: colors.foreground }]}>{dateLabel}</Text>
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
            icon={atToday ? 'clock' : 'calendar'}
            title={atToday ? t('noEventsToday') : t('noEventsDate')}
            message={atToday ? t('waitingMessage') : ''}
          />
        }
      />

      {atToday && (
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.foreground }]}>
            {motorRuns === 0
              ? 'No motor runs today'
              : motorRuns === 1
                ? 'Motor ran 1 time today'
                : `Motor ran ${motorRuns} times today`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  arrowBtn: {
    padding: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
    paddingBottom: 120,
  },
  footer: {
    position: 'absolute',
    bottom: 84,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
