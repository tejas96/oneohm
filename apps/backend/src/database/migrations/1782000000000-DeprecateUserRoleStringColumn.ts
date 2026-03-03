import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Deprecate User Role String Column
 * Makes user_roles.role nullable so new role assignments can use role_id only.
 * Must run before the IAM seed migration.
 */
export class DeprecateUserRoleStringColumn1782000000000 implements MigrationInterface {
  name = 'DeprecateUserRoleStringColumn1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_roles" ALTER COLUMN "role" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "user_roles" SET "role" = 'legacy' WHERE "role" IS NULL`);
    await queryRunner.query(`ALTER TABLE "user_roles" ALTER COLUMN "role" SET NOT NULL`);
  }
}
