'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOrg } from '@/hooks/use-org';
import {
  IconLayoutDashboard,
  IconRobot,
  IconListCheck,
  IconShieldCheck,
  IconActivity,
  IconChartDots3,
  IconFlask,
  IconBook2,
  IconPuzzle,
  IconSettings,
  IconClock,
  IconTarget,
  IconMessages,
  IconBrandMeta,
  IconLogout,
  IconBulb,
  IconInbox,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  badge?: 'approvals' | 'tasks';
  section: string;
}

const navItems: NavItem[] = [
  { label: 'Overview',  href: '/',              icon: IconLayoutDashboard, section: 'core' },
  { label: 'Agents',    href: '/agents',         icon: IconRobot,           section: 'core' },
  { label: 'Tasks',     href: '/tasks',          icon: IconListCheck,       section: 'core' },
  { label: 'Activity',  href: '/activity',       icon: IconActivity,        section: 'core' },

  { label: 'Comms',         href: '/comms',         icon: IconMessages,    section: 'ops' },
  { label: 'Approvals',     href: '/approvals',     icon: IconShieldCheck, section: 'ops', badge: 'approvals' },
  { label: 'Workflows',     href: '/workflows',     icon: IconClock,       section: 'ops' },
  { label: 'Strategy',      href: '/strategy',      icon: IconTarget,      section: 'ops' },
  { label: 'Analytics',     href: '/analytics',     icon: IconChartDots3,  section: 'ops' },
  { label: 'Meta Ads',      href: '/meta-ads',      icon: IconBrandMeta,   section: 'ops' },

  { label: 'Intel',          href: '/intel',          icon: IconBulb,    section: 'intel' },
  { label: 'Inbox',          href: '/inbox',          icon: IconInbox,   section: 'intel' },
  { label: 'Knowledge Base', href: '/knowledge-base', icon: IconBook2,   section: 'intel' },
  { label: 'Experiments',    href: '/experiments',    icon: IconFlask,   section: 'intel' },
  { label: 'Skills',         href: '/skills',         icon: IconPuzzle,  section: 'intel' },
];

const sectionLabels: Record<string, string> = {
  core: '',
  ops: 'Operations',
  intel: 'Intelligence',
};

interface SidebarProps {
  pendingApprovals?: number;
  onNavigate?: () => void;
}

export function Sidebar({ pendingApprovals = 0, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { currentOrg } = useOrg();

  function orgHref(href: string) {
    if (currentOrg && currentOrg !== 'all') {
      return `${href}${href.includes('?') ? '&' : '?'}org=${encodeURIComponent(currentOrg)}`;
    }
    return href;
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  const sections = ['core', 'ops', 'intel'];

  return (
    <aside
      className="flex h-screen shrink-0 flex-col relative"
      style={{
        width: 232,
        background: '#0e1220',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Blue tint overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(59,130,246,0.04) 0%, transparent 60%)',
          zIndex: 0,
        }}
      />

      {/* Brand */}
      <div className="relative flex items-center gap-2.5 px-4 py-4" style={{ zIndex: 1 }}>
        {/* Neural Node mark */}
        <svg viewBox="0 0 48 48" fill="none" className="shrink-0" style={{ width: 22, height: 22 }}>
          <g stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="13" x2="24" y2="22" />
            <line x1="36" y1="13" x2="24" y2="22" />
            <line x1="12" y1="35" x2="24" y2="22" />
            <line x1="36" y1="35" x2="24" y2="22" />
            <line x1="12" y1="13" x2="12" y2="35" />
            <line x1="36" y1="13" x2="36" y2="35" />
          </g>
          <circle cx="12" cy="13" r="2.6" fill="#FFFFFF" />
          <circle cx="36" cy="13" r="2.6" fill="#FFFFFF" />
          <circle cx="12" cy="35" r="2.6" fill="#FFFFFF" />
          <circle cx="36" cy="35" r="2.6" fill="#FFFFFF" />
          <circle cx="24" cy="22" r="3.2" fill="#3B82F6" />
        </svg>

        {/* Wordmark */}
        <span
          className="select-none"
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: 17,
            letterSpacing: '-0.025em',
            color: '#e8eaf2',
            lineHeight: 1,
          }}
        >
          <span style={{ fontWeight: 300 }}>S</span>
          <span style={{ fontWeight: 900, color: '#3B82F6' }}>ai</span>
          <span style={{ fontWeight: 300 }}>je</span>
          <span style={{ fontWeight: 600, color: '#3B82F6', fontSize: '0.75em', verticalAlign: 'super' }}>IQ</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="relative flex flex-1 flex-col overflow-y-auto px-2 pb-2" style={{ zIndex: 1 }}>
        {sections.map((section) => {
          const items = navItems.filter((i) => i.section === section);
          const label = sectionLabels[section];

          return (
            <div key={section} className={section !== 'core' ? 'mt-1' : ''}>
              {label && (
                <p
                  className="px-3 pb-1 pt-3"
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px',
                    color: '#4a5170',
                  }}
                >
                  {label}
                </p>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const showBadge = item.badge === 'approvals' && pendingApprovals > 0;

                return (
                  <Link
                    key={item.href}
                    href={orgHref(item.href)}
                    onClick={onNavigate}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-lg mb-0.5 overflow-hidden',
                      active ? 'nav-active' : ''
                    )}
                    style={{
                      padding: '9px 10px',
                      fontSize: 13,
                      color: active ? '#e8eaf2' : '#6b7494',
                      transition: 'all 0.15s ease',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.color = '#e8eaf2';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.color = '#6b7494';
                    }}
                  >
                    <Icon
                      size={16}
                      className="shrink-0"
                      style={{ color: active ? '#e8eaf2' : 'inherit' }}
                    />
                    <span className="truncate flex-1">{item.label}</span>
                    {showBadge && (
                      <span
                        className="shrink-0 rounded-full"
                        style={{
                          width: 6,
                          height: 6,
                          background: '#f59e0b',
                          boxShadow: '0 0 6px #f59e0b',
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bottom: Settings + Logout */}
      <div
        className="relative px-2 pb-4 pt-2 flex flex-col gap-0.5"
        style={{
          zIndex: 1,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {[
          { label: 'Settings', href: '/settings', Icon: IconSettings },
        ].map(({ label, href, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={orgHref(href)}
              onClick={onNavigate}
              className={cn('relative flex items-center gap-2.5 rounded-lg overflow-hidden', active ? 'nav-active' : '')}
              style={{
                padding: '9px 10px',
                fontSize: 13,
                color: active ? '#e8eaf2' : '#6b7494',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = '#e8eaf2'; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = '#6b7494'; }}
            >
              <Icon size={16} className="shrink-0" style={{ color: 'inherit' }} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => signOut({ redirectTo: '/login' })}
          className="flex items-center gap-2.5 rounded-lg w-full text-left"
          style={{
            padding: '9px 10px',
            fontSize: 13,
            color: '#6b7494',
            transition: 'all 0.15s ease',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#e8eaf2'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7494'; }}
        >
          <IconLogout size={16} className="shrink-0" style={{ color: 'inherit' }} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
