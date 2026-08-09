// Properties Feature - Barrel Exports

// Constants
export {
  PROPERTY_ALERTS,
  REQUIRED_FIELD_KEYS,
  REQUIRED_FIELDS_TOTAL,
  PROPERTY_DETAIL_DEFAULT_TAB,
  PROPERTY_DETAIL_TABS,
  PROPERTY_TYPE_LABELS,
  LEAD_TEMPERATURE_CONFIG,
} from './constants';

export type { PropertyDetailTab } from './constants';

// Components
export { PropertyDetailPage } from './components/property-detail-page';
export { PropertyRowActionsMenu } from './components/property-row-actions-menu';
export { PropertyPipelineStrip, MarkAsLostDialog } from './property-detail';

// Property-domain field groups — consumed by the onboarding wizard, which
// supplies the surrounding card chrome.
export {
  PropertyBasicsFields,
  UtilityFields,
  ChangeRequestFields,
  LeadFields,
  FinancingFields,
  DocumentFields,
  ReviewSummary,
} from './components/property-fields';
export type { ReviewStepIndices } from './components/property-fields';

// Hooks
export {
  useCreateProperty,
  useCustomersList,
  useCustomerById,
  usePropertyMutations,
  useUpdateProperty,
  useDeleteProperty,
  useProperty,
  useCustomerProperties,
  usePropertyQuotes,
  usePropertyLoan,
  usePropertyFollowups,
} from './hooks';

export type {
  PropertyResponse,
  Property,
  PropertyItem,
  PropertyListFilters,
  PropertyFilters,
  PropertyListResponse,
  PropertyStatsResponse,
  UpdatePropertyData,
  CustomerQuote,
  CustomerQuotesResponse,
} from './hooks';

// Schemas
export {
  addPropertySchema,
  createPropertySchema,
  editPropertySchema,
  markAsLostSchema,
  LOST_REASONS,
} from './schemas';

export type {
  AddPropertyFormData,
  CreatePropertyFormData,
  EditPropertyFormData,
  MarkAsLostFormData,
} from './schemas';
