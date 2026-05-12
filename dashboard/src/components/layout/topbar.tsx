'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { IconSearch, IconMenu2 } from '@tabler/icons-react';
import { OrgSelector } from './org-selector';

interface TopbarProps {
  orgs: string[];
  currentOrg: string;
  onOrgChange: (org: string) => void;
  onMenuClick?: () => void;
}

const PAGE_LABELS: Record<string, string> = {
  '/': 'Overview',
  '/agents': 'Agents',
  '/tasks': 'Tasks',
  '/activity': 'Activity',
  '/comms': 'Comms',
  '/approvals': 'Approvals',
  '/workflows': 'Workflows',
  '/strategy': 'Strategy',
  '/analytics': 'Analytics',
  '/meta-ads': 'Meta Ads',
  '/knowledge-base': 'Knowledge Base',
  '/experiments': 'Experiments',
  '/skills': 'Skills',
  '/settings': 'Settings',
};

function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    function tick() {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const offset = -now.getTimezoneOffset() / 60;
      const sign = offset >= 0 ? '+' : '−';
      setTime(`${hh}:${mm}:${ss} · UTC${sign}${Math.abs(offset)}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function Topbar({ orgs, currentOrg, onOrgChange, onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const clock = useClock();

  const username = session?.user?.name ?? 'User';
  const initials = username
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Determine current page label for breadcrumb
  let pageLabel = 'Overview';
  for (const [path, label] of Object.entries(PAGE_LABELS)) {
    if (path === '/' ? pathname === '/' : pathname.startsWith(path)) {
      pageLabel = label;
      break;
    }
  }

  return (
    <header
      className="flex shrink-0 items-center gap-3 px-5"
      style={{
        height: 60,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(10,13,26,0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 5,
        position: 'relative',
      }}
    >
      {/* Mobile menu button */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="md:hidden shrink-0 rounded-md p-1.5 transition-colors"
          style={{ color: '#6b7494' }}
          aria-label="Open menu"
        >
          <IconMenu2 size={18} />
        </button>
      )}

      {/* Breadcrumb */}
      <div
        className="hidden md:flex items-center gap-1.5 shrink-0"
        style={{ fontSize: 13, fontWeight: 400 }}
      >
        <span style={{ color: '#4a5170' }}>Workspace</span>
        <span style={{ color: '#4a5170' }}>/</span>
        <span style={{ color: '#e8eaf2' }}>{pageLabel}</span>
      </div>

      {/* Search */}
      <div
        className="hidden md:flex items-center gap-2 rounded-lg px-3"
        style={{
          flex: '0 1 380px',
          height: 34,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          color: '#4a5170',
        }}
      >
        <IconSearch size={14} className="shrink-0" style={{ color: '#4a5170' }} />
        <span style={{ flex: 1, fontSize: 13, color: '#4a5170', userSelect: 'none' }}>
          Search agents, tasks, decisions…
        </span>
        <kbd
          style={{
            fontFamily: 'var(--font-jetbrains), monospace',
            fontSize: 10,
            color: '#4a5170',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            padding: '1px 5px',
          }}
        >
          ⌘ K
        </kbd>
      </div>

      {/* Org selector (mobile/compact) */}
      <div className="md:hidden flex-1">
        <OrgSelector orgs={orgs} currentOrg={currentOrg} onOrgChange={onOrgChange} />
      </div>

      <div className="flex-1 hidden md:block" />

      {/* Live pill */}
      <div
        className="hidden md:flex items-center gap-1.5 rounded-full px-3 py-1 shrink-0"
        style={{
          background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.2)',
        }}
      >
        <span
          className="animate-live-pulse rounded-full shrink-0"
          style={{ width: 6, height: 6, background: '#22c55e', display: 'inline-block' }}
        />
        <span
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.8px',
            color: '#22c55e',
            textTransform: 'uppercase',
          }}
        >
          Systems Nominal
        </span>
      </div>

      {/* Clock */}
      <span
        className="hidden lg:block shrink-0 tabular-nums"
        style={{
          fontFamily: 'var(--font-jetbrains), monospace',
          fontSize: 12,
          color: '#4a5170',
          letterSpacing: '0.02em',
        }}
      >
        {clock}
      </span>

      {/* Avatar */}
      <button
        onClick={() => signOut({ redirectTo: '/login' })}
        className="shrink-0 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
        style={{
          width: 30,
          height: 30,
          background: 'linear-gradient(135deg, #3B82F6, #2dd4bf)',
          fontSize: 11,
          fontWeight: 600,
          color: '#0a0d1a',
          border: 'none',
          cursor: 'pointer',
        }}
        title={`Signed in as ${username} · Click to sign out`}
      >
        {initials}
      </button>
    </header>
  );
}
