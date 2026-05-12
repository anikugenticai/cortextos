'use client';

interface CampaignSlim {
  id: string;
  name: string;
  status: string;
  metrics: {
    spend: number;
    costPerResult: number;
    results: number;
  };
}

interface BudgetSuggestionsProps {
  campaigns: CampaignSlim[];
}

export function BudgetSuggestions({ campaigns }: BudgetSuggestionsProps) {
  const MIN_SPEND = 20;
  const active = campaigns.filter(
    c => c.status === 'ACTIVE' && c.metrics.spend >= MIN_SPEND && c.metrics.costPerResult > 0,
  );

  if (active.length === 0) return null;

  const sorted = [...active].sort((a, b) => a.metrics.costPerResult - b.metrics.costPerResult);
  const winners = sorted.filter(c => c.metrics.costPerResult < 8).slice(0, 3);
  const losers = sorted.reverse().filter(c => c.metrics.costPerResult >= 15).slice(0, 3);

  if (winners.length === 0 && losers.length === 0) return null;

  const totalWinnerSpend = winners.reduce((s, c) => s + c.metrics.spend, 0);
  const totalLoserSpend = losers.reduce((s, c) => s + c.metrics.spend, 0);

  return (
    <div
      className="rounded-lg border border-border bg-muted/10 p-4 space-y-3"
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Budget Intelligence
        </p>
        {winners.length > 0 && losers.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            Reallocate <span className="text-red-400">${totalLoserSpend.toFixed(0)}</span> → <span className="text-green-400">${totalWinnerSpend.toFixed(0)}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {winners.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-green-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
              Scale Up
            </p>
            {winners.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-[11px]">
                <span className="truncate text-foreground flex-1 min-w-0">{c.name}</span>
                <span className="text-green-400 font-mono tabular-nums shrink-0">
                  ${c.metrics.costPerResult.toFixed(2)} CPL
                </span>
              </div>
            ))}
          </div>
        )}

        {losers.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-red-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />
              Consider Pausing
            </p>
            {losers.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-[11px]">
                <span className="truncate text-foreground flex-1 min-w-0">{c.name}</span>
                <span className="text-red-400 font-mono tabular-nums shrink-0">
                  ${c.metrics.costPerResult.toFixed(2)} CPL
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
