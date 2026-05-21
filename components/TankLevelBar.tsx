import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { getTankColor } from "@/utils/formatters";

interface TankLevelBarProps {
  pct: number;
  connected: boolean;
}

export function TankLevelBar({ pct, connected }: TankLevelBarProps) {
  const colors = useColors();
  const fillHeight = useSharedValue(0);
  const clampedPct = Math.max(0, Math.min(100, pct));

  useEffect(() => {
    fillHeight.value = withTiming(clampedPct, { duration: 300 });
  }, [clampedPct]);

  const animatedFill = useAnimatedStyle(() => ({
    height: `${fillHeight.value}%` as `${number}%`,
  }));

  const tankColor = getTankColor(clampedPct, colors);

  if (!connected) {
    return (
      <View style={styles.container}>
        <View style={[styles.barContainer, { borderColor: colors.border, backgroundColor: colors.muted }]}>
          <View style={[styles.disconnectedOverlay]}>
            <Text style={[styles.unavailableText, { color: colors.mutedForeground }]}>
              —
            </Text>
          </View>
        </View>
        <Text style={[styles.pctText, { color: colors.mutedForeground }]}>
          No signal
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.barContainer,
          { borderColor: colors.border, backgroundColor: colors.muted },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            animatedFill,
            { backgroundColor: tankColor },
          ]}
        />
        <View style={styles.labelOverlay}>
          <Text style={[styles.fillPctLabel, { color: "#FFFFFF" }]}>
            {clampedPct >= 20 ? `${clampedPct.toFixed(1)}%` : ""}
          </Text>
        </View>
      </View>
      <Text style={[styles.pctText, { color: tankColor }]}>
        {clampedPct.toFixed(1)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
  },
  barContainer: {
    width: 80,
    height: 220,
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    justifyContent: "flex-end",
    position: "relative",
  },
  fill: {
    width: "100%",
    borderRadius: 14,
  },
  labelOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  fillPctLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  pctText: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  disconnectedOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  unavailableText: {
    fontSize: 32,
    fontWeight: "300",
  },
});
