'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  IconAlertTriangle, IconTrendingUp, IconGitMerge,
  IconX, IconChevronDown, IconChevronRight, IconLoader2,
  IconBrandSlack, IconMail, IconBrandAsana, IconCalendar,
  IconThumbUp, IconThumbDown, IconCheck, IconStar,
  IconBolt, IconArrowUp, IconExchange, IconMoodSmile,
  IconBug, IconFileText,
} from '@tabler/icons-react';
import type { IntelSignal, SignalType, SignalUrgency, EvidenceEvent } from '@/lib/data/intel-signals';

const SIGNAL_TYPES: Record<SignalType, { label: string; Icon: React.ComponentType<{size?: number; style?: React.CSSProperties}>; color: string }> = {
  keyword_alert:  { label: 'Alert',         Icon: IconAlertTriangle, color: '#ef4444' },
  rate_spike:     { label: 'Rate Spike',    Icon: IconTrendingUp,    color: '#f59e0b' },
  state_diff:     { label: 'State Change',  Icon: IconGitMerge,      color: '#3B82F6' },
  bottleneck:     { label: 'Bottleneck',    Icon: IconBolt,          color: '#f97316' },
  escalation:     { label: 'Escalation',    Icon: IconArrowUp,       color: '#ef4444' },
  contradiction:  { label: 'Contradiction', Icon: IconExchange,      color: '#a78bfa' },
  kudos:          { label: 'Kudos',         Icon: IconMoodSmile,     color: '#22c55e' },
  anomaly:        { label: 'Anomaly',       Icon: IconBug,           color: '#ec4899' },
};

const URGENCY_CONFIG: Record<SignalUrgency, { text: string; color: string }> = {
  immediate: { text: 'NOW',       color: '#ef4444' },
  today:     { text: 'TODAY',     color: '#f59e0b' },
  this_week: { text: 'THIS WEEK', color: '#3B82F6' },
  fyi:       { text: 'FYI',       color: '#6b7494' },
};

const SOURCE_ICONS: Record<string, React.ComponentType<{size?: number; className?: string}>> = {
  slack:    IconBrandSlack,
  email:    IconMail,
  asana:    IconBrandAsana,
  calendar: IconCalendar,
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.8 ? '#22c55e' : value >= 0.6 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 9, color: '#4a5170', textTransform: 'uppercase', letterSpacing: '0.5px', width: 60, flexShrink: 0 }}>Confidence</span>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 9, color: '#4a5170', fontFamily: 'var(--font-jetbrains, monospace)', width: 28, flexShrink: 0 }}>{pct}%</span>
    </div>
  );
}

function EvidencePanel({ events, loading }: { events: EvidenceEvent[]; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 8, color: '#4a5170', fontSize: 11 }}>
        <IconLoader2 size={12} className="animate-spin" /> Loading evidence...
      </div>
    );
  }
  if (!events.length) {
    return <p style={{ fontSize: 11, color: '#4a5170', padding: '8px 0' }}>No evidence events found.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
      <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#4a5170', marginBottom: 2 }}>
        Evidence ({events.length} raw events)
      </p>
      {events.map(ev => {
        const SourceIcon = SOURCE_ICONS[ev.source] ?? IconFileText;
        return (
          <div key={ev.id} style={{
            padding: '8px 10px', borderRadius: 6,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <SourceIcon size={11} className="" />
              <span style={{ fontSize: 10, color: '#6b7494', fontWeight: 500 }}>{ev.actor ?? 'Unknown'}</span>
              <span style={{ fontSize: 10, color: '#4a5170' }}>in {ev.channel_or_project ?? 'unknown'}</span>
              <span style={{ fontSize: 9, color: '#4a5170', marginLeft: 'auto', fontFamily: 'var(--font-jetbrains, monospace)' }}>
                {relativeTime(ev.timestamp)}
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: '#9ca3c4', lineHeight: 1.5, margin: 0 }}>
              {ev.content_plain ?? '(no content)'}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function IntelCard({
  signal,
  expanded,
  onToggle,
  onDismiss,
  onDone,
  onFeedback,
}: {
  signal: IntelSignal;
  expanded: boolean;
  onToggle: () => void;
  onDismiss: (id: string) => void;
  onDone: (id: string) => void;
  onFeedback: (id: string, useful: boolean) => void;
}) {
  const [evidence, setEvidence] = useState<EvidenceEvent[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [evidenceLoaded, setEvidenceLoaded] = useState(false);

  const st = SIGNAL_TYPES[signal.signal_type] ?? SIGNAL_TYPES.anomaly;
  const urg = URGENCY_CONFIG[signal.urgency] ?? URGENCY_CONFIG.fyi;

  useEffect(() => {
    if (expanded && !evidenceLoaded) {
      setLoadingEvidence(true);
      fetch(`/api/intel/${signal.id}/evidence`)
        .then(r => r.json())
        .then(data => {
          setEvidence(data.events ?? []);
          setEvidenceLoaded(true);
        })
        .catch(() => setEvidence([]))
        .finally(() => setLoadingEvidence(false));
    }
  }, [expanded, evidenceLoaded, signal.id]);

  return (
    <div
      className="glass-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        borderColor: signal.urgency === 'immediate' ? '#ef444444' : undefined,
        background: signal.urgency === 'immediate'
          ? 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(255,255,255,0.02))'
          : undefined,
      }}
    >
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
        onClick={onToggle}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${st.color}18`, border: `1px solid ${st.color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <st.Icon size={15} style={{ color: st.color }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px',
              padding: '1px 7px', borderRadius: 4,
              background: `${st.color}18`, border: `1px solid ${st.color}33`,
              color: st.color, flexShrink: 0,
            }}>
              {st.label}
            </span>
            <span style={{
              fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
              padding: '1px 6px', borderRadius: 4,
              background: `${urg.color}18`, border: `1px solid ${urg.color}44`,
              color: urg.color, flexShrink: 0,
            }}>
              {urg.text}
            </span>
            {signal.evidence_refs.length > 0 && (
              <span style={{ fontSize: 9, color: '#4a5170' }}>
                {signal.evidence_refs.length} evidence
              </span>
            )}
            <span style={{ fontSize: 10, color: '#4a5170', marginLeft: 'auto', flexShrink: 0 }}>
              {relativeTime(signal.created_at)}
            </span>
          </div>
          <p style={{ fontSize: 13.5, fontWeight: 500, color: '#e8eaf2', margin: 0, lineHeight: 1.4 }}>
            {signal.headline}
          </p>
          {signal.body && !expanded && (
            <p style={{ fontSize: 11.5, color: '#6b7494', margin: '4px 0 0', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {signal.body}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onFeedback(signal.id, true); }}
            title="Useful"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: signal.feedback === 'useful' ? '#22c55e' : '#4a5170',
              transition: 'color 0.15s',
            }}
          >
            <IconThumbUp size={13} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onFeedback(signal.id, false); }}
            title="Not useful"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: signal.feedback === 'not_useful' ? '#ef4444' : '#4a5170',
              transition: 'color 0.15s',
            }}
          >
            <IconThumbDown size={13} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDone(signal.id); }}
            title="Mark done"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#4a5170', transition: 'color 0.15s' }}
          >
            <IconCheck size={14} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDismiss(signal.id); }}
            title="Dismiss"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#4a5170' }}
          >
            <IconX size={14} />
          </button>
          {expanded
            ? <IconChevronDown size={14} style={{ color: '#4a5170' }} />
            : <IconChevronRight size={14} style={{ color: '#4a5170' }} />
          }
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ConfidenceBar value={signal.confidence} />
          </div>

          {signal.body && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#4a5170', marginBottom: 4 }}>Details</p>
              <p style={{ fontSize: 12.5, color: '#9ca3c4', lineHeight: 1.6, margin: 0 }}>{signal.body}</p>
            </div>
          )}

          {signal.why_now && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#4a5170', marginBottom: 4 }}>Why Now</p>
              <p style={{ fontSize: 12.5, color: '#9ca3c4', lineHeight: 1.6, margin: 0 }}>{signal.why_now}</p>
            </div>
          )}

          {signal.suggested_action && (
            <div
              style={{
                padding: '10px 12px', borderRadius: 8, marginBottom: 10,
                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
              }}
            >
              <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#3B82F6', marginBottom: 4 }}>Suggested Action</p>
              <p style={{ fontSize: 12.5, color: '#e8eaf2', lineHeight: 1.6, margin: 0 }}>{signal.suggested_action}</p>
            </div>
          )}

          {signal.entity_refs.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
              {signal.entity_refs.map((entity, i) => (
                <span key={i} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 4,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#9ca3c4',
                }}>
                  {entity}
                </span>
              ))}
            </div>
          )}

          <EvidencePanel events={evidence} loading={loadingEvidence} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 10, color: '#4a5170', fontFamily: 'var(--font-jetbrains, monospace)', marginLeft: 'auto' }}>
              {relativeTime(signal.created_at)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function IntelFeed() {
  const [signals, setSignals] = useState<IntelSignal[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SignalUrgency | 'all'>('all');

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/intel').then(r => r.json()).catch(() => ({ signals: [] }));
    setSignals(res.signals ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const patchSignal = async (id: string, action: string) => {
    const res = await fetch(`/api/intel/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) fetchSignals();
  };

  const handleDismiss = async (id: string) => {
    setSignals(prev => prev.filter(s => s.id !== id));
    await patchSignal(id, 'dismiss');
  };

  const handleDone = async (id: string) => {
    setSignals(prev => prev.filter(s => s.id !== id));
    await patchSignal(id, 'done');
  };

  const handleFeedback = async (id: string, useful: boolean) => {
    const feedback = useful ? 'useful' as const : 'not_useful' as const;
    setSignals(prev => prev.map(s => s.id === id ? { ...s, feedback } : s));
    await patchSignal(id, useful ? 'feedback_useful' : 'feedback_not_useful');
  };

  const filtered = filter === 'all' ? signals : signals.filter(s => s.urgency === filter);

  const urgencyCounts: Record<string, number> = { all: signals.length };
  for (const s of signals) {
    urgencyCounts[s.urgency] = (urgencyCounts[s.urgency] ?? 0) + 1;
  }

  const FILTERS: { key: SignalUrgency | 'all'; label: string; color: string; Icon: React.ComponentType<{size?: number; style?: React.CSSProperties}> }[] = [
    { key: 'all',       label: 'All',       color: '#6b7494', Icon: IconStar },
    { key: 'immediate', label: 'Now',       color: '#ef4444', Icon: IconAlertTriangle },
    { key: 'today',     label: 'Today',     color: '#f59e0b', Icon: IconBolt },
    { key: 'this_week', label: 'This Week', color: '#3B82F6', Icon: IconTrendingUp },
    { key: 'fyi',       label: 'FYI',       color: '#6b7494', Icon: IconFileText },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Urgency filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const count = urgencyCounts[f.key] ?? 0;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 20,
                fontSize: 11, fontWeight: 500, cursor: 'pointer',
                border: `1px solid ${active ? f.color + '66' : 'rgba(255,255,255,0.08)'}`,
                background: active ? `${f.color}18` : 'rgba(255,255,255,0.03)',
                color: active ? f.color : '#6b7494',
                transition: 'all 0.15s',
              }}
            >
              <f.Icon size={11} style={{ color: active ? f.color : '#6b7494' }} />
              {f.label}
              {count > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '0 5px', borderRadius: 8,
                  background: active ? `${f.color}33` : 'rgba(255,255,255,0.08)',
                  color: active ? f.color : '#6b7494',
                  minWidth: 16, textAlign: 'center',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <IconLoader2 size={22} className="animate-spin" style={{ color: '#4a5170' }} />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#4a5170' }}>
            {signals.length === 0
              ? 'No intelligence signals yet. Signals will appear here as monitors detect patterns.'
              : 'No signals match this filter.'}
          </p>
        </div>
      )}

      {!loading && filtered.map(signal => (
        <IntelCard
          key={signal.id}
          signal={signal}
          expanded={expandedIds.has(signal.id)}
          onToggle={() => toggleExpand(signal.id)}
          onDismiss={handleDismiss}
          onDone={handleDone}
          onFeedback={handleFeedback}
        />
      ))}
    </div>
  );
}
