import type { Task, GoalsData, HealthSummary, Event, AgentSummary, Heartbeat } from '@/lib/types';
import { getOrgs } from '@/lib/config';
import { getPendingCount } from '@/lib/data/approvals';
import { getTasks, getTasksCompletedToday } from '@/lib/data/tasks';
import { getGoals } from '@/lib/data/goals';
import { getHealthSummary, getAllHeartbeats } from '@/lib/data/heartbeats';
import { getRecentEvents } from '@/lib/data/events';
import { discoverAgents } from '@/lib/data/agents';

import { CurrentFocus } from '@/components/overview/current-focus';
import { TodaysProgress } from '@/components/overview/todays-progress';
import { LiveActivity } from '@/components/overview/live-activity';
import { SystemHealth } from '@/components/overview/system-health';
import { MetricCards } from '@/components/overview/metric-cards';
import { AgentOrbField } from '@/components/overview/agent-orb-field';
import { QuickActions } from '@/components/overview/quick-actions';
import { UpcomingQueue } from '@/components/overview/upcoming-queue';

export const dynamic = 'force-dynamic';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const orgs = getOrgs();
  const orgParam = typeof params.org === 'string' ? params.org : undefined;
  const org = orgParam && orgs.includes(orgParam) ? orgParam : '';

  const emptyFallback = () =>
    [0, [], [], { goals: [], bottleneck: '' }, { healthy: 0, stale: 0, down: 0, agents: [] }, [], [], [], []] as [
      number, Task[], Task[], GoalsData, HealthSummary, Task[], Event[], AgentSummary[], Heartbeat[],
    ];

  const [
    pendingCount,
    blockedTasks,
    allTasks,
    goalsData,
    healthSummary,
    completedToday,
    recentEvents,
    agents,
    heartbeatsList,
  ] = await withTimeout(
    Promise.all([
      getPendingCount(org || undefined),
      getTasks({ status: 'blocked', org: org || undefined }),
      getTasks({ org: org || undefined }),
      getGoals(org || 'default'),
      getHealthSummary(org || undefined),
      getTasksCompletedToday(org || undefined),
      getRecentEvents(20, org || undefined),
      discoverAgents(org || undefined),
      getAllHeartbeats(),
    ]),
    10000,
    emptyFallback(),
  ).catch(() => emptyFallback());

  const heartbeats: Record<string, typeof heartbeatsList[number]> = {};
  for (const hb of heartbeatsList) heartbeats[hb.agent] = hb;

  const inProgressTasks = allTasks.filter(t => t.status === 'in_progress');
  const pendingTasks    = allTasks.filter(t => t.status === 'pending');
  const priorityRank = (p: string) =>
    p === 'critical' || p === 'urgent' ? 0 : p === 'high' ? 1 : p === 'normal' ? 2 : 3;
  const upcomingTasks = allTasks
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* 1. Stat row */}
      <MetricCards
        agentsOnline={healthSummary.healthy}
        agentsTotal={healthSummary.healthy + healthSummary.stale + healthSummary.down}
        tasksCompleted={completedToday.length}
        tasksInProgress={inProgressTasks.length}
        tasksPending={pendingTasks.length}
        pendingApprovals={pendingCount}
        blockedTasks={blockedTasks.length}
      />

      {/* 2. Hero — Agent Orb Field */}
      <AgentOrbField agents={agents} heartbeats={heartbeats} />

      {/* 3. Two-column grid: left ~1.85fr, right ~1fr */}
      <div className="siq-main-grid">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <CurrentFocus
            org={org || 'default'}
            bottleneck={goalsData.bottleneck}
            goals={goalsData.goals}
          />
          <TodaysProgress
            completedTasks={completedToday}
            milestones={[]}
            inProgressCount={inProgressTasks.length}
            queuedCount={pendingTasks.length}
            blockedCount={blockedTasks.length}
          />
          <LiveActivity initialEvents={recentEvents} />
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SystemHealth summary={healthSummary} />
          <QuickActions />
          <UpcomingQueue tasks={upcomingTasks} total={upcomingTasks.length} />
        </div>
      </div>

    </div>
  );
}
