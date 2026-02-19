'use client';

import { ProjectStatus } from '@oneohm-epc/shared-types';
import { MapPin, User, Zap } from 'lucide-react';
import Link from 'next/link';

import {
  HEALTH_STATUS_BADGE_VARIANT,
  HEALTH_STATUS_LABELS,
  PHASE_LABELS,
  PROJECT_STATUS_BADGE_VARIANT,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_BADGE_VARIANT,
  PROJECT_TYPE_LABELS,
} from '../constants';
import type { ProjectListItem } from '../hooks';

import { Avatar, AvatarFallback, AvatarGroup } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/lib/config/routes';
import { formatCurrency, formatDate, formatRelativeDate, getInitials } from '@/lib/utils';


interface ProjectCardProps {
  project: ProjectListItem;
}

function formatSystemSize(kw: number | string): string {
  const n = typeof kw === 'string' ? parseFloat(kw) : kw;
  if (isNaN(n)) return '0';
  return n % 1 === 0 ? String(Math.round(n)) : String(parseFloat(n.toFixed(2)));
}

function getProgressBarColor(project: ProjectListItem): string {
  if (project.healthStatus === 'delayed') return 'bg-error';
  if (project.healthStatus === 'at_risk') return 'bg-warning';
  if (project.status === ProjectStatus.ON_HOLD) return 'bg-warning';
  if (project.status === ProjectStatus.COMPLETED) return 'bg-success';
  return 'bg-primary';
}

function getDueDateDisplay(project: ProjectListItem) {
  if (project.status === ProjectStatus.ON_HOLD) {
    return { label: 'Due', value: 'On Hold', className: 'text-foreground-secondary' };
  }
  if (project.status === ProjectStatus.COMPLETED) {
    return { label: 'Completed', value: project.endDate ? formatDate(project.endDate, 'medium') : '-', className: 'text-foreground' };
  }
  if (!project.endDate) {
    return { label: 'Due', value: 'Not set', className: 'text-foreground-tertiary' };
  }
  const relative = formatRelativeDate(project.endDate);
  const isOverdue = relative.startsWith('Overdue');
  return { label: 'Due', value: isOverdue ? relative : formatDate(project.endDate, 'medium'), className: isOverdue ? 'text-error' : 'text-foreground' };
}

function getPaymentDisplay(project: ProjectListItem) {
  const { totalExpected, totalPaid } = project.paymentSummary;
  if (totalExpected === 0) return { text: '-', className: 'text-foreground-tertiary' };
  if (totalPaid >= totalExpected) return { text: '\u2713 Paid', className: 'text-success' };
  const pending = totalExpected - totalPaid;
  return { text: `${formatCurrency(pending)} pending`, className: 'text-warning' };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const dueDateDisplay = getDueDateDisplay(project);
  const paymentDisplay = getPaymentDisplay(project);
  const progressBarColor = getProgressBarColor(project);

  return (
    <Link
      href={ROUTES.PROJECTS.DETAIL.replace('[id]', project.id)}
      className="block bg-background rounded-lg border border-border-light p-4 cursor-pointer transition-all duration-150 hover:shadow-sm hover:-translate-y-px"
    >
      {/* Row 1: Project number + type | Status + health */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-medium text-foreground-tertiary">{project.projectNumber}</span>
            <Badge
              variant={(PROJECT_TYPE_BADGE_VARIANT[project.projectType] ?? 'secondary') as 'teal'}
              size="xs"
              shape="rounded"
            >
              {PROJECT_TYPE_LABELS[project.projectType] ?? project.projectType}
            </Badge>
          </div>
          <h3 className="text-base font-semibold text-foreground mt-0.5 line-clamp-1">{project.name}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <Badge
            variant={(PROJECT_STATUS_BADGE_VARIANT[project.status] ?? 'secondary') as 'green-subtle'}
            size="xs"
            shape="rounded"
          >
            {PROJECT_STATUS_LABELS[project.status] ?? project.status}
          </Badge>
          {project.healthStatus && (
            <Badge
              variant={(HEALTH_STATUS_BADGE_VARIANT[project.healthStatus] ?? 'secondary') as 'amber'}
              size="xs"
              shape="rounded"
            >
              {HEALTH_STATUS_LABELS[project.healthStatus]}
            </Badge>
          )}
        </div>
      </div>

      {/* Row 2: Customer + quote reference */}
      <div className="flex items-center text-sm text-foreground-secondary mb-1">
        <User className="size-4 mr-1.5 text-foreground-tertiary shrink-0" />
        {project.property.customerName ? (
          <>
            <span className="truncate">{project.property.customerName}</span>
            {project.metadata?.quoteNumber && (
              <>
                <span className="text-border-medium mx-1.5 shrink-0">&bull;</span>
                <span className="text-2xs text-foreground-tertiary whitespace-nowrap">from {project.metadata.quoteNumber}</span>
              </>
            )}
          </>
        ) : (
          <span className="text-foreground-tertiary">No customer</span>
        )}
      </div>

      {/* Row 3: Address */}
      <div className="flex items-center text-xs text-foreground-tertiary mb-3">
        <MapPin className="size-3.5 mr-1.5 text-foreground-tertiary shrink-0" />
        {project.property.address ? (
          <span className="truncate">{project.property.address}{project.property.city ? `, ${project.property.city}` : ''}</span>
        ) : (
          <span>No address</span>
        )}
      </div>

      {/* Row 4: System size | Value */}
      <div className="flex items-center gap-4 text-sm text-foreground-secondary mb-3">
        <span className="flex items-center">
          <Zap className="size-4 mr-1 text-warning" />
          {formatSystemSize(project.systemSizeKw)} kW
        </span>
        {project.estimatedCost != null && (
          <>
            <span className="text-border-medium">|</span>
            <span className="font-medium text-foreground">{formatCurrency(project.estimatedCost)}</span>
          </>
        )}
      </div>

      {/* Row 5: Phase */}
      <div className="flex items-center text-sm text-foreground-secondary mb-3">
        <Badge variant="info" size="xs" shape="rounded">
          Phase: {project.currentPhase ? (PHASE_LABELS[project.currentPhase] ?? project.currentPhase) : 'Not started'}
        </Badge>
      </div>

      {/* Row 6: Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-2xs mb-1">
          <span className="text-foreground-tertiary">Progress</span>
          <span className="font-medium text-foreground-secondary">{project.progressPercentage}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
            style={{ width: `${project.progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Row 7: Team & Due date */}
      <div className="flex items-center justify-between pt-3 border-t border-border-light">
        {project.teamMembers.length > 0 ? (
          <AvatarGroup max={3} size="xs">
            {project.teamMembers.map((member) => {
              const fullName = `${member.firstName}${member.lastName ? ` ${member.lastName}` : ''}`;
              return (
                <Avatar key={member.id} size="xs">
                  <AvatarFallback size="xs" name={fullName}>
                    {getInitials(fullName)}
                  </AvatarFallback>
                </Avatar>
              );
            })}
          </AvatarGroup>
        ) : (
          <span className="text-2xs text-foreground-tertiary">No team</span>
        )}
        <div className="text-right">
          <div className="text-2xs text-foreground-tertiary">{dueDateDisplay.label}</div>
          <div className={`text-sm font-medium ${dueDateDisplay.className}`}>{dueDateDisplay.value}</div>
        </div>
      </div>

      {/* Row 8: Payment */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light">
        <span className="text-2xs text-foreground-tertiary">Payment</span>
        <span className={`text-sm font-medium ${paymentDisplay.className}`}>{paymentDisplay.text}</span>
      </div>
    </Link>
  );
}
