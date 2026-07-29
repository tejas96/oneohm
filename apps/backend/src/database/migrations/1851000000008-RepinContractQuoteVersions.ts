import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { REPIN_CONTRACT_VERSIONS } from './sql/ledger/09-repin-contract-versions.sql';

/**
 * RepinContractQuoteVersions — closes the gap M2 could not.
 *
 * M2 (1851000000001) pinned every project that existed when it ran, but the
 * conversion code never set the pin, so projects created afterwards landed with
 * a NULL contract_quote_version_id and would have kept it forever. The code fix
 * lives in ProjectService.pickContractQuoteVersion; this catches the rows that
 * slipped through in between.
 *
 * `down()` is deliberately a no-op: un-pinning a contract would reintroduce the
 * exact drift this exists to prevent.
 */
export class RepinContractQuoteVersions1851000000008 implements MigrationInterface {
  name = 'RepinContractQuoteVersions1851000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of REPIN_CONTRACT_VERSIONS) {
      await queryRunner.query(statement);
    }
  }

  public async down(): Promise<void> {
    // Intentionally empty. Removing a pin cannot be the right answer.
  }
}
