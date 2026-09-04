import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TRANSITIONAL — Task 20 must drop all three of these defaults.
 *
 * Tasks 7 and 8 made bom_items.pricing_basis, unit_price_paise and source
 * NOT NULL. None of the three is mapped on BomItemEntity, and the legacy
 * bom.service.ts still inserts through that entity — so from the moment those
 * constraints landed, every INSERT raised a not-null violation.
 *
 * That failure is invisible, which is what makes it urgent. Both live callers
 * swallow it: quote-calculator.controller.ts persistBom() and
 * project.service.ts copyQuoteBomToProject() each wrap the call in a try/catch
 * that only logger.warn()s. So saving a quote or creating a project appeared to
 * succeed while silently producing no BOM at all — exactly the class of failure
 * this rebuild exists to remove. The unit suite stays green because it never
 * performs a real insert.
 *
 * Column defaults close the window without touching the legacy writer, which
 * Tasks 10, 15 and 16 delete anyway:
 *
 *   source        = 'quote'     the legacy path only ever creates
 *                               quote-derived lines
 *   pricing_basis = 'per_unit'  the same fallback Task 7's own migration used
 *                               for products whose type declares no basis
 *   unit_price_paise = 0        deliberately a visible-but-wrong zero
 *
 * On that zero: the legacy writer populates the old total_price / unit_price
 * columns, which the pre-Task-16 read path still sums, so a 0 here costs
 * nothing today and is preferable to a hard failure. It becomes wrong the
 * moment Task 16 switches the read path onto unit_price_paise — but Task 16
 * also replaces the call sites that rely on this default, so the two land
 * together.
 *
 * WHY TASK 20 MUST DROP THEM: once the real writer supplies all three columns
 * explicitly, a default is no longer a safety net, it is a silent wrong answer.
 * A caller that forgets `source` would get 'quote' on a site-added line, and a
 * caller that forgets a price would book a free one. The NOT NULL constraints
 * are meant to catch exactly that, and these defaults disarm them.
 */
export class BomItemTransitionalDefaults1856600000000 implements MigrationInterface {
  name = 'BomItemTransitionalDefaults1856600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN source SET DEFAULT 'quote'`);
    await queryRunner.query(
      `ALTER TABLE bom_items ALTER COLUMN pricing_basis SET DEFAULT 'per_unit'`,
    );
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN unit_price_paise SET DEFAULT 0`);

    // quoted_quantity is deliberately left without a default. It is still
    // nullable, so the legacy writer does not trip on it, and a NULL there
    // reads honestly as "this line was never quoted" — which a 0 would not.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN unit_price_paise DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN pricing_basis DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE bom_items ALTER COLUMN source DROP DEFAULT`);
  }
}
