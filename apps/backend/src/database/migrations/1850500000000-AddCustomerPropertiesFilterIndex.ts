import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Composite index to speed up customer-list property-level EXISTS subqueries
 * (propertyType, connectionType, propertyStatus, leadTemperature filters).
 */
export class AddCustomerPropertiesFilterIndex1850500000000 implements MigrationInterface {
  name = 'AddCustomerPropertiesFilterIndex1850500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_properties_filter_lookup
      ON customer_properties (organization_id, customer_id, property_type, connection_type, status, lead_temperature)
      WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_customer_properties_filter_lookup`);
  }
}
