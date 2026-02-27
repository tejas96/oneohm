// Properties Feature - Hooks

// Create property & related helpers
export {
  useCreateProperty,
  useCustomersList,
  useCustomerById,
  propertyKeys,
} from './use-create-property';

export type {
  PropertyResponse,
  PropertyDocumentDto,
  CreatePropertyWithDocsData,
} from './use-create-property';

// Property list, stats, update, and delete
export {
  useProperties,
  usePropertyStats,
  useUpdateProperty,
  useDeleteProperty,
} from './use-properties';

export type {
  Property,
  PropertyFilters,
  PropertyListResponse,
  PropertyStatsResponse,
  PaginationMeta,
  UpdatePropertyData,
} from './use-properties';

// Re-export single property hook from customers feature (single source of truth)
export { useProperty, useCustomerProperties } from '@/components/features/customers/hooks';
export type { CustomerPropertyResponse } from '@/components/features/customers/hooks';

// Property quotes hook
export { usePropertyQuotes } from './use-property-quotes';
export type { CustomerQuote, CustomerQuotesResponse } from './use-property-quotes';
