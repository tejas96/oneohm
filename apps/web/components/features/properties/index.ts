// Properties Feature - Barrel Exports

// Components
export { PropertyListPage } from './components/property-list-page';
export { PropertyDetailPage } from './components/property-detail-page';
export { AddPropertyForm } from './components/add-property-form';
export { MarkAsLostModal } from './components/mark-as-lost-modal';

// Schemas
export {
  addPropertySchema,
  editPropertySchema,
  markAsLostSchema,
  LOST_REASONS,
} from './schemas/property.schema';

export type {
  AddPropertyFormData,
  EditPropertyFormData,
  MarkAsLostFormData,
} from './schemas/property.schema';
