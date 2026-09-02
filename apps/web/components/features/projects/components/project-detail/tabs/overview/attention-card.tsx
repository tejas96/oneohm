'use client';

import type { AttentionItem, AttentionKind, AttentionSeverity } from '@tejas96/shared/types';
import {
  CalendarClock,
  CircleCheck,
  Clock3,
  Flag,
  IndianRupee,
  Package,
  TriangleAlert,
} from 'lucide-react';
import * as React from 'react';

import { plural } from '../../lib/derive';
import {
  CardLink,
  DetailCard,
  EmptyPane,
  IconCircle,
  Mono,
  RowLink,
  TonePill,
  type Tone,
} from '../../primitives';
import type { Panel } from '../../types';

import { Skeleton } from '@/components/ui/skeleton';
import { buildTasksTabUrl, formatDate } from '@/lib/utils';

const MAX_ROWS = 8;

const KIND_ICON: Record<
  AttentionKind,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  task_blocked: TriangleAlert,
  task_overdue: Clock3,
  milestone_late: Flag,
  milestone_due_soon: CalendarClock,
  material_pending: Package,
  payment_due: IndianRupee,
};

const SEVERITY_TONE: Record<AttentionSeverity, Tone> = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
};

interface AttentionCardProps {
  attention: Panel<AttentionItem[]>;
  projectPath: string;
  className?: string;
}

/**
 * What is holding this project, ranked by the server. Project-wide, not
 * personal — it includes other people's tasks, which is why each row carries
 * who it sits with.
 */
export function AttentionCard({
  attention,
  projectPath,
  className,
}: AttentionCardProps): React.JSX.Element {
  const items = attention.data ?? [];
  const visible = items.slice(0, MAX_ROWS);
  const hidden = items.length - visible.length;

  return (
    <DetailCard
      label="Needs attention"
      aside={
        attention.data && items.length > 0 ? `${items.length} open · most urgent first` : undefined
      }
      action={<CardLink href={buildTasksTabUrl(projectPath)}>All tasks</CardLink>}
      isError={attention.isError}
      onRetry={attention.refetch}
      className={className}
    >
      {attention.isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyPane
          icon={<CircleCheck className="size-5" strokeWidth={2} />}
          tone="success"
          title="All clear"
          description="Nothing on this project needs a decision today."
        />
      ) : (
        <>
          <ol className="flex flex-col gap-0.5">
            {visible.map((item) => {
              const Icon = KIND_ICON[item.kind] ?? TriangleAlert;
              const tone = SEVERITY_TONE[item.severity] ?? 'info';
              return (
                <li key={item.id} className="min-w-0">
                  <RowLink href={item.href} className="py-2">
                    <IconCircle tone={tone} size={32}>
                      <Icon className="size-4" strokeWidth={1.75} />
                    </IconCircle>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="block truncate text-[11.5px] text-foreground-tertiary">
                        {item.subtitle}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      {item.dueDate ? (
                        <Mono className="text-[11.5px] text-foreground-secondary">
                          {formatDate(item.dueDate)}
                        </Mono>
                      ) : null}
                      {item.assigneeName ? (
                        <span className="max-w-[140px] truncate text-[11px] text-foreground-tertiary">
                          {item.assigneeName}
                        </span>
                      ) : item.kind === 'task_blocked' || item.kind === 'task_overdue' ? (
                        <TonePill
                          label="Unassigned"
                          tone="warning"
                          className="h-[18px] px-1.5 text-[10px]"
                        />
                      ) : null}
                    </span>
                  </RowLink>
                </li>
              );
            })}
          </ol>
          {hidden > 0 ? (
            <div className="pt-2">
              <CardLink href={buildTasksTabUrl(projectPath)}>
                and {hidden} more {plural(hidden, 'item')}
              </CardLink>
            </div>
          ) : null}
        </>
      )}
    </DetailCard>
  );
}
