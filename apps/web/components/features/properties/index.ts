// Properties Feature - Barrel Exports

// Constants
export {
  PROPERTY_ALERTS,
  REQUIRED_FIELD_KEYS,
  REQUIRED_FIELDS_TOTAL,
  PROPERTY_DETAIL_TABS,
  PROPERTY_TYPE_LABELS,
  LEAD_TEMPERATURE_CONFIG,
} from './constants';

export type { PropertyDetailTab } from './constants';

// Components
export { PropertyListPage } from './components/property-list-page';
export { PropertyDetailPage } from './components/property-detail-page';
export { PropertyDetailHeader } from './components/property-detail-header';
export { PropertyDocumentsTab } from './components/property-documents-tab';
export { PropertyForm } from './components/property-form';
export { PropertyFormPage } from './components/property-form-page';
export { MarkAsLostModal } from './components/mark-as-lost-modal';
export { FollowupMiniList } from './components/followup-mini-list';
export { PropertyFollowupsTab } from './components/property-followups-tab';
export { PropertyActivityTab } from './components/property-activity-tab';

// Hooks
export {
  useCreateProperty,
  useCustomersList,
  useCustomerById,
  usePropertyList,
  usePropertyTemperatureStats,
  usePropertyMutations,
  useUpdateProperty,
  useDeleteProperty,
  useProperty,
  usePropertyQuotes,
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
