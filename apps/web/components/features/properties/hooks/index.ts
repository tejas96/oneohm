// Properties Feature - Hooks

// FDAL resource hooks (mutations only — list/stats removed with property list page)
// Create property & related helpers
export { useCreateProperty, propertyKeys } from './use-create-property';

// Update and delete (kept for detail/form pages — will migrate to usePropertyMutations later)
export {
  useUpdateProperty,
  useCompletePropertyVisit,
  useCompletePropertySurvey,
  useCancelPropertySiteActivity,
} from './use-properties';

// Re-export single property hook from customers feature (single source of truth)
export { useProperty } from '@/components/features/customers/hooks';
export type { CustomerPropertyResponse } from '@/components/features/customers/hooks';

// Property quotes hook
// Property loan and follow-up hooks
export { usePropertyLoan } from './use-property-loan';
export { usePropertyFollowups } from './use-property-followups';

export {
  usePropertyFinanceSnapshot,
  PROPERTY_FINANCE_PAGE_LIMIT,
} from './use-property-finance-snapshot';

export { usePropertyQuoteSummary } from './use-property-quote-summary';
