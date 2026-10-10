// Customers Feature - Barrel Exports

// Constants
export { CUSTOMER_STATUS_CHIP_COLOR } from './constants';
// Components
export { CustomerListPage } from './components/customer-list-page';
export { CustomerDetailPage } from './components/customer-detail-page';
// Schemas
// Hooks
export {
  useCreateCustomer,
  useCheckAvailability,
  useCustomer,
  useUpdateCustomer,
  useUpdateCustomerStatus,
  useCustomerGroups,
  useCustomerProperties,
} from './hooks';
export type { CustomerResponse, Customer, CustomerPropertyResponse } from './hooks';
