import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Record which lender a customer named when they asked for financing.
 *
 * `customer_properties.wants_loan` has always been the whole of it: a yes/no
 * that reveals the KYC upload slots and nothing more. Which bank the customer
 * was actually going to — the one fact the finance team needs to chase the
 * disbursement — was never asked anywhere, on web or on mobile.
 *
 * `loan_applications.lender_name` is not that answer. It exists, but nothing in
 * either app ever creates a loan application, so the column has stayed empty
 * and the site's Finance tab prints "Lender not set" forever. It is also a
 * later, harder fact: where the customer *applied*, entered by finance after
 * the fact. This column is the earlier, softer one — where the customer said
 * they would go, captured by the rep at the door. Both are worth having, and
 * they belong to different rows because they are answered by different people
 * at different times.
 *
 * Free text, not an FK or an enum. The list of lenders lives in `BANKS` in the
 * shared package, and this stores either one of its codes or the name a rep
 * typed under "Other" — the same shape `customer_profiles.lead_source` already
 * has, where the literal word "other" is never what gets written down.
 *
 * REVERTING: `down()` drops the column and the answers with it. Nothing
 * computes from it, so nothing else breaks.
 */
export class PropertyFinancingBank1857040000000 implements MigrationInterface {
  name = 'PropertyFinancingBank1857040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE customer_properties ADD COLUMN IF NOT EXISTS financing_bank VARCHAR(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE customer_properties DROP COLUMN IF EXISTS financing_bank`,
    );
  }
}
