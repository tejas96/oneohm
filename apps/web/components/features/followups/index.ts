// Followups Feature - Barrel Exports

// Components
export { FollowupListPage } from './components/followup-list-page';
export { FollowupForm } from './components/followup-form';

// Hooks
export {
  useFollowups,
  useCreateFollowup,
  useUpdateFollowup,
  useMarkFollowupComplete,
  useMarkFollowupCancelled,
  useDeleteFollowup,
  followupKeys,
} from './hooks';

export type {
  FollowupResponse,
  FollowupListResponse,
  FollowupFilters,
  CreateFollowupData,
  UpdateFollowupData,
} from './hooks';

// Schemas
export {
  followupSchema,
  rescheduleFollowupSchema,
  completeFollowupSchema,
} from './schemas/followup.schema';

export type {
  FollowupFormData,
  RescheduleFollowupFormData,
  CompleteFollowupFormData,
} from './schemas/followup.schema';
