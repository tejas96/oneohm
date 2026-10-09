import type { DealAttention, DealStage, DealStageFilter } from '../types/quotes-dashboard';

export const DEAL_STAGES: readonly DealStage[] = ['drafting', 'waiting', 'quiet', 'won', 'lost'];
export const DEAL_STAGE_FILTERS: readonly DealStageFilter[] = [...DEAL_STAGES, 'open', 'pipeline'];
export const DEAL_ATTENTIONS: readonly DealAttention[] = [
  'quiet_no_followup',
  'ends_this_week',
  'stale_draft',
  'won_no_project',
];

export const DEAL_STAGE_LABELS: Record<DealStageFilter, string> = {
  drafting: 'Drafting',
  waiting: 'Waiting',
  quiet: 'Gone quiet',
  won: 'Won',
  lost: 'Lost',
  open: 'Open (drafting, waiting, quiet)',
  pipeline: 'Waiting or gone quiet',
};

export const DEAL_ATTENTION_LABELS: Record<DealAttention, string> = {
  quiet_no_followup: 'Gone quiet, no follow-up',
  ends_this_week: 'Ends this week',
  stale_draft: 'Draft not sent 7+ days',
  won_no_project: 'Won, no project yet',
};

/** `customer_profiles.lead_source` empty or null, as one filterable value. */
export const LEAD_SOURCE_NOT_SET = 'not_set';

/** `walk_in` → "Walk in", `not_set` → "Not set", `Gharkul` → "Gharkul". */
export function leadSourceLabel(value: string): string {
  if (value === LEAD_SOURCE_NOT_SET) return 'Not set';
  const text = value.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
