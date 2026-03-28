'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { AgentState } from '@livekit/components-react';

interface AgentAudioVisualizerAuraProps {
  agentState: AgentState;
  /** Float32Array of frequency data 0-255, or null when silent */
  frequencyData?: Uint8Array | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const STATE_COLORS: Record<AgentState, { primary: string; secondary: string; glow: string }> = {
  disconnected:          { primary: '#94A3B8', secondary: '#CBD5E1', glow: 'rgba(148,163,184,0.2)' },
  connecting:            { primary: '#2563EB', secondary: '#60A5FA', glow: 'rgba(37,99,235,0.3)' },
  initializing:          { primary: '#2563EB', secondary: '#60A5FA', glow: 'rgba(37,99,235,0.3)' },
  idle:                  { primary: '#94A3B8', secondary: '#CBD5E1', glow: 'rgba(148,163,184,0.2)' },
  listening:             { primary: '#059669', secondary: '#34D399', glow: 'rgba(5,150,105,0.35)' },
  thinking:              { primary: '#D97706', secondary: '#FCD34D', glow: 'rgba(217,119,6,0.35)' },
  speaking:              { primary: '#2563EB', secondary: '#93C5FD', glow: 'rgba(37,99,235,0.35)' },
  failed:                { primary: '#DC2626', secondary: '#FCA5A5', glow: 'rgba(220,38,38,0.3)' },
  'pre-connect-buffering': { primary: '#2563EB', secondary: '#60A5FA', glow: 'rgba(37,99,235,0.3)' },
};

/**
 * Premium aura-style audio visualizer using Canvas 2D.
 * Uses requestAnimationFrame — never setInterval.
 */
export function AgentAudioVisualizerAura({
  agentState,
  frequencyData,
  size = 200,
  className,
  style,
}: AgentAudioVisualizerAuraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef(0);
  const smoothedAmpRef = useRef(0);

  const colors = STATE_COLORS[agentState] ?? STATE_COLORS.disconnected;

  // Hex → rgb helper
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

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
    const baseRadius = (Math.min(w, h) / 2) * 0.38;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Compute amplitude from frequency data
    let rawAmp = 0;
    if (frequencyData && frequencyData.length > 0) {
      let sum = 0;
      const buckets = Math.min(frequencyData.length, 64);
      for (let i = 0; i < buckets; i++) {
        sum += frequencyData[i];
      }
      rawAmp = sum / (buckets * 255);
    } else if (agentState === 'speaking' || agentState === 'listening' || agentState === 'thinking') {
      // Synthetic pulse when no real data
      rawAmp = 0.3 + 0.25 * Math.sin(phaseRef.current * 2.0);
    } else if (agentState === 'connecting' || agentState === 'initializing') {
      rawAmp = 0.15 + 0.1 * Math.sin(phaseRef.current * 1.5);
    }

    // Smooth amplitude
    smoothedAmpRef.current = smoothedAmpRef.current * 0.75 + rawAmp * 0.25;
    const amp = smoothedAmpRef.current;

    phaseRef.current += 0.04;

    const { r: pr, g: pg, b: pb } = hexToRgb(colors.primary);
    const { r: sr, g: sg, b: sb } = hexToRgb(colors.secondary);

    // ── Outer glow rings ──────────────────────────────────────────────────
    const numRings = 3;
    for (let i = numRings; i >= 1; i--) {
      const ringRadius = baseRadius * (1 + i * 0.22 + amp * 0.25 * i);
      const alpha = (0.12 - i * 0.03) * (0.4 + amp);
      const grad = ctx.createRadialGradient(cx, cy, ringRadius * 0.5, cx, cy, ringRadius);
      grad.addColorStop(0, `rgba(${pr},${pg},${pb},${alpha * 1.8})`);
      grad.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
      ctx.beginPath();
      ctx.arc(cx * dpr, cy * dpr, ringRadius * dpr, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // ── Organic waveform ring ─────────────────────────────────────────────
    const numPoints = frequencyData ? Math.min(frequencyData.length, 128) : 64;
    const waveRadius = baseRadius * (1 + amp * 0.3);
    const waveAmplitude = baseRadius * 0.18 * (amp * 1.2 + 0.15);

    ctx.save();
    ctx.scale(dpr, dpr);

    // Draw wave path
    ctx.beginPath();
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
      let displacement = 0;
      if (frequencyData && i < frequencyData.length) {
        displacement = (frequencyData[i] / 255) * waveAmplitude;
      } else {
        displacement = waveAmplitude * (0.5 + 0.5 * Math.sin(angle * 4 + phaseRef.current * 2));
      }
      const r = waveRadius + displacement;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const waveGrad = ctx.createRadialGradient(cx, cy, waveRadius * 0.6, cx, cy, waveRadius + waveAmplitude);
    waveGrad.addColorStop(0, `rgba(${sr},${sg},${sb},${0.15 + amp * 0.15})`);
    waveGrad.addColorStop(0.5, `rgba(${pr},${pg},${pb},${0.12 + amp * 0.12})`);
    waveGrad.addColorStop(1, `rgba(${pr},${pg},${pb},0.02)`);
    ctx.fillStyle = waveGrad;
    ctx.fill();

    ctx.strokeStyle = `rgba(${pr},${pg},${pb},${0.5 + amp * 0.35})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── Inner core ────────────────────────────────────────────────────────
    const coreRadius = baseRadius * (0.62 + amp * 0.08);
    const coreGrad = ctx.createRadialGradient(cx, cy - coreRadius * 0.15, coreRadius * 0.1, cx, cy, coreRadius);
    coreGrad.addColorStop(0, `rgba(${sr},${sg},${sb},${0.9 + amp * 0.1})`);
    coreGrad.addColorStop(0.45, `rgba(${pr},${pg},${pb},${0.75 + amp * 0.15})`);
    coreGrad.addColorStop(1, `rgba(${pr},${pg},${pb},0.5)`);
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // Specular highlight
    const highlightGrad = ctx.createRadialGradient(
      cx - coreRadius * 0.25, cy - coreRadius * 0.3, 0,
      cx, cy, coreRadius * 0.7
    );
    highlightGrad.addColorStop(0, 'rgba(255,255,255,0.40)');
    highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = highlightGrad;
    ctx.fill();

    ctx.restore();

    rafRef.current = requestAnimationFrame(draw);
  }, [agentState, colors, frequencyData]);

  // Start/restart animation loop when state or data changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(rafRef.current);
  }, [draw, size]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={`Voice agent is ${agentState}`}
      aria-live="polite"
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'block',
        ...style,
      }}
    />
  );
}
