import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { formatTankPct, getTankColor } from '@/utils/formatters';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

interface WaterTankWidgetProps {
  pct: number;
  connected: boolean;
  animated?: boolean;
}

const TANK_W = 140;
const TANK_H = 220;
const TANK_X = 10;
const TANK_Y = 20;
const INNER_W = TANK_W - 20;
const INNER_H = TANK_H - 40;
const ELLIPSE_RY = 12;

export function WaterTankWidget({ pct, connected, animated = true }: WaterTankWidgetProps) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(100, pct));
  const fillPct = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      fillPct.value = withTiming(clamped, { duration: 600 });
    } else {
      fillPct.value = clamped;
    }
  }, [clamped, animated]);

  const waterColor = getTankColor(clamped, colors);

  const animatedRectProps = useAnimatedProps(() => {
    const h = (fillPct.value / 100) * INNER_H;
    return {
      y: TANK_Y + (INNER_H - h),
      height: h,
    } as any;
  });

  const animatedEllipseProps = useAnimatedProps(() => {
    const h = (fillPct.value / 100) * INNER_H;
    return {
      cy: TANK_Y + (INNER_H - h),
    } as any;
  });

  if (!connected) {
    return (
      <View style={styles.container}>
        <Svg width={TANK_W + 20} height={TANK_H + 20}>
          <Rect
            x={TANK_X}
            y={TANK_Y}
            width={INNER_W}
            height={INNER_H}
            rx={8}
            fill={colors.muted}
            stroke={colors.border}
            strokeWidth={2}
          />
          <Ellipse
            cx={TANK_X + INNER_W / 2}
            cy={TANK_Y}
            rx={INNER_W / 2}
            ry={ELLIPSE_RY}
            fill={colors.muted}
            stroke={colors.border}
            strokeWidth={2}
          />
        </Svg>
        <Text style={[styles.bigPct, { color: colors.mutedForeground }]}>—</Text>
        <Text style={[styles.subText, { color: colors.mutedForeground }]}>No data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Svg width={TANK_W + 20} height={TANK_H + 20}>
        <Defs>
          <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={waterColor} stopOpacity="0.95" />
            <Stop offset="1" stopColor={waterColor} stopOpacity="0.65" />
          </LinearGradient>
        </Defs>

        {/* Tank background (empty interior) */}
        <Rect
          x={TANK_X}
          y={TANK_Y}
          width={INNER_W}
          height={INNER_H}
          rx={8}
          fill="#0F172A"
          stroke="#334155"
          strokeWidth={2}
        />

        {/* Water fill (animated rect from bottom up) */}
        <AnimatedRect
          x={TANK_X}
          width={INNER_W}
          rx={8}
          fill="url(#waterGrad)"
          animatedProps={animatedRectProps}
        />

        {/* Water surface ellipse (top of water) */}
        {clamped > 1 && (
          <AnimatedEllipse
            cx={TANK_X + INNER_W / 2}
            rx={INNER_W / 2}
            ry={ELLIPSE_RY * 0.6}
            fill={waterColor}
            animatedProps={animatedEllipseProps}
          />
        )}

        {/* Tank top ellipse (rim) */}
        <Ellipse
          cx={TANK_X + INNER_W / 2}
          cy={TANK_Y}
          rx={INNER_W / 2}
          ry={ELLIPSE_RY}
          fill="none"
          stroke="#334155"
          strokeWidth={2}
        />
      </Svg>

      <Text style={[styles.bigPct, { color: waterColor }]}>{formatTankPct(clamped)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  bigPct: {
    fontSize: 42,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1.5,
  },
  subText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
