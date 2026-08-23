'use client';

import type { JSX } from 'react';

import { OverviewActivityFeed } from './overview/overview-activity-feed';
import { OverviewAttentionPanel } from './overview/overview-attention-panel';
import { OverviewEnergyImpact } from './overview/overview-energy-impact';
import { OverviewFinancials } from './overview/overview-financials';
import { OverviewHero } from './overview/overview-hero';
import { OverviewInsightsStrip } from './overview/overview-insights-strip';
import { OverviewSiteCard } from './overview/overview-site-card';
import { OverviewSystemSpecs } from './overview/overview-system-specs';
import { OverviewTeamPanel } from './overview/overview-team-panel';
import { OverviewTimelineRail } from './overview/overview-timeline-rail';
import type { ProjectDetail } from '../../../hooks/types';

import { buildRoute, ROUTES } from '@/lib/config/routes';

export interface ProjectOverviewTabProps {
  project: ProjectDetail;
  isActive: boolean;
}

export function ProjectOverviewTab({ project, isActive }: ProjectOverviewTabProps): JSX.Element {
  const projectPath = buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id });
  const effectiveSizeKw = project.systemSizeKw;
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

      {/* Row 1: Installation Site, Team, and System Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Column 1: Site */}
        <div>
          <OverviewSiteCard project={project} />
        </div>

        {/* Column 2: Team */}
        <div>
          <OverviewTeamPanel projectId={project.id} projectPath={projectPath} isActive={isActive} />
        </div>

        {/* Column 3: System Specifications */}
        <div>
          <OverviewSystemSpecs project={project} projectPath={projectPath} />
        </div>
      </div>

      {/* Row 2: Needs Attention + Financials (equal width) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OverviewAttentionPanel projectId={project.id} isActive={isActive} />
        <OverviewFinancials
          project={project}
          projectId={project.id}
          projectPath={projectPath}
          isActive={isActive}
        />
      </div>

      {/* Row 3: Energy Impact + Recent Activity (equal width) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {showEnergy ? (
          <>
            <OverviewEnergyImpact project={project} />
            <OverviewActivityFeed
              projectId={project.id}
              projectPath={projectPath}
              isActive={isActive}
            />
          </>
        ) : (
          <div className="lg:col-span-2">
            <OverviewActivityFeed
              projectId={project.id}
              projectPath={projectPath}
              isActive={isActive}
            />
          </div>
        )}
      </div>
    </div>
  );
}
