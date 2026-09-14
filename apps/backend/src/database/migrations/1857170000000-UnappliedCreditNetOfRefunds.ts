import { MigrationInterface, QueryRunner } from 'typeorm';

import { CREATE_V_PROJECT_BALANCE_V3 } from './sql/ledger/16-project-balance-v3.sql';
import { CREATE_V_PROJECT_BALANCE_V4 } from './sql/ledger/18-project-balance-v4.sql';

/**
 * Refunded credit kept showing as unapplied credit. See `18-project-balance-v4.sql.ts`.
 *
 * Views hold no data, so both directions are a plain `CREATE OR REPLACE VIEW`:
 * the two editions have the same columns in the same order with the same types.
 * Nothing can be lost either way.
 */
export class UnappliedCreditNetOfRefunds1857170000000 implements MigrationInterface {
  name = 'UnappliedCreditNetOfRefunds1857170000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(CREATE_V_PROJECT_BALANCE_V4);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(CREATE_V_PROJECT_BALANCE_V3);
  }
}
