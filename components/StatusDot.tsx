import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { formatRelativeTime } from "@/utils/formatters";

interface StatusDotProps {
  connected: boolean;
  simMode: boolean;
  lastSyncAt: number | null;
}

export function StatusDot({ connected, simMode, lastSyncAt }: StatusDotProps) {
  const colors = useColors();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!connected) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [connected]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const dotColor = connected ? colors.success : colors.mutedForeground;
  const label = connected
    ? simMode
      ? "Simulating"
      : "Connected"
    : "Searching...";

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { backgroundColor: dotColor }, animStyle]} />
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      {simMode && (
        <View style={[styles.simBadge, { backgroundColor: colors.warning }]}>
          <Text style={styles.simBadgeText}>SIM</Text>
        </View>
      )}
      {connected && lastSyncAt && (
        <Text style={[styles.syncTime, { color: colors.mutedForeground }]}>
          synced {formatRelativeTime(lastSyncAt)}
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
  simBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  simBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  syncTime: {
    fontSize: 12,
  },
});
