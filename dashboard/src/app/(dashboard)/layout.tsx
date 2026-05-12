import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getOrgs } from '@/lib/config';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { syncAll } from '@/lib/sync';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  // Fire sync in background — don't block rendering on Supabase roundtrips
  syncAll().catch((e) => console.error('Sync failed:', e));

  const orgs = getOrgs();

  return <DashboardShell orgs={orgs}>{children}</DashboardShell>;
}
