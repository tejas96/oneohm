import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class DropNotificationConstraints1835000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    `);
    await queryRunner.query(`
      ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_severity_check;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
        type IN ('low_stock', 'po_approved', 'po_received', 'allocation_cancelled', 'dispatch_delayed', 'system')
      );
    `);
    await queryRunner.query(`
      ALTER TABLE notifications ADD CONSTRAINT notifications_severity_check CHECK (
        severity IN ('info', 'warning', 'critical')
      );
    `);
  }
}
