'use client';

import { MaterialStatus, TaskStatus } from '@tejas96/shared/types';
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Layers, Wallet } from 'lucide-react';
import Link from 'next/link';
import { type ElementType, type ReactElement, useMemo } from 'react';

import { useProjectReports, type ProjectDetail } from '../../../../hooks';

import { Skeleton } from '@/components/ui';
import { useProjectReceiptSummary, useProjectSummary } from '@/lib/hooks/resources';
import { buildTasksTabUrl, cn, formatNumber } from '@/lib/utils';

interface OverviewInsightsStripProps {
  project: ProjectDetail;
  projectId: string;
  projectPath: string;
  isActive: boolean;
}

interface InsightCard {
  label: string;
  valueMain: string;
  valueSuffix?: string;
  valueTone?: 'default' | 'error';
  icon: ElementType;
  href: string;
  accentClass: string;
  cardTone?: 'default' | 'danger';
}

export function OverviewInsightsStrip({
  project,
  projectId,
  projectPath,
  isActive,
}: OverviewInsightsStripProps): ReactElement {
  const { data: summary, isLoading: summaryLoading } = useProjectSummary(projectId, {
    enabled: isActive,
  });
  const { data: paymentSummary } = useProjectReceiptSummary(projectId, { enabled: isActive });
  const { data: reportsData } = useProjectReports(projectId, { enabled: isActive });

  const cards = useMemo<InsightCard[]>(() => {
    const totalMaterials = project.materials.length;
    const readyMaterials = project.materials.filter(
      (m) => m.status === MaterialStatus.ALLOCATED || m.status === MaterialStatus.USED,
    ).length;
    const materialReadyPct =
      totalMaterials > 0 ? Math.round((readyMaterials / totalMaterials) * 100) : 0;

    const paymentPct =
      paymentSummary && paymentSummary.totals.totalExpected > 0
        ? Math.round(
            (paymentSummary.totals.totalReceived / paymentSummary.totals.totalExpected) * 100,
          )
        : 0;

    const daysRemaining = project.endDate
      ? Math.ceil((new Date(project.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : null;

    return [
      {
        label: 'Tasks done',
        valueMain: String(summary?.metrics.completedTasks ?? 0),
        valueSuffix: `/${summary?.metrics.totalTasks ?? 0}`,
        icon: CheckCircle2,
        href: buildTasksTabUrl(projectPath, { status: TaskStatus.DONE }),
        accentClass: 'bg-success/8 text-success ring-success/15',
      },
      {
        label: 'Overdue tasks',
        valueMain: formatNumber(summary?.metrics.overdueTasks ?? 0),
        valueTone: 'error',
        cardTone: 'danger',
        icon: AlertTriangle,
        href: buildTasksTabUrl(projectPath),
        accentClass: 'bg-error/8 text-error ring-error/15',
      },
      {
        label: 'Days remaining',
        valueMain: daysRemaining == null ? '—' : String(daysRemaining),
        valueSuffix: daysRemaining == null ? undefined : ' d',
        icon: CalendarClock,
        href: projectPath,
        accentClass: 'bg-warning/10 text-warning ring-warning/20',
      },
      {
        label: 'Payment received',
        valueMain: String(paymentPct),
        valueSuffix: '%',
        icon: Wallet,
        href: `${projectPath}?tab=finance`,
        accentClass: 'bg-success/8 text-success ring-success/15',
      },
      {
        label: 'Materials ready',
        valueMain: String(materialReadyPct),
        valueSuffix: '%',
        icon: Layers,
        href: `${projectPath}?tab=bom`,
        accentClass: 'bg-info/8 text-info ring-info/15',
      },
      {
        label: 'Documents',
        valueMain: String(reportsData?.savedCount ?? 0),
        valueSuffix: reportsData ? `/${reportsData.totalCount}` : undefined,
        icon: FileText,
        href: `${projectPath}?tab=reports`,
        accentClass: 'bg-primary/8 text-primary ring-primary/15',
      },
    ];
  }, [paymentSummary, project.endDate, project.materials, projectPath, reportsData, summary]);

  if (summaryLoading && !summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="info-card flex items-center gap-3 rounded-xl shadow-e2/70 bg-card p-3 shadow-card"
          >
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isDanger = card.cardTone === 'danger';

        return (
          <Link
            key={card.label}
            href={card.href}
            className={cn(
              'info-card group flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card transition-all',
              'hover:-translate-y-px hover:shadow',
              isDanger
                ? 'border-error/30 hover:border-error/40'
                : 'border-border-light/70 hover:border-border-light',
            )}
          >
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
                card.accentClass,
              )}
            >
              <Icon className="size-[18px]" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-0 text-[18px] font-semibold leading-none text-foreground">
                <span className={cn(card.valueTone === 'error' && 'text-error')}>
                  {card.valueMain}
                </span>
                {card.valueSuffix != null && card.valueSuffix !== '' ? (
                  <span className="text-[13px] font-normal text-foreground-tertiary">
                    {card.valueSuffix}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] text-foreground-secondary">{card.label}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
