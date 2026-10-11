import type { CrmTone } from '@/components/shared/crm-table';

/**
 * Ageing bucket for a row.
 *
 * Colour is never the only signal — the label carries it too, so the list is
 * still readable to someone who cannot distinguish the tones.
 */
export function ageingBucket(days: number, undated = false): { label: string; tone: CrmTone } {
  // The quick view is "Not due / no date" (finance-receivables-page.tsx); a
  // row knows which of the two it is, so it says that one. A milestone is only
  // dated once its stage work is done, so most rows here have no date at all,
  // and "Not due yet" claimed a date that does not exist.
  if (days <= 0) return { label: undated ? 'No due date' : 'Not due yet', tone: 'neutral' };
  if (days <= 30) return { label: '1–30 days', tone: 'warning' };
  if (days <= 60) return { label: '31–60 days', tone: 'warning' };
  if (days <= 90) return { label: '61–90 days', tone: 'danger' };
  return { label: '90+ days', tone: 'danger' };
}
