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
import { cn } from '@/lib/utils';
import {
  IconChevronRight,
  IconChevronDown,
  IconLoader2,
  IconPlayerPlay,
  IconPlayerPause,
  IconPhoto,
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

    // Fetch ad sets if not cached
    if (!adSetData[campaignId]) {
      setLoadingAdSets(prev => new Set(prev).add(campaignId));
      try {
        const res = await fetch(
          `/api/meta-ads?action=adsets&campaignId=${campaignId}&dateRange=${dateRange}`,
        );
        const json = await res.json();
        setAdSetData(prev => ({ ...prev, [campaignId]: json.adsets ?? [] }));
      } catch (err) {
        console.error('Failed to fetch ad sets:', err);
        setAdSetData(prev => ({ ...prev, [campaignId]: [] }));
      }
      setLoadingAdSets(prev => {
        const n = new Set(prev);
        n.delete(campaignId);
        return n;
      });
    }
  }, [expandedCampaigns, adSetData, dateRange]);

  const toggleAdSet = useCallback(async (adsetId: string) => {
    const next = new Set(expandedAdSets);
    if (next.has(adsetId)) {
      next.delete(adsetId);
      setExpandedAdSets(next);
      return;
    }

    next.add(adsetId);
    setExpandedAdSets(next);

    // Fetch ads if not cached
    if (!adData[adsetId]) {
      setLoadingAds(prev => new Set(prev).add(adsetId));
      try {
        const res = await fetch(
          `/api/meta-ads?action=ads&adsetId=${adsetId}&dateRange=${dateRange}`,
        );
        const json = await res.json();
        setAdData(prev => ({ ...prev, [adsetId]: json.ads ?? [] }));
      } catch (err) {
        console.error('Failed to fetch ads:', err);
        setAdData(prev => ({ ...prev, [adsetId]: [] }));
      }
      setLoadingAds(prev => {
        const n = new Set(prev);
        n.delete(adsetId);
        return n;
      });
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
          This account has no campaigns for the selected period, or ads haven't started delivering yet.
        </p>
      </div>
    );
  }

  const sorted = sortRows(campaigns, sortKey, sortDir);

  return (
    <div className="overflow-x-auto -mx-px" style={{ WebkitOverflowScrolling: 'touch' }}>
      <Table className="min-w-[700px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8" />
            <SortableHead label="Name" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="min-w-[200px]" />
            <TableHead className="w-20">Status</TableHead>
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
  );
}

// ---------------------------------------------------------------------------
// Campaign group (campaign row + its ad sets + their ads)
// ---------------------------------------------------------------------------

function CampaignGroup({
  campaign,
  isExpanded,
  isLoadingAdSets,
  adSets,
  expandedAdSets,
  loadingAds,
  adData,
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
  sortKey: SortKey;
  sortDir: SortDir;
  onToggleCampaign: (id: string) => void;
  onToggleAdSet: (id: string) => void;
}) {
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
        <MetricCells metrics={campaign.metrics} />
      </TableRow>

      {/* Ad Sets */}
      {isExpanded && isLoadingAdSets && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={10} className="py-3">
            <div className="flex items-center gap-2 pl-8 text-sm text-muted-foreground">
              <IconLoader2 size={14} className="animate-spin" />
              Loading ad sets...
            </div>
          </TableCell>
        </TableRow>
      )}

      {isExpanded && !isLoadingAdSets && adSets.length === 0 && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={10} className="py-3">
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
// Ad Set group (ad set row + its ads)
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
        <MetricCells metrics={adSet.metrics} />
      </TableRow>

      {/* Ads */}
      {isExpanded && isLoadingAds && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={10} className="py-3">
            <div className="flex items-center gap-2 pl-16 text-sm text-muted-foreground">
              <IconLoader2 size={14} className="animate-spin" />
              Loading ads...
            </div>
          </TableCell>
        </TableRow>
      )}

      {isExpanded && !isLoadingAds && ads.length === 0 && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={10} className="py-3">
            <div className="pl-16 text-sm text-muted-foreground">
              No ads found for this ad set.
            </div>
          </TableCell>
        </TableRow>
      )}

      {isExpanded && !isLoadingAds && ads.map((ad) => (
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
          <MetricCells metrics={ad.metrics} />
        </TableRow>
      ))}
    </>
  );
}
