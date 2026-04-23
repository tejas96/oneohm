'use client';

import Link from 'next/link';
import type { JSX } from 'react';

import { Skeleton } from '@/components/ui';
import { useProjectSummary } from '@/lib/hooks/resources';
import { formatTimeAgo } from '@/lib/utils/format';

interface OverviewActivityFeedProps {
  projectId: string;
  projectPath: string;
  isActive: boolean;
}

function dotRingClasses(activityType: string): string {
  const t = activityType.toLowerCase();
  if (t.includes('status') || t.includes('progress')) return 'bg-info ring-4 ring-info/10';
  if (t.includes('created')) return 'bg-success ring-4 ring-success/10';
  if (t.includes('comment')) return 'bg-warning ring-4 ring-warning/10';
  return 'bg-primary ring-4 ring-primary/10';
}

function humanizeActivityType(activityType: string): string {
  return activityType
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function OverviewActivityFeed({
  projectId,
  projectPath,
  isActive,
}: OverviewActivityFeedProps): JSX.Element {
  const { data: summary, isLoading } = useProjectSummary(projectId, { enabled: isActive });

  const entries = summary?.recentActivity ?? [];
  const activityLogHref = `${projectPath}?tab=summary`;

  return (
    <section className="flex-1 rounded-xl border border-border-light/70 bg-card p-5 shadow-card flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        <Link
          href={activityLogHref}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          View full log →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-foreground-secondary">No recent activity.</p>
      ) : (
        <div className="relative pl-6 max-h-96 overflow-y-auto -mr-1 pr-1 flex-1 min-h-0">
          <div className="absolute bottom-0 left-[9px] top-0 w-0.5 bg-border-light" />
          {entries.map((entry) => (
            <div key={`${entry.taskId}-${entry.createdAt}`} className="relative pb-3 last:pb-0">
              <div
                className={`absolute -left-[19px] top-1 size-3 rounded-full ${dotRingClasses(entry.activityType)}`}
              />
              <div className="text-[12px]">
                <span className="font-medium text-foreground">
                  {humanizeActivityType(entry.activityType)}
                </span>{' '}
                <span className="text-foreground-secondary">
                  {entry.taskCode}: {entry.taskName}
                </span>
                {entry.newValue ? (
                  <>
                    {' '}
                    <span className="text-foreground">→ {entry.newValue}</span>
                  </>
                ) : null}
              </div>
              <div className="text-[10px] text-foreground-tertiary">
                By {entry.userName ?? 'System'} · {formatTimeAgo(entry.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
