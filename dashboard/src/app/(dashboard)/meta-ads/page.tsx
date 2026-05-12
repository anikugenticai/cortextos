import Link from 'next/link';
import { MetaAdsDashboard } from '@/components/meta-ads/meta-ads-dashboard';

export const dynamic = 'force-dynamic';

export default function MetaAdsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meta Ads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Campaign performance across all ad accounts.
          </p>
        </div>
        <Link
          href="/meta-ads/create"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          + Create Ad
        </Link>
      </div>
      <MetaAdsDashboard />
    </div>
  );
}
