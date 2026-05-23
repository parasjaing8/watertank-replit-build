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
import { useTheme } from '@/context/ThemeContext';
import { TANK_LOW_PCT } from '@/constants/thresholds';

// ─────────────────────────────────────────────────────────────────────────────
// LAYER ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────
//
//  Layer 1 (bottom): Body background — dark interior colour, fills whole widget
//  Layer 2:          Water animation SVG — clipped to cutaway window
//  Layer 3:          tank-shell.png — neutral grey shell (borders, shadows,
//                    highlights, texture, cutaway frame) — NO colour identity
//  Layer 4 (top):    Warning / glow tint overlay — app-controlled colour
//
// The PNG contains ONLY structural detail. The app controls:
//   • interior/body background  (dark-mode aware)
//   • water colour              (theme primary)
//   • warning tint              (orange/red by level)
//   • motor glow                (primary blue)
//
// ─────────────────────────────────────────────────────────────────────────────

// Shell PNG — neutral grey tank, transparent window
const TANK_SHELL = require('@/assets/images/tank-shell.png');

// ─── Layout constants (image: 1024 × 1536 px) ────────────────────────────────
// Tank body pixel bounds in the PNG (measured):
//   x: 68 → 956   (width  888)
//   y: 70 → 1410  (height 1340)
// Cutaway window pixel bounds in the PNG:
//   x: 195 → 755  (width  560)
//   y: 420 → 1055 (height 635)
// Pipe inlet y ≈ 200 in image coords
// ─────────────────────────────────────────────────────────────────────────────
const W          = 300;
const BODY_PX_W  = 888;
const BODY_PX_H  = 1340;
const IMG_SCALE  = W / BODY_PX_W;                          // ≈ 0.3378
const H          = Math.round(BODY_PX_H  * IMG_SCALE);     // ≈ 452
const IMG_W      = Math.round(1024       * IMG_SCALE);      // ≈ 346
const IMG_H      = Math.round(1536       * IMG_SCALE);      // ≈ 519
const IMG_OX     = -Math.round(68        * IMG_SCALE);      // ≈ -23
const IMG_OY     = -Math.round(70        * IMG_SCALE);      // ≈ -24

// Cutaway window in container-space
const CX   = Math.round((195 - 68) * IMG_SCALE);   // ≈ 43
const CY   = Math.round((420 - 70) * IMG_SCALE);   // ≈ 118
const CW   = Math.round(560        * IMG_SCALE);   // ≈ 189
const CH   = Math.round(635        * IMG_SCALE);   // ≈ 214
const CRX  = 8;  // window corner radius

// Pipe inlet entry point (container-space y)
const POUR_Y = Math.round((200 - 70) * IMG_SCALE);  // ≈ 44

// ─── Water colours (static — app-controlled) ─────────────────────────────────
const C_WATER_T = '#3DA8D0';
const C_WATER_B = '#143E5A';
const C_POUR    = '#5CC8F0';
const C_SPLASH  = '#7FD8F8';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface WaterTankWidgetProps {
  pct: number;
  connected: boolean;
  motorOn?: boolean;
  animated?: boolean;
  /** @deprecated – kept for API compatibility. Colour is now theme-driven. */
  tankColor?: 'black' | 'blue';
}

interface Droplet {
  id: number; x: number; y: number;
  vx: number; vy: number; life: number; maxLife: number; size: number;
}
interface Ripple {
  id: number; x: number; y: number; progress: number; maxRadius: number;
}

// ─── Wave path builders ───────────────────────────────────────────────────────
function buildWavePath(sy: number, phase: number, amp: number): string {
  const freq = 0.040; const step = 6;
  let d = `M ${CX} ${sy}`;
  for (let x = 0; x <= CW; x += step) {
    d += ` L ${CX + x} ${sy + Math.sin(x * freq + phase) * amp}`;
  }
  return d + ` L ${CX + CW} ${CY + CH} L ${CX} ${CY + CH} Z`;
}

function buildWave2Path(sy: number, phase: number, amp: number): string {
  const freq = 0.055; const step = 6;
  let d = `M ${CX} ${sy + 3}`;
  for (let x = 0; x <= CW; x += step) {
    d += ` L ${CX + x} ${sy + 3 + Math.sin(x * freq + phase + 1.8) * amp * 0.6}`;
  }
  return d + ` L ${CX + CW} ${CY + CH} L ${CX} ${CY + CH} Z`;
}

// ─── Particle helpers ─────────────────────────────────────────────────────────
let _dropletId = 0;
let _rippleId  = 0;

function spawnDroplet(sy: number): Droplet {
  return {
    id: _dropletId++,
    x: CX + 8 + Math.random() * 34,
    y: sy - 2,
    vx: (Math.random() - 0.4) * 2.2,
    vy: -(1.8 + Math.random() * 2.2),
    life: 0, maxLife: 14 + Math.floor(Math.random() * 10),
    size: 1.0 + Math.random() * 1.8,
  };
}

function spawnRipple(sy: number, nearInlet: boolean): Ripple {
  return {
    id: _rippleId++,
    x: nearInlet ? CX + 10 + Math.random() * 40 : CX + 40 + Math.random() * (CW - 80),
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

  const clamped  = Math.max(0, Math.min(100, pct));
  const isLow    = clamped > 0 && clamped < TANK_LOW_PCT;
  const isCritical = clamped > 0 && clamped < 10;

  const [fillPct,      setFillPct]      = useState(animated ? 0 : clamped);
  const [wavePhase,    setWavePhase]    = useState(0);
  const [droplets,     setDroplets]     = useState<Droplet[]>([]);
  const [ripples,      setRipples]      = useState<Ripple[]>([]);
  const [pourFlicker,  setPourFlicker]  = useState(1.0);
  const fillRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Animate fill on mount / pct change ───────────────────────────────────
  useEffect(() => {
    if (!animated) { setFillPct(clamped); return; }
    const from = fillPct; const steps = 40; const ms = 800 / steps; let i = 0;
    if (fillRef.current) clearInterval(fillRef.current);
    fillRef.current = setInterval(() => {
      i++;
      const t   = i / steps;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setFillPct(from + (clamped - from) * ease);
      if (i >= steps) { clearInterval(fillRef.current!); fillRef.current = null; }
    }, ms);
    return () => { if (fillRef.current) clearInterval(fillRef.current); };
  }, [clamped]);

  // ── Main animation loop ───────────────────────────────────────────────────
  useEffect(() => {
    if (!connected || clamped <= 0) {
      if (animRef.current) clearInterval(animRef.current);
      setDroplets([]); setRipples([]); return;
    }
    const waveStep = motorOn ? 0.10 : 0.030;
    const ms       = motorOn ? 40   : 80;
    let frame = 0;
    if (animRef.current) clearInterval(animRef.current);
    animRef.current = setInterval(() => {
      frame++;
      setWavePhase(p => p + waveStep);
      setPourFlicker(0.7 + Math.random() * 0.3);
      if (motorOn) {
        setDroplets(prev => {
          const sy  = (CY + CH) - (fillPct / 100) * CH;
          const aged = prev
            .map(d => ({ ...d, x: d.x + d.vx, y: d.y + d.vy, vy: d.vy + 0.30, life: d.life + 1 }))
            .filter(d => d.life < d.maxLife);
          return frame % 4 === 0 && aged.length < 12
            ? [...aged, spawnDroplet(sy)] : aged;
        });
        setRipples(prev => {
          const advanced = prev.map(r => ({ ...r, progress: r.progress + 0.035 })).filter(r => r.progress < 1);
          if (frame % 16 === 0) {
            const sy = (CY + CH) - (fillPct / 100) * CH;
            return [...advanced, spawnRipple(sy, true)];
          }
          return advanced;
        });
      } else {
        setDroplets([]);
        setRipples(prev => {
          const advanced = prev.map(r => ({ ...r, progress: r.progress + 0.018 })).filter(r => r.progress < 1);
          if (frame % 80 === 0 && clamped > 0) {
            const sy = (CY + CH) - (fillPct / 100) * CH;
            return [...advanced, spawnRipple(sy, false)];
          }
          return advanced;
        });
      }
    }, ms);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [connected, motorOn, clamped, fillPct]);

  // ── Derived geometry ──────────────────────────────────────────────────────
  const fillH    = (fillPct / 100) * CH;
  const surfaceY = CY + CH - fillH;
  const waveAmp  = motorOn ? 2.0 : 0.7;
  const wavePath  = connected && fillPct > 0 ? buildWavePath(surfaceY,  wavePhase, waveAmp) : '';
  const wave2Path = connected && fillPct > 0 && motorOn ? buildWave2Path(surfaceY, wavePhase, waveAmp) : '';

  // Pour stream arc from pipe inlet to water surface
  const pourEndX  = CX + 22;
  const pourEndY  = surfaceY + 2;
  const pourPath  = motorOn && connected && fillPct > 0
    ? `M ${CX - 10} ${POUR_Y} C ${CX + 10} ${POUR_Y + 20}, ${pourEndX + 8} ${pourEndY - 22}, ${pourEndX} ${pourEndY}`
    : '';

  // ── Layer 1: Body background colour ──────────────────────────────────────
  // The interior of the tank should look dark regardless of theme —
  // the window reveals this "inside" the tank.
  const bodyBg   = isDark ? '#060E18' : '#0D1E30';

  // ── Layer 4: Warning / glow tint colour & opacity ─────────────────────────
  // Applied as a semi-transparent overlay on the water window area.
  let warnColor   = 'transparent';
  let warnOpacity = 0;
  if (isCritical) {
    warnColor   = colors.destructive;   // red
    warnOpacity = 0.22;
  } else if (isLow) {
    warnColor   = colors.warning;       // orange
    warnOpacity = 0.14;
  } else if (motorOn && connected) {
    warnColor   = colors.primary;       // blue glow when filling
    warnOpacity = 0.08;
  }

  return (
    <View style={styles.container}>

      {/* ── LAYER 2: Water animation SVG ─────────────────────────────────── */}
      {/* Layer 1 (body background) lives here too, as an SVG rect clipped    */}
      {/* to the cutaway window — so it never bleeds outside the PNG frame.   */}
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="wt_water" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor={C_WATER_T} stopOpacity={0.95} />
            <Stop offset="0.45" stopColor="#2080A8"  />
            <Stop offset="1"    stopColor={C_WATER_B} />
          </LinearGradient>
          <LinearGradient id="wt_wave2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#6FD0F0" stopOpacity={0.55} />
            <Stop offset="1" stopColor={C_WATER_T} stopOpacity={0.0} />
          </LinearGradient>
          <LinearGradient id="wt_sheen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0}    />
          </LinearGradient>
          <LinearGradient id="wt_pour" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C_POUR}    stopOpacity={0.9} />
            <Stop offset="1" stopColor={C_WATER_T} stopOpacity={0.6} />
          </LinearGradient>
          <ClipPath id="wt_clip">
            <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} />
          </ClipPath>
        </Defs>

        {/* LAYER 1 — dark interior background, confined to the window area */}
        <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} fill={bodyBg} />

        {/* Window top-inset shadow */}
        <Rect x={CX} y={CY} width={CW} height={28} rx={CRX}
          fill="#000" opacity={0.45} clipPath="url(#wt_clip)" />

        {/* Second wave (motor-on only) */}
        {connected && fillPct > 0 && wave2Path !== '' && (
          <Path d={wave2Path} fill="url(#wt_wave2)" clipPath="url(#wt_clip)" />
        )}

        {/* Main wave fill */}
        {connected && fillPct > 0 && (
          <Path d={wavePath} fill="url(#wt_water)" clipPath="url(#wt_clip)" />
        )}

        {/* Surface sheen */}
        {connected && fillPct > 0 && (
          <Rect x={CX} y={surfaceY} width={CW} height={Math.min(30, fillH * 0.38)}
            rx={4} fill="url(#wt_sheen)" clipPath="url(#wt_clip)" />
        )}

        {/* Ripples */}
        {ripples.map(r => (
          <Ellipse key={r.id}
            cx={r.x} cy={r.y}
            rx={r.maxRadius * r.progress} ry={r.maxRadius * r.progress * 0.32}
            fill="none" stroke={C_SPLASH} strokeWidth={1.2}
            opacity={(1 - r.progress) * 0.55}
            clipPath="url(#wt_clip)" />
        ))}

        {/* Pour stream */}
        {pourPath !== '' && (
          <>
            <Path d={pourPath} stroke="url(#wt_pour)" strokeWidth={5.5}
              strokeLinecap="round" fill="none" opacity={pourFlicker}
              clipPath="url(#wt_clip)" />
            <Path d={pourPath} stroke="#AAEEFF" strokeWidth={1.5}
              strokeLinecap="round" fill="none" opacity={pourFlicker * 0.55}
              clipPath="url(#wt_clip)" />
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
              clipPath="url(#wt_clip)" />
          );
        })}
      </Svg>

      {/* ── LAYER 3: Tank shell PNG overlay ───────────────────────────────── */}
      {/* Neutral grey — provides borders, shadows, highlights, texture,       */}
      {/* and the cutaway frame. No colour identity. The transparent window    */}
      {/* lets Layer 1 & 2 show through.                                       */}
      <Image
        source={TANK_SHELL}
        style={[styles.shellImage, { left: IMG_OX, top: IMG_OY, width: IMG_W, height: IMG_H }]}
        resizeMode="stretch"
      />

      {/* ── LAYER 4: Warning / glow tint overlay ─────────────────────────── */}
      {/* Semi-transparent colour rect clipped to the window, tinting the      */}
      {/* water view for low-level warnings or motor-on glow.                  */}
      {warnOpacity > 0 && (
        <View
          style={[
            styles.tintOverlay,
            {
              left:    CX,
              top:     CY,
              width:   CW,
              height:  CH,
              borderRadius: CRX,
              backgroundColor: warnColor,
              opacity: warnOpacity,
            },
          ]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width:    W,
    height:   H,
    overflow: 'hidden',
  },
  shellImage: {
    position: 'absolute',
  },
  tintOverlay: {
    position: 'absolute',
  },
});
