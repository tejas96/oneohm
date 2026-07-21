'use client';

import Card from '@mui/material/Card';
import * as React from 'react';

import { MUITypography } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

export interface WorkerPerformance {
  userId: string;
  name: string;
  activeProjects: number;
  activeTasks: number;
  completedTasks: number;
  totalTasks: number;
}

interface WorkerMatrixProps {
  workers: WorkerPerformance[];
}

// ============================================================================
// Component
// ============================================================================

export function WorkerMatrix({ workers }: WorkerMatrixProps): React.JSX.Element {
  return (
    <Card
      elevation={0}
      className="flex-1 lg:w-[65%] p-4 rounded-lg shadow-e2 bg-background shadow-card flex flex-col justify-between min-h-[350px]"
    >
      <div>
        <MUITypography variant="sectionTitle" className="font-semibold text-text-primary">
          Resource Capacity Matrix
        </MUITypography>
        <MUITypography variant="finePrint" className="text-text-secondary mt-0.5">
          Real-time workload monitoring for team assignment and capacity planning
        </MUITypography>
      </div>

      <div className="flex-1 flex flex-col gap-3 mt-4 overflow-y-auto max-h-[220px] pr-1">
        {workers.length === 0 ? (
          <div className="text-center py-6">
            <MUITypography variant="body" className="text-text-secondary italic">
              No team allocation records found
            </MUITypography>
          </div>
        ) : (
          workers.map((worker) => {
            const projects = worker.activeProjects;
            const tasks = worker.activeTasks;

            let capacityText: string;
            let capacityColor: string;
            let barColor: string;
            let fillWidth: string;

            if (tasks === 0) {
              capacityText = 'Available';
              capacityColor =
                'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30';
              barColor = 'bg-slate-300 dark:bg-slate-600';
              fillWidth = '0%';
            } else if (tasks >= 5) {
              capacityText = 'Overloaded';
              capacityColor =
                'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
              barColor = 'bg-rose-500';
              fillWidth = '100%';
            } else if (tasks === 4) {
              capacityText = 'High Load';
              capacityColor =
                'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
              barColor = 'bg-amber-500';
              fillWidth = '80%';
            } else {
              capacityText = 'Optimal';
              capacityColor =
                'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
              barColor = 'bg-emerald-500';
              fillWidth = `${tasks * 20}%`;
            }

            return (
              <div
                key={worker.userId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg shadow-e2 bg-background-secondary hover:bg-border-light transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MUITypography
                      variant="bodyPrimary"
                      className="font-semibold text-text-primary truncate"
                    >
                      {worker.name}
                    </MUITypography>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${capacityColor}`}
                    >
                      {capacityText}
                    </span>
                  </div>
                  <MUITypography variant="finePrint" className="text-text-secondary mt-0.5 block">
                    {projects === 0
                      ? 'No active projects'
                      : `${projects} active project${projects > 1 ? 's' : ''}`}{' '}
                    • {tasks} active task{tasks !== 1 ? 's' : ''}
                  </MUITypography>
                </div>

                {/* Capacity occupancy bar */}
                <div className="w-full sm:w-32 flex flex-col gap-1 shrink-0">
                  <div className="flex items-center justify-between text-[10px] text-text-secondary font-medium">
                    <span>Occupancy</span>
                    <span>{fillWidth}</span>
                  </div>
                  <div className="h-1.5 w-full bg-border-light rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: fillWidth }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-3 flex items-center justify-between text-xs text-text-secondary mt-4">
        <MUITypography variant="body" className="text-text-secondary">
          Active Team Size
        </MUITypography>
        <MUITypography variant="bodyPrimary" className="font-semibold text-text-primary">
          {workers.length} Members
        </MUITypography>
      </div>
    </Card>
  );
}
