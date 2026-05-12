import { InboxFeed } from '@/components/inbox/inbox-feed';

export const dynamic = 'force-dynamic';

export default function InboxPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#e8eaf2', margin: 0 }}>Inbox</h1>
        <p style={{ fontSize: 13, color: '#6b7494', marginTop: 4 }}>
          Unified action center for everything that needs your attention.
        </p>
      </div>
      <InboxFeed />
    </div>
  );
}
