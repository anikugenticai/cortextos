import Link from 'next/link';
import type { Task } from '@/lib/types';

interface UpcomingQueueProps {
  tasks: Task[];
  total?: number;
}

const PRIORITY_COLORS: Record<string, { color: string; label: string }> = {
  critical: { color: '#ef4444', label: 'P1' },
  urgent:   { color: '#ef4444', label: 'P1' },
  high:     { color: '#ef4444', label: 'P1' },
  normal:   { color: '#f59e0b', label: 'P2' },
  low:      { color: '#3B82F6', label: 'P3' },
};

function priorityInfo(task: Task) {
  const p = (task.priority ?? 'normal').toLowerCase();
  return PRIORITY_COLORS[p] ?? PRIORITY_COLORS.normal;
}

function formatCreated(task: Task): string {
  try {
    const d = new Date(task.created_at);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

export function UpcomingQueue({ tasks, total }: UpcomingQueueProps) {
  const displayed = tasks.slice(0, 3);
  const totalCount = total ?? tasks.length;

  return (
    <div className="glass-card" style={{ padding: '18px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{
          fontSize: 10, fontWeight: 500, textTransform: 'uppercase',
          letterSpacing: '1.2px', color: '#4a5170', margin: 0,
        }}>
          Upcoming Queue
        </p>
        {totalCount > 0 && (
          <Link
            href="/tasks"
            style={{ fontSize: 11, color: '#4a5170', textDecoration: 'none', fontFamily: 'var(--font-jetbrains), monospace' }}
          >
            Next 3 of {totalCount}
          </Link>
        )}
      </div>

      {displayed.length === 0 ? (
        <p style={{ fontSize: 12, color: '#4a5170', textAlign: 'center', padding: '12px 0' }}>
          Queue is clear.
        </p>
      ) : (
        <div>
          {displayed.map((task, i) => {
            const { color, label } = priorityInfo(task);
            return (
              <Link
                key={task.id}
                href={`/tasks`}
                style={{
                  display: 'block', textDecoration: 'none',
                  padding: '10px 0',
                  borderBottom: i < displayed.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {/* Priority chip */}
                  <span style={{
                    fontSize: 9, fontWeight: 600,
                    padding: '2px 6px', borderRadius: 4,
                    background: `${color}20`, border: `1px solid ${color}44`,
                    color, flexShrink: 0,
                    fontFamily: 'var(--font-jetbrains), monospace',
                  }}>
                    {label}
                  </span>
                  {/* Title */}
                  <span style={{
                    fontSize: 12.5, fontWeight: 400, color: '#e8eaf2',
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {task.title}
                  </span>
                </div>
                {/* Meta */}
                <span style={{
                  fontFamily: 'var(--font-jetbrains), monospace',
                  fontSize: 10, color: '#4a5170',
                  paddingLeft: 2,
                }}>
                  {task.assignee?.toUpperCase() ?? '—'}
                  {` · ${formatCreated(task)}`}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
