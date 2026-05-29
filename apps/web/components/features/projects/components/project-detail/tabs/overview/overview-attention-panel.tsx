'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Layers,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';

import { useProjectAttention } from '../../../../hooks';

import { Skeleton } from '@/components/ui';

export interface OverviewAttentionPanelProps {
  projectId: string;
  isActive: boolean;
  className?: string;
  listClassName?: string;
}

const KIND_ICON_MAP: Record<string, typeof AlertCircle> = {
  task_blocked: TriangleAlert,
  task_overdue: Clock3,
  milestone_late: AlertTriangle,
  milestone_due_soon: Clock3,
  material_pending: Layers,
  payment_due: Wallet,
};

const SEVERITY_CLASS_MAP: Record<string, string> = {
  critical: 'border-error/30 bg-error/5 text-error',
  warning: 'border-warning/30 bg-warning/5 text-warning',
  info: 'border-info/30 bg-info/5 text-info',
  low: 'border-border-light bg-muted/40 text-foreground-secondary',
};

export function OverviewAttentionPanel({
  projectId,
  isActive,
  className = '',
  listClassName = 'max-h-96 overflow-y-auto',
}: OverviewAttentionPanelProps): JSX.Element {
  const { data, isLoading } = useProjectAttention(projectId, { enabled: isActive });

  const items = data ?? [];

  return (
    <div
      className={`flex-1 rounded-xl border border-error/20 bg-card shadow-card p-5 flex flex-col ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="size-4 text-error shrink-0" />
          <p className="text-sm font-semibold text-foreground">Needs Attention</p>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-error/10 text-error">
          {items.length}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-success/20 bg-success/5 p-3 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          All clear — no items need attention.
        </div>
      ) : (
        <div className={`space-y-2 -mr-1 pr-1 flex-1 min-h-0 ${listClassName}`}>
          {items.map((item) => {
            const Icon = KIND_ICON_MAP[item.kind] ?? AlertCircle;
            const severityClass = SEVERITY_CLASS_MAP[item.severity] ?? SEVERITY_CLASS_MAP.info;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`group flex items-start justify-between gap-2 rounded-lg border p-2.5 hover:shadow-sm transition-all ${severityClass}`}
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <Icon className="size-4 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-foreground-secondary">{item.subtitle}</p>
                  </div>
                </div>
                <ChevronRight className="size-3.5 text-foreground-tertiary group-hover:text-primary shrink-0 mt-1" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
