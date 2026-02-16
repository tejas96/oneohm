// Customers Feature - Barrel Exports

// Components
export { CustomerListPage } from './components/customer-list-page';
export { CustomerDetailPage } from './components/customer-detail-page';
export { CustomerForm } from './components/customer-form';
export { DeleteCustomerModal } from './components/delete-customer-modal';
export { ImportCustomersModal } from './components/import-customers-modal';

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
export { useCreateCustomer, useCheckAvailability, customerKeys } from './hooks';
export type { CustomerResponse, AvailabilityResponse, AvailabilityState } from './hooks';
