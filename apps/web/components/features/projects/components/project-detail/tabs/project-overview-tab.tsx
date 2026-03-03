'use client';

import { ProjectStatus } from '@oneohm-epc/shared-types';
import {
  Banknote,
  Calendar,
  Crown,
  MapPin,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useMemo, useState } from 'react';

import {
  HEALTH_STATUS_BADGE_VARIANT,
  HEALTH_STATUS_LABELS,
  MAX_DISPLAYED_MILESTONES,
  MAX_DISPLAYED_TEAM_MEMBERS,
  MS_PER_DAY,
  PROJECT_TYPE_LABELS,
} from '../../../constants';
import type { ProjectDetail, ProjectTeamMember } from '../../../hooks/types';
import { useProjectTeam, useProjectTaskStats } from '../../../hooks/use-project-detail';
import { usePaymentMilestones, useProjectPaymentSummary } from '../../../hooks/use-project-payments';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CircularProgress, Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/sonner';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils/error';
import { formatCurrency, formatDate, formatSystemSize, getInitials } from '@/lib/utils/format';


interface ProjectOverviewTabProps {
  project: ProjectDetail;
  isActive: boolean;
}

function CardTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="size-icon-xs text-foreground-muted" />
      <h3 className="text-xs font-semibold text-foreground">{title}</h3>
    </div>
  );
}

function InfoRow({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex justify-between py-1">
      <span className="text-xs text-foreground-secondary">{label}</span>
      {href ? (
        <Link href={href} className="text-xs font-medium text-primary hover:underline">
          {value}
        </Link>
      ) : (
        <span className="text-xs font-medium text-foreground">{value}</span>
      )}
    </div>
  );
}

function SourceBanner({ project }: { project: ProjectDetail }) {
  const p = project.property;
  const address = [p?.address, p?.city].filter(Boolean).join(', ');

  return (
    <div className="lg:col-span-2 bg-linear-to-r from-primary/10 to-info/5 rounded-lg p-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 text-xs">
          {project.quoteId ? (
            <div className="flex items-center">
              <span className="text-foreground-secondary mr-1.5">Quote:</span>
              <Link
                href={buildRoute(ROUTES.QUOTES.DETAIL, { id: project.quoteId })}
                className="font-semibold text-primary hover:underline"
              >
                {project.quoteNumber ?? project.quoteId.slice(0, 8)}
              </Link>
            </div>
          ) : (
            <span className="font-medium text-foreground">Direct Project</span>
          )}
          {p?.customerName && (
            <>
              <span className="text-border">|</span>
              <div className="flex items-center">
                <span className="text-foreground-secondary mr-1.5">Customer:</span>
                {p.customerId ? (
                  <Link
                    href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: p.customerId })}
                    className="font-semibold text-info hover:underline"
                  >
                    {p.customerName}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{p.customerName}</span>
                )}
              </div>
            </>
          )}
          {address && (
            <>
              <span className="text-border">|</span>
              <div className="flex items-center">
                <span className="text-foreground-secondary mr-1.5">Property:</span>
                <span className="font-medium text-foreground">{address}</span>
              </div>
            </>
          )}
        </div>
        {project.projectType && (
          <Badge
            variant={(PROJECT_TYPE_LABELS[project.projectType] ? 'teal' : 'secondary') as 'teal'}
            shape="rounded"
            size="sm"
          >
            {PROJECT_TYPE_LABELS[project.projectType] ?? project.projectType}
          </Badge>
        )}
      </div>
    </div>
  );
}

function CustomerCard({ project }: { project: ProjectDetail }) {
  const p = project.property;
  return (
    <div className="rounded-lg border border-border-light bg-background-secondary p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="size-icon-xs text-foreground-muted" />
          <h3 className="text-xs font-semibold text-foreground">Customer Info</h3>
        </div>
        {p?.customerId && (
          <Link
            href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: p.customerId })}
            className="text-2xs text-primary font-medium hover:underline"
          >
            View Profile →
          </Link>
        )}
      </div>
      <div className="divide-y divide-border-light">
        <InfoRow label="Name" value={p?.customerName} />
        <InfoRow label="Phone" value={p?.customerPhone} />
        {p?.customerEmail && <InfoRow label="Email" value={p.customerEmail} />}
      </div>
    </div>
  );
}

function SiteCard({ project }: { project: ProjectDetail }) {
  const p = project.property;
  const survey = project.survey;
  const address = [p?.address, p?.city, p?.state, p?.pincode].filter(Boolean).join(', ');

  return (
    <div className="rounded-lg border border-border-light bg-background-secondary p-4">
      <CardTitle icon={MapPin} title="Installation Site" />
      <div className="divide-y divide-border-light">
        <InfoRow label="Address" value={address || 'N/A'} />
        <InfoRow label="Roof Type" value={survey?.surveyData?.roofType ?? 'N/A'} />
        <InfoRow
          label="Available Area"
          value={
            survey?.surveyData?.availableAreaSqm != null
              ? `${survey.surveyData.availableAreaSqm} sqm`
              : 'N/A'
          }
        />
      </div>
    </div>
  );
}

function SystemCard({ project }: { project: ProjectDetail }) {
  return (
    <div className="rounded-lg border border-border-light bg-background-secondary p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="size-icon-xs text-warning" />
          <h3 className="text-xs font-semibold text-foreground">System Specifications</h3>
        </div>
        {project.quoteId && (
          <Link
            href={buildRoute(ROUTES.QUOTES.DETAIL, { id: project.quoteId })}
            className="text-2xs text-primary font-medium hover:underline"
          >
            View Quote →
          </Link>
        )}
      </div>
      <div className="divide-y divide-border-light">
        <InfoRow
          label="System Size"
          value={project.systemSizeKw ? `${formatSystemSize(project.systemSizeKw)} kW` : 'N/A'}
        />
        <InfoRow label="Estimated Cost" value={project.estimatedCost ? formatCurrency(project.estimatedCost) : 'N/A'} />
        <InfoRow label="Actual Cost" value={project.actualCost ? formatCurrency(project.actualCost) : 'N/A'} />
      </div>
    </div>
  );
}

function TeamMemberRow({ member }: { member: ProjectTeamMember }) {
  const name = member.user
    ? `${member.user.firstName ?? ''} ${member.user.lastName ?? ''}`.trim()
    : 'Unknown';

  return (
    <div className="flex items-center gap-2">
      <Avatar size="xs" className="shrink-0">
        <AvatarFallback size="xs" name={name || 'U'}>
          {getInitials(name || 'U')}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{name}</p>
        <p className="text-2xs text-foreground-secondary">{member.roleName}</p>
      </div>
      {member.isProjectManager && (
        <Crown className="size-3.5 text-warning shrink-0" />
      )}
    </div>
  );
}

function TeamCard({ projectId, isActive }: { projectId: string; isActive: boolean }) {
  const { data: team, isLoading, isError, error } = useProjectTeam(projectId, { enabled: isActive });
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  if (isLoading) return <Skeleton className="h-32 rounded-lg" />;

  if (isError) {
    return (
      <div className="rounded-lg border border-border-light bg-background-secondary p-4">
        <CardTitle icon={Users} title="Team Members" />
        <p className="text-xs text-error">{getErrorMessage(error)}</p>
      </div>
    );
  }

  if (!team) return null;

  const overflow = team.length - MAX_DISPLAYED_TEAM_MEMBERS;
  const displayed = expanded ? team : team.slice(0, MAX_DISPLAYED_TEAM_MEMBERS);

  return (
    <div className="rounded-lg border border-border-light bg-background-secondary p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="size-icon-xs text-foreground-muted" />
          <h3 className="text-xs font-semibold text-foreground">Team Members</h3>
          {team.length > 0 && (
            <span className="text-2xs text-foreground-secondary">({team.length})</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => showToast.info('Coming Soon')}
          className="flex items-center gap-1 text-2xs text-primary font-medium hover:underline cursor-pointer"
        >
          <UserPlus className="size-3" />
          Add
        </button>
      </div>
      {team.length === 0 ? (
        <p className="text-xs text-foreground-secondary">No team members assigned</p>
      ) : (
        <div className="space-y-2">
          {displayed.map((member) => (
            <TeamMemberRow key={member.id} member={member} />
          ))}
          {overflow > 0 && (
            <button
              type="button"
              onClick={toggleExpanded}
              className="text-2xs text-primary font-medium hover:underline cursor-pointer"
            >
              {expanded ? 'Show less' : `+${overflow} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TimelineCard({ project }: { project: ProjectDetail }) {
  const isTerminal = project.status === ProjectStatus.COMPLETED || project.status === ProjectStatus.CANCELLED;

  const daysRemaining = useMemo(() => {
    if (!project.endDate) return null;
    const end = new Date(project.endDate);
    end.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - now.getTime()) / MS_PER_DAY);
  }, [project.endDate]);

  function renderTimelineStatus(): React.ReactNode {
    if (isTerminal) {
      const label = project.status === ProjectStatus.COMPLETED ? 'Completed' : 'Cancelled';
      const color = project.status === ProjectStatus.COMPLETED ? 'text-success' : 'text-foreground-secondary';
      return <span className={`text-xs font-medium ${color}`}>{label}</span>;
    }
    if (daysRemaining === null) {
      return <span className="text-xs font-medium text-foreground-secondary">End date not set</span>;
    }
    if (daysRemaining < 0) {
      return (
        <span className="text-xs font-medium text-error">
          Overdue by {Math.abs(daysRemaining)} day{Math.abs(daysRemaining) === 1 ? '' : 's'}
        </span>
      );
    }
    if (daysRemaining === 0) {
      return <span className="text-xs font-medium text-warning">Due today</span>;
    }
    return (
      <span className="text-xs font-medium text-foreground">
        {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
      </span>
    );
  }

  return (
    <div className="rounded-lg border border-border-light bg-background-secondary p-4">
      <CardTitle icon={Calendar} title="Project Timeline" />
      <div className="divide-y divide-border-light">
        <InfoRow label="Start Date" value={project.startDate ? formatDate(project.startDate) : 'Not set'} />
        <InfoRow label="End Date" value={project.endDate ? formatDate(project.endDate) : 'Not set'} />
        <div className="flex justify-between py-1">
          <span className="text-xs text-foreground-secondary">Status</span>
          {renderTimelineStatus()}
        </div>
      </div>
      <div className="mt-3">
        <Progress value={project.progressPercentage} size="sm" variant="primary" />
        <p className="text-2xs text-foreground-secondary mt-1">{project.progressPercentage}% complete</p>
      </div>
    </div>
  );
}

function MilestonesCard({ projectId, isActive }: { projectId: string; isActive: boolean }) {
  const { data: milestones, isLoading, isError, error } = usePaymentMilestones(projectId, { enabled: isActive });
  const { data: paymentSummary } = useProjectPaymentSummary(projectId, { enabled: isActive });

  if (isLoading) return <Skeleton className="h-32 rounded-lg lg:col-span-2" />;

  if (isError) {
    return (
      <div className="lg:col-span-2 rounded-lg border border-border-light bg-background-secondary p-4">
        <CardTitle icon={Banknote} title="Project Milestones" />
        <p className="text-xs text-error">{getErrorMessage(error)}</p>
      </div>
    );
  }

  if (!milestones || milestones.length === 0) {
    return (
      <div className="lg:col-span-2 rounded-lg border border-border-light bg-background-secondary p-4">
        <CardTitle icon={Banknote} title="Project Milestones" />
        <p className="text-xs text-foreground-secondary">No milestones defined</p>
      </div>
    );
  }

  const displayed = milestones.slice(0, MAX_DISPLAYED_MILESTONES);

  return (
    <div className="lg:col-span-2 rounded-lg border border-border-light bg-background-secondary p-4">
      <CardTitle icon={Banknote} title="Project Milestones" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {displayed.map((m) => (
          <div
            key={m.id}
            className="bg-background rounded-lg p-3 border border-border-light"
          >
            <span className="text-2xs font-medium text-foreground-secondary truncate block mb-1">{m.name}</span>
            {m.endDate && (
              <p className="text-2xs text-foreground-tertiary">
                {formatDate(m.endDate, 'short')}
              </p>
            )}
          </div>
        ))}
      </div>
      {milestones.length > MAX_DISPLAYED_MILESTONES && (
        <p className="text-2xs text-primary font-medium mt-2">
          View all {milestones.length} milestones in Payments tab
        </p>
      )}
      {paymentSummary && (
        <div className="flex gap-4 mt-3 pt-3 border-t border-border-light text-xs">
          <span className="text-foreground-secondary">
            Total: <span className="font-medium text-foreground">{formatCurrency(paymentSummary.totalExpected)}</span>
          </span>
          <span className="text-foreground-secondary">
            Received: <span className="font-medium text-success">{formatCurrency(paymentSummary.totalPaid)}</span>
          </span>
          <span className="text-foreground-secondary">
            Pending: <span className="font-medium text-warning">{formatCurrency(paymentSummary.pendingAmount)}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function ProgressCard({ projectId, project, isActive }: { projectId: string; project: ProjectDetail; isActive: boolean }) {
  const { data: stats, isLoading, isError } = useProjectTaskStats(projectId, { enabled: isActive });

  const hs = project.metadata?.healthStatus as string | undefined;
  const healthLabel = hs ? (HEALTH_STATUS_LABELS[hs] ?? hs) : null;
  const healthVariant = hs ? (HEALTH_STATUS_BADGE_VARIANT[hs] ?? 'secondary') : 'secondary';

  if (isLoading) return <Skeleton className="h-32 rounded-lg lg:col-span-2" />;

  return (
    <div className="lg:col-span-2 rounded-lg border border-border-light bg-background-secondary p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="size-icon-xs text-foreground-muted" />
          <h3 className="text-xs font-semibold text-foreground">Project Progress</h3>
        </div>
        <div className="flex items-center gap-6">
          {!isError && stats && stats.total > 0 && (
            <div className="text-center">
              <p className="text-2xs text-foreground-secondary">Tasks</p>
              <p className="text-xs font-semibold text-foreground">{stats.byStatus?.done ?? 0}/{stats.total} done</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <CircularProgress value={project.progressPercentage} size="sm" variant="primary" />
            <div>
              <p className="text-lg font-semibold text-foreground">{project.progressPercentage}%</p>
              {healthLabel && (
                <Badge variant={healthVariant as 'success'} shape="rounded" size="xs" dot>
                  {healthLabel}
                </Badge>
              )}
              {!healthLabel && !isError && stats?.total === 0 && (
                <p className="text-2xs text-foreground-tertiary">No tasks yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ProjectOverviewTab = React.memo(({
  project,
  isActive,
}: ProjectOverviewTabProps): React.JSX.Element => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <SourceBanner project={project} />
      <CustomerCard project={project} />
      <SiteCard project={project} />
      <SystemCard project={project} />
      <TimelineCard project={project} />
      <TeamCard projectId={project.id} isActive={isActive} />
      <MilestonesCard projectId={project.id} isActive={isActive} />
      <ProgressCard projectId={project.id} project={project} isActive={isActive} />
    </div>
  );
});
