'use client';

import { cn } from '@/lib/utils';
import { IconChevronDown } from '@tabler/icons-react';

interface AdAccount {
  id: string;
  account_id: string;
  name: string;
  account_status: number;
  currency: string;
}

interface AccountSelectorProps {
  accounts: AdAccount[];
  selectedId: string;
  onSelect: (accountId: string) => void;
  className?: string;
}

function statusLabel(status: number): string {
  switch (status) {
    case 1: return 'Active';
    case 2: return 'Disabled';
    case 3: return 'Unsettled';
    case 7: return 'Pending Review';
    case 8: return 'Pending Closure';
    case 9: return 'In Grace Period';
    case 100: return 'Closed';
    case 101: return 'Any Active';
    case 201: return 'Any Closed';
    default: return 'Unknown';
  }
}

export function AccountSelector({
  accounts,
  selectedId,
  onSelect,
  className,
}: AccountSelectorProps) {
  const selected = accounts.find(a => a.id === selectedId);

  return (
    <div className={cn('relative', className)}>
      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="appearance-none rounded-lg border border-input bg-card px-3 py-2 pr-8 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring/50 cursor-pointer"
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} ({statusLabel(account.account_status)}) - {account.currency}
          </option>
        ))}
      </select>
      <IconChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
