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

// ─── Canvas ───────────────────────────────────────────────────────────────────
const W = 300;
const H = 290;

// ─── Tank body ────────────────────────────────────────────────────────────────
const BX  = 46;          // body left x
const BY  = 38;          // body top y (lid sits above)
const BW  = 218;         // body width
const BH  = 240;         // body height
const BRX = 14;          // corner radius
const BCX = BX + BW / 2; // center x = 155

// ─── Stepped lid (3 concentric ellipses, lowest → highest) ───────────────────
const LID0_CY = BY;        const LID0_RX = 112; const LID0_RY = 10; // outer flange
const LID1_CY = BY - 12;   const LID1_RX = 84;  const LID1_RY = 9;  // middle tier
const LID2_CY = BY - 22;   const LID2_RX = 50;  const LID2_RY = 8;  // inner cap

// ─── Inlet pipe (LEFT side, horizontal) ──────────────────────────────────────
const PIPE_CY = BY + 2;   // center y at body top
const PIPE_H  = 14;
const PIPE_X1 = 0;
const PIPE_X2 = BX;       // pipe meets body left wall
const FLANGE_W = 10;

// ─── Cutaway window ───────────────────────────────────────────────────────────
const CX  = 71;   // BX + 25
const CY  = 65;   // BY + 27
const CW  = 168;
const CH  = 168;
const CRX = 18;

// ─── Ribs (4 indented rings) ─────────────────────────────────────────────────
// positions: ~8.5%, 30%, 76%, 93% down body
const RIB_Y = [
  BY + Math.round(0.085 * BH),
  BY + Math.round(0.300 * BH),
  BY + Math.round(0.760 * BH),
  BY + Math.round(0.930 * BH),
];
const RIB_H = 5;

// ─── Colors ───────────────────────────────────────────────────────────────────
const C_GLOW    = '#7FD4E8';
const C_INNER   = '#050C13';
const C_PIPE    = '#C8D8E8';
const C_PIPE_DK = '#8FAABF';
const C_RIB_DK  = '#0B141E';
const C_RIB_HL  = '#3D5068';
const C_WATER_T = '#4FA8C9';
const C_WATER_B = '#1B4E6B';

function buildWaveSurface(
  surfaceY: number,
  cx: number,
  cw: number,
  bottomY: number,
  phase: number,
  amp: number,
): string {
  const step = 8;
  const freq = 0.038;
  let d = `M ${cx} ${surfaceY}`;
  for (let x = 0; x <= cw; x += step) {
    const wy = surfaceY + Math.sin(x * freq + phase) * amp;
    d += ` L ${cx + x} ${wy}`;
  }
  d += ` L ${cx + cw} ${bottomY} L ${cx} ${bottomY} Z`;
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

  useEffect(() => {
    if (!connected || clamped <= 0) return;
    const step = motorOn ? 0.09 : 0.028;
    const ms   = motorOn ? 40   : 85;
    if (waveRef.current) clearInterval(waveRef.current);
    waveRef.current = setInterval(() => setWavePhase(p => p + step), ms);
    return () => { if (waveRef.current) clearInterval(waveRef.current); };
  }, [connected, motorOn, clamped]);

  const innerBottom = CY + CH;
  const fillH       = (fillPct / 100) * CH;
  const surfaceY    = innerBottom - fillH;
  const waveAmp     = motorOn ? 4.5 : 2.2;
  const wavePath    = connected && fillPct > 0
    ? buildWaveSurface(surfaceY, CX, CW, innerBottom, wavePhase, waveAmp)
    : '';

  const pourPath = motorOn && connected && fillPct > 0
    ? `M ${PIPE_X2 + 2} ${PIPE_CY + 2} C ${PIPE_X2 + 14} ${PIPE_CY + 32}, ${CX + 16} ${surfaceY - 18}, ${CX + 20} ${surfaceY + 4}`
    : '';

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          {/* Body: horizontal gradient — left lighter (specular) → right darker */}
          <LinearGradient id="wtBody" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"    stopColor="#2C3A47" />
            <Stop offset="0.20" stopColor="#3D4F5E" />
            <Stop offset="0.42" stopColor="#2A3A4A" />
            <Stop offset="0.72" stopColor="#1A222C" />
            <Stop offset="1"    stopColor="#0D1218" />
          </LinearGradient>

          {/* Lid tiers — each slightly lighter than body */}
          <LinearGradient id="wtLid0" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"   stopColor="#3A4C5E" />
            <Stop offset="0.5" stopColor="#2C3A4A" />
            <Stop offset="1"   stopColor="#1A2534" />
          </LinearGradient>
          <LinearGradient id="wtLid1" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"   stopColor="#344455" />
            <Stop offset="0.5" stopColor="#263444" />
            <Stop offset="1"   stopColor="#141F2C" />
          </LinearGradient>
          <LinearGradient id="wtLid2" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"   stopColor="#2C3A48" />
            <Stop offset="0.5" stopColor="#1E2C38" />
            <Stop offset="1"   stopColor="#0E1820" />
          </LinearGradient>

          {/* Water: vertical bright-top → deep-bottom */}
          <LinearGradient id="wtWater" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor={C_WATER_T} stopOpacity={0.95} />
            <Stop offset="1"   stopColor={C_WATER_B} />
          </LinearGradient>

          {/* Water surface sheen */}
          <LinearGradient id="wtSheen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.20} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>

          {/* Pipe: vertical gradient for cylindrical look */}
          <LinearGradient id="wtPipe" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor="#D8EAF5" />
            <Stop offset="0.45" stopColor={C_PIPE} />
            <Stop offset="1"    stopColor={C_PIPE_DK} />
          </LinearGradient>

          {/* Clip water to cutaway */}
          <ClipPath id="cutClip">
            <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} />
          </ClipPath>

          {/* Mask: ribs visible on body, hidden inside cutaway */}
          <Mask id="ribMask">
            <Rect x="0" y="0" width={W} height={H} fill="white" />
            <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} fill="black" />
          </Mask>
        </Defs>

        {/* ── CYAN GLOW (side columns + base) ── */}
        <Ellipse cx={BX - 7} cy={BY + BH * 0.52} rx={16} ry={BH * 0.38} fill={C_GLOW} opacity={0.20} />
        <Ellipse cx={BX + BW + 7} cy={BY + BH * 0.52} rx={16} ry={BH * 0.38} fill={C_GLOW} opacity={0.20} />
        <Ellipse cx={BCX} cy={BY + BH + 15} rx={110} ry={18} fill={C_GLOW} opacity={0.28} />
        <Ellipse cx={BCX} cy={BY + BH + 10} rx={80}  ry={10} fill={C_GLOW} opacity={0.14} />

        {/* ── TANK BODY ── */}
        <Rect x={BX} y={BY} width={BW} height={BH} rx={BRX} fill="url(#wtBody)" />

        {/* Specular edge highlight strip (brightens left-of-center for convex cylinder feel) */}
        <Rect x={BX + 2} y={BY + 2} width={28} height={BH - 4} rx={BRX} fill="#4A6280" opacity={0.18} />

        {/* ── CUTAWAY INTERIOR ── */}
        <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} fill={C_INNER} />

        {/* Top inset shadow */}
        <Rect x={CX} y={CY} width={CW} height={30} rx={CRX} fill="#000" opacity={0.50} clipPath="url(#cutClip)" />

        {/* Water fill */}
        {connected && fillPct > 0 && (
          <Path d={wavePath} fill="url(#wtWater)" clipPath="url(#cutClip)" />
        )}

        {/* Water surface sheen (top band of water) */}
        {connected && fillPct > 0 && (
          <Rect
            x={CX}
            y={surfaceY}
            width={CW}
            height={Math.min(28, fillH * 0.35)}
            rx={4}
            fill="url(#wtSheen)"
            clipPath="url(#cutClip)"
          />
        )}

        {/* Motor-on pour stream */}
        {pourPath !== '' && (
          <Path
            d={pourPath}
            stroke={C_WATER_T}
            strokeWidth={4.5}
            strokeLinecap="round"
            fill="none"
            opacity={0.72}
          />
        )}

        {/* ── RIBS (masked: render on body outer shell only, not cutaway) ── */}
        <G mask="url(#ribMask)">
          {RIB_Y.map((ry, i) => (
            <G key={i}>
              {/* Rib highlight line above (light catches top of indent) */}
              <Rect
                x={BX + 2} y={ry - RIB_H / 2 - 1}
                width={BW - 4} height={2}
                fill={C_RIB_HL}
                opacity={0.28}
              />
              {/* Rib shadow indent */}
              <Rect
                x={BX + 2} y={ry - RIB_H / 2}
                width={BW - 4} height={RIB_H}
                fill={C_RIB_DK}
                opacity={0.72}
              />
            </G>
          ))}
        </G>

        {/* Body outline */}
        <Rect x={BX} y={BY} width={BW} height={BH} rx={BRX} fill="none" stroke="#0A1420" strokeWidth={1.5} />

        {/* Cutaway border — deep shadow line */}
        <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} fill="none" stroke="#060E18" strokeWidth={2.5} />

        {/* Cutaway inner bevel */}
        <Rect
          x={CX + 2} y={CY + 2}
          width={CW - 4} height={CH - 4}
          rx={CRX - 2}
          fill="none"
          stroke="#1A2A3A"
          strokeWidth={1}
          opacity={0.55}
        />

        {/* ── STEPPED LID ── */}
        {/* Outer flange (widest, sits at body top edge) */}
        <Ellipse cx={BCX} cy={LID0_CY} rx={LID0_RX} ry={LID0_RY} fill="url(#wtLid0)" />
        <Ellipse cx={BCX} cy={LID0_CY} rx={LID0_RX} ry={LID0_RY} fill="none" stroke="#0A1420" strokeWidth={1.2} />

        {/* Middle tier */}
        <Ellipse cx={BCX} cy={LID1_CY} rx={LID1_RX} ry={LID1_RY} fill="url(#wtLid1)" />
        <Ellipse cx={BCX} cy={LID1_CY} rx={LID1_RX} ry={LID1_RY} fill="none" stroke="#0A1420" strokeWidth={1.0} />

        {/* Inner cap */}
        <Ellipse cx={BCX} cy={LID2_CY} rx={LID2_RX} ry={LID2_RY} fill="url(#wtLid2)" />
        <Ellipse cx={BCX} cy={LID2_CY} rx={LID2_RX} ry={LID2_RY} fill="none" stroke="#0A1420" strokeWidth={0.8} />

        {/* ── INLET PIPE (LEFT side, horizontal) ── */}
        {/* Pipe body */}
        <Rect
          x={PIPE_X1}
          y={PIPE_CY - PIPE_H / 2}
          width={PIPE_X2 - PIPE_X1 + FLANGE_W}
          height={PIPE_H}
          rx={PIPE_H / 2}
          fill="url(#wtPipe)"
        />
        {/* Flange at tank wall junction */}
        <Rect
          x={PIPE_X2 - 2}
          y={PIPE_CY - PIPE_H / 2 - 4}
          width={FLANGE_W + 2}
          height={PIPE_H + 8}
          rx={3}
          fill={C_PIPE_DK}
        />
        {/* Pipe end cap */}
        <Ellipse
          cx={PIPE_X1 + 3}
          cy={PIPE_CY}
          rx={3}
          ry={PIPE_H / 2 - 1}
          fill={C_PIPE_DK}
        />
      </Svg>
    </View>
  );
}
