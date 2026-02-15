// Customers Feature - Barrel Exports

// Components
export { CustomerListPage } from './components/customer-list-page';
export { CustomerDetailPage } from './components/customer-detail-page';
export { CreateCustomerForm } from './components/create-customer-form';
export { EditCustomerModal } from './components/edit-customer-modal';
export { DeleteCustomerModal } from './components/delete-customer-modal';
export { ImportCustomersModal } from './components/import-customers-modal';

// Schemas
export {
  createCustomerProfileSchema,
  editCustomerSchema,
  importCustomersSchema,
} from './schemas/customer.schema';

export type {
  CreateCustomerProfileFormData,
  EditCustomerFormData,
  ImportCustomersFormData,
} from './schemas/customer.schema';

// Hooks
export { useCreateCustomer, useCheckAvailability, customerKeys } from './hooks';
export type { CustomerResponse, AvailabilityResponse, AvailabilityState } from './hooks';
