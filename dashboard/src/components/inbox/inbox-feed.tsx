'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  IconMail, IconBrandSlack, IconBrandAsana, IconCalendar, IconBrain,
  IconCheck, IconX, IconLoader2, IconAlertTriangle, IconClock,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { InboxItem, InboxCategory } from '@/lib/data/inbox';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TABS: { key: InboxCategory; label: string }[] = [
  { key: 'all',             label: 'All' },
  { key: 'urgent',          label: 'Urgent' },
  { key: 'needs_attention', label: 'Needs Attention' },
  { key: 'decision',        label: 'Decision' },
  { key: 'fyi',             label: 'FYI' },
];

const URGENCY_CONFIG = {
  urgent:    { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  label: 'Urgent' },
  important: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: 'Important' },
  normal:    { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', label: 'Normal' },
};

const SOURCE_CONFIG: Record<string, { Icon: React.ComponentType<{size?: number; className?: string}>; label: string; color: string }> = {
  gmail:    { Icon: IconMail,         label: 'Gmail',    color: '#ea4335' },
  slack:    { Icon: IconBrandSlack,   label: 'Slack',    color: '#4a154b' },
  asana:    { Icon: IconBrandAsana,   label: 'Asana',    color: '#f06a6a' },
  calendar: { Icon: IconCalendar,     label: 'Calendar', color: '#3B82F6' },
  brain:    { Icon: IconBrain,        label: 'Sage Brain', color: '#a78bfa' },
};

function timeAgo(dateStr: string): string {
  const d = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(d / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Inbox Item Component
// ---------------------------------------------------------------------------

function InboxItemRow({
  item,
  onDone,
  onDismiss,
}: {
  item: InboxItem;
  onDone: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const urgency = URGENCY_CONFIG[item.urgency as keyof typeof URGENCY_CONFIG] ?? URGENCY_CONFIG.normal;
  const source = item.source ? (SOURCE_CONFIG[item.source] ?? null) : null;
  const [expanded, setExpanded] = useState(item.urgency === 'urgent');

  return (
    <div
      className="glass-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        borderColor: item.urgency === 'urgent' ? 'rgba(239,68,68,0.25)' : undefined,
      }}
    >
      <div style={{ padding: '14px 16px' }}>
        {/* Top row: badges + time + stale */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {/* Urgency badge */}
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
            padding: '2px 8px', borderRadius: 4,
            background: urgency.bg, border: `1px solid ${urgency.border}`,
            color: urgency.color, flexShrink: 0,
          }}>
            {urgency.label}
          </span>

          {/* Source badge */}
          {source && (
            <span style={{
              fontSize: 9, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#6b7494', display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              <source.Icon size={9} />
              {source.label}
            </span>
          )}

          {/* Stale flag */}
          {item.is_stale && (
            <span style={{
              fontSize: 9, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
              color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              <IconClock size={9} />
              Stale
            </span>
          )}

          <span style={{
            marginLeft: 'auto', fontSize: 10,
            fontFamily: 'var(--font-jetbrains, monospace)', color: '#4a5170',
          }}>
            {timeAgo(item.created_at)}
          </span>
        </div>

        {/* Summary */}
        <p
          style={{ fontSize: 13, fontWeight: 500, color: '#e8eaf2', margin: 0, lineHeight: 1.5, cursor: 'pointer' }}
          onClick={() => setExpanded(v => !v)}
        >
          {item.summary}
        </p>

        {/* Expanded details */}
        {expanded && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {item.why && (
              <p style={{ fontSize: 12, color: '#6b7494', margin: 0, lineHeight: 1.6 }}>
                <span style={{ color: '#4a5170', fontWeight: 600 }}>Why: </span>
                {item.why}
              </p>
            )}
            {item.suggested_action && (
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)',
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</p>
                <p style={{ fontSize: 12, color: '#e8eaf2', margin: 0, lineHeight: 1.5 }}>{item.suggested_action}</p>
              </div>
            )}
            {item.topic_keywords && item.topic_keywords.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {item.topic_keywords.map(kw => (
                  <span key={kw} style={{
                    fontSize: 9, padding: '1px 7px', borderRadius: 4,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#4a5170',
                  }}>
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => onDone(item.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500,
              background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
              color: '#22c55e', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <IconCheck size={12} />
            Mark Done
          </button>
          <button
            onClick={() => onDismiss(item.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#6b7494', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <IconX size={12} />
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Inbox Feed
// ---------------------------------------------------------------------------

export function InboxFeed() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedTab, setSelectedTab] = useState<InboxCategory>('all');
  const [last30, setLast30] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async (tab: InboxCategory, l30: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ category: tab });
    if (l30) params.set('last30', 'true');
    const [itemsRes, countsRes] = await Promise.all([
      fetch(`/api/inbox?${params}`).then(r => r.json()).catch(() => ({ items: [] })),
      fetch('/api/inbox?action=counts').then(r => r.json()).catch(() => ({ counts: {} })),
    ]);
    setItems(itemsRes.items ?? []);
    setCounts(countsRes.counts ?? {});
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(selectedTab, last30); }, [selectedTab, last30, fetchItems]);

  const handleDone = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setCounts(prev => ({ ...prev, all: Math.max(0, (prev.all ?? 0) - 1) }));
    await fetch(`/api/inbox/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'done' }),
    });
  };

  const handleDismiss = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setCounts(prev => ({ ...prev, all: Math.max(0, (prev.all ?? 0) - 1) }));
    await fetch(`/api/inbox/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss' }),
    });
  };

  const urgentCount = counts.urgent ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tabs + age filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(tab => {
            const count = tab.key === 'urgent' ? urgentCount : (tab.key === 'all' ? counts.all : counts[tab.key]);
            const active = selectedTab === tab.key;
            const isUrgent = tab.key === 'urgent' && urgentCount > 0;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                  cursor: 'pointer',
                  border: `1px solid ${active
                    ? isUrgent ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)'
                    : 'rgba(255,255,255,0.08)'}`,
                  background: active
                    ? isUrgent ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.1)'
                    : 'rgba(255,255,255,0.03)',
                  color: active
                    ? isUrgent ? '#ef4444' : '#3B82F6'
                    : '#6b7494',
                  transition: 'all 0.15s',
                }}
              >
                {isUrgent && <IconAlertTriangle size={10} />}
                {tab.label}
                {count != null && count > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '0 5px', borderRadius: 8, minWidth: 16, textAlign: 'center',
                    background: active ? (isUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)') : 'rgba(255,255,255,0.08)',
                    color: active ? (isUrgent ? '#ef4444' : '#3B82F6') : '#6b7494',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setLast30(v => !v)}
          style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
            border: `1px solid ${last30 ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
            background: last30 ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
            color: last30 ? '#3B82F6' : '#6b7494',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {last30 ? 'Last 30 Days' : 'All Time'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <IconLoader2 size={22} className="animate-spin" style={{ color: '#4a5170' }} />
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <IconCheck size={28} style={{ color: '#22c55e', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 13, color: '#4a5170', margin: 0 }}>
            {selectedTab === 'urgent' ? 'No urgent items.' : 'Inbox clear.'}
          </p>
        </div>
      )}

      {/* Items */}
      {!loading && items.map(item => (
        <InboxItemRow
          key={item.id}
          item={item}
          onDone={handleDone}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}
