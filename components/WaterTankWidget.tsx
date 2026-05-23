import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
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

import { useColors } from '@/hooks/useColors';
import { TANK_LOW_PCT } from '@/constants/thresholds';

// ─────────────────────────────────────────────────────────────────────────────
//  PNG-OVERLAY WATER TANK WIDGET
//
//  Rendering: water SVG positioned at the exact display-pixel coords of each
//  PNG's transparent cutout, then the PNG overlaid on top. No scaling chains.
//
//  Raw PNG measurements (both PNGs are 1024 × 1536 RGBA):
//
//    tank-shell.png (black):  window x=256, y=545, w=516, h=556
//    blue-tank.png  (blue):   window x=287, y=513, w=425, h=415
//
//  Display size: IMG_W=280, IMG_H=420  (scale = 280/1024 = 35/128 ≈ 0.273)
//  All window coords = Math.round(rawPx × 280/1024).
// ─────────────────────────────────────────────────────────────────────────────

const IMG_W = 280;
const IMG_H = 420;   // 1536 × (280/1024) = 420.0  (exact)

// Window coordinates per tank variant — do NOT change without re-measuring
const TANK_WINDOWS = {
  black: { WX: 70,  WY: 149, WW: 141, WH: 152, RX: 7  },
  //        256×k   545×k    516×k    556×k
  blue:  { WX: 78,  WY: 140, WW: 116, WH: 114, RX: 10 },
  //        287×k   513×k    425×k    415×k
} as const;

// Water colours
const C_WATER_T = '#3DA8D0';
const C_WATER_B = '#0F3A56';
const C_POUR    = '#5CC8F0';
const C_SPLASH  = '#7FD8F8';
const C_SHEEN   = '#FFFFFF';

// ─── Wave builders (all coords in window-local space 0..ww, 0..wh) ──────────
function buildWavePath(surfaceY: number, phase: number, amp: number, ww: number, wh: number): string {
  const freq = 0.060; const step = 4;
  let d = `M 0 ${surfaceY}`;
  for (let x = 0; x <= ww; x += step) {
    d += ` L ${x} ${surfaceY + Math.sin(x * freq + phase) * amp}`;
  }
  return d + ` L ${ww} ${wh} L 0 ${wh} Z`;
}

function buildWave2Path(surfaceY: number, phase: number, amp: number, ww: number, wh: number): string {
  const freq = 0.075; const step = 4;
  let d = `M 0 ${surfaceY + 3}`;
  for (let x = 0; x <= ww; x += step) {
    d += ` L ${x} ${surfaceY + 3 + Math.sin(x * freq + phase + 1.8) * amp * 0.55}`;
  }
  return d + ` L ${ww} ${wh} L 0 ${wh} Z`;
}

// ─── Particle types ───────────────────────────────────────────────────────────
interface Droplet {
  id: number; x: number; y: number;
  vx: number; vy: number; life: number; maxLife: number; size: number;
}
interface Ripple {
  id: number; x: number; y: number; progress: number; maxRadius: number;
}

let _dropId   = 0;
let _rippleId = 0;

function spawnDroplet(surfaceY: number, ww: number): Droplet {
  return {
    id: _dropId++,
    x: 2 + Math.random() * ww * 0.25,
    y: surfaceY - 2,
    vx: (Math.random() - 0.3) * 1.8,
    vy: -(1.4 + Math.random() * 1.8),
    life: 0, maxLife: 14 + Math.floor(Math.random() * 10),
    size: 1.0 + Math.random() * 1.6,
  };
}

function spawnRipple(surfaceY: number, nearInlet: boolean, ww: number): Ripple {
  return {
    id: _rippleId++,
    x: nearInlet
      ? ww * 0.05 + Math.random() * ww * 0.30
      : ww * 0.20 + Math.random() * ww * 0.60,
    y: surfaceY - 2,
    progress: 0,
    maxRadius: nearInlet ? 10 + Math.random() * 12 : 7 + Math.random() * 9,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
interface WaterTankWidgetProps {
  pct:        number;
  connected:  boolean;
  motorOn?:   boolean;
  animated?:  boolean;
  tankColor?: 'black' | 'blue';
}

export function WaterTankWidget({
  pct,
  connected,
  motorOn   = false,
  animated  = true,
  tankColor = 'black',
}: WaterTankWidgetProps) {
  const colors = useColors();
  const win    = TANK_WINDOWS[tankColor === 'blue' ? 'blue' : 'black'];
  const { WX, WY, WW, WH, RX } = win;

  const clamped    = Math.max(0, Math.min(100, pct));
  const isLow      = clamped > 0 && clamped < TANK_LOW_PCT;
  const isCritical = clamped > 0 && clamped < 10;

  const [fillPct,     setFillPct]     = useState(animated ? 0 : clamped);
  const [wavePhase,   setWavePhase]   = useState(0);
  const [droplets,    setDroplets]    = useState<Droplet[]>([]);
  const [ripples,     setRipples]     = useState<Ripple[]>([]);
  const [pourFlicker, setPourFlicker] = useState(1.0);

  const fillRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const fillPctRef = useRef(fillPct);
  fillPctRef.current = fillPct;

  // Reset animation when tank variant changes
  useEffect(() => {
    setDroplets([]);
    setRipples([]);
    setWavePhase(0);
  }, [tankColor]);

  // ── Animate fill on mount / pct change ──────────────────────────────────────
  useEffect(() => {
    if (!animated) { setFillPct(clamped); return; }
    const from = fillPctRef.current; const steps = 40; const ms = 800 / steps; let i = 0;
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
      setPourFlicker(0.72 + Math.random() * 0.28);
      if (motorOn) {
        setDroplets(prev => {
          const surfaceY = WH - (fillPctRef.current / 100) * WH;
          const aged = prev
            .map(d => ({ ...d, x: d.x + d.vx, y: d.y + d.vy, vy: d.vy + 0.28, life: d.life + 1 }))
            .filter(d => d.life < d.maxLife);
          return frame % 4 === 0 && aged.length < 12 ? [...aged, spawnDroplet(surfaceY, WW)] : aged;
        });
        setRipples(prev => {
          const surfaceY = WH - (fillPctRef.current / 100) * WH;
          const advanced = prev.map(r => ({ ...r, progress: r.progress + 0.035 })).filter(r => r.progress < 1);
          return frame % 16 === 0 ? [...advanced, spawnRipple(surfaceY, true, WW)] : advanced;
        });
      } else {
        setDroplets([]);
        setRipples(prev => {
          const surfaceY = WH - (fillPctRef.current / 100) * WH;
          const advanced = prev.map(r => ({ ...r, progress: r.progress + 0.018 })).filter(r => r.progress < 1);
          return frame % 80 === 0 && clamped > 0 ? [...advanced, spawnRipple(surfaceY, false, WW)] : advanced;
        });
      }
    }, ms);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [connected, motorOn, clamped, WW, WH]);

  // ── Derived geometry (window-local coords: 0..WW, 0..WH) ────────────────────
  const fillH    = (fillPct / 100) * WH;
  const surfaceY = WH - fillH;
  const waveAmp  = motorOn ? 2.0 : 0.7;

  const wavePath  = connected && fillPct > 0 ? buildWavePath(surfaceY, wavePhase, waveAmp, WW, WH)              : '';
  const wave2Path = connected && fillPct > 0 && motorOn ? buildWave2Path(surfaceY, wavePhase, waveAmp, WW, WH)  : '';

  // Pour stream: inlet from left side, curves down to water surface
  const POUR_ENTRY_Y = WH * 0.40;
  const pourPath = motorOn && connected && fillPct > 0 && surfaceY < POUR_ENTRY_Y
    ? `M 2 ${POUR_ENTRY_Y} C 22 ${POUR_ENTRY_Y + 18}, ${WW * 0.18} ${surfaceY + 20}, ${WW * 0.22} ${surfaceY + 2}`
    : '';

  // Status tint inside window
  let tintColor   = 'transparent';
  let tintOpacity = 0;
  if (isCritical)                { tintColor = colors.destructive; tintOpacity = 0.22; }
  else if (isLow)                { tintColor = colors.warning;     tintOpacity = 0.14; }
  else if (motorOn && connected) { tintColor = colors.primary;     tintOpacity = 0.07; }

  // PNG source
  const tankSource = tankColor === 'blue'
    ? require('@/assets/images/blue-tank.png')
    : require('@/assets/images/tank-shell.png');

  return (
    <View style={styles.container}>

      {/* Layer 1 — dark window background */}
      <View style={[styles.absolute, {
        left: WX, top: WY, width: WW, height: WH,
        borderRadius: RX,
        backgroundColor: '#050C14',
      }]} />

      {/* Layer 2 — SVG water animation, sized exactly to window */}
      <View style={[styles.absolute, { left: WX, top: WY, width: WW, height: WH, overflow: 'hidden', borderRadius: RX }]}>
        <Svg width={WW} height={WH} viewBox={`0 0 ${WW} ${WH}`}>
          <Defs>
            <LinearGradient id="wl_water" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0"    stopColor={C_WATER_T} stopOpacity={0.95} />
              <Stop offset="0.45" stopColor="#2080A8" />
              <Stop offset="1"    stopColor={C_WATER_B} />
            </LinearGradient>
            <LinearGradient id="wl_wave2" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#6FD0F0" stopOpacity={0.55} />
              <Stop offset="1" stopColor={C_WATER_T} stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="wl_sheen" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={C_SHEEN} stopOpacity={0.22} />
              <Stop offset="1" stopColor={C_SHEEN} stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="wl_pour" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={C_POUR}    stopOpacity={0.9} />
              <Stop offset="1" stopColor={C_WATER_T} stopOpacity={0.6} />
            </LinearGradient>
            <ClipPath id="wl_clip">
              <Rect x={0} y={0} width={WW} height={WH} rx={RX} />
            </ClipPath>
          </Defs>

          {/* Top-inset shadow */}
          <Rect x={0} y={0} width={WW} height={28}
            fill="#000" opacity={0.38} clipPath="url(#wl_clip)" />

          {/* Second wave (motor-on only) */}
          {wave2Path !== '' && (
            <Path d={wave2Path} fill="url(#wl_wave2)" clipPath="url(#wl_clip)" />
          )}

          {/* Main water fill */}
          {connected && fillPct > 0 && wavePath !== '' && (
            <Path d={wavePath} fill="url(#wl_water)" clipPath="url(#wl_clip)" />
          )}

          {/* Static fill for last-known disconnected display */}
          {!connected && fillPct > 0 && (
            <Rect x={0} y={surfaceY} width={WW} height={fillH}
              fill="url(#wl_water)" opacity={0.60} clipPath="url(#wl_clip)" />
          )}

          {/* Surface sheen */}
          {fillPct > 0 && (
            <Rect x={0} y={surfaceY} width={WW} height={Math.min(22, fillH * 0.35)}
              fill="url(#wl_sheen)" clipPath="url(#wl_clip)" />
          )}

          {/* Ripples */}
          {ripples.map(r => (
            <Ellipse key={r.id}
              cx={r.x} cy={r.y}
              rx={r.maxRadius * r.progress} ry={r.maxRadius * r.progress * 0.32}
              fill="none" stroke={C_SPLASH} strokeWidth={1.2}
              opacity={(1 - r.progress) * 0.55}
              clipPath="url(#wl_clip)" />
          ))}

          {/* Pour stream */}
          {pourPath !== '' && (
            <>
              <Path d={pourPath} stroke="url(#wl_pour)" strokeWidth={4.5}
                strokeLinecap="round" fill="none" opacity={pourFlicker}
                clipPath="url(#wl_clip)" />
              <Path d={pourPath} stroke="#AAEEFF" strokeWidth={1.5}
                strokeLinecap="round" fill="none" opacity={pourFlicker * 0.5}
                clipPath="url(#wl_clip)" />
            </>
          )}

          {/* Splash droplets */}
          {droplets.map(d => {
            const lr = d.life / d.maxLife;
            const op = lr < 0.3 ? lr / 0.3 : 1 - (lr - 0.3) / 0.7;
            return (
              <Circle key={d.id} cx={d.x} cy={d.y}
                r={d.size * (1 - lr * 0.4)}
                fill={C_SPLASH} opacity={op * 0.85}
                clipPath="url(#wl_clip)" />
            );
          })}

          {/* Warning / motor-glow tint */}
          {tintOpacity > 0 && (
            <Rect x={0} y={0} width={WW} height={WH}
              fill={tintColor} opacity={tintOpacity} clipPath="url(#wl_clip)" />
          )}
        </Svg>
      </View>

      {/* Layer 3 — PNG tank shell, transparent window reveals SVG below */}
      <Image
        source={tankSource}
        style={styles.tankPng}
        resizeMode="stretch"
      />

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    width:  IMG_W,
    height: IMG_H,
  },
  absolute: {
    position: 'absolute',
  },
  tankPng: {
    position: 'absolute',
    left:   0,
    top:    0,
    width:  IMG_W,
    height: IMG_H,
  },
});
