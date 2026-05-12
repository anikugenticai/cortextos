'use client';

import { useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { AgentSummary, Heartbeat } from '@/lib/types';

interface OrbAgent {
  code: string;
  name: string;
  role: string;
  status: 'working' | 'queued' | 'blocked' | 'offline';
  task: string;
}

interface OrbLayout {
  xPct: number;
  yPct: number;
  size: number;
  durationSec: number;
  delaySec: number;
  dx: number;
  dy: number;
}

const ORB_POSITIONS = [
  { xPct: 14, yPct: 60, size: 72 },
  { xPct: 26, yPct: 35, size: 60 },
  { xPct: 40, yPct: 68, size: 78 },
  { xPct: 52, yPct: 42, size: 64 },
  { xPct: 64, yPct: 70, size: 56 },
  { xPct: 76, yPct: 38, size: 62 },
  { xPct: 88, yPct: 64, size: 58 },
];

function healthToStatus(health: string): OrbAgent['status'] {
  if (health === 'healthy') return 'working';
  if (health === 'stale') return 'queued';
  if (health === 'down') return 'offline';
  return 'offline';
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface AgentOrbFieldProps {
  agents: (AgentSummary & { emoji?: string })[];
  heartbeats: Record<string, Heartbeat>;
}

export function AgentOrbField({ agents, heartbeats }: AgentOrbFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number>(0);

  // Map real agents to display orbs (fill with placeholders if < 7)
  const orbs: OrbAgent[] = useMemo(() => {
    const result: OrbAgent[] = agents.slice(0, 7).map((a) => {
      const hb = heartbeats[a.name];
      return {
        code: a.name.slice(0, 3).toUpperCase(),
        name: a.name,
        role: a.org,
        status: healthToStatus(a.health),
        task: hb?.current_task?.replace(/^WORKING ON:\s*/i, '').slice(0, 40) ?? 'idle',
      };
    });
    while (result.length < 7) {
      result.push({ code: '···', name: '—', role: '—', status: 'offline', task: '—' });
    }
    return result;
  }, [agents, heartbeats]);

  // Generate per-orb drift keyframes once at mount
  const orbLayouts: OrbLayout[] = useMemo(() =>
    ORB_POSITIONS.map((pos, i) => {
      const rng = seededRandom(i * 1234 + 7);
      return {
        ...pos,
        durationSec: 8 + rng() * 7,
        delaySec: rng() * 10,
        dx: (8 + rng() * 10) * (rng() > 0.5 ? 1 : -1),
        dy: (8 + rng() * 10) * (rng() > 0.5 ? 1 : -1),
      };
    }),
  []);

  // Inject drift keyframes into a <style> tag
  useEffect(() => {
    const id = 'orb-keyframes';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = orbLayouts.map((l, i) => `
      @keyframes drift${i} {
        0%   { transform: translate(0px, 0px); }
        50%  { transform: translate(${l.dx}px, ${l.dy}px); }
        100% { transform: translate(0px, 0px); }
      }
    `).join('\n');
    return () => { el?.remove(); };
  }, [orbLayouts]);

  // Canvas constellation draw loop
  const drawConstellation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const time = performance.now() / 1000;

    // Particles — stored in canvas dataset to persist across frames
    type Particle = { x: number; y: number; vx: number; vy: number; r: number; hue: number };
    if (!(canvas as HTMLCanvasElement & { _particles?: Particle[] })._particles) {
      const count = Math.floor((W * H) / 9000);
      const rng = seededRandom(42);
      (canvas as HTMLCanvasElement & { _particles?: Particle[] })._particles = Array.from({ length: count }, () => ({
        x: rng() * W,
        y: rng() * H,
        vx: (rng() - 0.5) * 0.3,
        vy: (rng() - 0.5) * 0.3,
        r: 0.4 + rng() * 1.2,
        hue: rng() > 0.5 ? 260 : 185,
      }));
    }
    const particles = (canvas as HTMLCanvasElement & { _particles?: Particle[] })._particles!;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x += W;
      if (p.x > W) p.x -= W;
      if (p.y < 0) p.y += H;
      if (p.y > H) p.y -= H;
      const alpha = 0.3 + 0.25 * Math.sin(time + p.x * 0.01 + p.y * 0.01);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${alpha})`;
      ctx.fill();
    }

    // Orb-to-orb connection lines
    const canvasRect = canvas.getBoundingClientRect();
    const centers: { x: number; y: number; active: boolean }[] = orbRefs.current.map((el, i) => {
      if (!el) {
        const pos = ORB_POSITIONS[i];
        return { x: pos.xPct / 100 * W, y: pos.yPct / 100 * H, active: false };
      }
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - canvasRect.left,
        y: r.top + r.height / 2 - canvasRect.top,
        active: orbs[i]?.status === 'working',
      };
    });

    const MAX_DIST = 180;
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const dx = centers[i].x - centers[j].x;
        const dy = centers[i].y - centers[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > MAX_DIST) continue;
        const alpha = (1 - dist / MAX_DIST) * (centers[i].active && centers[j].active ? 0.35 : 0.12);
        const grad = ctx.createLinearGradient(centers[i].x, centers[i].y, centers[j].x, centers[j].y);
        grad.addColorStop(0, `rgba(59,130,246,${alpha})`);
        grad.addColorStop(1, centers[i].active && centers[j].active ? `rgba(45,212,191,${alpha})` : `rgba(59,130,246,${alpha})`);
        ctx.beginPath();
        ctx.moveTo(centers[i].x, centers[i].y);
        ctx.lineTo(centers[j].x, centers[j].y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    rafRef.current = requestAnimationFrame(drawConstellation);
  }, [orbs]);

  // Canvas sizing + RAF
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      // Reset particles on resize
      (canvas as HTMLCanvasElement & { _particles?: unknown })._particles = undefined;
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
      } else {
        rafRef.current = requestAnimationFrame(drawConstellation);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    rafRef.current = requestAnimationFrame(drawConstellation);

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [drawConstellation]);

  const workingCount = orbs.filter(o => o.status === 'working').length;

  const statusColors = {
    working: { core: '#22c55e', ring: '#22c55e', bg: 'radial-gradient(circle, rgba(34,197,94,0.25), rgba(34,197,94,0.08))' },
    queued:  { core: '#f59e0b', ring: '#f59e0b', bg: 'radial-gradient(circle, rgba(245,158,11,0.25), rgba(245,158,11,0.08))' },
    blocked: { core: '#ef4444', ring: '#ef4444', bg: 'radial-gradient(circle, rgba(239,68,68,0.25), rgba(239,68,68,0.08))' },
    offline: { core: '#6b7494', ring: '#6b7494', bg: 'radial-gradient(circle, rgba(107,116,148,0.15), rgba(107,116,148,0.04))' },
  };

  // Compact strip for mobile (< 900px) — rendered server-side via CSS visibility
  const compactStrip = (
    <div
      className="glass-card siq-orb-compact"
      style={{ padding: '14px 16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#e8eaf2' }}>Agent Fleet</span>
        <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: 11, color: '#6b7494' }}>
          <span style={{ color: '#22c55e' }}>{workingCount}</span> / {orbs.filter(o => o.name !== '—').length} active
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {orbs.filter(o => o.name !== '—').map((orb, i) => {
          const c = statusColors[orb.status];
          return (
            <div
              key={i}
              title={`${orb.name} — ${orb.status}: ${orb.task}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 8,
                background: `${c.core}18`, border: `1px solid ${c.core}33`,
                opacity: orb.status === 'offline' ? 0.5 : 1,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.core, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#e8eaf2', fontWeight: 500 }}>{orb.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {compactStrip}
      <div
        className="glass-card relative overflow-hidden siq-orb-full"
        style={{ height: 280, borderRadius: 16 }}
      >
      {/* Canvas layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ zIndex: 1, pointerEvents: 'none' }}
        aria-hidden="true"
      />

      {/* Header */}
      <div
        className="absolute flex items-center justify-between"
        style={{ top: 18, left: 22, right: 22, zIndex: 3 }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 16, fontWeight: 600, color: '#e8eaf2' }}>Agent Fleet</span>
          <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: 12, color: '#6b7494' }}>
            <span style={{ color: '#22c55e', fontWeight: 500 }}>{workingCount}</span>
            {' of 7 active · uplink stable'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg px-3 py-1 text-xs transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#6b7494',
              cursor: 'pointer',
            }}
          >
            Snapshot
          </button>
          <Link
            href="/agents"
            className="rounded-lg px-3 py-1 text-xs transition-colors"
            style={{
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              color: '#3B82F6',
              textDecoration: 'none',
            }}
          >
            Deploy Agent
          </Link>
        </div>
      </div>

      {/* Orb layer */}
      <div className="absolute inset-0" style={{ zIndex: 2 }} aria-label="Agent fleet status">
        {orbLayouts.map((layout, i) => {
          const orb = orbs[i];
          if (orb.name === '—') return null;
          const colors = statusColors[orb.status];
          const isOffline = orb.status === 'offline';

          return (
            <div
              key={i}
              ref={el => { orbRefs.current[i] = el; }}
              className="absolute group"
              style={{
                left: `${layout.xPct}%`,
                top: `${layout.yPct}%`,
                width: layout.size,
                height: layout.size,
                transform: 'translate(-50%, -50%)',
                animation: `drift${i} ${layout.durationSec}s ${layout.delaySec}s ease-in-out infinite alternate`,
                opacity: isOffline ? 0.22 : 1,
                filter: isOffline ? 'grayscale(1)' : 'none',
                cursor: orb.name !== '—' ? 'pointer' : 'default',
                transition: 'opacity 0.5s ease, filter 0.5s ease',
              }}
              tabIndex={orb.name !== '—' ? 0 : -1}
              role="button"
              aria-label={`${orb.name} — ${orb.status}: ${orb.task}`}
            >
              {/* Outer ring */}
              <div
                className={orb.status === 'queued' ? 'animate-orb-queued-ring' : ''}
                style={{
                  position: 'absolute',
                  inset: -5,
                  borderRadius: '50%',
                  border: `1.5px ${orb.status === 'queued' ? 'dashed' : 'solid'} ${colors.ring}`,
                  opacity: 0.5,
                }}
              />

              {/* Core */}
              <div
                className={
                  orb.status === 'working' ? 'animate-orb-pulse' :
                  orb.status === 'blocked' ? 'animate-orb-blocked' : ''
                }
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: colors.bg,
                  border: `1.5px solid ${colors.core}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  transition: 'transform 0.2s ease',
                  userSelect: 'none',
                  padding: '0 4px',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-jetbrains), monospace',
                  fontSize: Math.max(8, Math.min(11, layout.size / 7)),
                  fontWeight: 700,
                  color: colors.core,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  maxWidth: layout.size - 16,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {orb.name !== '—' ? orb.name : '···'}
                </span>
                {/* Status dot */}
                <span style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: colors.core,
                  flexShrink: 0,
                  boxShadow: isOffline ? 'none' : `0 0 6px ${colors.core}`,
                }} />
              </div>

              {/* Tooltip */}
              {orb.name !== '—' && (
                <div
                  className="pointer-events-none absolute opacity-0 group-hover:opacity-100 group-focus:opacity-100"
                  style={{
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%) translateY(-12px)',
                    marginBottom: 8,
                    background: 'rgba(14,18,32,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    minWidth: 160,
                    maxWidth: 220,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                    zIndex: 20,
                    transition: 'opacity 0.2s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {/* Arrow */}
                  <div style={{
                    position: 'absolute',
                    bottom: -5,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: 8,
                    height: 8,
                    background: 'rgba(14,18,32,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderTop: 'none',
                    borderLeft: 'none',
                  }} />
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#e8eaf2', marginBottom: 2 }}>
                    {orb.name}
                    <span style={{ fontWeight: 400, color: '#6b7494' }}> · {orb.role}</span>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-jetbrains), monospace',
                    fontSize: 10,
                    color: '#4a5170',
                    marginBottom: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 196,
                  }}>
                    {orb.task}
                  </div>
                  <span style={{
                    display: 'inline-block',
                    fontSize: 10,
                    fontWeight: 500,
                    padding: '1px 7px',
                    borderRadius: 4,
                    background: `${colors.core}22`,
                    border: `1px solid ${colors.core}44`,
                    color: colors.core,
                    textTransform: 'capitalize',
                  }}>
                    {orb.status}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Screen-reader agent list */}
      <ul className="sr-only">
        {orbs.filter(o => o.name !== '—').map(o => (
          <li key={o.name}>{o.name} — {o.status}: {o.task}</li>
        ))}
      </ul>
    </div>
    </>
  );
}
