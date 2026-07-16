import { MigrationInterface, QueryRunner } from 'typeorm';

export class MergeSiteActivitiesIntoProperties1850300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Phase 1: Add new columns to customer_properties
    await queryRunner.query(`
      ALTER TABLE customer_properties
      ADD COLUMN site_status varchar(20) NOT NULL DEFAULT 'pending',
      ADD COLUMN site_visit_done boolean NOT NULL DEFAULT false,
      ADD COLUMN available_roof_area_sqft decimal(10,2) NULL,
      ADD COLUMN shading_analysis jsonb NULL,
      ADD COLUMN site_notes text NULL,
      ADD COLUMN survey_done boolean NOT NULL DEFAULT false,
      ADD COLUMN survey_data jsonb NULL,
      ADD COLUMN site_visit_assignee uuid NULL,
      ADD COLUMN site_survey_assignee uuid NULL,
      ADD COLUMN site_visit_completed_at timestamptz NULL,
      ADD COLUMN site_survey_completed_at timestamptz NULL;
    `);

    // Phase 2: Backfill data from site_activities -> customer_properties
    await queryRunner.query(`
      UPDATE customer_properties cp SET
        site_status = sa.overall_status,
        site_visit_done = sa.is_site_visit_done,
        available_roof_area_sqft = sa.available_roof_area_sqft,
        shading_analysis = sa.shading_analysis,
        site_notes = sa.notes,
        survey_done = sa.is_site_survey_done,
        survey_data = sa.survey_data,
        site_visit_assignee = sa.created_by,
        site_survey_assignee = sa.surveyor_id,
        site_visit_completed_at = COALESCE(
          (sa.metadata->>'visitCompletedAt')::timestamptz,
          CASE WHEN sa.is_site_visit_done THEN sa.updated_at END
        ),
        site_survey_completed_at = sa.completed_at
      FROM site_activities sa
      WHERE sa.customer_property_id = cp.id
        AND sa.deleted_at IS NULL;
    `);

    // Phase 3: Re-map documents
    // First, map documents that can be joined to site_activities (both active and soft-deleted)
    await queryRunner.query(`
      UPDATE documents d SET
        entity_type = 'property',
        entity_id = sa.customer_property_id
      FROM site_activities sa
      WHERE d.entity_type = 'site_activity'
        AND d.entity_id = sa.id;
    `);

    // Safety net: Map any remaining site_activity documents that couldn't be joined to sa
    await queryRunner.query(`
      UPDATE documents SET
        entity_type = 'property',
        entity_id = property_id
      WHERE entity_type = 'site_activity'
        AND property_id IS NOT NULL;
    `);

    // Phase 4: Create indexes on customer_properties site_status
    await queryRunner.query(`
      CREATE INDEX "IDX_customer_properties_site_status" ON customer_properties (site_status) WHERE deleted_at IS NULL;
      CREATE INDEX "IDX_customer_properties_org_site_status" ON customer_properties (organization_id, site_status) WHERE deleted_at IS NULL;
    `);

    // Phase 5: Drop site_activities table
    await queryRunner.query(`DROP TABLE site_activities;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate site_activities table
    await queryRunner.query(`
      CREATE TABLE site_activities (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        organization_id uuid NOT NULL,
        customer_property_id uuid NOT NULL,
        overall_status varchar(20) NOT NULL DEFAULT 'pending',
        is_site_visit_done boolean NOT NULL DEFAULT false,
        available_roof_area_sqft decimal(10,2) NULL,
        shading_analysis jsonb NULL,
        notes text NULL,
        is_site_survey_done boolean NOT NULL DEFAULT false,
        survey_data jsonb NULL,
        surveyor_id uuid NULL,
        completed_at timestamptz NULL,
        metadata jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        created_by uuid NULL,
        updated_by uuid NULL,
        CONSTRAINT "PK_site_activities" PRIMARY KEY (id)
      );
    `);

    // Restore index/FK constraints on site_activities
    await queryRunner.query(`
      ALTER TABLE site_activities
      ADD CONSTRAINT "FK_site_activities_property" FOREIGN KEY (customer_property_id) REFERENCES customer_properties(id) ON DELETE CASCADE;
    `);

    // Insert data back to site_activities from customer_properties
    await queryRunner.query(`
      INSERT INTO site_activities (
        organization_id,
        customer_property_id,
        overall_status,
        is_site_visit_done,
        available_roof_area_sqft,
        shading_analysis,
        notes,
        is_site_survey_done,
        survey_data,
        surveyor_id,
        completed_at,
        metadata,
        created_by,
        updated_by
      )
      SELECT
        organization_id,
        id,
        site_status,
        site_visit_done,
        available_roof_area_sqft,
        shading_analysis,
        site_notes,
        survey_done,
        survey_data,
        site_survey_assignee,
        site_survey_completed_at,
        CASE WHEN site_visit_completed_at IS NOT NULL 
             THEN jsonb_build_object('visitCompletedAt', site_visit_completed_at)
             ELSE NULL END,
        site_visit_assignee,
        updated_by
      FROM customer_properties
      WHERE site_status <> 'pending' OR site_visit_done = true OR survey_done = true;
    `);

    // Restore document entity_type and entity_id mappings
    await queryRunner.query(`
      UPDATE documents d SET
        entity_type = 'site_activity',
        entity_id = sa.id
      FROM site_activities sa
      WHERE d.entity_type = 'property'
        AND d.property_id = sa.customer_property_id
        AND d.tag IN ('site_image', 'front_view', 'roof_view', 'meter_box', 'technical_drawing', 'site_survey');
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_customer_properties_site_status";`);
    await queryRunner.query(`DROP INDEX "IDX_customer_properties_org_site_status";`);

    // Drop columns from customer_properties
    await queryRunner.query(`
      ALTER TABLE customer_properties
      DROP COLUMN site_status,
      DROP COLUMN site_visit_done,
      DROP COLUMN available_roof_area_sqft,
      DROP COLUMN shading_analysis,
      DROP COLUMN site_notes,
      DROP COLUMN survey_done,
      DROP COLUMN survey_data,
      DROP COLUMN site_visit_assignee,
      DROP COLUMN site_survey_assignee,
      DROP COLUMN site_visit_completed_at,
      DROP COLUMN site_survey_completed_at;
    `);
  }
}
