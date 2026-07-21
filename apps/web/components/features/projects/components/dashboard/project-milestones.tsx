'use client';

import Card from '@mui/material/Card';
import * as React from 'react';

import { MUITypography } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

export interface ProjectMilestoneHealth {
  id: string;
  projectNumber: string;
  name: string;
  progress: number;
  currentMilestone: string;
  milestones: {
    name: string;
    completed: boolean;
  }[];
}

interface ProjectMilestonesProps {
  projects: ProjectMilestoneHealth[];
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ProjectMilestones({
  projects,
  className,
}: ProjectMilestonesProps): React.JSX.Element {
  return (
    <Card
      elevation={0}
      className={`flex-1 p-4 rounded-lg shadow-e2 bg-background shadow-card flex flex-col justify-between min-h-[360px] ${
        className || 'lg:w-1/2'
      }`}
    >
      <div>
        <MUITypography variant="sectionTitle" className="font-semibold text-text-primary">
          Project Milestones & Health
        </MUITypography>
        <MUITypography variant="finePrint" className="text-text-secondary mt-0.5">
          Real-time tracking of active solar installation phases
        </MUITypography>
      </div>

      <div className="flex-1 flex flex-col gap-4 mt-4 justify-center">
        {projects.length === 0 ? (
          <div className="text-center py-6">
            <MUITypography variant="body" className="text-text-secondary italic">
              No active solar projects currently tracked
            </MUITypography>
          </div>
        ) : (
          projects.slice(0, 3).map((project) => (
            <div
              key={project.id}
              className="flex flex-col gap-2 p-3 rounded-lg shadow-e2 bg-background-secondary hover:bg-border-light transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <MUITypography variant="bodyPrimary" className="font-semibold text-text-primary">
                    {project.name}
                  </MUITypography>
                  <MUITypography variant="finePrint" className="text-text-secondary">
                    {project.projectNumber} • Current: {project.currentMilestone}
                  </MUITypography>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="relative size-9">
                    <svg className="size-full" viewBox="0 0 36 36">
                      <path
                        className="text-border-light"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-emerald-500 transition-all duration-500"
                        strokeWidth="3.5"
                        strokeDasharray={`${project.progress}, 100`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MUITypography
                        variant="finePrint"
                        className="text-[10px] font-semibold text-text-primary leading-none"
                      >
                        {project.progress}%
                      </MUITypography>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Horizontal Stages */}
              <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                {project.milestones.map((m, idx) => (
                  <div key={idx} className="flex flex-col gap-1 items-center">
                    <div
                      className={`h-1.5 w-full rounded-lg ${
                        m.completed ? 'bg-emerald-500' : 'bg-border-light'
                      }`}
                    />
                    <MUITypography
                      variant="finePrint"
                      className="text-[8px] font-semibold text-text-secondary truncate w-full text-center"
                    >
                      {m.name}
                    </MUITypography>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
