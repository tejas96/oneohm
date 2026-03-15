import { FollowupType, FollowupPriority } from '@oneohm-epc/shared/types';

export {
  followupSchema,
  type FollowupFormData,
  rescheduleFollowupSchema,
  type RescheduleFollowupFormData,
  completeFollowupSchema,
  type CompleteFollowupFormData,
} from '@oneohm-epc/shared/schemas';

export const FOLLOWUP_TYPE_OPTIONS = [
  { value: FollowupType.VISIT, label: 'Site Visit', icon: 'MapPin' },
  { value: FollowupType.MEETING, label: 'Meeting', icon: 'Users' },
  { value: FollowupType.TASK, label: 'Task', icon: 'CheckSquare' },
  { value: FollowupType.REMINDER, label: 'Reminder', icon: 'Bell' },
  { value: FollowupType.DOCUMENT_COLLECTION, label: 'Document Collection', icon: 'FileText' },
] as const;

export const PRIORITY_OPTIONS = [
  { value: FollowupPriority.LOW, label: 'Low' },
  { value: FollowupPriority.NORMAL, label: 'Normal' },
  { value: FollowupPriority.HIGH, label: 'High' },
] as const;
