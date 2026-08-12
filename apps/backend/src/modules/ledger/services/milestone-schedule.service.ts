import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Keeps the payment schedule in step with what is actually happening on site,
 * and flags receivables that have stopped moving.
 *
 * Two client requirements live here:
 *
 *  - **event-driven due dates.** A milestone becomes due when the workflow tasks
 *    carrying its name are complete, not on a date somebody typed months ago.
 *    Only 2 of 533 migrated milestones had a due date at all, which is why
 *    every ageing and overdue figure was fiction.
 *  - **"if something is not moving forward, notify".** A daily sweep over
 *    overdue balances.
 *
 * `@nestjs/schedule` was already registered in `app.module.ts` and had **zero**
 * `@Cron` decorators anywhere in the codebase — the scheduler was initialised
 * and never used.
 */
@Injectable()
export class MilestoneScheduleService {
  private readonly logger = new Logger(MilestoneScheduleService.name);

  /** Grace period between a stage completing and its payment falling due. */
  private static readonly DEFAULT_OFFSET_DAYS = 7;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Set due dates for milestones whose workflow stage has just completed.
   *
   * Only fills `due_date` where it is still unset and the milestone is
   * configured to follow the stage event — a date entered by hand is never
   * overwritten. Idempotent, so re-running is harmless.
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'ledger:derive-due-dates' })
  async deriveDueDatesFromCompletedStages(): Promise<number> {
    // TypeORM returns [rows, affectedCount] for an UPDATE ... RETURNING on
    // postgres — so `result.length` is ALWAYS 2 and says nothing about how many
    // rows changed. Destructure the row array explicitly.
    const [rows] = await this.dataSource.query(
      `UPDATE payment_milestones m
          SET due_date = (c.completed_at::date + COALESCE(m.due_offset_days, $1)),
              due_date_source = 'stage_event',
              updated_at = CURRENT_TIMESTAMP
         FROM v_milestone_completion c
        WHERE c.milestone_id = m.id
          AND c.is_complete
          AND c.completed_at IS NOT NULL
          AND m.status = 'active'
          AND m.due_date IS NULL
          AND m.due_date_source IN ('unset', 'stage_event')
        RETURNING m.id`,
      [MilestoneScheduleService.DEFAULT_OFFSET_DAYS],
    );

    const count = rows?.length ?? 0;
    if (count > 0) {
      this.logger.log(`Derived due dates for ${count} milestone(s) from completed stages`);
    }
    return count;
  }

  /**
   * Set due dates for milestones that have no workflow event to wait for.
   *
   * `fn_payment_stage_work_key` returns NULL for `advance` on purpose — an
   * advance falls due on order confirmation, not on any task finishing, so it
   * has no stage to watch (see migration 11-milestone-stage-mapping). That
   * migration names the offset path as where its due date should come from,
   * and `chk_payment_milestones_due_source` already permits `'offset'`, but
   * nothing ever wrote it: zero rows carried that source.
   *
   * The cost of the gap was that the advance — 105 unpaid milestones and
   * ₹89.3 lakh, the single largest category of receivables — could never age
   * past `current` and so never appeared on the chase list, however long it
   * went unpaid.
   *
   * The basis is the LATER of the project starting and the milestone being
   * created. For an advance, created with the project, that is the project
   * start. For a change order raised months in, it is the day the change order
   * was agreed — which is what a customer would expect to be measured from.
   *
   * Same guarantees as the stage-event path: only fills a `due_date` that is
   * still NULL, never overwrites a manual date, and is idempotent.
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'ledger:derive-offset-due-dates' })
  async deriveDueDatesFromOffset(): Promise<number> {
    const [rows] = await this.dataSource.query(
      `UPDATE payment_milestones m
          SET due_date = (
                GREATEST(
                  COALESCE(pr.start_date, pr.created_at::date),
                  m.created_at::date
                ) + COALESCE(m.due_offset_days, $1)
              ),
              due_date_source = 'offset',
              updated_at = CURRENT_TIMESTAMP
         FROM projects pr
         LEFT JOIN LATERAL (SELECT 1) _ ON TRUE
        WHERE pr.id = m.project_id
          AND pr.deleted_at IS NULL
          AND m.status = 'active'
          AND m.due_date IS NULL
          AND m.due_date_source IN ('unset', 'offset')
          -- Only milestones with no stage to wait for. Anything mapped to a
          -- work stage belongs to the stage-event path above, even if that
          -- stage has not completed yet — giving it an offset date here would
          -- make it due before the work it is meant to follow.
          AND COALESCE(
                NULLIF(BTRIM(m.due_basis_stage), ''),
                fn_payment_stage_work_key(m.stage)
              ) IS NULL
        RETURNING m.id`,
      [MilestoneScheduleService.DEFAULT_OFFSET_DAYS],
    );

    const count = rows?.length ?? 0;
    if (count > 0) {
      this.logger.log(`Derived due dates for ${count} milestone(s) from their start offset`);
    }
    return count;
  }

  /**
   * Daily sweep for receivables that have stopped moving.
   *
   * Reports rather than notifies, for now: the notification module has no
   * finance events and inventing a channel here would be guesswork. The query
   * is the hard part and it is done — wiring it to a listener is a small,
   * separate change once the client says where these should land.
   *
   * Lender-funded milestones are reported separately, because chasing a customer
   * for the bank's share is worse than not chasing at all.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, { name: 'ledger:stalled-payments' })
  async findStalledReceivables(): Promise<StalledReceivable[]> {
    const rows: StalledReceivable[] = await this.dataSource.query(
      `SELECT
         v.milestone_id                                   AS "milestoneId",
         v.project_id                                     AS "projectId",
         pr.project_number                                AS "projectNumber",
         NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '') AS "customerName",
         v.name                                           AS "milestoneName",
         v.payer_type                                     AS "payerType",
         v.balance_paise                                  AS "balancePaise",
         v.days_overdue                                   AS "daysOverdue"
       FROM v_milestone_balance v
       JOIN projects pr                   ON pr.id = v.project_id AND pr.deleted_at IS NULL
       LEFT JOIN customer_properties prop ON prop.id = pr.property_id
       LEFT JOIN customer_profiles cp     ON cp.id = prop.customer_id
       WHERE v.status = 'active'
         AND v.balance_paise > 0
         AND v.days_overdue > 0
       ORDER BY v.days_overdue DESC, v.balance_paise DESC`,
    );

    if (rows.length > 0) {
      const total = rows.reduce((sum, r) => sum + Number(r.balancePaise), 0);
      const fromLender = rows.filter((r) => r.payerType === 'lender').length;
      this.logger.warn(
        `${rows.length} overdue milestone(s) totalling ₹${(total / 100).toLocaleString('en-IN')}${
          fromLender > 0 ? ` (${fromLender} awaiting a lender, not the customer)` : ''
        }`,
      );
    }
    return rows;
  }
}

export interface StalledReceivable {
  milestoneId: string;
  projectId: string;
  projectNumber: string;
  customerName: string | null;
  milestoneName: string;
  payerType: 'customer' | 'lender';
  balancePaise: number;
  daysOverdue: number;
}
