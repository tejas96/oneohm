'use client';

import { SiteVisitStatus, VisitType, VisitPriority } from '@oneohm-epc/shared/types';
import { ColumnDef } from '@tanstack/react-table';
import {
  Calendar,
  Plus,
  MoreHorizontal,
  Eye,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { DataTable, FilterTabs, EmptyState, StatsCard, TablePagination } from '@/components/shared';
import {
  Badge,
  Button,
  Input,
  Typography,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDebounce } from '@/lib/hooks';

// ============================================================================
// Types
// ============================================================================

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 550;

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

function getValidStatus(value: string | null): 'all' | SiteVisitStatus {
  if (!value || value === 'all') return 'all';
  if (value === SiteVisitStatus.PENDING.toString()) return SiteVisitStatus.PENDING;
  if (value === SiteVisitStatus.IN_PROGRESS.toString()) return SiteVisitStatus.IN_PROGRESS;
  if (value === SiteVisitStatus.COMPLETED.toString()) return SiteVisitStatus.COMPLETED;
  return 'all';
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

// TODO: Phase 2 - Use for priority badges
const PRIORITY_VARIANTS: Record<VisitPriority, 'error' | 'warning' | 'muted'> = {
  [VisitPriority.HIGH]: 'error',
  [VisitPriority.NORMAL]: 'warning',
  [VisitPriority.LOW]: 'muted',
};
void PRIORITY_VARIANTS;

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
  const searchParams = useSearchParams();

  const initialPage = Number(searchParams.get('page')) || 1;
  const initialLimit = Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE;
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = getValidStatus(searchParams.get('status'));

  const [page, setPage] = React.useState(initialPage);
  const [pageSize, setPageSize] = React.useState(initialLimit);
  const [searchInput, setSearchInput] = React.useState(initialSearch);
  const [statusFilter, setStatusFilter] = React.useState<'all' | SiteVisitStatus>(initialStatus);

  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);

  const searchParamsString = searchParams.toString();
  React.useEffect(() => {
    setPage(Number(searchParams.get('page')) || 1);
    setPageSize(Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE);
    setSearchInput(searchParams.get('search') || '');
    setStatusFilter(getValidStatus(searchParams.get('status')));
  }, [searchParamsString]);

  const isInitialMount = React.useRef(true);
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage(1);
  }, [debouncedSearch, statusFilter, pageSize]);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set('limit', String(pageSize));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter !== 'all') params.set('status', statusFilter);

    const query = params.toString();
    const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [page, pageSize, debouncedSearch, statusFilter]);

  // Calculate counts
  const counts = {
    all: mockSiteVisits.length,
    pending: mockSiteVisits.filter((v) => v.status === SiteVisitStatus.PENDING).length,
    inProgress: mockSiteVisits.filter((v) => v.status === SiteVisitStatus.IN_PROGRESS).length,
    completed: mockSiteVisits.filter((v) => v.status === SiteVisitStatus.COMPLETED).length,
  };

  // Filter tabs
  const filterTabs = [
    { id: 'all' as const, label: 'All', count: counts.all },
    { id: SiteVisitStatus.PENDING, label: 'Pending', count: counts.pending },
    { id: SiteVisitStatus.IN_PROGRESS, label: 'In Progress', count: counts.inProgress },
    { id: SiteVisitStatus.COMPLETED, label: 'Completed', count: counts.completed },
  ];

  const normalizedSearch = debouncedSearch.trim().toLowerCase();

  // Filtered data
  const filteredVisits = mockSiteVisits.filter((visit) => {
    const matchesStatus = statusFilter === 'all' ? true : visit.status === statusFilter;
    if (!matchesStatus) return false;

    if (!normalizedSearch) return true;

    return (
      visit.propertyName.toLowerCase().includes(normalizedSearch) ||
      visit.customerName.toLowerCase().includes(normalizedSearch) ||
      visit.technicianName.toLowerCase().includes(normalizedSearch) ||
      visit.address.toLowerCase().includes(normalizedSearch)
    );
  });

  const totalItems = filteredVisits.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedVisits = filteredVisits.slice(startIndex, startIndex + pageSize);

  // Table columns
  const columns: ColumnDef<SiteVisit>[] = [
    {
      accessorKey: 'propertyName',
      header: 'Property',
      cell: ({ row }) => (
        <div>
          <Link
            href={buildRoute(ROUTES.SITE_VISITS.DETAIL, { id: row.original.id })}
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
      enableSorting: false,
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
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm">{VISIT_TYPE_LABELS[row.original.visitType]}</span>
      ),
    },
    {
      accessorKey: 'technicianName',
      header: 'Technician',
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm">{row.original.technicianName}</span>,
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
              {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{' '}
              {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANTS[row.original.status]}>{row.original.status}</Badge>
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
            <DropdownMenuItem
              onClick={() =>
                router.push(buildRoute(ROUTES.SITE_VISITS.DETAIL, { id: row.original.id }))
              }
            >
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
          <Typography variant="body" color="muted" className="mt-1">
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

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search site visits..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            leftIcon={<Search className="size-icon-sm" />}
            className="h-8 text-sm"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
            >
              <X className="size-3.5 text-foreground-tertiary" />
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      {filteredVisits.length > 0 ? (
        <>
          <DataTable
            columns={columns}
            data={pagedVisits}
            enableSearch={false}
            enablePagination={false}
          />
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            itemLabel="visits"
            variant="full"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
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
