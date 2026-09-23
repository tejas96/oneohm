import type { ReportStatus } from '@tejas96/shared/reports';

import type { Tone } from '../../primitives';

export const REPORT_STATUS_META: Record<ReportStatus, { label: string; tone: Tone }> = {
  missing: { label: 'Missing details', tone: 'warning' },
  ready: { label: 'Ready to generate', tone: 'accent' },
  filed: { label: 'Filed', tone: 'success' },
  stale: { label: 'Out of date', tone: 'danger' },
};
