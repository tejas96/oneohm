'use client';

import { KanbanSquare } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_BADGE_VARIANT,
  PROJECT_PRIORITY_LABELS,
  PROJECT_PRIORITY_BADGE_VARIANT,
} from '../../constants';
import type { ProjectDetail } from '../../hooks/types';

import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { formatDate, formatSystemSize } from '@/lib/utils/format';

interface ProjectDetailHeaderProps {
  project: ProjectDetail;
}

export const ProjectDetailHeader = React.memo(
  ({ project }: ProjectDetailHeaderProps): React.JSX.Element => {
    const statusLabel = PROJECT_STATUS_LABELS[project.status] ?? project.status;
    const statusVariant = PROJECT_STATUS_BADGE_VARIANT[project.status] ?? 'secondary';
    const priorityLabel = PROJECT_PRIORITY_LABELS[project.priority] ?? project.priority;
    const priorityVariant = PROJECT_PRIORITY_BADGE_VARIANT[project.priority] ?? 'secondary';
    return (
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={ROUTES.PROJECTS.LIST}>Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px]">{project.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-xl font-semibold text-foreground truncate max-w-[400px]"
                title={project.name}
              >
                {project.name}
              </h1>
              <Badge variant={statusVariant as 'success'} shape="pill" size="sm">
                {statusLabel}
              </Badge>
              <Badge variant={priorityVariant as 'warning'} shape="pill" size="sm">
                {priorityLabel}
              </Badge>
            </div>
            <p className="text-xs text-foreground-secondary mt-1">
              {project.projectNumber}
              {project.systemSizeKw ? ` · ${formatSystemSize(project.systemSizeKw)} kW` : ''}
              {project.projectType ? ` · ${project.projectType}` : ''}
              {project.startDate ? ` · Started ${formatDate(project.startDate, 'medium')}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" asChild>
              <Link
                href={buildRoute(ROUTES.PROJECTS.BOARD, undefined, {
                  project: project.id,
                })}
              >
                <KanbanSquare className="size-icon-xs mr-1.5" />
                View Kanban
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  },
);
