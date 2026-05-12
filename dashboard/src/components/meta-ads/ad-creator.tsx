'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IconBrandMeta,
  IconPhoto,
  IconWand,
  IconRocket,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
  IconAlertTriangle,
  IconExternalLink,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

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

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
}

interface AdSet {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
}

interface Page {
  id: string;
  name: string;
  category: string;
}

interface FormState {
  accountId: string;
  campaignMode: 'existing' | 'new';
  campaignId: string;
  newCampaignName: string;
  newCampaignObjective: string;
  adSetMode: 'existing' | 'new';
  adSetId: string;
  newAdSetName: string;
  newAdSetDailyBudget: string;
  pageId: string;
  imageUrl: string;
  destinationUrl: string;
  primaryText: string;
  headline: string;
  description: string;
  callToAction: string;
}

interface GenerateCopyForm {
  productDescription: string;
  targetAudience: string;
  tone: string;
}

const INITIAL_FORM: FormState = {
  accountId: '',
  campaignMode: 'existing',
  campaignId: '',
  newCampaignName: '',
  newCampaignObjective: '',
  adSetMode: 'existing',
  adSetId: '',
  newAdSetName: '',
  newAdSetDailyBudget: '',
  pageId: '',
  imageUrl: '',
  destinationUrl: '',
  primaryText: '',
  headline: '',
  description: '',
  callToAction: 'LEARN_MORE',
};

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'BOOK_TRAVEL', label: 'Book Travel' },
  { value: 'GET_OFFER', label: 'Get Offer' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
  { value: 'SUBSCRIBE', label: 'Subscribe' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
];

const OBJECTIVE_OPTIONS = [
  { value: 'OUTCOME_AWARENESS', label: 'Awareness' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement' },
  { value: 'OUTCOME_LEADS', label: 'Leads' },
  { value: 'OUTCOME_SALES', label: 'Sales' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion' },
];

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current, total }: { current: number; total: number }) {
  const steps = [
    { num: 1, label: 'Account & Campaign' },
    { num: 2, label: 'Creative & Copy' },
    { num: 3, label: 'Review & Launch' },
  ];

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.slice(0, total).map((s, i) => (
        <div key={s.num} className="flex items-center gap-2">
          {i > 0 && (
            <div
              className={cn(
                'h-px w-8 sm:w-12',
                s.num <= current ? 'bg-primary' : 'bg-border',
              )}
            />
          )}
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
                s.num < current
                  ? 'bg-primary text-primary-foreground'
                  : s.num === current
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {s.num < current ? <IconCheck size={14} /> : s.num}
            </div>
            <span
              className={cn(
                'hidden text-xs sm:inline',
                s.num === current
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ad Preview (Facebook-style card)
// ---------------------------------------------------------------------------

function AdPreview({ form, pageName }: { form: FormState; pageName: string }) {
  const ctaLabel = CTA_OPTIONS.find(c => c.value === form.callToAction)?.label ?? 'Learn More';

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <IconBrandMeta size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold">{pageName || 'Your Page'}</p>
          <p className="text-[10px] text-muted-foreground">Sponsored</p>
        </div>
      </div>

      {form.primaryText && (
        <p className="px-3 pb-2 text-xs leading-relaxed">{form.primaryText}</p>
      )}

      {form.imageUrl ? (
        <div className="relative aspect-video w-full bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={form.imageUrl}
            alt="Ad preview"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-muted">
          <IconPhoto size={32} className="text-muted-foreground/40" />
        </div>
      )}

      <div className="border-t px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {form.destinationUrl && (
              <p className="truncate text-[10px] uppercase text-muted-foreground">
                {(() => { try { return new URL(form.destinationUrl).hostname.replace('www.', ''); } catch { return form.destinationUrl; } })()}
              </p>
            )}
            <p className="truncate text-xs font-semibold">
              {form.headline || 'Your Headline'}
            </p>
            {form.description && (
              <p className="truncate text-[10px] text-muted-foreground">
                {form.description}
              </p>
            )}
          </div>
          <div className="shrink-0 rounded bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase">
            {ctaLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdCreator() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [pages, setPages] = useState<Page[]>([]);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingAdSets, setLoadingAdSets] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generateForm, setGenerateForm] = useState<GenerateCopyForm>({
    productDescription: '',
    targetAudience: '',
    tone: 'professional',
  });

  const [createdAdId, setCreatedAdId] = useState<string | null>(null);
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  const update = (partial: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  // Fetch accounts on mount
  useEffect(() => {
    async function load() {
      setLoadingAccounts(true);
      try {
        const res = await fetch('/api/meta-ads?action=accounts');
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to load accounts');
        const json = await res.json();
        setAccounts(json.accounts ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load accounts');
      }
      setLoadingAccounts(false);
    }
    load();
  }, []);

  // Fetch campaigns when account changes
  useEffect(() => {
    if (!form.accountId) {
      setCampaigns([]);
      return;
    }
    async function load() {
      setLoadingCampaigns(true);
      setCampaigns([]);
      update({ campaignId: '', adSetId: '' });
      setAdSets([]);
      try {
        const res = await fetch(`/api/meta-ads?action=campaigns&accountId=${form.accountId}`);
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to load campaigns');
        const json = await res.json();
        setCampaigns(json.campaigns ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      }
      setLoadingCampaigns(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.accountId]);

  // Fetch ad sets when campaign changes
  useEffect(() => {
    if (!form.campaignId || form.campaignMode !== 'existing') {
      setAdSets([]);
      return;
    }
    async function load() {
      setLoadingAdSets(true);
      setAdSets([]);
      update({ adSetId: '' });
      try {
        const res = await fetch(`/api/meta-ads?action=adsets&campaignId=${form.campaignId}`);
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to load ad sets');
        const json = await res.json();
        setAdSets(json.adsets ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ad sets');
      }
      setLoadingAdSets(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.campaignId, form.campaignMode]);

  // Fetch pages when entering step 2
  useEffect(() => {
    if (step !== 2 || pages.length > 0) return;
    async function load() {
      setLoadingPages(true);
      try {
        const res = await fetch('/api/meta-ads/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'pages' }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to load pages');
        const json = await res.json();
        setPages(json.pages ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pages');
      }
      setLoadingPages(false);
    }
    load();
  }, [step, pages.length]);

  // Generate copy
  async function handleGenerateCopy() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/meta-ads/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: generateForm.productDescription,
          audience: generateForm.targetAudience,
          tone: generateForm.tone,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to generate copy');
      const json = await res.json();
      const first = json.variations?.[0];
      if (first) {
        update({
          primaryText: first.primary_text ?? form.primaryText,
          headline: first.headline ?? form.headline,
        });
      }
      setShowGenerateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate copy');
    }
    setGenerating(false);
  }

  // Submit ad creation
  async function handleSubmit(status: 'PAUSED' | 'ACTIVE') {
    setSubmitting(true);
    setError(null);

    try {
      let campaignId = form.campaignId;
      let adSetId = form.adSetId;

      // Create campaign if new
      if (form.campaignMode === 'new') {
        const res = await fetch('/api/meta-ads/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'campaign',
            accountId: form.accountId,
            name: form.newCampaignName,
            objective: form.newCampaignObjective,
            status,
            special_ad_categories: [],
          }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to create campaign');
        const json = await res.json();
        campaignId = json.campaign.id;
      }

      // Create ad set if new
      if (form.adSetMode === 'new') {
        const res = await fetch('/api/meta-ads/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'adset',
            accountId: form.accountId,
            name: form.newAdSetName,
            campaign_id: campaignId,
            optimization_goal: 'LINK_CLICKS',
            billing_event: 'IMPRESSIONS',
            daily_budget: Math.round(parseFloat(form.newAdSetDailyBudget) * 100),
            targeting: { geo_locations: { countries: ['US'] } },
            start_time: new Date().toISOString(),
            status,
          }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to create ad set');
        const json = await res.json();
        adSetId = json.adset.id;
      }

      // Upload image
      const imgRes = await fetch('/api/meta-ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'uploadImage',
          accountId: form.accountId,
          imageUrl: form.imageUrl,
        }),
      });
      if (!imgRes.ok) throw new Error((await imgRes.json().catch(() => ({}))).error ?? 'Failed to upload image');
      const imgJson = await imgRes.json();
      const imageHash = imgJson.image.hash;

      // Create creative
      const creativeName = `${form.headline} - Creative`;
      const creativeRes = await fetch('/api/meta-ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'creative',
          accountId: form.accountId,
          name: creativeName,
          page_id: form.pageId,
          image_hash: imageHash,
          message: form.primaryText,
          link: form.destinationUrl,
          headline: form.headline,
          description: form.description || ' ',
          call_to_action: { type: form.callToAction, link: form.destinationUrl },
        }),
      });
      if (!creativeRes.ok) throw new Error((await creativeRes.json().catch(() => ({}))).error ?? 'Failed to create creative');
      const creativeJson = await creativeRes.json();
      const creativeId = creativeJson.creative.id;

      // Create ad
      const adName = `${form.headline} - Ad`;
      const adRes = await fetch('/api/meta-ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ad',
          accountId: form.accountId,
          name: adName,
          adset_id: adSetId,
          creative_id: creativeId,
          status,
        }),
      });
      if (!adRes.ok) throw new Error((await adRes.json().catch(() => ({}))).error ?? 'Failed to create ad');
      const adJson = await adRes.json();
      setCreatedAdId(adJson.ad.id);

      // Try to get post ID
      try {
        const postRes = await fetch('/api/meta-ads/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'postId', adId: adJson.ad.id }),
        });
        if (postRes.ok) {
          const postJson = await postRes.json();
          setCreatedPostId(postJson.post_id ?? null);
        }
      } catch {
        // Post ID is optional
      }

      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ad');
    }
    setSubmitting(false);
  }

  // Step validation
  function canAdvance(): boolean {
    if (step === 1) {
      if (!form.accountId) return false;
      if (form.campaignMode === 'existing' && !form.campaignId) return false;
      if (form.campaignMode === 'new' && (!form.newCampaignName || !form.newCampaignObjective)) return false;
      if (form.adSetMode === 'existing' && !form.adSetId) return false;
      if (form.adSetMode === 'new' && (!form.newAdSetName || !form.newAdSetDailyBudget)) return false;
      return true;
    }
    if (step === 2) {
      return !!(form.pageId && form.imageUrl && form.destinationUrl && form.primaryText && form.headline);
    }
    return true;
  }

  const selectedPage = pages.find(p => p.id === form.pageId);

  // Initial loading
  if (loadingAccounts) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <IconLoader2 size={28} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading ad accounts...</p>
      </div>
    );
  }

  // Success state
  if (step === 4 && createdAdId) {
    const accountIdNumeric = form.accountId.replace('act_', '');
    const adsManagerUrl = `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${accountIdNumeric}&selected_ad_ids=${createdAdId}`;

    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <IconCheck size={24} className="text-green-500" />
            </div>
            <h2 className="text-lg font-semibold">Ad Created Successfully</h2>
            <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
              <p>Ad ID: <span className="font-mono text-foreground">{createdAdId}</span></p>
              {createdPostId && (
                <p>Post ID: <span className="font-mono text-foreground">{createdPostId}</span></p>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => { setStep(1); setForm(INITIAL_FORM); setCreatedAdId(null); setCreatedPostId(null); }}>
                Create Another
              </Button>
              <a
                href={adsManagerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                View in Ads Manager
                <IconExternalLink size={14} />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <StepIndicator current={step} total={3} />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <IconAlertTriangle size={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-xs font-medium underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Step 1: Account & Campaign */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconBrandMeta size={18} />
              Select Account & Campaign
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Account */}
            <div className="space-y-2">
              <Label>Ad Account</Label>
              <Select value={form.accountId} onValueChange={(v) => update({ accountId: v ?? '' })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.accountId && (
              <>
                <Separator />

                {/* Campaign */}
                <div className="space-y-3">
                  <Label>Campaign</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={form.campaignMode === 'existing' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => update({ campaignMode: 'existing' })}
                    >
                      Use Existing
                    </Button>
                    <Button
                      variant={form.campaignMode === 'new' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => update({ campaignMode: 'new', campaignId: '' })}
                    >
                      Create New
                    </Button>
                  </div>

                  {form.campaignMode === 'existing' && (
                    <div className="space-y-2">
                      {loadingCampaigns ? (
                        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                          <IconLoader2 size={14} className="animate-spin" />
                          Loading campaigns...
                        </div>
                      ) : (
                        <Select value={form.campaignId} onValueChange={(v) => update({ campaignId: v ?? '' })}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a campaign" />
                          </SelectTrigger>
                          <SelectContent>
                            {campaigns.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {form.campaignMode === 'new' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Campaign Name</Label>
                        <Input
                          placeholder="e.g., Summer Launch 2026"
                          value={form.newCampaignName}
                          onChange={(e) => update({ newCampaignName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Objective</Label>
                        <Select value={form.newCampaignObjective} onValueChange={(v) => update({ newCampaignObjective: v ?? '' })}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select objective" />
                          </SelectTrigger>
                          <SelectContent>
                            {OBJECTIVE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {(form.campaignId || form.campaignMode === 'new') && (
                  <>
                    <Separator />

                    {/* Ad Set */}
                    <div className="space-y-3">
                      <Label>Ad Set</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={form.adSetMode === 'existing' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => update({ adSetMode: 'existing' })}
                          disabled={form.campaignMode === 'new'}
                        >
                          Use Existing
                        </Button>
                        <Button
                          variant={form.adSetMode === 'new' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => update({ adSetMode: 'new', adSetId: '' })}
                        >
                          Create New
                        </Button>
                      </div>

                      {form.adSetMode === 'existing' && form.campaignMode === 'existing' && (
                        <div className="space-y-2">
                          {loadingAdSets ? (
                            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                              <IconLoader2 size={14} className="animate-spin" />
                              Loading ad sets...
                            </div>
                          ) : (
                            <Select value={form.adSetId} onValueChange={(v) => update({ adSetId: v ?? '' })}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select an ad set" />
                              </SelectTrigger>
                              <SelectContent>
                                {adSets.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}

                      {form.adSetMode === 'new' && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Ad Set Name</Label>
                            <Input
                              placeholder="e.g., US - Broad - 18-65"
                              value={form.newAdSetName}
                              onChange={(e) => update({ newAdSetName: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Daily Budget (USD)</Label>
                            <Input
                              type="number"
                              placeholder="e.g., 100"
                              min="1"
                              step="1"
                              value={form.newAdSetDailyBudget}
                              onChange={(e) => update({ newAdSetDailyBudget: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={() => { setError(null); setStep(2); }} disabled={!canAdvance()}>
              Next
              <IconChevronRight size={14} data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Creative & Copy */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconPhoto size={18} />
              Creative & Copy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Page */}
            <div className="space-y-2">
              <Label>Facebook Page</Label>
              {loadingPages ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <IconLoader2 size={14} className="animate-spin" />
                  Loading pages...
                </div>
              ) : (
                <Select value={form.pageId} onValueChange={(v) => update({ pageId: v ?? '' })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a page" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            {/* Image */}
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={form.imageUrl}
                onChange={(e) => update({ imageUrl: e.target.value })}
              />
              {form.imageUrl && (
                <div className="relative mt-2 aspect-video w-full max-w-xs overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Destination URL */}
            <div className="space-y-2">
              <Label>Destination URL</Label>
              <Input
                placeholder="https://yoursite.com/offer"
                value={form.destinationUrl}
                onChange={(e) => update({ destinationUrl: e.target.value })}
              />
            </div>

            <Separator />

            {/* Copy section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Ad Copy</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGenerateForm(!showGenerateForm)}
                >
                  <IconWand size={14} data-icon="inline-start" />
                  Generate Copy
                </Button>
              </div>

              {showGenerateForm && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Product / Offer Description</Label>
                    <Textarea
                      placeholder="Describe what you're promoting..."
                      rows={2}
                      value={generateForm.productDescription}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, productDescription: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Target Audience</Label>
                    <Input
                      placeholder="e.g., Small business owners aged 30-55"
                      value={generateForm.targetAudience}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Tone</Label>
                    <Select value={generateForm.tone} onValueChange={(v) => setGenerateForm(prev => ({ ...prev, tone: v ?? 'professional' }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleGenerateCopy}
                    disabled={generating || !generateForm.productDescription}
                  >
                    {generating ? (
                      <>
                        <IconLoader2 size={14} className="animate-spin" data-icon="inline-start" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <IconWand size={14} data-icon="inline-start" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label>Primary Text</Label>
                <Textarea
                  placeholder="The main body of your ad..."
                  rows={3}
                  value={form.primaryText}
                  onChange={(e) => update({ primaryText: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Headline</Label>
                <Input
                  placeholder="Grab attention in a few words"
                  value={form.headline}
                  onChange={(e) => update({ headline: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  placeholder="Additional context below the headline"
                  value={form.description}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Call to Action</Label>
                <Select value={form.callToAction} onValueChange={(v) => update({ callToAction: v ?? 'LEARN_MORE' })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CTA_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => { setError(null); setStep(1); }}>
              <IconChevronLeft size={14} data-icon="inline-start" />
              Back
            </Button>
            <Button onClick={() => { setError(null); setStep(3); }} disabled={!canAdvance()}>
              Next
              <IconChevronRight size={14} data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Review & Launch */}
      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconRocket size={18} />
                Review & Launch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Configuration</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account</span>
                    <span className="font-medium">
                      {accounts.find(a => a.id === form.accountId)?.name ?? form.accountId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Campaign</span>
                    <span className="font-medium">
                      {form.campaignMode === 'new'
                        ? form.newCampaignName
                        : campaigns.find(c => c.id === form.campaignId)?.name ?? form.campaignId}
                    </span>
                  </div>
                  {form.campaignMode === 'new' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Objective</span>
                      <Badge variant="secondary">
                        {OBJECTIVE_OPTIONS.find(o => o.value === form.newCampaignObjective)?.label ?? form.newCampaignObjective}
                      </Badge>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ad Set</span>
                    <span className="font-medium">
                      {form.adSetMode === 'new'
                        ? form.newAdSetName
                        : adSets.find(a => a.id === form.adSetId)?.name ?? form.adSetId}
                    </span>
                  </div>
                  {form.adSetMode === 'new' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily Budget</span>
                      <span className="font-medium">${form.newAdSetDailyBudget}/day</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Page</span>
                    <span className="font-medium">{selectedPage?.name ?? form.pageId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CTA</span>
                    <Badge variant="secondary">
                      {CTA_OPTIONS.find(c => c.value === form.callToAction)?.label}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Ad Preview */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Ad Preview</h3>
                <AdPreview form={form} pageName={selectedPage?.name ?? ''} />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => { setError(null); setStep(2); }} disabled={submitting}>
                <IconChevronLeft size={14} data-icon="inline-start" />
                Back
              </Button>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => handleSubmit('PAUSED')}
                  disabled={submitting}
                >
                  {submitting ? (
                    <IconLoader2 size={14} className="animate-spin" data-icon="inline-start" />
                  ) : null}
                  Create (Paused)
                </Button>
                <Button
                  className="flex-1 sm:flex-none"
                  onClick={() => handleSubmit('ACTIVE')}
                  disabled={submitting}
                >
                  {submitting ? (
                    <IconLoader2 size={14} className="animate-spin" data-icon="inline-start" />
                  ) : (
                    <IconRocket size={14} data-icon="inline-start" />
                  )}
                  Create & Launch
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
