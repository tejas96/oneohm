// Properties Feature - Barrel Exports

// Components
export { PropertyListPage } from './components/property-list-page';
export { PropertyDetailPage } from './components/property-detail-page';
export { PropertyEditPage } from './components/property-edit-page';
export { AddPropertyForm } from './components/add-property-form';
export { CreatePropertyForm } from './components/create-property-form';
export { CreatePropertyPage } from './components/create-property-page';
export { MarkAsLostModal } from './components/mark-as-lost-modal';
export { FollowupMiniList } from './components/followup-mini-list';
export { PropertyFollowupsTab } from './components/property-followups-tab';
export { PropertyActivityTab } from './components/property-activity-tab';

// Hooks
export {
  useCreateProperty,
  useCustomersList,
  useCustomerById,
  useProperties,
  usePropertyStats,
  useUpdateProperty,
  useDeleteProperty,
  useProperty,
  usePropertyQuotes,
  propertyQuoteKeys,
} from './hooks';

export type {
  PropertyResponse,
  Property,
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
