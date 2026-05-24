import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Circle,
} from 'react-native-svg';

interface WaterTankWidgetProps {
  pct: number;
  connected: boolean;
  motorOn?: boolean;
  animated?: boolean;
  tankColor?: 'black' | 'blue';
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

// ─── Tank image sources ──────────────────────────────────────────────────
const TANK_IMAGES = {
  black: require('@/assets/images/water-tank.png'),
  blue:  require('@/assets/images/blue-tank.png'),
} as const;

// ─── Container & Image Layout ──────────────────────────────────────────────
// Tank PNG: 1024×1536 px. Tank body bounds in image: (120,242)→(839,1072)
// Scale so tank width (719px) fills container width (300px).
const W = 300;
const H = 346;  // 830 * (300/719) ≈ 346

const IMG_SCALE = W / 719;                              // ≈ 0.4172
const IMG_W     = Math.round(1024 * IMG_SCALE);         // 427
const IMG_H     = Math.round(1536 * IMG_SCALE);         // 641
const IMG_OX    = -Math.round(120 * IMG_SCALE);         // -50
const IMG_OY    = -Math.round(242 * IMG_SCALE);         // -101

// ─── Cutaway window in container coords — measured per PNG ─────────────────
// Black: image window x=308→726, y=485→944  → CX=78 CY=101 CW=174 CH=192
// Blue:  image window x=286→712, y=514→926  → CX=69 CY=113 CW=178 CH=172
// (y_top measured at alpha=0 interior, not the semi-transparent frame edge)
const TANK_WINDOW = {
  black: { CX: 78, CY: 101, CW: 174, CH: 192 },
  blue:  { CX: 69, CY: 113, CW: 178, CH: 172 },
} as const;
const CRX  = 10;
const POUR_Y = Math.round((430 - 242) * IMG_SCALE);  // ≈ 78 — same for both

// ─── Colors ───────────────────────────────────────────────────────────────
const C_WATER_T = '#3DA8D0';
const C_WATER_B = '#143E5A';
const C_POUR    = '#5CC8F0';
const C_SPLASH  = '#7FD8F8';

function buildWavePath(surfaceY: number, phase: number, amp: number, CX: number, CY: number, CW: number, CH: number): string {
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

function buildSecondWavePath(surfaceY: number, phase: number, amp: number, CX: number, CY: number, CW: number, CH: number): string {
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
let rippleIdCounter  = 0;

function spawnDroplet(surfaceY: number, CX: number): Droplet {
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

function spawnRipple(surfaceY: number, nearInlet: boolean, CX: number, CW: number): Ripple {
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
  tankColor = 'black',
}: WaterTankWidgetProps) {
  const { CX, CY, CW, CH } = TANK_WINDOW[tankColor];
  const POUR_X = CX;

  const clamped = Math.max(0, Math.min(100, pct));
  const [fillPct, setFillPct]         = useState(animated ? 0 : clamped);
  const [animState, setAnimState]     = useState({ wavePhase: 0, pourFlicker: 1.0 });
  const [droplets, setDroplets]       = useState<Droplet[]>([]);
  const [ripples, setRipples]         = useState<Ripple[]>([]);
  const fillPctRef = useRef(animated ? 0 : clamped);
  const fillRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef = useRef(0);

  useEffect(() => { fillPctRef.current = fillPct; }, [fillPct]);

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

      setAnimState(prev => ({ ...prev, wavePhase: prev.wavePhase + waveStep, pourFlicker: 0.7 + Math.random() * 0.3 }));

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

          const sy = (CY + CH) - (fillPctRef.current / 100) * CH;
          if (frame % 4 === 0 && aged.length < 12) {
            return [...aged, spawnDroplet(sy, CX)];
          }
          return aged;
        });

        setRipples(prev => {
          const advanced = prev
            .map(r => ({ ...r, progress: r.progress + 0.035 }))
            .filter(r => r.progress < 1);
          if (frame % 16 === 0) {
            const sy = (CY + CH) - (fillPctRef.current / 100) * CH;
            return [...advanced, spawnRipple(sy, true, CX, CW)];
          }
          return advanced;
        });
      } else {
        setDroplets([]);
        setRipples(prev => {
          const advanced = prev
            .map(r => ({ ...r, progress: r.progress + 0.018 }))
            .filter(r => r.progress < 1);
          if (frame % 80 === 0 && clamped > 0) {
            const sy = (CY + CH) - (fillPctRef.current / 100) * CH;
            return [...advanced, spawnRipple(sy, false, CX, CW)];
          }
          return advanced;
        });
      }
    }, ms);

    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [connected, motorOn, clamped, tankColor]);

  const fillH    = (fillPct / 100) * CH;
  const surfaceY = CY + CH - fillH;
  const waveAmp  = motorOn ? 2.0 : 0.7;

  const wavePath = useMemo(
    () => connected && fillPct > 0 ? buildWavePath(surfaceY, animState.wavePhase, waveAmp, CX, CY, CW, CH) : '',
    [connected, fillPct, surfaceY, animState.wavePhase, waveAmp, CX, CY, CW, CH],
  );
  const wave2Path = useMemo(
    () => connected && fillPct > 0 && motorOn ? buildSecondWavePath(surfaceY, animState.wavePhase, waveAmp, CX, CY, CW, CH) : '',
    [connected, fillPct, motorOn, surfaceY, animState.wavePhase, waveAmp, CX, CY, CW, CH],
  );

  // Pour stream: arc from pipe entry (left of window) to water surface
  const pourEndX = CX + 22;
  const pourEndY = surfaceY + 2;
  const pourPath = motorOn && connected && fillPct > 0
    ? `M ${POUR_X - 10} ${POUR_Y} C ${POUR_X + 10} ${POUR_Y + 20}, ${pourEndX + 8} ${pourEndY - 22}, ${pourEndX} ${pourEndY}`
    : '';

  return (
    <View style={styles.container}>
      {/* ── Water animation SVG behind tank image ── */}
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="wtWater" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor={C_WATER_T} stopOpacity={0.95} />
            <Stop offset="0.45" stopColor="#2080A8" />
            <Stop offset="1"    stopColor={C_WATER_B} />
          </LinearGradient>
          <LinearGradient id="wtWater2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#6FD0F0" stopOpacity={0.55} />
            <Stop offset="1"   stopColor={C_WATER_T} stopOpacity={0.0} />
          </LinearGradient>
          <LinearGradient id="wtSheen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#FFFFFF" stopOpacity={0.22} />
            <Stop offset="1"   stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="wtPour" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor={C_POUR} stopOpacity={0.9} />
            <Stop offset="1"   stopColor={C_WATER_T} stopOpacity={0.6} />
          </LinearGradient>
          <ClipPath id="cutClip">
            <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} />
          </ClipPath>
        </Defs>

        {/* Dark bg behind window */}
        <Rect x={CX} y={CY} width={CW} height={CH} rx={CRX} fill="#0A1628" />
        {/* Top inset shadow */}
        <Rect x={CX} y={CY} width={CW} height={30} rx={CRX}
          fill="#000" opacity={0.55} clipPath="url(#cutClip)" />

        {/* Second wave */}
        {connected && fillPct > 0 && wave2Path !== '' && (
          <Path d={wave2Path} fill="url(#wtWater2)" clipPath="url(#cutClip)" />
        )}
        {/* Main wave */}
        {connected && fillPct > 0 && (
          <Path d={wavePath} fill="url(#wtWater)" clipPath="url(#cutClip)" />
        )}
        {/* Surface sheen */}
        {connected && fillPct > 0 && (
          <Rect x={CX} y={surfaceY} width={CW} height={Math.min(32, fillH * 0.40)}
            rx={4} fill="url(#wtSheen)" clipPath="url(#cutClip)" />
        )}

        {/* Ripples */}
        {ripples.map(r => {
          const radius  = r.maxRadius * r.progress;
          const opacity = (1 - r.progress) * 0.55;
          return (
            <Ellipse key={r.id} cx={r.x} cy={r.y}
              rx={radius} ry={radius * 0.32}
              fill="none" stroke={C_SPLASH} strokeWidth={1.2}
              opacity={opacity} clipPath="url(#cutClip)" />
          );
        })}

        {/* Pour stream */}
        {pourPath !== '' && (
          <>
            <Path d={pourPath} stroke="url(#wtPour)" strokeWidth={5.5}
              strokeLinecap="round" fill="none" opacity={animState.pourFlicker}
              clipPath="url(#cutClip)" />
            <Path d={pourPath} stroke="#AAEEFF" strokeWidth={1.5}
              strokeLinecap="round" fill="none" opacity={animState.pourFlicker * 0.55}
              clipPath="url(#cutClip)" />
          </>
        )}

        {/* Splash droplets */}
        {droplets.map(d => {
          const lifeRatio = d.life / d.maxLife;
          const opacity = lifeRatio < 0.3
            ? lifeRatio / 0.3
            : 1 - (lifeRatio - 0.3) / 0.7;
          return (
            <Circle key={d.id} cx={d.x} cy={d.y}
              r={d.size * (1 - lifeRatio * 0.4)}
              fill={C_SPLASH} opacity={opacity * 0.85}
              clipPath="url(#cutClip)" />
          );
        })}
      </Svg>

      {/* ── Tank PNG overlay — transparent window reveals water behind ── */}
      <Image
        source={TANK_IMAGES[tankColor]}
        style={[styles.tankImage, { left: IMG_OX, top: IMG_OY, width: IMG_W, height: IMG_H }]}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: W,
    height: H,
    overflow: 'hidden',
  },
  tankImage: {
    position: 'absolute',
  },
});
