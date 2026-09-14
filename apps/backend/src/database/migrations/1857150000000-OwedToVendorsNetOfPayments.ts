import { MigrationInterface, QueryRunner } from 'typeorm';

import { CREATE_V_PROJECT_BALANCE_V2 } from './sql/ledger/15-project-balance-v2.sql';
import { CREATE_V_PROJECT_BALANCE_V3 } from './sql/ledger/16-project-balance-v3.sql';

/**
 * A paid vendor bill was charged to its project twice. See
 * `16-project-balance-v3.sql.ts` for the proof and the fix.
 *
 * Views hold no data, so both directions are a plain `CREATE OR REPLACE VIEW`:
 * V2 and V3 have the same columns in the same order with the same types, and
 * only one column's expression differs. Nothing can be lost either way.
 */
export class OwedToVendorsNetOfPayments1857150000000 implements MigrationInterface {
  name = 'OwedToVendorsNetOfPayments1857150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(CREATE_V_PROJECT_BALANCE_V3);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(CREATE_V_PROJECT_BALANCE_V2);
  }
}
