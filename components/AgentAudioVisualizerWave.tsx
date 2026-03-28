'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import type { AgentState, TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { useAudioWaveform } from '@livekit/components-react';

type VisualizerSize = 'sm' | 'md' | 'lg';

export interface AgentAudioVisualizerWaveProps {
  state: AgentState;
  audioTrack?: TrackReferenceOrPlaceholder;
  size?: VisualizerSize;
  /** Primary wave color (hex). */
  color?: string;
  /** CSS blur radius applied as glow filter. */
  blur?: number;
  /** Stroke width of each wave ring. */
  lineWidth?: number;
  /** Secondary color hue rotation (0–1). */
  colorShift?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp?: React.PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLDivElement>;
  'aria-label'?: string;
}

const SIZE_PX: Record<VisualizerSize, number> = {
  sm: 140,
  md: 200,
  lg: 280,
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/** Rotate hue of an RGB color by `fraction` (0–1 = 0–360°). */
function shiftHue(r: number, g: number, b: number, fraction: number): { r: number; g: number; b: number } {
  const nr = r / 255, ng = g / 255, nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case nr: h = ((ng - nb) / d + (ng < nb ? 6 : 0)) / 6; break;
      case ng: h = ((nb - nr) / d + 2) / 6; break;
      default:  h = ((nr - ng) / d + 4) / 6; break;
    }
  }
  h = (h + fraction) % 1;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    const tt = ((t % 1) + 1) % 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return {
    r: Math.round(hue2rgb(h + 1 / 3) * 255),
    g: Math.round(hue2rgb(h) * 255),
    b: Math.round(hue2rgb(h - 1 / 3) * 255),
  };
}

interface WaveCanvasProps {
  sizePx: number;
  state: AgentState;
  bars: number[];
  color: string;
  blur: number;
  lineWidth: number;
  colorShift: number;
}

function WaveCanvas({ sizePx, state, bars, color, blur, lineWidth, colorShift }: WaveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef(0);
  const smoothedAmpRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = (Math.min(w, h) / 2) * 0.82;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    // Compute amplitude
    let rawAmp = 0;
    if (bars.length > 0) {
      const sum = bars.reduce((acc, b) => acc + b, 0);
      rawAmp = Math.min(1, sum / bars.length);
    } else {
      switch (state) {
        case 'listening':
          rawAmp = 0.28 + 0.22 * Math.sin(phaseRef.current * 2.2);
          break;
        case 'thinking':
          rawAmp = 0.20 + 0.18 * Math.sin(phaseRef.current * 1.6);
          break;
        case 'speaking':
          rawAmp = 0.35 + 0.28 * Math.sin(phaseRef.current * 2.8);
          break;
        case 'connecting':
        case 'initializing':
        case 'pre-connect-buffering':
          rawAmp = 0.12 + 0.10 * Math.sin(phaseRef.current * 1.2);
          break;
        default:
          rawAmp = 0.08 + 0.06 * Math.sin(phaseRef.current * 0.7);
      }
    }

    smoothedAmpRef.current = smoothedAmpRef.current * 0.82 + rawAmp * 0.18;
    const amp = smoothedAmpRef.current;
    phaseRef.current += 0.055;

    const { r: pr, g: pg, b: pb } = hexToRgb(color);
    const sec = shiftHue(pr, pg, pb, colorShift);
    const { r: sr, g: sg, b: sb } = sec;

    // ── Wave rings (3 concentric waveform paths) ─────────────────
    const numRings = 3;
    const POINTS = Math.max(bars.length > 0 ? bars.length * 2 : 128, 128);

    for (let ring = 0; ring < numRings; ring++) {
      const ringFrac = ring / (numRings - 1); // 0 → 1 (inner → outer)
      const baseR = maxR * (0.42 + ringFrac * 0.38);
      const waveAmp = baseR * (0.12 + amp * 0.25) * (1 - ringFrac * 0.3);
      const phaseOffset = ring * (Math.PI * 0.6);
      const alpha = (0.85 - ringFrac * 0.3) * (0.4 + amp * 0.6);

      // Blend primary → secondary color across rings
      const blend = ringFrac;
      const R = Math.round(pr * (1 - blend) + sr * blend);
      const G = Math.round(pg * (1 - blend) + sg * blend);
      const B = Math.round(pb * (1 - blend) + sb * blend);

      ctx.beginPath();
      for (let i = 0; i <= POINTS; i++) {
        const t = i / POINTS;
        const angle = t * Math.PI * 2 - Math.PI / 2;

        // Audio-driven displacement
        let disp = 0;
        if (bars.length > 0) {
          const barIdx = Math.floor(t * bars.length) % bars.length;
          disp = bars[barIdx] * waveAmp;
        } else {
          disp = waveAmp * Math.sin(angle * 4 + phaseRef.current * 2 + phaseOffset);
        }

        const r = baseR + disp;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(${R},${G},${B},${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    // ── Soft center glow ─────────────────────────────────────────
    const glowR = maxR * (0.18 + amp * 0.12);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    glow.addColorStop(0, `rgba(${pr},${pg},${pb},${0.35 + amp * 0.25})`);
    glow.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.restore();
    rafRef.current = requestAnimationFrame(draw);
  }, [state, bars, color, lineWidth, colorShift]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = sizePx * dpr;
    canvas.height = sizePx * dpr;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw, sizePx]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${sizePx}px`, height: `${sizePx}px`, display: 'block', filter: `blur(${blur * 0.5}px)` }}
    />
  );
}

/**
 * Wave-style audio visualizer for a LiveKit voice agent.
 * Drop-in replacement targeting the @livekit/agents-ui AgentAudioVisualizerWave API.
 */
export function AgentAudioVisualizerWave({
  state,
  audioTrack,
  size = 'md',
  color = '#1FD5F9',
  blur = 4,
  lineWidth = 2,
  colorShift = 0,
  className,
  style,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  'aria-label': ariaLabel,
}: AgentAudioVisualizerWaveProps) {
  const { bars } = useAudioWaveform(audioTrack);
  const sizePx = SIZE_PX[size];

  return (
    <div
      className={className}
      style={{
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        position: 'relative',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      role={onClick ? 'button' : undefined}
      aria-label={ariaLabel ?? `Voice agent is ${state}`}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e as unknown as React.MouseEvent<HTMLDivElement>); } : undefined}
    >
      {/* Outer glow layer — blurred, larger */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: `-${blur * 3}px`,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
          filter: `blur(${blur * 2}px)`,
          pointerEvents: 'none',
        }}
      />
      <WaveCanvas
        sizePx={sizePx}
        state={state}
        bars={bars}
        color={color}
        blur={blur}
        lineWidth={lineWidth}
        colorShift={colorShift}
      />
    </div>
  );
}
