import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBomTables1811000000000 implements MigrationInterface {
  name = 'CreateBomTables1811000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // BOM header
    await queryRunner.query(`
      CREATE TABLE bom (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL,
        bom_number VARCHAR(50) NOT NULL UNIQUE,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'finalized',
        total_items INTEGER NOT NULL DEFAULT 0,
        total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_by UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_bom_entity UNIQUE (entity_type, entity_id)
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_bom_org ON bom(organization_id);`);
    await queryRunner.query(`CREATE INDEX idx_bom_entity ON bom(entity_type, entity_id);`);

    // BOM line items
    await queryRunner.query(`
      CREATE TABLE bom_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bom_id UUID NOT NULL REFERENCES bom(id) ON DELETE CASCADE,
        item_type VARCHAR(50) NOT NULL,
        product_id UUID,
        name VARCHAR(255) NOT NULL,
        brand VARCHAR(100),
        specifications JSONB NOT NULL DEFAULT '{}',
        quantity INTEGER NOT NULL DEFAULT 1,
        unit VARCHAR(20) NOT NULL DEFAULT 'nos',
        unit_price DECIMAL(15,2),
        total_price DECIMAL(15,2),
        gst_rate DECIMAL(5,2),
        gst_amount DECIMAL(15,2),
        warranty_years INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_bom_items_bom ON bom_items(bom_id);`);
    await queryRunner.query(`CREATE INDEX idx_bom_items_type ON bom_items(bom_id, item_type);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS bom_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bom;`);
  }
}
