'use client';

import { useEffect, useRef } from 'react';
import type { Task, Event } from '@/lib/types';

const RING_R = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

function ProgressRing({ pct }: { pct: number }) {
  const fgRef = useRef<SVGCircleElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = RING_CIRCUMFERENCE * (1 - pct / 100);
    const labelTarget = pct;
    const start = performance.now();
    const duration = 1300;

    function frame(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      if (fgRef.current) {
        fgRef.current.style.strokeDashoffset = String(
          RING_CIRCUMFERENCE - eased * (RING_CIRCUMFERENCE - target)
        );
      }
      if (labelRef.current) {
        labelRef.current.textContent = String(Math.round(labelTarget * eased));
      }
      if (t < 1) requestAnimationFrame(frame);
      else {
        if (fgRef.current) fgRef.current.style.strokeDashoffset = String(target);
        if (labelRef.current) labelRef.current.textContent = String(labelTarget);
      }
    }
    requestAnimationFrame(frame);
  }, [pct]);

  return (
    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
        {/* Background ring */}
        <circle
          cx="70" cy="70" r={RING_R}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
        />
        {/* Foreground ring */}
        <circle
          ref={fgRef}
          cx="70" cy="70" r={RING_R}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE}
          style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.5))' }}
        />
      </svg>
      {/* Center label */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <span ref={labelRef} style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-1px', color: '#e8eaf2' }}>0</span>
          <span style={{ fontSize: 13, color: '#6b7494' }}>%</span>
        </div>
        <span style={{
          fontSize: 9.5,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '1.2px',
          color: '#4a5170',
          marginTop: 2,
        }}>
          Completed
        </span>
      </div>
    </div>
  );
}

interface TodaysProgressProps {
  completedTasks: Task[];
  milestones: Event[];
  inProgressCount?: number;
  queuedCount?: number;
  blockedCount?: number;
}

export function TodaysProgress({
  completedTasks,
  milestones,
  inProgressCount = 0,
  queuedCount = 0,
  blockedCount = 0,
}: TodaysProgressProps) {
  const total = completedTasks.length + inProgressCount + queuedCount + blockedCount;
  const pct = total > 0 ? Math.round((completedTasks.length / total) * 100) : 0;

  const rows = [
    { label: 'Completed',   value: completedTasks.length, color: '#22c55e' },
    { label: 'In progress', value: inProgressCount,        color: '#3B82F6' },
    { label: 'Queued',      value: queuedCount,            color: '#f59e0b' },
    { label: 'Blocked',     value: blockedCount,           color: '#ef4444' },
  ];

  return (
    <div className="glass-card" style={{ padding: '18px 20px' }}>
      <p style={{
        fontSize: 10,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: '#4a5170',
        marginBottom: 16,
      }}>
        Today&apos;s Progress
      </p>

      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <ProgressRing pct={pct} />

        {/* Stat rows */}
        <div style={{ flex: 1 }}>
          {rows.map((row, i) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 0',
                borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: row.color,
                flexShrink: 0,
                boxShadow: `0 0 4px ${row.color}`,
              }} />
              <span style={{ flex: 1, fontSize: 12, color: '#6b7494' }}>{row.label}</span>
              <span style={{
                fontFamily: 'var(--font-jetbrains), monospace',
                fontSize: 12,
                fontWeight: 500,
                color: '#e8eaf2',
              }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
