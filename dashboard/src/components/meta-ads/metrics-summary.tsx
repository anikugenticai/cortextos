'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendIndicator } from './trend-indicator';
import { CplBadge } from './cpl-badge';
import { cn } from '@/lib/utils';
import {
  IconCash,
  IconTargetArrow,
  IconCoinOff,
  IconClick,
  IconEye,
} from '@tabler/icons-react';

interface MetaTrend {
  value: number;
  previousValue: number;
  change: number;
  direction: 'up' | 'down' | 'flat';
}

interface SummaryMetrics {
  spend: number;
  results: number;
  costPerResult: number;
  ctr: number;
  cpm: number;
  trends: {
    spend: MetaTrend;
    cpm: MetaTrend;
    cpc: MetaTrend;
    ctr: MetaTrend;
    costPerResult: MetaTrend;
    frequency: MetaTrend;
  };
}

interface MetricsSummaryProps {
  metrics: SummaryMetrics | null;
  loading?: boolean;
}

function formatCurrency(val: number): string {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
  return `$${val.toFixed(2)}`;
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-7 w-24 rounded bg-muted" />
          <div className="h-3 w-12 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsSummary({ metrics, loading }: MetricsSummaryProps) {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Spend',
      value: formatCurrency(metrics.spend),
      trend: metrics.trends.spend,
      lowerIsBetter: true,
      icon: <IconCash size={16} className="text-primary" />,
    },
    {
      label: 'Results (Leads)',
      value: metrics.results.toLocaleString(),
      trend: null, // No direct trend for count
      lowerIsBetter: false,
      icon: <IconTargetArrow size={16} className="text-primary" />,
    },
    {
      label: 'Cost / Lead',
      value: null, // Use CplBadge
      cplValue: metrics.costPerResult,
      trend: metrics.trends.costPerResult,
      lowerIsBetter: true,
      icon: <IconCoinOff size={16} className="text-primary" />,
    },
    {
      label: 'CTR (link)',
      value: `${metrics.ctr.toFixed(2)}%`,
      trend: metrics.trends.ctr,
      lowerIsBetter: false,
      icon: <IconClick size={16} className="text-primary" />,
    },
    {
      label: 'CPM',
      value: formatCurrency(metrics.cpm),
      trend: metrics.trends.cpm,
      lowerIsBetter: true,
      icon: <IconEye size={16} className="text-primary" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {card.label}
                </p>
                {card.cplValue !== undefined ? (
                  <CplBadge value={card.cplValue} className="mt-1" />
                ) : (
                  <p className="text-xl font-semibold tabular-nums">{card.value}</p>
                )}
              </div>
              <div className="rounded-md bg-muted/50 p-1.5">{card.icon}</div>
            </div>
            {card.trend && (
              <div className="mt-2">
                <TrendIndicator
                  change={card.trend.change}
                  direction={card.trend.direction}
                  lowerIsBetter={card.lowerIsBetter}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
