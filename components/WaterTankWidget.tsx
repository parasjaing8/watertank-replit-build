import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { getTankColor } from '@/utils/formatters';

interface WaterTankWidgetProps {
  pct: number;
  connected: boolean;
  animated?: boolean;
}

// Tank geometry constants
const SVG_W = 200;
const SVG_H = 260;
const BODY_W = 160;
const BODY_H = 190;
const BODY_X = (SVG_W - BODY_W) / 2;       // 20
const BODY_Y = 50;                           // starts below dome
const DOME_H = 30;
const DOME_CX = SVG_W / 2;
const DOME_CY = BODY_Y;                      // dome sits at top of body
const KNOB_R = 7;
const KNOB_CY = BODY_Y - DOME_H;            // peak of dome

// Ring positions (4 rings, evenly spaced across body height)
const RING_Y_OFFSETS = [0.22, 0.40, 0.58, 0.76]; // fractions of BODY_H

function buildDomePath(): string {
  // Arc from body-left to body-right, curving up by DOME_H
  const x1 = BODY_X;
  const x2 = BODY_X + BODY_W;
  const y = BODY_Y;
  const rx = BODY_W / 2;
  const ry = DOME_H;
  // SVG arc: from (x1,y) to (x2,y) via an elliptical arc going upward
  return `M ${x1} ${y} A ${rx} ${ry} 0 0 1 ${x2} ${y}`;
}

function buildWavePath(waterY: number, bodyX: number, bodyW: number, bodyH: number, bodyY: number): string {
  if (waterY <= bodyY) return '';
  const step = 10;
  const amp = 4;
  const freq = 0.045;
  let d = `M ${bodyX} ${waterY}`;
  for (let x = 0; x <= bodyW; x += step) {
    const wx = bodyX + x;
    const wy = waterY + Math.sin(x * freq) * amp;
    d += ` L ${wx} ${wy}`;
  }
  const bottom = bodyY + bodyH;
  d += ` L ${bodyX + bodyW} ${bottom} L ${bodyX} ${bottom} Z`;
  return d;
}

export function WaterTankWidget({ pct, connected, animated = true }: WaterTankWidgetProps) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(100, pct));
  const [fillPct, setFillPct] = useState(animated ? 0 : clamped);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!animated) { setFillPct(clamped); return; }
    const start = fillPct;
    const end = clamped;
    const steps = 30;
    const stepMs = 600 / steps;
    let i = 0;
    if (animRef.current) clearInterval(animRef.current);
    animRef.current = setInterval(() => {
      i++;
      setFillPct(start + (end - start) * (i / steps));
      if (i >= steps) { clearInterval(animRef.current!); animRef.current = null; }
    }, stepMs);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [clamped]);

  const waterColor = getTankColor(clamped, colors);
  const tankStroke = '#0F172A';
  const tankFill = colors.card;
  const ringColor = '#0F172A';

  const fillH = (fillPct / 100) * BODY_H;
  const rectY = BODY_Y + (BODY_H - fillH);
  const wavePath = buildWavePath(rectY, BODY_X, BODY_W, BODY_H, BODY_Y);

  const domePath = buildDomePath();

  if (!connected) {
    return (
      <View style={styles.container}>
        <Svg width={SVG_W} height={SVG_H}>
          {/* Body */}
          <Rect
            x={BODY_X} y={BODY_Y}
            width={BODY_W} height={BODY_H}
            rx={8}
            fill={colors.muted}
            stroke={colors.border}
            strokeWidth={2.5}
          />
          {/* Rings */}
          {RING_Y_OFFSETS.map((frac, i) => (
            <Rect
              key={i}
              x={BODY_X}
              y={BODY_Y + frac * BODY_H - 2}
              width={BODY_W}
              height={5}
              fill={colors.border}
              opacity={0.6}
            />
          ))}
          {/* Dome */}
          <Path
            d={domePath}
            fill={colors.muted}
            stroke={colors.border}
            strokeWidth={2.5}
          />
          {/* Knob */}
          <Circle
            cx={DOME_CX} cy={KNOB_CY}
            r={KNOB_R}
            fill={colors.border}
            stroke={colors.border}
            strokeWidth={1.5}
          />
        </Svg>
        <Text style={[styles.noDataText, { color: colors.mutedForeground }]}>No data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Svg width={SVG_W} height={SVG_H}>
        <Defs>
          <LinearGradient id="waterGrad4" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={waterColor} stopOpacity="0.95" />
            <Stop offset="1" stopColor={waterColor} stopOpacity="0.65" />
          </LinearGradient>
        </Defs>

        {/* Tank body background */}
        <Rect
          x={BODY_X} y={BODY_Y}
          width={BODY_W} height={BODY_H}
          rx={8}
          fill={tankFill}
          stroke={tankStroke}
          strokeWidth={2.5}
        />

        {/* Water fill (animates via state) */}
        <Rect
          x={BODY_X}
          y={rectY}
          width={BODY_W}
          height={Math.max(0, fillH)}
          rx={8}
          fill="url(#waterGrad4)"
        />

        {/* Wavy water surface */}
        {clamped > 1 && (
          <Path
            fill="url(#waterGrad4)"
            d={wavePath}
          />
        )}

        {/* Horizontal rings — drawn on top of water so they stay visible */}
        {RING_Y_OFFSETS.map((frac, i) => (
          <Rect
            key={i}
            x={BODY_X}
            y={BODY_Y + frac * BODY_H - 2}
            width={BODY_W}
            height={5}
            fill={ringColor}
            opacity={0.18}
          />
        ))}

        {/* Body outline (drawn last so it sits on top of fill) */}
        <Rect
          x={BODY_X} y={BODY_Y}
          width={BODY_W} height={BODY_H}
          rx={8}
          fill="none"
          stroke={tankStroke}
          strokeWidth={2.5}
        />

        {/* Dome */}
        <Path
          d={domePath}
          fill={tankStroke}
          stroke={tankStroke}
          strokeWidth={2.5}
        />

        {/* Knob handle on dome peak */}
        <Circle
          cx={DOME_CX} cy={KNOB_CY}
          r={KNOB_R}
          fill={tankStroke}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  noDataText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
