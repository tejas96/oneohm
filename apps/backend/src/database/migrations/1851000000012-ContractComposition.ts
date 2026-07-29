import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { CREATE_V_PROJECT_BALANCE } from './sql/ledger/06-views.sql';
import { ADD_CONTRACT_COMPOSITION } from './sql/ledger/12-contract-composition.sql';

/**
 * ContractComposition — show where a project's contract value came from.
 *
 * `contract_paise` is the quote plus every change order agreed since, but
 * nothing exposed the split. The project list showed the quote under "Value"
 * while the project's Money tab showed the contract under "Contract" — both
 * correct, and irreconcilable without counting milestones by hand.
 *
 * Adds `quoted_paise` and `change_order_paise`, summed from the same
 * `payment_milestones` rows the total comes from, so they always reconstruct it.
 * Additive: no existing column or value changes.
 */
export class ContractComposition1851000000012 implements MigrationInterface {
  name = 'ContractComposition1851000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of ADD_CONTRACT_COMPOSITION) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // CREATE OR REPLACE cannot drop columns, so restore by dropping first.
    await queryRunner.query(`DROP VIEW IF EXISTS v_project_balance`);
    await queryRunner.query(CREATE_V_PROJECT_BALANCE);
  }
}
