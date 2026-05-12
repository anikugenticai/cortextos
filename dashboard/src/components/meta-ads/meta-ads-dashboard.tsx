'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountSelector } from './account-selector';
import { MetricsSummary } from './metrics-summary';
import { AdsTable } from './ads-table';
import { BudgetSuggestions } from './budget-suggestions';
import { IconRefresh, IconAlertTriangle, IconLoader2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

import type { DateRangePreset } from '@/lib/data/meta-ads';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdAccount {
  id: string;
  account_id: string;
  name: string;
  account_status: number;
  currency: string;
}

interface MetaTrend {
  value: number;
  previousValue: number;
  change: number;
  direction: 'up' | 'down' | 'flat';
}

interface SummaryMetrics {
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
  metrics: {
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
  };
}

// ---------------------------------------------------------------------------
// Date range options
// ---------------------------------------------------------------------------

const DATE_RANGES: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7d', label: 'Last 7 Days' },
  { value: 'last_14d', label: 'Last 14 Days' },
  { value: 'last_30d', label: 'Last 30 Days' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MetaAdsDashboard() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRangePreset>('last_7d');
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch accounts on mount
  useEffect(() => {
    async function fetchAccounts() {
      setLoadingAccounts(true);
      setError(null);
      try {
        const res = await fetch('/api/meta-ads?action=accounts');
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const json = await res.json();
        const accts = json.accounts ?? [];
        setAccounts(accts);
        // Auto-select UgenticAi 1 (act_1211841742793926) if present, else first
        const defaultAcct = accts.find(
          (a: AdAccount) => a.id === 'act_1211841742793926'
        );
        if (defaultAcct) {
          setSelectedAccount(defaultAcct.id);
        } else if (accts.length > 0) {
          setSelectedAccount(accts[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load accounts');
      }
      setLoadingAccounts(false);
    }
    fetchAccounts();
  }, []);

  // Fetch data when account or date range changes
  const fetchData = useCallback(async () => {
    if (!selectedAccount) return;

    setLoadingSummary(true);
    setLoadingCampaigns(true);
    setError(null);

    try {
      const [summaryRes, campaignsRes] = await Promise.all([
        fetch(`/api/meta-ads?action=summary&accountId=${selectedAccount}&dateRange=${dateRange}`),
        fetch(`/api/meta-ads?action=campaigns&accountId=${selectedAccount}&dateRange=${dateRange}&activeOnly=${activeOnly}`),
      ]);

      if (!summaryRes.ok || !campaignsRes.ok) {
        const errBody = await (summaryRes.ok ? campaignsRes : summaryRes)
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(errBody.error ?? 'Failed to fetch data');
      }

      const [summaryJson, campaignsJson] = await Promise.all([
        summaryRes.json(),
        campaignsRes.json(),
      ]);

      setSummary(summaryJson.summary ?? null);
      setCampaigns(campaignsJson.campaigns ?? []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }

    setLoadingSummary(false);
    setLoadingCampaigns(false);
  }, [selectedAccount, dateRange, activeOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading state for initial account fetch
  if (loadingAccounts) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <IconLoader2 size={28} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Connecting to Meta Ads...</p>
      </div>
    );
  }

  // Error state
  if (error && accounts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="rounded-full bg-destructive/10 p-3">
            <IconAlertTriangle size={20} className="text-destructive" />
          </div>
          <p className="text-sm font-medium">Unable to connect to Meta Ads</p>
          <p className="text-xs text-muted-foreground text-center max-w-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <AccountSelector
          accounts={accounts}
          selectedId={selectedAccount}
          onSelect={setSelectedAccount}
          className="w-full sm:w-auto"
        />

        <div className="flex items-center gap-2 flex-wrap">
          {DATE_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setDateRange(range.value)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                dateRange === range.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {range.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setActiveOnly(!activeOnly)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            activeOnly
              ? 'bg-green-500/15 text-green-600 hover:bg-green-500/25'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {activeOnly ? 'Active Only' : 'All Campaigns'}
        </button>

        <div className="flex items-center gap-2 sm:ml-auto">
          {lastRefresh && (
            <span className="text-[11px] text-muted-foreground">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loadingSummary || loadingCampaigns}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <IconRefresh
              size={16}
              className={cn(
                (loadingSummary || loadingCampaigns) && 'animate-spin',
              )}
            />
          </button>
        </div>
      </div>

      {/* Error banner (non-fatal) */}
      {error && accounts.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <IconAlertTriangle size={14} />
          <span>{error}</span>
          <button
            onClick={fetchData}
            className="ml-auto text-xs font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary cards */}
      <MetricsSummary metrics={summary} loading={loadingSummary} />

      {/* Budget intelligence */}
      {!loadingCampaigns && <BudgetSuggestions campaigns={campaigns} />}

      {/* Campaign table with drill-down */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          <AdsTable
            campaigns={campaigns}
            accountId={selectedAccount}
            dateRange={dateRange}
            loading={loadingCampaigns}
          />
        </CardContent>
      </Card>
    </div>
  );
}
