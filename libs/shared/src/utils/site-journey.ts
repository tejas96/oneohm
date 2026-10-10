/**
 * The six steps of a site's journey, in order. A site's `stageIndex` (0–5) is
 * an index into this list; the backend decides the index (see
 * `SiteJourney` in ../types/site-journey).
 */
export const SITE_JOURNEY_STEPS = [
  'Lead captured',
  'Survey done',
  'Quote drafted',
  'Quote sent',
  'Won',
  'Commissioned',
] as const;
