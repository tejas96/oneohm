'use client';

import { ProjectPriority, ProjectStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { type JSX, useState } from 'react';

import type { CustomerProjectItem } from '../hooks';
import {
  CardBones,
  CardError,
  EmptyNote,
  Kv,
  MoreToggle,
  PageCard,
  PillButton,
  TEXT_ACTION,
} from './parts';

import { daysUntil } from '@/components/features/projects/components/project-detail/lib/derive';
import { PROJECT_STATUS_LABELS } from '@/components/features/projects/constants';
import { useProjectAttention } from '@/components/features/projects/hooks/use-project-attention';
import {
  useProject,
  useProjectTeam,
} from '@/components/features/projects/hooks/use-project-detail';
import { useProjectMilestones } from '@/components/features/projects/hooks/use-project-payments';
import { QuietPill } from '@/components/shared/calm-list';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useGatedAction } from '@/lib/rbac';
import { cn, formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';

export interface ProjectCardProps {
  /** The project that owns the roof today; undefined before conversion. */
  project: CustomerProjectItem | undefined;
  /** A cancelled project of this site, shown by name only: it owns nothing now. */
  cancelledProject?: CustomerProjectItem;
  isLoading: boolean;
  /** The projects did not load: "no project" is not known. */
  isError: boolean;
  onRetry: () => void;
  /** The site's deal quote is accepted and live, so a project can be opened. */
  canConvert: boolean;
  customerInactive: boolean;
  onConvert: () => void;
  delayMs?: number;
}

function Ring({ percent }: { percent: number }): JSX.Element {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div
      role="img"
      aria-label={`${clamped}% done`}
      className="relative grid size-[58px] flex-none place-items-center rounded-full text-[14px] font-semibold tabular-nums"
      style={{
        background: `conic-gradient(var(--ds-primary) ${clamped}%, var(--ds-background-tertiary, #F5F5F4) 0)`,
      }}
    >
      <span className="absolute inset-1.5 rounded-full bg-surface" />
      <span className="relative">{clamped}%</span>
    </div>
  );
}

/**
 * One site's project in short: how far, what is late, what is next.
 *
 * It repeats what the project list and the project page say (phase, next
 * step, meter date come from the same queries) and it never softens them: a
 * project past its end date says so in red. The tasks, BOM and reports stay
 * on the project page.
 */
export function ProjectCard({
  project,
  cancelledProject,
  isLoading,
  isError,
  onRetry,
  canConvert,
  customerInactive,
  onConvert,
  delayMs,
}: ProjectCardProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const projectId = project?.id ?? '';
  const attention = useProjectAttention(projectId, { enabled: Boolean(project) });
  const milestones = useProjectMilestones(projectId, { enabled: Boolean(project) && open });
  const team = useProjectTeam(projectId, { enabled: Boolean(project) });
  // The build-up of the project, read only when someone opens "more".
  const detail = useProject(projectId, { enabled: Boolean(project) && open });
  const convert = useGatedAction('projects.create', onConvert, 'Convert to project');

  if (isLoading) {
    return (
      <PageCard id="project" title="Project" delayMs={delayMs}>
        <CardBones rows={4} />
      </PageCard>
    );
  }

  if (isError) {
    return (
      <PageCard id="project" title="Project" delayMs={delayMs}>
        <CardError what="the project" onRetry={onRetry} />
      </PageCard>
    );
  }

  if (!project) {
    return (
      <PageCard id="project" title="Project" delayMs={delayMs}>
        {canConvert ? (
          <>
            <EmptyNote
              title="Quote accepted, no project yet"
              hint="A project gives the payment schedule, the tasks and the team."
            />
            <div className="mt-3">
              <PillButton
                variant="dark"
                disabled={customerInactive}
                ariaDisabled={!convert.allowed}
                title={customerInactive ? 'Blocked while the customer is inactive' : undefined}
                onClick={convert.onGatedClick}
              >
                Convert to project
              </PillButton>
            </div>
          </>
        ) : (
          <EmptyNote title="No project yet" hint="A project starts when the quote is accepted." />
        )}
        {cancelledProject ? (
          <p className="m-0 mt-3 text-[13px] text-foreground-secondary">
            <QuietPill label="Cancelled" tone="danger" whole /> Earlier project{' '}
            <NextLink
              href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: cancelledProject.id })}
              prefetch={false}
              className={TEXT_ACTION}
            >
              {cancelledProject.projectNumber}
            </NextLink>
            {cancelledProject.name ? ` · ${cancelledProject.name}` : ''} was cancelled.
          </p>
        ) : null}
      </PageCard>
    );
  }

  const done = project.status === ProjectStatus.COMPLETED;
  const remaining = daysUntil(project.endDate);
  const pastDue = !done && remaining != null && remaining < 0 ? Math.abs(remaining) : 0;
  // Money has its own card; what is left here is the work.
  const workItems = (attention.data ?? []).filter((item) => item.kind !== 'payment_due');
  const nextLate = project.nextStep
    ? workItems.find(
        (item) => item.kind === 'task_overdue' && item.title.includes(project.nextStep?.name ?? ''),
      )
    : undefined;
  const members = team.data ?? [];
  const urgent =
    project.priority === ProjectPriority.URGENT || project.priority === ProjectPriority.HIGH;
  const planned =
    project.startDate && project.endDate
      ? `${formatDate(project.startDate)} → ${formatDate(project.endDate)}`
      : project.endDate
        ? `to ${formatDate(project.endDate)} · no start date`
        : project.startDate
          ? `from ${formatDate(project.startDate)} · no end date`
          : 'No dates set';
  const size = project.actualSystemSizeKw ?? project.systemSizeKw;
  const memberName = (member: (typeof members)[number]): string =>
    [member.user?.firstName, member.user?.lastName].filter(Boolean).join(' ') || 'Unnamed';

  return (
    <PageCard
      id="project"
      title="Project"
      delayMs={delayMs}
      action={
        <NextLink
          href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id })}
          prefetch={false}
          className={TEXT_ACTION}
        >
          Open project →
        </NextLink>
      }
    >
      <div className="mb-2.5 flex items-center gap-3.5">
        <Ring percent={project.progressPercentage} />
        <div className="min-w-0">
          <b className="font-semibold">
            {done
              ? 'Completed'
              : (project.currentPhase ??
                PROJECT_STATUS_LABELS[project.status] ??
                toTitleLabel(project.status))}
          </b>
          <div className="text-[13px] text-foreground-secondary">
            {project.totalTasks
              ? `${project.completedTasks ?? 0} of ${project.totalTasks} tasks done`
              : 'No tasks yet'}
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {pastDue > 0 ? (
          <QuietPill
            label={`${pastDue} ${pastDue === 1 ? 'day' : 'days'} past its end date`}
            tone="danger"
            whole
          />
        ) : null}
        {attention.isError ? (
          <QuietPill label="Open items could not load" tone="neutral" whole />
        ) : null}
        {workItems.length > 0 ? (
          <QuietPill
            label={
              workItems.length === 1 ? '1 needs attention' : `${workItems.length} need attention`
            }
            tone={workItems.some((item) => item.severity === 'critical') ? 'danger' : 'warning'}
            whole
          />
        ) : null}
        {project.status === ProjectStatus.ON_HOLD ? (
          <QuietPill label="On hold" tone="warning" whole />
        ) : null}
        {urgent ? (
          <QuietPill
            label={`${toTitleLabel(project.priority)} priority`}
            tone={project.priority === ProjectPriority.URGENT ? 'danger' : 'warning'}
            whole
          />
        ) : null}
        {project.meterInstalled ? (
          <QuietPill
            label={
              project.meterInstalledOn
                ? `Meter in · ${formatDate(project.meterInstalledOn)}`
                : 'Meter in'
            }
            tone="success"
            whole
          />
        ) : null}
      </div>

      <Kv
        narrow
        rows={[
          {
            label: 'Next task',
            value: project.nextStep ? (
              <>
                {project.nextStep.name}
                <span className="font-normal text-foreground-secondary">
                  {' · '}
                  {project.nextStep.assigneeName ?? (
                    <span className="text-error">nobody assigned</span>
                  )}
                </span>
                {nextLate ? (
                  <span className="block text-[12px] font-normal text-error">
                    {nextLate.subtitle}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="font-normal text-foreground-secondary">Nothing is open</span>
            ),
          },
          { label: 'Number', value: <span className="tabular-nums">{project.projectNumber}</span> },
          { label: 'Planned', value: planned },
          {
            label: 'Team',
            value:
              members.length > 0 ? (
                <span className="flex">
                  {members.map((member) => (
                    <span
                      key={member.id}
                      title={`${memberName(member)} · ${member.roleName}`}
                      className="-ml-1.5 rounded-full ring-2 ring-surface first:ml-0"
                    >
                      <MUIAvatar name={memberName(member)} size={24} aria-hidden />
                    </span>
                  ))}
                </span>
              ) : (
                <span className="font-normal text-foreground-secondary">
                  {team.isLoading ? 'Loading…' : team.isError ? 'Could not load' : 'Nobody yet'}
                </span>
              ),
          },
        ]}
      />

      {open ? (
        <div className="mt-3">
          {workItems.length > 0 ? (
            <ul className="m-0 mb-3 flex list-none flex-col gap-1.5 p-0 text-[13px]">
              {workItems.map((item) => (
                <li key={item.id}>
                  <span className={cn(item.severity === 'critical' && 'text-error')}>
                    {item.title}
                  </span>
                  <span className="block text-[12px] text-foreground-tertiary">
                    {item.subtitle}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {milestones.isLoading ? (
            <CardBones rows={4} />
          ) : milestones.isError ? (
            <CardError what="the phases" onRetry={() => void milestones.refetch()} />
          ) : (
            <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px] tabular-nums [&_dd]:m-0">
              {(milestones.data ?? []).map((phase) => {
                // An open phase is not a late one: late work is in the list above.
                const openPhase = phase.completedTasks < phase.totalTasks;
                return (
                  <div key={`${phase.order}-${phase.name}`} className="contents">
                    <dt className={cn(openPhase ? 'font-medium' : 'text-foreground-tertiary')}>
                      {phase.name}
                    </dt>
                    <dd className={cn(openPhase ? 'font-medium' : 'text-foreground-tertiary')}>
                      {phase.completedTasks}/{phase.totalTasks}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
          {members.length > 0 ? (
            <p className="m-0 mt-3 text-[12px] text-foreground-tertiary">
              {members.map((member) => `${memberName(member)} (${member.roleName})`).join(' · ')}
            </p>
          ) : null}

          <div className="mt-3">
            <Kv
              narrow
              rows={[
                { label: 'Name', value: project.name },
                {
                  label: 'Status',
                  value: PROJECT_STATUS_LABELS[project.status] ?? toTitleLabel(project.status),
                },
                ...(project.quoteNumber
                  ? [{ label: 'From quote', value: project.quoteNumber }]
                  : []),
                ...(size != null ? [{ label: 'System size', value: `${size} kW` }] : []),
                ...(detail.isLoading
                  ? [{ label: 'Build', value: 'Loading…' }]
                  : detail.isError
                    ? [{ label: 'Build', value: 'Could not load' }]
                    : [
                        {
                          label: 'Panels',
                          value: detail.data?.panelCount != null ? detail.data.panelCount : '—',
                        },
                        {
                          label: 'Inverters',
                          value:
                            detail.data?.inverterCount != null ? detail.data.inverterCount : '—',
                        },
                        {
                          label: 'Structure',
                          value: detail.data?.structureType
                            ? toTitleLabel(detail.data.structureType)
                            : '—',
                        },
                        {
                          label: 'Estimated cost',
                          value:
                            detail.data?.estimatedCost != null
                              ? formatCurrency(detail.data.estimatedCost)
                              : '—',
                        },
                        {
                          label: 'Actual cost',
                          value:
                            detail.data?.actualCost != null
                              ? formatCurrency(detail.data.actualCost)
                              : '—',
                        },
                      ]),
              ]}
            />
            {project.description ? (
              <p className="m-0 mt-2 text-[12px] text-foreground-tertiary">{project.description}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <MoreToggle
        open={open}
        onToggle={() => setOpen((value) => !value)}
        closedLabel="Phases, open items, team and build"
      />
    </PageCard>
  );
}
