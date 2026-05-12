import { NextRequest } from 'next/server';
import {
  getPages,
  getCustomConversions,
  createCampaign,
  createAdSet,
  uploadImageByUrl,
  createAdCreative,
  createAd,
  getAdPostId,
  type CampaignParams,
  type AdSetParams,
  type AdCreativeParams,
  type AdParams,
} from '@/lib/data/meta-ads-create';

export const dynamic = 'force-dynamic';

function missing(fields: string[]): Response {
  return Response.json(
    { error: `Missing required fields: ${fields.join(', ')}` },
    { status: 400 },
  );
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action as string | undefined;
  const accountId = body.accountId as string | undefined;

  if (!action) {
    return Response.json({ error: 'action is required' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'pages': {
        const pages = await getPages();
        return Response.json({ pages });
      }

      case 'customConversions': {
        if (!accountId) return missing(['accountId']);
        const conversions = await getCustomConversions(accountId);
        return Response.json({ conversions });
      }

      case 'campaign': {
        if (!accountId) return missing(['accountId']);
        const name = body.name as string | undefined;
        const objective = body.objective as string | undefined;
        const status = body.status as 'PAUSED' | 'ACTIVE' | undefined;
        if (!name || !objective || !status) {
          return missing(['name', 'objective', 'status'].filter(f => !body[f]));
        }
        const result = await createCampaign(accountId, {
          name,
          objective,
          status,
          special_ad_categories: (body.special_ad_categories as string[]) ?? [],
        } satisfies CampaignParams);
        return Response.json({ campaign: result });
      }

      case 'adset': {
        if (!accountId) return missing(['accountId']);
        const required = ['name', 'campaign_id', 'optimization_goal', 'billing_event', 'daily_budget', 'targeting', 'start_time', 'status'] as const;
        const missingFields = required.filter(f => body[f] === undefined || body[f] === null);
        if (missingFields.length > 0) return missing([...missingFields]);
        const result = await createAdSet(accountId, {
          name: body.name as string,
          campaign_id: body.campaign_id as string,
          optimization_goal: body.optimization_goal as string,
          billing_event: body.billing_event as string,
          daily_budget: body.daily_budget as number,
          targeting: body.targeting as Record<string, unknown>,
          start_time: body.start_time as string,
          promoted_object: body.promoted_object as AdSetParams['promoted_object'],
          status: body.status as 'PAUSED' | 'ACTIVE',
          bid_strategy: body.bid_strategy as string | undefined,
        } satisfies AdSetParams);
        return Response.json({ adset: result });
      }

      case 'uploadImage': {
        if (!accountId) return missing(['accountId']);
        const imageUrl = body.imageUrl as string | undefined;
        if (!imageUrl) return missing(['imageUrl']);
        const result = await uploadImageByUrl(accountId, imageUrl);
        return Response.json({ image: result });
      }

      case 'creative': {
        if (!accountId) return missing(['accountId']);
        const required = ['name', 'page_id', 'image_hash', 'message', 'link', 'headline', 'description', 'call_to_action'] as const;
        const missingFields = required.filter(f => body[f] === undefined || body[f] === null);
        if (missingFields.length > 0) return missing([...missingFields]);
        const result = await createAdCreative(accountId, {
          name: body.name as string,
          page_id: body.page_id as string,
          image_hash: body.image_hash as string,
          message: body.message as string,
          link: body.link as string,
          headline: body.headline as string,
          description: body.description as string,
          call_to_action: body.call_to_action as AdCreativeParams['call_to_action'],
        } satisfies AdCreativeParams);
        return Response.json({ creative: result });
      }

      case 'ad': {
        if (!accountId) return missing(['accountId']);
        const required = ['name', 'adset_id', 'creative_id', 'status'] as const;
        const missingFields = required.filter(f => body[f] === undefined || body[f] === null);
        if (missingFields.length > 0) return missing([...missingFields]);
        const result = await createAd(accountId, {
          name: body.name as string,
          adset_id: body.adset_id as string,
          creative_id: body.creative_id as string,
          status: body.status as 'PAUSED' | 'ACTIVE',
        } satisfies AdParams);
        return Response.json({ ad: result });
      }

      case 'postId': {
        const adId = body.adId as string | undefined;
        if (!adId) return missing(['adId']);
        const result = await getAdPostId(adId);
        return Response.json(result);
      }

      default:
        return Response.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'META_RATE_LIMIT') {
      return Response.json(
        { error: 'Meta API rate limit reached. Please wait a moment and try again.' },
        { status: 429 },
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[api/meta-ads/create] action=${action} error:`, err);
    return Response.json({ error: message }, { status: 500 });
  }
}
