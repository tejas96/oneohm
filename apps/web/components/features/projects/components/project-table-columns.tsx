'use client';

import { ProjectStatus } from '@oneohm-epc/shared/types';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreVertical } from 'lucide-react';
import Link from 'next/link';

import {
  PHASE_LABELS,
  PROJECT_STATUS_BADGE_VARIANT,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
} from '../constants';
import type { ProjectListItem } from '../hooks';
import { TeamAvatarGroup } from './team-avatar-group';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatRelativeDate,
  formatSystemSize,
  getInitials,
} from '@/lib/utils';

export const projectColumns: ColumnDef<ProjectListItem>[] = [
  {
    accessorKey: 'projectNumber',
    header: 'Project',
    cell: ({ row }) => {
      const project = row.original;
      return (
        <div>
          <Link
            href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id })}
            className="text-sm font-medium text-primary hover:underline"
          >
            {project.projectNumber}
          </Link>
          {project.quoteNumber && (
            <div className="text-section text-foreground-tertiary">from {project.quoteNumber}</div>
          )}
        </div>
      );
    },
  },
  {
    id: 'customer',
    header: 'Customer & Property',
    cell: ({ row }) => {
      const { property } = row.original;
      const name = property.customerName ?? 'Unknown';
      return (
        <div className="flex items-center gap-2.5">
          <Avatar size="sm">
            <AvatarFallback size="sm">{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium text-foreground text-sm truncate">{name}</div>
            {property.address && (
              <div className="text-foreground-tertiary text-2xs truncate max-w-44">
                {property.address}
                {property.city ? `, ${property.city}` : ''}
              </div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'systemSizeKw',
    header: 'Size',
    cell: ({ row }) => {
      const project = row.original;
      return (
        <div>
          <div className="text-sm text-foreground font-medium">
            {formatSystemSize(project.systemSizeKw)} kW
          </div>
          <div className="text-section text-foreground-tertiary">
            {PROJECT_TYPE_LABELS[project.projectType] ?? project.projectType}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'estimatedCost',
    header: 'Value',
    cell: ({ row }) => {
      const val = row.original.estimatedCost;
      if (val == null) return <span className="text-foreground-tertiary text-sm">-</span>;
      return <span className="text-sm font-medium text-foreground">{formatCurrency(val)}</span>;
    },
  },
  {
    accessorKey: 'currentPhase',
    header: 'Phase',
    enableSorting: false,
    cell: ({ row }) => {
      const phase = row.original.currentPhase;
      if (!phase) return <span className="text-foreground-tertiary text-sm">-</span>;
      return (
        <Badge variant="info" size="xs">
          {PHASE_LABELS[phase] ?? phase}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={PROJECT_STATUS_BADGE_VARIANT[status] as 'default'} size="xs">
          {PROJECT_STATUS_LABELS[status] ?? status}
        </Badge>
      );
    },
  },
  {
    id: 'team',
    header: 'Team',
    cell: ({ row }) => <TeamAvatarGroup members={row.original.teamMembers} max={3} size="xs" />,
  },
  {
    accessorKey: 'endDate',
    header: 'Due Date',
    cell: ({ row }) => {
      const project = row.original;
      if (project.status === ProjectStatus.ON_HOLD) {
        return <span className="text-sm text-foreground-secondary">On Hold</span>;
      }
      if (!project.endDate) return <span className="text-sm text-foreground-tertiary">-</span>;
      const relative = formatRelativeDate(project.endDate);
      const isOverdue = relative.startsWith('Overdue');
      return (
        <span
          className={`text-sm ${isOverdue ? 'text-error font-medium' : 'text-foreground-secondary'}`}
        >
          {isOverdue ? relative : formatDate(project.endDate, 'short')}
        </span>
      );
    },
  },
  {
    id: 'payment',
    header: 'Payment',
    cell: ({ row }) => {
      const { totalExpected, totalPaid } = row.original.paymentSummary;
      if (totalExpected === 0) return <span className="text-foreground-tertiary text-sm">-</span>;
      if (totalPaid >= totalExpected) {
        return <span className="text-sm font-medium text-success">{'\u2713'} Paid</span>;
      }
      const pending = totalExpected - totalPaid;
      return (
        <span className="text-sm font-medium text-warning">{formatCurrencyCompact(pending)}</span>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const project = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Project actions">
              <MoreVertical className="size-4 text-foreground-tertiary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id })}>
                View Details
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
