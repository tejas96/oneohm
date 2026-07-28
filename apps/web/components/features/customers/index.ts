// Customers Feature - Barrel Exports

// Constants
export {
  CUSTOMER_DETAIL_TABS,
  CUSTOMER_DETAIL_DEFAULT_TAB,
  QUOTE_STATUS_BADGE_VARIANT,
  DOCUMENT_TYPE_LABELS,
  LEAD_SOURCE_LABELS,
  CUSTOMER_STATUS_CHIP_COLOR,
} from './constants';
export { getDocumentTypeLabel } from './utils';

export type { CustomerDetailTab } from './constants';

// Components
// CustomerKpiCards and CustomerPropertiesExpandedRow are consumed only by
// CustomerListPage via relative imports — not exported here until another
// feature actually needs them; a one-line addition when that happens.
export { CustomerListPage } from './components/customer-list-page';
export { CustomerDetailPage } from './components/customer-detail-page';
export { ImportCustomersModal } from './components/import-customers-modal';
export { PropertyCard } from './components/property-card';
export { PropertySelectModal } from './components/property-select-modal';
export { DocumentPreviewModal } from './components/document-preview-modal';
export type { PreviewDocument } from './components/document-preview-modal';

// Schemas
export { createCustomerProfileSchema, importCustomersSchema } from './schemas/customer.schema';

export type {
  CreateCustomerProfileFormData,
  ImportCustomersFormData,
} from './schemas/customer.schema';

// Hooks
export {
  useCreateCustomer,
  useCheckAvailability,
  customerKeys,
  useCustomers,
  useCustomer,
  useUpdateCustomer,
  useUpdateCustomerStatus,
  useCustomerGroups,
  useCustomerProperties,
  useProperty,
  propertyKeys,
  useCustomerQuotes,
  quoteKeys,
} from './hooks';
export type {
  CustomerResponse,
  AvailabilityResponse,
  AvailabilityState,
  Customer,
  CustomerFilters,
  CustomerListResponse,
  CustomerGroup,
  CustomerPropertyResponse,
  PropertyDocument,
  CustomerQuote,
  CustomerQuotesResponse,
} from './hooks';
