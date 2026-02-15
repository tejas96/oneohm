'use client';

import { LeadTemperature, PropertyType } from '@oneohm-epc/shared-types';
import { ColumnDef } from '@tanstack/react-table';
import {
  Building2,
  Plus,
  Calendar,
  FileText,
  MoreHorizontal,
  Eye,
  AlertCircle,
  Phone,
  Edit,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { MarkAsLostModal } from './mark-as-lost-modal';

import { DataTable, EmptyState } from '@/components/shared';
import {
  Button,
  Typography,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import { cn } from '@/lib/utils';


// ============================================================================
// Types
// ============================================================================

interface Property {
  id: string;
  propertyName: string;
  address: string;
  ownerName: string;
  customerId: string;
  propertyType: PropertyType;
  leadTemperature: LeadTemperature;
  phone: string;
  consumerNo: string;
  quoteStatus: 'None' | 'Draft' | 'Sent' | 'Pending' | 'Accepted';
  quotePendingDays?: number;
  assignedTo: string;
  followupCount: number;
  nextFollowup?: string;
}

// ============================================================================
// Mock Data - Matches UX Reference
// ============================================================================

const mockProperties: Property[] = [
  {
    id: 'p1',
    propertyName: 'Koramangala Residence',
    address: '456, 5th Block',
    ownerName: 'Rajesh Sharma',
    customerId: '1',
    propertyType: PropertyType.RESIDENTIAL,
    leadTemperature: LeadTemperature.HOT,
    phone: '+919876543210',
    consumerNo: 'BNG-2024-12345',
    quoteStatus: 'Sent',
    quotePendingDays: 8,
    assignedTo: 'Amit K.',
    followupCount: 2,
    nextFollowup: 'Tomorrow',
  },
  {
    id: 'p2',
    propertyName: 'Jayanagar Villa',
    address: '234, 4th Block',
    ownerName: 'Priya Kulkarni',
    customerId: '2',
    propertyType: PropertyType.RESIDENTIAL,
    leadTemperature: LeadTemperature.HOT,
    phone: '+918765432109',
    consumerNo: 'BNG-2024-12346',
    quoteStatus: 'Accepted',
    assignedTo: 'Sunita M.',
    followupCount: 1,
    nextFollowup: 'Today',
  },
  {
    id: 'p3',
    propertyName: 'HSR Layout Office',
    address: '789, Sector 4',
    ownerName: 'Amit Verma',
    customerId: '3',
    propertyType: PropertyType.COMMERCIAL,
    leadTemperature: LeadTemperature.WARM,
    phone: '+917654321098',
    consumerNo: 'BNG-2024-12347',
    quoteStatus: 'Draft',
    assignedTo: 'Ravi K.',
    followupCount: 0,
  },
  {
    id: 'p4',
    propertyName: 'Whitefield Factory',
    address: '101, EPIP Zone',
    ownerName: 'Sneha Gupta',
    customerId: '4',
    propertyType: PropertyType.INDUSTRIAL,
    leadTemperature: LeadTemperature.WARM,
    phone: '+916543210987',
    consumerNo: 'DEL-2024-12348',
    quoteStatus: 'Pending',
    quotePendingDays: 15,
    assignedTo: 'Amit K.',
    followupCount: 3,
    nextFollowup: 'Jan 30',
  },
  {
    id: 'p5',
    propertyName: 'Indiranagar Apartment',
    address: '678, 12th Main',
    ownerName: 'Mukesh Kumar',
    customerId: '5',
    propertyType: PropertyType.RESIDENTIAL,
    leadTemperature: LeadTemperature.COLD,
    phone: '+915432109876',
    consumerNo: 'CHN-2024-12349',
    quoteStatus: 'None',
    assignedTo: 'Sunita M.',
    followupCount: 0,
  },
];

// ============================================================================
// Constants & Mappings
// ============================================================================

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.RESIDENTIAL]: 'Residential',
  [PropertyType.RESIDENTIAL_APARTMENT]: 'Apartment',
  [PropertyType.COMMERCIAL]: 'Commercial',
  [PropertyType.INDUSTRIAL]: 'Industrial',
  [PropertyType.AGRICULTURAL]: 'Agricultural',
  [PropertyType.INSTITUTIONAL]: 'Institutional',
};

const QUOTE_STATUS_COLORS: Record<string, string> = {
  Sent: 'bg-info/10 text-info',
  Accepted: 'bg-success/10 text-success',
  Draft: 'bg-muted text-foreground-secondary',
  Pending: 'bg-warning/10 text-warning',
  None: 'bg-muted text-foreground-tertiary',
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatPhoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, '');
}

// ============================================================================
// Component
// ============================================================================

export function PropertyListPage(): React.JSX.Element {
  const router = useRouter();
  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null);
  const [lostModalOpen, setLostModalOpen] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState<Property[]>([]);

  // Handle row selection
  const handleRowSelectionChange = React.useCallback((rows: Property[]) => {
    setSelectedRows(rows);
  }, []);

  // Clear selection
  const clearSelection = () => {
    setSelectedRows([]);
  };

  // Table columns - matches UX reference (properties.html)
  const columns: ColumnDef<Property>[] = [
    // Property column: name + temp dot, address • owner • type
    {
      accessorKey: 'propertyName',
      header: 'Property',
      cell: ({ row }) => {
        const property = row.original;
        return (
          <Link
            href={ROUTES.PROPERTIES.DETAIL.replace('[id]', property.id)}
            className="block hover:text-primary transition-colors"
          >
            {/* Line 1: Property name + temperature dot */}
            <div className="flex items-center gap-2 leading-tight">
              <span className="font-medium text-foreground">{property.propertyName}</span>
              <span
                className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  property.leadTemperature === LeadTemperature.HOT && 'bg-error',
                  property.leadTemperature === LeadTemperature.WARM && 'bg-warning',
                  property.leadTemperature === LeadTemperature.COLD && 'bg-info'
                )}
                title={`${property.leadTemperature} Lead`}
              />
            </div>
            {/* Line 2: Address • Owner • Type */}
            <div className="text-foreground-tertiary text-[11px] leading-tight mt-0.5">
              {property.address} • {property.ownerName} • {PROPERTY_TYPE_LABELS[property.propertyType]}
            </div>
          </Link>
        );
      },
    },

    // Contact column with phone/WhatsApp icons
    {
      accessorKey: 'contact',
      header: 'Contact',
      enableSorting: false,
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

    // Consumer No. column - mono font
    {
      accessorKey: 'consumerNo',
      header: 'Consumer No.',
      cell: ({ row }) => (
        <span className="text-[11px] font-mono text-foreground-secondary">
          {row.original.consumerNo}
        </span>
      ),
    },

    // Quote Status column with badge + pending days
    {
      accessorKey: 'quoteStatus',
      header: 'Quote Status',
      cell: ({ row }) => {
        const status = row.original.quoteStatus;
        const pendingDays = row.original.quotePendingDays;

        return (
          <div className="flex items-center gap-1">
            <span className={cn(
              'px-1.5 py-0.5 text-[11px] font-medium rounded',
              QUOTE_STATUS_COLORS[status]
            )}>
              {status}
            </span>
            {pendingDays && (
              <span className="text-[10px] text-foreground-tertiary">{pendingDays}d</span>
            )}
          </div>
        );
      },
    },

    // Assigned To column
    {
      accessorKey: 'assignedTo',
      header: 'Assigned To',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-foreground-secondary">{row.original.assignedTo}</span>
      ),
    },

    // Followups column
    {
      accessorKey: 'followupCount',
      header: 'Followups',
      enableSorting: false,
      cell: ({ row }) => {
        const count = row.original.followupCount;
        const nextFollowup = row.original.nextFollowup;

        if (count === 0) {
          return <span className="text-foreground-tertiary text-[11px]">No followups</span>;
        }

        return (
          <span className="text-[11px]">
            {count} pending{nextFollowup && ` • ${nextFollowup}`}
          </span>
        );
      },
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
            <DropdownMenuItem onClick={() => router.push(ROUTES.PROPERTIES.DETAIL.replace('[id]', row.original.id))}>
              <Eye className="mr-2 size-icon-sm" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 size-icon-sm" />
              Edit Property
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`${ROUTES.QUOTES.NEW}?propertyId=${row.original.id}`)}>
              <FileText className="mr-2 size-icon-sm" />
              Create Quote
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`${ROUTES.SITE_VISITS.NEW}?propertyId=${row.original.id}`)}>
              <Calendar className="mr-2 size-icon-sm" />
              Schedule Followup
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedProperty(row.original);
                setLostModalOpen(true);
              }}
              className="text-error"
            >
              <AlertCircle className="mr-2 size-icon-sm" />
              Mark as Lost
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
          <Typography variant="h2">All Properties</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Track properties and their lead status
          </Typography>
        </div>
        <Button size="sm" onClick={() => router.push(ROUTES.CUSTOMERS.NEW)}>
          <Plus className="mr-2 size-icon-sm" />
          Add Property
        </Button>
      </div>

      {/* Data Table - wrapped in container like customer table */}
      {mockProperties.length > 0 ? (
        <div className="bg-white rounded-lg border border-border-light overflow-hidden">
          {/* Bulk Actions Bar - shown when items selected */}
          {selectedRows.length > 0 && (
            <div className="px-4 py-2 bg-primary/5 border-b border-border-light flex items-center gap-4">
              <span className="text-sm text-foreground-secondary">
                <strong className="text-foreground">{selectedRows.length}</strong> selected
              </span>
              <Button variant="ghost" size="sm" className="text-foreground-secondary">
                Change Temperature
              </Button>
              <Button variant="ghost" size="sm" className="text-foreground-secondary">
                Assign
              </Button>
              <Button variant="ghost" size="sm" className="text-foreground-secondary">
                Export
              </Button>
              <Button variant="ghost" size="sm" className="text-error">
                Mark as Lost
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

          <DataTable
            columns={columns}
            data={mockProperties}
            enableSearch
            searchPlaceholder="Search by address, customer..."
            enablePagination
            pageSize={10}
            enableRowSelection
            onRowSelectionChange={handleRowSelectionChange}
          />
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="size-icon-lg" />}
          title="No properties found"
          description="Properties will appear here once customers add them"
        />
      )}

      {/* Mark as Lost Modal */}
      <MarkAsLostModal
        open={lostModalOpen}
        onOpenChange={setLostModalOpen}
        property={selectedProperty}
      />
    </div>
  );
}
