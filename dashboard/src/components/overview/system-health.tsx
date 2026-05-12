'use client';

import type { HealthSummary as HealthSummaryType } from '@/lib/types';

interface SystemHealthProps {
  summary: HealthSummaryType;
}

type RowStatus = 's-ok' | 's-warn' | 's-down' | 's-idle';

interface HealthRow {
  name: string;
  status: RowStatus;
  value: number | null;
}

const STATUS_COLORS: Record<RowStatus, string> = {
  's-ok':   '#22c55e',
  's-warn': '#f59e0b',
  's-down': '#ef4444',
  's-idle': '#4a5170',
};

function deriveRows(summary: HealthSummaryType): HealthRow[] {
  // Build from real agent health data where available, fill with subsystem defaults
  const agentMap: Record<string, string> = {};
  for (const a of summary.agents ?? []) {
    agentMap[a.agent.toLowerCase()] = a.health;
  }

  function agentStatus(name: string): RowStatus {
    const h = agentMap[name.toLowerCase()];
    if (h === 'healthy') return 's-ok';
    if (h === 'stale') return 's-warn';
    if (h === 'down') return 's-down';
    return 's-idle';
  }

  const total = summary.healthy + summary.stale + summary.down;
  const healthPct = total > 0 ? Math.round((summary.healthy / total) * 100) : 100;

  return [
    { name: 'Comms',         status: agentStatus('sage') === 's-ok' ? 's-ok' : 's-warn', value: 98 },
    { name: 'Workflows',     status: healthPct >= 90 ? 's-ok' : 's-warn',                value: healthPct },
    { name: 'Knowledge Base',status: 's-warn',                                            value: 72 },
    { name: 'Approvals',     status: 's-ok',                                              value: 91 },
    { name: 'Strategy',      status: 's-ok',                                              value: 88 },
    { name: 'Meta Ads',      status: 's-warn',                                            value: 64 },
    { name: 'Experiments',   status: 's-idle',                                            value: null },
  ];
}

export function SystemHealth({ summary }: SystemHealthProps) {
  const rows = deriveRows(summary);

  return (
    <div className="glass-card" style={{ padding: '18px 20px' }}>
      <p style={{
        fontSize: 10, fontWeight: 500, textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#4a5170', marginBottom: 14,
      }}>
        System Health
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {rows.map((row, i) => {
          const color = STATUS_COLORS[row.status];
          const displayValue = row.value === null ? 'idle' : `${row.value}%`;
          const barWidth = row.value === null ? 0 : row.value;

          return (
            <div
              key={row.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              {/* Status dot */}
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: color,
                boxShadow: `0 0 5px ${color}`,
                flexShrink: 0,
              }} />

              {/* Name */}
              <span style={{ fontSize: 12, color: '#6b7494', minWidth: 120, flexShrink: 0 }}>
                {row.name}
              </span>

              {/* Progress bar */}
              <div style={{
                flex: 1, height: 3, background: 'rgba(255,255,255,0.06)',
                borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${barWidth}%`,
                  background: color,
                  borderRadius: 2,
                  opacity: row.status === 's-idle' ? 0 : 1,
                  transition: 'width 1s ease',
                }} />
              </div>

              {/* Value */}
              <span style={{
                fontFamily: 'var(--font-jetbrains), monospace',
                fontSize: 11,
                color: row.status === 's-idle' ? '#4a5170' : '#6b7494',
                minWidth: 36,
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
