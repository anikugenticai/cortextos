'use client';

import Link from 'next/link';
import {
  IconPlus,
  IconMessage,
  IconShieldCheck,
  IconPlayerPlay,
  IconBrain,
  IconHandStop,
} from '@tabler/icons-react';

interface Action {
  label: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  onClick?: () => void;
}

const ACTIONS: Action[] = [
  { label: 'New Task',       icon: <IconPlus size={14} />,        color: '#3B82F6', href: '/tasks' },
  { label: 'Message Agent',  icon: <IconMessage size={14} />,     color: '#2dd4bf', href: '/comms' },
  { label: 'View Approvals', icon: <IconShieldCheck size={14} />, color: '#f59e0b', href: '/approvals' },
  { label: 'Run Workflow',   icon: <IconPlayerPlay size={14} />,  color: '#3B82F6', href: '/workflows' },
  { label: 'Ask Brain',      icon: <IconBrain size={14} />,       color: '#2dd4bf', href: '/knowledge-base' },
  { label: 'Halt Fleet',     icon: <IconHandStop size={14} />,    color: '#ef4444', href: '/agents' },
];

export function QuickActions() {
  return (
    <div className="glass-card" style={{ padding: '18px 20px' }}>
      <p style={{
        fontSize: 10, fontWeight: 500, textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#4a5170', marginBottom: 14,
      }}>
        Quick Actions
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
        {ACTIONS.map(action => {
          const inner = (
            <>
              {/* Icon chip */}
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: `${action.color}20`,
                border: `1px solid ${action.color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: action.color, flexShrink: 0,
              }}>
                {action.icon}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7494' }}>
                {action.label}
              </span>
            </>
          );

          const baseStyle: React.CSSProperties = {
            display: 'flex', alignItems: 'center', gap: 8,
            padding: 12, borderRadius: 10,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            cursor: 'pointer', textDecoration: 'none',
            transition: 'transform 0.15s ease, border-color 0.15s ease',
          };

          if (action.href) {
            return (
              <Link
                key={action.label}
                href={action.href}
                style={baseStyle}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(-1px)';
                  el.style.borderColor = `${action.color}44`;
                  el.style.background = `${action.color}0a`;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(0)';
                  el.style.borderColor = 'rgba(255,255,255,0.07)';
                  el.style.background = 'rgba(255,255,255,0.025)';
                }}
              >
                {inner}
              </Link>
            );
          }

          return (
            <button
              key={action.label}
              onClick={action.onClick}
              style={baseStyle}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = 'translateY(-1px)';
                el.style.borderColor = `${action.color}44`;
                el.style.background = `${action.color}0a`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = 'translateY(0)';
                el.style.borderColor = 'rgba(255,255,255,0.07)';
                el.style.background = 'rgba(255,255,255,0.025)';
              }}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
