// Properties Feature - Barrel Exports

// Components
export { PropertyListPage } from './components/property-list-page';
export { PropertyDetailPage } from './components/property-detail-page';
export { AddPropertyForm } from './components/add-property-form';
export { CreatePropertyForm } from './components/create-property-form';
export { CreatePropertyPage } from './components/create-property-page';
export { MarkAsLostModal } from './components/mark-as-lost-modal';

// Hooks
export {
  useCreateProperty,
  useCustomersList,
  useCustomerById,
  propertyKeys,
} from './hooks';

export type { PropertyResponse } from './hooks';

// Schemas
export {
  addPropertySchema,
  createPropertySchema,
  editPropertySchema,
  markAsLostSchema,
  LOST_REASONS,
} from './schemas/property.schema';

export type {
  AddPropertyFormData,
  CreatePropertyFormData,
  EditPropertyFormData,
  MarkAsLostFormData,
} from './schemas/property.schema';
