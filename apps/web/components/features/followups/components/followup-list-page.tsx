'use client';

import { FollowupType, FollowupStatus, FollowupPriority } from '@oneohm-epc/shared/types';
import { ColumnDef } from '@tanstack/react-table';
import {
  Calendar,
  Plus,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { DataTable, FilterTabs, EmptyState, TablePagination } from '@/components/shared';
import {
  Badge,
  Button,
  Input,
  Typography,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  showToast,
} from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDebounce } from '@/lib/hooks';

// ============================================================================
// Types
// ============================================================================

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 550;

interface Followup {
  id: string;
  propertyId: string;
  propertyName: string;
  customerName: string;
  type: FollowupType;
  subject: string;
  scheduledAt: string;
  status: FollowupStatus;
  priority: FollowupPriority;
}

type FilterTab = 'today' | 'overdue' | 'upcoming' | 'completed';

function getValidTab(value: string | null): FilterTab {
  if (value === 'today' || value === 'overdue' || value === 'upcoming' || value === 'completed') {
    return value;
  }
  return 'today';
}

// ============================================================================
// Mock Data
// ============================================================================

const today = new Date();
const mockFollowups: Followup[] = [
  {
    id: 'f1',
    propertyId: 'p1',
    propertyName: 'Main Residence',
    customerName: 'Rajesh Sharma',
    type: FollowupType.MEETING,
    subject: 'Discuss quote pricing',
    scheduledAt: new Date(today.setHours(10, 0, 0, 0)).toISOString(),
    status: FollowupStatus.PENDING,
    priority: FollowupPriority.HIGH,
  },
  {
    id: 'f2',
    propertyId: 'p2',
    propertyName: 'Office Building',
    customerName: 'Rajesh Sharma',
    type: FollowupType.DOCUMENT_COLLECTION,
    subject: 'Collect electricity bill',
    scheduledAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    status: FollowupStatus.PENDING,
    priority: FollowupPriority.HIGH,
  },
  {
    id: 'f3',
    propertyId: 'p3',
    propertyName: 'Farm House',
    customerName: 'Priya Kulkarni',
    type: FollowupType.VISIT,
    subject: 'Site inspection',
    scheduledAt: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    status: FollowupStatus.PENDING,
    priority: FollowupPriority.NORMAL,
  },
  {
    id: 'f4',
    propertyId: 'p1',
    propertyName: 'Main Residence',
    customerName: 'Rajesh Sharma',
    type: FollowupType.TASK,
    subject: 'Initial consultation',
    scheduledAt: new Date(Date.now() - 604800000).toISOString(), // Week ago
    status: FollowupStatus.COMPLETED,
    priority: FollowupPriority.NORMAL,
  },
];

// ============================================================================
// Badge Mappings
// ============================================================================

const TYPE_LABELS: Record<FollowupType, string> = {
  [FollowupType.VISIT]: 'Site Visit',
  [FollowupType.MEETING]: 'Meeting',
  [FollowupType.TASK]: 'Task',
  [FollowupType.REMINDER]: 'Reminder',
  [FollowupType.DOCUMENT_COLLECTION]: 'Document Collection',
};

const PRIORITY_VARIANTS: Record<FollowupPriority, 'error' | 'warning' | 'muted'> = {
  [FollowupPriority.HIGH]: 'error',
  [FollowupPriority.NORMAL]: 'warning',
  [FollowupPriority.LOW]: 'muted',
};

// ============================================================================
// Helper Functions
// ============================================================================

const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const isOverdue = (date: Date, status: FollowupStatus): boolean => {
  return status === FollowupStatus.PENDING && date < new Date() && !isToday(date);
};

const isUpcoming = (date: Date, status: FollowupStatus): boolean => {
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  return status === FollowupStatus.PENDING && date > todayEnd;
};

// ============================================================================
// Component
// ============================================================================

export function FollowupListPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = Number(searchParams.get('page')) || 1;
  const initialLimit = Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE;
  const initialSearch = searchParams.get('search') || '';
  const initialTab = getValidTab(searchParams.get('tab'));

  const [page, setPage] = React.useState(initialPage);
  const [pageSize, setPageSize] = React.useState(initialLimit);
  const [searchInput, setSearchInput] = React.useState(initialSearch);
  const [activeTab, setActiveTab] = React.useState<FilterTab>(initialTab);

  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);

  const searchParamsString = searchParams.toString();
  React.useEffect(() => {
    setPage(Number(searchParams.get('page')) || 1);
    setPageSize(Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE);
    setSearchInput(searchParams.get('search') || '');
    setActiveTab(getValidTab(searchParams.get('tab')));
  }, [searchParamsString]);

  const isInitialMount = React.useRef(true);
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage(1);
  }, [debouncedSearch, activeTab, pageSize]);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set('limit', String(pageSize));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (activeTab !== 'today') params.set('tab', activeTab);

    const query = params.toString();
    const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [page, pageSize, debouncedSearch, activeTab]);

  // Calculate counts
  const counts = {
    today: mockFollowups.filter(
      (f) => isToday(new Date(f.scheduledAt)) && f.status === FollowupStatus.PENDING,
    ).length,
    overdue: mockFollowups.filter((f) => isOverdue(new Date(f.scheduledAt), f.status)).length,
    upcoming: mockFollowups.filter((f) => isUpcoming(new Date(f.scheduledAt), f.status)).length,
    completed: mockFollowups.filter((f) => f.status === FollowupStatus.COMPLETED).length,
  };

  // Filter tabs
  const filterTabs = [
    {
      id: 'today' as const,
      label: 'Today',
      count: counts.today,
      icon: <Clock className="size-icon-sm" />,
    },
    {
      id: 'overdue' as const,
      label: 'Overdue',
      count: counts.overdue,
      icon: <AlertTriangle className="size-icon-sm" />,
    },
    {
      id: 'upcoming' as const,
      label: 'Upcoming',
      count: counts.upcoming,
      icon: <Calendar className="size-icon-sm" />,
    },
    {
      id: 'completed' as const,
      label: 'Completed',
      count: counts.completed,
      icon: <CheckCircle className="size-icon-sm" />,
    },
  ];

  const normalizedSearch = debouncedSearch.trim().toLowerCase();

  // Filtered data
  const filteredFollowups = mockFollowups.filter((f) => {
    const date = new Date(f.scheduledAt);
    const matchesTab = (() => {
      switch (activeTab) {
        case 'today':
          return isToday(date) && f.status === FollowupStatus.PENDING;
        case 'overdue':
          return isOverdue(date, f.status);
        case 'upcoming':
          return isUpcoming(date, f.status);
        case 'completed':
          return f.status === FollowupStatus.COMPLETED;
        default:
          return true;
      }
    })();

    if (!matchesTab) return false;

    if (!normalizedSearch) return true;

    return (
      f.subject.toLowerCase().includes(normalizedSearch) ||
      f.propertyName.toLowerCase().includes(normalizedSearch) ||
      f.customerName.toLowerCase().includes(normalizedSearch)
    );
  });

  const totalItems = filteredFollowups.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedFollowups = filteredFollowups.slice(startIndex, startIndex + pageSize);

  const handleMarkComplete = (_followup: Followup) => {
    // TODO: Phase 2 - API call to mark followup as completed
    showToast.success('Follow-up marked as completed');
  };

  // Table columns
  const columns: ColumnDef<Followup>[] = [
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.subject}</p>
          <p className="text-xs text-foreground-secondary">{TYPE_LABELS[row.original.type]}</p>
        </div>
      ),
    },
    {
      accessorKey: 'propertyName',
      header: 'Property',
      cell: ({ row }) => (
        <div>
          <Link
            href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: row.original.propertyId })}
            className="text-sm font-medium text-foreground hover:text-primary"
          >
            {row.original.propertyName}
          </Link>
          <p className="text-xs text-foreground-secondary">{row.original.customerName}</p>
        </div>
      ),
    },
    {
      accessorKey: 'scheduledAt',
      header: 'Scheduled',
      cell: ({ row }) => {
        const date = new Date(row.original.scheduledAt);
        const isOverdueItem = isOverdue(date, row.original.status);
        return (
          <span
            className={`text-sm ${isOverdueItem ? 'text-error font-medium' : 'text-foreground-secondary'}`}
          >
            {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{' '}
            {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => (
        <Badge variant={PRIORITY_VARIANTS[row.original.priority]} size="xs">
          {row.original.priority}
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
            {row.original.status === FollowupStatus.PENDING && (
              <DropdownMenuItem onClick={() => handleMarkComplete(row.original)}>
                <CheckCircle className="mr-2 size-icon-sm" />
                Mark Complete
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() =>
                router.push(buildRoute(ROUTES.FOLLOWUPS.EDIT, { id: row.original.id }))
              }
            >
              <Calendar className="mr-2 size-icon-sm" />
              Reschedule
            </DropdownMenuItem>
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
          <Typography variant="h2">Follow-ups</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage your follow-up tasks
          </Typography>
        </div>
        <Button size="sm" onClick={() => router.push(ROUTES.FOLLOWUPS.NEW)}>
          <Plus className="mr-2 size-icon-sm" />
          Add Follow-up
        </Button>
      </div>

      {/* Filter Tabs */}
      <FilterTabs tabs={filterTabs} value={activeTab} onChange={setActiveTab} variant="pills" />

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search follow-ups..."
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
      {filteredFollowups.length > 0 ? (
        <>
          <DataTable
            columns={columns}
            data={pagedFollowups}
            enableSearch={false}
            enablePagination={false}
            getRowClassName={(row) => {
              const date = new Date(row.scheduledAt);
              if (isOverdue(date, row.status)) {
                return 'bg-error/5 hover:bg-error/10';
              }
              return '';
            }}
          />
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            itemLabel="follow-ups"
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
          title={`No ${activeTab} follow-ups`}
          description={
            activeTab === 'overdue'
              ? 'Great! You have no overdue tasks.'
              : 'Follow-ups will appear here once scheduled.'
          }
        />
      )}
    </div>
  );
}
