import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: CreateSavedViewsTable
 *
 * Per-user saved filter sets for inventory list pages. Scoped by
 * (organization_id, user_id, resource), with a unique name per triplet.
 * `resource` is VARCHAR with a CHECK constraint (no Postgres ENUM, matches
 * the project-wide convention introduced by notifications + numbering
 * sequences). Adding a new resource later requires updating the CHECK
 * constraint and the per-resource filter allow-list in the saved-views
 * module.
 */
export class CreateSavedViewsTable1825000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE saved_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        user_id UUID NOT NULL,

        resource VARCHAR(50) NOT NULL
          CHECK (resource IN (
            'inventory-stock',
            'inventory-transactions',
            'purchase-orders',
            'material-dispatches',
            'stock-allocations',
            'vendors',
            'warehouses'
          )),

        name VARCHAR(100) NOT NULL,
        filters JSONB NOT NULL DEFAULT '{}'::jsonb,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_saved_views_owner_name
      ON saved_views(organization_id, user_id, resource, name)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_saved_views_owner_resource
      ON saved_views(organization_id, user_id, resource)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS saved_views`);
  }
}
