'use client';

import { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendIndicator } from './trend-indicator';
import { CplBadge } from './cpl-badge';
import { IntelligenceBadge, getIntelBadge } from './intelligence-badge';
import { TrendChart } from './trend-chart';
import type { DailyPoint } from './trend-chart';
import { cn } from '@/lib/utils';
import {
  IconChevronRight,
  IconChevronDown,
  IconLoader2,
  IconPlayerPlay,
  IconPlayerPause,
  IconPhoto,
  IconColumns,
  IconList,
} from '@tabler/icons-react';

import type { DateRangePreset } from '@/lib/data/meta-ads';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetaTrend {
  value: number;
  previousValue: number;
  change: number;
  direction: 'up' | 'down' | 'flat';
}

interface MetaMetrics {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
  frequency: number;
  costPerResult: number;
  results: number;
  trends: {
    spend: MetaTrend;
    cpm: MetaTrend;
    cpc: MetaTrend;
    ctr: MetaTrend;
    costPerResult: MetaTrend;
    frequency: MetaTrend;
  };
}

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  objective: string;
  metrics: MetaMetrics;
}

interface AdSetRow {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  metrics: MetaMetrics;
}

interface AdRow {
  id: string;
  name: string;
  status: string;
  adsetId: string;
  thumbnailUrl: string | null;
  metrics: MetaMetrics;
}

type SortKey = 'name' | 'spend' | 'cpm' | 'cpc' | 'ctr' | 'costPerResult' | 'frequency' | 'results';
type SortDir = 'asc' | 'desc';

interface AdsTableProps {
  campaigns: CampaignRow[];
  accountId: string;
  dateRange: DateRangePreset;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(val: number): string {
  if (val === 0) return '--';
  return `$${val.toFixed(2)}`;
}

function formatNumber(val: number): string {
  if (val === 0) return '--';
  return val.toLocaleString();
}

function StatusDot({ status }: { status: string }) {
  const isActive = status === 'ACTIVE';
  return (
    <span className="inline-flex items-center gap-1">
      {isActive ? (
        <IconPlayerPlay size={12} className="text-green-500" />
      ) : (
        <IconPlayerPause size={12} className="text-muted-foreground" />
      )}
      <span className={cn('text-[11px]', isActive ? 'text-green-500' : 'text-muted-foreground')}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    </span>
  );
}

function getSortValue(metrics: MetaMetrics, key: SortKey): number | string {
  switch (key) {
    case 'name': return '';
    case 'spend': return metrics.spend;
    case 'cpm': return metrics.cpm;
    case 'cpc': return metrics.cpc;
    case 'ctr': return metrics.ctr;
    case 'costPerResult': return metrics.costPerResult;
    case 'frequency': return metrics.frequency;
    case 'results': return metrics.results;
    default: return 0;
  }
}

function sortRows<T extends { name: string; metrics: MetaMetrics }>(
  rows: T[],
  sortKey: SortKey,
  sortDir: SortDir,
): T[] {
  return [...rows].sort((a, b) => {
    let cmp: number;
    if (sortKey === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else {
      const aVal = getSortValue(a.metrics, sortKey) as number;
      const bVal = getSortValue(b.metrics, sortKey) as number;
      cmp = aVal - bVal;
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse flex gap-4">
          <div className="h-8 flex-1 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column header
// ---------------------------------------------------------------------------

function SortableHead({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <TableHead
      className={cn('cursor-pointer select-none hover:text-foreground transition-colors', className)}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (
          <span className="text-[10px]">{currentDir === 'asc' ? '▲' : '▼'}</span>
        )}
      </span>
    </TableHead>
  );
}

// ---------------------------------------------------------------------------
// Metric cells
// ---------------------------------------------------------------------------

function MetricCells({ metrics }: { metrics: MetaMetrics }) {
  return (
    <>
      <TableCell className="text-right tabular-nums">{formatCurrency(metrics.spend)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatNumber(metrics.results)}</TableCell>
      <TableCell className="text-right">
        <CplBadge value={metrics.costPerResult} />
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-1.5">
          <span className="tabular-nums">{formatCurrency(metrics.cpm)}</span>
          <TrendIndicator
            change={metrics.trends.cpm.change}
            direction={metrics.trends.cpm.direction}
            lowerIsBetter
            showLabel={false}
          />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-1.5">
          <span className="tabular-nums">{formatCurrency(metrics.cpc)}</span>
          <TrendIndicator
            change={metrics.trends.cpc.change}
            direction={metrics.trends.cpc.direction}
            lowerIsBetter
            showLabel={false}
          />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-1.5">
          <span className="tabular-nums">
            {metrics.ctr === 0 ? '--' : `${metrics.ctr.toFixed(2)}%`}
          </span>
          <TrendIndicator
            change={metrics.trends.ctr.change}
            direction={metrics.trends.ctr.direction}
            lowerIsBetter={false}
            showLabel={false}
          />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-1.5">
          <span className="tabular-nums">
            {metrics.frequency === 0 ? '--' : metrics.frequency.toFixed(2)}
          </span>
          <TrendIndicator
            change={metrics.trends.frequency.change}
            direction={metrics.trends.frequency.direction}
            lowerIsBetter
            showLabel={false}
          />
        </div>
      </TableCell>
    </>
  );
}

// ---------------------------------------------------------------------------
// Mobile helpers
// ---------------------------------------------------------------------------

function MetricCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/30 px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{children}</span>
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: MetaMetrics }) {
  const m = metrics;
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <MetricCell label="Spend">{formatCurrency(m.spend)}</MetricCell>
      <MetricCell label="Results">{formatNumber(m.results)}</MetricCell>
      <MetricCell label="CPL">
        <CplBadge value={m.costPerResult} />
      </MetricCell>
      <MetricCell label="CPM">
        <div className="inline-flex items-center gap-1">
          {formatCurrency(m.cpm)}
          <TrendIndicator change={m.trends.cpm.change} direction={m.trends.cpm.direction} lowerIsBetter showLabel={false} />
        </div>
      </MetricCell>
      <MetricCell label="CPC">
        <div className="inline-flex items-center gap-1">
          {formatCurrency(m.cpc)}
          <TrendIndicator change={m.trends.cpc.change} direction={m.trends.cpc.direction} lowerIsBetter showLabel={false} />
        </div>
      </MetricCell>
      <MetricCell label="CTR">
        <div className="inline-flex items-center gap-1">
          {m.ctr === 0 ? '--' : `${m.ctr.toFixed(2)}%`}
          <TrendIndicator change={m.trends.ctr.change} direction={m.trends.ctr.direction} lowerIsBetter={false} showLabel={false} />
        </div>
      </MetricCell>
      <MetricCell label="Frequency">
        <div className="inline-flex items-center gap-1">
          {m.frequency === 0 ? '--' : m.frequency.toFixed(2)}
          <TrendIndicator change={m.trends.frequency.change} direction={m.trends.frequency.direction} lowerIsBetter showLabel={false} />
        </div>
      </MetricCell>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A/B card (one ad in comparison view)
// ---------------------------------------------------------------------------

function AbAdCard({ ad }: { ad: AdRow }) {
  const badge = getIntelBadge(ad.metrics);
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3 min-w-0"
      style={{ minWidth: 140 }}
    >
      <div className="flex items-start gap-2">
        {ad.thumbnailUrl ? (
          <img src={ad.thumbnailUrl} alt="" className="h-10 w-10 rounded object-cover ring-1 ring-border flex-shrink-0" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted ring-1 ring-border flex-shrink-0">
            <IconPhoto size={14} className="text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium leading-tight line-clamp-2">{ad.name}</p>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <StatusDot status={ad.status} />
            {badge && <IntelligenceBadge badge={badge} />}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {[
          { label: 'Spend', value: formatCurrency(ad.metrics.spend) },
          { label: 'Results', value: formatNumber(ad.metrics.results) },
          { label: 'CPL', value: ad.metrics.costPerResult === 0 ? '--' : `$${ad.metrics.costPerResult.toFixed(2)}` },
          { label: 'CTR', value: ad.metrics.ctr === 0 ? '--' : `${ad.metrics.ctr.toFixed(2)}%` },
          { label: 'Freq', value: ad.metrics.frequency === 0 ? '--' : ad.metrics.frequency.toFixed(2) },
          { label: 'CPM', value: formatCurrency(ad.metrics.cpm) },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
            <span className="text-[11px] font-medium tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile ad card
// ---------------------------------------------------------------------------

function AdCard({ ad }: { ad: AdRow }) {
  const badge = getIntelBadge(ad.metrics);
  return (
    <div className="px-4 py-2 space-y-1.5 bg-muted/10">
      <div className="flex items-center gap-2">
        {ad.thumbnailUrl ? (
          <img src={ad.thumbnailUrl} alt="" className="h-7 w-7 rounded object-cover ring-1 ring-border flex-shrink-0" />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded bg-muted ring-1 ring-border flex-shrink-0">
            <IconPhoto size={12} className="text-muted-foreground" />
          </div>
        )}
        <p className="text-xs font-medium truncate min-w-0 flex-1">{ad.name}</p>
        <StatusDot status={ad.status} />
        {badge && <IntelligenceBadge badge={badge} />}
      </div>
      <MetricGrid metrics={ad.metrics} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile adset card
// ---------------------------------------------------------------------------

function AdSetCard({
  adSet,
  isExpanded,
  isLoadingAds,
  ads,
  onToggle,
}: {
  adSet: AdSetRow;
  isExpanded: boolean;
  isLoadingAds: boolean;
  ads: AdRow[];
  onToggle: (id: string) => void;
}) {
  const [abView, setAbView] = useState(false);
  const badge = getIntelBadge(adSet.metrics);

  return (
    <div className="border-l-2 border-muted ml-3">
      <button
        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-muted/20 transition-colors"
        onClick={() => onToggle(adSet.id)}
      >
        {isLoadingAds ? (
          <IconLoader2 size={12} className="animate-spin text-muted-foreground flex-shrink-0" />
        ) : isExpanded ? (
          <IconChevronDown size={12} className="text-muted-foreground flex-shrink-0" />
        ) : (
          <IconChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
        )}
        <span className="text-xs font-medium truncate min-w-0 flex-1">{adSet.name}</span>
        {badge && <IntelligenceBadge badge={badge} />}
        <StatusDot status={adSet.status} />
      </button>
      {isExpanded && (
        <div className="pl-2">
          <div className="px-3 pb-2">
            <MetricGrid metrics={adSet.metrics} />
          </div>
          {isLoadingAds && (
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
              <IconLoader2 size={12} className="animate-spin" />
              Loading ads...
            </div>
          )}
          {!isLoadingAds && ads.length === 0 && (
            <p className="px-4 py-2 text-xs text-muted-foreground">No ads found.</p>
          )}
          {!isLoadingAds && ads.length >= 2 && (
            <div className="px-3 pb-2">
              <button
                onClick={() => setAbView(v => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                  abView
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {abView ? <IconList size={11} /> : <IconColumns size={11} />}
                {abView ? 'List View' : 'A/B View'}
              </button>
            </div>
          )}
          {!isLoadingAds && abView && ads.length >= 2 ? (
            <div className="px-3 pb-3 flex gap-2 overflow-x-auto">
              {ads.map(ad => <AbAdCard key={ad.id} ad={ad} />)}
            </div>
          ) : (
            !isLoadingAds && ads.map((ad) => <AdCard key={ad.id} ad={ad} />)
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile campaign card
// ---------------------------------------------------------------------------

function CampaignCard({
  campaign,
  isExpanded,
  isLoadingAdSets,
  adSets,
  expandedAdSets,
  loadingAds,
  adData,
  trendPoints,
  isLoadingTrend,
  onToggleCampaign,
  onToggleAdSet,
}: {
  campaign: CampaignRow;
  isExpanded: boolean;
  isLoadingAdSets: boolean;
  adSets: AdSetRow[];
  expandedAdSets: Set<string>;
  loadingAds: Set<string>;
  adData: Record<string, AdRow[]>;
  trendPoints?: DailyPoint[];
  isLoadingTrend?: boolean;
  onToggleCampaign: (id: string) => void;
  onToggleAdSet: (id: string) => void;
}) {
  const badge = getIntelBadge(campaign.metrics, 20);
  const sortedAdSets = [...adSets].sort((a, b) => b.metrics.spend - a.metrics.spend);
  return (
    <div className="px-4 py-3 space-y-2">
      <button
        className="w-full text-left flex items-start justify-between gap-2"
        onClick={() => onToggleCampaign(campaign.id)}
      >
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {isLoadingAdSets ? (
            <IconLoader2 size={14} className="animate-spin text-muted-foreground mt-0.5 flex-shrink-0" />
          ) : isExpanded ? (
            <IconChevronDown size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          ) : (
            <IconChevronRight size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight truncate">{campaign.name}</p>
            {campaign.objective && (
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                {campaign.objective.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && <IntelligenceBadge badge={badge} />}
          <StatusDot status={campaign.status} />
        </div>
      </button>

      <MetricGrid metrics={campaign.metrics} />

      {isExpanded && (
        <div className="pt-1 space-y-1">
          {/* Trend chart */}
          {(isLoadingTrend || (trendPoints && trendPoints.length >= 2)) && (
            <div className="rounded-lg border border-border bg-muted/10 p-3 mb-2">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                7-Day Trend
              </p>
              <TrendChart data={trendPoints ?? []} loading={isLoadingTrend} />
            </div>
          )}

          {isLoadingAdSets && (
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
              <IconLoader2 size={12} className="animate-spin" />
              Loading ad sets...
            </div>
          )}
          {!isLoadingAdSets && adSets.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">No ad sets found.</p>
          )}
          {!isLoadingAdSets && sortedAdSets.map((adSet) => (
            <AdSetCard
              key={adSet.id}
              adSet={adSet}
              isExpanded={expandedAdSets.has(adSet.id)}
              isLoadingAds={loadingAds.has(adSet.id)}
              ads={adData[adSet.id] ?? []}
              onToggle={onToggleAdSet}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdsTable({ campaigns, accountId, dateRange, loading }: AdsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
  const [adSetData, setAdSetData] = useState<Record<string, AdSetRow[]>>({});
  const [adData, setAdData] = useState<Record<string, AdRow[]>>({});
  const [loadingAdSets, setLoadingAdSets] = useState<Set<string>>(new Set());
  const [loadingAds, setLoadingAds] = useState<Set<string>>(new Set());
  const [trendData, setTrendData] = useState<Record<string, DailyPoint[]>>({});
  const [loadingTrends, setLoadingTrends] = useState<Set<string>>(new Set());

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  const toggleCampaign = useCallback(async (campaignId: string) => {
    const next = new Set(expandedCampaigns);
    if (next.has(campaignId)) {
      next.delete(campaignId);
      setExpandedCampaigns(next);
      return;
    }

    next.add(campaignId);
    setExpandedCampaigns(next);

    // Fetch ad sets and trend data in parallel
    const fetchAdSets = !adSetData[campaignId]
      ? (async () => {
          setLoadingAdSets(prev => new Set(prev).add(campaignId));
          try {
            const res = await fetch(`/api/meta-ads?action=adsets&campaignId=${campaignId}&dateRange=${dateRange}`);
            const json = await res.json();
            setAdSetData(prev => ({ ...prev, [campaignId]: json.adsets ?? [] }));
          } catch {
            setAdSetData(prev => ({ ...prev, [campaignId]: [] }));
          }
          setLoadingAdSets(prev => { const n = new Set(prev); n.delete(campaignId); return n; });
        })()
      : Promise.resolve();

    const fetchTrends = !trendData[campaignId]
      ? (async () => {
          setLoadingTrends(prev => new Set(prev).add(campaignId));
          try {
            const res = await fetch(`/api/meta-ads?action=trends&campaignId=${campaignId}&dateRange=${dateRange}`);
            const json = await res.json();
            setTrendData(prev => ({ ...prev, [campaignId]: json.trends ?? [] }));
          } catch {
            setTrendData(prev => ({ ...prev, [campaignId]: [] }));
          }
          setLoadingTrends(prev => { const n = new Set(prev); n.delete(campaignId); return n; });
        })()
      : Promise.resolve();

    await Promise.all([fetchAdSets, fetchTrends]);
  }, [expandedCampaigns, adSetData, trendData, dateRange]);

  const toggleAdSet = useCallback(async (adsetId: string) => {
    const next = new Set(expandedAdSets);
    if (next.has(adsetId)) {
      next.delete(adsetId);
      setExpandedAdSets(next);
      return;
    }

    next.add(adsetId);
    setExpandedAdSets(next);

    if (!adData[adsetId]) {
      setLoadingAds(prev => new Set(prev).add(adsetId));
      try {
        const res = await fetch(`/api/meta-ads?action=ads&adsetId=${adsetId}&dateRange=${dateRange}`);
        const json = await res.json();
        setAdData(prev => ({ ...prev, [adsetId]: json.ads ?? [] }));
      } catch {
        setAdData(prev => ({ ...prev, [adsetId]: [] }));
      }
      setLoadingAds(prev => { const n = new Set(prev); n.delete(adsetId); return n; });
    }
  }, [expandedAdSets, adData, dateRange]);

  if (loading) return <TableSkeleton />;

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <IconPhoto size={24} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No campaigns found</p>
        <p className="text-xs text-muted-foreground mt-1">
          This account has no campaigns for the selected period, or ads haven&apos;t started delivering yet.
        </p>
      </div>
    );
  }

  const sorted = sortRows(campaigns, sortKey, sortDir);

  return (
    <>
      {/* Mobile: card layout */}
      <div className="md:hidden divide-y divide-border overflow-hidden">
        {sorted.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            isExpanded={expandedCampaigns.has(campaign.id)}
            isLoadingAdSets={loadingAdSets.has(campaign.id)}
            adSets={adSetData[campaign.id] ?? []}
            expandedAdSets={expandedAdSets}
            loadingAds={loadingAds}
            adData={adData}
            trendPoints={trendData[campaign.id]}
            isLoadingTrend={loadingTrends.has(campaign.id)}
            onToggleCampaign={toggleCampaign}
            onToggleAdSet={toggleAdSet}
          />
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8" />
              <SortableHead label="Name" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="min-w-[200px]" />
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-20">Signal</TableHead>
              <SortableHead label="Spend" sortKey="spend" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHead label="Results" sortKey="results" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHead label="CPL" sortKey="costPerResult" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHead label="CPM" sortKey="cpm" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHead label="CPC" sortKey="cpc" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHead label="CTR" sortKey="ctr" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHead label="Freq" sortKey="frequency" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((campaign) => {
              const isExpanded = expandedCampaigns.has(campaign.id);
              const isLoadingAdSets = loadingAdSets.has(campaign.id);
              const adSets = adSetData[campaign.id] ?? [];
              const sortedAdSets = sortRows(adSets, sortKey, sortDir);

              return (
                <CampaignGroup
                  key={campaign.id}
                  campaign={campaign}
                  isExpanded={isExpanded}
                  isLoadingAdSets={isLoadingAdSets}
                  adSets={sortedAdSets}
                  expandedAdSets={expandedAdSets}
                  loadingAds={loadingAds}
                  adData={adData}
                  trendPoints={trendData[campaign.id]}
                  isLoadingTrend={loadingTrends.has(campaign.id)}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggleCampaign={toggleCampaign}
                  onToggleAdSet={toggleAdSet}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Campaign group (desktop)
// ---------------------------------------------------------------------------

function CampaignGroup({
  campaign,
  isExpanded,
  isLoadingAdSets,
  adSets,
  expandedAdSets,
  loadingAds,
  adData,
  trendPoints,
  isLoadingTrend,
  sortKey,
  sortDir,
  onToggleCampaign,
  onToggleAdSet,
}: {
  campaign: CampaignRow;
  isExpanded: boolean;
  isLoadingAdSets: boolean;
  adSets: AdSetRow[];
  expandedAdSets: Set<string>;
  loadingAds: Set<string>;
  adData: Record<string, AdRow[]>;
  trendPoints?: DailyPoint[];
  isLoadingTrend?: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggleCampaign: (id: string) => void;
  onToggleAdSet: (id: string) => void;
}) {
  const badge = getIntelBadge(campaign.metrics, 20);

  return (
    <>
      {/* Campaign row */}
      <TableRow
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => onToggleCampaign(campaign.id)}
      >
        <TableCell className="w-8">
          {isLoadingAdSets ? (
            <IconLoader2 size={14} className="animate-spin text-muted-foreground" />
          ) : isExpanded ? (
            <IconChevronDown size={14} className="text-muted-foreground" />
          ) : (
            <IconChevronRight size={14} className="text-muted-foreground" />
          )}
        </TableCell>
        <TableCell>
          <div>
            <span className="font-medium text-sm">{campaign.name}</span>
            {campaign.objective && (
              <span className="ml-2 text-[10px] text-muted-foreground uppercase tracking-wide">
                {campaign.objective.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell><StatusDot status={campaign.status} /></TableCell>
        <TableCell>{badge && <IntelligenceBadge badge={badge} />}</TableCell>
        <MetricCells metrics={campaign.metrics} />
      </TableRow>

      {/* Trend chart row */}
      {isExpanded && (isLoadingTrend || (trendPoints && trendPoints.length >= 2)) && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={11} className="py-0 px-0">
            <div className="ml-8 mr-4 my-2 rounded-lg border border-border bg-muted/10 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                CPL &amp; Spend Trend
              </p>
              <TrendChart data={trendPoints ?? []} loading={isLoadingTrend} />
            </div>
          </TableCell>
        </TableRow>
      )}

      {/* Loading adsets */}
      {isExpanded && isLoadingAdSets && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={11} className="py-3">
            <div className="flex items-center gap-2 pl-8 text-sm text-muted-foreground">
              <IconLoader2 size={14} className="animate-spin" />
              Loading ad sets...
            </div>
          </TableCell>
        </TableRow>
      )}

      {isExpanded && !isLoadingAdSets && adSets.length === 0 && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={11} className="py-3">
            <div className="pl-8 text-sm text-muted-foreground">
              No ad sets found for this campaign.
            </div>
          </TableCell>
        </TableRow>
      )}

      {isExpanded && !isLoadingAdSets && adSets.map((adSet) => {
        const isAdSetExpanded = expandedAdSets.has(adSet.id);
        const isLoadingAdSetAds = loadingAds.has(adSet.id);
        const ads = adData[adSet.id] ?? [];
        const sortedAds = sortRows(ads, sortKey, sortDir);

        return (
          <AdSetGroup
            key={adSet.id}
            adSet={adSet}
            isExpanded={isAdSetExpanded}
            isLoadingAds={isLoadingAdSetAds}
            ads={sortedAds}
            onToggle={onToggleAdSet}
          />
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Ad Set group (desktop)
// ---------------------------------------------------------------------------

function AdSetGroup({
  adSet,
  isExpanded,
  isLoadingAds,
  ads,
  onToggle,
}: {
  adSet: AdSetRow;
  isExpanded: boolean;
  isLoadingAds: boolean;
  ads: AdRow[];
  onToggle: (id: string) => void;
}) {
  const [abView, setAbView] = useState(false);
  const badge = getIntelBadge(adSet.metrics);

  return (
    <>
      {/* Ad Set row */}
      <TableRow
        className="cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
        onClick={() => onToggle(adSet.id)}
      >
        <TableCell className="w-8 pl-6">
          {isLoadingAds ? (
            <IconLoader2 size={13} className="animate-spin text-muted-foreground" />
          ) : isExpanded ? (
            <IconChevronDown size={13} className="text-muted-foreground" />
          ) : (
            <IconChevronRight size={13} className="text-muted-foreground" />
          )}
        </TableCell>
        <TableCell>
          <span className="pl-4 text-sm">{adSet.name}</span>
        </TableCell>
        <TableCell><StatusDot status={adSet.status} /></TableCell>
        <TableCell>{badge && <IntelligenceBadge badge={badge} />}</TableCell>
        <MetricCells metrics={adSet.metrics} />
      </TableRow>

      {/* Ads loading */}
      {isExpanded && isLoadingAds && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={11} className="py-3">
            <div className="flex items-center gap-2 pl-16 text-sm text-muted-foreground">
              <IconLoader2 size={14} className="animate-spin" />
              Loading ads...
            </div>
          </TableCell>
        </TableRow>
      )}

      {isExpanded && !isLoadingAds && ads.length === 0 && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={11} className="py-3">
            <div className="pl-16 text-sm text-muted-foreground">
              No ads found for this ad set.
            </div>
          </TableCell>
        </TableRow>
      )}

      {/* A/B view toggle */}
      {isExpanded && !isLoadingAds && ads.length >= 2 && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={11} className="py-1.5 pl-16">
            <button
              onClick={(e) => { e.stopPropagation(); setAbView(v => !v); }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors',
                abView
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {abView ? <IconList size={11} /> : <IconColumns size={11} />}
              {abView ? 'List View' : 'A/B View'}
            </button>
          </TableCell>
        </TableRow>
      )}

      {/* A/B card grid */}
      {isExpanded && !isLoadingAds && ads.length >= 2 && abView && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={11} className="py-3 pl-16 pr-4">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {ads.map(ad => <AbAdCard key={ad.id} ad={ad} />)}
            </div>
          </TableCell>
        </TableRow>
      )}

      {/* Normal ad rows */}
      {isExpanded && !isLoadingAds && !abView && ads.map((ad) => {
        const adBadge = getIntelBadge(ad.metrics);
        return (
          <TableRow key={ad.id} className="bg-muted/10 hover:bg-muted/25 transition-colors">
            <TableCell className="w-8 pl-10" />
            <TableCell>
              <div className="flex items-center gap-3 pl-8">
                {ad.thumbnailUrl ? (
                  <img
                    src={ad.thumbnailUrl}
                    alt=""
                    className="h-8 w-8 rounded object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-muted ring-1 ring-border">
                    <IconPhoto size={14} className="text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm">{ad.name}</span>
              </div>
            </TableCell>
            <TableCell><StatusDot status={ad.status} /></TableCell>
            <TableCell>{adBadge && <IntelligenceBadge badge={adBadge} />}</TableCell>
            <MetricCells metrics={ad.metrics} />
          </TableRow>
        );
      })}
    </>
  );
}
