'use client';

import { LookupTypeCode } from '@oneohm-epc/shared/types';
import React, { useMemo } from 'react';

import { MilestoneProgressPanel } from './summary/milestone-progress-panel';
import { PriorityBreakdownChart } from './summary/priority-breakdown-chart';
import { RecentActivityPanel } from './summary/recent-activity-panel';
import { StatusOverviewChart } from './summary/status-overview-chart';
import { SummaryMetricsCards } from './summary/summary-metrics-cards';
import { TeamWorkloadPanel } from './summary/team-workload-panel';
import type { ProjectDetail } from '../../../hooks/types';

import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useProjectSummary, useLookupsByTypeCode, useLookupOptions } from '@/lib/hooks/resources';

interface ProjectSummaryTabProps {
  project: ProjectDetail;
  projectId: string;
  isActive: boolean;
}

export function ProjectSummaryTab({ project, projectId, isActive }: ProjectSummaryTabProps) {
  const {
    data: summary,
    isLoading: summaryLoading,
    isError,
  } = useProjectSummary(projectId, { enabled: isActive });

  const statusLookupQuery = useLookupsByTypeCode(LookupTypeCode.DEFAULT_TASK_STATUS);
  const priorityLookupQuery = useLookupOptions(LookupTypeCode.PRIORITY);

  // Build lookup maps once, passed as props to avoid re-deriving in every panel
  const statusLookupMap = useMemo(
    () => Object.fromEntries(statusLookupQuery.items.map((s) => [s.code, s])),
    [statusLookupQuery.items],
  );

  const priorityLookupMap = useMemo(
    () => Object.fromEntries(priorityLookupQuery.items.map((p) => [p.value, p])),
    [priorityLookupQuery.items],
  );

  // Resolved project path used for deep-links into the Tasks tab
  const projectPath = buildRoute(ROUTES.PROJECTS.DETAIL, { id: projectId });

  // Show skeletons on first fetch; keep data visible on background refetches
  const isLoading = summaryLoading && !summary;

  if (isError && !summaryLoading) {
    return (
      <div className="py-12 text-center text-xs text-foreground-secondary">
        Failed to load project summary. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Row 1: Metric cards — full width */}
      <SummaryMetricsCards
        metrics={summary?.metrics}
        isLoading={isLoading}
        projectPath={projectPath}
      />

      {/* Row 2: Status donut + Priority bars — 2 equal columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatusOverviewChart
          tasksByStatus={summary?.tasksByStatus}
          taskStatuses={project.taskStatuses}
          statusLookupMap={statusLookupMap}
          isLoading={isLoading}
          projectPath={projectPath}
        />
        <PriorityBreakdownChart
          tasksByPriority={summary?.tasksByPriority}
          priorityLookupMap={priorityLookupMap}
          isLoading={isLoading}
          projectPath={projectPath}
        />
      </div>

      {/* Row 3: Team workload — full width */}
      <TeamWorkloadPanel
        teamWorkload={summary?.teamWorkload}
        taskStatuses={project.taskStatuses}
        isLoading={isLoading}
        projectPath={projectPath}
      />

      {/* Row 4: Recent activity + Milestone progress — 2 columns; milestone hidden if empty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivityPanel
          activity={summary?.recentActivity}
          statusLookupMap={statusLookupMap}
          priorityLookupMap={priorityLookupMap}
          isLoading={isLoading}
        />
        <MilestoneProgressPanel
          milestoneProgress={summary?.milestoneProgress}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
