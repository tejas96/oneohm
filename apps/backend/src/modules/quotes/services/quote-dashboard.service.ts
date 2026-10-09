import { Injectable } from '@nestjs/common';
import type {
  DashboardRange,
  DealAttention,
  QuotesDashboard,
  QuotesDashboardNeedsAction,
  QuotesDashboardSource,
} from '@tejas96/shared/types';
import { DEAL_ATTENTIONS, leadSourceLabel } from '@tejas96/shared/utils';
import { DataSource } from 'typeorm';

import { DEAL_FACTS, DEAL_FACTS_CTE, dealBetween } from '../sql/deal-facts.sql';

/** `$1` person (null = everyone), `$2` financing ('cash' | 'loan' | null). */
const SCOPED = `
  WITH ${DEAL_FACTS_CTE},
  scoped AS (
    SELECT df.* FROM deal_facts df
    WHERE ($1::uuid IS NULL OR df.person_id = $1::uuid)
      AND ($2::text IS NULL
           OR ($2::text = 'loan' AND ${DEAL_FACTS.loan})
           OR ($2::text = 'cash' AND ${DEAL_FACTS.cash}))
  )`;

const PERSON_NAME = `COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), 'Unknown')`;
const inPeriod = (c: 'new_at' | 'won_at' | 'lost_at'): string => dealBetween(c, '$3', '$4');

/** $3 from, $4 to, $5 previousFrom, $6 previousTo */
const STRIP_SQL = `${SCOPED}
  SELECT
    COUNT(*) FILTER (WHERE ${inPeriod('new_at')})::int AS "newCount",
    COALESCE(SUM(df.kw) FILTER (WHERE ${inPeriod('new_at')}), 0)::float AS "newKw",
    COUNT(*) FILTER (WHERE ${inPeriod('new_at')} AND ${DEAL_FACTS.loan})::int AS "newLoan",
    COUNT(*) FILTER (WHERE ${inPeriod('new_at')} AND ${DEAL_FACTS.won})::int AS "wonOfNew",
    COUNT(*) FILTER (WHERE ${inPeriod('won_at')})::int AS "wonCount",
    COALESCE(SUM(df.value_rupees) FILTER (WHERE ${inPeriod('won_at')}), 0)::float AS "wonValue",
    COALESCE(SUM(df.kw) FILTER (WHERE ${inPeriod('won_at')}), 0)::float AS "wonKw",
    COALESCE(SUM(df.value_rupees) FILTER (WHERE ${dealBetween('won_at', '$5', '$6')}), 0)::float AS "wonValuePrevious",
    percentile_cont(0.5) WITHIN GROUP (ORDER BY (CAST(df.won_at AS date) - CAST(df.new_at AS date)))
      FILTER (WHERE ${inPeriod('won_at')}) AS "medianDaysToWin",
    COUNT(*) FILTER (WHERE ${inPeriod('lost_at')})::int AS "lostCount",
    mode() WITHIN GROUP (ORDER BY df.loss_reason)
      FILTER (WHERE ${inPeriod('lost_at')} AND df.loss_reason IS NOT NULL) AS "topLossReason",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.drafting})::int AS "draftingCount",
    COALESCE(SUM(df.value_rupees) FILTER (WHERE ${DEAL_FACTS.drafting}), 0)::float AS "draftingValue",
    COALESCE(SUM(df.kw) FILTER (WHERE ${DEAL_FACTS.drafting}), 0)::float AS "draftingKw",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.waiting})::int AS "waitingCount",
    COALESCE(SUM(df.value_rupees) FILTER (WHERE ${DEAL_FACTS.waiting}), 0)::float AS "waitingValue",
    COALESCE(SUM(df.kw) FILTER (WHERE ${DEAL_FACTS.waiting}), 0)::float AS "waitingKw",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.quiet})::int AS "quietCount",
    COALESCE(SUM(df.value_rupees) FILTER (WHERE ${DEAL_FACTS.quiet}), 0)::float AS "quietValue",
    COALESCE(SUM(df.kw) FILTER (WHERE ${DEAL_FACTS.quiet}), 0)::float AS "quietKw"
  FROM scoped df`;

/** One row per (attention key, person) with a count. */
const NEEDS_SQL = `${SCOPED}
  SELECT k.key, df.person_id AS "personId", ${PERSON_NAME} AS "name", COUNT(*)::int AS "count"
  FROM scoped df
  CROSS JOIN LATERAL (VALUES
    ('quiet_no_followup', df.quiet_no_followup),
    ('ends_this_week', df.ends_this_week),
    ('stale_draft', df.stale_draft),
    ('won_no_project', df.won_no_project)
  ) AS k(key, hit)
  LEFT JOIN users u ON u.id = df.person_id
  WHERE k.hit
  GROUP BY k.key, df.person_id, u.first_name, u.last_name
  ORDER BY k.key, "count" DESC, "name"`;

/** $3 from, $4 to. People with open deals or wins in the period. */
const TEAM_SQL = `${SCOPED}
  SELECT df.person_id AS "personId", ${PERSON_NAME} AS "name",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.drafting})::int AS "drafting",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.waiting})::int AS "waiting",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.quiet})::int AS "quiet",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.open})::int AS "open",
    COUNT(*) FILTER (WHERE ${inPeriod('won_at')})::int AS "won"
  FROM scoped df
  LEFT JOIN users u ON u.id = df.person_id
  GROUP BY df.person_id, u.first_name, u.last_name
  HAVING COUNT(*) FILTER (WHERE ${DEAL_FACTS.open}) > 0
      OR COUNT(*) FILTER (WHERE ${inPeriod('won_at')}) > 0
  ORDER BY "open" DESC, "won" DESC, "name"`;

const BIGGEST_SQL = `${SCOPED}
  SELECT df.quote_id AS "quoteId",
    NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '') AS "customerName",
    df.kw, ${PERSON_NAME} AS "personName", df.stage,
    CASE WHEN df.stage = 'waiting' THEN (df.valid_until - CURRENT_DATE)
         ELSE (CURRENT_DATE - df.valid_until) END::int AS "days",
    df.value_rupees AS "valueRupees"
  FROM scoped df
  LEFT JOIN customer_profiles cp ON cp.id = df.customer_id
  LEFT JOIN users u ON u.id = df.person_id
  WHERE ${DEAL_FACTS.pipeline}
  ORDER BY df.value_rupees DESC, df.quote_created_at DESC
  LIMIT 5`;

/** $3 from, $4 to. New deals in the period by lead source. */
const SOURCES_SQL = `${SCOPED}
  SELECT df.lead_source AS "key", COUNT(*)::int AS "count",
    COUNT(*) FILTER (WHERE ${DEAL_FACTS.won})::int AS "won"
  FROM scoped df
  WHERE ${inPeriod('new_at')}
  GROUP BY 1
  ORDER BY 2 DESC, 1`;

/** $3 the IST today. */
const TREND_SQL = `${SCOPED},
  months AS (
    SELECT generate_series(
      date_trunc('month', $3::date) - interval '11 months',
      date_trunc('month', $3::date),
      interval '1 month'
    )::date AS m
  ),
  dated AS (
    SELECT df.value_rupees,
      date_trunc('month', df.new_at)::date AS new_month,
      date_trunc('month', df.won_at)::date AS won_month
    FROM scoped df
  )
  SELECT to_char(mo.m, 'YYYY-MM') AS "month",
    COUNT(*) FILTER (WHERE d.new_month = mo.m)::int AS "newCount",
    COALESCE(SUM(d.value_rupees) FILTER (WHERE d.new_month = mo.m), 0)::float AS "newValue",
    COUNT(*) FILTER (WHERE d.won_month = mo.m)::int AS "wonCount",
    COALESCE(SUM(d.value_rupees) FILTER (WHERE d.won_month = mo.m), 0)::float AS "wonValue"
  FROM months mo
  LEFT JOIN dated d ON d.new_month = mo.m OR d.won_month = mo.m
  GROUP BY mo.m
  ORDER BY mo.m`;

/** $1 the IST today. Everyone with an open deal or a deal new in the last 12 months. */
const PEOPLE_SQL = `WITH ${DEAL_FACTS_CTE}
  SELECT DISTINCT df.person_id AS "id", ${PERSON_NAME} AS "name"
  FROM deal_facts df
  LEFT JOIN users u ON u.id = df.person_id
  WHERE df.person_id IS NOT NULL
    AND (${DEAL_FACTS.open} OR CAST(df.new_at AS date) >= $1::date - interval '12 months')
  ORDER BY "name"`;

type Row = Record<string, unknown>;
const num = (v: unknown): number => Number(v ?? 0);
const TEAM_LIMIT = 8;
const SOURCE_LIMIT = 4;
const MIN_FOR_WIN_RATE = 3;

@Injectable()
export class QuoteDashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getDashboard(input: {
    range: DashboardRange;
    today: string;
    person: string | null;
    financing: 'cash' | 'loan' | null;
  }): Promise<QuotesDashboard> {
    const { range } = input;
    const base = [input.person, input.financing];
    const period = [...base, range.from, range.to];

    const [[s = {}], needsRows, teamRows, bigRows, sourceRows, trendRows, peopleRows] =
      await Promise.all([
        this.rows(STRIP_SQL, [...period, range.previousFrom, range.previousTo]),
        this.rows(NEEDS_SQL, base),
        this.rows(TEAM_SQL, period),
        this.rows(BIGGEST_SQL, base),
        this.rows(SOURCES_SQL, period),
        this.rows(TREND_SQL, [...base, input.today]),
        this.rows(PEOPLE_SQL, [input.today]),
      ]);

    const newCount = num(s.newCount);
    const newLoan = num(s.newLoan);
    const wonOfNew = num(s.wonOfNew);
    const money = (
      k: 'drafting' | 'waiting' | 'quiet',
    ): { count: number; valueRupees: number; kw: number } => ({
      count: num(s[`${k}Count`]),
      valueRupees: num(s[`${k}Value`]),
      kw: num(s[`${k}Kw`]),
    });
    const waiting = money('waiting');
    const quiet = money('quiet');
    const { sources, topSourceKeys } = this.shapeSources(sourceRows);

    return {
      period: range,
      people: peopleRows.map((r) => ({ id: String(r.id), name: String(r.name) })),
      strip: {
        newDeals: { count: newCount, kw: num(s.newKw), loan: newLoan, cash: newCount - newLoan },
        wonValue: {
          valueRupees: num(s.wonValue),
          kw: num(s.wonKw),
          previousValueRupees: num(s.wonValuePrevious),
        },
        winRate: {
          newCount,
          wonOfNew,
          percent: newCount > 0 ? Math.round((wonOfNew * 100) / newCount) : null,
          medianDaysToWin: s.medianDaysToWin == null ? null : Math.round(num(s.medianDaysToWin)),
        },
        pipeline: {
          count: waiting.count + quiet.count,
          valueRupees: waiting.valueRupees + quiet.valueRupees,
          kw: waiting.kw + quiet.kw,
        },
      },
      stages: {
        drafting: money('drafting'),
        waiting,
        quiet,
        won: { count: num(s.wonCount), kw: num(s.wonKw) },
        lost: {
          count: num(s.lostCount),
          topReason: typeof s.topLossReason === 'string' ? leadSourceLabel(s.topLossReason) : null,
        },
      },
      needsAction: DEAL_ATTENTIONS.map((key) => this.shapeNeeds(key, needsRows)),
      team: teamRows.slice(0, TEAM_LIMIT).map((r) => ({
        personId: String(r.personId),
        name: String(r.name),
        drafting: num(r.drafting),
        waiting: num(r.waiting),
        quiet: num(r.quiet),
        open: num(r.open),
        won: num(r.won),
      })),
      teamMore: Math.max(0, teamRows.length - TEAM_LIMIT),
      biggestOpen: bigRows.map((r) => ({
        quoteId: String(r.quoteId),
        customerName: (r.customerName as string | null) ?? null,
        kw: r.kw == null ? null : num(r.kw),
        personName: String(r.personName),
        stage: r.stage === 'waiting' ? 'waiting' : 'quiet',
        days: num(r.days),
        valueRupees: num(r.valueRupees),
      })),
      sources,
      topSourceKeys,
      trend: trendRows.map((r) => ({
        month: String(r.month),
        newCount: num(r.newCount),
        newValueRupees: num(r.newValue),
        wonCount: num(r.wonCount),
        wonValueRupees: num(r.wonValue),
      })),
    };
  }

  private shapeNeeds(key: DealAttention, rows: Row[]): QuotesDashboardNeedsAction {
    const mine = rows.filter((r) => r.key === key);
    return {
      key,
      count: mine.reduce((a, r) => a + num(r.count), 0),
      owners: mine.slice(0, 2).map((r) => ({
        personId: String(r.personId),
        name: String(r.name),
        count: num(r.count),
      })),
      moreOwners: Math.max(0, mine.length - 2),
    };
  }

  private shapeSources(rows: Row[]): {
    sources: QuotesDashboardSource[];
    topSourceKeys: string[];
  } {
    const row = (
      key: string,
      label: string,
      count: number,
      won: number,
    ): QuotesDashboardSource => ({
      key,
      label,
      count,
      won,
      winPercent: count >= MIN_FOR_WIN_RATE ? Math.round((won * 100) / count) : null,
    });
    const top = rows.slice(0, SOURCE_LIMIT);
    const rest = rows.slice(SOURCE_LIMIT);
    const sources = top.map((r) =>
      row(String(r.key), leadSourceLabel(String(r.key)), num(r.count), num(r.won)),
    );
    const restCount = rest.reduce((a, r) => a + num(r.count), 0);
    if (restCount > 0) {
      sources.push(
        row(
          'other',
          'Other',
          restCount,
          rest.reduce((a, r) => a + num(r.won), 0),
        ),
      );
    }
    return { sources, topSourceKeys: top.map((r) => String(r.key)) };
  }

  /** `DataSource.query` returns `any`; this pins the row type once. */
  private async rows(sql: string, params: unknown[]): Promise<Row[]> {
    const result: Row[] = await this.dataSource.query(sql, params);
    return result;
  }
}
