'use client';

import { SiteVisitStatus, VisitType, VisitPriority } from '@oneohm-epc/shared-types';
import { ColumnDef } from '@tanstack/react-table';
import { Calendar, Plus, MoreHorizontal, Eye, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { DataTable, FilterTabs, EmptyState, StatsCard } from '@/components/shared';
import {
  Badge,
  Button,
  Typography,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';

// ============================================================================
// Types
// ============================================================================

interface SiteVisit {
  id: string;
  propertyId: string;
  propertyName: string;
  customerName: string;
  technicianName: string;
  visitType: VisitType;
  status: SiteVisitStatus;
  priority: VisitPriority;
  scheduledAt: string;
  address: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockSiteVisits: SiteVisit[] = [
  {
    id: 'sv1',
    propertyId: 'p1',
    propertyName: 'Main Residence',
    customerName: 'Rajesh Sharma',
    technicianName: 'Amit Kumar',
    visitType: VisitType.INSPECTION,
    status: SiteVisitStatus.PENDING,
    priority: VisitPriority.HIGH,
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    address: '456 Green Valley, Pune',
  },
  {
    id: 'sv2',
    propertyId: 'p2',
    propertyName: 'Office Building',
    customerName: 'Rajesh Sharma',
    technicianName: 'Suresh Patil',
    visitType: VisitType.MEASUREMENT,
    status: SiteVisitStatus.COMPLETED,
    priority: VisitPriority.NORMAL,
    scheduledAt: new Date(Date.now() - 172800000).toISOString(),
    address: '789 Business Park, Pune',
  },
  {
    id: 'sv3',
    propertyId: 'p3',
    propertyName: 'Farm House',
    customerName: 'Priya Kulkarni',
    technicianName: 'Amit Kumar',
    visitType: VisitType.INSPECTION,
    status: SiteVisitStatus.IN_PROGRESS,
    priority: VisitPriority.NORMAL,
    scheduledAt: new Date().toISOString(),
    address: '123 Rural Road, Nashik',
  },
];

// ============================================================================
// Badge Mappings
// ============================================================================

const STATUS_VARIANTS: Record<SiteVisitStatus, 'warning' | 'info' | 'success'> = {
  [SiteVisitStatus.PENDING]: 'warning',
  [SiteVisitStatus.IN_PROGRESS]: 'info',
  [SiteVisitStatus.COMPLETED]: 'success',
};

// Reserved for future use
const _PRIORITY_VARIANTS: Record<VisitPriority, 'error' | 'warning' | 'muted'> = {
  [VisitPriority.HIGH]: 'error',
  [VisitPriority.NORMAL]: 'warning',
  [VisitPriority.LOW]: 'muted',
};
void _PRIORITY_VARIANTS; // Suppress unused warning

const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  [VisitType.INSPECTION]: 'Inspection',
  [VisitType.MEASUREMENT]: 'Measurement',
  [VisitType.INSTALLATION]: 'Installation',
  [VisitType.MAINTENANCE]: 'Maintenance',
  [VisitType.FOLLOWUP]: 'Follow-up',
};

// ============================================================================
// Component
// ============================================================================

export function SiteVisitListPage(): React.JSX.Element {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = React.useState<'all' | SiteVisitStatus>('all');

  // Calculate counts
  const counts = {
    all: mockSiteVisits.length,
    pending: mockSiteVisits.filter(v => v.status === SiteVisitStatus.PENDING).length,
    inProgress: mockSiteVisits.filter(v => v.status === SiteVisitStatus.IN_PROGRESS).length,
    completed: mockSiteVisits.filter(v => v.status === SiteVisitStatus.COMPLETED).length,
  };

  // Filter tabs
  const filterTabs = [
    { id: 'all' as const, label: 'All', count: counts.all },
    { id: SiteVisitStatus.PENDING, label: 'Pending', count: counts.pending },
    { id: SiteVisitStatus.IN_PROGRESS, label: 'In Progress', count: counts.inProgress },
    { id: SiteVisitStatus.COMPLETED, label: 'Completed', count: counts.completed },
  ];

  // Filtered data
  const filteredVisits = statusFilter === 'all'
    ? mockSiteVisits
    : mockSiteVisits.filter(v => v.status === statusFilter);

  // Table columns
  const columns: ColumnDef<SiteVisit>[] = [
    {
      accessorKey: 'propertyName',
      header: 'Property',
      cell: ({ row }) => (
        <div>
          <Link
            href={ROUTES.SITE_VISITS.DETAIL.replace('[id]', row.original.id)}
            className="font-medium text-foreground hover:text-primary"
          >
            {row.original.propertyName}
          </Link>
          <p className="text-xs text-foreground-secondary">{row.original.customerName}</p>
        </div>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Location',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="size-icon-sm text-foreground-tertiary" />
          <span className="text-sm text-foreground-secondary truncate max-w-[200px]">
            {row.original.address}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'visitType',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-sm">{VISIT_TYPE_LABELS[row.original.visitType]}</span>
      ),
    },
    {
      accessorKey: 'technicianName',
      header: 'Technician',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.technicianName}</span>
      ),
    },
    {
      accessorKey: 'scheduledAt',
      header: 'Scheduled',
      cell: ({ row }) => {
        const date = new Date(row.original.scheduledAt);
        return (
          <div className="flex items-center gap-2">
            <Clock className="size-icon-sm text-foreground-tertiary" />
            <span className="text-sm text-foreground-secondary">
              {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              {' '}
              {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANTS[row.original.status]}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="size-8 p-0">
              <MoreHorizontal className="size-icon-sm" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(ROUTES.SITE_VISITS.DETAIL.replace('[id]', row.original.id))}>
              <Eye className="mr-2 size-icon-sm" />
              View Report
            </DropdownMenuItem>
            {row.original.status === SiteVisitStatus.PENDING && (
              <>
                <DropdownMenuItem>
                  <CheckCircle className="mr-2 size-icon-sm" />
                  Start Visit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Calendar className="mr-2 size-icon-sm" />
                  Reschedule
                </DropdownMenuItem>
                <DropdownMenuItem className="text-error">
                  <XCircle className="mr-2 size-icon-sm" />
                  Cancel
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h2">Site Visits</Typography>
          <Typography variant="body" color="muted" size="sm" className="mt-1">
            Schedule and track site visits
          </Typography>
        </div>
        <Button size="sm" onClick={() => router.push(ROUTES.SITE_VISITS.NEW)}>
          <Plus className="mr-2 size-icon-sm" />
          Schedule Visit
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          title="Total Visits"
          value={counts.all}
          icon={<Calendar className="size-icon text-primary" />}
        />
        <StatsCard
          title="Pending"
          value={counts.pending}
          icon={<Clock className="size-icon text-warning" />}
        />
        <StatsCard
          title="In Progress"
          value={counts.inProgress}
          icon={<MapPin className="size-icon text-info" />}
        />
        <StatsCard
          title="Completed"
          value={counts.completed}
          icon={<CheckCircle className="size-icon text-success" />}
        />
      </div>

      {/* Filter Tabs */}
      <FilterTabs
        tabs={filterTabs}
        value={statusFilter}
        onChange={setStatusFilter}
        variant="pills"
      />

      {/* Data Table */}
      {filteredVisits.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredVisits}
          enableSearch
          searchPlaceholder="Search site visits..."
          enablePagination
          pageSize={10}
        />
      ) : (
        <EmptyState
          icon={<Calendar className="size-icon-lg" />}
          title="No site visits found"
          description="Site visits will appear here once scheduled"
          action={{
            label: 'Schedule Visit',
            onClick: () => router.push(ROUTES.SITE_VISITS.NEW),
          }}
        />
      )}
    </div>
  );
}
