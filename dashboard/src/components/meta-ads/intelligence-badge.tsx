'use client';

import { cn } from '@/lib/utils';

interface MetaMetricsSlim {
  spend: number;
  costPerResult: number;
  ctr: number;
}

export interface IntelBadge {
  type: 'winner' | 'watch' | 'pause';
  label: string;
  reason: string;
}

export function getIntelBadge(metrics: MetaMetricsSlim, minSpend = 10): IntelBadge | null {
  const { spend, costPerResult: cpl, ctr } = metrics;
  if (spend < minSpend || cpl === 0) return null;

  if (cpl < 8 && ctr >= 1.5) {
    return { type: 'winner', label: 'Winner', reason: `$${cpl.toFixed(2)} CPL · ${ctr.toFixed(2)}% CTR` };
  }
  if (cpl >= 15) {
    return { type: 'pause', label: 'Pause?', reason: `$${cpl.toFixed(2)} CPL — over $15 threshold` };
  }
  if (cpl >= 12 || (ctr > 0 && ctr < 0.8 && spend >= 30)) {
    return {
      type: 'watch',
      label: 'Watch',
      reason: cpl >= 12 ? `$${cpl.toFixed(2)} CPL` : `${ctr.toFixed(2)}% CTR low`,
    };
  }
  return null;
}

export function IntelligenceBadge({ badge, className }: { badge: IntelBadge; className?: string }) {
  const styles: Record<IntelBadge['type'], string> = {
    winner: 'bg-green-500/15 text-green-400 ring-green-500/25',
    watch: 'bg-amber-500/15 text-amber-400 ring-amber-500/25',
    pause: 'bg-red-500/15 text-red-400 ring-red-500/25',
  };

  return (
    <span
      title={badge.reason}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 cursor-default select-none',
        styles[badge.type],
        className,
      )}
    >
      {badge.label}
    </span>
  );
}
