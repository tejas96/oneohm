import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { commissionAmount } from '@tejas96/shared/utils';
import { DataSource, type EntityManager } from 'typeorm';

import type { CurrentUserType } from '../../../auth/types';
import type { EditCommissionDto } from '../dto';
import { COMMISSION_ROW_SQL, toCommissionRow, type CommissionRow } from '../sql/commission-read.sql';
import { requirePermission } from '../utils/require-permission';

export const CHANGED = 'This commission changed while you were looking at it. Reload and try again.';

@Injectable()
export class CommissionActionsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(filter: { resellerId?: string; state?: string }): Promise<CommissionRow[]> {
    const params: unknown[] = [];
    let sql = COMMISSION_ROW_SQL;
    if (filter.resellerId) {
      params.push(filter.resellerId);
      sql += ` AND c.employee_id = $${params.length}`;
    }
    sql = `SELECT * FROM (${sql}) r`;
    if (filter.state) {
      params.push(filter.state);
      sql += ` WHERE r.state = $${params.length}`;
    }
    sql += ` ORDER BY r."acceptedAt" DESC NULLS LAST`;
    const rows: Record<string, unknown>[] = await this.dataSource.query(sql, params);
    return rows.map(toCommissionRow);
  }

  async getOne(id: string, manager?: EntityManager): Promise<CommissionRow> {
    const m = manager ?? this.dataSource.manager;
    const rows: Record<string, unknown>[] = await m.query(`${COMMISSION_ROW_SQL} AND c.id = $1`, [id]);
    if (!rows[0]) throw new NotFoundException('Commission not found');
    return toCommissionRow(rows[0]);
  }

  async approve(id: string, user: CurrentUserType): Promise<CommissionRow> {
    requirePermission(user, 'finance.payments.record');
    return this.dataSource.transaction(async (m) => {
      await this.lock(m, id);
      const row = await this.getOne(id, m);
      if (row.state === 'on_hold') {
        throw new BadRequestException('The site for this deal is marked lost. Reopen the site or cancel this commission.');
      }
      if (row.state === 'needs_amount') {
        throw new BadRequestException('Set the base or the rate first — one of them is missing.');
      }
      if (row.state !== 'pending') throw new ConflictException(`This commission is ${row.state.replace(/_/g, ' ')}.`);
      if (row.amountPaise <= 0) throw new BadRequestException('A ₹0 commission cannot be approved. Edit it or cancel it.');

      const done = await m.query(
        `UPDATE employee_commissions
            SET status = 'approved', approved_at = now(), approved_by = $2, updated_by = $2, updated_at = now()
          WHERE id = $1 AND status = 'pending'
          RETURNING id`,
        [id, user.id],
      );
      if (done.length !== 1) throw new ConflictException(CHANGED);
      return this.getOne(id, m);
    });
  }

  /** Pending, or approved with no payout in review. Always lands back in Pending (spec §6.2). */
  async edit(id: string, dto: EditCommissionDto, user: CurrentUserType): Promise<CommissionRow> {
    requirePermission(user, 'finance.payments.record');
    if (dto.baseAmount === undefined && dto.ratePercent === undefined) {
      throw new BadRequestException('Change the base, the rate, or both.');
    }
    return this.dataSource.transaction(async (m) => {
      await this.lock(m, id);
      const row = await this.getOne(id, m);
      const editable =
        row.status === 'pending' || (row.status === 'approved' && row.payoutRequestId === null);
      if (!editable) {
        throw new ConflictException(
          row.payoutRequestId
            ? 'A payment for this commission is in review. Reject or withdraw it first.'
            : `A ${row.state.replace(/_/g, ' ')} commission cannot be edited.`,
        );
      }

      const base = dto.baseAmount ?? row.basePaise / 100;
      const rate = dto.ratePercent ?? row.ratePercent;
      const amount = commissionAmount(base, rate);
      const stamp = `[${new Date().toISOString().slice(0, 10)}] Edited: ${dto.reason}`;

      const done = await m.query(
        `UPDATE employee_commissions
            SET base_amount = $2, commission_percentage = $3, commission_amount = $4,
                base_source = CASE WHEN $5::boolean THEN 'manual' ELSE base_source END,
                rate_source = CASE WHEN $6::boolean THEN 'manual' ELSE rate_source END,
                status = 'pending', approved_at = NULL, approved_by = NULL,
                notes = CONCAT_WS(E'\\n', notes, $7::text),
                updated_by = $8, updated_at = now()
          WHERE id = $1 AND status = $9 AND payout_request_id IS NULL
          RETURNING id`,
        [id, base, rate, amount, dto.baseAmount !== undefined, dto.ratePercent !== undefined, stamp, user.id, row.status],
      );
      if (done.length !== 1) throw new ConflictException(CHANGED);
      return this.getOne(id, m);
    });
  }

  async cancel(id: string, reason: string, user: CurrentUserType): Promise<CommissionRow> {
    requirePermission(user, 'finance.payments.record');
    return this.dataSource.transaction(async (m) => {
      await this.lock(m, id);
      const done = await m.query(
        `UPDATE employee_commissions
            SET status = 'cancelled', cancel_reason = $2, updated_by = $3, updated_at = now()
          WHERE id = $1 AND status IN ('pending', 'approved') AND payout_request_id IS NULL
          RETURNING id`,
        [id, reason, user.id],
      );
      if (done.length !== 1) {
        const row = await this.getOne(id, m);
        throw new ConflictException(
          row.payoutRequestId
            ? 'A payment for this commission is in review. Reject or withdraw it first.'
            : `A ${row.state.replace(/_/g, ' ')} commission cannot be cancelled.`,
        );
      }
      return this.getOne(id, m);
    });
  }

  /** Row lock so two admins cannot race; the conditional UPDATEs are the second line. */
  async lock(m: EntityManager, id: string): Promise<void> {
    const rows = await m.query(`SELECT id FROM employee_commissions WHERE id = $1 FOR UPDATE`, [id]);
    if (!rows[0]) throw new NotFoundException('Commission not found');
  }
}
