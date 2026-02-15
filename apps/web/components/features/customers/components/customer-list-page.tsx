'use client';

import { CustomerStatus, LeadSource } from '@oneohm-epc/shared-types';
import { ColumnDef } from '@tanstack/react-table';
import {
  Building2,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  Phone,
  Plus,
  Trash2,
  Upload,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { DeleteCustomerModal } from './delete-customer-modal';
import { EditCustomerModal } from './edit-customer-modal';
import { ImportCustomersModal } from './import-customers-modal';

import { DataTable, FilterTabs, EmptyState } from '@/components/shared';
import {
  Badge,
  Button,
  Typography,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import { cn } from '@/lib/utils';


// ============================================================================
// Types
// ============================================================================

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  status: CustomerStatus;
  propertyCount: number;
  city?: string;
  leadSource?: LeadSource;
  assignedTo?: string;
  lastActivity?: string;
  createdAt: string;
}

// ============================================================================
// Mock Data (Minimal - UI Focus)
// ============================================================================

const mockCustomers: Customer[] = [
  {
    id: '1',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    phone: '+919876543210',
    email: 'rajesh.sharma@email.com',
    status: CustomerStatus.ACTIVE,
    propertyCount: 2,
    city: 'Bangalore',
    leadSource: LeadSource.REFERRAL,
    assignedTo: 'Amit K.',
    lastActivity: 'Today, 2:30 PM',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    firstName: 'Priya',
    lastName: 'Kulkarni',
    phone: '+918765432109',
    email: 'priya.k@email.com',
    status: CustomerStatus.PROSPECT,
    propertyCount: 1,
    city: 'Pune',
    leadSource: LeadSource.WEBSITE,
    assignedTo: 'Sunita M.',
    lastActivity: 'Yesterday',
    createdAt: '2024-02-01',
  },
  {
    id: '3',
    firstName: 'Amit',
    lastName: 'Verma',
    phone: '+917654321098',
    email: 'amit.verma@email.com',
    status: CustomerStatus.LEAD,
    propertyCount: 3,
    city: 'Mumbai',
    leadSource: LeadSource.WALK_IN,
    assignedTo: 'Ravi K.',
    lastActivity: 'Jan 25',
    createdAt: '2024-02-10',
  },
  {
    id: '4',
    firstName: 'Sneha',
    lastName: 'Gupta',
    phone: '+916543210987',
    email: 'sneha.g@email.com',
    status: CustomerStatus.ACTIVE,
    propertyCount: 1,
    city: 'Delhi',
    leadSource: LeadSource.SOCIAL_MEDIA,
    assignedTo: 'Amit K.',
    lastActivity: 'Jan 28',
    createdAt: '2024-01-20',
  },
  {
    id: '5',
    firstName: 'Mukesh',
    lastName: 'Kumar',
    phone: '+915432109876',
    email: 'mukesh.k@email.com',
    status: CustomerStatus.INACTIVE,
    propertyCount: 0,
    city: 'Chennai',
    leadSource: LeadSource.REFERRAL,
    assignedTo: 'Sunita M.',
    lastActivity: 'Jan 10',
    createdAt: '2023-11-20',
  },
];

// ============================================================================
// Badge Mappings
// ============================================================================

const STATUS_BADGE_VARIANTS: Record<CustomerStatus, 'success' | 'warning' | 'info' | 'muted'> = {
  [CustomerStatus.ACTIVE]: 'success',
  [CustomerStatus.LEAD]: 'info',
  [CustomerStatus.PROSPECT]: 'warning',
  [CustomerStatus.INACTIVE]: 'muted',
};

const STATUS_LABELS: Record<CustomerStatus, string> = {
  [CustomerStatus.ACTIVE]: 'Active',
  [CustomerStatus.LEAD]: 'Lead',
  [CustomerStatus.PROSPECT]: 'Prospect',
  [CustomerStatus.INACTIVE]: 'Inactive',
};

const LEAD_SOURCE_COLORS: Record<LeadSource, string> = {
  [LeadSource.REFERRAL]: 'bg-pink-50 text-pink-700',
  [LeadSource.WEBSITE]: 'bg-purple-50 text-purple-700',
  [LeadSource.WALK_IN]: 'bg-emerald-50 text-emerald-700',
  [LeadSource.SOCIAL_MEDIA]: 'bg-orange-50 text-orange-700',
  [LeadSource.RESELLER]: 'bg-blue-50 text-blue-700',
  [LeadSource.ADVERTISEMENT]: 'bg-indigo-50 text-indigo-700',
  [LeadSource.EXHIBITION]: 'bg-cyan-50 text-cyan-700',
  [LeadSource.COLD_CALL]: 'bg-slate-50 text-slate-700',
  [LeadSource.OTHER]: 'bg-muted text-foreground-secondary',
};

const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  [LeadSource.REFERRAL]: 'Referral',
  [LeadSource.WEBSITE]: 'Website',
  [LeadSource.WALK_IN]: 'Walk-in',
  [LeadSource.SOCIAL_MEDIA]: 'Social Media',
  [LeadSource.RESELLER]: 'Reseller',
  [LeadSource.ADVERTISEMENT]: 'Advertisement',
  [LeadSource.EXHIBITION]: 'Exhibition',
  [LeadSource.COLD_CALL]: 'Cold Call',
  [LeadSource.OTHER]: 'Other',
};

// ============================================================================
// Helper Functions
// ============================================================================

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatPhoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, '');
}

// ============================================================================
// Component
// ============================================================================

export function CustomerListPage(): React.JSX.Element {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = React.useState<'all' | CustomerStatus>('all');
  const [sourceFilter, setSourceFilter] = React.useState<'all' | LeadSource>('all');
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [selectedRows, setSelectedRows] = React.useState<Customer[]>([]);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [importModalOpen, setImportModalOpen] = React.useState(false);

  // Filter tabs - includes Prospect per UX
  const filterTabs = [
    { id: 'all' as const, label: 'All', count: mockCustomers.length },
    { id: CustomerStatus.LEAD, label: 'Lead', count: mockCustomers.filter(c => c.status === CustomerStatus.LEAD).length },
    { id: CustomerStatus.PROSPECT, label: 'Prospect', count: mockCustomers.filter(c => c.status === CustomerStatus.PROSPECT).length },
    { id: CustomerStatus.ACTIVE, label: 'Active', count: mockCustomers.filter(c => c.status === CustomerStatus.ACTIVE).length },
    { id: CustomerStatus.INACTIVE, label: 'Inactive', count: mockCustomers.filter(c => c.status === CustomerStatus.INACTIVE).length },
  ];

  // Apply filters
  const filteredCustomers = mockCustomers.filter(c => {
    const statusMatch = statusFilter === 'all' || c.status === statusFilter;
    const sourceMatch = sourceFilter === 'all' || c.leadSource === sourceFilter;
    return statusMatch && sourceMatch;
  });

  // Handle row selection - memoized to prevent infinite loop in DataTable's useEffect
  const handleRowSelectionChange = React.useCallback((rows: Customer[]) => {
    setSelectedRows(rows);
  }, []);

  // Clear selection
  const clearSelection = () => {
    setSelectedRows([]);
  };

  // Table columns matching UX spec
  const columns: ColumnDef<Customer>[] = [
    // Customer column with avatar, name, email, property count
    {
      accessorKey: 'name',
      header: 'Customer',
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => {
        const customer = row.original;
        const initials = getInitials(customer.firstName, customer.lastName);
        
        return (
          <Link
            href={ROUTES.CUSTOMERS.DETAIL.replace('[id]', customer.id)}
            className="flex items-center gap-2.5 hover:text-primary transition-colors"
          >
            {/* Avatar */}
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-foreground leading-tight">
                {customer.firstName} {customer.lastName}
              </div>
              <div className="text-foreground-tertiary text-[11px] flex items-center gap-1.5 leading-tight mt-0.5">
                <span className="truncate">{customer.email || '-'}</span>
                <span className="inline-flex items-center gap-0.5 shrink-0">
                  <Building2 className="size-3" />
                  {customer.propertyCount}
                </span>
              </div>
            </div>
          </Link>
        );
      },
    },
    
    // Contact column with phone/WhatsApp icons
    {
      accessorKey: 'contact',
      header: 'Contact',
      cell: ({ row }) => {
        const phone = row.original.phone;
        const whatsappNumber = formatPhoneForWhatsApp(phone);
        
        return (
          <div className="flex items-center gap-1">
            <a
              href={`tel:${phone}`}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              title="Call"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="size-icon-sm text-foreground-secondary" />
            </a>
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-success/10 rounded-lg transition-colors"
              title="WhatsApp"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="size-icon-sm text-success" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </div>
        );
      },
    },
    
    // City column
    {
      accessorKey: 'city',
      header: 'City',
      cell: ({ row }) => (
        <span className="text-foreground-secondary">{row.original.city || '-'}</span>
      ),
    },
    
    // Lead Source column with colored badges
    {
      accessorKey: 'leadSource',
      header: 'Lead Source',
      cell: ({ row }) => {
        const source = row.original.leadSource;
        if (!source) return <span className="text-foreground-tertiary">-</span>;
        
        return (
          <span className={cn(
            'px-1.5 py-0.5 text-[11px] font-medium rounded',
            LEAD_SOURCE_COLORS[source]
          )}>
            {LEAD_SOURCE_LABELS[source]}
          </span>
        );
      },
    },
    
    // Assigned To column
    {
      accessorKey: 'assignedTo',
      header: 'Assigned To',
      cell: ({ row }) => (
        <span className="text-foreground-secondary">{row.original.assignedTo || '-'}</span>
      ),
    },
    
    // Status column
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_BADGE_VARIANTS[row.original.status]} size="xs">
          {STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    
    // Last Activity column
    {
      accessorKey: 'lastActivity',
      header: 'Last Activity',
      cell: ({ row }) => (
        <span className="text-foreground-tertiary text-[11px]">
          {row.original.lastActivity || '-'}
        </span>
      ),
    },
    
    // Actions column
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="size-8 p-0">
              <MoreHorizontal className="size-icon-sm" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(ROUTES.CUSTOMERS.DETAIL.replace('[id]', row.original.id))}>
              <Eye className="mr-2 size-icon-sm" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSelectedCustomer(row.original);
              setEditModalOpen(true);
            }}>
              <Edit className="mr-2 size-icon-sm" />
              Edit Customer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(ROUTES.CUSTOMERS.ADD_PROPERTY.replace('[id]', row.original.id))}>
              <Plus className="mr-2 size-icon-sm" />
              Add Property
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedCustomer(row.original);
                setDeleteModalOpen(true);
              }}
              className="text-error"
            >
              <Trash2 className="mr-2 size-icon-sm" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <Typography variant="h2">All Customers</Typography>
          <Typography variant="body" color="muted" size="sm" className="mt-0.5">
            Manage your customers and track their journey
          </Typography>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
            <Upload className="mr-2 size-icon-sm" />
            Import
          </Button>
          
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 size-icon-sm" />
                Export
                <ChevronDown className="ml-2 size-icon-xs" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem>Export as Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button size="sm" onClick={() => router.push(ROUTES.CUSTOMERS.NEW)}>
            <Plus className="mr-2 size-icon-sm" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-lg border border-border-light">
        <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Status Tabs */}
          <FilterTabs
            tabs={filterTabs}
            value={statusFilter}
            onChange={setStatusFilter}
            variant="pills"
          />
          
          {/* Lead Source Filter */}
          <Select
            value={sourceFilter}
            onValueChange={(value) => setSourceFilter(value as 'all' | LeadSource)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions Bar - shown when items selected */}
        {selectedRows.length > 0 && (
          <div className="px-4 py-2 bg-primary/5 border-t border-border-light flex items-center gap-4">
            <span className="text-sm text-foreground-secondary">
              <strong className="text-foreground">{selectedRows.length}</strong> selected
            </span>
            <Button variant="ghost" size="sm" className="text-foreground-secondary">
              Change Status
            </Button>
            <Button variant="ghost" size="sm" className="text-foreground-secondary">
              Export Selected
            </Button>
            <Button variant="ghost" size="sm" className="text-error">
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-foreground-secondary"
              onClick={clearSelection}
            >
              Clear selection
            </Button>
          </div>
        )}
      </div>

      {/* Data Table */}
      {filteredCustomers.length > 0 ? (
        <div className="bg-white rounded-lg border border-border-light overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredCustomers}
            enableSearch
            searchPlaceholder="Search by name, phone, email..."
            enablePagination
            pageSize={10}
            enableRowSelection
            onRowSelectionChange={handleRowSelectionChange}
          />
        </div>
      ) : (
        <EmptyState
          title="No customers found"
          description="Get started by adding your first customer"
          action={{
            label: 'Add Customer',
            onClick: () => router.push(ROUTES.CUSTOMERS.NEW),
          }}
        />
      )}

      {/* Modals */}
      <EditCustomerModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        customer={selectedCustomer}
      />

      <DeleteCustomerModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        customer={selectedCustomer}
      />

      <ImportCustomersModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
      />
    </div>
  );
}
