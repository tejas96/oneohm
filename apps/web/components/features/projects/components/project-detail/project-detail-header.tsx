'use client';

import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import Link from 'next/link';
import React from 'react';

import { PROJECT_PRIORITY_LABELS, PROJECT_PRIORITY_BADGE_VARIANT } from '../../constants';
import type { ProjectDetail } from '../../hooks/types';
import { ProjectStatusDropdown } from '../project-status-dropdown';

import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { SystemSizeDisplay } from '@/components/ui/system-size-display';
import { ROUTES } from '@/lib/config/routes';
import { useGatedAction } from '@/lib/rbac';
import { formatDate } from '@/lib/utils/format';

interface ProjectDetailHeaderProps {
  project: ProjectDetail;
  onEdit?: () => void;
}

export const ProjectDetailHeader = React.memo(
  ({ project, onEdit }: ProjectDetailHeaderProps): React.JSX.Element => {
    const editProject = useGatedAction('projects.edit', () => onEdit?.(), 'Edit project');

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
              <ProjectStatusDropdown projectId={project.id} status={project.status} size="sm" />
              <Badge variant={priorityVariant as 'warning'} shape="pill" size="sm">
                {priorityLabel}
              </Badge>
            </div>
            <p className="text-xs text-foreground-secondary mt-1">
              {project.projectNumber}
              {project.systemSizeKw != null && (
                <>
                  {' · '}
                  <SystemSizeDisplay
                    actualKw={project.actualSystemSizeKw}
                    requestedKw={project.systemSizeKw}
                    size="sm"
                    layout="inline"
                  />
                </>
              )}
              {project.projectType ? ` · ${project.projectType}` : ''}
              {project.startDate ? ` · Started ${formatDate(project.startDate, 'medium')}` : ''}
            </p>
          </div>

          {onEdit && (
            <div className="flex-shrink-0">
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon fontSize="small" />}
                onClick={editProject.onGatedClick}
                aria-disabled={!editProject.allowed}
              >
                Edit Project
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  },
);

ProjectDetailHeader.displayName = 'ProjectDetailHeader';
