/**
 * Meta Marketing API data fetching layer.
 * All requests go through this module — never call Meta API from client code.
 */

const META_API_BASE = `https://graph.facebook.com/${process.env.META_ADS_API_VERSION || 'v25.0'}`;
const ACCESS_TOKEN = process.env.META_ADS_ACCESS_TOKEN || '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetaAdAccount {
  id: string;
  account_id: string;
  name: string;
  account_status: number;
  currency: string;
}

export interface MetaTrend {
  value: number;
  previousValue: number;
  change: number; // percentage change
  direction: 'up' | 'down' | 'flat';
}

export interface MetaMetrics {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
  frequency: number;
  costPerResult: number;
  results: number; // leads / conversions
  // Trend data (current vs previous period)
  trends: {
    spend: MetaTrend;
    cpm: MetaTrend;
    cpc: MetaTrend;
    ctr: MetaTrend;
    costPerResult: MetaTrend;
    frequency: MetaTrend;
  };
}

export interface MetaCampaignRow {
  id: string;
  name: string;
  status: string;
  objective: string;
  metrics: MetaMetrics;
}

export interface MetaAdSetRow {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  metrics: MetaMetrics;
}

export interface MetaAdRow {
  id: string;
  name: string;
  status: string;
  adsetId: string;
  thumbnailUrl: string | null;
  metrics: MetaMetrics;
}

export type DateRangePreset = 'today' | 'yesterday' | 'last_7d' | 'last_14d' | 'last_30d';

export interface MetaDailyPoint {
  date: string;
  spend: number;
  costPerResult: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateRange(preset: DateRangePreset): { since: string; until: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  switch (preset) {
    case 'today':
      return { since: fmt(now), until: fmt(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { since: fmt(y), until: fmt(y) };
    }
    case 'last_7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { since: fmt(d), until: fmt(now) };
    }
    case 'last_14d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 13);
      return { since: fmt(d), until: fmt(now) };
    }
    case 'last_30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { since: fmt(d), until: fmt(now) };
    }
    default:
      return getDateRange('last_7d');
  }
}

/** Get the previous period of equal length for trend comparison */
function getPreviousDateRange(preset: DateRangePreset): { since: string; until: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  switch (preset) {
    case 'today': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { since: fmt(y), until: fmt(y) };
    }
    case 'yesterday': {
      const d = new Date(now);
      d.setDate(d.getDate() - 2);
      return { since: fmt(d), until: fmt(d) };
    }
    case 'last_7d': {
      const end = new Date(now);
      end.setDate(end.getDate() - 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { since: fmt(start), until: fmt(end) };
    }
    case 'last_14d': {
      const end = new Date(now);
      end.setDate(end.getDate() - 14);
      const start = new Date(end);
      start.setDate(start.getDate() - 13);
      return { since: fmt(start), until: fmt(end) };
    }
    case 'last_30d': {
      const end = new Date(now);
      end.setDate(end.getDate() - 30);
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      return { since: fmt(start), until: fmt(end) };
    }
    default:
      return getPreviousDateRange('last_7d');
  }
}

async function metaFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${META_API_BASE}${endpoint}`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 }, // cache for 60s
  });

  if (res.status === 429) {
    throw new Error('META_RATE_LIMIT');
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`[meta-ads] API error ${res.status}: ${body}`);
    throw new Error(`Meta API error: ${res.status}`);
  }

  return res.json();
}

/** Fetch all pages from a paginated Meta API endpoint */
async function metaFetchAll<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = null;

  // First request
  const firstUrl = new URL(`${META_API_BASE}${endpoint}`);
  firstUrl.searchParams.set('access_token', ACCESS_TOKEN);
  firstUrl.searchParams.set('limit', '200');
  for (const [k, v] of Object.entries(params)) {
    firstUrl.searchParams.set(k, v);
  }
  url = firstUrl.toString();

  while (url) {
    const res: Response = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      if (res.status === 429) throw new Error('META_RATE_LIMIT');
      const body = await res.text();
      console.error(`[meta-ads] API error ${res.status}: ${body}`);
      throw new Error(`Meta API error: ${res.status}`);
    }

    const json: { data?: T[]; paging?: { next?: string } } = await res.json();
    if (json.data) results.push(...json.data);
    url = json.paging?.next ?? null;
  }

  return results;
}

// ---------------------------------------------------------------------------
// Metrics parsing
// ---------------------------------------------------------------------------

function parseNumber(val: unknown): number {
  if (val === undefined || val === null) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function extractResults(insights: Record<string, unknown>): number {
  const actions = insights.actions as Array<{ action_type: string; value: string }> | undefined;
  if (!actions) return 0;
  const customEvents = actions.filter(a => a.action_type.startsWith('offsite_conversion.custom.'));
  if (customEvents.length > 0) {
    return customEvents.reduce((sum, a) => sum + parseNumber(a.value), 0);
  }
  for (const type of ['lead', 'offsite_conversion.fb_pixel_lead', 'complete_registration']) {
    const action = actions.find(a => a.action_type === type);
    if (action) return parseNumber(action.value);
  }
  return 0;
}

function extractCostPerResult(insights: Record<string, unknown>): number {
  const results = extractResults(insights);
  if (results === 0) return 0;
  const spend = parseNumber(insights.spend);
  return spend / results;
}

function computeTrend(current: number, previous: number, lowerIsBetter: boolean): MetaTrend {
  if (previous === 0 && current === 0) {
    return { value: current, previousValue: previous, change: 0, direction: 'flat' };
  }
  if (previous === 0) {
    return { value: current, previousValue: previous, change: 100, direction: lowerIsBetter ? 'down' : 'up' };
  }
  const change = ((current - previous) / previous) * 100;
  const direction = Math.abs(change) < 0.5 ? 'flat' : change > 0 ? 'up' : 'down';
  return { value: current, previousValue: previous, change: Math.round(change * 10) / 10, direction };
}

function buildMetrics(
  currentInsights: Record<string, unknown> | null,
  previousInsights: Record<string, unknown> | null,
): MetaMetrics {
  const c = currentInsights ?? {};
  const p = previousInsights ?? {};

  const spend = parseNumber(c.spend);
  const impressions = parseNumber(c.impressions);
  const reach = parseNumber(c.reach);
  const clicks = parseNumber(c.clicks);
  const cpm = parseNumber(c.cpm);
  const cpc = parseNumber(c.cpc);
  const ctr = parseNumber(c.ctr);
  const frequency = parseNumber(c.frequency);
  const costPerResult = extractCostPerResult(c);
  const results = extractResults(c);

  const pSpend = parseNumber(p.spend);
  const pCpm = parseNumber(p.cpm);
  const pCpc = parseNumber(p.cpc);
  const pCtr = parseNumber(p.ctr);
  const pFrequency = parseNumber(p.frequency);
  const pCostPerResult = extractCostPerResult(p);

  return {
    spend,
    impressions,
    reach,
    clicks,
    cpm,
    cpc,
    ctr,
    frequency,
    costPerResult,
    results,
    trends: {
      spend: computeTrend(spend, pSpend, true),
      cpm: computeTrend(cpm, pCpm, true),
      cpc: computeTrend(cpc, pCpc, true),
      ctr: computeTrend(ctr, pCtr, false), // higher CTR is better
      costPerResult: computeTrend(costPerResult, pCostPerResult, true),
      frequency: computeTrend(frequency, pFrequency, true),
    },
  };
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

const INSIGHTS_FIELDS = 'spend,impressions,reach,clicks,cpm,cpc,ctr,frequency,actions,cost_per_action_type';

export async function getAdAccounts(): Promise<MetaAdAccount[]> {
  const data = await metaFetchAll<MetaAdAccount>('/me/adaccounts', {
    fields: 'name,account_id,account_status,currency',
  });
  return data;
}

export async function getCampaigns(
  accountId: string,
  dateRange: DateRangePreset = 'last_7d',
  activeOnly: boolean = false,
): Promise<MetaCampaignRow[]> {
  const current = getDateRange(dateRange);
  const previous = getPreviousDateRange(dateRange);

  const [currentData, previousData] = await Promise.all([
    metaFetchAll<Record<string, unknown>>(`/${accountId}/campaigns`, {
      fields: `name,status,objective,insights.time_range(${JSON.stringify(current)}){${INSIGHTS_FIELDS}}`,
      limit: '200',
    }),
    metaFetchAll<Record<string, unknown>>(`/${accountId}/campaigns`, {
      fields: `name,status,insights.time_range(${JSON.stringify(previous)}){${INSIGHTS_FIELDS}}`,
      limit: '200',
    }),
  ]);

  // Build lookup of previous insights by campaign id
  const prevMap = new Map<string, Record<string, unknown>>();
  for (const row of previousData) {
    const insights = (row.insights as { data?: Record<string, unknown>[] })?.data?.[0] ?? null;
    if (insights) prevMap.set(row.id as string, insights);
  }

  const rows = currentData.map((row) => {
    const currentInsights = (row.insights as { data?: Record<string, unknown>[] })?.data?.[0] ?? null;
    const previousInsights = prevMap.get(row.id as string) ?? null;
    return {
      id: row.id as string,
      name: row.name as string,
      status: row.status as string,
      objective: (row.objective as string) ?? '',
      metrics: buildMetrics(currentInsights, previousInsights),
    };
  });

  if (activeOnly) {
    return rows.filter(r => r.status === 'ACTIVE');
  }
  return rows;
}

export async function getAdSets(
  campaignId: string,
  dateRange: DateRangePreset = 'last_7d',
): Promise<MetaAdSetRow[]> {
  const current = getDateRange(dateRange);
  const previous = getPreviousDateRange(dateRange);

  const [currentData, previousData] = await Promise.all([
    metaFetchAll<Record<string, unknown>>(`/${campaignId}/adsets`, {
      fields: `name,status,campaign_id,insights.time_range(${JSON.stringify(current)}){${INSIGHTS_FIELDS}}`,
      limit: '200',
    }),
    metaFetchAll<Record<string, unknown>>(`/${campaignId}/adsets`, {
      fields: `name,status,insights.time_range(${JSON.stringify(previous)}){${INSIGHTS_FIELDS}}`,
      limit: '200',
    }),
  ]);

  const prevMap = new Map<string, Record<string, unknown>>();
  for (const row of previousData) {
    const insights = (row.insights as { data?: Record<string, unknown>[] })?.data?.[0] ?? null;
    if (insights) prevMap.set(row.id as string, insights);
  }

  return currentData.map((row) => {
    const currentInsights = (row.insights as { data?: Record<string, unknown>[] })?.data?.[0] ?? null;
    const previousInsights = prevMap.get(row.id as string) ?? null;
    return {
      id: row.id as string,
      name: row.name as string,
      status: row.status as string,
      campaignId: (row.campaign_id as string) ?? campaignId,
      metrics: buildMetrics(currentInsights, previousInsights),
    };
  });
}

export async function getAds(
  adsetId: string,
  dateRange: DateRangePreset = 'last_7d',
): Promise<MetaAdRow[]> {
  const current = getDateRange(dateRange);
  const previous = getPreviousDateRange(dateRange);

  const [currentData, previousData] = await Promise.all([
    metaFetchAll<Record<string, unknown>>(`/${adsetId}/ads`, {
      fields: `name,status,adset_id,creative{thumbnail_url},insights.time_range(${JSON.stringify(current)}){${INSIGHTS_FIELDS}}`,
      limit: '200',
    }),
    metaFetchAll<Record<string, unknown>>(`/${adsetId}/ads`, {
      fields: `name,status,insights.time_range(${JSON.stringify(previous)}){${INSIGHTS_FIELDS}}`,
      limit: '200',
    }),
  ]);

  const prevMap = new Map<string, Record<string, unknown>>();
  for (const row of previousData) {
    const insights = (row.insights as { data?: Record<string, unknown>[] })?.data?.[0] ?? null;
    if (insights) prevMap.set(row.id as string, insights);
  }

  return currentData.map((row) => {
    const currentInsights = (row.insights as { data?: Record<string, unknown>[] })?.data?.[0] ?? null;
    const previousInsights = prevMap.get(row.id as string) ?? null;
    const creative = row.creative as { thumbnail_url?: string } | undefined;
    return {
      id: row.id as string,
      name: row.name as string,
      status: row.status as string,
      adsetId: (row.adset_id as string) ?? adsetId,
      thumbnailUrl: creative?.thumbnail_url ?? null,
      metrics: buildMetrics(currentInsights, previousInsights),
    };
  });
}

const TRENDS_FIELDS = 'spend,actions,date_start';

export async function getCampaignTrends(
  campaignId: string,
  dateRange: DateRangePreset = 'last_7d',
): Promise<MetaDailyPoint[]> {
  const range = getDateRange(dateRange);
  const data = await metaFetchAll<Record<string, unknown>>(`/${campaignId}/insights`, {
    time_increment: '1',
    time_range: JSON.stringify(range),
    fields: TRENDS_FIELDS,
    limit: '200',
  });

  return data.map(row => ({
    date: row.date_start as string,
    spend: parseNumber(row.spend),
    costPerResult: extractCostPerResult(row),
  }));
}

/** Fetch account-level summary metrics for the summary cards */
export async function getAccountSummary(
  accountId: string,
  dateRange: DateRangePreset = 'last_7d',
): Promise<MetaMetrics> {
  const current = getDateRange(dateRange);
  const previous = getPreviousDateRange(dateRange);

  const [currentRes, previousRes] = await Promise.all([
    metaFetch<{ data?: Record<string, unknown>[] }>(`/${accountId}/insights`, {
      fields: INSIGHTS_FIELDS,
      time_range: JSON.stringify(current),
    }),
    metaFetch<{ data?: Record<string, unknown>[] }>(`/${accountId}/insights`, {
      fields: INSIGHTS_FIELDS,
      time_range: JSON.stringify(previous),
    }),
  ]);

  const currentInsights = currentRes.data?.[0] ?? null;
  const previousInsights = previousRes.data?.[0] ?? null;
  return buildMetrics(currentInsights, previousInsights);
}
