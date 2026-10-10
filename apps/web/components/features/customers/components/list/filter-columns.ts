import { ConnectionType, CustomerStatus, LeadSource } from '@tejas96/shared/types';

import type { Customer as CustomerBase } from '../../hooks/use-customers';

import {
  LEAD_TEMPERATURE_OPTIONS,
  PROPERTY_STATUS_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  QUOTE_STATUS_OPTIONS,
} from '@/components/features/properties/constants';
import type { ColumnConfig } from '@/components/shared/advanced-table';
import { toTitleLabel } from '@/lib/utils';

/** The filter helpers index arbitrary fields, so the row type is widened here. */
export type CustomerRow = CustomerBase & Record<string, unknown>;

const LEAD_SOURCE_OPTIONS = Object.values(LeadSource).map((value) => ({
  value,
  label: toTitleLabel(value),
}));

const STATUS_OPTIONS = Object.values(CustomerStatus).map((value) => ({
  value,
  label: toTitleLabel(value),
}));

const CONNECTION_TYPE_OPTIONS = Object.values(ConnectionType).map((value) => ({
  value,
  label: toTitleLabel(value),
}));

// ============================================================================
// Filter columns
//
// The filter contract, handed verbatim to the shared TableFilters popover.
// Every field the customers API accepts is declared here — including the
// property-level pseudo-fields that have no visible column of their own.
// ============================================================================

export const FILTER_COLUMNS: ColumnConfig<CustomerRow>[] = [
  {
    field: 'followupAssigneeId',
    headerName: 'Followup assignee',
    filterable: true,
    filterType: 'select',
  },
  {
    field: 'city',
    headerName: 'City',
    filterable: true,
    filterType: 'text',
    filterDebounceMs: 400,
  },
  {
    field: 'leadSource',
    headerName: 'Lead Source',
    filterable: true,
    filterType: 'select',
    filterOptions: LEAD_SOURCE_OPTIONS,
  },
  {
    field: 'status',
    headerName: 'Status',
    filterable: true,
    filterType: 'select',
    filterOptions: STATUS_OPTIONS,
  },
  {
    // Declared so the active-filter chip reads "Service tickets: Has active
    // tickets" rather than a bare "true", and so the filter is reachable from
    // the popover as well as the quick-filter chip — the same dual path status
    // already has.
    field: 'hasActiveTickets',
    headerName: 'Service tickets',
    filterable: true,
    filterType: 'select',
    filterOptions: [{ label: 'Has active tickets', value: 'true' }],
  },
  {
    // Options injected at render time from useCustomerGroups().
    field: 'groupSearch',
    headerName: 'Group',
    filterable: true,
    filterType: 'select',
  },
  {
    field: 'hasProperty',
    headerName: 'Has property',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' },
    ],
  },
  {
    field: 'propertyType',
    headerName: 'Property Type',
    filterable: true,
    filterType: 'select',
    filterOptions: PROPERTY_TYPE_OPTIONS,
  },
  {
    field: 'propertyStatus',
    headerName: 'Property Status',
    filterable: true,
    filterType: 'select',
    filterOptions: PROPERTY_STATUS_OPTIONS,
  },
  {
    field: 'connectionType',
    headerName: 'Connection Type',
    filterable: true,
    filterType: 'select',
    filterOptions: CONNECTION_TYPE_OPTIONS,
  },
  {
    field: 'quoteStatus',
    headerName: 'Quote Status',
    filterable: true,
    filterType: 'select',
    filterOptions: QUOTE_STATUS_OPTIONS,
  },
  {
    field: 'leadTemperature',
    headerName: 'Lead Temperature',
    filterable: true,
    filterType: 'select',
    filterOptions: LEAD_TEMPERATURE_OPTIONS,
  },
  {
    field: 'latestQuoteSystemSizeKw',
    headerName: 'System Size (kW)',
    filterable: true,
    filterType: 'range',
  },
  {
    field: 'propertyCity',
    headerName: 'Property City',
    filterable: true,
    filterType: 'text',
    filterDebounceMs: 400,
  },
  {
    field: 'propertyState',
    headerName: 'Property State',
    filterable: true,
    filterType: 'text',
    filterDebounceMs: 400,
  },
  {
    field: 'propertyConsumerNumber',
    headerName: 'Consumer Number',
    filterable: true,
    filterType: 'text',
    filterDebounceMs: 400,
  },
  {
    field: 'createdAt',
    headerName: 'Onboarded',
    filterable: true,
    filterType: 'date',
  },
  {
    // Options injected at render time from useEmployees().
    field: 'createdBy',
    headerName: 'Created By',
    filterable: true,
  },
  {
    field: 'assigneeId',
    headerName: 'Assigned To',
    filterable: true,
  },
  {
    // Not in the popover — the ribbon sets it. Declared only so its
    // active-filter chip reads "Needs follow-up" instead of a bare "true".
    field: 'needsFollowup',
    headerName: 'Needs follow-up',
    filterable: false,
    filterType: 'select',
    filterOptions: [{ label: 'Needs follow-up', value: 'true' }],
  },
];
