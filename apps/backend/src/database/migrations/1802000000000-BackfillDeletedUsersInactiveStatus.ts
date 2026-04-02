import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfill deleted users to archived status and align status constraint.
 *
 * Problem:
 * - Historical soft-deleted users could remain with status='active'.
 * - Product requirement is explicit archived state for deleted users.
 *
 * Fix:
 * - Expand users.status CHECK constraint to allow 'archived'.
 * - For users with deleted_at IS NOT NULL, set status='archived'.
 * - New deletes are also handled in application logic.
 */
export class BackfillDeletedUsersArchivedStatus1802000000000 implements MigrationInterface {
  name = 'BackfillDeletedUsersArchivedStatus1802000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE c RECORD;
      BEGIN
        FOR c IN
          SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          WHERE rel.relname = 'users'
            AND con.contype = 'c'
            AND pg_get_constraintdef(con.oid) ILIKE '%status%'
        LOOP
          EXECUTE format('ALTER TABLE "users" DROP CONSTRAINT IF EXISTS %I', c.conname);
        END LOOP;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "chk_users_status"
      CHECK ("status" IN ('active', 'inactive', 'suspended', 'pending', 'archived'))
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "status" = 'archived',
          "updated_at" = NOW()
      WHERE "deleted_at" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users"
      SET "status" = 'inactive',
          "updated_at" = NOW()
      WHERE "status" = 'archived'
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_status"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "chk_users_status"
      CHECK ("status" IN ('active', 'inactive', 'suspended', 'pending'))
    `);
  }
}
