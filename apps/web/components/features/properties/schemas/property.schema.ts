export {
  createPropertySchema,
  type CreatePropertyFormData,
  addPropertySchema,
  type AddPropertyFormData,
  editPropertySchema,
  type EditPropertyFormData,
  markAsLostSchema,
  type MarkAsLostFormData,
} from '@tejas96/shared/schemas';

// ============================================================================
// Lost Reasons (web-only dropdown options)
// ============================================================================

export const LOST_REASONS = [
  { value: 'price_too_high', label: 'Price too high' },
  { value: 'chose_competitor', label: 'Chose competitor' },
  { value: 'not_interested', label: 'No longer interested' },
  { value: 'budget_constraints', label: 'Budget constraints' },
  { value: 'timing_issues', label: 'Timing issues' },
  { value: 'property_unsuitable', label: 'Property unsuitable' },
  { value: 'other', label: 'Other' },
] as const;
