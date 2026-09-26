import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RE arrangement type moves from hand-typed report text to a field on the site.
 *
 * Every site starts on net metering. A project whose hand-typed Annexure value
 * clearly names another type keeps it: "behind" means behind the meter, and
 * "billing" means net billing. Anything else (most rows hold text like
 * "Type Net Metering Arrangement Solar") stays on the default.
 *
 * The old `report_facts.re_arrangement_type` text is left in place: reports no
 * longer read it, and deleting typed text is not reversible.
 */
export class AddReArrangementTypeToProperties1857220000000 implements MigrationInterface {
  name = 'AddReArrangementTypeToProperties1857220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_properties"
         ADD COLUMN "re_arrangement_type" varchar(30) NOT NULL DEFAULT 'net_metering'`,
    );

    await queryRunner.query(
      `UPDATE "customer_properties" AS cp
          SET "re_arrangement_type" = CASE
                WHEN typed.value ILIKE '%behind%' THEN 'behind_the_meter'
                ELSE 'net_billing'
              END
         FROM (
           SELECT DISTINCT ON (p."property_id")
                  p."property_id", p."report_facts"->>'re_arrangement_type' AS value
             FROM "projects" p
            WHERE p."report_facts"->>'re_arrangement_type' ILIKE ANY (ARRAY['%behind%', '%billing%'])
            ORDER BY p."property_id", p."updated_at" DESC
         ) AS typed
        WHERE cp."id" = typed."property_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer_properties" DROP COLUMN "re_arrangement_type"`);
  }
}
