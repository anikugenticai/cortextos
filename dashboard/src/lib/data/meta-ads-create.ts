/**
 * Meta Marketing API write operations layer.
 * Handles campaign, ad set, creative, and ad creation.
 */

const META_API_BASE = `https://graph.facebook.com/${process.env.META_ADS_API_VERSION || 'v25.0'}`;
const ACCESS_TOKEN = process.env.META_ADS_ACCESS_TOKEN || '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetaPage {
  id: string;
  name: string;
  category: string;
}

export interface MetaCustomConversion {
  id: string;
  name: string;
  rule: string;
}

export interface CampaignParams {
  name: string;
  objective: string;
  status: 'PAUSED' | 'ACTIVE';
  special_ad_categories?: string[];
}

export interface AdSetParams {
  name: string;
  campaign_id: string;
  optimization_goal: string;
  billing_event: string;
  daily_budget: number;
  targeting: Record<string, unknown>;
  start_time: string;
  promoted_object?: {
    custom_conversion_id?: string;
    pixel_id?: string;
    custom_event_type?: string;
  };
  status: 'PAUSED' | 'ACTIVE';
  bid_strategy?: string;
}

export interface AdCreativeParams {
  name: string;
  page_id: string;
  image_hash: string;
  message: string;
  link: string;
  headline: string;
  description: string;
  call_to_action: {
    type: string;
    link: string;
  };
}

export interface AdParams {
  name: string;
  adset_id: string;
  creative_id: string;
  status: 'PAUSED' | 'ACTIVE';
}

interface MetaApiError {
  error: {
    message: string;
    type: string;
    code: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function metaPost<T>(endpoint: string, body: Record<string, string>): Promise<T> {
  const params = new URLSearchParams({ ...body, access_token: ACCESS_TOKEN });

  const res = await fetch(`${META_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  });

  if (res.status === 429) {
    throw new Error('META_RATE_LIMIT');
  }

  const json = await res.json();

  if (!res.ok) {
    const apiError = json as MetaApiError;
    const msg = apiError.error?.message ?? `Meta API error: ${res.status}`;
    console.error(`[meta-ads-create] API error ${res.status}: ${msg}`);
    throw new Error(msg);
  }

  return json as T;
}

async function metaFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${META_API_BASE}${endpoint}`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), { cache: 'no-store' });

  if (res.status === 429) {
    throw new Error('META_RATE_LIMIT');
  }

  const json = await res.json();

  if (!res.ok) {
    const apiError = json as MetaApiError;
    const msg = apiError.error?.message ?? `Meta API error: ${res.status}`;
    console.error(`[meta-ads-create] API error ${res.status}: ${msg}`);
    throw new Error(msg);
  }

  return json as T;
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

export async function getPages(): Promise<MetaPage[]> {
  const data = await metaFetch<{ data: MetaPage[] }>('/me/accounts', {
    fields: 'id,name,category',
  });
  return data.data;
}

export async function getCustomConversions(accountId: string): Promise<MetaCustomConversion[]> {
  const data = await metaFetch<{ data: MetaCustomConversion[] }>(
    `/${accountId}/customconversions`,
    { fields: 'id,name,rule' },
  );
  return data.data;
}

export async function createCampaign(
  accountId: string,
  params: CampaignParams,
): Promise<{ id: string }> {
  return metaPost<{ id: string }>(`/${accountId}/campaigns`, {
    name: params.name,
    objective: params.objective,
    status: params.status,
    special_ad_categories: JSON.stringify(params.special_ad_categories ?? []),
  });
}

export async function createAdSet(
  accountId: string,
  params: AdSetParams,
): Promise<{ id: string }> {
  const body: Record<string, string> = {
    name: params.name,
    campaign_id: params.campaign_id,
    optimization_goal: params.optimization_goal,
    billing_event: params.billing_event,
    daily_budget: String(params.daily_budget),
    targeting: JSON.stringify(params.targeting),
    start_time: params.start_time,
    status: params.status,
  };

  if (params.promoted_object) {
    body.promoted_object = JSON.stringify(params.promoted_object);
  }

  if (params.bid_strategy) {
    body.bid_strategy = params.bid_strategy;
  }

  return metaPost<{ id: string }>(`/${accountId}/adsets`, body);
}

export async function uploadImageByUrl(
  accountId: string,
  imageUrl: string,
): Promise<{ hash: string; url: string }> {
  const result = await metaPost<{ images: Record<string, { hash: string; url: string }> }>(
    `/${accountId}/adimages`,
    { url: imageUrl },
  );

  const firstKey = Object.keys(result.images)[0];
  const image = result.images[firstKey];
  return { hash: image.hash, url: image.url };
}

export async function createAdCreative(
  accountId: string,
  params: AdCreativeParams,
): Promise<{ id: string }> {
  const objectStorySpec = {
    page_id: params.page_id,
    link_data: {
      image_hash: params.image_hash,
      message: params.message,
      link: params.link,
      name: params.headline,
      description: params.description,
      call_to_action: {
        type: params.call_to_action.type,
        value: { link: params.call_to_action.link },
      },
    },
  };

  return metaPost<{ id: string }>(`/${accountId}/adcreatives`, {
    name: params.name,
    object_story_spec: JSON.stringify(objectStorySpec),
  });
}

export async function createAd(
  accountId: string,
  params: AdParams,
): Promise<{ id: string }> {
  return metaPost<{ id: string }>(`/${accountId}/ads`, {
    name: params.name,
    adset_id: params.adset_id,
    creative: JSON.stringify({ creative_id: params.creative_id }),
    status: params.status,
  });
}

export async function getAdPostId(adId: string): Promise<{ post_id: string }> {
  const data = await metaFetch<{ effective_object_story_id: string }>(
    `/${adId}`,
    { fields: 'effective_object_story_id' },
  );
  return { post_id: data.effective_object_story_id };
}
