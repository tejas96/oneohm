import type { ProjectCreateFormData } from '../../schemas/project-create.schema';

// ── Wizard Step Definitions ────────────────────────────────────

export const WIZARD_STEPS = [
  {
    id: 'source',
    label: 'Source',
    fields: ['customerId', 'propertyId', 'quoteId'] satisfies (keyof ProjectCreateFormData)[],
  },
  {
    id: 'details',
    label: 'Details',
    fields: ['name', 'priority', 'startDate', 'endDate'] satisfies (keyof ProjectCreateFormData)[],
  },
  {
    id: 'team',
    label: 'Team',
    fields: ['teamMembers'] satisfies (keyof ProjectCreateFormData)[],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    fields: [
      'milestones',
      'excludedStepIds',
      'taskAssignments',
      'taskMilestoneOverrides',
    ] satisfies (keyof ProjectCreateFormData)[],
  },
  {
    id: 'review',
    label: 'Review',
    fields: [] as (keyof ProjectCreateFormData)[],
  },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id'];

export const TOTAL_STEPS = WIZARD_STEPS.length;
