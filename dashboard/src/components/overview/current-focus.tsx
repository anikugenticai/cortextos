import Link from 'next/link';
import { IconAlertTriangle } from '@tabler/icons-react';
import { BottleneckEditor } from './bottleneck-editor';
import type { Goal } from '@/lib/types';

interface CurrentFocusProps {
  org: string;
  bottleneck: string;
  goals: Goal[];
}

export function CurrentFocus({ org, bottleneck, goals }: CurrentFocusProps) {
  const topGoals = goals.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, 4);

  return (
    <div
      className="glass-card"
      style={{ padding: '18px 20px' }}
    >
      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        {/* Left: Bottleneck */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1.5 rounded-md px-2 py-0.5"
              style={{
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.25)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.8px',
                color: '#f59e0b',
                textTransform: 'uppercase',
              }}
            >
              <IconAlertTriangle size={10} />
              Bottleneck · This week
            </span>
          </div>

          <div className="flex-1">
            <BottleneckEditor org={org} initialValue={bottleneck} />
          </div>

          <Link
            href="/strategy"
            style={{
              display: 'inline-block',
              alignSelf: 'flex-start',
              fontSize: 12,
              fontWeight: 500,
              color: '#3B82F6',
              textDecoration: 'none',
              padding: '5px 12px',
              borderRadius: 6,
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              transition: 'background 0.15s ease',
            }}
          >
            Route to strategy →
          </Link>
        </div>

        {/* Right: Active Goals */}
        <div>
          <p style={{
            fontSize: 10,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '1.2px',
            color: '#4a5170',
            marginBottom: 10,
          }}>
            Active Goals
          </p>

          {topGoals.length === 0 ? (
            <p style={{ fontSize: 12, color: '#6b7494' }}>
              No goals yet.{' '}
              <Link href="/strategy" style={{ color: '#3B82F6' }}>Add in Strategy.</Link>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topGoals.map((goal, i) => {
                const pct = Math.min(Math.max(Math.round(goal.progress ?? 0), 0), 100);
                return (
                  <div key={goal.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontFamily: 'var(--font-jetbrains), monospace',
                        fontSize: 10,
                        color: '#4a5170',
                        minWidth: 18,
                      }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span style={{ flex: 1, fontSize: 12, color: '#e8eaf2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {goal.title}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-jetbrains), monospace',
                        fontSize: 11,
                        color: '#6b7494',
                        minWidth: 32,
                        textAlign: 'right',
                      }}>
                        {pct}%
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #3B82F6, #2dd4bf)',
                        borderRadius: 2,
                        boxShadow: '0 0 6px rgba(59,130,246,0.4)',
                        transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
