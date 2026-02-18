// Customers Feature - Hooks

// Create customer & availability check
export { useCreateCustomer, useCheckAvailability, customerKeys } from './use-create-customer';
export type { CustomerResponse, AvailabilityResponse, AvailabilityState } from './use-create-customer';

// Customer list, detail, and mutations
export {
  useCustomers,
  useCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useUpdateCustomerStatus,
  useCustomerStats,
} from './use-customers';
export type {
  Customer,
  CustomerFilters,
  CustomerListResponse,
  CustomerStatsResponse,
  PaginationMeta,
  UpdateCustomerData,
} from './use-customers';

// Customer properties
export { useCustomerProperties, useProperty, propertyKeys } from './use-customer-properties';
export type { CustomerPropertyResponse, PropertyDocument } from './use-customer-properties';

// Customer quotes
export { useCustomerQuotes, quoteKeys } from './use-customer-quotes';
export type { CustomerQuote, CustomerQuotesResponse } from './use-customer-quotes';

// Property documents
export {
  useAddPropertyDocument,
  useRemovePropertyDocument,
  useDocumentDownloadUrl,
} from './use-property-documents';

// Document upload
export { useDocumentUpload } from './use-document-upload';

// Document preview
export { useDocumentPreview } from './use-document-preview';
