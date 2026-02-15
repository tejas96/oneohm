// Followups Feature - Barrel Exports

// Components
export { FollowupListPage } from './components/followup-list-page';
export { FollowupForm } from './components/followup-form';

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
