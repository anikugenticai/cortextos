'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  IconUsers, IconHome, IconUserScan, IconGitMerge,
  IconCalendar, IconTrendingUp, IconPin, IconPinnedOff,
  IconX, IconChevronDown, IconChevronRight, IconLoader2,
  IconBrandSlack, IconMail, IconBrandAsana, IconBrain,
  IconThumbUp, IconThumbDown, IconCheck,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { IntelItem, IntelCategory } from '@/lib/data/intel';

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORIES: { key: IntelCategory | 'all'; label: string; Icon: React.ComponentType<{size?: number; className?: string; style?: React.CSSProperties}>; color: string }[] = [
  { key: 'all',           label: 'All',           Icon: IconTrendingUp,  color: '#6b7494' },
  { key: 'people_radar',  label: 'People Radar',  Icon: IconUsers,       color: '#2dd4bf' },
  { key: 'your_space',    label: 'Your Space',    Icon: IconHome,        color: '#3B82F6' },
  { key: 'people_intel',  label: 'People Intel',  Icon: IconUserScan,    color: '#a78bfa' },
  { key: 'dot_connector', label: 'Dot Connector', Icon: IconGitMerge,    color: '#f59e0b' },
  { key: 'meeting_prep',  label: 'Meeting Prep',  Icon: IconCalendar,    color: '#22c55e' },
  { key: 'business_pulse',label: 'Business Pulse',Icon: IconTrendingUp,  color: '#f97316' },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

const SOURCE_ICONS: Record<string, React.ComponentType<{size?: number; className?: string}>> = {
  gmail:    IconMail,
  slack:    IconBrandSlack,
  asana:    IconBrandAsana,
  calendar: IconCalendar,
  brain:    IconBrain,
};

function urgencyLabel(urgency: number): { text: string; color: string } | null {
  if (urgency >= 0.9) return { text: 'NOW', color: '#ef4444' };
  if (urgency >= 0.7) return { text: 'URGENT', color: '#f59e0b' };
  if (urgency >= 0.5) return { text: 'THIS WEEK', color: '#3B82F6' };
  return null;
}

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

// ---------------------------------------------------------------------------
// Meeting Prep Banner
// ---------------------------------------------------------------------------

function MeetingPrepBanner({ item, onExpand }: { item: IntelItem; onExpand: () => void }) {
  return (
    <div
      className="glass-card cursor-pointer"
      style={{
        padding: '14px 18px',
        borderColor: '#22c55e44',
        background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))',
        marginBottom: 4,
      }}
      onClick={onExpand}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0,
          boxShadow: '0 0 8px #22c55e',
          animation: 'pulse-dot 2s ease-in-out infinite',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 }}>
            Meeting Prep Ready
          </p>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#e8eaf2', margin: 0 }}>{item.title}</p>
          {item.why_now && (
            <p style={{ fontSize: 11, color: '#6b7494', marginTop: 2 }}>{item.why_now}</p>
          )}
        </div>
        <span style={{
          fontSize: 10, padding: '3px 10px', borderRadius: 6,
          background: '#22c55e20', border: '1px solid #22c55e44',
          color: '#22c55e', fontWeight: 600, flexShrink: 0,
        }}>
          View Brief
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score bar
// ---------------------------------------------------------------------------

function ScoreBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 9, color: '#4a5170', textTransform: 'uppercase', letterSpacing: '0.5px', width: 56, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${value * 100}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 9, color: '#4a5170', fontFamily: 'var(--font-jetbrains, monospace)', width: 24, flexShrink: 0 }}>
        {(value * 10).toFixed(0)}/10
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Intel Card
// ---------------------------------------------------------------------------

function IntelCard({
  item,
  expanded: controlledExpanded,
  onToggle,
  onPin,
  onDismiss,
  onDone,
  onFeedback,
}: {
  item: IntelItem;
  expanded?: boolean;
  onToggle: () => void;
  onPin: (id: string, pinned: boolean) => void;
  onDismiss: (id: string) => void;
  onDone: (id: string) => void;
  onFeedback: (id: string, useful: boolean) => void;
}) {
  const cat = CATEGORY_MAP[item.category] ?? CATEGORY_MAP.all;
  const SourceIcon = item.source ? (SOURCE_ICONS[item.source] ?? IconBrain) : null;
  const urg = urgencyLabel(item.urgency);

  return (
    <div
      className="glass-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        borderColor: item.pinned ? `${cat.color}44` : undefined,
        background: item.pinned
          ? `linear-gradient(135deg, ${cat.color}08, rgba(255,255,255,0.02))`
          : undefined,
      }}
    >
      {/* Header row (always visible) */}
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
        onClick={onToggle}
      >
        {/* Category icon */}
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${cat.color}18`, border: `1px solid ${cat.color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <cat.Icon size={15} style={{ color: cat.color }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px',
              padding: '1px 7px', borderRadius: 4,
              background: `${cat.color}18`, border: `1px solid ${cat.color}33`,
              color: cat.color, flexShrink: 0,
            }}>
              {cat.label}
            </span>
            {urg && (
              <span style={{
                fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
                padding: '1px 6px', borderRadius: 4,
                background: `${urg.color}18`, border: `1px solid ${urg.color}44`,
                color: urg.color, flexShrink: 0,
              }}>
                {urg.text}
              </span>
            )}
            {item.pinned && (
              <span style={{ fontSize: 9, color: cat.color }}>· Pinned</span>
            )}
            <span style={{ fontSize: 10, color: '#4a5170', marginLeft: 'auto', flexShrink: 0 }}>
              {relativeTime(item.created_at)}
            </span>
          </div>
          <p style={{ fontSize: 13.5, fontWeight: 500, color: '#e8eaf2', margin: 0, lineHeight: 1.4 }}>
            {item.title}
          </p>
          {item.why_now && !controlledExpanded && (
            <p style={{ fontSize: 11.5, color: '#6b7494', margin: '4px 0 0', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {item.why_now}
            </p>
          )}
        </div>

        {/* Actions + expand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onFeedback(item.id, true); }}
            title="Useful"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: item.feedback === 'useful' ? '#22c55e' : '#4a5170',
              transition: 'color 0.15s',
            }}
          >
            <IconThumbUp size={13} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onFeedback(item.id, false); }}
            title="Not useful"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: item.feedback === 'not_useful' ? '#ef4444' : '#4a5170',
              transition: 'color 0.15s',
            }}
          >
            <IconThumbDown size={13} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDone(item.id); }}
            title="Mark done"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#4a5170', transition: 'color 0.15s' }}
          >
            <IconCheck size={14} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onPin(item.id, !item.pinned); }}
            title={item.pinned ? 'Unpin' : 'Pin'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: item.pinned ? cat.color : '#4a5170',
              transition: 'color 0.15s',
            }}
          >
            {item.pinned ? <IconPinnedOff size={14} /> : <IconPin size={14} />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDismiss(item.id); }}
            title="Dismiss"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#4a5170' }}
          >
            <IconX size={14} />
          </button>
          {controlledExpanded
            ? <IconChevronDown size={14} style={{ color: '#4a5170' }} />
            : <IconChevronRight size={14} style={{ color: '#4a5170' }} />
          }
        </div>
      </div>

      {/* Expanded content */}
      {controlledExpanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Score bars */}
          <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ScoreBar value={item.importance} color="#3B82F6" label="Importance" />
            <ScoreBar value={item.urgency} color="#f59e0b" label="Urgency" />
          </div>

          {item.why_now && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#4a5170', marginBottom: 4 }}>Why Now</p>
              <p style={{ fontSize: 12.5, color: '#9ca3c4', lineHeight: 1.6, margin: 0 }}>{item.why_now}</p>
            </div>
          )}

          {item.why_it_matters && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#4a5170', marginBottom: 4 }}>Why It Matters</p>
              <p style={{ fontSize: 12.5, color: '#9ca3c4', lineHeight: 1.6, margin: 0 }}>{item.why_it_matters}</p>
            </div>
          )}

          {item.suggested_action && (
            <div
              style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
              }}
            >
              <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#3B82F6', marginBottom: 4 }}>Suggested Action</p>
              <p style={{ fontSize: 12.5, color: '#e8eaf2', lineHeight: 1.6, margin: 0 }}>{item.suggested_action}</p>
            </div>
          )}

          {/* Source + date footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            {SourceIcon && item.source && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#4a5170' }}>
                <SourceIcon size={11} />
                {item.source}
              </span>
            )}
            <span style={{ fontSize: 10, color: '#4a5170', fontFamily: 'var(--font-jetbrains, monospace)', marginLeft: 'auto' }}>
              {relativeTime(item.created_at)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Feed
// ---------------------------------------------------------------------------

export function IntelFeed() {
  const [items, setItems] = useState<IntelItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<IntelCategory | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchItems = useCallback(async (cat: IntelCategory | 'all') => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '15' });
    if (cat !== 'all') params.set('category', cat);
    const [itemsRes, countsRes] = await Promise.all([
      fetch(`/api/intel?${params}`).then(r => r.json()).catch(() => ({ items: [], total: 0, hasMore: false, nextCursor: null })),
      fetch('/api/intel?action=counts').then(r => r.json()).catch(() => ({ counts: {} })),
    ]);
    setItems(itemsRes.items ?? []);
    setTotal(itemsRes.total ?? 0);
    setHasMore(itemsRes.hasMore ?? false);
    setNextCursor(itemsRes.nextCursor ?? null);
    setCounts(countsRes.counts ?? {});
    setLoading(false);
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams({ limit: '10', after: nextCursor });
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    const res = await fetch(`/api/intel?${params}`).then(r => r.json()).catch(() => ({ items: [], hasMore: false, nextCursor: null }));
    setItems(prev => [...prev, ...(res.items ?? [])]);
    setHasMore(res.hasMore ?? false);
    setNextCursor(res.nextCursor ?? null);
    setLoadingMore(false);
  }, [nextCursor, loadingMore, selectedCategory]);

  useEffect(() => { fetchItems(selectedCategory); }, [selectedCategory, fetchItems]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const patchItem = async (id: string, action: string) => {
    const res = await fetch(`/api/intel/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      fetchItems(selectedCategory);
    }
  };

  const handlePin = async (id: string, pinned: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, pinned } : i)
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.score - a.score;
      }));
    await patchItem(id, pinned ? 'pin' : 'unpin');
  };

  const handleDismiss = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setTotal(prev => Math.max(0, prev - 1));
    setCounts(prev => ({ ...prev, all: Math.max(0, (prev.all ?? 0) - 1) }));
    await patchItem(id, 'dismiss');
  };

  const handleDone = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setTotal(prev => Math.max(0, prev - 1));
    setCounts(prev => ({ ...prev, all: Math.max(0, (prev.all ?? 0) - 1) }));
    await patchItem(id, 'done');
  };

  const handleFeedback = async (id: string, useful: boolean) => {
    const feedback = useful ? 'useful' as const : 'not_useful' as const;
    setItems(prev => prev.map(i => i.id === id ? { ...i, feedback, feedback_at: new Date().toISOString() } : i));
    await patchItem(id, useful ? 'feedback_useful' : 'feedback_not_useful');
  };

  const meetingPrepItems = items.filter(i => i.category === 'meeting_prep' && i.urgency >= 0.8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => {
          const count = cat.key === 'all' ? counts.all : counts[cat.key];
          const active = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 20,
                fontSize: 11, fontWeight: 500, cursor: 'pointer',
                border: `1px solid ${active ? cat.color + '66' : 'rgba(255,255,255,0.08)'}`,
                background: active ? `${cat.color}18` : 'rgba(255,255,255,0.03)',
                color: active ? cat.color : '#6b7494',
                transition: 'all 0.15s',
              }}
            >
              <cat.Icon size={11} />
              {cat.label}
              {count != null && count > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '0 5px', borderRadius: 8,
                  background: active ? `${cat.color}33` : 'rgba(255,255,255,0.08)',
                  color: active ? cat.color : '#6b7494',
                  minWidth: 16, textAlign: 'center',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Meeting Prep Banner */}
      {meetingPrepItems.length > 0 && selectedCategory !== 'meeting_prep' && (
        <MeetingPrepBanner
          item={meetingPrepItems[0]}
          onExpand={() => {
            setSelectedCategory('meeting_prep');
            setExpandedIds(new Set([meetingPrepItems[0].id]));
          }}
        />
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <IconLoader2 size={22} className="animate-spin" style={{ color: '#4a5170' }} />
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#4a5170' }}>No intelligence signals for this category.</p>
        </div>
      )}

      {/* Intel cards */}
      {!loading && items.map(item => (
        <IntelCard
          key={item.id}
          item={item}
          expanded={expandedIds.has(item.id)}
          onToggle={() => toggleExpand(item.id)}
          onPin={handlePin}
          onDismiss={handleDismiss}
          onDone={handleDone}
          onFeedback={handleFeedback}
        />
      ))}

      {/* Show more button */}
      {!loading && hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          style={{
            width: '100%', padding: '12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#6b7494', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
        >
          {loadingMore ? (
            <IconLoader2 size={14} className="animate-spin" />
          ) : (
            <>Show 10 more ({Math.max(0, total - items.length)} remaining)</>
          )}
        </button>
      )}
    </div>
  );
}
