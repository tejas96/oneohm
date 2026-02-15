// Customers Feature - Barrel Exports

// Components
export { CustomerListPage } from './components/customer-list-page';
export { CustomerDetailPage } from './components/customer-detail-page';
export { CreateCustomerWizard } from './components/create-customer-wizard';
export { EditCustomerModal } from './components/edit-customer-modal';
export { DeleteCustomerModal } from './components/delete-customer-modal';
export { ImportCustomersModal } from './components/import-customers-modal';

// Schemas
export {
  customerInfoSchema,
  propertyDetailsSchema,
  electricityDetailsSchema,
  leadStatusSchema,
  reviewStepSchema,
  createCustomerSchema,
  editCustomerSchema,
  importCustomersSchema,
} from './schemas/customer.schema';

export type {
  CustomerInfoFormData,
  PropertyDetailsFormData,
  ElectricityDetailsFormData,
  LeadStatusFormData,
  ReviewStepFormData,
  CreateCustomerFormData,
  EditCustomerFormData,
  ImportCustomersFormData,
} from './schemas/customer.schema';

// Hooks (Phase 2)
// export {} from './hooks';
