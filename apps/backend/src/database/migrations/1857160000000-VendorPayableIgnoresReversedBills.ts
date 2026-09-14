import { MigrationInterface, QueryRunner } from 'typeorm';

import { CREATE_V_VENDOR_PAYABLE } from './sql/ledger/14-vendor-payable.sql';
import { CREATE_V_VENDOR_PAYABLE_V2 } from './sql/ledger/17-vendor-payable-v2.sql';

/**
 * A reversed bill kept counting on Payables. See `17-vendor-payable-v2.sql.ts`.
 *
 * Views hold no data, so both directions are a plain `CREATE OR REPLACE VIEW`:
 * the two editions have the same columns in the same order with the same types.
 * Nothing can be lost either way.
 */
export class VendorPayableIgnoresReversedBills1857160000000 implements MigrationInterface {
  name = 'VendorPayableIgnoresReversedBills1857160000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(CREATE_V_VENDOR_PAYABLE_V2);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(CREATE_V_VENDOR_PAYABLE);
  }
}
