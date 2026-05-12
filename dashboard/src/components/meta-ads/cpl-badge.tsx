'use client';

import { cn } from '@/lib/utils';

interface CplBadgeProps {
  value: number;
  className?: string;
}

/**
 * Color-coded cost per lead badge:
 * - Under $10 = green (crushing it)
 * - $10-12 = yellow/amber (solid)
 * - $12-15 = orange (watch)
 * - Over $15 = red (flag)
 */
export function CplBadge({ value, className }: CplBadgeProps) {
  if (value === 0) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>--</span>
    );
  }

  let colorClass: string;
  let label: string;

  if (value < 10) {
    colorClass = 'bg-green-500/15 text-green-500 ring-green-500/20';
    label = 'Great';
  } else if (value < 12) {
    colorClass = 'bg-amber-500/15 text-amber-500 ring-amber-500/20';
    label = 'Solid';
  } else if (value < 15) {
    colorClass = 'bg-orange-500/15 text-orange-500 ring-orange-500/20';
    label = 'Watch';
  } else {
    colorClass = 'bg-red-500/15 text-red-500 ring-red-500/20';
    label = 'Flag';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1',
        colorClass,
        className,
      )}
    >
      <span className="tabular-nums">${value.toFixed(2)}</span>
      <span className="text-[10px] opacity-80">{label}</span>
    </span>
  );
}
