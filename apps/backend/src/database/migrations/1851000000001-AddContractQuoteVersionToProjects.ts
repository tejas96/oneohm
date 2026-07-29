import { type MigrationInterface, type QueryRunner } from 'typeorm';

import {
  ADD_CONTRACT_QUOTE_VERSION,
  DROP_CONTRACT_QUOTE_VERSION,
} from './sql/ledger/02-projects-contract-version.sql';

/**
 * AddContractQuoteVersionToProjects — M2 of the finance rebuild.
 *
 * Pins each project to the quote version its payment schedule came from, so a
 * later quote revision can no longer silently re-price a signed deal. Purely
 * additive: no existing column or behaviour changes.
 */
export class AddContractQuoteVersionToProjects1851000000001 implements MigrationInterface {
  name = 'AddContractQuoteVersionToProjects1851000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of ADD_CONTRACT_QUOTE_VERSION) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of DROP_CONTRACT_QUOTE_VERSION) {
      await queryRunner.query(statement);
    }
  }
}
