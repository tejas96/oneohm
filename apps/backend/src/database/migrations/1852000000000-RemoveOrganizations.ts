import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { ORG_CLEANUP_ASSERTIONS } from './sql/org-cleanup/01-assertions.sql';
import { ORG_CLEANUP_DROP_COLUMNS } from './sql/org-cleanup/02-drop-columns.sql';
import { ORG_CLEANUP_INDEXES } from './sql/org-cleanup/03-indexes.sql';
import {
  ORG_CLEANUP_CREATE_VIEWS,
  ORG_CLEANUP_DROP_VIEWS,
} from './sql/org-cleanup/04-views.sql';

/**
 * RemoveOrganizations — the app is single-tenant.
 *
 * One organization row ever existed. `organization_id` was carried by 49 tables
 * and ~1,096 query sites where it filtered nothing. This drops the column, the
 * 39 foreign keys and 90 indexes that depended on it (both cascade with the
 * column), and the organizations tables themselves.
 *
 * IRREVERSIBLE. `down()` throws: the column values cannot be reconstructed once
 * the organizations row is gone. Rollback is restore-from-snapshot — see
 * docs/plans/2026-08-07-org-cleanup-design.md §10.
 */
export class RemoveOrganizations1852000000000 implements MigrationInterface {
  name = 'RemoveOrganizations1852000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guards first: every narrowed unique constraint is checked against real
    // data before a single irreversible statement runs.
    for (const statement of ORG_CLEANUP_ASSERTIONS) {
      await queryRunner.query(statement);
    }
    // The views select organization_id, so they block the column drops.
    for (const statement of ORG_CLEANUP_DROP_VIEWS) {
      await queryRunner.query(statement);
    }
    for (const statement of ORG_CLEANUP_DROP_COLUMNS) {
      await queryRunner.query(statement);
    }
    for (const statement of ORG_CLEANUP_INDEXES) {
      await queryRunner.query(statement);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS organization_settings`);
    await queryRunner.query(`DROP TABLE IF EXISTS organizations`);
    for (const statement of ORG_CLEANUP_CREATE_VIEWS) {
      await queryRunner.query(statement);
    }
  }

  public async down(): Promise<void> {
    throw new Error(
      'RemoveOrganizations is irreversible. Restore from the pre-deploy snapshot.',
    );
  }
}
