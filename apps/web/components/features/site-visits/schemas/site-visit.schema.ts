export {
  scheduleSiteVisitSchema,
  type ScheduleSiteVisitFormData,
  rescheduleVisitSchema,
  type RescheduleVisitFormData,
  cancelVisitSchema,
  type CancelVisitFormData,
} from '@oneohm-epc/shared/schemas';

export const VISIT_TYPE_OPTIONS = [
  {
    value: 'initial_assessment',
    label: 'Initial Assessment',
    description: 'First site visit to assess feasibility',
  },
  {
    value: 'technical_survey',
    label: 'Technical Survey',
    description: 'Detailed technical measurement and evaluation',
  },
  { value: 'follow_up', label: 'Follow-up Visit', description: 'Follow-up on previous assessment' },
] as const;

export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
] as const;

export const TIME_SLOT_OPTIONS = [
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
] as const;
