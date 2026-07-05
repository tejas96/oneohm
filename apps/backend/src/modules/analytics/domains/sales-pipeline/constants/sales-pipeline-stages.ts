/**
 * Sales pipeline funnel stage identifiers and display labels.
 */

export const SALES_PIPELINE_STAGE_IDS = {
  LEADS: 'leads',
  QUALIFIED: 'qualified',
  QUOTED: 'quoted',
  WON: 'won',
} as const;

export type SalesPipelineStageId =
  (typeof SALES_PIPELINE_STAGE_IDS)[keyof typeof SALES_PIPELINE_STAGE_IDS];

/** Drill-down stage ids include negotiation and lost side-metrics */
export const SALES_PIPELINE_DRILLDOWN_STAGE_IDS = {
  ...SALES_PIPELINE_STAGE_IDS,
  NEGOTIATION: 'negotiation',
  LOST: 'lost',
} as const;

export type SalesPipelineDrilldownStageId =
  (typeof SALES_PIPELINE_DRILLDOWN_STAGE_IDS)[keyof typeof SALES_PIPELINE_DRILLDOWN_STAGE_IDS];

export const SALES_PIPELINE_STAGE_LABELS: Record<SalesPipelineStageId, string> = {
  [SALES_PIPELINE_STAGE_IDS.LEADS]: 'New Leads',
  [SALES_PIPELINE_STAGE_IDS.QUALIFIED]: 'Qualified',
  [SALES_PIPELINE_STAGE_IDS.QUOTED]: 'Quote Sent',
  [SALES_PIPELINE_STAGE_IDS.WON]: 'Won',
};

export const NEGOTIATION_THRESHOLD_DAYS = 7;
