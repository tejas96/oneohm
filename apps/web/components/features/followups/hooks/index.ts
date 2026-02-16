// Followups Feature - Hooks

export {
  useFollowups,
  useCreateFollowup,
  useUpdateFollowup,
  useMarkFollowupComplete,
  useMarkFollowupCancelled,
  useDeleteFollowup,
  followupKeys,
} from './use-followups';

export type {
  FollowupResponse,
  FollowupListResponse,
  FollowupFilters,
  CreateFollowupData,
  UpdateFollowupData,
} from './use-followups';
