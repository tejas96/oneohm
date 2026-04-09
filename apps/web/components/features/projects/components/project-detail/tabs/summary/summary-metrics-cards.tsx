'use client';

import { TaskStatus } from '@oneohm-epc/shared/types';
import { AlertTriangle, CheckCircle2, Clock, ListTodo, UserX, Zap } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectSummaryMetrics } from '@/lib/hooks/resources';
import { buildTasksTabUrl } from '@/lib/utils';

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  chipBg: string;
  chipIcon: string;
  valueColor?: string;
  href: string;
  isLoading?: boolean;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  chipBg,
  chipIcon,
  valueColor,
  href,
  isLoading,
}: MetricCardProps) {
  const activeValueColor = valueColor && value > 0 ? valueColor : 'text-foreground';

  return (
    <Link
      href={href}
      className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-md hover:border-primary/30 hover:-translate-y-px transition-all duration-150 group"
    >
      {/* Icon chip */}
      <div
        className={`shrink-0 rounded-lg p-2 ${chipBg} group-hover:scale-105 transition-transform`}
      >
        <Icon className={`size-4 ${chipIcon}`} />
      </div>

      {/* Count + label stacked to the right of the icon */}
      {isLoading ? (
        <div className="flex flex-col gap-1.5 min-w-0">
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-3 w-14" />
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className={`text-xl font-bold leading-none ${activeValueColor}`}>{value}</span>
          <span className="text-xs text-foreground-secondary truncate group-hover:text-primary/70 transition-colors">
            {label}
          </span>
        </div>
      )}
    </Link>
  );
}

interface SummaryMetricsCardsProps {
  metrics: ProjectSummaryMetrics | undefined;
  isLoading: boolean;
  projectPath: string;
}

export function SummaryMetricsCards({ metrics, isLoading, projectPath }: SummaryMetricsCardsProps) {
  const cards: Omit<MetricCardProps, 'isLoading'>[] = [
    {
      icon: ListTodo,
      label: 'Total Tasks',
      value: metrics?.totalTasks ?? 0,
      chipBg: 'bg-primary/10',
      chipIcon: 'text-primary',
      href: buildTasksTabUrl(projectPath),
    },
    {
      icon: CheckCircle2,
      label: 'Completed',
      value: metrics?.completedTasks ?? 0,
      chipBg: 'bg-success/10',
      chipIcon: 'text-success',
      valueColor: 'text-success',
      href: buildTasksTabUrl(projectPath, { status: TaskStatus.DONE }),
    },
    {
      icon: Clock,
      label: 'In Progress',
      value: metrics?.inProgressTasks ?? 0,
      chipBg: 'bg-info/10',
      chipIcon: 'text-info',
      valueColor: 'text-info',
      href: buildTasksTabUrl(projectPath, { status: TaskStatus.IN_PROGRESS }),
    },
    {
      icon: AlertTriangle,
      label: 'Overdue',
      value: metrics?.overdueTasks ?? 0,
      chipBg: 'bg-warning/10',
      chipIcon: 'text-warning',
      valueColor: 'text-warning',
      // Overdue is a derived state (past endDate) — no dedicated URL filter; navigate to all tasks
      href: buildTasksTabUrl(projectPath),
    },
    {
      icon: Zap,
      label: 'Blocked',
      value: metrics?.blockedTasks ?? 0,
      chipBg: 'bg-error/10',
      chipIcon: 'text-error',
      valueColor: 'text-error',
      href: buildTasksTabUrl(projectPath, { status: TaskStatus.BLOCKED }),
    },
    {
      icon: UserX,
      label: 'Unassigned',
      value: metrics?.unassignedTasks ?? 0,
      chipBg: 'bg-gray-100',
      chipIcon: 'text-foreground-secondary',
      // Unassigned is a derived state — no dedicated URL filter; navigate to all tasks
      href: buildTasksTabUrl(projectPath),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} isLoading={isLoading} />
      ))}
    </div>
  );
}
