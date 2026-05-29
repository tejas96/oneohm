'use client';

import type { JSX } from 'react';

import { OverviewActivityFeed } from './overview/overview-activity-feed';
import { OverviewAttentionPanel } from './overview/overview-attention-panel';
import { OverviewEnergyImpact } from './overview/overview-energy-impact';
import { OverviewFinancials } from './overview/overview-financials';
import { OverviewHero } from './overview/overview-hero';
import { OverviewInsightsStrip } from './overview/overview-insights-strip';
import { OverviewMilestonesFeed } from './overview/overview-milestones-feed';
import { OverviewReportsCard } from './overview/overview-reports-card';
import { OverviewSiteCard } from './overview/overview-site-card';
import { OverviewSystemSpecs } from './overview/overview-system-specs';
import { OverviewTeamPanel } from './overview/overview-team-panel';
import { OverviewTimelineRail } from './overview/overview-timeline-rail';
import type { ProjectDetail } from '../../../hooks/types';

import { buildRoute, ROUTES } from '@/lib/config/routes';

interface ProjectOverviewTabProps {
  project: ProjectDetail;
  isActive: boolean;
}

export function ProjectOverviewTab({ project, isActive }: ProjectOverviewTabProps): JSX.Element {
  const projectPath = buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id });
  const effectiveSizeKw = project.actualSystemSizeKw ?? project.systemSizeKw;
  const showEnergy = !!effectiveSizeKw && effectiveSizeKw > 0;

  return (
    <div className="space-y-4">
      <OverviewHero project={project} projectId={project.id} isActive={isActive} />

      <OverviewInsightsStrip
        project={project}
        projectId={project.id}
        projectPath={projectPath}
        isActive={isActive}
      />

      <OverviewTimelineRail project={project} projectId={project.id} isActive={isActive} />

      {/* Energy + Site */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {showEnergy && (
          <div className="lg:col-span-3">
            <OverviewEnergyImpact project={project} />
          </div>
        )}
        <div className={showEnergy ? 'lg:col-span-2' : 'lg:col-span-5'}>
          <OverviewSiteCard project={project} />
        </div>
      </div>

      {/* Specs + Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <OverviewSystemSpecs project={project} projectPath={projectPath} />
        </div>
        <div className="lg:col-span-3">
          <OverviewFinancials
            project={project}
            projectId={project.id}
            projectPath={projectPath}
            isActive={isActive}
          />
        </div>
      </div>

      {/* Team + Reports (stacked left) | Milestones (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <OverviewTeamPanel projectId={project.id} projectPath={projectPath} isActive={isActive} />
          <OverviewReportsCard projectId={project.id} isActive={isActive} />
        </div>
        <div className="lg:col-span-2">
          <OverviewMilestonesFeed
            projectId={project.id}
            projectPath={projectPath}
            isActive={isActive}
          />
        </div>
      </div>

      {/* Activity (left) + Attention (right) — same height, scrollable */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
        <div className="lg:col-span-3 flex flex-col">
          <OverviewActivityFeed
            projectId={project.id}
            projectPath={projectPath}
            isActive={isActive}
          />
        </div>
        <div className="lg:col-span-2 flex flex-col">
          <OverviewAttentionPanel projectId={project.id} isActive={isActive} />
        </div>
      </div>
    </div>
  );
}
