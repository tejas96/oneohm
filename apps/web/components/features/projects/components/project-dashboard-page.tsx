'use client';

import Add from '@mui/icons-material/Add';
import Article from '@mui/icons-material/Article';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import {
  CriticalAlerts,
  KPIGrid,
  ProgressTrend,
  ProjectMilestones,
  SiteProgress,
  WorkerMatrix,
} from './dashboard';

import { MUITypography } from '@/components/ui';
import { apiClient } from '@/lib/api/client';
import { ROUTES } from '@/lib/config/routes';
import { useOrgContext } from '@/lib/hooks/core';
import {
  bomResourceKeys,
  useProjectListResource,
  useTeamWorkload,
  type ProjectListItem,
} from '@/lib/hooks/resources';
import { useAuth, useIsAdmin } from '@/providers/auth-provider';

// ============================================================================
// Helpers
// ============================================================================

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

// ============================================================================
// Formatting Helpers
// ============================================================================

function getPercentageString(value: number): string {
  return `${Math.round(value)}%`;
}

// ============================================================================
// Main Orchestrator Dashboard Component
// ============================================================================

export function ProjectDashboardPage(): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const firstName = user?.firstName || 'User';

  // BUG-3 FIX: Greeting based on time-of-day — no deps so it's set once per mount.
  // This is acceptable because dashboards are typically visited fresh.
  const greetingText = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Parallel lightweight queries (limit: 1 / 5) for database-wide status totals
  // Fully scalable for 1000+ onboarding projects, preventing client side latency
  const { data: activeData, isLoading: activeLoading } = useProjectListResource({
    status: 'active',
    limit: 1,
  });
  const { data: onHoldData, isLoading: onHoldLoading } = useProjectListResource({
    status: 'on_hold',
    limit: 5, // BUG-15 FIX: Fetch up to 5 so we can show multiple blocked project alerts
  });

  // Query live database projects for the milestones checklist (limit to 5 to prevent frontend rendering lag)
  const { data: activeListResponse, isLoading: activeListLoading } = useProjectListResource({
    limit: 5,
  });

  // Query live team workload across all projects in the organization
  const { data: teamWorkloadData, isLoading: teamWorkloadLoading } = useTeamWorkload();

  // Organization context and dynamic parallel BOM queries for active installations
  const { organizationId, orgHeaders, isReady } = useOrgContext();

  const activeProjectsSample = React.useMemo((): ProjectListItem[] => {
    const rawList = activeListResponse?.data || [];
    return rawList.filter((p) => p.status === 'active');
  }, [activeListResponse]);

  const bomQueries = useQueries({
    queries: activeProjectsSample.map((p) => {
      const projectId = p.id;
      return {
        queryKey: [...bomResourceKeys.all(organizationId), 'project', projectId] as const,
        queryFn: async ({ signal }): Promise<Record<string, unknown> | null> => {
          const { data } = await apiClient.get<Record<string, unknown> | null>(
            `/bom?entityType=project&entityId=${projectId}`,
            { headers: orgHeaders, signal },
          );
          return data;
        },
        enabled: isReady && !!projectId,
        staleTime: 60_000,
      };
    }),
  });

  // BUG-2 FIX: Stabilize bomQueries reference to prevent infinite re-renders.
  // useQueries returns a NEW array every render, so we extract just the data we need.
  const bomDataSnapshot = React.useMemo(() => {
    return bomQueries.map((q) => q.data ?? null);
  }, [bomQueries.map((q) => q.dataUpdatedAt).join(',')]);

  const isPageLoading = activeLoading || onHoldLoading || activeListLoading || teamWorkloadLoading;

  const dashboardData = React.useMemo(() => {
    // 1. Calculate KPIs accurately using lightweight DB totals
    const activeCount = activeData?.meta.total ?? 0;
    const onHoldCount = onHoldData?.meta.total ?? 0;

    const blockedCount = onHoldCount;

    // Fetch active projects sample for progress percentage averaging
    const sampleProgressTotal = activeProjectsSample.reduce((sum: number, p): number => {
      const progVal = typeof p.progressPercentage === 'number' ? p.progressPercentage : 0;
      return sum + progVal;
    }, 0);
    // BUG-9 FIX: Default to 0% instead of arbitrary 82% when no active projects
    const avgProgress =
      activeProjectsSample.length > 0 ? sampleProgressTotal / activeProjectsSample.length : 0;

    // 2. Compute Milestones dynamically based on live active projects list
    // BUG-7 FIX: Use currentPhase from API when available, fall back to progress-based heuristic
    const milestoneHealthItems = activeProjectsSample.map((p) => {
      const prog = typeof p.progressPercentage === 'number' ? p.progressPercentage : 0;
      const apiPhase = typeof p.currentPhase === 'string' && p.currentPhase ? p.currentPhase : null;

      const currentMilestone =
        apiPhase ??
        (prog < 25
          ? 'Site Survey'
          : prog < 50
            ? 'Liaison Approval'
            : prog < 75
              ? 'Civil Procurement'
              : 'Panel Installation');

      return {
        id: p.id,
        projectNumber: p.projectNumber || 'N/A',
        name: p.name || 'Untitled Project',
        progress: prog,
        currentMilestone,
        milestones: [
          { name: 'Survey', completed: prog >= 25 },
          { name: 'Liaison', completed: prog >= 50 },
          { name: 'Civil', completed: prog >= 75 },
          { name: 'Install', completed: prog >= 100 },
        ],
      };
    });

    // 3. Map live workloads to team performance matrix indicators
    const team = teamWorkloadData || [];
    const workerPerformanceList = team.map((w) => {
      const activeTasks = w.inProgressTaskCount || 0;
      const totalTasks = w.totalTaskCount || 0;
      const completedTasks = totalTasks - (w.notCompletedTaskCount ?? 0);
      return {
        userId: w.userId,
        name: `${w.firstName} ${w.lastName ?? ''}`.trim() || 'Team Member',
        activeProjects: w.activeProjectCount || 0,
        activeTasks,
        completedTasks,
        totalTasks,
      };
    });

    // 4. Generate dynamic, highly actionable operational alert items based on actual database states
    const alertItems: {
      id: string;
      text: string;
      type: 'blocked' | 'overdue' | 'bottleneck';
      targetPath: string;
    }[] = [];

    // Bottlenecks from live team workloads
    workerPerformanceList
      .filter((w) => w.activeTasks > 5)
      .forEach((w) => {
        alertItems.push({
          id: `bottleneck-${w.userId}`,
          text: `Resource Bottleneck: ${w.name} has ${w.activeTasks} active tasks`,
          type: 'bottleneck',
          targetPath: '/projects/my-tasks',
        });
      });

    // Blockers from live blocked projects
    // BUG-15 FIX: onHoldData now fetches up to 5, so slice(0, 3) is valid
    const blockedProjects = onHoldData?.data || [];
    blockedProjects.slice(0, 3).forEach((p) => {
      alertItems.push({
        id: `blocked-${p.id}`,
        text: `Project Blocked: ${p.projectNumber || 'PRJ'} (${p.name || 'Solar Installation'}) is On Hold`,
        type: 'blocked',
        targetPath: `/projects/${p.id}?tab=overview`,
      });
    });

    // Overdue alerts from live active projects
    const overdueProjects = (activeListResponse?.data || []).filter((p) => {
      if (typeof p.endDate !== 'string' || p.status === 'completed' || p.status === 'cancelled')
        return false;
      return new Date(p.endDate).getTime() < new Date().getTime();
    });
    overdueProjects.slice(0, 2).forEach((p) => {
      const endDateStr = typeof p.endDate === 'string' ? p.endDate : '';
      const daysOverdue = Math.max(
        1,
        Math.floor((new Date().getTime() - new Date(endDateStr).getTime()) / (24 * 60 * 60 * 1000)),
      );
      alertItems.push({
        id: `overdue-${p.id}`,
        text: `Overdue: ${p.projectNumber || 'Project'} at ${p.name || 'Site'} — ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} past deadline`,
        type: 'overdue',
        targetPath: `/projects/${p.id}?tab=tasks`,
      });
    });

    // BOM Material Shortages from active projects BOM query results
    activeProjectsSample.forEach((p, index) => {
      const bomResult = bomDataSnapshot[index];
      if (!bomResult || p.status === 'completed' || p.status === 'cancelled') return;

      const allocationStatus =
        bomResult && typeof bomResult.allocationStatus === 'string'
          ? bomResult.allocationStatus
          : undefined;
      if (allocationStatus === 'partial' || allocationStatus === 'pending') {
        alertItems.push({
          id: `bom-shortage-${p.id}`,
          text: `BOM Shortage: Material pending stock reservation for ${p.projectNumber || 'project'}`,
          type: 'blocked',
          targetPath: `/projects/${p.id}?tab=bom`,
        });
      }
    });

    // Financial Collections Exposure
    activeProjectsSample.forEach((p) => {
      if (p.status === 'completed' || p.status === 'cancelled') return;
      const progress = typeof p.progressPercentage === 'number' ? p.progressPercentage : 0;

      const paymentSummary = p.paymentSummary;
      let totalExpected = 0;
      let totalPaid = 0;
      if (isRecord(paymentSummary)) {
        if (typeof paymentSummary.totalExpected === 'number') {
          totalExpected = paymentSummary.totalExpected;
        }
        if (typeof paymentSummary.totalPaid === 'number') {
          totalPaid = paymentSummary.totalPaid;
        }
      }

      // Safe division guard
      if (totalExpected === 0) return;

      const paymentRatio = totalPaid / totalExpected;
      const exposureGap = progress - paymentRatio * 100;

      // Warning triggers if installation outpaces collections by more than 30%
      if (exposureGap > 30) {
        alertItems.push({
          id: `capital-exposure-${p.id}`,
          text: `Capital Exposure: ${p.projectNumber || 'Project'} is ${Math.round(progress)}% complete but only ${Math.round(paymentRatio * 100)}% paid`,
          type: 'bottleneck',
          targetPath: `/projects/${p.id}?tab=finance`,
        });
      }
    });

    // Liaison Regulatory Stall (Decoupled Progress-percentage Matcher)
    activeProjectsSample.forEach((p) => {
      const progress = typeof p.progressPercentage === 'number' ? p.progressPercentage : 0;
      const isLiaisonPhase = progress >= 25 && progress < 50;
      if (!isLiaisonPhase || p.status === 'completed' || p.status === 'cancelled') return;

      // Stall criteria: Liaison is active but target or task is stale
      const endDate = typeof p.endDate === 'string' ? p.endDate : undefined;
      if (endDate) {
        const isApproachingOrPast =
          new Date(endDate).getTime() < new Date().getTime() + 5 * 24 * 60 * 60 * 1000;
        if (isApproachingOrPast) {
          alertItems.push({
            id: `liaison-stall-${p.id}`,
            text: `Liaison Delay: Net-Metering approval stall at ${p.name || 'Site'}`,
            type: 'overdue',
            targetPath: `/projects/${p.id}?tab=tasks&t_milestone=Liaison%20Approval`,
          });
        }
      }
    });

    // Empty state: show informational message instead of fake alerts
    if (alertItems.length === 0) {
      // No hardcoded fake alerts — the component handles empty state gracefully
    }

    // BUG-8 FIX: Mark trend data as sample/placeholder — clearly labeled in the chart component
    const trendDataPoints = [
      { month: 'Jan', approved: 4, completed: 3 },
      { month: 'Feb', approved: 6, completed: 5 },
      { month: 'Mar', approved: 8, completed: 6 },
      { month: 'Apr', approved: 5, completed: 7 },
      { month: 'May', approved: 9, completed: 8 },
    ];

    return {
      kpi: {
        activeProjects: activeCount,
        overallHealth: getPercentageString(avgProgress),
        criticalBlockers: blockedCount,
        activeWorkers: workerPerformanceList.length,
      },
      // BUG-10 FIX: No more hardcoded fallback people — empty arrays are valid
      milestones: milestoneHealthItems,
      workers: workerPerformanceList,
      alerts: alertItems,
      trends: trendDataPoints,
    };
  }, [
    activeData,
    onHoldData,
    activeListResponse,
    teamWorkloadData,
    activeProjectsSample,
    bomDataSnapshot,
  ]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <MUITypography variant="drawerTitle" className="font-semibold text-text-primary">
            {greetingText}, {firstName} 👋
          </MUITypography>
          <MUITypography variant="body" className="text-text-secondary mt-1 block">
            Track active installation milestones and resource utilization
            {isAdmin ? '.' : ', and unblock outstanding tasks.'}
          </MUITypography>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outlined"
            size="small"
            onClick={() => router.push(ROUTES.PROJECTS.LIST)}
            className="rounded-lg border border-border-light bg-background hover:bg-background-secondary text-text-primary normal-case font-semibold px-4 py-2"
          >
            <Article className="size-4 mr-2 text-text-secondary" />
            All Projects
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => router.push(ROUTES.PROJECTS.NEW)}
            className="rounded-lg shadow-sm hover:shadow bg-primary text-white hover:bg-primary/95 normal-case font-semibold px-4 py-2"
          >
            <Add className="size-4 mr-2" />
            Create Project
          </Button>
        </div>
      </div>

      {isPageLoading ? (
        // Loading Skeletons
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card
              key={i}
              elevation={0}
              className="p-4 rounded-lg border border-border-light min-h-[120px] flex flex-col justify-between bg-background shadow-card"
            >
              <Skeleton variant="rectangular" className="h-4 w-1/2 rounded" />
              <Skeleton variant="rectangular" className="h-6 w-2/3 rounded mt-4" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* KPI summary */}
          <KPIGrid data={dashboardData.kpi} />

          {/* Critical Alerts & Milestone checks */}
          <div className="flex flex-col lg:flex-row gap-6">
            {!isAdmin && <CriticalAlerts items={dashboardData.alerts} />}
            <ProjectMilestones
              projects={dashboardData.milestones}
              className={isAdmin ? 'lg:w-full' : 'lg:w-1/2'}
            />
          </div>

          {/* Resource Optimization & Site Activity */}
          <div className="flex flex-col lg:flex-row gap-6">
            <WorkerMatrix workers={dashboardData.workers} />
            <SiteProgress />
          </div>

          {/* Delivery Velocity Charts */}
          <div className="flex flex-col lg:flex-row gap-6">
            <ProgressTrend data={dashboardData.trends} />
          </div>
        </>
      )}
    </div>
  );
}
