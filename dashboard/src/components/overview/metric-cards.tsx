'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconRobot,
  IconChecklist,
  IconShieldCheck,
  IconAlertTriangle,
} from '@tabler/icons-react';

// Animate a number from 0 → target over ~1200ms cubic ease-out
function useCountUp(target: number) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = performance.now();
    const duration = 1200;
    function frame(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el!.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(frame);
      else el!.textContent = String(target);
    }
    requestAnimationFrame(frame);
  }, [target]);
  return ref;
}

// Minimal SVG sparkline
function Sparkline({ color }: { color: string }) {
  const points = [4, 7, 5, 9, 6, 10, 8, 7, 11, 9, 13, 10, 12, 14].map(
    (y, x) => `${x * 5.4},${22 - y}`
  ).join(' ');
  return (
    <svg width="70" height="22" viewBox="0 0 75 22" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  suffixValue?: number;
  delta: React.ReactNode;
  icon: React.ReactNode;
  accentColor: string;
  href?: string;
}

function StatCard({ label, value, suffix, suffixValue, delta, icon, accentColor, href }: StatCardProps) {
  const router = useRouter();
  const valRef = useCountUp(value);

  return (
    <div
      className="relative overflow-hidden rounded-xl cursor-pointer"
      style={{
        padding: '16px 18px',
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'border-color 0.2s ease, transform 0.15s ease',
      }}
      onClick={href ? () => router.push(href) : undefined}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Tinted gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${accentColor}1e 0%, transparent 60%)`,
          borderRadius: 'inherit',
        }}
      />

      {/* Icon chip */}
      <div
        className="absolute"
        style={{
          top: 14,
          right: 14,
          width: 30,
          height: 30,
          borderRadius: 8,
          background: `${accentColor}22`,
          border: `1px solid ${accentColor}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <p style={{
        fontSize: 10,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '1.4px',
        color: '#6b7494',
        marginBottom: 6,
      }}>
        {label}
      </p>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
        <span ref={valRef} style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-1px', color: '#e8eaf2' }}>
          {value}
        </span>
        {suffix && suffixValue !== undefined && (
          <span style={{ fontSize: 16, color: '#6b7494', letterSpacing: '-0.5px' }}>
            / {suffixValue}
          </span>
        )}
      </div>

      {/* Delta */}
      <p style={{ fontSize: 11, color: '#6b7494', marginBottom: 8 }}>{delta}</p>

      {/* Sparkline */}
      <div style={{ position: 'absolute', bottom: 10, right: 14 }}>
        <Sparkline color={accentColor} />
      </div>
    </div>
  );
}

interface MetricCardsProps {
  agentsOnline: number;
  agentsTotal: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksPending: number;
  pendingApprovals: number;
  blockedTasks: number;
}

export function MetricCards({
  agentsOnline,
  agentsTotal,
  tasksCompleted,
  tasksInProgress,
  tasksPending,
  pendingApprovals,
  blockedTasks,
}: MetricCardsProps) {
  const tasksToday = tasksCompleted + tasksInProgress + tasksPending;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 14 }}>
      <StatCard
        label="Agents Online"
        value={agentsOnline}
        suffixValue={agentsTotal}
        delta={
          <span>
            <span style={{ color: '#22c55e' }}>▲ {agentsOnline}</span>
            {' active · '}
            {agentsTotal - agentsOnline} offline
          </span>
        }
        icon={<IconRobot size={14} style={{ color: '#22c55e' }} />}
        accentColor="#22c55e"
        href="/agents"
      />
      <StatCard
        label="Tasks Today"
        value={tasksCompleted}
        suffixValue={tasksToday}
        delta={
          <span>
            <span style={{ color: '#3B82F6' }}>▲ {tasksInProgress}</span>
            {' in progress · '}
            {tasksPending} queued
          </span>
        }
        icon={<IconChecklist size={14} style={{ color: '#3B82F6' }} />}
        accentColor="#3B82F6"
        href="/tasks"
      />
      <StatCard
        label="Approvals"
        value={pendingApprovals}
        delta={
          pendingApprovals === 0
            ? <span style={{ color: '#22c55e' }}>● Queue clear</span>
            : <span><span style={{ color: '#f59e0b' }}>● Awaiting</span> · review needed</span>
        }
        icon={<IconShieldCheck size={14} style={{ color: '#f59e0b' }} />}
        accentColor="#f59e0b"
        href="/approvals"
      />
      <StatCard
        label="Blocked"
        value={blockedTasks}
        delta={
          blockedTasks === 0
            ? <span style={{ color: '#22c55e' }}>▼ No blockers</span>
            : <span><span style={{ color: '#ef4444' }}>▲ {blockedTasks}</span> need attention</span>
        }
        icon={<IconAlertTriangle size={14} style={{ color: '#ef4444' }} />}
        accentColor="#ef4444"
        href="/tasks?status=blocked"
      />
    </div>
  );
}
