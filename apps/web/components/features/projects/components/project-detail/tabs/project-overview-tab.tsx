'use client';

import type { JSX } from 'react';

import type { ProjectDetail } from '../../../hooks/types';
import type { ProjectDetailData } from '../types';
import { ActivityCard } from './overview/activity-card';
import { AttentionCard } from './overview/attention-card';
import { JourneyCard } from './overview/journey-card';
import { MoneyCard } from './overview/money-card';
import { OpenWorkCard } from './overview/open-work-card';
import { ReportsCard } from './overview/reports-card';
import { SiteCard } from './overview/site-card';
import { SystemCard } from './overview/system-card';
import { TeamCard } from './overview/team-card';

import { buildRoute, ROUTES } from '@/lib/config/routes';

export interface ProjectOverviewTabProps {
  project: ProjectDetail;
  data: ProjectDetailData;
  onEditProject: () => void;
}

/**
 * Cards fade and rise 8px on mount, staggered — the design system's one
 * signature motion, capped at six so the page never feels slow to settle.
 * `fill-mode: both` keeps a delayed card invisible until its turn; without it
 * each one would flash at full opacity and then fade in.
 */
const RISE = 'motion-safe:animate-fade-in motion-safe:[animation-fill-mode:both]';

/**
 * The Overview tab, in four bands: the plan, the problems, the work, the facts.
 *
 * The identity, the four headline figures and the phase rail live in the page
 * header, so nothing here restates them. This is also where the old Summary
 * tab went: four of its six panels were re-skins of panels already on this
 * page fed by the same query, so only its task split survived, as Task mix.
 */
export function ProjectOverviewTab({
  project,
  data,
  onEditProject,
}: ProjectOverviewTabProps): JSX.Element {
  const projectPath = buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id });

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* ── The plan ── */}
      <JourneyCard
        project={project}
        milestones={data.milestones}
        summary={data.summary}
        projectPath={projectPath}
        className={`col-span-12 ${RISE}`}
      />

      {/* ── The problems ── */}
      <AttentionCard
        attention={data.attention}
        projectPath={projectPath}
        className={`col-span-12 lg:col-span-7 ${RISE} animation-delay-100`}
      />
      <MoneyCard
        ledger={data.ledger}
        projectPath={projectPath}
        className={`col-span-12 lg:col-span-5 ${RISE} animation-delay-200`}
      />

      {/* ── The work ── */}
      <OpenWorkCard
        summary={data.summary}
        projectPath={projectPath}
        className={`col-span-12 md:col-span-6 xl:col-span-4 ${RISE} animation-delay-300`}
      />
      <TeamCard
        team={data.team}
        summary={data.summary}
        projectPath={projectPath}
        onEditProject={onEditProject}
        className={`col-span-12 md:col-span-6 xl:col-span-4 ${RISE} animation-delay-400`}
      />
      <ActivityCard
        summary={data.summary}
        className={`col-span-12 xl:col-span-4 ${RISE} animation-delay-500`}
      />

      {/* ── The facts ── */}
      <SiteCard project={project} className="col-span-12 md:col-span-6 xl:col-span-4" />
      <SystemCard
        project={project}
        projectPath={projectPath}
        className="col-span-12 md:col-span-6 xl:col-span-4"
      />
      <ReportsCard
        reports={data.reports}
        projectId={project.id}
        projectPath={projectPath}
        className="col-span-12 xl:col-span-4"
      />
    </div>
  );
}
