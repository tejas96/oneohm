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

export { usePropertyFinanceSnapshot } from './use-property-finance-snapshot';
