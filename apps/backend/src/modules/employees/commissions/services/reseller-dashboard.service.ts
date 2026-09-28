import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { CommissionActionsService } from './commission-actions.service';
import { COMMISSION_ROW_SQL } from '../sql/commission-read.sql';
import {
  MISSING_COMMISSIONS_SQL, periodStart, RESELLER_SUMMARY_SQL,
  type MissingRow, type ResellerHeader, type ResellerSummary, type ResellerTotals,
} from '../sql/reseller-dashboard.sql';

type Period = 'month' | 'fy' | 'all' | undefined;

const toInt = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

@Injectable()
export class ResellerDashboardService {
  private readonly logger = new Logger(ResellerDashboardService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly actions: CommissionActionsService,
  ) {}

  async summaries(period: Period, resellerId: string | null = null): Promise<ResellerSummary[]> {
    const start = periodStart(period);
    const raw: Record<string, unknown>[] = await this.dataSource.query(
      RESELLER_SUMMARY_SQL(COMMISSION_ROW_SQL),
      [start, resellerId],
    );
    return raw.map((r) => {
      const quoted = toInt(r.quoted);
      const won = toInt(r.won);
      return {
        ...(r as unknown as ResellerSummary),
        ratePercent: r.ratePercent === null ? null : Number(r.ratePercent),
        leads: toInt(r.leads), quoted, won,
        winRate: quoted === 0 ? null : Math.round((won / quoted) * 1000) / 10,
        revenuePaise: toInt(r.revenuePaise), pendingPaise: toInt(r.pendingPaise),
        owedPaise: toInt(r.owedPaise), paidPaise: toInt(r.paidPaise), toRecoverPaise: toInt(r.toRecoverPaise),
      };
    });
  }

  async list(period: Period) {
    const rows = await this.summaries(period);
    const totals: ResellerTotals = rows.reduce(
      (t, r) => ({
        pendingPaise: t.pendingPaise + r.pendingPaise, owedPaise: t.owedPaise + r.owedPaise,
        paidPaise: t.paidPaise + r.paidPaise, toRecoverPaise: t.toRecoverPaise + r.toRecoverPaise,
      }),
      { pendingPaise: 0, owedPaise: 0, paidPaise: 0, toRecoverPaise: 0 },
    );
    const [{ n }] = await this.dataSource.query(
      `SELECT count(*)::int AS n FROM customer_profiles
        WHERE lead_source = 'reseller' AND reseller_id IS NULL AND deleted_at IS NULL`,
    );
    return { rows, totals, resellerUnknownCount: n as number, periodStart: periodStart(period)?.toISOString() ?? null };
  }

  async detail(resellerId: string, period: Period) {
    const [summary] = await this.summaries(period, resellerId);
    if (!summary) throw new NotFoundException('Reseller not found');
    const [h] = await this.dataSource.query(
      `SELECT ep.id AS "resellerId",
              CASE WHEN ep.deleted_at IS NOT NULL THEN 'deleted'
                   WHEN u.status <> 'active' THEN 'inactive'
                   ELSE ep.status END AS status,
              ep.company_code AS code, ep.commission_percentage::float8 AS "ratePercent",
              COALESCE(NULLIF(ep.company_name, ''), TRIM(u.first_name || ' ' || COALESCE(u.last_name, ''))) AS name,
              ep.bank_name AS "bankName", RIGHT(ep.account_number, 4) AS "accountLast4", ep.gstin, u.phone
         FROM employee_profiles ep JOIN users u ON u.id = ep.user_id WHERE ep.id = $1`,
      [resellerId],
    );
    const commissions = await this.actions.list({ resellerId });
    return { reseller: h as ResellerHeader, summary, commissions, periodStart: periodStart(period)?.toISOString() ?? null };
  }

  async missing() {
    const liveFromRaw = process.env.COMMISSIONS_LIVE_FROM ?? null; // 'YYYY-MM-DD', IST
    let liveFrom = liveFromRaw && /^\d{4}-\d{2}-\d{2}$/.test(liveFromRaw)
      ? new Date(`${liveFromRaw}T00:00:00+05:30`)
      : null;
    // '2026-13-01' passes the pattern but is no date; an Invalid Date would
    // compare false both ways and drop every row from both lists.
    if (liveFrom && Number.isNaN(liveFrom.getTime())) {
      this.logger.warn(`COMMISSIONS_LIVE_FROM="${liveFromRaw}" is not a real date; treating it as unset`);
      liveFrom = null;
    }
    const rows: MissingRow[] = await this.dataSource.query(MISSING_COMMISSIONS_SQL);
    const since = rows.filter((r) => !liveFrom || new Date(r.acceptedAt) >= liveFrom);
    const before = rows.filter((r) => liveFrom && new Date(r.acceptedAt) < liveFrom);
    return { sinceLaunch: since, beforeLaunch: before, liveFrom: liveFrom ? liveFromRaw : null };
  }
}
