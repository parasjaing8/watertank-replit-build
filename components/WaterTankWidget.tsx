import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

interface WaterTankWidgetProps {
  pct: number;
  connected: boolean;
  motorOn?: boolean;
  animated?: boolean;
}

// Canvas
const W = 260;
const H = 300;

// Tank body
const TX = 20;
const TY = 52;
const TW = 220;
const TH = 208;
const TRX = 22;

// Dome (semi-ellipse above body top)
const DOME_H = 30;

// Cutaway window inside tank
const CX = TX + 28;
const CY = TY + 28;
const CW = TW - 56;
const CH = TH - 60;
const CRX = 12;

// Horizontal ribs
const RIB_FRACS = [0.25, 0.50, 0.75];
const RIB_H = 7;

// Inlet pipe (top-right, horizontal bar entering from right side)
const PIPE_Y = TY + 44;
const PIPE_ENTRY_X = TX + TW; // right wall of tank
const PIPE_X2 = W - 4;        // pipe extends to right edge

// Tank colors (fixed dark navy, same in both themes)
const C_BODY = '#1C2B46';
const C_BODY_DARK = '#0D1826';
const C_BODY_HIGHLIGHT = '#243850';
const C_RIB = '#0D1826';
const C_INNER = '#0A1520';
const C_PIPE = '#C8D6EA';
const C_WATER_BASE = '#2563EB';
const C_WATER_TOP = '#3B82F6';
const C_GLOW = '#3B82F6';

function buildWavePath(
  waterSurfaceY: number,
  clipX: number,
  clipW: number,
  clipBottomY: number,
  phase: number,
  amplitude: number,
): string {
  const step = 8;
  const freq = 0.045;
  let d = `M ${clipX} ${waterSurfaceY}`;
  for (let x = 0; x <= clipW; x += step) {
    const wx = clipX + x;
    const wy = waterSurfaceY + Math.sin(x * freq + phase) * amplitude;
    d += ` L ${wx} ${wy}`;
  }
  d += ` L ${clipX + clipW} ${clipBottomY} L ${clipX} ${clipBottomY} Z`;
  return d;
}

export function WaterTankWidget({
  pct,
  connected,
  motorOn = false,
  animated = true,
}: WaterTankWidgetProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const [fillPct, setFillPct] = useState(animated ? 0 : clamped);
  const [wavePhase, setWavePhase] = useState(0);
  const fillAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fill animation
  useEffect(() => {
    if (!animated) { setFillPct(clamped); return; }
    const start = fillPct;
    const end = clamped;
    const steps = 30;
    const ms = 600 / steps;
    let i = 0;
    if (fillAnimRef.current) clearInterval(fillAnimRef.current);
    fillAnimRef.current = setInterval(() => {
      i++;
      setFillPct(start + (end - start) * (i / steps));
      if (i >= steps) { clearInterval(fillAnimRef.current!); fillAnimRef.current = null; }
    }, ms);
    return () => { if (fillAnimRef.current) clearInterval(fillAnimRef.current); };
  }, [clamped]);

  // Wave animation
  useEffect(() => {
    if (!connected || clamped <= 0) return;
    const step = motorOn ? 0.10 : 0.035;
    const ms = motorOn ? 50 : 100;
    if (waveAnimRef.current) clearInterval(waveAnimRef.current);
    waveAnimRef.current = setInterval(() => {
      setWavePhase((p) => p + step);
    }, ms);
    return () => { if (waveAnimRef.current) clearInterval(waveAnimRef.current); };
  }, [connected, motorOn, clamped]);

  // Geometry
  const innerBottom = CY + CH;
  const fillH = (fillPct / 100) * CH;
  const waterSurfaceY = innerBottom - fillH;
  const waveAmp = motorOn ? 5 : 2.5;
  const wavePath = connected && fillPct > 0
    ? buildWavePath(waterSurfaceY, CX, CW, innerBottom, wavePhase, waveAmp)
    : '';

  // Dome path (semi-ellipse sitting above tank body)
  const domeTop = TY - DOME_H;
  const domePath = `M ${TX} ${TY} A ${TW / 2} ${DOME_H} 0 0 1 ${TX + TW} ${TY}`;

  // Motor-on: water-fall path from pipe inlet into water
  const showFlow = connected && motorOn && fillPct > 0;
  const flowX = PIPE_ENTRY_X - 2;
  const flowPath = showFlow
    ? `M ${flowX} ${PIPE_Y + 8} Q ${flowX - 6} ${waterSurfaceY - 20} ${flowX - 18} ${waterSurfaceY + 4}`
    : '';

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={W} height={H}>
        <Defs>
          {/* Water gradient */}
          <LinearGradient id="wtWater" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C_WATER_TOP} stopOpacity="1" />
            <Stop offset="1" stopColor={C_WATER_BASE} stopOpacity="1" />
          </LinearGradient>
          {/* Body left-edge highlight */}
          <LinearGradient id="wtHighlight" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={C_BODY_HIGHLIGHT} stopOpacity="0.8" />
            <Stop offset="0.15" stopColor={C_BODY} stopOpacity="0" />
          </LinearGradient>
          {/* Body right-edge shadow */}
          <LinearGradient id="wtShadow" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0.85" stopColor={C_BODY} stopOpacity="0" />
            <Stop offset="1" stopColor={C_BODY_DARK} stopOpacity="0.8" />
          </LinearGradient>
          {/* Clip for cutaway window */}
          <ClipPath id="cutawayClip">
            <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} />
          </ClipPath>
        </Defs>

        {/* Ambient glow below tank */}
        <Ellipse
          cx={TX + TW / 2}
          cy={TY + TH + 18}
          rx={90}
          ry={22}
          fill={C_GLOW}
          opacity={connected ? 0.12 : 0.04}
        />

        {/* ── TANK BODY ── */}
        <Rect
          x={TX} y={TY}
          width={TW} height={TH}
          rx={TRX}
          fill={C_BODY}
        />

        {/* Left highlight */}
        <Rect
          x={TX} y={TY}
          width={TW} height={TH}
          rx={TRX}
          fill="url(#wtHighlight)"
        />
        {/* Right shadow */}
        <Rect
          x={TX} y={TY}
          width={TW} height={TH}
          rx={TRX}
          fill="url(#wtShadow)"
        />

        {/* ── CUTAWAY INTERIOR (clipped) ── */}
        <Rect
          x={CX} y={CY}
          width={CW} height={CH}
          rx={CRX}
          fill={C_INNER}
          clipPath="url(#cutawayClip)"
        />
        {connected && fillPct > 0 && (
          <Path
            d={wavePath}
            fill="url(#wtWater)"
            clipPath="url(#cutawayClip)"
          />
        )}
        {/* Water flow line when motor ON */}
        {showFlow && (
          <Path
            d={flowPath}
            stroke={C_WATER_TOP}
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
            opacity={0.7}
            clipPath="url(#cutawayClip)"
          />
        )}

        {/* Cutaway border (sits on top of water, looks like a frame) */}
        <Rect
          x={CX} y={CY}
          width={CW} height={CH}
          rx={CRX}
          fill="none"
          stroke={C_BODY_DARK}
          strokeWidth={2.5}
        />

        {/* ── RIBS (drawn over cutaway for continuity) ── */}
        {RIB_FRACS.map((f, i) => (
          <Rect
            key={i}
            x={TX}
            y={TY + f * TH - RIB_H / 2}
            width={TW}
            height={RIB_H}
            fill={C_RIB}
            opacity={0.55}
          />
        ))}

        {/* Body outline */}
        <Rect
          x={TX} y={TY}
          width={TW} height={TH}
          rx={TRX}
          fill="none"
          stroke={C_BODY_DARK}
          strokeWidth={2}
        />

        {/* ── DOME ── */}
        <Path
          d={domePath}
          fill={C_BODY}
        />
        {/* Dome highlight seam */}
        <Path
          d={`M ${TX + 30} ${TY} A ${TW / 2 - 30} ${DOME_H - 6} 0 0 1 ${TX + TW - 30} ${TY}`}
          fill="none"
          stroke={C_BODY_HIGHLIGHT}
          strokeWidth={1.5}
          opacity={0.5}
        />
        {/* Dome knobs */}
        <Circle cx={TX + TW * 0.35} cy={domeTop + 10} r={6} fill={C_BODY} stroke={C_BODY_DARK} strokeWidth={1.5} />
        <Circle cx={TX + TW / 2} cy={domeTop + 4} r={8} fill={C_BODY} stroke={C_BODY_DARK} strokeWidth={1.5} />
        <Circle cx={TX + TW * 0.65} cy={domeTop + 10} r={6} fill={C_BODY} stroke={C_BODY_DARK} strokeWidth={1.5} />

        {/* ── INLET PIPE (top-right) ── */}
        {/* Pipe body */}
        <Rect
          x={PIPE_ENTRY_X - 4}
          y={PIPE_Y - 7}
          width={PIPE_X2 - PIPE_ENTRY_X + 4}
          height={14}
          rx={7}
          fill={C_PIPE}
        />
        {/* Pipe connector at tank wall */}
        <Circle cx={PIPE_ENTRY_X} cy={PIPE_Y} r={9} fill={C_PIPE} />
        <Circle cx={PIPE_ENTRY_X} cy={PIPE_Y} r={5} fill={C_BODY_DARK} opacity={0.6} />
      </Svg>
    </View>
  );
}
