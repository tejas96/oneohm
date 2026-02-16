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
