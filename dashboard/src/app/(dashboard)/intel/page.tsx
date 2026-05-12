import { IntelFeed } from '@/components/intel/intel-feed';

export const dynamic = 'force-dynamic';

export default function IntelPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#e8eaf2', margin: 0 }}>Intelligence Feed</h1>
        <p style={{ fontSize: 13, color: '#6b7494', marginTop: 4 }}>
          Signals, patterns, and briefings synthesized across all your sources.
        </p>
      </div>
      <IntelFeed />
    </div>
  );
}
