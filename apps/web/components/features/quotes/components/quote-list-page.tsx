'use client';

import { QuoteStatus } from '@oneohm-epc/shared-types';
import { ColumnDef } from '@tanstack/react-table';
import { FileText, Plus, MoreHorizontal, Eye, Send, Copy, Download, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { DataTable, FilterTabs, StatsCard, EmptyState } from '@/components/shared';
import {
  Badge,
  Button,
  Typography,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  showToast,
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';

// ============================================================================
// Types
// ============================================================================

interface Quote {
  id: string;
  quoteNumber: string;
  propertyId: string;
  propertyName: string;
  customerName: string;
  customerId: string;
  systemSize: string;
  totalPrice: number;
  effectivePrice: number;
  status: QuoteStatus;
  createdAt: string;
  validUntil: string;
  version: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockQuotes: Quote[] = [
  {
    id: 'q1',
    quoteNumber: 'QT-2024-001',
    propertyId: 'p1',
    propertyName: 'Main Residence',
    customerName: 'Rajesh Sharma',
    customerId: '1',
    systemSize: '5 kW',
    totalPrice: 350000,
    effectivePrice: 297500,
    status: QuoteStatus.SENT,
    createdAt: '2024-02-10T10:00:00Z',
    validUntil: '2024-02-25T23:59:59Z',
    version: 2,
  },
  {
    id: 'q2',
    quoteNumber: 'QT-2024-002',
    propertyId: 'p2',
    propertyName: 'Office Building',
    customerName: 'Rajesh Sharma',
    customerId: '1',
    systemSize: '10 kW',
    totalPrice: 650000,
    effectivePrice: 585000,
    status: QuoteStatus.DRAFT,
    createdAt: '2024-02-12T14:00:00Z',
    validUntil: '2024-02-27T23:59:59Z',
    version: 1,
  },
  {
    id: 'q3',
    quoteNumber: 'QT-2024-003',
    propertyId: 'p3',
    propertyName: 'Farm House',
    customerName: 'Priya Kulkarni',
    customerId: '2',
    systemSize: '3 kW',
    totalPrice: 210000,
    effectivePrice: 178500,
    status: QuoteStatus.ACCEPTED,
    createdAt: '2024-02-05T09:00:00Z',
    validUntil: '2024-02-20T23:59:59Z',
    version: 1,
  },
  {
    id: 'q4',
    quoteNumber: 'QT-2024-004',
    propertyId: 'p4',
    propertyName: 'Industrial Unit',
    customerName: 'XYZ Manufacturing',
    customerId: '3',
    systemSize: '25 kW',
    totalPrice: 1500000,
    effectivePrice: 1350000,
    status: QuoteStatus.REJECTED,
    createdAt: '2024-02-01T11:00:00Z',
    validUntil: '2024-02-16T23:59:59Z',
    version: 3,
  },
];

// ============================================================================
// Badge Mappings
// ============================================================================

const STATUS_VARIANTS: Record<QuoteStatus, 'muted' | 'info' | 'success' | 'warning' | 'error' | 'pending'> = {
  [QuoteStatus.DRAFT]: 'muted',
  [QuoteStatus.SENT]: 'info',
  [QuoteStatus.VIEWED]: 'pending',
  [QuoteStatus.ACCEPTED]: 'success',
  [QuoteStatus.REJECTED]: 'error',
  [QuoteStatus.EXPIRED]: 'warning',
};

// ============================================================================
// Component
// ============================================================================

export function QuoteListPage(): React.JSX.Element {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = React.useState<'all' | QuoteStatus>('all');

  // Calculate counts
  const counts = {
    all: mockQuotes.length,
    draft: mockQuotes.filter(q => q.status === QuoteStatus.DRAFT).length,
    sent: mockQuotes.filter(q => q.status === QuoteStatus.SENT).length,
    accepted: mockQuotes.filter(q => q.status === QuoteStatus.ACCEPTED).length,
    rejected: mockQuotes.filter(q => q.status === QuoteStatus.REJECTED).length,
  };

  // Calculate stats
  const totalValue = mockQuotes.reduce((sum, q) => sum + q.effectivePrice, 0);
  const acceptedValue = mockQuotes.filter(q => q.status === QuoteStatus.ACCEPTED).reduce((sum, q) => sum + q.effectivePrice, 0);

  // Filter tabs
  const filterTabs = [
    { id: 'all' as const, label: 'All', count: counts.all },
    { id: QuoteStatus.DRAFT, label: 'Draft', count: counts.draft },
    { id: QuoteStatus.SENT, label: 'Sent', count: counts.sent },
    { id: QuoteStatus.ACCEPTED, label: 'Accepted', count: counts.accepted },
    { id: QuoteStatus.REJECTED, label: 'Rejected', count: counts.rejected },
  ];

  // Filtered data
  const filteredQuotes = statusFilter === 'all'
    ? mockQuotes
    : mockQuotes.filter(q => q.status === statusFilter);

  const handleDuplicate = (quote: Quote) => {
    console.log('Duplicate quote:', quote.id);
    showToast.success('Quote duplicated');
  };

  const handleDelete = (quote: Quote) => {
    console.log('Delete quote:', quote.id);
    showToast.success('Quote deleted');
  };

  // Table columns
  const columns: ColumnDef<Quote>[] = [
    {
      accessorKey: 'quoteNumber',
      header: 'Quote',
      cell: ({ row }) => (
        <div>
          <Link
            href={ROUTES.QUOTES.DETAIL.replace('[id]', row.original.id)}
            className="font-medium text-foreground hover:text-primary"
          >
            {row.original.quoteNumber}
          </Link>
          {row.original.version > 1 && (
            <p className="text-xs text-foreground-secondary">v{row.original.version}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <Link
            href={ROUTES.CUSTOMERS.DETAIL.replace('[id]', row.original.customerId)}
            className="text-sm text-foreground-secondary hover:text-primary"
          >
            {row.original.customerName}
          </Link>
          <p className="text-xs text-foreground-tertiary">{row.original.propertyName}</p>
        </div>
      ),
    },
    {
      accessorKey: 'systemSize',
      header: 'System',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.systemSize}</span>
      ),
    },
    {
      accessorKey: 'effectivePrice',
      header: 'Amount',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">₹{row.original.effectivePrice.toLocaleString()}</p>
          {row.original.effectivePrice < row.original.totalPrice && (
            <p className="text-xs text-foreground-tertiary line-through">
              ₹{row.original.totalPrice.toLocaleString()}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'validUntil',
      header: 'Valid Until',
      cell: ({ row }) => {
        const isExpired = new Date(row.original.validUntil) < new Date();
        return (
          <span className={`text-sm ${isExpired ? 'text-error' : 'text-foreground-secondary'}`}>
            {new Date(row.original.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
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
            <DropdownMenuItem onClick={() => router.push(ROUTES.QUOTES.DETAIL.replace('[id]', row.original.id))}>
              <Eye className="mr-2 size-icon-sm" />
              View Details
            </DropdownMenuItem>
            {row.original.status === QuoteStatus.DRAFT && (
              <DropdownMenuItem>
                <Send className="mr-2 size-icon-sm" />
                Send to Customer
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleDuplicate(row.original)}>
              <Copy className="mr-2 size-icon-sm" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 size-icon-sm" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDelete(row.original)} className="text-error">
              <Trash2 className="mr-2 size-icon-sm" />
              Delete
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
          <Typography variant="h2">Quotes</Typography>
          <Typography variant="body" color="muted" size="sm" className="mt-1">
            Manage and track quotations
          </Typography>
        </div>
        <Button size="sm" onClick={() => router.push(ROUTES.QUOTES.NEW)}>
          <Plus className="mr-2 size-icon-sm" />
          Create Quote
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          title="Total Quotes"
          value={counts.all}
          icon={<FileText className="size-icon text-primary" />}
        />
        <StatsCard
          title="Pipeline Value"
          value={`₹${(totalValue / 100000).toFixed(1)}L`}
          icon={<FileText className="size-icon text-info" />}
        />
        <StatsCard
          title="Accepted Value"
          value={`₹${(acceptedValue / 100000).toFixed(1)}L`}
          icon={<FileText className="size-icon text-success" />}
        />
        <StatsCard
          title="Conversion Rate"
          value={`${((counts.accepted / counts.all) * 100).toFixed(0)}%`}
          icon={<FileText className="size-icon text-warning" />}
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
      {filteredQuotes.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredQuotes}
          enableSearch
          searchPlaceholder="Search quotes..."
          enablePagination
          pageSize={10}
        />
      ) : (
        <EmptyState
          icon={<FileText className="size-icon-lg" />}
          title="No quotes found"
          description="Quotes will appear here once created"
          action={{
            label: 'Create Quote',
            onClick: () => router.push(ROUTES.QUOTES.NEW),
          }}
        />
      )}
    </div>
  );
}
