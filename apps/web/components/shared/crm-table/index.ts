// CrmTablePagination and CrmSelectionBar are internal to CrmTable — it
// composes them directly and nothing outside this package renders them
// standalone. CrmTableProps, CrmDensity and CrmPillSize are likewise unused
// beyond this package today; each is a one-line addition here if a consumer
// ever needs it.
export { CrmTable } from './CrmTable';
export { CrmStatusPill, CRM_TONE_FILL } from './CrmStatusPill';

export type { CrmBulkAction, CrmColumn, CrmQuickFilter, CrmTone } from './types';
