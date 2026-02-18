// Customers Feature - Barrel Exports

// Constants
export {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
  getDocumentTypeLabel,
} from './constants';

// Components
export { CustomerListPage } from './components/customer-list-page';
export { CustomerDetailPage } from './components/customer-detail-page';
export { CustomerForm } from './components/customer-form';
export { DeleteCustomerModal } from './components/delete-customer-modal';
export { ImportCustomersModal } from './components/import-customers-modal';
export { PropertyCard } from './components/property-card';
export { PropertySelectModal } from './components/property-select-modal';
export { UploadDocumentModal } from './components/upload-document-modal';
export { DocumentRow } from './components/document-row';
export type { AggregatedDocument } from './components/document-row';
export { DocumentPreviewModal } from './components/document-preview-modal';
export type { PreviewDocument } from './components/document-preview-modal';

// Schemas
export {
  createCustomerProfileSchema,
  importCustomersSchema,
} from './schemas/customer.schema';

export type {
  CreateCustomerProfileFormData,
  ImportCustomersFormData,
} from './schemas/customer.schema';

// Hooks
export {
  useCreateCustomer,
  useCheckAvailability,
  customerKeys,
  useCustomerProperties,
  useProperty,
  propertyKeys,
  useCustomerQuotes,
  quoteKeys,
  useAddPropertyDocument,
  useRemovePropertyDocument,
  useDocumentDownloadUrl,
  useDocumentUpload,
  useDocumentPreview,
} from './hooks';
export type {
  CustomerResponse,
  AvailabilityResponse,
  AvailabilityState,
  CustomerPropertyResponse,
  PropertyDocument,
  CustomerQuote,
  CustomerQuotesResponse,
} from './hooks';
