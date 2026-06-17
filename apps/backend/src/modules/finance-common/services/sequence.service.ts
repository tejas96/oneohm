import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { FinanceSequenceScope } from '@tejas96/shared/types';
import { DataSource, EntityManager } from 'typeorm';

/**
 * SequenceService
 *
 * Atomic, concurrency-safe sequence generation backed by the shared
 * `numbering_sequences` table (created in migration 1814000000005).
 *
 * Format: `{PREFIX}-{FY}-{6-digit zero-padded counter}`
 *   e.g. RCP-2026-27-000001, EXP-2026-27-000123
 *
 * The financial year is computed against an India-style April–March cycle,
 * matching the FY semantics used elsewhere in the platform's reporting.
 *
 * The underlying SQL uses an upsert with `RETURNING last_value` so the
 * counter increment and read are atomic — no application-level locks needed.
 */
@Injectable()
export class SequenceService {
  private readonly logger = new Logger(SequenceService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Generate the next sequence number for a given scope.
   *
   * @param organizationId Organization that owns the sequence (multi-tenant isolation).
   * @param scope          Logical sequence (RECEIPT, EXPENSE).
   * @param manager        Optional outer transaction manager — pass when this
   *                       call must participate in an existing DB transaction.
   * @returns Formatted number string, e.g. `RCP-2026-27-000001`.
   */
  async getNextNumber(
    organizationId: string,
    scope: FinanceSequenceScope,
    manager?: EntityManager,
  ): Promise<string> {
    const fy = this.computeFinancialYear(new Date());
    const sequenceKey = `${scope}-${fy}`;
    const prefix = this.getPrefix(scope);

    const exec = manager ?? this.dataSource.manager;
    const rows = await exec.query(
      `INSERT INTO numbering_sequences (organization_id, sequence_key, last_value)
       VALUES ($1, $2, 1)
       ON CONFLICT (organization_id, sequence_key)
       DO UPDATE SET last_value = numbering_sequences.last_value + 1, updated_at = CURRENT_TIMESTAMP
       RETURNING last_value`,
      [organizationId, sequenceKey],
    );

    const raw = rows[0]?.last_value;
    const seq = typeof raw === 'string' ? parseInt(raw, 10) : (raw ?? 1);

    return `${prefix}-${fy}-${String(seq).padStart(6, '0')}`;
  }

  /**
   * Compute India financial year token from a given date.
   * Returns e.g. `2026-27` for any date between 2026-04-01 and 2027-03-31.
   */
  private computeFinancialYear(date: Date): string {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // 1-12
    const startYear = month >= 4 ? year : year - 1;
    const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
    return `${startYear}-${endYearShort}`;
  }

  private getPrefix(scope: FinanceSequenceScope): string {
    switch (scope) {
      case FinanceSequenceScope.RECEIPT:
        return 'RCP';
      case FinanceSequenceScope.EXPENSE:
        return 'EXP';
      default: {
        const exhaustive: never = scope;
        this.logger.error(`Unhandled finance sequence scope: ${String(exhaustive)}`);
        throw new Error('Unsupported finance sequence scope');
      }
    }
  }
}
