'use client';

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Button from '@mui/material/Button';
import { ProjectStatus, type ProjectType } from '@tejas96/shared/types';
import { FileText, MapPin, Phone, UserRound } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';

import {
  HEALTH_STATUS_LABELS,
  PROJECT_PRIORITY_LABELS,
  PROJECT_TYPE_LABELS,
} from '../../constants';
import type { ProjectDetail } from '../../hooks/types';
import { ProjectStatusDropdown } from '../project-status-dropdown';
import {
  computeClock,
  computeHealth,
  currentPhaseIndex,
  daysUntil,
  HEALTH_TONE,
  memberName,
  milestoneTasksHref,
  overdueMilestones,
  openMilestonesByUrgency,
  phaseTone,
  PHASE_STATUS_LABEL,
  plural,
  PRIORITY_TONE,
  progressPct,
  projectManager,
  sortPhases,
} from './lib/derive';
import { Mono, Overline, TONE, TonePill, type Tone } from './primitives';
import type { ProjectDetailData } from './types';

import { rupeesShort } from '@/components/features/dashboard/business/lib/format';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useGatedAction } from '@/lib/rbac';
import {
  cn,
  formatDate,
  formatNumber,
  formatSystemSize,
  getInitials,
  toTitleLabel,
} from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

// ============================================================================
// Copy
// ============================================================================

/**
 * The only place the app states each rule. Rendered inside the header as a
 * tinted strip, so a paused project reads as paused on every tab without
 * spending a full row of the screen on a boxed alert.
 */
const STATUS_NOTICE: Partial<Record<ProjectStatus, { tone: Tone; title: string; body: string }>> = {
  [ProjectStatus.PLANNING]: {
    tone: 'info',
    title: 'In planning',
    body: 'Schedules and site work are not active yet.',
  },
  [ProjectStatus.ON_HOLD]: {
    tone: 'warning',
    title: 'On hold',
    body: 'Construction and execution are paused until the project is resumed.',
  },
  [ProjectStatus.CANCELLED]: {
    tone: 'danger',
    title: 'Cancelled',
    body: 'No further work or transactions should be recorded against this project.',
  },
};

// ============================================================================
// Small parts
// ============================================================================

function Fact({
  icon,
  children,
  href,
  external,
  label,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  href?: string;
  external?: boolean;
  label?: string;
}): React.JSX.Element {
  const inner = (
    <>
      <span className="shrink-0 text-foreground-muted [&>svg]:size-3.5">{icon}</span>
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </>
  );
  const classes = 'inline-flex min-w-0 items-center gap-1.5 text-[12px] text-foreground-secondary';
  if (!href) return <span className={classes}>{inner}</span>;
  const linkClasses = cn(
    classes,
    'rounded-rf-xs transition-colors duration-fast hover:text-secondary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  );
  if (external) {
    return (
      <a
        href={href}
        aria-label={label}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
      >
        {inner}
      </a>
    );
  }
  if (href.startsWith('/')) {
    return (
      <Link href={href} aria-label={label} className={linkClasses}>
        {inner}
      </Link>
    );
  }
  return (
    <a href={href} aria-label={label} className={linkClasses}>
      {inner}
    </a>
  );
}

// ============================================================================
// The status band
// ============================================================================

interface BandTile {
  key: string;
  label: string;
  href: string;
  /** Undefined while loading. */
  value: string | undefined;
  valueIsBad?: boolean;
  /** Undefined while loading. */
  sub: string | undefined;
  subIsBad?: boolean;
  /** A 3px track under the value: percent and the ink to draw it in. */
  track?: { pct: number; color: string };
}

function TileLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="flex items-center gap-[5px] text-[10.5px] font-bold uppercase tracking-[0.12em] text-foreground-secondary">
      {children}
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m9 6 6 6-6 6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground-muted"
        />
      </svg>
    </span>
  );
}

/**
 * Four figures answer the four questions a person opens this page with: how
 * far along, how long left, what is unpaid, what is holding it. They live in
 * the header, so they are on every tab — and therefore appear exactly once.
 */
function StatusBand({ tiles }: { tiles: BandTile[] }): React.JSX.Element {
  return (
    <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Link
          key={tile.key}
          href={tile.href}
          className="-mx-2.5 -my-2 block min-w-0 rounded-2xl px-2.5 py-2 transition-colors duration-fast hover:bg-background-tertiary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <TileLabel>{tile.label}</TileLabel>
          {tile.value === undefined ? (
            <Skeleton className="mt-2.5 h-7 w-24 rounded-md" />
          ) : (
            <div
              className={cn(
                'mt-2 truncate text-[26px] font-bold leading-[1.05] tracking-[-0.03em] tabular-nums',
                tile.valueIsBad ? 'text-error' : 'text-foreground',
              )}
            >
              {tile.value}
            </div>
          )}
          {tile.track ? (
            <span
              aria-hidden
              className="mt-2 block h-[3px] w-full max-w-[160px] overflow-hidden rounded-pill"
              style={{ background: 'var(--ds-canvas-sunken)' }}
            >
              <span
                className="block h-full rounded-pill"
                style={{
                  width: `${Math.min(100, Math.max(0, tile.track.pct))}%`,
                  background: tile.track.color,
                }}
              />
            </span>
          ) : null}
          {tile.sub === undefined ? (
            <Skeleton className="mt-2 h-3 w-32 rounded-md" />
          ) : (
            <div
              className={cn(
                'mt-1.5 truncate text-[12.5px]',
                tile.subIsBad ? 'font-medium text-error' : 'text-foreground-secondary',
              )}
              title={tile.sub}
            >
              {tile.sub}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

// ============================================================================
// The phase rail
// ============================================================================

/**
 * Where the project is, as a segmented rail spaced by stage order — NOT by
 * date. Milestones hold no dates, so a calendar ruler under them would claim
 * something the data cannot keep. One slot per phase, coloured by state; the
 * current phase is the bright, taller one.
 */
function PhaseRail({
  data,
  projectPath,
}: {
  data: ProjectDetailData['milestones'];
  projectPath: string;
}): React.JSX.Element {
  const phases = useMemo(() => sortPhases(data.data), [data.data]);
  const nowIndex = currentPhaseIndex(phases);
  const doneCount = phases.filter((m) => m.status === 'completed').length;
  const now = nowIndex >= 0 ? phases[nowIndex] : undefined;

  let caption: React.ReactNode = null;
  if (data.isError) {
    caption = (
      <button
        type="button"
        onClick={data.refetch}
        className="text-[12px] font-medium text-primary-dark hover:underline"
      >
        Phases didn&apos;t load · Retry
      </button>
    );
  } else if (data.isLoading) {
    caption = <Skeleton className="h-3 w-44 rounded-md" />;
  } else if (phases.length === 0) {
    caption = (
      <span className="text-[12px] text-foreground-tertiary">
        No phases yet — tasks define them as they are added.
      </span>
    );
  } else if (now) {
    caption = (
      <span className="truncate text-[12px] text-foreground-secondary">
        <span className="font-semibold text-foreground">{now.name}</span>
        {' · '}
        <Mono>
          {now.completedTasks}/{now.totalTasks}
        </Mono>{' '}
        tasks
      </span>
    );
  } else {
    caption = (
      <span className="text-[12px] font-medium" style={{ color: TONE.success.ink }}>
        All {phases.length} phases complete
      </span>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <Overline as="h3" className="shrink-0">
          Where this project is
          {/* "15 done" rather than "15/18" beside a "phase 7 of 18" caption.
              Phases finish out of order — a project can have fifteen complete
              and still be sitting on the seventh — so the two ordinals read as
              a contradiction when they are both true. */}
          {phases.length > 0 ? (
            <span className="ml-2 font-normal normal-case tracking-normal text-foreground-tertiary">
              <span className="font-mono font-bold tabular-nums">{doneCount}</span> of{' '}
              <span className="font-mono font-bold tabular-nums">{phases.length}</span> done
            </span>
          ) : null}
        </Overline>
        <div className="min-w-0 truncate">{caption}</div>
      </div>

      {data.isLoading ? (
        <Skeleton className="mt-2.5 h-[6px] w-full rounded-pill" />
      ) : phases.length > 0 ? (
        <ol className="mt-2.5 flex h-[10px] items-end gap-[3px]" aria-label="Project phases">
          {phases.map((phase, index) => {
            const isNow = index === nowIndex;
            const tone = phaseTone(phase.status);
            const fill =
              phase.status === 'completed'
                ? 'var(--ds-accent-ink)'
                : isNow && phase.status !== 'blocked'
                  ? 'var(--ds-primary)'
                  : phase.status === 'blocked'
                    ? 'var(--ds-danger)'
                    : 'var(--ds-canvas-sunken)';
            const title = `${phase.name} — ${PHASE_STATUS_LABEL[phase.status]} · ${phase.completedTasks}/${phase.totalTasks} tasks`;
            return (
              <li key={phase.name} className="flex min-w-[6px] flex-1 items-end">
                <Link
                  href={milestoneTasksHref(projectPath, phase.name)}
                  title={title}
                  aria-label={title}
                  data-tone={tone}
                  className={cn(
                    'block w-full rounded-pill transition-[height,filter] duration-fast hover:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    isNow ? 'h-[10px]' : 'h-[6px]',
                  )}
                  style={{ background: fill }}
                />
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}

// ============================================================================
// Header
// ============================================================================

interface ProjectDetailHeaderProps {
  project: ProjectDetail;
  data: ProjectDetailData;
  onEdit?: () => void;
  /**
   * False on Overview, where the Journey card draws the phases to scale with
   * their task counts. Two segmented phase bars on one screen is the same
   * picture twice; everywhere else this rail is the only one there is.
   */
  showPhaseRail?: boolean;
}

export const ProjectDetailHeader = React.memo(
  ({
    project,
    data,
    onEdit,
    showPhaseRail = true,
  }: ProjectDetailHeaderProps): React.JSX.Element => {
    const editProject = useGatedAction('projects.edit', () => onEdit?.(), 'Edit project');

    const projectPath = buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id });
    const customerName = project.property?.customerName?.trim() || 'Customer';
    const phone = project.property?.customerPhone?.trim();
    const location = [project.property?.city, project.property?.state].filter(Boolean).join(', ');
    const manager = projectManager(data.team.data);

    const priorityLabel =
      PROJECT_PRIORITY_LABELS[project.priority] ?? toTitleLabel(project.priority);
    const priorityTone = PRIORITY_TONE[project.priority] ?? 'neutral';
    const health = computeHealth(project);
    const notice = STATUS_NOTICE[project.status];

    const typeLabel =
      project.projectType && project.projectType in PROJECT_TYPE_LABELS
        ? PROJECT_TYPE_LABELS[project.projectType as ProjectType]
        : project.projectType
          ? toTitleLabel(project.projectType)
          : null;

    const tiles = useMemo<BandTile[]>(() => {
      const pct = progressPct(project);
      const metrics = data.summary.data?.metrics;
      const clock = computeClock(project);

      // ── Progress ──
      const progressSub = data.summary.isError
        ? "Tasks didn't load"
        : metrics === undefined
          ? undefined
          : metrics.totalTasks === 0
            ? 'No tasks yet'
            : `${formatNumber(metrics.completedTasks)} of ${formatNumber(metrics.totalTasks)} tasks done`;

      // ── Time ──
      let timeLabel = 'Time left';
      let timeValue = '—';
      let timeSub = 'No end date set';
      let timeIsBad = false;
      const remaining = daysUntil(project.endDate);
      if (project.status === ProjectStatus.COMPLETED) {
        timeLabel = 'Finished';
        timeValue = 'Done';
        timeSub = project.endDate ? `Ended ${formatDate(project.endDate)}` : 'Marked complete';
      } else if (project.status === ProjectStatus.CANCELLED) {
        timeSub = 'Project cancelled';
      } else if (remaining != null && project.endDate) {
        const ends = formatDate(project.endDate);
        if (remaining < 0) {
          timeLabel = 'Past due';
          timeValue = `${formatNumber(Math.abs(remaining))} d`;
          timeSub = `Was due ${ends}`;
          timeIsBad = true;
        } else {
          timeValue = remaining === 0 ? 'Today' : `${formatNumber(remaining)} d`;
          timeSub = clock
            ? `Ends ${ends} · ${Math.round(clock.elapsedPct)}% elapsed`
            : `Ends ${ends}`;
        }
      }

      // ── Money ──
      let moneyValue: string | undefined = '—';
      let moneySub: string | undefined = 'Finance access needed';
      let moneyIsBad = false;
      let moneySubIsBad = false;
      if (data.ledger.allowed) {
        if (data.ledger.isError) {
          moneySub = "Didn't load";
        } else if (data.ledger.data === undefined) {
          moneyValue = undefined;
          moneySub = undefined;
        } else {
          const ledger = data.ledger.data;
          moneyValue = rupeesShort(ledger.outstandingPaise / 100);
          const overdue = overdueMilestones(ledger);
          const next = openMilestonesByUrgency(ledger)[0];
          if (overdue.length > 0) {
            const owed = overdue.reduce((sum, m) => sum + m.balancePaise, 0);
            moneySub = `${formatPaise(owed)} overdue · ${overdue.length} ${plural(overdue.length, 'milestone')}`;
            moneyIsBad = true;
            moneySubIsBad = true;
          } else if (ledger.outstandingPaise <= 0) {
            moneySub = ledger.contractPaise > 0 ? 'Fully collected' : 'No contract value yet';
          } else if (next) {
            moneySub = next.dueDate
              ? `Next: ${next.name} · due ${formatDate(next.dueDate)}`
              : `Next: ${next.name}`;
          } else {
            moneySub = `of ${formatPaise(ledger.contractPaise)} contract`;
          }
        }
      }

      // ── Attention ──
      let attentionValue: string | undefined = '—';
      let attentionSub: string | undefined = "Didn't load";
      let attentionIsBad = false;
      if (!data.attention.isError) {
        if (data.attention.data === undefined) {
          attentionValue = undefined;
          attentionSub = undefined;
        } else {
          const count = data.attention.data.length;
          attentionValue = formatNumber(count);
          attentionIsBad = count > 0;
          if (count === 0) {
            attentionSub = 'All clear';
          } else {
            // Split by SEVERITY, not by task status. The Open work card owns
            // the blocked/backlog/in-progress counts, and repeating them here
            // would state the same figure twice on one screen. How bad the
            // pile is has no other home.
            let critical = 0;
            let warning = 0;
            for (const item of data.attention.data) {
              if (item.severity === 'critical') critical += 1;
              else if (item.severity === 'warning') warning += 1;
            }
            const parts: string[] = [];
            if (critical > 0) parts.push(`${critical} critical`);
            if (warning > 0) parts.push(`${warning} ${plural(warning, 'warning')}`);
            attentionSub = parts.length > 0 ? parts.join(' · ') : `${count} to review`;
          }
        }
      }

      return [
        {
          key: 'progress',
          label: 'Progress',
          href: `${projectPath}?tab=tasks`,
          value: `${pct}%`,
          sub: progressSub,
          track: { pct, color: 'var(--ds-accent-ink)' },
        },
        {
          key: 'time',
          label: timeLabel,
          href: `${projectPath}?tab=overview`,
          value: timeValue,
          valueIsBad: timeIsBad,
          sub: timeSub,
          track: clock ? { pct: clock.elapsedPct, color: 'var(--ds-secondary)' } : undefined,
        },
        {
          key: 'money',
          label: 'Outstanding',
          href: `${projectPath}?tab=finance`,
          value: moneyValue,
          valueIsBad: moneyIsBad,
          sub: moneySub,
          subIsBad: moneySubIsBad,
        },
        {
          key: 'attention',
          label: 'Needs attention',
          href: `${projectPath}?tab=overview`,
          value: attentionValue,
          valueIsBad: attentionIsBad,
          sub: attentionSub,
        },
      ];
    }, [project, data.summary, data.ledger, data.attention, projectPath]);

    return (
      <div>
        <Breadcrumb className="mb-3">
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={ROUTES.PROJECTS.LIST}>Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {/* The project CODE, not its name. The name is a sentence built
                  from customer, site and size — "Rohan Deshmukh - rohan-2nd-
                  house - 20.13kW" — which the 260px cap then truncated, so the
                  crumb identified the project by a prefix it shared with every
                  other project of the same customer. The code is short, unique,
                  and the string people actually quote to each other. The full
                  name is directly below in the header, so nothing is lost. */}
              <BreadcrumbPage className="max-w-[260px] truncate font-medium">
                {project.projectNumber || project.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <header className="relative overflow-hidden rounded-3xl bg-surface shadow-e2">
          {/* The one accent gesture on the page: an ambient brand bloom in the
              corner. Atmosphere only — nothing sits on it, it tints no control. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-28 -top-[250px] size-[420px] rounded-full opacity-90"
            style={{ background: 'var(--gradient-glow)' }}
          />

          <div className="relative px-5 pb-5 pt-5 lg:px-[26px]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-3.5">
                <div
                  className="flex size-[52px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold tracking-[-0.01em]"
                  style={{ background: TONE.accent.tint, color: TONE.accent.ink }}
                  aria-hidden
                >
                  {getInitials(customerName)}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1
                      className="max-w-[560px] truncate text-[20px] font-bold leading-[24px] tracking-[-0.015em] text-foreground"
                      title={project.name}
                    >
                      {project.name}
                    </h1>
                    <ProjectStatusDropdown
                      projectId={project.id}
                      status={project.status}
                      size="sm"
                    />
                    <TonePill label={`${priorityLabel} priority`} tone={priorityTone} />
                    {health ? (
                      <TonePill
                        label={HEALTH_STATUS_LABELS[health] ?? toTitleLabel(health)}
                        tone={HEALTH_TONE[health]}
                        dot
                      />
                    ) : null}
                  </div>

                  {/* Built as a list and joined, rather than each entry
                      carrying its own leading separator. The project number
                      used to lead this line and was the one entry guaranteed to
                      render, so every other entry could safely prefix itself
                      with a dot. The number now lives in the breadcrumb — it was
                      being stated twice on one screen — and with it gone that
                      invariant went too: the first surviving entry would have
                      opened the line with a stray "·", and which entry that is
                      depends on which of these a project happens to have. */}
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-foreground-secondary">
                    {(
                      [
                        project.systemSizeKw != null && project.systemSizeKw > 0 ? (
                          <span key="size" className="tabular-nums">
                            {formatSystemSize(project.systemSizeKw)} kW
                          </span>
                        ) : null,
                        typeLabel ? <span key="type">{typeLabel}</span> : null,
                        project.startDate ? (
                          <span key="started">Started {formatDate(project.startDate)}</span>
                        ) : null,
                        project.quoteId ? (
                          <Link
                            key="quote"
                            href={buildRoute(ROUTES.QUOTES.DETAIL, { id: project.quoteId })}
                            className="inline-flex items-center gap-1 font-medium text-secondary hover:underline"
                          >
                            <FileText className="size-3" aria-hidden />
                            {project.quoteNumber ?? 'Quote'}
                          </Link>
                        ) : null,
                      ].filter(Boolean) as React.JSX.Element[]
                    ).map((entry, index) => (
                      <React.Fragment key={entry.key}>
                        {index > 0 ? <span aria-hidden>·</span> : null}
                        {entry}
                      </React.Fragment>
                    ))}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <Fact
                      icon={<UserRound />}
                      href={
                        project.property?.customerId
                          ? buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: project.property.customerId })
                          : undefined
                      }
                      label="Open customer"
                    >
                      {customerName}
                    </Fact>
                    {phone ? (
                      <Fact
                        icon={<Phone />}
                        href={`tel:${phone.replace(/\s/g, '')}`}
                        label="Call customer"
                      >
                        {phone}
                      </Fact>
                    ) : null}
                    {/* WhatsApp and email deliberately absent. This header is
                        for working the PROJECT; the customer's full contact
                        card is one click away on the customer link above, which
                        is where reaching out belongs. Carrying a full email
                        address here also stretched the line badly on a long
                        address while saying nothing about the project. */}
                    {location ? <Fact icon={<MapPin />}>{location}</Fact> : null}
                    {manager ? <Fact icon={<UserRound />}>PM {memberName(manager)}</Fact> : null}
                  </div>

                  {/* The description is gone too. On a converted project it is
                      generated boilerplate — "Solar installation project
                      converted from quote QT-…" — restating the quote number
                      already shown as a chip in the line above. */}
                </div>
              </div>

              {onEdit ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditOutlinedIcon />}
                    onClick={editProject.onGatedClick}
                    aria-disabled={!editProject.allowed}
                    sx={editProject.allowed ? undefined : { opacity: 0.5 }}
                  >
                    Edit project
                  </Button>
                </div>
              ) : null}
            </div>

            {notice ? (
              <div
                role="status"
                className="mt-4 rounded-2xl px-4 py-2.5 text-[12.5px] leading-relaxed"
                style={{ background: TONE[notice.tone].tint, color: TONE[notice.tone].ink }}
              >
                <span className="font-semibold">{notice.title}.</span> {notice.body}
              </div>
            ) : null}

            <StatusBand tiles={tiles} />

            {showPhaseRail ? <PhaseRail data={data.milestones} projectPath={projectPath} /> : null}
          </div>
        </header>
      </div>
    );
  },
);

ProjectDetailHeader.displayName = 'ProjectDetailHeader';
