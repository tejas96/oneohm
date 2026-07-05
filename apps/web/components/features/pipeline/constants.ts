/**
 * Sales pipeline stage constants and display config.
 */

export const PIPELINE_STAGE_IDS = {
  LEADS: 'leads',
  QUALIFIED: 'qualified',
  QUOTED: 'quoted',
  WON: 'won',
  NEGOTIATION: 'negotiation',
  LOST: 'lost',
} as const;

export type PipelineStageId = (typeof PIPELINE_STAGE_IDS)[keyof typeof PIPELINE_STAGE_IDS];

export interface PipelineStageVisualConfig {
  accentBorder: string;
  accentBg: string;
  accentText: string;
  dotClass: string;
  barClass: string;
  /** Recharts/SVG only — aligned to tailwind.config.ts tokens */
  chartStroke: string;
}

export const PIPELINE_STAGE_CONFIG: Record<string, PipelineStageVisualConfig> = {
  [PIPELINE_STAGE_IDS.LEADS]: {
    accentBorder: 'border-l-primary',
    accentBg: 'bg-primary/5',
    accentText: 'text-primary',
    dotClass: 'bg-primary',
    barClass: 'bg-primary',
    chartStroke: '#76c044',
  },
  [PIPELINE_STAGE_IDS.QUALIFIED]: {
    accentBorder: 'border-l-info',
    accentBg: 'bg-info/5',
    accentText: 'text-info',
    dotClass: 'bg-info',
    barClass: 'bg-info',
    chartStroke: '#0ea5e9',
  },
  [PIPELINE_STAGE_IDS.QUOTED]: {
    accentBorder: 'border-l-warning',
    accentBg: 'bg-warning/5',
    accentText: 'text-warning',
    dotClass: 'bg-warning',
    barClass: 'bg-warning',
    chartStroke: '#eab308',
  },
  [PIPELINE_STAGE_IDS.WON]: {
    accentBorder: 'border-l-success',
    accentBg: 'bg-success/5',
    accentText: 'text-success',
    dotClass: 'bg-success',
    barClass: 'bg-success',
    chartStroke: '#22c55e',
  },
};

/** @deprecated Use PIPELINE_STAGE_CONFIG[id].dotClass */
export const PIPELINE_STAGE_COLORS: Record<string, string> = {
  [PIPELINE_STAGE_IDS.LEADS]: 'bg-primary',
  [PIPELINE_STAGE_IDS.QUALIFIED]: 'bg-info',
  [PIPELINE_STAGE_IDS.QUOTED]: 'bg-warning',
  [PIPELINE_STAGE_IDS.WON]: 'bg-success',
};

export const PIPELINE_CHART_COLORS = {
  leads: '#76c044',
  won: '#22c55e',
} as const;

export const PIPELINE_DEFAULT_RANGE = '30d';

export const PIPELINE_SALESPERSON_ALL = 'all';
