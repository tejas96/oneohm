import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * AddLoanPaymentMilestones — a second payment-terms template for financed sites.
 *
 * The client specified 10/70/20 when a loan is involved: the customer funds a
 * smaller advance and the lender releases the bulk on installation. Nothing in
 * the codebase branched on the loan flag — every quote got the single org
 * template (10/85/5 by default), while the onboarding wizard simultaneously told
 * the operator the customer "pays only 10% advance (vs 30% without)".
 *
 * Additive and defaulted, so existing rows gain a sensible template without any
 * behaviour changing until a quote is raised against a `wants_loan` property.
 */
export class AddLoanPaymentMilestones1851000000011 implements MigrationInterface {
  name = 'AddLoanPaymentMilestones1851000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE quote_configurations
        ADD COLUMN IF NOT EXISTS payment_milestones_loan JSONB NOT NULL
        DEFAULT '[{"stage":"advance","name":"Advance","percentage":10,"order":1},{"stage":"installation_complete","name":"Installation Complete","percentage":70,"order":2},{"stage":"commissioning","name":"Commissioning","percentage":20,"order":3}]'::jsonb
    `);

    // Percentages must total 100 or the derived amounts cannot sum to the
    // contract. Reported rather than enforced — an operator editing the template
    // through the admin screen should be told, not have their migration fail.
    await queryRunner.query(`
      DO $$
      DECLARE bad INT;
      BEGIN
        SELECT COUNT(*) INTO bad
          FROM quote_configurations qc
         WHERE qc.deleted_at IS NULL
           AND (SELECT COALESCE(SUM((m->>'percentage')::numeric), 0)
                  FROM jsonb_array_elements(qc.payment_milestones_loan) m) <> 100;
        IF bad > 0 THEN
          RAISE WARNING 'AddLoanPaymentMilestones: % configuration(s) have loan milestones not summing to 100%%', bad;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE quote_configurations DROP COLUMN IF EXISTS payment_milestones_loan`,
    );
  }
}
