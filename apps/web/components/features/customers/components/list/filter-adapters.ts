import {
  CustomerSortField,
  type CustomerStatus,
  type LeadSource,
  SortOrder,
} from '@tejas96/shared/types';

import type { CustomerFilters } from '../../hooks/use-customers';

import type { TableUrlFilterRecord } from '@/lib/hooks';

// ============================================================================
// Adapter functions — pure, module-level, no React deps
//
// MOVED here unchanged from `customer-list-page.tsx` when the list was rebuilt
// (2026-10). The page around them was replaced; the contract between URL filter
// state and the customers API was not, so the same deep links, saved URLs and
// backend semantics keep working.
// ============================================================================

const SORT_FIELD_MAP: Record<string, CustomerSortField> = {
  name: CustomerSortField.FIRST_NAME,
  city: CustomerSortField.CITY,
  createdAt: CustomerSortField.CREATED_AT,
};

export function toApiSortField(
  model: { field: string; direction: 'asc' | 'desc' } | null,
): CustomerSortField {
  if (!model) return CustomerSortField.CREATED_AT;
  return SORT_FIELD_MAP[model.field] ?? CustomerSortField.CREATED_AT;
}

export function toApiSortOrder(
  model: { field: string; direction: 'asc' | 'desc' } | null,
): SortOrder {
  return model?.direction === 'asc' ? SortOrder.ASC : SortOrder.DESC;
}

function toLocalDateString(raw: string): string | undefined {
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localDateToUtcDayRange(localDate: string): { fromIso: string; toIso: string } | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) return undefined;
  const yy = Number(match[1]);
  const mm = Number(match[2]);
  const dd = Number(match[3]);
  return {
    fromIso: new Date(yy, mm - 1, dd, 0, 0, 0, 0).toISOString(),
    toIso: new Date(yy, mm - 1, dd, 23, 59, 59, 999).toISOString(),
  };
}

export function toCustomerFilters(filters: TableUrlFilterRecord): Partial<CustomerFilters> {
  const raw = filters as Record<string, unknown>;
  const createdAtLocalDate =
    typeof filters.createdAt === 'string' ? toLocalDateString(filters.createdAt) : undefined;
  const createdAtUtcRange = createdAtLocalDate
    ? localDateToUtcDayRange(createdAtLocalDate)
    : undefined;

  const sizeRange = raw.latestQuoteSystemSizeKw as { min?: string; max?: string } | undefined;
  let propertySystemSizeMin: number | undefined;
  let propertySystemSizeMax: number | undefined;
  if (sizeRange?.min !== undefined && sizeRange.min !== '') {
    const n = Number(sizeRange.min);
    if (!Number.isNaN(n)) propertySystemSizeMin = n;
  }
  if (sizeRange?.max !== undefined && sizeRange.max !== '') {
    const n = Number(sizeRange.max);
    if (!Number.isNaN(n)) propertySystemSizeMax = n;
  }

  return {
    followupAssigneeId:
      typeof filters.followupAssigneeId === 'string' && filters.followupAssigneeId
        ? filters.followupAssigneeId
        : undefined,
    status:
      typeof filters.status === 'string' && filters.status
        ? (filters.status as CustomerStatus)
        : undefined,
    leadSource:
      typeof filters.leadSource === 'string' && filters.leadSource
        ? (filters.leadSource as LeadSource)
        : undefined,
    groupSearch:
      typeof filters.groupSearch === 'string' && filters.groupSearch
        ? filters.groupSearch
        : undefined,
    fromDate:
      typeof filters.fromDate === 'string' && filters.fromDate
        ? filters.fromDate
        : createdAtUtcRange?.fromIso,
    toDate:
      typeof filters.toDate === 'string' && filters.toDate
        ? filters.toDate
        : createdAtUtcRange?.toIso,
    city: typeof filters.city === 'string' && filters.city ? filters.city : undefined,
    hasProperty:
      filters.hasProperty === 'true' || filters.hasProperty === true
        ? true
        : filters.hasProperty === 'false' || filters.hasProperty === false
          ? false
          : // legacy: has-property filter was previously stored on the name field
            filters.name === 'true' || filters.name === true
            ? true
            : filters.name === 'false' || filters.name === false
              ? false
              : undefined,
    hasActiveTickets:
      filters.hasActiveTickets === 'true' || filters.hasActiveTickets === true ? true : undefined,
    createdBy:
      typeof filters.createdBy === 'string' && filters.createdBy ? filters.createdBy : undefined,
    assigneeId:
      typeof filters.assigneeId === 'string' && filters.assigneeId ? filters.assigneeId : undefined,
    propertyType:
      typeof raw.propertyType === 'string' && raw.propertyType && raw.propertyType !== 'all'
        ? (raw.propertyType as CustomerFilters['propertyType'])
        : undefined,
    propertyStatus:
      typeof raw.propertyStatus === 'string' && raw.propertyStatus && raw.propertyStatus !== 'all'
        ? (raw.propertyStatus as CustomerFilters['propertyStatus'])
        : undefined,
    connectionType:
      typeof raw.connectionType === 'string' && raw.connectionType && raw.connectionType !== 'all'
        ? (raw.connectionType as CustomerFilters['connectionType'])
        : undefined,
    leadTemperature:
      typeof raw.leadTemperature === 'string' &&
      raw.leadTemperature &&
      raw.leadTemperature !== 'all'
        ? (raw.leadTemperature as CustomerFilters['leadTemperature'])
        : undefined,
    quoteStatus:
      typeof raw.quoteStatus === 'string' && raw.quoteStatus && raw.quoteStatus !== 'all'
        ? (raw.quoteStatus as CustomerFilters['quoteStatus'])
        : typeof raw.latestQuoteStatus === 'string' &&
            raw.latestQuoteStatus &&
            raw.latestQuoteStatus !== 'all'
          ? (raw.latestQuoteStatus as CustomerFilters['quoteStatus'])
          : undefined,
    propertySystemSizeMin,
    propertySystemSizeMax,
    propertyCity:
      typeof raw.propertyCity === 'string' && raw.propertyCity ? raw.propertyCity : undefined,
    propertyState:
      typeof raw.propertyState === 'string' && raw.propertyState ? raw.propertyState : undefined,
    propertyConsumerNumber:
      typeof raw.propertyConsumerNumber === 'string' && raw.propertyConsumerNumber
        ? raw.propertyConsumerNumber
        : undefined,
    needsFollowup:
      filters.needsFollowup === 'true' || filters.needsFollowup === true ? true : undefined,
  };
}

const PROPERTY_LEVEL_FILTER_FIELDS = [
  'propertyType',
  'propertyStatus',
  'connectionType',
  'quoteStatus',
  'leadTemperature',
  'latestQuoteSystemSizeKw',
  'propertyCity',
  'propertyState',
  'propertyConsumerNumber',
] as const;

function hasActivePropertyLevelFilter(filters: TableUrlFilterRecord): boolean {
  const raw = filters as Record<string, unknown>;
  return PROPERTY_LEVEL_FILTER_FIELDS.some((field) => {
    const value = raw[field];
    if (value === '' || value == null) return false;
    if (field === 'latestQuoteSystemSizeKw' && typeof value === 'object') {
      const range = value as { min?: string | number; max?: string | number };
      return (
        (range.min !== undefined && range.min !== '') ||
        (range.max !== undefined && range.max !== '')
      );
    }
    return value !== 'all';
  });
}

function isHasPropertyFalse(filters: TableUrlFilterRecord): boolean {
  return (
    filters.hasProperty === 'false' ||
    filters.hasProperty === false ||
    filters.name === 'false' ||
    filters.name === false
  );
}

export function normalizeCustomerFilterState(filters: TableUrlFilterRecord): TableUrlFilterRecord {
  const next = { ...filters };
  const legacyHasProperty =
    next.name === 'true' || next.name === true
      ? 'true'
      : next.name === 'false' || next.name === false
        ? 'false'
        : undefined;

  if (legacyHasProperty && next.hasProperty == null) {
    next.hasProperty = legacyHasProperty;
  }
  if (next.name === 'true' || next.name === 'false' || next.name === true || next.name === false) {
    delete next.name;
  }
  return next;
}

export function reconcileContradictoryCustomerFilters(
  filters: TableUrlFilterRecord,
  changedField?: string,
): TableUrlFilterRecord {
  const next = normalizeCustomerFilterState(filters);
  // Only reconcile interactive changes; URL/deep-link loads keep both and backend returns 0.
  if (changedField == null) {
    return next;
  }
  if (!isHasPropertyFalse(next) || !hasActivePropertyLevelFilter(next)) {
    return next;
  }

  if (changedField === 'hasProperty') {
    for (const field of PROPERTY_LEVEL_FILTER_FIELDS) {
      delete next[field];
    }
    return next;
  }

  delete next.hasProperty;
  return next;
}
