// Customers Feature - Hooks

// Create customer & availability check
export { useCreateCustomer, useCheckAvailability } from './use-create-customer';
export type { CustomerResponse } from './use-create-customer';

// Customer list, detail, and mutations
export {
  useCustomers,
  useCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useUpdateCustomerStatus,
  useAssignCustomer,
  useCustomerGroups,
} from './use-customers';
export type { Customer } from './use-customers';

// Customer properties
export { useCustomerProperties, useProperty } from './use-customer-properties';
export type { CustomerPropertyResponse } from './use-customer-properties';

// Customer quotes
export { useCustomerQuotes } from './use-customer-quotes';
export type { CustomerQuote, CustomerQuotesResponse } from './use-customer-quotes';

// Customer follow-ups
export { useCustomerFollowups } from './use-customer-followups';
// Customer feedback
// Customer loans
export { useCustomerLoans } from './use-customer-loans';
export type { CustomerLoanApplication } from './use-customer-loans';

// Customer projects
export { useCustomerProjects } from './use-customer-projects';
export type { CustomerProjectItem } from './use-customer-projects';

// Customer subsidies
export { useCustomerSubsidies } from './use-customer-subsidies';
