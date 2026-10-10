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

/**
 * `customer_profiles.lead_source` empty or null, as one filterable value.
 * Deal facts store every source lower-cased and whitespace-trimmed, so "Gharkul",
 * "gharkul" and "gharkul " are one source and the list filter uses the same value.
 */
export const LEAD_SOURCE_NOT_SET = 'not_set';

/**
 * The dashboard's "Other" row: every source outside the top 4. Not a stored
 * value — real profiles hold the word `other`, so the bucket needs a key no
 * profile can have.
 */
export const LEAD_SOURCE_OTHER_BUCKET = '__other__';

/** `walk_in` → "Walk in", `not_set` or empty → "Not set", `gharkul` → "Gharkul". */
export function leadSourceLabel(value: string): string {
  const text = value.replace(/_/g, ' ').trim();
  if (value === LEAD_SOURCE_NOT_SET || !text) return 'Not set';
  return text.charAt(0).toUpperCase() + text.slice(1);
}
