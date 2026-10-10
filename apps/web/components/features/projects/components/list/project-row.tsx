'use client';

import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import CheckIcon from '@mui/icons-material/Check';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { IconButton, ListItemIcon, Menu, MenuItem, Tooltip } from '@mui/material';
import { ProjectPriority, ProjectStatus } from '@tejas96/shared/types';
import { indiaToday } from '@tejas96/shared/utils';
import NextLink from 'next/link';
import { type JSX, memo, useEffect, useState } from 'react';

import {
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
} from '../../constants';
import type { ProjectListItem } from '../../hooks';
import { TeamAvatarGroup } from '../team-avatar-group';

import { ABOVE, BONE, CalmRow, SKELETON_CARD, stopRowClick } from '@/components/shared/calm-list';
import type { CrmTone } from '@/components/shared/crm-table';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { color } from '@/lib/theme/tokens';
import { cn, formatCurrency, formatSystemSize, toTitleLabel } from '@/lib/utils';

/**
 * Wide: who · progress · system · contract · dates · team + ⋮ on one line.
 * Narrow (the list itself under 960px, so an open side panel counts): who and
 * team + ⋮, then progress, then dates, system and contract side by side.
 */
const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-3 @[960px]:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_64px_108px_112px_106px] @[960px]:gap-5';

const WIDE = '@[960px]:col-auto @[960px]:row-auto';
const CELL = {
  who: `col-span-2 col-start-1 row-start-1 ${WIDE}`,
  progress: `col-span-3 row-start-2 ${WIDE}`,
  system: `col-start-2 row-start-3 ${WIDE}`,
  contract: `col-start-3 row-start-3 ${WIDE}`,
  dates: `col-start-1 row-start-3 ${WIDE}`,
  actions: `col-start-3 row-start-1 ${WIDE}`,
} as const;

/** A cell is two lines on one rhythm: a fact over a note. */
const FACT = 'block truncate text-[14px] text-foreground';
const NOTE = 'block truncate text-[12px] text-foreground-tertiary';
/** A fact with nothing to report: a dash or "Not planned", never as dark as a real value. */
const FACT_EMPTY = 'block truncate text-[14px] text-foreground-muted';

export const STATUS_TONE: Record<string, CrmTone> = {
  [ProjectStatus.PLANNING]: 'info',
  [ProjectStatus.ACTIVE]: 'success',
  [ProjectStatus.ON_HOLD]: 'warning',
  [ProjectStatus.COMPLETED]: 'neutral',
  [ProjectStatus.CANCELLED]: 'neutral',
};

const PILL_PALETTE: Record<CrmTone, { ink: string; bg: string }> = {
  neutral: { ink: color.neutral, bg: color['neutral-bg'] },
  accent: { ink: color['accent-ink'], bg: color['accent-subtle'] },
  success: { ink: color.success, bg: color['success-bg'] },
  info: { ink: color.info, bg: color['info-bg'] },
  warning: { ink: color.warning, bg: color['warning-bg'] },
  danger: { ink: color.danger, bg: color['danger-bg'] },
};

/** Only a priority that asks for something gets a colour; the usual ones stay grey. */
const PRIORITY_TONE: Record<string, CrmTone> = {
  [ProjectPriority.LOW]: 'neutral',
  [ProjectPriority.NORMAL]: 'neutral',
  [ProjectPriority.HIGH]: 'warning',
  [ProjectPriority.URGENT]: 'danger',
};

/** Status and priority beside the name: present on every row, never louder than it. */
function QuietPill({ label, tone }: { label: string; tone: CrmTone }): JSX.Element {
  const palette = PILL_PALETTE[tone];
  return (
    <span
      title={label}
      // Gives way long before the name does (the name shrinks 1 for its 999).
      className="block min-w-7 shrink-[999] truncate rounded-pill px-2 py-0.5 text-[11px] font-medium leading-[13px]"
      style={{ color: palette.ink, backgroundColor: palette.bg }}
    >
      {label}
    </span>
  );
}

const RING_SIZE = 36;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Progress as a ring: the same fact the old bar carried, in a third of the width. */
function ProgressRing({ percent }: { percent: number }): JSX.Element {
  // Starts empty and fills on the first frame, so the arc draws itself once.
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(percent));
    return () => cancelAnimationFrame(frame);
  }, [percent]);

  const centre = RING_SIZE / 2;
  return (
    <svg
      role="img"
      aria-label={`${percent}% complete`}
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="shrink-0"
    >
      <circle
        cx={centre}
        cy={centre}
        r={RING_RADIUS}
        fill="none"
        stroke="var(--ds-neutral-300)"
        strokeWidth={RING_STROKE}
      />
      <circle
        cx={centre}
        cy={centre}
        r={RING_RADIUS}
        fill="none"
        stroke="var(--ds-primary)"
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_LENGTH}
        strokeDashoffset={RING_LENGTH * (1 - drawn / 100)}
        transform={`rotate(-90 ${centre} ${centre})`}
        className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
      />
      <text
        x={centre}
        y={centre}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground-secondary font-semibold tabular-nums"
        fontSize={10}
      >
        {percent}
        <tspan fontSize={7}>%</tspan>
      </text>
    </svg>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-09-14` → "14 Sep"; the year is added only when it is not this one. */
function shortDay(day: string | undefined, today: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(day ?? '');
  if (!match) return '-';
  const [, year = '', month = '', date = ''] = match;
  const label = `${Number(date)} ${MONTHS[Number(month) - 1] ?? ''}`;
  return year === today.slice(0, 4) ? label : `${label} ’${year.slice(2)}`;
}

/** Whole calendar days from one `YYYY-MM-DD` to another. */
function daysBetween(from: string, to: string): number {
  const utc = (day: string): number => {
    const [y = 0, m = 1, d = 1] = day.slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** The project row's ⋮ menu: the same single item the table's menu had. */
function ProjectRowActionsMenu({ project }: { project: ProjectListItem }): JSX.Element {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Project actions"
        title="More actions"
        className="size-[34px] text-foreground-secondary transition-transform duration-200 ease-calm hover:scale-[1.08] hover:bg-background-tertiary motion-reduce:transition-none"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          component={NextLink}
          href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id })}
          onClick={() => setAnchor(null)}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>
      </Menu>
    </>
  );
}

export interface ProjectRowProps {
  project: ProjectListItem;
  index: number;
  /** True only while the list makes its first entrance. */
  entering: boolean;
}

/**
 * One project, one line, each cell answering one question: whose it is, how
 * far along, how big, what it is worth, when, and who is on it.
 */
function ProjectRowInner({ project, index, entering }: ProjectRowProps): JSX.Element {
  const today = indiaToday();
  const href = buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id });

  // ── Who ──
  const name = project.property.customerName || project.name;
  const place = project.property.city || project.property.address;
  const address = [project.property.address, project.property.city].filter(Boolean).join(', ');
  const tickets = project.activeTicketCount;
  const ticketLabel = `${tickets} active ${tickets === 1 ? 'ticket' : 'tickets'}`;
  const { status, priority } = project;

  // ── Progress ──
  const percent = Math.round(Math.min(100, Math.max(0, project.progressPercentage)));
  const completed = project.completedTasks ?? 0;
  const total = project.totalTasks ?? 0;
  // Every step done: the Phase filter only matches live projects, so the cell
  // must not name a phase it cannot be filtered by. A cancelled project was
  // stopped, not finished, so it keeps its phase.
  const allDone = status !== ProjectStatus.CANCELLED && total > 0 && completed === total;
  const phase = allDone ? 'All phases done' : project.currentPhase;
  // The ring already says how far along; this line says what happens next and
  // who holds it. A cancelled project has no next step, whatever is still open.
  const nextStep = status === ProjectStatus.CANCELLED ? null : project.nextStep;
  const owner = nextStep?.assigneeName?.trim() || null;
  const ownerFirstName = owner?.split(/\s+/)[0];

  // ── System ──
  const type = PROJECT_TYPE_LABELS[project.projectType] ?? toTitleLabel(project.projectType);

  // ── Contract ──
  /*
   * One number, one word, one source — for worth *and* for collection: the
   * ledger view the project's Money tab reads (`contractValue`), not the quote
   * (`estimatedCost`), so a project with change orders reads the same here and
   * there. Collection comes from `outstanding` only (against the *contract*),
   * never from `totalExpected - totalPaid` (against the payment *schedule*):
   * those agree only when the schedule covers the whole contract. The schedule
   * figures and the quote-to-contract gap live in the tooltip.
   */
  const { contractValue: contract, outstanding, totalPaid, totalExpected } = project.paymentSummary;
  const quoted = project.estimatedCost ?? null;
  // Only worth mentioning when the contract has actually moved off the quote.
  const changeOrders = quoted != null && contract ? contract - quoted : 0;
  const hasChangeOrders = Math.abs(changeOrders) >= 0.01;
  // "Paid in full" only when money actually came in and none is left owing —
  // a zero balance with nothing collected is not a paid project.
  const paidInFull = outstanding <= 0 && totalPaid > 0;

  // ── Dates ──
  const { startDate, endDate, meterInstalled, meterInstalledOn } = project;
  const meterLine = meterInstalled ? (
    <span className="block truncate text-[12px] tabular-nums" style={{ color: color.success }}>
      <CheckIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: '-2px' }} />
      Meter in{meterInstalledOn ? ` · ${shortDay(meterInstalledOn, today)}` : ''}
    </span>
  ) : null;
  const planned = Boolean(startDate || endDate);
  const range = `${shortDay(startDate, today)} → ${shortDay(endDate, today)}`;
  const open = status !== ProjectStatus.COMPLETED && status !== ProjectStatus.CANCELLED;
  // The meter going in is the job's key milestone: once it has, a countdown
  // (or an overdue warning) to the planned end date would contradict it.
  const daysLeft = endDate && open && !meterInstalled ? daysBetween(today, endDate) : null;

  return (
    <CalmRow
      rowId={project.id}
      className={ROW_GRID}
      label={`Open project ${project.projectNumber} for ${name}`}
      href={href}
      index={index}
      entering={entering}
    >
      {/* Who */}
      <div className={cn(CELL.who, ABOVE, 'flex min-w-0 items-center gap-3.5')}>
        <MUIAvatar
          name={name}
          size={44}
          aria-hidden
          sx={{ flexShrink: 0, fontSize: 15, fontWeight: 600 }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              title={name}
              className="min-w-0 shrink truncate text-[16px] font-semibold tracking-[-0.01em]"
            >
              {name}
            </span>
            <QuietPill
              label={PROJECT_STATUS_LABELS[status] ?? toTitleLabel(status)}
              tone={STATUS_TONE[status] ?? 'neutral'}
            />
            <QuietPill
              label={PROJECT_PRIORITY_LABELS[priority] ?? toTitleLabel(priority)}
              tone={PRIORITY_TONE[priority] ?? 'neutral'}
            />
            {project.wantsLoan ? <QuietPill label="Loan" tone="info" /> : null}
            {tickets > 0 ? (
              <span
                role="img"
                aria-label={ticketLabel}
                title={ticketLabel}
                className="inline-flex shrink-0"
                style={{ color: color.warning }}
              >
                <BuildOutlinedIcon sx={{ fontSize: 14 }} />
              </span>
            ) : null}
          </div>
          <div
            title={[project.projectNumber, address].filter(Boolean).join(' · ')}
            className="truncate text-[13px] text-foreground-secondary"
          >
            <span className="tabular-nums">{project.projectNumber}</span>
            {place ? ` · ${place}` : ''}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className={cn(CELL.progress, ABOVE, 'flex min-w-0 items-center gap-2.5')}>
        <ProgressRing percent={percent} />
        <div className="min-w-0 flex-1">
          <span
            className={cn(phase ? FACT : FACT_EMPTY, phase && 'font-semibold')}
            title={phase ?? undefined}
          >
            {phase ?? '-'}
          </span>
          {nextStep ? (
            // The step name gives way first: who holds it is never the part cut off.
            <span
              className="flex min-w-0 text-[12px] text-foreground-tertiary"
              title={`Next: ${nextStep.name} · ${owner ?? 'Unassigned'}`}
            >
              <span className="truncate">Next: {nextStep.name}</span>
              <span className="shrink-0 whitespace-pre">
                {' · '}
                {owner ? ownerFirstName : <span className="text-error">Unassigned</span>}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      {/* System */}
      <div className={cn(CELL.system, ABOVE, 'min-w-0')}>
        <span className={cn(FACT, 'tabular-nums')}>
          {formatSystemSize(project.systemSizeKw)} kW
        </span>
        <span className={NOTE} title={type}>
          {type}
        </span>
      </div>

      {/* Contract */}
      <div className={cn(CELL.contract, ABOVE, 'min-w-0 text-right')}>
        {contract ? (
          <Tooltip
            title={
              <span style={{ whiteSpace: 'pre-line' }}>
                {[
                  `Paid ${formatCurrency(totalPaid)} of ${formatCurrency(totalExpected)} invoiced`,
                  hasChangeOrders
                    ? `Quote ${formatCurrency(quoted ?? 0)} ${changeOrders > 0 ? '+' : '−'} ${formatCurrency(Math.abs(changeOrders))} change orders`
                    : null,
                ]
                  .filter(Boolean)
                  .join('\n')}
              </span>
            }
            placement="top"
            enterDelay={400}
          >
            <div className="min-w-0">
              <NextLink
                href={`${href}?tab=finance`}
                prefetch={false}
                onClick={stopRowClick}
                className="block truncate text-[16px] font-semibold tabular-nums text-foreground hover:text-primary-dark hover:underline"
              >
                {formatCurrency(contract)}
              </NextLink>
              {outstanding > 0 ? (
                <span
                  className="block truncate text-[12px] tabular-nums"
                  style={{ color: color.warning }}
                >
                  {formatCurrency(outstanding)} due
                </span>
              ) : paidInFull ? (
                <span className="block truncate text-[12px]" style={{ color: color.success }}>
                  paid in full
                </span>
              ) : null}
            </div>
          </Tooltip>
        ) : (
          <span className={FACT_EMPTY}>-</span>
        )}
      </div>

      {/* Dates */}
      <div className={cn(CELL.dates, ABOVE, 'min-w-0')}>
        {planned ? (
          <span className={cn(FACT, 'tabular-nums')} title={range}>
            {range}
          </span>
        ) : (
          <span className={FACT_EMPTY}>Not planned</span>
        )}
        {meterLine ? (
          meterLine
        ) : !planned || daysLeft == null ? null : daysLeft < 0 ? (
          // Grey, not red: old due dates are common, and a red line on every row is noise.
          <span className={cn(NOTE, 'tabular-nums')}>due {plural(-daysLeft, 'day')} ago</span>
        ) : (
          <span className={cn(NOTE, 'tabular-nums')}>
            {daysLeft === 0 ? 'due today' : `${plural(daysLeft, 'day')} left`}
          </span>
        )}
      </div>

      {/* Team · ⋮ — a click on either never opens the project. */}
      <div
        className={cn(CELL.actions, ABOVE, 'flex items-center justify-end gap-1.5')}
        onClick={stopRowClick}
      >
        <TeamAvatarGroup members={project.teamMembers} max={3} size="xs" />
        <ProjectRowActionsMenu project={project} />
      </div>
    </CalmRow>
  );
}

export const ProjectRow = memo(ProjectRowInner);

/** One placeholder shaped like a project row, so nothing jumps when data lands. */
export function ProjectRowSkeleton(): JSX.Element {
  return (
    <div className={cn(ROW_GRID, SKELETON_CARD)}>
      <div className={cn(CELL.who, 'flex items-center gap-3.5')}>
        <span className={cn(BONE, 'size-11 flex-none')} />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className={cn(BONE, 'h-4 w-3/5')} />
          <span className={cn(BONE, 'h-3 w-4/5')} />
        </span>
      </div>
      <div className={cn(CELL.progress, 'flex items-center gap-2.5')}>
        <span className={cn(BONE, 'size-9 flex-none')} />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className={cn(BONE, 'h-3.5 w-2/3')} />
          <span className={cn(BONE, 'h-3 w-4/5')} />
        </span>
      </div>
      <div className={cn(CELL.system, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-12')} />
        <span className={cn(BONE, 'h-3 w-14')} />
      </div>
      <div className={cn(CELL.contract, 'flex flex-col items-end gap-2')}>
        <span className={cn(BONE, 'h-4 w-20')} />
        <span className={cn(BONE, 'h-3 w-16')} />
      </div>
      <div className={cn(CELL.dates, 'flex flex-col gap-2')}>
        <span className={cn(BONE, 'h-3.5 w-24')} />
        <span className={cn(BONE, 'h-3 w-16')} />
      </div>
      <div className={cn(CELL.actions, 'flex items-center justify-end gap-1.5')}>
        <span className={cn(BONE, 'size-7')} />
        <span className={cn(BONE, 'size-[34px]')} />
      </div>
    </div>
  );
}
