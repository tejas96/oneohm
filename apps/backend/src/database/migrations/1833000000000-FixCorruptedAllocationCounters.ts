import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data correction for allocation 74af389c-1cce-4bc8-89d9-0552fe8110e4
 * (Aluminum Rail Mount, Vishrambag warehouse, project PRJ-ONEOHM_EPC-2026-0003).
 *
 * Root cause: before the ReturnStockAllocationDto fix, the `returnToStock`
 * controller read `quantity` from the request body without a DTO, so
 * class-transformer never ran @Type(() => Number). The value arrived as the
 * string "1" instead of the number 1. Inside the service, the arithmetic
 *   Number(allocation.returnedQuantity) + quantity
 * became  0 + "1" = "01" (JS string concatenation), and subsequent calls
 * compounded it to "011", "0111", etc. Because the serialised value was
 * stored as a VARCHAR/DECIMAL the DB cast it to 1 each time, but the guard
 *   quantity > maxReturnQty   →   "1" > 0   →   true (string > number)
 * always passed, allowing unlimited re-dispatch/re-return cycles.
 *
 * Actual history for this allocation (from inventory_transactions):
 *   17:23  ALLOCATION  +1   (stock reserved for BOM)
 *   17:55  DISPATCH    +1   (legitimate — from material dispatch MD-202605-0013)
 *   17:56  RETURN      +1   (bogus test #1)
 *   18:05  DISPATCH    +1   (bogus test #1)
 *   18:06  RETURN      +1   (bogus test #2)
 *   18:07  DISPATCH    +1   (bogus test #2)
 *   18:07  RETURN      +1   (bogus test #3)
 *   18:14  DISPATCH    +1   (bogus test #3)
 *   18:14  RETURN      +1   (bogus test #4)  ← last return — DB still shows "Return stock" button
 *
 * Correct final state:
 *   dispatched_quantity = 1  (one real dispatch via material dispatch)
 *   returned_quantity   = 0  (no legitimate return ever happened)
 *   status              = 'dispatched'  (1/1 dispatched)
 *
 * inventory_stock is already correct (available=6, reserved=0) because each
 * bogus return (+1 available) was exactly cancelled by its paired re-dispatch
 * (-1 available). Only the allocation counters and spurious transaction rows
 * are wrong.
 */
export class FixCorruptedAllocationCounters1833000000000 implements MigrationInterface {
  name = 'FixCorruptedAllocationCounters1833000000000';

  private readonly ALLOCATION_ID = '74af389c-1cce-4bc8-89d9-0552fe8110e4';
  private readonly PRODUCT_ID = '64e662bf-25bc-43e2-acf4-b8e4df8c0aa4';
  private readonly WAREHOUSE_ID = '7adb2780-a696-405b-8598-ff5f38760e27';
  private readonly ORG_ID = '9f6d06b2-d7b6-48f6-ba38-66af76c4ca27';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Reset the allocation counters to their correct values.
    await queryRunner.query(
      `UPDATE stock_allocations
         SET dispatched_quantity = 1,
             returned_quantity   = 0,
             status              = 'dispatched',
             updated_at          = NOW()
       WHERE id              = $1
         AND organization_id = $2`,
      [this.ALLOCATION_ID, this.ORG_ID],
    );

    // 2. Remove the bogus return + re-dispatch cycles from the transaction log.
    //    Keep:
    //      • The original ALLOCATION transaction (referenceType = 'stock_allocation',
    //        transactionType = 'allocation', ~17:23)
    //      • The first DISPATCH via material dispatch (referenceType = 'material_dispatch',
    //        ~17:55) — this is the only legitimate dispatch
    //    Delete everything after that: 4 RETURN rows + 4 DISPATCH rows that all
    //    have referenceType = 'stock_allocation' or 'stock_allocation_return'.
    await queryRunner.query(
      `DELETE FROM inventory_transactions
        WHERE product_id    = $1
          AND warehouse_id  = $2
          AND organization_id = $3
          AND reference_type IN ('stock_allocation_return', 'stock_allocation')
          AND transaction_type IN ('return', 'dispatch')`,
      [this.PRODUCT_ID, this.WAREHOUSE_ID, this.ORG_ID],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the corrupted values (for rollback testing only — not for production use).
    await queryRunner.query(
      `UPDATE stock_allocations
         SET dispatched_quantity = 5,
             returned_quantity   = 4,
             status              = 'dispatched',
             updated_at          = NOW()
       WHERE id              = $1
         AND organization_id = $2`,
      [this.ALLOCATION_ID, this.ORG_ID],
    );
  }
}
