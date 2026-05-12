import { NextRequest } from 'next/server';
import {
  getAdAccounts,
  getCampaigns,
  getAdSets,
  getAds,
  getAccountSummary,
  getCampaignTrends,
  type DateRangePreset,
} from '@/lib/data/meta-ads';

export const dynamic = 'force-dynamic';

const VALID_DATE_RANGES: DateRangePreset[] = ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d'];

/**
 * GET /api/meta-ads?action=accounts
 * GET /api/meta-ads?action=summary&accountId=act_xxx&dateRange=last_7d
 * GET /api/meta-ads?action=campaigns&accountId=act_xxx&dateRange=last_7d
 * GET /api/meta-ads?action=adsets&campaignId=xxx&dateRange=last_7d
 * GET /api/meta-ads?action=ads&adsetId=xxx&dateRange=last_7d
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') ?? 'accounts';
  const dateRange = (searchParams.get('dateRange') ?? 'last_7d') as DateRangePreset;

  if (!VALID_DATE_RANGES.includes(dateRange)) {
    return Response.json({ error: 'Invalid dateRange' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'accounts': {
        const accounts = await getAdAccounts();
        return Response.json({ accounts });
      }

      case 'summary': {
        const accountId = searchParams.get('accountId');
        if (!accountId) {
          return Response.json({ error: 'accountId required' }, { status: 400 });
        }
        const summary = await getAccountSummary(accountId, dateRange);
        return Response.json({ summary });
      }

      case 'campaigns': {
        const accountId = searchParams.get('accountId');
        if (!accountId) {
          return Response.json({ error: 'accountId required' }, { status: 400 });
        }
        const activeOnly = searchParams.get('activeOnly') === 'true';
        const campaigns = await getCampaigns(accountId, dateRange, activeOnly);
        return Response.json({ campaigns });
      }

      case 'adsets': {
        const campaignId = searchParams.get('campaignId');
        if (!campaignId) {
          return Response.json({ error: 'campaignId required' }, { status: 400 });
        }
        const adsets = await getAdSets(campaignId, dateRange);
        return Response.json({ adsets });
      }

      case 'ads': {
        const adsetId = searchParams.get('adsetId');
        if (!adsetId) {
          return Response.json({ error: 'adsetId required' }, { status: 400 });
        }
        const ads = await getAds(adsetId, dateRange);
        return Response.json({ ads });
      }

      case 'trends': {
        const campaignId = searchParams.get('campaignId');
        if (!campaignId) {
          return Response.json({ error: 'campaignId required' }, { status: 400 });
        }
        const trends = await getCampaignTrends(campaignId, dateRange);
        return Response.json({ trends });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'META_RATE_LIMIT') {
      return Response.json(
        { error: 'Meta API rate limit reached. Please wait a moment and try again.' },
        { status: 429 },
      );
    }
    console.error('[api/meta-ads] error:', err);
    return Response.json(
      { error: 'Failed to fetch Meta Ads data' },
      { status: 500 },
    );
  }
}
