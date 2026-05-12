'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useSSE } from '@/hooks/use-sse';
import type { Event, SSEEvent } from '@/lib/types';

interface DisplayEvent {
  id: string;
  timestamp: string;
  type: string;
  agent: string;
  message: string;
}

function sseToDisplayEvent(sse: SSEEvent, index: number): DisplayEvent {
  return {
    id: `sse-${sse.timestamp}-${index}`,
    timestamp: sse.timestamp,
    type: sse.type ?? 'event',
    agent: (sse.data?.agent as string) ?? '',
    message: (sse.data?.message as string) ?? sse.type ?? 'Event',
  };
}

function eventToDisplayEvent(event: Event): DisplayEvent {
  return {
    id: event.id,
    timestamp: event.timestamp,
    type: event.type,
    agent: event.agent,
    message: event.message ?? event.category ?? event.type,
  };
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch { return '--:--:--'; }
}

const AGENT_COLORS: Record<string, string> = {
  sage:    '#3B82F6',
  dev:     '#2dd4bf',
  analyst: '#f59e0b',
  ana:     '#f59e0b',
};

function agentColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(AGENT_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return '#6b7494';
}

interface LiveActivityProps {
  initialEvents: Event[];
}

export function LiveActivity({ initialEvents }: LiveActivityProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [liveEvents, setLiveEvents] = useState<DisplayEvent[]>([]);

  const { events: sseEvents, isConnected } = useSSE({ bufferSize: 20 });

  useEffect(() => {
    if (sseEvents.length > 0) {
      const mapped = sseEvents.map(sseToDisplayEvent);
      setLiveEvents(mapped);
      const ids = new Set(mapped.slice(0, 3).map(e => e.id));
      setNewIds(ids);
      setTimeout(() => setNewIds(new Set()), 1000);
    }
  }, [sseEvents]);

  const allEvents = [...liveEvents, ...initialEvents.map(eventToDisplayEvent)];
  const seen = new Set<string>();
  const displayEvents = allEvents
    .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 18);

  return (
    <div className="glass-card flex flex-col" style={{ padding: '18px 20px', minHeight: 360 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="animate-live-pulse"
            style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', display: 'inline-block', flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#e8eaf2' }}>Live Activity Feed</span>
        </div>
        <span style={{ fontSize: 11, color: '#4a5170', fontFamily: 'var(--font-jetbrains), monospace' }}>
          Last 24h ·{' '}
          <span style={{ color: isConnected ? '#2dd4bf' : '#f59e0b' }}>
            {isConnected ? 'streaming' : 'reconnecting'}
          </span>
        </span>
      </div>

      {/* Feed */}
      <div ref={scrollRef} style={{ flex: 1, maxHeight: 360, overflowY: 'auto' }}>
        {displayEvents.length === 0 ? (
          <p style={{ fontSize: 12, color: '#4a5170', textAlign: 'center', padding: '24px 0' }}>
            Agents are starting up. Activity will appear here.
          </p>
        ) : (
          displayEvents.map(event => {
            const color = agentColor(event.agent);
            const isNew = newIds.has(event.id);
            return (
              <div
                key={event.id}
                className={isNew ? 'animate-slide-up' : ''}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 90px 1fr',
                  alignItems: 'flex-start',
                  padding: '11px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'default',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: 10.5, color: '#4a5170', paddingTop: 1 }}>
                  {formatTime(event.timestamp)}
                </span>
                <span style={{
                  fontFamily: 'var(--font-jetbrains), monospace', fontSize: 10,
                  color, background: `${color}18`, border: `1px solid ${color}33`,
                  borderRadius: 4, padding: '1px 6px', alignSelf: 'flex-start',
                  display: 'inline-block', maxWidth: 80, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {event.agent || '—'}
                </span>
                <span style={{
                  fontFamily: 'var(--font-jetbrains), monospace', fontSize: 11.5,
                  color: '#6b7494', lineHeight: 1.5, paddingLeft: 8,
                }}>
                  {event.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
