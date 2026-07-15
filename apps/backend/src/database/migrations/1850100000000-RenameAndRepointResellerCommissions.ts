import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: RenameAndRepointResellerCommissions
 *
 * Part 2/3 of the reseller_profiles → employee_profiles merge.
 * reseller_commissions is renamed to employee_commissions (column
 * reseller_id → employee_id) and repointed from resellers/reseller_profiles
 * to employee_profiles. quotes.reseller_id is also repointed to
 * employee_profiles — the column name itself stays as-is on `quotes`
 * (it's a legitimate, still-accurate business term: "which reseller sold
 * this quote"; only the FK target table changes).
 *
 * Table rename + column rename + constraint rename + FK repoint are combined
 * into this single migration rather than split, since they all operate on
 * the same table/columns and splitting would leave an inconsistent
 * intermediate state with no benefit.
 *
 * No data backfill is needed: reseller_commissions (like reseller_profiles)
 * is empty in every environment at the time of this migration.
 */
export class RenameAndRepointResellerCommissions1850100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 1. Rename table + column
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE reseller_commissions RENAME TO employee_commissions;
    `);

    await queryRunner.query(`
      ALTER TABLE employee_commissions RENAME COLUMN reseller_id TO employee_id;
    `);

    // ============================================================
    // 2. Rename indexes (reseller_* -> employee_*)
    // ============================================================
    await queryRunner.query(`
      ALTER INDEX IF EXISTS idx_commissions_organization_reseller
      RENAME TO idx_commissions_organization_employee;
    `);

    // ============================================================
    // 3. Drop + recreate the FK on employee_commissions.employee_id,
    //    now pointing at employee_profiles instead of resellers/reseller_profiles
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE employee_commissions
      DROP CONSTRAINT IF EXISTS FK_reseller_commissions_reseller_id;
    `);

    await queryRunner.query(`
      ALTER TABLE employee_commissions
      ADD CONSTRAINT FK_employee_commissions_employee_id
      FOREIGN KEY (employee_id) REFERENCES employee_profiles(id) ON DELETE CASCADE;
    `);

    // ============================================================
    // 4. Repoint quotes.reseller_id FK to employee_profiles
    //    (column name stays `reseller_id` — deliberate, see class docblock)
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE quotes
      DROP CONSTRAINT IF EXISTS FK_quotes_reseller_id;
    `);

    await queryRunner.query(`
      ALTER TABLE quotes
      ADD CONSTRAINT FK_quotes_reseller_id
      FOREIGN KEY (reseller_id) REFERENCES employee_profiles(id) ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 1. Revert quotes.reseller_id FK back to reseller_profiles
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE quotes
      DROP CONSTRAINT IF EXISTS FK_quotes_reseller_id;
    `);

    await queryRunner.query(`
      ALTER TABLE quotes
      ADD CONSTRAINT FK_quotes_reseller_id
      FOREIGN KEY (reseller_id) REFERENCES reseller_profiles(id) ON DELETE SET NULL;
    `);

    // ============================================================
    // 2. Revert employee_commissions FK back to reseller_profiles
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE employee_commissions
      DROP CONSTRAINT IF EXISTS FK_employee_commissions_employee_id;
    `);

    await queryRunner.query(`
      ALTER TABLE employee_commissions
      ADD CONSTRAINT FK_reseller_commissions_reseller_id
      FOREIGN KEY (employee_id) REFERENCES reseller_profiles(id) ON DELETE CASCADE;
    `);

    // ============================================================
    // 3. Revert index rename
    // ============================================================
    await queryRunner.query(`
      ALTER INDEX IF EXISTS idx_commissions_organization_employee
      RENAME TO idx_commissions_organization_reseller;
    `);

    // ============================================================
    // 4. Revert column + table rename
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE employee_commissions RENAME COLUMN employee_id TO reseller_id;
    `);

    await queryRunner.query(`
      ALTER TABLE employee_commissions RENAME TO reseller_commissions;
    `);
  }
}
