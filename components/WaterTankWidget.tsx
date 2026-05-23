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
  Circle,
  RadialGradient,
} from 'react-native-svg';

interface WaterTankWidgetProps {
  pct: number;
  connected: boolean;
  motorOn?: boolean;
  animated?: boolean;
}

interface Droplet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  progress: number;
  maxRadius: number;
}

// ─── Canvas ────────────────────────────────────────────────────────────────
const W = 320;
const H = 310;

// ─── Tank body ─────────────────────────────────────────────────────────────
const BX  = 38;
const BY  = 40;
const BW  = 244;
const BH  = 248;
const BRX = 16;
const BCX = BX + BW / 2; // 160

// ─── Stepped lid ───────────────────────────────────────────────────────────
const LID0_CY = BY;         const LID0_RX = 124; const LID0_RY = 11;
const LID1_CY = BY - 13;    const LID1_RX = 92;  const LID1_RY = 10;
const LID2_CY = BY - 24;    const LID2_RX = 56;  const LID2_RY = 9;

// ─── Inlet pipe (LEFT side) ─────────────────────────────────────────────────
const PIPE_CY = BY + 4;
const PIPE_H  = 16;
const PIPE_X1 = 0;
const PIPE_X2 = BX;

// ─── Cutaway window ─────────────────────────────────────────────────────────
const CX  = 62;
const CY  = 68;
const CW  = 196;
const CH  = 184;
const CRX = 20;

// ─── Ribs ───────────────────────────────────────────────────────────────────
const RIB_Y = [
  BY + Math.round(0.09 * BH),
  BY + Math.round(0.31 * BH),
  BY + Math.round(0.77 * BH),
  BY + Math.round(0.94 * BH),
];

// ─── Colors ─────────────────────────────────────────────────────────────────
const C_GLOW    = '#60C8E8';
const C_INNER   = '#040B12';
const C_PIPE    = '#C8D8E8';
const C_PIPE_DK = '#8FAABF';
const C_RIB_DK  = '#080F18';
const C_RIB_HL  = '#3A5068';
const C_WATER_T = '#3DA8D0';
const C_WATER_B = '#143E5A';
const C_POUR    = '#5CC8F0';
const C_SPLASH  = '#7FD8F8';

function buildWavePath(surfaceY: number, phase: number, amp: number): string {
  const step = 6;
  const freq = 0.040;
  let d = `M ${CX} ${surfaceY}`;
  for (let x = 0; x <= CW; x += step) {
    const wy = surfaceY + Math.sin(x * freq + phase) * amp;
    d += ` L ${CX + x} ${wy}`;
  }
  d += ` L ${CX + CW} ${CY + CH} L ${CX} ${CY + CH} Z`;
  return d;
}

function buildSecondWavePath(surfaceY: number, phase: number, amp: number): string {
  const step = 6;
  const freq = 0.055;
  let d = `M ${CX} ${surfaceY + 3}`;
  for (let x = 0; x <= CW; x += step) {
    const wy = surfaceY + 3 + Math.sin(x * freq + phase + 1.8) * amp * 0.6;
    d += ` L ${CX + x} ${wy}`;
  }
  d += ` L ${CX + CW} ${CY + CH} L ${CX} ${CY + CH} Z`;
  return d;
}

let dropletIdCounter = 0;
let rippleIdCounter = 0;

function spawnDroplet(surfaceY: number): Droplet {
  // Spawn near the inlet pipe area (top-left of cutaway)
  const splashX = CX + 8 + Math.random() * 34;
  return {
    id: dropletIdCounter++,
    x: splashX,
    y: surfaceY - 2,
    vx: (Math.random() - 0.4) * 2.2,
    vy: -(1.8 + Math.random() * 2.2),
    life: 0,
    maxLife: 14 + Math.floor(Math.random() * 10),
    size: 1.0 + Math.random() * 1.8,
  };
}

function spawnRipple(surfaceY: number, nearInlet: boolean): Ripple {
  // Motor ON: ripples near inlet. Motor OFF: quiet central ripples
  const rx = nearInlet
    ? CX + 10 + Math.random() * 40
    : CX + 40 + Math.random() * (CW - 80);
  return {
    id: rippleIdCounter++,
    x: rx,
    y: surfaceY - 2,
    progress: 0,
    maxRadius: nearInlet ? 10 + Math.random() * 14 : 8 + Math.random() * 10,
  };
}

export function WaterTankWidget({
  pct,
  connected,
  motorOn = false,
  animated = true,
}: WaterTankWidgetProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const [fillPct, setFillPct]   = useState(animated ? 0 : clamped);
  const [wavePhase, setWavePhase] = useState(0);
  const [droplets, setDroplets]  = useState<Droplet[]>([]);
  const [ripples, setRipples]    = useState<Ripple[]>([]);
  const [pourFlicker, setPourFlicker] = useState(1.0);
  const fillRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef  = useRef(0);

  // ── Animate fill on mount / pct change ──
  useEffect(() => {
    if (!animated) { setFillPct(clamped); return; }
    const from = fillPct;
    const steps = 40;
    const ms = 800 / steps;
    let i = 0;
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

  // ── Main animation loop ──
  useEffect(() => {
    if (!connected || clamped <= 0) {
      if (animRef.current) clearInterval(animRef.current);
      setDroplets([]);
      setRipples([]);
      return;
    }

    const waveStep = motorOn ? 0.10 : 0.030;
    const ms = motorOn ? 40 : 80;
    let frame = 0;

    if (animRef.current) clearInterval(animRef.current);
    animRef.current = setInterval(() => {
      frame++;
      frameRef.current = frame;

      setWavePhase(p => p + waveStep);
      setPourFlicker(0.7 + Math.random() * 0.3);

      if (motorOn) {
        setDroplets(prev => {
          const aged = prev
            .map(d => ({
              ...d,
              x: d.x + d.vx,
              y: d.y + d.vy,
              vy: d.vy + 0.30,
              life: d.life + 1,
            }))
            .filter(d => d.life < d.maxLife);

          const innerBottom = CY + CH;
          const fillH = (fillPct / 100) * CH;
          const sy = innerBottom - fillH;
          if (frame % 4 === 0 && aged.length < 12) {
            return [...aged, spawnDroplet(sy)];
          }
          return aged;
        });

        setRipples(prev => {
          const advanced = prev
            .map(r => ({ ...r, progress: r.progress + 0.035 }))
            .filter(r => r.progress < 1);
          if (frame % 16 === 0) {
            const innerBottom = CY + CH;
            const fillH = (fillPct / 100) * CH;
            const sy = innerBottom - fillH;
            return [...advanced, spawnRipple(sy, true)];
          }
          return advanced;
        });
      } else {
        setDroplets([]);
        // Motor OFF: occasional quiet ripple from center area
        setRipples(prev => {
          const advanced = prev
            .map(r => ({ ...r, progress: r.progress + 0.018 }))
            .filter(r => r.progress < 1);
          if (frame % 80 === 0 && clamped > 0) {
            const innerBottom = CY + CH;
            const fillH = (fillPct / 100) * CH;
            const sy = innerBottom - fillH;
            return [...advanced, spawnRipple(sy, false)];
          }
          return advanced;
        });
      }
    }, ms);

    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [connected, motorOn, clamped, fillPct]);

  const innerBottom = CY + CH;
  const fillH       = (fillPct / 100) * CH;
  const surfaceY    = innerBottom - fillH;
  const waveAmp     = motorOn ? 2.0 : 0.7;

  const wavePath  = connected && fillPct > 0 ? buildWavePath(surfaceY, wavePhase, waveAmp) : '';
  const wave2Path = connected && fillPct > 0 && motorOn
    ? buildSecondWavePath(surfaceY, wavePhase, waveAmp) : '';

  // Pour stream cubic bezier: pipe exit → water surface splash point
  const pourEndX = CX + 22;
  const pourEndY = surfaceY + 2;
  const pourPath = motorOn && connected && fillPct > 0
    ? `M ${PIPE_X2 + 4} ${PIPE_CY + 3} C ${PIPE_X2 + 18} ${PIPE_CY + 38}, ${pourEndX + 8} ${pourEndY - 22}, ${pourEndX} ${pourEndY}`
    : '';

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="wtBody" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"    stopColor="#2C3A47" />
            <Stop offset="0.18" stopColor="#3D5060" />
            <Stop offset="0.40" stopColor="#28383E" />
            <Stop offset="0.68" stopColor="#18222C" />
            <Stop offset="1"    stopColor="#0C1018" />
          </LinearGradient>

          <LinearGradient id="wtLid0" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"   stopColor="#3C4E60" />
            <Stop offset="0.5" stopColor="#2C3A4C" />
            <Stop offset="1"   stopColor="#1A2535" />
          </LinearGradient>
          <LinearGradient id="wtLid1" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"   stopColor="#364655" />
            <Stop offset="0.5" stopColor="#263444" />
            <Stop offset="1"   stopColor="#141F2D" />
          </LinearGradient>
          <LinearGradient id="wtLid2" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"   stopColor="#2E3C4A" />
            <Stop offset="0.5" stopColor="#1E2C3A" />
            <Stop offset="1"   stopColor="#0E1820" />
          </LinearGradient>

          <LinearGradient id="wtWater" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor={C_WATER_T} stopOpacity={0.95} />
            <Stop offset="0.45" stopColor="#2080A8" />
            <Stop offset="1"    stopColor={C_WATER_B} />
          </LinearGradient>

          <LinearGradient id="wtWater2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#6FD0F0" stopOpacity={0.55} />
            <Stop offset="1"   stopColor={C_WATER_T}  stopOpacity={0.0} />
          </LinearGradient>

          <LinearGradient id="wtSheen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#FFFFFF" stopOpacity={0.22} />
            <Stop offset="1"   stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>

          <LinearGradient id="wtPipe" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor="#DCEEF8" />
            <Stop offset="0.45" stopColor={C_PIPE} />
            <Stop offset="1"    stopColor={C_PIPE_DK} />
          </LinearGradient>

          <LinearGradient id="wtPour" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor={C_POUR} stopOpacity={0.9} />
            <Stop offset="1"   stopColor={C_WATER_T} stopOpacity={0.6} />
          </LinearGradient>

          <RadialGradient id="wtGlowLeft" cx="0" cy="0.5" r="1" fx="0" fy="0.5">
            <Stop offset="0"   stopColor={C_GLOW} stopOpacity={0.35} />
            <Stop offset="1"   stopColor={C_GLOW} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="wtGlowRight" cx="1" cy="0.5" r="1" fx="1" fy="0.5">
            <Stop offset="0"   stopColor={C_GLOW} stopOpacity={0.28} />
            <Stop offset="1"   stopColor={C_GLOW} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="wtGlowBase" cx="0.5" cy="0" r="1" fx="0.5" fy="0">
            <Stop offset="0"   stopColor={C_GLOW} stopOpacity={0.40} />
            <Stop offset="1"   stopColor={C_GLOW} stopOpacity={0} />
          </RadialGradient>

          <ClipPath id="cutClip">
            <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} />
          </ClipPath>
          <ClipPath id="bodyClip">
            <Rect x={BX} y={BY} width={BW} height={BH} rx={BRX} />
          </ClipPath>
          <Mask id="ribMask">
            <Rect x="0" y="0" width={W} height={H} fill="white" />
            <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} fill="black" />
          </Mask>
        </Defs>

        {/* ── AMBIENT GLOW ── */}
        <Ellipse cx={BX - 4} cy={BY + BH * 0.5} rx={36} ry={BH * 0.42}
          fill="url(#wtGlowLeft)" />
        <Ellipse cx={BX + BW + 4} cy={BY + BH * 0.5} rx={36} ry={BH * 0.42}
          fill="url(#wtGlowRight)" />
        <Ellipse cx={BCX} cy={BY + BH + 12} rx={130} ry={22}
          fill="url(#wtGlowBase)" />

        {/* ── TANK BODY ── */}
        <Rect x={BX} y={BY} width={BW} height={BH} rx={BRX} fill="url(#wtBody)" />

        {/* Left specular highlight */}
        <Rect x={BX + 2} y={BY + 4} width={32} height={BH - 8} rx={12}
          fill="#4A6890" opacity={0.16} clipPath="url(#bodyClip)" />

        {/* ── CUTAWAY INTERIOR ── */}
        <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} fill={C_INNER} />

        {/* Top inset shadow */}
        <Rect x={CX} y={CY} width={CW} height={36} rx={CRX}
          fill="#000" opacity={0.55} clipPath="url(#cutClip)" />

        {/* ── WATER (second wave behind) ── */}
        {connected && fillPct > 0 && wave2Path !== '' && (
          <Path d={wave2Path} fill="url(#wtWater2)" clipPath="url(#cutClip)" />
        )}

        {/* ── WATER (main wave) ── */}
        {connected && fillPct > 0 && (
          <Path d={wavePath} fill="url(#wtWater)" clipPath="url(#cutClip)" />
        )}

        {/* Water surface sheen */}
        {connected && fillPct > 0 && (
          <Rect
            x={CX} y={surfaceY}
            width={CW} height={Math.min(32, fillH * 0.40)}
            rx={4}
            fill="url(#wtSheen)"
            clipPath="url(#cutClip)"
          />
        )}

        {/* ── RIPPLES on water surface ── */}
        {ripples.map(r => {
          const radius = r.maxRadius * r.progress;
          const opacity = (1 - r.progress) * 0.55;
          return (
            <Ellipse
              key={r.id}
              cx={r.x}
              cy={r.y}
              rx={radius}
              ry={radius * 0.32}
              fill="none"
              stroke={C_SPLASH}
              strokeWidth={1.2}
              opacity={opacity}
              clipPath="url(#cutClip)"
            />
          );
        })}

        {/* ── POUR STREAM ── */}
        {pourPath !== '' && (
          <>
            {/* Main stream */}
            <Path
              d={pourPath}
              stroke="url(#wtPour)"
              strokeWidth={5.5}
              strokeLinecap="round"
              fill="none"
              opacity={pourFlicker}
            />
            {/* Stream edge highlight */}
            <Path
              d={pourPath}
              stroke="#AAEEFF"
              strokeWidth={1.5}
              strokeLinecap="round"
              fill="none"
              opacity={pourFlicker * 0.55}
            />
          </>
        )}

        {/* ── SPLASH DROPLETS ── */}
        {droplets.map(d => {
          const lifeRatio = d.life / d.maxLife;
          const opacity = lifeRatio < 0.3
            ? lifeRatio / 0.3
            : 1 - (lifeRatio - 0.3) / 0.7;
          return (
            <Circle
              key={d.id}
              cx={d.x}
              cy={d.y}
              r={d.size * (1 - lifeRatio * 0.4)}
              fill={C_SPLASH}
              opacity={opacity * 0.85}
              clipPath="url(#cutClip)"
            />
          );
        })}

        {/* ── RIBS ── */}
        <G mask="url(#ribMask)">
          {RIB_Y.map((ry, i) => (
            <G key={i}>
              <Rect x={BX + 2} y={ry - 3} width={BW - 4} height={2}
                fill={C_RIB_HL} opacity={0.30} />
              <Rect x={BX + 2} y={ry - 1} width={BW - 4} height={5}
                fill={C_RIB_DK} opacity={0.78} />
            </G>
          ))}
        </G>

        {/* Body outline */}
        <Rect x={BX} y={BY} width={BW} height={BH} rx={BRX}
          fill="none" stroke="#080E18" strokeWidth={1.8} />

        {/* Cutaway border */}
        <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX}
          fill="none" stroke="#050C14" strokeWidth={3} />

        {/* Cutaway inner bevel */}
        <Rect x={CX + 2} y={CY + 2} width={CW - 4} height={CH - 4} rx={CRX - 2}
          fill="none" stroke="#1A2A3A" strokeWidth={1.2} opacity={0.60} />

        {/* ── STEPPED LID ── */}
        <Ellipse cx={BCX} cy={LID0_CY} rx={LID0_RX} ry={LID0_RY} fill="url(#wtLid0)" />
        <Ellipse cx={BCX} cy={LID0_CY} rx={LID0_RX} ry={LID0_RY}
          fill="none" stroke="#080E18" strokeWidth={1.4} />
        <Ellipse cx={BCX} cy={LID1_CY} rx={LID1_RX} ry={LID1_RY} fill="url(#wtLid1)" />
        <Ellipse cx={BCX} cy={LID1_CY} rx={LID1_RX} ry={LID1_RY}
          fill="none" stroke="#080E18" strokeWidth={1.1} />
        <Ellipse cx={BCX} cy={LID2_CY} rx={LID2_RX} ry={LID2_RY} fill="url(#wtLid2)" />
        <Ellipse cx={BCX} cy={LID2_CY} rx={LID2_RX} ry={LID2_RY}
          fill="none" stroke="#080E18" strokeWidth={0.9} />

        {/* ── INLET PIPE ── */}
        <Rect
          x={PIPE_X1}
          y={PIPE_CY - PIPE_H / 2}
          width={PIPE_X2 - PIPE_X1 + 12}
          height={PIPE_H}
          rx={PIPE_H / 2}
          fill="url(#wtPipe)"
        />
        <Rect
          x={PIPE_X2 - 2}
          y={PIPE_CY - PIPE_H / 2 - 5}
          width={14}
          height={PIPE_H + 10}
          rx={3}
          fill={C_PIPE_DK}
        />
        <Ellipse cx={PIPE_X1 + 3} cy={PIPE_CY} rx={3} ry={PIPE_H / 2 - 1} fill={C_PIPE_DK} />
      </Svg>
    </View>
  );
}
