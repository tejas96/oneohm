// Properties Feature - Barrel Exports

// Constants
// Components
export { PropertyDetailPage } from './components/property-detail-page';
export { MarkAsLostDialog } from './property-detail';

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
