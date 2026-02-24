'use client';

import { FollowupType, FollowupStatus, FollowupPriority } from '@oneohm-epc/shared-types';
import { ColumnDef } from '@tanstack/react-table';
import { Calendar, Plus, MoreHorizontal, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { DataTable, FilterTabs, EmptyState } from '@/components/shared';
import {
  Badge,
  Button,
  Typography,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  showToast,
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';

// ============================================================================
// Types
// ============================================================================

const DEFAULT_PAGE_SIZE = 10;

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
  const [activeTab, setActiveTab] = React.useState<FilterTab>('today');

  // Calculate counts
  const counts = {
    today: mockFollowups.filter(f => isToday(new Date(f.scheduledAt)) && f.status === FollowupStatus.PENDING).length,
    overdue: mockFollowups.filter(f => isOverdue(new Date(f.scheduledAt), f.status)).length,
    upcoming: mockFollowups.filter(f => isUpcoming(new Date(f.scheduledAt), f.status)).length,
    completed: mockFollowups.filter(f => f.status === FollowupStatus.COMPLETED).length,
  };

  // Filter tabs
  const filterTabs = [
    { id: 'today' as const, label: 'Today', count: counts.today, icon: <Clock className="size-icon-sm" /> },
    { id: 'overdue' as const, label: 'Overdue', count: counts.overdue, icon: <AlertTriangle className="size-icon-sm" /> },
    { id: 'upcoming' as const, label: 'Upcoming', count: counts.upcoming, icon: <Calendar className="size-icon-sm" /> },
    { id: 'completed' as const, label: 'Completed', count: counts.completed, icon: <CheckCircle className="size-icon-sm" /> },
  ];

  // Filtered data
  const filteredFollowups = mockFollowups.filter(f => {
    const date = new Date(f.scheduledAt);
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
  });

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
          <p className="text-xs text-foreground-secondary">
            {TYPE_LABELS[row.original.type]}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'propertyName',
      header: 'Property',
      cell: ({ row }) => (
        <div>
          <Link
            href={ROUTES.PROPERTIES.DETAIL.replace('[id]', row.original.propertyId)}
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
          <span className={`text-sm ${isOverdueItem ? 'text-error font-medium' : 'text-foreground-secondary'}`}>
            {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            {' '}
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
            <DropdownMenuItem onClick={() => router.push(ROUTES.FOLLOWUPS.EDIT.replace('[id]', row.original.id))}>
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
      <FilterTabs
        tabs={filterTabs}
        value={activeTab}
        onChange={setActiveTab}
        variant="pills"
      />

      {/* Data Table */}
      {filteredFollowups.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredFollowups}
          enableSearch
          searchPlaceholder="Search follow-ups..."
          enablePagination
          pageSize={DEFAULT_PAGE_SIZE}
          getRowClassName={(row) => {
            const date = new Date(row.scheduledAt);
            if (isOverdue(date, row.status)) {
              return 'bg-error/5 hover:bg-error/10';
            }
            return '';
          }}
        />
      ) : (
        <EmptyState
          icon={<Calendar className="size-icon-lg" />}
          title={`No ${activeTab} follow-ups`}
          description={activeTab === 'overdue' ? 'Great! You have no overdue tasks.' : 'Follow-ups will appear here once scheduled.'}
        />
      )}
    </div>
  );
}
