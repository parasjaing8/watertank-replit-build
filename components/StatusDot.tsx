import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { formatRelativeTime } from "@/utils/formatters";
import { useLanguage } from "@/context/LanguageContext";
import { useAppFont } from "@/hooks/useAppFont";

interface StatusDotProps {
  connected: boolean;
  simMode: boolean;
  lastSyncAt: number | null;
}

export function StatusDot({ connected, simMode, lastSyncAt }: StatusDotProps) {
  const colors = useColors();
  const { t } = useLanguage();
  const font = useAppFont();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!connected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      opacity.stopAnimation();
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [connected]);

  const dotColor = connected ? colors.success : colors.mutedForeground;
  const label = connected
    ? simMode
      ? t("simulating")
      : t("connected")
    : t("lookingForDevice");

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { backgroundColor: dotColor }, { opacity }]} />
      <Text style={[styles.label, { color: colors.foreground, fontFamily: font.medium }]}>{label}</Text>
      {simMode && (
        <View style={[styles.demoBadge, { backgroundColor: '#F59E0B' }]}>
          <Text style={styles.demoBadgeText}>DEMO</Text>
        </View>
      )}
      {connected && lastSyncAt && (
        <Text style={[styles.syncTime, { color: colors.mutedForeground, fontFamily: font.regular }]}>
          {t("lastUpdated").replace("%t", formatRelativeTime(lastSyncAt, t))}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  demoBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  demoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  syncTime: {
    fontSize: 12,
  },
});
