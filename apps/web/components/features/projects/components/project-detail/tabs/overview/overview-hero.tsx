'use client';

import { ProjectType, type AttentionItem } from '@oneohm-epc/shared/types';
import { AlertTriangle, ArrowRight, CalendarClock, FileText, Home, Wallet } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import {
  HEALTH_STATUS_BADGE_VARIANT,
  HEALTH_STATUS_LABELS,
  HEALTH_STATUS_PROGRESS_VARIANT,
  PROJECT_TYPE_BADGE_VARIANT,
  PROJECT_TYPE_LABELS,
} from '../../../../constants';
import { useProjectAttention } from '../../../../hooks';
import type { ProjectDetail } from '../../../../hooks/types';

import { Badge, Card, CardContent, Skeleton } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useProjectReceiptSummary } from '@/lib/hooks/resources';
import { buildTasksTabUrl, toTitleLabel } from '@/lib/utils';
import {
  formatCurrency,
  formatDate,
  formatSystemSizeDisplay,
  getInitials,
} from '@/lib/utils/format';

const PROGRESS_RING_STROKE: Record<string, string> = {
  primary: '#76c044',
  success: '#22c55e',
  warning: '#eab308',
  error: '#dc2626',
};

const RING_PATH = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';

function startOfDayMs(iso: string): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getProjectDayCounts(
  startDate?: string,
  endDate?: string,
): { day: number; total: number } | null {
  if (!startDate || !endDate) return null;
  const start = startOfDayMs(startDate);
  const end = startOfDayMs(endDate);
  const today = startOfDayMs(new Date().toISOString());
  const msPerDay = 86_400_000;
  const total = Math.max(1, Math.round((end - start) / msPerDay) + 1);
  const rawDay = Math.round((today - start) / msPerDay) + 1;
  const day = Math.min(Math.max(1, rawDay), total);
  return { day, total };
}

function getQuoteAcceptedAt(project: ProjectDetail): string | undefined {
  const raw = project.metadata?.quoteAcceptedAt;
  return typeof raw === 'string' ? raw : undefined;
}

function nextActionCta(attention: AttentionItem | undefined): {
  label: string;
  Icon: typeof AlertTriangle;
} {
  if (!attention) return { label: 'Review plan', Icon: CalendarClock };
  if (attention.kind === 'payment_due') return { label: 'Send Reminder', Icon: Wallet };
  return { label: 'Resolve now', Icon: AlertTriangle };
}

interface OverviewHeroProps {
  project: ProjectDetail;
  projectId: string;
  isActive: boolean;
}

export function OverviewHero({ project, projectId, isActive }: OverviewHeroProps): ReactElement {
  const { data: attention, isLoading: attentionLoading } = useProjectAttention(projectId, {
    enabled: isActive,
  });
  const { data: paymentSummary } = useProjectReceiptSummary(projectId, { enabled: isActive });

  const healthKey = (project.metadata?.healthStatus as string | undefined) ?? 'on_track';
  const healthLabel = HEALTH_STATUS_LABELS[healthKey] ?? 'On Track';
  const progressVariant = HEALTH_STATUS_PROGRESS_VARIANT[healthKey] ?? 'primary';
  const ringStroke = PROGRESS_RING_STROKE[progressVariant];
  const healthBadgeVariant = (HEALTH_STATUS_BADGE_VARIANT[healthKey] ?? 'green-subtle') as
    | 'green-subtle'
    | 'amber'
    | 'red-subtle';

  const projectPath = buildRoute(ROUTES.PROJECTS.DETAIL, { id: projectId });
  const nextAttention = attention?.[0];
  const nextActionTitle = nextAttention?.title ?? 'Continue planned execution';
  const nextActionSubtitle =
    nextAttention?.subtitle ??
    (paymentSummary?.totals.pending
      ? `${formatCurrency(paymentSummary.totals.pending)} pending in payment pipeline`
      : 'No urgent blockers detected');
  const nextActionHref = nextAttention?.href ?? buildTasksTabUrl(projectPath);
  const { label: ctaLabel, Icon: CtaIcon } = nextActionCta(nextAttention);

  const pct = Math.min(100, Math.max(0, Math.round(project.progressPercentage)));
  const dayCounts = getProjectDayCounts(project.startDate, project.endDate);
  const quoteAcceptedAt = getQuoteAcceptedAt(project);

  const projectTypeLabel =
    project.projectType && project.projectType in PROJECT_TYPE_LABELS
      ? PROJECT_TYPE_LABELS[project.projectType as ProjectType]
      : project.property.propertyType
        ? toTitleLabel(project.property.propertyType)
        : null;

  const typeBadgeVariant =
    project.projectType && project.projectType in PROJECT_TYPE_BADGE_VARIANT
      ? (PROJECT_TYPE_BADGE_VARIANT[project.projectType as ProjectType] as
          | 'teal'
          | 'purple'
          | 'amber'
          | 'green-subtle')
      : 'secondary';

  const systemSubtitleParts: string[] = [];
  const primarySizeKw = project.actualSystemSizeKw ?? project.systemSizeKw;
  if (primarySizeKw != null && primarySizeKw > 0) {
    systemSubtitleParts.push(
      formatSystemSizeDisplay(project.actualSystemSizeKw, project.systemSizeKw),
    );
  }
  if (projectTypeLabel) systemSubtitleParts.push(projectTypeLabel);
  const systemSubtitle = systemSubtitleParts.length > 0 ? systemSubtitleParts.join(' · ') : null;

  const customerName = project.property.customerName ?? 'Unknown Customer';
  const initials = getInitials(customerName);
  const phone = project.property.customerPhone?.trim();
  const email = project.property.customerEmail?.trim();

  return (
    <Card className="hero-gradient rounded-xl border border-gray-100">
      <CardContent className="p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
          <div className="flex min-w-0 items-center gap-4 lg:col-span-5">
            <div className="relative shrink-0">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-lg font-semibold text-white shadow-md">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm">
                <Home className="size-3 text-foreground-secondary" aria-hidden />
              </div>
            </div>
            <div className="min-w-0">
              {project.property.customerId ? (
                <Link
                  href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: project.property.customerId })}
                  className="inline-flex max-w-full items-center gap-1 text-[15px] font-semibold text-foreground hover:text-primary"
                >
                  <span className="truncate">{customerName}</span>
                  <ArrowRight className="size-3 shrink-0 text-foreground-tertiary" aria-hidden />
                </Link>
              ) : (
                <span className="block truncate text-[15px] font-semibold text-foreground">
                  {customerName}
                </span>
              )}
              {systemSubtitle ? (
                <p className="mt-0.5 truncate text-[12px] text-foreground-secondary">
                  {systemSubtitle}
                </p>
              ) : null}
              {(phone || email) && (
                <div className="mt-0.5 truncate text-[12px] text-foreground-secondary">
                  {phone ? (
                    <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-primary">
                      {phone}
                    </a>
                  ) : null}
                  {phone && email ? <span className="text-gray-300"> · </span> : null}
                  {email ? (
                    <a href={`mailto:${email}`} className="hover:text-primary">
                      {email}
                    </a>
                  ) : null}
                </div>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                {project.quoteId ? (
                  <Link
                    href={buildRoute(ROUTES.QUOTES.DETAIL, { id: project.quoteId })}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary hover:underline"
                  >
                    <FileText className="size-3 shrink-0" aria-hidden />
                    {project.quoteNumber ?? 'View quote'}
                  </Link>
                ) : null}
                {project.quoteId && (quoteAcceptedAt || projectTypeLabel) ? (
                  <span className="text-gray-300">·</span>
                ) : null}
                {quoteAcceptedAt ? (
                  <span className="text-[11px] text-foreground-secondary">
                    Accepted {formatDate(quoteAcceptedAt, 'short')}
                  </span>
                ) : null}
                {quoteAcceptedAt && projectTypeLabel ? (
                  <span className="text-gray-300">·</span>
                ) : null}
                {projectTypeLabel ? (
                  <Badge
                    variant={typeBadgeVariant}
                    size="xs"
                    shape="rounded"
                    className="font-medium"
                  >
                    {projectTypeLabel}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="hidden justify-center lg:col-span-1 lg:flex">
            <div className="h-14 w-px bg-gray-200" />
          </div>

          <div className="flex items-center gap-3 lg:col-span-3">
            <div className="relative shrink-0">
              <svg className="progress-ring size-20" viewBox="0 0 36 36" aria-hidden>
                <path d={RING_PATH} fill="none" stroke="#f1f5f9" strokeWidth={3} />
                <path
                  d={RING_PATH}
                  fill="none"
                  stroke={ringStroke}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray={`${pct}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-semibold leading-none text-foreground">
                  {pct}%
                </span>
                <span className="mt-0.5 text-[9px] text-foreground-secondary">complete</span>
              </div>
            </div>
            <div className="min-w-0">
              <Badge variant={healthBadgeVariant} size="sm">
                {healthLabel}
              </Badge>
              {dayCounts ? (
                <div className="mt-1 text-[11px] text-foreground-secondary">
                  Day <span className="font-semibold text-foreground">{dayCounts.day}</span> of{' '}
                  {dayCounts.total}
                </div>
              ) : null}
              {project.endDate ? (
                <div className="text-[11px] text-foreground-secondary">
                  Ends{' '}
                  <span className="font-medium text-foreground">
                    {formatDate(project.endDate, 'short')}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-white p-3 shadow-sm lg:col-span-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
              Next Action
            </p>
            {attentionLoading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-foreground">{nextActionTitle}</p>
                <p className="mt-0.5 text-[11px] text-foreground-secondary">{nextActionSubtitle}</p>
                <Link
                  href={nextActionHref}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <CtaIcon className="size-3.5 shrink-0" aria-hidden />
                  {ctaLabel}
                  <ArrowRight className="size-3 shrink-0" aria-hidden />
                </Link>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
