/**
 * Quotes dashboard (`GET /quotes/dashboard`) — request and response shapes.
 * A "deal" is one property with quotes, represented by one quote (the same
 * quote the quote list shows for that property). Definitions of every figure:
 * docs/superpowers/specs/2026-10-09-quotes-dashboard-design.md.
 * Money is rupees, the unit the quote list uses.
 */
import type { DashboardRange } from './projects-dashboard';

export type DealStage = 'drafting' | 'waiting' | 'quiet' | 'won' | 'lost';
/** A stage, `open` (drafting + waiting + quiet) or `pipeline` (waiting + quiet). */
export type DealStageFilter = DealStage | 'open' | 'pipeline';
export type DealAttention =
  | 'quiet_no_followup'
  | 'ends_this_week'
  | 'stale_draft'
  | 'won_no_project';

export interface DealMoney {
  count: number;
  valueRupees: number;
  /** Sum over deals with a known kW. */
  kw: number;
}

export interface QuotesDashboardNeedsAction {
  key: DealAttention;
  count: number;
  /** The two people with the most, most first. */
  owners: Array<{ personId: string; name: string; count: number }>;
  /** People beyond `owners`. */
  moreOwners: number;
}

export interface QuotesDashboardTeamRow {
  personId: string;
  name: string;
  drafting: number;
  waiting: number;
  quiet: number;
  open: number;
  /** Won in the period. */
  won: number;
}

export interface QuotesDashboardBigDeal {
  quoteId: string;
  customerName: string | null;
  kw: number | null;
  personName: string;
  stage: 'waiting' | 'quiet';
  /** Waiting: days until `valid_until`. Quiet: days since it. */
  days: number;
  valueRupees: number;
}

export interface QuotesDashboardSource {
  /** A `lead_source` value, `not_set`, or `other`. */
  key: string;
  label: string;
  count: number;
  /** Of `count`, deals that are Won now. */
  won: number;
  /** null when count < 3. */
  winPercent: number | null;
}

export interface QuotesDashboardTrendMonth {
  /** `YYYY-MM`. */
  month: string;
  newCount: number;
  newValueRupees: number;
  wonCount: number;
  wonValueRupees: number;
}

export interface QuotesDashboard {
  period: DashboardRange;
  /** Person picker options, sorted by name. Not filtered by person or financing. */
  people: Array<{ id: string; name: string }>;
  strip: {
    newDeals: { count: number; kw: number; cash: number; loan: number };
    wonValue: { valueRupees: number; kw: number; previousValueRupees: number };
    winRate: {
      newCount: number;
      wonOfNew: number;
      /** null when newCount is 0. */
      percent: number | null;
      /** Over deals won in the period; null when none. */
      medianDaysToWin: number | null;
    };
    pipeline: DealMoney;
  };
  stages: {
    drafting: DealMoney;
    waiting: DealMoney;
    quiet: DealMoney;
    /** Won in the period. */
    won: { count: number; kw: number };
    /** Lost in the period. */
    lost: { count: number; topReason: string | null };
  };
  /** Always 4 rows, in DEAL_ATTENTIONS order. */
  needsAction: QuotesDashboardNeedsAction[];
  /** First 8 people by open deals. */
  team: QuotesDashboardTeamRow[];
  teamMore: number;
  biggestOpen: QuotesDashboardBigDeal[];
  /** Up to 4 sources then `other` (only when non-zero). */
  sources: QuotesDashboardSource[];
  /** The source keys shown before `other`, so its link can exclude them. */
  topSourceKeys: string[];
  /** 12 months, oldest first. */
  trend: QuotesDashboardTrendMonth[];
}
