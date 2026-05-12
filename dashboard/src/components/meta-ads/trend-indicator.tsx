'use client';

import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
  change: number;
  direction: 'up' | 'down' | 'flat';
  /** If true, a decrease is good (e.g., CPM, CPC, CPL) */
  lowerIsBetter?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function TrendIndicator({
  change,
  direction,
  lowerIsBetter = false,
  className,
  showLabel = true,
}: TrendIndicatorProps) {
  if (direction === 'flat') {
    return (
      <span className={cn('inline-flex items-center gap-0.5 text-muted-foreground', className)}>
        <IconMinus size={14} />
        {showLabel && <span className="text-xs tabular-nums">0%</span>}
      </span>
    );
  }

  // Determine if the trend is "good" or "bad"
  const isGood = lowerIsBetter ? direction === 'down' : direction === 'up';

  const Icon = direction === 'up' ? IconTrendingUp : IconTrendingDown;
  const colorClass = isGood ? 'text-green-500' : 'text-red-500';

  return (
    <span className={cn('inline-flex items-center gap-0.5', colorClass, className)}>
      <Icon size={14} />
      {showLabel && (
        <span className="text-xs tabular-nums font-medium">
          {Math.abs(change)}%
        </span>
      )}
    </span>
  );
}
