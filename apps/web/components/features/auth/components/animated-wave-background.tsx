'use client';

import { useEffect, useRef } from 'react';

interface Ribbon {
  yStart: number;
  yEnd: number;
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  width: number;
  r: number;
  g: number;
  b: number;
  opacity: number;
}

const RIBBONS: Ribbon[] = [
  {
    yStart: 0.58,
    yEnd: 0.82,
    amplitude: 40,
    frequency: 0.0022,
    speed: 0.3,
    phase: 0,
    width: 140,
    r: 118,
    g: 192,
    b: 68,
    opacity: 0.14,
  },
  {
    yStart: 0.52,
    yEnd: 0.76,
    amplitude: 50,
    frequency: 0.0028,
    speed: 0.4,
    phase: 1.5,
    width: 100,
    r: 118,
    g: 192,
    b: 68,
    opacity: 0.18,
  },
  {
    yStart: 0.56,
    yEnd: 0.8,
    amplitude: 35,
    frequency: 0.0035,
    speed: 0.5,
    phase: 3.0,
    width: 70,
    r: 100,
    g: 180,
    b: 60,
    opacity: 0.22,
  },
  {
    yStart: 0.48,
    yEnd: 0.74,
    amplitude: 55,
    frequency: 0.0018,
    speed: 0.25,
    phase: 0.7,
    width: 160,
    r: 130,
    g: 200,
    b: 80,
    opacity: 0.1,
  },
  {
    yStart: 0.6,
    yEnd: 0.85,
    amplitude: 28,
    frequency: 0.004,
    speed: 0.6,
    phase: 4.2,
    width: 50,
    r: 118,
    g: 192,
    b: 68,
    opacity: 0.25,
  },
  {
    yStart: 0.54,
    yEnd: 0.78,
    amplitude: 45,
    frequency: 0.0025,
    speed: 0.35,
    phase: 2.1,
    width: 90,
    r: 90,
    g: 170,
    b: 50,
    opacity: 0.16,
  },
];

function baseY(x: number, w: number, h: number, rb: Ribbon): number {
  const pct = x / w;
  return h * (rb.yStart + (rb.yEnd - rb.yStart) * pct);
}

function waveY(x: number, w: number, h: number, rb: Ribbon, t: number): number {
  const s = t * rb.speed;
  return (
    baseY(x, w, h, rb) +
    Math.sin(x * rb.frequency + s + rb.phase) * rb.amplitude +
    Math.sin(x * rb.frequency * 0.6 + s * 0.7 + rb.phase * 1.3) * (rb.amplitude * 0.4) +
    Math.cos(x * rb.frequency * 0.35 + s * 0.5 + rb.phase * 0.8) * (rb.amplitude * 0.25)
  );
}

function drawRibbon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rb: Ribbon,
  t: number,
): void {
  const half = rb.width / 2;

  ctx.beginPath();
  for (let x = 0; x <= w; x += 3) {
    const y = waveY(x, w, h, rb, t);
    if (x === 0) ctx.moveTo(x, y - half);
    else ctx.lineTo(x, y - half);
  }
  for (let x = w; x >= 0; x -= 3) {
    const y = waveY(x, w, h, rb, t);
    ctx.lineTo(x, y + half);
  }
  ctx.closePath();

  const midY = (h * (rb.yStart + rb.yEnd)) / 2;
  const grad = ctx.createLinearGradient(
    0,
    midY - rb.amplitude - half,
    0,
    midY + rb.amplitude + half,
  );
  grad.addColorStop(0, `rgba(${rb.r}, ${rb.g}, ${rb.b}, 0)`);
  grad.addColorStop(0.35, `rgba(${rb.r}, ${rb.g}, ${rb.b}, ${rb.opacity * 0.4})`);
  grad.addColorStop(0.5, `rgba(${rb.r}, ${rb.g}, ${rb.b}, ${rb.opacity})`);
  grad.addColorStop(0.65, `rgba(${rb.r}, ${rb.g}, ${rb.b}, ${rb.opacity * 0.4})`);
  grad.addColorStop(1, `rgba(${rb.r}, ${rb.g}, ${rb.b}, 0)`);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  for (let x = 0; x <= w; x += 3) {
    const y = waveY(x, w, h, rb, t);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = `rgba(${rb.r}, ${rb.g}, ${rb.b}, ${rb.opacity * 0.6})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function AnimatedWaveBackground(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = (): void => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    let start = 0;
    const animate = (ts: number): void => {
      if (!start) start = ts;
      const time = (ts - start) / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      for (const ribbon of RIBBONS) {
        drawRibbon(ctx, w, h, ribbon, time);
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0" aria-hidden="true" />;
}
