import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLookupsTable1803000000000 implements MigrationInterface {
  name = 'CreateLookupsTable1803000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "lookups" (
        "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
        "type_code"     VARCHAR(100) NOT NULL,
        "code"          VARCHAR(100) NOT NULL,
        "label"         VARCHAR(255) NOT NULL,
        "value"         VARCHAR(1000) NULL,
        "data_type"     VARCHAR(20) NULL,
        "scope_type"    VARCHAR(20) NOT NULL DEFAULT 'global',
        "scope_id"      UUID NULL,
        "parent_id"     UUID NULL,
        "depends_on_id" UUID NULL,
        "order_index"   INTEGER NOT NULL DEFAULT 0,
        "color"         VARCHAR(50) NULL,
        "icon"          VARCHAR(100) NULL,
        "is_active"     BOOLEAN NOT NULL DEFAULT true,
        "metadata"      JSONB NULL,
        "created_by"    UUID NULL,
        "updated_by"    UUID NULL,
        "created_at"    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at"    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at"    TIMESTAMPTZ NULL,
        CONSTRAINT "pk_lookups" PRIMARY KEY ("id"),
        CONSTRAINT "fk_lookups_parent_id"
          FOREIGN KEY ("parent_id") REFERENCES "lookups"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_lookups_depends_on_id"
          FOREIGN KEY ("depends_on_id") REFERENCES "lookups"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_lookups_type_code"
        ON "lookups" ("type_code")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_lookups_scope"
        ON "lookups" ("scope_type", "scope_id")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_lookups_parent_id"
        ON "lookups" ("parent_id")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_lookups_type_code_code_scope"
        ON "lookups" (
          "type_code",
          "code",
          COALESCE("scope_type", ''),
          COALESCE("scope_id"::text, '')
        )
        WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_lookups_type_code_code_scope"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_lookups_parent_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_lookups_scope"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_lookups_type_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lookups"`);
  }
}
