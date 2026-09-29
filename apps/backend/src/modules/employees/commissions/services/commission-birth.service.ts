import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  commissionAmount,
  commissionBase,
  type CommissionPricingInput,
} from '@tejas96/shared/utils';
import { DataSource, type EntityManager } from 'typeorm';

/**
 * Makes the one commission a reseller's accepted quote earns.
 *
 * DataSource only, no module imports — QuotesModule depends on this and the
 * employees/commissions module graph must not be pulled into it.
 *
 * Idempotent through `uq_employee_commissions_quote`: a second call for the
 * same quote (double tap, retry, Fix strip after a hook that did succeed) is
 * a no-op and returns null.
 */
@Injectable()
export class CommissionBirthService {
  private readonly logger = new Logger(CommissionBirthService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createForAcceptedQuote(
    quoteId: string,
    actorUserId: string,
    manager?: EntityManager,
  ): Promise<string | null> {
    return this.insert(quoteId, actorUserId, null, manager);
  }

  /** Fix strip "Dismiss": the quote is handled, and never earns a payable row. */
  async dismissMissing(quoteId: string, note: string, actorUserId: string): Promise<string | null> {
    return this.insert(quoteId, actorUserId, `Dismissed: ${note}`);
  }

  private async insert(
    quoteId: string,
    actorUserId: string,
    dismissReason: string | null,
    manager?: EntityManager,
  ): Promise<string | null> {
    const m = manager ?? this.dataSource.manager;

    const rows: Array<{
      reseller_id: string | null;
      status: string;
      voided_at: Date | null;
      commission_percentage: string | null;
      pricing: CommissionPricingInput | null;
    }> = await m.query(
      `SELECT q.reseller_id, q.status, q.voided_at, ep.commission_percentage,
              v.quote_snapshot -> 'pricing' AS pricing
         FROM quotes q
         LEFT JOIN employee_profiles ep ON ep.id = q.reseller_id
         LEFT JOIN LATERAL (
           SELECT quote_snapshot FROM quote_versions
            WHERE quote_id = q.id ORDER BY version_number DESC LIMIT 1
         ) v ON true
        WHERE q.id = $1 AND q.deleted_at IS NULL`,
      [quoteId],
    );

    const quote = rows[0];
    if (!quote?.reseller_id) return null;
    if (quote.status !== 'accepted' || quote.voided_at) return null;

    const { base, source: baseSource } = commissionBase(quote.pricing);
    const rateMissing = quote.commission_percentage === null;
    const rate = rateMissing ? 0 : Number(quote.commission_percentage);
    const amount = commissionAmount(base, rate);

    // Spec §5: a 0% reseller earns nothing, and the quote counts as handled.
    const cancelReason = dismissReason ?? (!rateMissing && rate === 0 ? 'Rate is 0%' : null);

    // Unlike UPDATE/DELETE ... RETURNING, an INSERT ... RETURNING on postgres
    // returns the row array directly (no [rows, rowCount] wrapper) — safe to
    // index straight into `inserted[0]` below.
    const inserted: Array<{ id: string }> = await m.query(
      `INSERT INTO employee_commissions
         (employee_id, quote_id, base_amount, commission_percentage, commission_amount,
          base_source, rate_source, status, cancel_reason, created_by, updated_by,
          created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, now(), now())
       ON CONFLICT (quote_id) DO NOTHING
       RETURNING id`,
      [
        quote.reseller_id,
        quoteId,
        base,
        rate,
        amount,
        baseSource,
        rateMissing ? 'missing' : 'profile',
        cancelReason ? 'cancelled' : 'pending',
        cancelReason,
        actorUserId,
      ],
    );

    const id = inserted[0]?.id ?? null;
    if (id) {
      this.logger.log(
        `Commission ${id} for quote ${quoteId}: ₹${amount} (${baseSource}, ${rate}%)`,
      );
    }
    return id;
  }
}
