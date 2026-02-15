'use client';

import { LeadTemperature, PropertyType } from '@oneohm-epc/shared-types';
import { ColumnDef } from '@tanstack/react-table';
import { Building2, Plus, Calendar, FileText, MoreHorizontal, Eye, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { MarkAsLostModal } from './mark-as-lost-modal';

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
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';


// ============================================================================
// Types
// ============================================================================

interface Property {
  id: string;
  propertyName: string;
  customerName: string;
  customerId: string;
  address: string;
  city: string;
  propertyType: PropertyType;
  leadTemperature: LeadTemperature;
  wantsLoan: boolean;
  quoteStatus?: 'none' | 'draft' | 'sent' | 'accepted';
}

// ============================================================================
// Mock Data
// ============================================================================

const mockProperties: Property[] = [
  {
    id: 'p1',
    propertyName: 'Main Residence',
    customerName: 'Rajesh Sharma',
    customerId: '1',
    address: '456 Green Valley',
    city: 'Pune',
    propertyType: PropertyType.RESIDENTIAL,
    leadTemperature: LeadTemperature.HOT,
    wantsLoan: true,
    quoteStatus: 'sent',
  },
  {
    id: 'p2',
    propertyName: 'Office Building',
    customerName: 'Rajesh Sharma',
    customerId: '1',
    address: '789 Business Park',
    city: 'Pune',
    propertyType: PropertyType.COMMERCIAL,
    leadTemperature: LeadTemperature.WARM,
    wantsLoan: false,
    quoteStatus: 'draft',
  },
  {
    id: 'p3',
    propertyName: 'Farm House',
    customerName: 'Priya Kulkarni',
    customerId: '2',
    address: '123 Rural Road',
    city: 'Nashik',
    propertyType: PropertyType.RESIDENTIAL,
    leadTemperature: LeadTemperature.COLD,
    wantsLoan: false,
    quoteStatus: 'none',
  },
];

// ============================================================================
// Badge Mappings
// ============================================================================

const TEMPERATURE_VARIANTS: Record<LeadTemperature, 'hot' | 'warm' | 'cold'> = {
  [LeadTemperature.HOT]: 'hot',
  [LeadTemperature.WARM]: 'warm',
  [LeadTemperature.COLD]: 'cold',
};

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.RESIDENTIAL]: 'Residential',
  [PropertyType.RESIDENTIAL_APARTMENT]: 'Apartment',
  [PropertyType.COMMERCIAL]: 'Commercial',
  [PropertyType.INDUSTRIAL]: 'Industrial',
  [PropertyType.AGRICULTURAL]: 'Agricultural',
  [PropertyType.INSTITUTIONAL]: 'Institutional',
};

// ============================================================================
// Component
// ============================================================================

export function PropertyListPage(): React.JSX.Element {
  const router = useRouter();
  const [temperatureFilter, setTemperatureFilter] = React.useState<'all' | LeadTemperature>('all');
  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null);
  const [lostModalOpen, setLostModalOpen] = React.useState(false);

  // Filter tabs
  const filterTabs = [
    { id: 'all' as const, label: 'All', count: mockProperties.length },
    { id: LeadTemperature.HOT, label: 'Hot', count: mockProperties.filter(p => p.leadTemperature === LeadTemperature.HOT).length },
    { id: LeadTemperature.WARM, label: 'Warm', count: mockProperties.filter(p => p.leadTemperature === LeadTemperature.WARM).length },
    { id: LeadTemperature.COLD, label: 'Cold', count: mockProperties.filter(p => p.leadTemperature === LeadTemperature.COLD).length },
  ];

  // Filtered data
  const filteredProperties = temperatureFilter === 'all'
    ? mockProperties
    : mockProperties.filter(p => p.leadTemperature === temperatureFilter);

  // Table columns
  const columns: ColumnDef<Property>[] = [
    {
      accessorKey: 'propertyName',
      header: 'Property',
      cell: ({ row }) => (
        <div>
          <Link
            href={ROUTES.PROPERTIES.DETAIL.replace('[id]', row.original.id)}
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            {row.original.propertyName}
          </Link>
          <p className="text-xs text-foreground-secondary">
            {PROPERTY_TYPE_LABELS[row.original.propertyType]}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <Link
          href={ROUTES.CUSTOMERS.DETAIL.replace('[id]', row.original.customerId)}
          className="text-sm text-foreground-secondary hover:text-primary transition-colors"
        >
          {row.original.customerName}
        </Link>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Location',
      cell: ({ row }) => (
        <span className="text-sm text-foreground-secondary">
          {row.original.address}, {row.original.city}
        </span>
      ),
    },
    {
      accessorKey: 'leadTemperature',
      header: 'Temperature',
      cell: ({ row }) => (
        <Badge variant={TEMPERATURE_VARIANTS[row.original.leadTemperature]}>
          {row.original.leadTemperature}
        </Badge>
      ),
    },
    {
      accessorKey: 'wantsLoan',
      header: 'Loan',
      cell: ({ row }) => (
        row.original.wantsLoan ? (
          <Badge variant="info" size="xs">Interested</Badge>
        ) : (
          <span className="text-foreground-tertiary">-</span>
        )
      ),
    },
    {
      accessorKey: 'quoteStatus',
      header: 'Quote',
      cell: ({ row }) => {
        const status = row.original.quoteStatus;
        if (!status || status === 'none') {
          return <span className="text-foreground-tertiary">-</span>;
        }
        return (
          <Badge variant={status === 'accepted' ? 'success' : status === 'sent' ? 'info' : 'muted'}>
            {status}
          </Badge>
        );
      },
    },
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
            <DropdownMenuItem onClick={() => router.push(`${ROUTES.QUOTES.NEW  }?propertyId=${row.original.id}`)}>
              <FileText className="mr-2 size-icon-sm" />
              Create Quote
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`${ROUTES.SITE_VISITS.NEW  }?propertyId=${row.original.id}`)}>
              <Calendar className="mr-2 size-icon-sm" />
              Schedule Visit
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h2">Properties</Typography>
          <Typography variant="body" color="muted" size="sm" className="mt-1">
            Manage customer properties and leads
          </Typography>
        </div>
        <Button size="sm" onClick={() => router.push(ROUTES.CUSTOMERS.NEW)}>
          <Plus className="mr-2 size-icon-sm" />
          Add Property
        </Button>
      </div>

      {/* Temperature Tabs */}
      <FilterTabs
        tabs={filterTabs}
        value={temperatureFilter}
        onChange={setTemperatureFilter}
        variant="pills"
      />

      {/* Data Table */}
      {filteredProperties.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredProperties}
          enableSearch
          searchPlaceholder="Search properties..."
          enablePagination
          pageSize={10}
        />
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
