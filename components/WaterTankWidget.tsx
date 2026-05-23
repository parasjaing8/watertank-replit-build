import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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

import { useTheme } from '@/context/ThemeContext';
import { useColors } from '@/hooks/useColors';
import { TANK_LOW_PCT } from '@/constants/thresholds';

// ─────────────────────────────────────────────────────────────────────────────
//  PURE SVG TANK — no external PNG, no scaling math, no alignment bugs.
//  Every coordinate is directly in SVG user units, shared by both the
//  structural shapes and the water-animation clip path.
// ─────────────────────────────────────────────────────────────────────────────

const SVG_W = 220;
const SVG_H = 270;

// ── Tank body ─────────────────────────────────────────────────────────────────
const BX = 14, BY = 28, BW = 192, BH = 196, BRX = 20;

// ── Viewing window ────────────────────────────────────────────────────────────
// THE SAME constants are used for both the ClipPath and every water-drawing
// primitive — perfect alignment is structurally impossible to break.
const WX = 38, WY = 70, WW = 144, WH = 122, WRX = 8;

// ── Pipe cap (centered, sits on top of tank body) ─────────────────────────────
const PIPE_W = 44, PIPE_H = 16, PIPE_RX = 6;
const PIPE_X = BX + (BW - PIPE_W) / 2;   // 88
const PIPE_TOP = BY - PIPE_H - 2;          // 10  (a little gap so it floats)

// ── Pipe tube connecting cap to tank top ──────────────────────────────────────
const TUBE_W = 20;
const TUBE_X = BX + (BW - TUBE_W) / 2;   // 100

// ── Water pour entry (center of tube, a bit below tank top rim) ───────────────
const POUR_X = BX + BW / 2;   // 110 — center of pipe
const POUR_Y = BY + 10;        // 38

// ── Tank support legs ─────────────────────────────────────────────────────────
const LEG_Y  = BY + BH;         // 224
const LEG_W  = 24, LEG_H = 22, LEG_RX = 5;
const L1X    = BX + 26;          // 40
const L2X    = BX + BW - 26 - LEG_W;  // 156

// ── Water palette ─────────────────────────────────────────────────────────────
const C_WATER_T = '#3DA8D0';
const C_WATER_B = '#0F3A56';
const C_POUR    = '#5CC8F0';
const C_SPLASH  = '#7FD8F8';
const C_SHEEN   = '#FFFFFF';

// ─────────────────────────────────────────────────────────────────────────────

interface WaterTankWidgetProps {
  pct: number;
  connected: boolean;
  motorOn?: boolean;
  animated?: boolean;
  /** @deprecated kept for API compatibility — colour is now theme-driven */
  tankColor?: 'black' | 'blue';
}

interface Droplet {
  id: number; x: number; y: number;
  vx: number; vy: number; life: number; maxLife: number; size: number;
}
interface Ripple {
  id: number; x: number; y: number; progress: number; maxRadius: number;
}

// ── Wave path builders ────────────────────────────────────────────────────────
// All paths drawn in WX/WY/WW/WH coordinates — same system as the clip path.
function buildWavePath(sy: number, phase: number, amp: number): string {
  const freq = 0.040; const step = 6;
  let d = `M ${WX} ${sy}`;
  for (let x = 0; x <= WW; x += step) {
    d += ` L ${WX + x} ${sy + Math.sin(x * freq + phase) * amp}`;
  }
  return d + ` L ${WX + WW} ${WY + WH} L ${WX} ${WY + WH} Z`;
}

function buildWave2Path(sy: number, phase: number, amp: number): string {
  const freq = 0.055; const step = 6;
  let d = `M ${WX} ${sy + 3}`;
  for (let x = 0; x <= WW; x += step) {
    d += ` L ${WX + x} ${sy + 3 + Math.sin(x * freq + phase + 1.8) * amp * 0.6}`;
  }
  return d + ` L ${WX + WW} ${WY + WH} L ${WX} ${WY + WH} Z`;
}

// ── Particle helpers ──────────────────────────────────────────────────────────
let _dropId   = 0;
let _rippleId = 0;

function spawnDroplet(sy: number): Droplet {
  return {
    id: _dropId++,
    x: WX + 6 + Math.random() * 30,
    y: sy - 2,
    vx: (Math.random() - 0.4) * 2.0,
    vy: -(1.6 + Math.random() * 2.0),
    life: 0, maxLife: 14 + Math.floor(Math.random() * 10),
    size: 1.0 + Math.random() * 1.8,
  };
}

function spawnRipple(sy: number, nearInlet: boolean): Ripple {
  return {
    id: _rippleId++,
    x: nearInlet
      ? WX + 8 + Math.random() * 35
      : WX + 35 + Math.random() * (WW - 70),
    y: sy - 2,
    progress: 0,
    maxRadius: nearInlet ? 10 + Math.random() * 14 : 8 + Math.random() * 10,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export function WaterTankWidget({
  pct,
  connected,
  motorOn  = false,
  animated = true,
}: WaterTankWidgetProps) {
  const { colorScheme } = useTheme();
  const colors = useColors();
  const isDark = colorScheme === 'dark';

  const clamped   = Math.max(0, Math.min(100, pct));
  const isLow     = clamped > 0 && clamped < TANK_LOW_PCT;
  const isCritical = clamped > 0 && clamped < 10;

  const [fillPct,     setFillPct]     = useState(animated ? 0 : clamped);
  const [wavePhase,   setWavePhase]   = useState(0);
  const [droplets,    setDroplets]    = useState<Droplet[]>([]);
  const [ripples,     setRipples]     = useState<Ripple[]>([]);
  const [pourFlicker, setPourFlicker] = useState(1.0);

  const fillRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Animate fill on mount / pct change ──────────────────────────────────────
  useEffect(() => {
    if (!animated) { setFillPct(clamped); return; }
    const from = fillPct; const steps = 40; const ms = 800 / steps; let i = 0;
    if (fillRef.current) clearInterval(fillRef.current);
    fillRef.current = setInterval(() => {
      i++;
      const t = i / steps;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setFillPct(from + (clamped - from) * ease);
      if (i >= steps) { clearInterval(fillRef.current!); fillRef.current = null; }
    }, ms);
    return () => { if (fillRef.current) clearInterval(fillRef.current); };
  }, [clamped]);

  // ── Main animation loop ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!connected || clamped <= 0) {
      if (animRef.current) clearInterval(animRef.current);
      setDroplets([]); setRipples([]); return;
    }
    const waveStep = motorOn ? 0.10 : 0.028;
    const ms       = motorOn ? 40   : 80;
    let frame = 0;
    if (animRef.current) clearInterval(animRef.current);
    animRef.current = setInterval(() => {
      frame++;
      setWavePhase(p => p + waveStep);
      setPourFlicker(0.7 + Math.random() * 0.3);
      if (motorOn) {
        setDroplets(prev => {
          const sy  = (WY + WH) - (fillPct / 100) * WH;
          const aged = prev
            .map(d => ({ ...d, x: d.x + d.vx, y: d.y + d.vy, vy: d.vy + 0.30, life: d.life + 1 }))
            .filter(d => d.life < d.maxLife);
          return frame % 4 === 0 && aged.length < 12 ? [...aged, spawnDroplet(sy)] : aged;
        });
        setRipples(prev => {
          const advanced = prev.map(r => ({ ...r, progress: r.progress + 0.035 })).filter(r => r.progress < 1);
          if (frame % 16 === 0) {
            return [...advanced, spawnRipple((WY + WH) - (fillPct / 100) * WH, true)];
          }
          return advanced;
        });
      } else {
        setDroplets([]);
        setRipples(prev => {
          const advanced = prev.map(r => ({ ...r, progress: r.progress + 0.018 })).filter(r => r.progress < 1);
          if (frame % 80 === 0 && clamped > 0) {
            return [...advanced, spawnRipple((WY + WH) - (fillPct / 100) * WH, false)];
          }
          return advanced;
        });
      }
    }, ms);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [connected, motorOn, clamped, fillPct]);

  // ── Derived geometry ─────────────────────────────────────────────────────────
  const fillH    = (fillPct / 100) * WH;
  const surfaceY = WY + WH - fillH;
  const waveAmp  = motorOn ? 2.2 : 0.8;
  const wavePath  = connected && fillPct > 0 ? buildWavePath(surfaceY, wavePhase, waveAmp)  : '';
  const wave2Path = connected && fillPct > 0 && motorOn ? buildWave2Path(surfaceY, wavePhase, waveAmp) : '';

  // Pour stream bezier: from pipe center, arc to near the left side of the window
  const pourEndX = WX + 14;
  const pourEndY = surfaceY + 2;
  const pourPath = motorOn && connected && fillPct > 0
    ? `M ${POUR_X} ${POUR_Y} C ${POUR_X - 22} ${POUR_Y + 18}, ${pourEndX + 12} ${pourEndY - 24}, ${pourEndX} ${pourEndY}`
    : '';

  // ── Theme-dependent colours ──────────────────────────────────────────────────
  const bodyTop     = isDark ? '#0D1A28' : '#132030';
  const bodyBot     = isDark ? '#070F1A' : '#0A1520';
  const winInterior = isDark ? '#04090F' : '#060D15';
  const legCol      = isDark ? '#0A1520' : '#0D1B28';
  const rimHighlight = 'rgba(255,255,255,0.10)';
  const leftSheen    = 'rgba(255,255,255,0.06)';
  const boltCol      = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)';
  const borderCol    = isDark ? '#1E3A5A' : '#243650';
  const winBorder    = isDark ? '#2A4E70' : '#2E5878';
  const markCol      = 'rgba(255,255,255,0.10)';

  // Warning / motor-glow tint (sits inside the window as a coloured overlay)
  let tintColor   = 'transparent';
  let tintOpacity = 0;
  if (isCritical)                   { tintColor = colors.destructive; tintOpacity = 0.22; }
  else if (isLow)                   { tintColor = colors.warning;     tintOpacity = 0.14; }
  else if (motorOn && connected)    { tintColor = colors.primary;     tintOpacity = 0.08; }

  // Level guide lines inside the window (at 25 / 50 / 75 % water levels)
  const mark75Y = WY + WH * 0.25;  // water at 75 % → surface is 25 % from top
  const mark50Y = WY + WH * 0.50;
  const mark25Y = WY + WH * 0.75;

  return (
    <View style={styles.container}>
      <Svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
        <Defs>
          {/* Water gradient */}
          <LinearGradient id="wt_water" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor={C_WATER_T} stopOpacity={0.95} />
            <Stop offset="0.45" stopColor="#2080A8" />
            <Stop offset="1"    stopColor={C_WATER_B} />
          </LinearGradient>
          {/* Second wave gradient */}
          <LinearGradient id="wt_wave2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#6FD0F0" stopOpacity={0.55} />
            <Stop offset="1" stopColor={C_WATER_T} stopOpacity={0.0} />
          </LinearGradient>
          {/* Surface sheen */}
          <LinearGradient id="wt_sheen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C_SHEEN} stopOpacity={0.22} />
            <Stop offset="1" stopColor={C_SHEEN} stopOpacity={0} />
          </LinearGradient>
          {/* Pour stream gradient */}
          <LinearGradient id="wt_pour" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C_POUR}    stopOpacity={0.9} />
            <Stop offset="1" stopColor={C_WATER_T} stopOpacity={0.6} />
          </LinearGradient>
          {/* Tank body gradient */}
          <LinearGradient id="wt_body" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={bodyTop} />
            <Stop offset="1" stopColor={bodyBot} />
          </LinearGradient>
          {/* Pipe cap gradient */}
          <LinearGradient id="wt_pipe" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={isDark ? '#182838' : '#1E3248'} />
            <Stop offset="1" stopColor={isDark ? '#0D1A28' : '#111E2E'} />
          </LinearGradient>
          {/* Window clip — matches WX/WY/WW/WH exactly */}
          <ClipPath id="wt_win">
            <Rect x={WX} y={WY} width={WW} height={WH} rx={WRX} />
          </ClipPath>
          {/* Tank body clip (for highlights that stay within body bounds) */}
          <ClipPath id="wt_body_clip">
            <Rect x={BX} y={BY} width={BW} height={BH} rx={BRX} />
          </ClipPath>
        </Defs>

        {/* ── LEGS ──────────────────────────────────────────────────────────── */}
        <Rect x={L1X} y={LEG_Y} width={LEG_W} height={LEG_H} rx={LEG_RX} fill={legCol} />
        <Rect x={L2X} y={LEG_Y} width={LEG_W} height={LEG_H} rx={LEG_RX} fill={legCol} />
        {/* Leg foot plates */}
        <Rect x={L1X - 4} y={LEG_Y + LEG_H - 4} width={LEG_W + 8} height={5} rx={2} fill={legCol} />
        <Rect x={L2X - 4} y={LEG_Y + LEG_H - 4} width={LEG_W + 8} height={5} rx={2} fill={legCol} />

        {/* ── TANK BODY ─────────────────────────────────────────────────────── */}
        <Rect x={BX} y={BY} width={BW} height={BH} rx={BRX}
          fill="url(#wt_body)" />
        {/* Body border */}
        <Rect x={BX} y={BY} width={BW} height={BH} rx={BRX}
          fill="none" stroke={borderCol} strokeWidth={1.5} />
        {/* Left-side sheen highlight (plastic gloss) */}
        <Rect x={BX + 1} y={BY + 1} width={18} height={BH - 2} rx={BRX - 1}
          fill={leftSheen} clipPath="url(#wt_body_clip)" />
        {/* Top rim highlight */}
        <Rect x={BX + 2} y={BY + 2} width={BW - 4} height={18} rx={BRX - 1}
          fill={rimHighlight} clipPath="url(#wt_body_clip)" />
        {/* Corner bolts (gives a real-tank feel) */}
        <Circle cx={BX + 14} cy={BY + 14}  r={3} fill={boltCol} />
        <Circle cx={BX + BW - 14} cy={BY + 14}  r={3} fill={boltCol} />
        <Circle cx={BX + 14} cy={BY + BH - 14} r={3} fill={boltCol} />
        <Circle cx={BX + BW - 14} cy={BY + BH - 14} r={3} fill={boltCol} />

        {/* ── WINDOW INTERIOR (dark background inside viewing glass) ────────── */}
        <Rect x={WX} y={WY} width={WW} height={WH} rx={WRX}
          fill={winInterior} />
        {/* Top-inset shadow inside window */}
        <Rect x={WX} y={WY} width={WW} height={24} rx={WRX}
          fill="#000" opacity={0.45} clipPath="url(#wt_win)" />

        {/* ── LEVEL GUIDE MARKS (25 / 50 / 75 %) ──────────────────────────── */}
        {/* These show through water and dark bg at all times */}
        <Path d={`M ${WX + 4} ${mark25Y} L ${WX + WW - 4} ${mark25Y}`}
          stroke={markCol} strokeWidth={1} strokeDasharray="4 5" />
        <Path d={`M ${WX + 4} ${mark50Y} L ${WX + WW - 4} ${mark50Y}`}
          stroke={markCol} strokeWidth={1} strokeDasharray="4 5" />
        <Path d={`M ${WX + 4} ${mark75Y} L ${WX + WW - 4} ${mark75Y}`}
          stroke={markCol} strokeWidth={1} strokeDasharray="4 5" />
        {/* Small % labels on the right edge of the window */}
        {/* (omitted to keep UI clean — dashes are enough) */}

        {/* ── SECOND WAVE (motor-on only, behind main wave) ────────────────── */}
        {connected && fillPct > 0 && wave2Path !== '' && (
          <Path d={wave2Path} fill="url(#wt_wave2)" clipPath="url(#wt_win)" />
        )}

        {/* ── MAIN WATER FILL ───────────────────────────────────────────────── */}
        {connected && fillPct > 0 && wavePath !== '' && (
          <Path d={wavePath} fill="url(#wt_water)" clipPath="url(#wt_win)" />
        )}
        {/* Static fill for disconnected last-known display (no waves) */}
        {!connected && fillPct > 0 && (
          <Rect x={WX} y={surfaceY} width={WW} height={fillH} rx={2}
            fill="url(#wt_water)" opacity={0.65} clipPath="url(#wt_win)" />
        )}

        {/* ── SURFACE SHEEN ─────────────────────────────────────────────────── */}
        {fillPct > 0 && (
          <Rect x={WX} y={surfaceY} width={WW} height={Math.min(28, fillH * 0.4)}
            rx={4} fill="url(#wt_sheen)" clipPath="url(#wt_win)" />
        )}

        {/* ── RIPPLES ──────────────────────────────────────────────────────── */}
        {ripples.map(r => (
          <Ellipse key={r.id}
            cx={r.x} cy={r.y}
            rx={r.maxRadius * r.progress} ry={r.maxRadius * r.progress * 0.32}
            fill="none" stroke={C_SPLASH} strokeWidth={1.2}
            opacity={(1 - r.progress) * 0.55}
            clipPath="url(#wt_win)" />
        ))}

        {/* ── POUR STREAM ───────────────────────────────────────────────────── */}
        {pourPath !== '' && (
          <>
            <Path d={pourPath} stroke="url(#wt_pour)" strokeWidth={5}
              strokeLinecap="round" fill="none" opacity={pourFlicker}
              clipPath="url(#wt_win)" />
            <Path d={pourPath} stroke="#AAEEFF" strokeWidth={1.5}
              strokeLinecap="round" fill="none" opacity={pourFlicker * 0.55}
              clipPath="url(#wt_win)" />
          </>
        )}

        {/* ── SPLASH DROPLETS ───────────────────────────────────────────────── */}
        {droplets.map(d => {
          const lr = d.life / d.maxLife;
          const op = lr < 0.3 ? lr / 0.3 : 1 - (lr - 0.3) / 0.7;
          return (
            <Circle key={d.id} cx={d.x} cy={d.y}
              r={d.size * (1 - lr * 0.4)}
              fill={C_SPLASH} opacity={op * 0.85}
              clipPath="url(#wt_win)" />
          );
        })}

        {/* ── WARNING / MOTOR-GLOW TINT OVERLAY ───────────────────────────── */}
        {tintOpacity > 0 && (
          <Rect x={WX} y={WY} width={WW} height={WH} rx={WRX}
            fill={tintColor} opacity={tintOpacity} clipPath="url(#wt_win)" />
        )}

        {/* ── WINDOW GLASS FRAME ───────────────────────────────────────────── */}
        {/* Drawn after water so it sits on top — creates the bezel look */}
        <Rect x={WX} y={WY} width={WW} height={WH} rx={WRX}
          fill="none" stroke={winBorder} strokeWidth={2.5} />
        {/* Inner top highlight on the glass bezel */}
        <Rect x={WX + 3} y={WY + 3} width={WW - 6} height={8} rx={WRX - 2}
          fill={rimHighlight} clipPath="url(#wt_win)" />

        {/* ── PIPE TUBE (connects pipe cap to tank body top) ────────────────── */}
        <Rect x={TUBE_X} y={BY - 4} width={TUBE_W} height={10} rx={3}
          fill="url(#wt_pipe)" />

        {/* ── PIPE CAP ─────────────────────────────────────────────────────── */}
        <Rect x={PIPE_X} y={PIPE_TOP} width={PIPE_W} height={PIPE_H} rx={PIPE_RX}
          fill="url(#wt_pipe)" />
        <Rect x={PIPE_X} y={PIPE_TOP} width={PIPE_W} height={PIPE_H} rx={PIPE_RX}
          fill="none" stroke={borderCol} strokeWidth={1} />
        {/* Pipe cap top highlight */}
        <Rect x={PIPE_X + 3} y={PIPE_TOP + 2} width={PIPE_W - 6} height={5} rx={PIPE_RX - 2}
          fill={rimHighlight} />
        {/* Small pipe opening indicator (when motor on) */}
        {motorOn && connected && (
          <Circle cx={PIPE_X + PIPE_W / 2} cy={PIPE_TOP + PIPE_H - 3} r={3}
            fill={C_POUR} opacity={pourFlicker * 0.8} />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width:  SVG_W,
    height: SVG_H,
  },
});
