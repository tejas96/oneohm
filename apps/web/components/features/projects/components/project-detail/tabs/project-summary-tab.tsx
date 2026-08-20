'use client';

import React from 'react';

import { MilestoneProgressPanel } from './summary/milestone-progress-panel';
import { PriorityBreakdownChart } from './summary/priority-breakdown-chart';
import { RecentActivityPanel } from './summary/recent-activity-panel';
import { StatusOverviewChart } from './summary/status-overview-chart';
import { SummaryMetricsCards } from './summary/summary-metrics-cards';
import { TeamWorkloadPanel } from './summary/team-workload-panel';
import type { ProjectDetail } from '../../../hooks/types';

import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useProjectSummary } from '@/lib/hooks/resources';

interface ProjectSummaryTabProps {
  project: ProjectDetail;
  projectId: string;
  isActive: boolean;
}

export function ProjectSummaryTab({
  project: _project,
  projectId,
  isActive,
}: ProjectSummaryTabProps) {
  const {
    data: summary,
    isLoading: summaryLoading,
    isError,
  } = useProjectSummary(projectId, { enabled: isActive });

  const projectPath = buildRoute(ROUTES.PROJECTS.DETAIL, { id: projectId });

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
      <SummaryMetricsCards
        metrics={summary?.metrics}
        isLoading={isLoading}
        projectPath={projectPath}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <StatusOverviewChart
          tasksByStatus={summary?.tasksByStatus}
          isLoading={isLoading}
          projectPath={projectPath}
        />
        <PriorityBreakdownChart
          tasksByPriority={summary?.tasksByPriority}
          isLoading={isLoading}
          projectPath={projectPath}
        />
        <TeamWorkloadPanel
          teamWorkload={summary?.teamWorkload}
          isLoading={isLoading}
          projectPath={projectPath}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivityPanel activity={summary?.recentActivity} isLoading={isLoading} />
        <MilestoneProgressPanel
          milestoneProgress={summary?.milestoneProgress}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
