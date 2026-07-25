import { type MigrationInterface, type QueryRunner } from 'typeorm';

const CHANGE_REQUEST_STEP_CODES = [
  'COR-001',
  'COR-002',
  'COR-003',
  'COR-004',
  'COR-005',
  'COR-006',
] as const;

const CHANGE_REQUEST_TEMPLATES = [
  {
    code: 'COR-001',
    changeRequestType: 'consumer_name_change',
    name: 'Consumer Name Change',
    description: 'Process consumer name change request on electricity bill',
  },
  {
    code: 'COR-002',
    changeRequestType: 'name_spelling_correction',
    name: 'Consumer Name Spelling Correction',
    description: 'Correct spelling of consumer name on electricity bill',
  },
  {
    code: 'COR-003',
    changeRequestType: 'property_type_change',
    name: 'Property Type Change',
    description: 'Process property type change request',
  },
  {
    code: 'COR-004',
    changeRequestType: 'load_change',
    name: 'Load Change',
    description: 'Process sanctioned load / phase change request',
  },
  {
    code: 'COR-005',
    changeRequestType: 'new_ev_meter',
    name: 'New EV Meter',
    description: 'Process new EV meter installation request',
  },
  {
    code: 'COR-006',
    changeRequestType: 'new_connection',
    name: 'New Connection',
    description: 'Process new electricity connection request',
  },
] as const;

export class AddPropertyChangeRequestsAndSpecialTasks1850700000000 implements MigrationInterface {
  name = 'AddPropertyChangeRequestsAndSpecialTasks1850700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_properties
      ADD COLUMN IF NOT EXISTS change_requests JSONB NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE workflow_steps
      ADD COLUMN IF NOT EXISTS is_special BOOLEAN NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE workflow_steps
      ADD COLUMN IF NOT EXISTS change_request_type VARCHAR(50)
    `);

    await queryRunner.query(`
      ALTER TABLE project_tasks
      ADD COLUMN IF NOT EXISTS is_special BOOLEAN NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE project_tasks
      ADD COLUMN IF NOT EXISTS change_request_type VARCHAR(50)
    `);

    await queryRunner.query(`
      ALTER TABLE project_tasks
      ADD COLUMN IF NOT EXISTS source_change_request_index INTEGER
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_steps_org_change_request_type
      ON workflow_steps (organization_id, change_request_type)
      WHERE deleted_at IS NULL AND change_request_type IS NOT NULL
    `);

    const orgs: Array<{ id: string }> = await queryRunner.query(`SELECT id FROM organizations`);

    if (!orgs || orgs.length === 0) {
      console.warn('No organizations found — skipping change-request workflow step seeding.');
      return;
    }

    for (const org of orgs) {
      await this.seedChangeRequestStepsForOrganization(queryRunner, org.id);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const placeholders = CHANGE_REQUEST_STEP_CODES.map((_, i) => `$${i + 1}`).join(', ');
    await queryRunner.query(`DELETE FROM workflow_steps WHERE code IN (${placeholders})`, [
      ...CHANGE_REQUEST_STEP_CODES,
    ]);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_workflow_steps_org_change_request_type`);

    await queryRunner.query(`
      ALTER TABLE project_tasks DROP COLUMN IF EXISTS source_change_request_index
    `);
    await queryRunner.query(`
      ALTER TABLE project_tasks DROP COLUMN IF EXISTS change_request_type
    `);
    await queryRunner.query(`
      ALTER TABLE project_tasks DROP COLUMN IF EXISTS is_special
    `);

    await queryRunner.query(`
      ALTER TABLE workflow_steps DROP COLUMN IF EXISTS change_request_type
    `);
    await queryRunner.query(`
      ALTER TABLE workflow_steps DROP COLUMN IF EXISTS is_special
    `);

    await queryRunner.query(`
      ALTER TABLE customer_properties DROP COLUMN IF EXISTS change_requests
    `);
  }

  private async seedChangeRequestStepsForOrganization(
    queryRunner: QueryRunner,
    organizationId: string,
  ): Promise<void> {
    for (const template of CHANGE_REQUEST_TEMPLATES) {
      const existing = await queryRunner.query(
        `SELECT id FROM workflow_steps
         WHERE organization_id = $1 AND code = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [organizationId, template.code],
      );

      if (existing.length > 0) {
        await queryRunner.query(
          `UPDATE workflow_steps SET
            name = $2,
            description = $3,
            type = 'change_request',
            is_special = true,
            change_request_type = $4,
            sequence_order = 1,
            is_mandatory = false,
            can_run_parallel = true,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [existing[0].id, template.name, template.description, template.changeRequestType],
        );
        continue;
      }

      await queryRunner.query(
        `INSERT INTO workflow_steps (
          organization_id,
          name,
          code,
          description,
          type,
          sequence_order,
          is_mandatory,
          can_run_parallel,
          is_active,
          is_special,
          change_request_type
        ) VALUES ($1, $2, $3, $4, 'change_request', 1, false, true, true, true, $5)`,
        [
          organizationId,
          template.name,
          template.code,
          template.description,
          template.changeRequestType,
        ],
      );
    }
  }
}
