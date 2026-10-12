// Properties Feature - Barrel Exports

// Constants
// Components
export { MarkAsLostDialog } from './components/mark-as-lost-dialog';
export { PropertyRedirect } from './components/property-redirect';

// Property-domain field groups — consumed by the onboarding wizard, which
// supplies the surrounding card chrome.
export {
  PropertyBasicsFields,
  UtilityFields,
  ChangeRequestFields,
  LeadFields,
  FinancingFields,
  DocumentFields,
} from './components/property-fields';
// Hooks
export { useCreateProperty, useUpdateProperty, useProperty } from './hooks';

// Schemas
