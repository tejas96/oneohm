'use client';

import { CheckCircle2, Milestone } from 'lucide-react';
import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import type { MilestoneProgressEntry } from '@/lib/hooks/resources';

interface MilestoneProgressPanelProps {
  milestoneProgress: MilestoneProgressEntry[] | undefined;
  isLoading: boolean;
}

interface ProgressBarProps {
  value: number; // 0-100
}

function ProgressBar({ value }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const isComplete = clamped >= 100;
  return (
    <div className="h-2 w-full rounded-full bg-border-light overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          isComplete ? 'bg-success' : 'bg-primary'
        }`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function MilestoneProgressPanel({
  milestoneProgress,
  isLoading,
}: MilestoneProgressPanelProps) {
  if (!isLoading && (!milestoneProgress || milestoneProgress.length === 0)) {
    return null;
  }

  return (
    <div className="bg-surface border border-border-light rounded-xl p-5 flex flex-col">
      <p className="text-sm font-semibold text-foreground mb-4">Milestone Progress</p>

      {isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-5">
          {milestoneProgress!.map((milestone) => {
            const isComplete = milestone.percent >= 100;
            return (
              <li key={milestone.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isComplete ? (
                      <CheckCircle2 className="size-3.5 text-success shrink-0" />
                    ) : (
                      <Milestone className="size-3.5 text-foreground-tertiary shrink-0" />
                    )}
                    <span className="text-xs font-medium text-foreground truncate">
                      {milestone.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-foreground-tertiary">
                      {milestone.completedTasks}/{milestone.totalTasks} tasks
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        isComplete ? 'text-success' : 'text-primary'
                      }`}
                    >
                      {milestone.percent}%
                    </span>
                  </div>
                </div>
                <ProgressBar value={milestone.percent} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
