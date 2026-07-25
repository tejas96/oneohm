// Customers Feature - Hooks

// Create customer & availability check
export { useCreateCustomer, useCheckAvailability, customerKeys } from './use-create-customer';
export type {
  CustomerResponse,
  AvailabilityResponse,
  AvailabilityState,
} from './use-create-customer';

// Customer list, detail, and mutations
export {
  useCustomers,
  useCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useUpdateCustomerStatus,
  useCustomerStats,
  useCustomerOverviewStats,
  useAssignCustomer,
} from './use-customers';
export type {
  Customer,
  CustomerFilters,
  CustomerListResponse,
  CustomerOverviewStats,
  CustomerStatsResponse,
  PaginationMeta,
  SitePortfolio,
  UpdateCustomerData,
} from './use-customers';

// Customer properties
export { useCustomerProperties, useProperty, propertyKeys } from './use-customer-properties';
export type { CustomerPropertyResponse, PropertyDocument } from './use-customer-properties';

// Customer quotes
export { useCustomerQuotes, quoteKeys } from './use-customer-quotes';
export type { CustomerQuote, CustomerQuotesResponse } from './use-customer-quotes';

// Customer follow-ups
export {
  useCustomerFollowups,
  useCreateFollowup,
  useCompleteFollowup,
  followupKeys,
} from './use-customer-followups';
export type {
  FollowupResponse,
  CreateFollowupInput,
  FollowupsListResponse,
} from './use-customer-followups';

// Customer service
export {
  useCustomerServiceRequests,
  useCustomerFeedback,
  customerServiceKeys,
} from './use-customer-service';
export type { CustomerServiceRequest, CustomerFeedbackItem } from './use-customer-service';

// Customer loans
export { useCustomerLoans, customerLoanKeys } from './use-customer-loans';
export type { CustomerLoanApplication } from './use-customer-loans';

// Customer projects
export { useCustomerProjects, customerProjectKeys } from './use-customer-projects';
export type { CustomerProjectItem } from './use-customer-projects';

// Customer subsidies
export { useCustomerSubsidies, customerSubsidyKeys } from './use-customer-subsidies';
export type { CustomerSubsidyApplication } from './use-customer-subsidies';
