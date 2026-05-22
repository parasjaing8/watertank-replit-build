import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  LinearGradient,
  Mask,
  Path,
  Rect,
  Stop,
  G,
} from 'react-native-svg';

interface WaterTankWidgetProps {
  pct: number;
  connected: boolean;
  motorOn?: boolean;
  animated?: boolean;
}

// ─── Canvas ─────────────────────────────────────────────────────────────────
const W = 260;
const H = 300;

// ─── Tank body ──────────────────────────────────────────────────────────────
const BX = 22;   // body x
const BY = 64;   // body y (dome sits above this)
const BW = 216;  // body width
const BH = 210;  // body height
const BRX = 20;  // body corner radius

// ─── Dome cap (overhanging ellipse above body) ───────────────────────────────
const DOME_CX = BX + BW / 2;  // 130
const DOME_CY = BY;            // 64 – sits exactly on top of body
const DOME_RX = BW / 2 + 4;   // 112 – slightly wider than body
const DOME_RY = 18;            // dome height

// ─── Knobs on dome ───────────────────────────────────────────────────────────
const KNOBS = [
  { x: DOME_CX - 38, y: BY - DOME_RY + 2, w: 16, h: 9 },
  { x: DOME_CX - 9,  y: BY - DOME_RY - 2, w: 18, h: 11 },
  { x: DOME_CX + 24, y: BY - DOME_RY + 2, w: 16, h: 9 },
];

// ─── Inlet pipe (LEFT side) ───────────────────────────────────────────────────
const PIPE_Y   = BY + 52;   // ~25% from body top
const PIPE_H   = 14;
const PIPE_X1  = 0;
const PIPE_X2  = BX + 2;    // just inside tank left edge

// ─── Cutaway window ───────────────────────────────────────────────────────────
const CX  = BX + 26;        // 48
const CY  = BY + 30;        // 94
const CW  = BW - 52;        // 164
const CH  = BH - 68;        // 142
const CRX = 10;

// ─── Rib positions ────────────────────────────────────────────────────────────
const RIBS = [0.22, 0.44, 0.66, 0.88].map(f => BY + f * BH);
const RIB_H = 6;

// ─── Colors (tank is always dark navy regardless of app theme) ────────────────
const C_DOME       = '#1A2B44';
const C_DOME_DARK  = '#0E1A2D';
const C_INNER      = '#090F1C';
const C_PIPE       = '#C5D4E6';
const C_PIPE_DARK  = '#8FA3BA';
const C_RIB        = '#0C1826';
const C_WATER_TOP  = '#3A80D2';
const C_WATER_BOT  = '#1A4D8A';
const C_GLOW       = '#6AAEE8';

function buildWaveSurface(
  surfaceY: number,
  cx: number,
  cw: number,
  cbottomY: number,
  phase: number,
  amp: number,
): string {
  const step = 10;
  const freq = 0.040;
  let d = `M ${cx} ${surfaceY}`;
  for (let x = 0; x <= cw; x += step) {
    const wx = cx + x;
    const wy = surfaceY + Math.sin(x * freq + phase) * amp;
    d += ` L ${wx} ${wy}`;
  }
  d += ` L ${cx + cw} ${cbottomY} L ${cx} ${cbottomY} Z`;
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
  const fillRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fill animation
  useEffect(() => {
    if (!animated) { setFillPct(clamped); return; }
    const from = fillPct;
    const steps = 30;
    const ms = 600 / steps;
    let i = 0;
    if (fillRef.current) clearInterval(fillRef.current);
    fillRef.current = setInterval(() => {
      i++;
      setFillPct(from + (clamped - from) * (i / steps));
      if (i >= steps) { clearInterval(fillRef.current!); fillRef.current = null; }
    }, ms);
    return () => { if (fillRef.current) clearInterval(fillRef.current); };
  }, [clamped]);

  // Wave animation (no Reanimated – plain setInterval)
  useEffect(() => {
    if (!connected || clamped <= 0) { return; }
    const step = motorOn ? 0.09 : 0.030;
    const ms   = motorOn ? 45   : 90;
    if (waveRef.current) clearInterval(waveRef.current);
    waveRef.current = setInterval(() => setWavePhase(p => p + step), ms);
    return () => { if (waveRef.current) clearInterval(waveRef.current); };
  }, [connected, motorOn, clamped]);

  const innerBottom = CY + CH;
  const fillH       = (fillPct / 100) * CH;
  const surfaceY    = innerBottom - fillH;
  const waveAmp     = motorOn ? 4.5 : 2;
  const wavePath    = connected && fillPct > 0
    ? buildWaveSurface(surfaceY, CX, CW, innerBottom, wavePhase, waveAmp)
    : '';

  // Motor-on: water pour arc from pipe outlet into water
  const pipeOutletX = PIPE_X2 + 4;
  const pipeOutletY = PIPE_Y + PIPE_H / 2;
  const pourPath = motorOn && connected && fillPct > 0
    ? `M ${pipeOutletX} ${pipeOutletY} C ${pipeOutletX + 10} ${pipeOutletY + 30}, ${CX + 20} ${surfaceY - 20}, ${CX + 24} ${surfaceY + 6}`
    : '';

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          {/* ── Gradients ── */}

          {/* Body: horizontal left-lighter → right-darker (3D cylinder illusion) */}
          <LinearGradient id="wtBody" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"    stopColor="#2C4060" />
            <Stop offset="0.35" stopColor="#1C2E48" />
            <Stop offset="0.65" stopColor="#152238" />
            <Stop offset="1"    stopColor="#0A1520" />
          </LinearGradient>

          {/* Dome: slightly lighter than body */}
          <LinearGradient id="wtDome" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"    stopColor="#304870" />
            <Stop offset="0.4"  stopColor="#1E3050" />
            <Stop offset="1"    stopColor="#0C1828" />
          </LinearGradient>

          {/* Water: vertical bright-top → deep-bottom */}
          <LinearGradient id="wtWater" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor={C_WATER_TOP} />
            <Stop offset="1"   stopColor={C_WATER_BOT} />
          </LinearGradient>

          {/* Pipe gradient: top-light → bottom-dark for cylindrical pipe look */}
          <LinearGradient id="wtPipe" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#D8E8F4" />
            <Stop offset="0.5" stopColor={C_PIPE} />
            <Stop offset="1"   stopColor={C_PIPE_DARK} />
          </LinearGradient>

          {/* ── ClipPath: water stays inside cutaway only ── */}
          <ClipPath id="cutClip">
            <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} />
          </ClipPath>

          {/* ── Mask: ribs render on body ONLY, not inside cutaway ── */}
          <Mask id="ribMask">
            <Rect x="0" y="0" width={W} height={H} fill="white" />
            <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} fill="black" />
          </Mask>
        </Defs>

        {/* ── Floor glow (behind tank) ── */}
        <Ellipse cx={BX + BW / 2} cy={BY + BH + 22} rx={118} ry={22} fill={C_GLOW} opacity={0.18} />
        <Ellipse cx={BX + BW / 2} cy={BY + BH + 18} rx={88}  ry={14} fill={C_GLOW} opacity={0.10} />

        {/* ── TANK BODY ── */}
        <Rect x={BX} y={BY} width={BW} height={BH} rx={BRX} fill="url(#wtBody)" />

        {/* Left-edge highlight strip (brightens left for cylindrical feel) */}
        <Rect x={BX} y={BY} width={22} height={BH} rx={BRX} fill="#3A5880" opacity={0.25} />

        {/* ── CUTAWAY INTERIOR (behind ribs) ── */}
        {/* Dark inner background */}
        <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} fill={C_INNER} />

        {/* Inset shadow at cutaway top edge */}
        <Rect x={CX} y={CY} width={CW} height={28} rx={CRX} fill="#000" opacity={0.35} clipPath="url(#cutClip)" />

        {/* Water fill — clipped to cutaway */}
        {connected && fillPct > 0 && (
          <Path d={wavePath} fill="url(#wtWater)" clipPath="url(#cutClip)" />
        )}

        {/* Water pour stream when motor on */}
        {pourPath !== '' && (
          <Path
            d={pourPath}
            stroke={C_WATER_TOP}
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
            opacity={0.65}
            clipPath="url(#cutClip)"
          />
        )}

        {/* ── RIBS (masked: do NOT render inside cutaway) ── */}
        <G mask="url(#ribMask)">
          {RIBS.map((ry, i) => (
            <Rect
              key={i}
              x={BX}
              y={ry - RIB_H / 2}
              width={BW}
              height={RIB_H}
              fill={C_RIB}
              opacity={0.55}
            />
          ))}
        </G>

        {/* Body outline (drawn on top so border is crisp) */}
        <Rect x={BX} y={BY} width={BW} height={BH} rx={BRX} fill="none" stroke={C_DOME_DARK} strokeWidth={1.5} />

        {/* Cutaway border */}
        <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} fill="none" stroke="#0A1520" strokeWidth={2} />

        {/* ── DOME CAP ── */}
        {/* Full ellipse — the bottom half overlaps the body top, which hides it naturally */}
        <Ellipse cx={DOME_CX} cy={DOME_CY} rx={DOME_RX} ry={DOME_RY} fill="url(#wtDome)" />
        {/* Dome shoulder seam */}
        <Ellipse cx={DOME_CX} cy={DOME_CY} rx={DOME_RX} ry={DOME_RY} fill="none" stroke={C_DOME_DARK} strokeWidth={1.2} />

        {/* ── KNOBS on dome ── */}
        {KNOBS.map((k, i) => (
          <Rect
            key={i}
            x={k.x}
            y={k.y}
            width={k.w}
            height={k.h}
            rx={3}
            fill={C_DOME_DARK}
            stroke="#0A1520"
            strokeWidth={1}
          />
        ))}

        {/* ── INLET PIPE (LEFT side) ── */}
        {/* Pipe body */}
        <Rect
          x={PIPE_X1}
          y={PIPE_Y}
          width={PIPE_X2 - PIPE_X1 + 6}
          height={PIPE_H}
          rx={PIPE_H / 2}
          fill="url(#wtPipe)"
        />
        {/* Flange/connector where pipe meets tank wall */}
        <Rect
          x={PIPE_X2 - 2}
          y={PIPE_Y - 4}
          width={8}
          height={PIPE_H + 8}
          rx={3}
          fill={C_PIPE_DARK}
        />
      </Svg>
    </View>
  );
}
