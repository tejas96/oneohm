import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Seed Task Templates
 *
 * Populates task_templates with standard solar EPC project workflow tasks
 * derived from the OneOhm Master Sheet. Tasks are grouped by role:
 *   - liaisoning (permits, net metering, subsidy, commissioning)
 *   - loan (document collection, disbursements)
 *   - design_engineer (DSS, design confirmation)
 *   - store (material dispatch)
 *   - execution (installation, electrical, QC)
 *
 * Each template includes: role assignment, milestone mapping, sequence order,
 * dependencies, estimated duration, and checklist items where applicable.
 */
export class SeedTaskTemplates1775000000000 implements MigrationInterface {
  name = 'SeedTaskTemplates1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const orgs = await queryRunner.query(`SELECT id FROM organizations`);

    if (!orgs || orgs.length === 0) {
      console.warn('No organizations found — skipping task template seeding.');
      return;
    }

    for (const org of orgs) {
      await this.seedForOrganization(queryRunner, org.id);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const codes = [
      'LIA-001',
      'LIA-002',
      'LIA-003',
      'LIA-004',
      'LIA-005',
      'LIA-006',
      'LIA-007',
      'LOAN-001',
      'LOAN-002',
      'LOAN-003',
      'LOAN-004',
      'LOAN-005',
      'LOAN-006',
      'LOAN-007',
      'DES-001',
      'DES-002',
      'DES-003',
      'STORE-001',
      'STORE-002',
      'STORE-003',
      'STORE-004',
      'STORE-005',
      'STORE-006',
      'EXEC-001',
      'EXEC-002',
      'EXEC-003',
      'EXEC-004',
      'EXEC-005',
      'EXEC-006',
      'EXEC-007',
      'LIA-008',
      'LIA-009',
      'LIA-010',
      'LIA-011',
      'LIA-012',
      'LIA-013',
      'LIA-014',
      'LIA-015',
      'LIA-016',
    ];

    const placeholders = codes.map((_, i) => `$${i + 1}`).join(', ');
    await queryRunner.query(`DELETE FROM task_templates WHERE code IN (${placeholders})`, codes);
  }

  private async seedForOrganization(
    queryRunner: QueryRunner,
    organizationId: string,
  ): Promise<void> {
    const templates = this.getTemplates();

    for (const t of templates) {
      // The unique constraint includes nullable deleted_at, so ON CONFLICT
      // won't match active rows (NULL != NULL in PostgreSQL). Use an
      // explicit existence check instead for safe idempotency.
      const existing = await queryRunner.query(
        `SELECT id FROM task_templates
         WHERE organization_id = $1 AND code = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [organizationId, t.code],
      );

      const params = [
        organizationId,
        t.name,
        t.code,
        t.description,
        t.type,
        t.defaultRoleCode,
        t.defaultMilestoneType,
        t.sequenceOrder,
        t.isMandatory,
        t.canRunParallel,
        t.dependsOnTaskCodes?.length ? t.dependsOnTaskCodes : null,
        t.estimatedDurationHours,
        t.checklistTemplate ? JSON.stringify(t.checklistTemplate) : null,
        t.defaultDepartment,
      ];

      if (existing.length > 0) {
        await queryRunner.query(
          `UPDATE task_templates SET
            name = $2, description = $4, type = $5,
            default_department = $14, default_role_code = $6,
            default_milestone_type = $7,
            sequence_order = $8, is_mandatory = $9, can_run_parallel = $10,
            depends_on_task_codes = $11, estimated_duration_hours = $12,
            checklist_template = $13, updated_at = CURRENT_TIMESTAMP
          WHERE organization_id = $1 AND code = $3 AND deleted_at IS NULL`,
          params,
        );
      } else {
        await queryRunner.query(
          `INSERT INTO task_templates (
            organization_id, name, code, description, type,
            default_department, default_role_code, default_milestone_type,
            sequence_order, is_mandatory, can_run_parallel,
            depends_on_task_codes, estimated_duration_hours,
            checklist_template, is_active,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $14, $6, $7,
            $8, $9, $10,
            $11, $12,
            $13, TRUE,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )`,
          params,
        );
      }
    }
  }

  private getTemplates(): TaskTemplateSeed[] {
    return [
      // ===================================================================
      // LIAISONING — Phase 1: Permits & Approvals
      // ===================================================================
      {
        code: 'LIA-001',
        name: 'New Change Request',
        description:
          'Process consumer name/load change requests with the electricity board. Includes form submission and follow-up until approval.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'permits',
        sequenceOrder: 100,
        isMandatory: false,
        canRunParallel: true,
        estimatedDurationHours: 8,
        checklistTemplate: {
          items: [
            {
              id: 'lia001-1',
              title: 'Verify consumer details against MSEDCL records',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'lia001-2',
              title: 'Prepare name/load change application',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'lia001-3',
              title: 'Submit application to MSEDCL office',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'lia001-4',
              title: 'Collect acknowledgement receipt',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },
      {
        code: 'LIA-002',
        name: 'New Changes Documentation',
        description:
          'Prepare and collect all supporting documents required for name/load change approval from the electricity board.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'permits',
        sequenceOrder: 110,
        isMandatory: false,
        canRunParallel: true,
        dependsOnTaskCodes: ['LIA-001'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'lia002-1',
              title: 'Collect identity proof documents',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'lia002-2',
              title: 'Collect property ownership documents',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'lia002-3',
              title: 'Get NOC from relevant authority if needed',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'lia002-4',
              title: 'Verify all documents are attested/notarized',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },
      {
        code: 'LIA-003',
        name: 'Net Metering / Power Application',
        description:
          'Submit net metering application to MSEDCL. This is a mandatory step for grid-connected solar installations.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'permits',
        sequenceOrder: 120,
        isMandatory: true,
        canRunParallel: false,
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'lia003-1',
              title: 'Fill net metering application form',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'lia003-2',
              title: 'Attach system design documents',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'lia003-3',
              title: 'Submit application to MSEDCL portal/office',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'lia003-4',
              title: 'Record application number for tracking',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },
      {
        code: 'LIA-004',
        name: 'Solar PV Application',
        description:
          'Register the solar PV installation on the national/state solar portal for subsidy eligibility and compliance.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'permits',
        sequenceOrder: 130,
        isMandatory: true,
        canRunParallel: true,
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'lia004-1',
              title: 'Create account on national solar portal',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'lia004-2',
              title: 'Upload consumer and system details',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'lia004-3',
              title: 'Submit PV registration application',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'lia004-4',
              title: 'Download registration acknowledgement',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },
      {
        code: 'LIA-005',
        name: 'New Changes Updated Status',
        description:
          'Track and update status of pending change requests with the electricity board until final approval.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'permits',
        sequenceOrder: 140,
        isMandatory: false,
        canRunParallel: true,
        dependsOnTaskCodes: ['LIA-001'],
        estimatedDurationHours: 2,
      },
      {
        code: 'LIA-006',
        name: 'Load Extension',
        description:
          'Apply for sanctioned load extension with MSEDCL if the existing load is insufficient for the solar system capacity.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'permits',
        sequenceOrder: 150,
        isMandatory: false,
        canRunParallel: true,
        estimatedDurationHours: 8,
        checklistTemplate: {
          items: [
            {
              id: 'lia006-1',
              title: 'Check existing sanctioned load',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'lia006-2',
              title: 'Calculate required load extension',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'lia006-3',
              title: 'Submit load extension application',
              isCompleted: false,
              order: 3,
            },
            { id: 'lia006-4', title: 'Pay applicable fees', isCompleted: false, order: 4 },
            {
              id: 'lia006-5',
              title: 'Receive load extension approval',
              isCompleted: false,
              order: 5,
            },
          ],
        },
      },
      {
        code: 'LIA-007',
        name: 'Meter Testing Process',
        description:
          'Coordinate meter testing with MSEDCL to verify existing meter compatibility with bidirectional (net metering) operation.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'permits',
        sequenceOrder: 160,
        isMandatory: true,
        canRunParallel: false,
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'lia007-1',
              title: 'Schedule meter testing appointment',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'lia007-2',
              title: 'Ensure consumer presence during test',
              isCompleted: false,
              order: 2,
            },
            { id: 'lia007-3', title: 'Collect meter testing report', isCompleted: false, order: 3 },
          ],
        },
      },

      // ===================================================================
      // LOAN — Finance & Disbursement
      // ===================================================================
      {
        code: 'LOAN-001',
        name: 'Loan Document Collection',
        description:
          'Collect all required financial documents from the customer for loan processing — income proof, bank statements, ID, property papers.',
        type: 'loan',
        defaultDepartment: 'Loan Department',
        defaultRoleCode: 'loan',
        defaultMilestoneType: 'planning',
        sequenceOrder: 200,
        isMandatory: false,
        canRunParallel: true,
        estimatedDurationHours: 8,
        checklistTemplate: {
          items: [
            { id: 'loan001-1', title: 'Collect Aadhaar card copy', isCompleted: false, order: 1 },
            { id: 'loan001-2', title: 'Collect PAN card copy', isCompleted: false, order: 2 },
            {
              id: 'loan001-3',
              title: 'Collect bank statements (6 months)',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'loan001-4',
              title: 'Collect income proof / salary slips',
              isCompleted: false,
              order: 4,
            },
            {
              id: 'loan001-5',
              title: 'Collect electricity bill copy',
              isCompleted: false,
              order: 5,
            },
            {
              id: 'loan001-6',
              title: 'Collect property ownership proof',
              isCompleted: false,
              order: 6,
            },
          ],
        },
      },
      {
        code: 'LOAN-002',
        name: 'Jan Samarth Portal Registration',
        description:
          'Register and submit the loan application on the Jan Samarth portal for PM-KUSUM or other government solar loan schemes.',
        type: 'loan',
        defaultDepartment: 'Loan Department',
        defaultRoleCode: 'loan',
        defaultMilestoneType: 'planning',
        sequenceOrder: 210,
        isMandatory: false,
        canRunParallel: true,
        dependsOnTaskCodes: ['LOAN-001'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'loan002-1',
              title: 'Create customer account on Jan Samarth portal',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'loan002-2',
              title: 'Upload all required documents',
              isCompleted: false,
              order: 2,
            },
            { id: 'loan002-3', title: 'Submit loan application', isCompleted: false, order: 3 },
            {
              id: 'loan002-4',
              title: 'Note application reference number',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },
      {
        code: 'LOAN-003',
        name: 'Loan File Submission',
        description:
          'Submit the complete loan application file to the financing bank/NBFC with all supporting documents.',
        type: 'loan',
        defaultDepartment: 'Loan Department',
        defaultRoleCode: 'loan',
        defaultMilestoneType: 'planning',
        sequenceOrder: 220,
        isMandatory: false,
        canRunParallel: false,
        dependsOnTaskCodes: ['LOAN-001', 'LOAN-002'],
        estimatedDurationHours: 4,
      },
      {
        code: 'LOAN-004',
        name: 'Loan Site Visit',
        description:
          'Coordinate site visit by the loan officer / bank representative to verify property and installation feasibility.',
        type: 'loan',
        defaultDepartment: 'Loan Department',
        defaultRoleCode: 'loan',
        defaultMilestoneType: 'planning',
        sequenceOrder: 230,
        isMandatory: false,
        canRunParallel: false,
        dependsOnTaskCodes: ['LOAN-003'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'loan004-1',
              title: 'Schedule site visit with bank representative',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'loan004-2',
              title: 'Ensure customer availability at site',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'loan004-3',
              title: 'Provide project details to bank officer',
              isCompleted: false,
              order: 3,
            },
            { id: 'loan004-4', title: 'Collect site visit report', isCompleted: false, order: 4 },
          ],
        },
      },
      {
        code: 'LOAN-005',
        name: 'Loan Sanctioned',
        description:
          'Follow up with the bank until loan sanction letter is received. Verify sanctioned amount and terms.',
        type: 'loan',
        defaultDepartment: 'Loan Department',
        defaultRoleCode: 'loan',
        defaultMilestoneType: 'planning',
        sequenceOrder: 240,
        isMandatory: false,
        canRunParallel: false,
        dependsOnTaskCodes: ['LOAN-004'],
        estimatedDurationHours: 2,
      },
      {
        code: 'LOAN-006',
        name: 'First Disbursement',
        description:
          'Process and track the first loan disbursement to fund material procurement and initial project expenses.',
        type: 'loan',
        defaultDepartment: 'Loan Department',
        defaultRoleCode: 'loan',
        defaultMilestoneType: 'planning',
        sequenceOrder: 250,
        isMandatory: false,
        canRunParallel: false,
        dependsOnTaskCodes: ['LOAN-005'],
        estimatedDurationHours: 2,
      },
      {
        code: 'LOAN-007',
        name: 'Final Disbursement',
        description:
          'Process the final loan disbursement after installation completion and inspection clearance.',
        type: 'loan',
        defaultDepartment: 'Loan Department',
        defaultRoleCode: 'loan',
        defaultMilestoneType: 'planning',
        sequenceOrder: 260,
        isMandatory: false,
        canRunParallel: false,
        dependsOnTaskCodes: ['LOAN-006'],
        estimatedDurationHours: 2,
      },

      // ===================================================================
      // DESIGN ENGINEERING — System Design
      // ===================================================================
      {
        code: 'DES-001',
        name: 'DSS Work',
        description:
          'Create the Detailed System Schematic (DSS) including panel layout, inverter placement, wiring diagram, and structural design for the solar installation.',
        type: 'design',
        defaultDepartment: 'Design Engineering',
        defaultRoleCode: 'design_engineer',
        defaultMilestoneType: 'design',
        sequenceOrder: 300,
        isMandatory: true,
        canRunParallel: false,
        estimatedDurationHours: 8,
        checklistTemplate: {
          items: [
            {
              id: 'des001-1',
              title: 'Review site survey report and measurements',
              isCompleted: false,
              order: 1,
            },
            { id: 'des001-2', title: 'Create panel layout drawing', isCompleted: false, order: 2 },
            {
              id: 'des001-3',
              title: 'Design electrical single-line diagram',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'des001-4',
              title: 'Specify cable sizing and routing',
              isCompleted: false,
              order: 4,
            },
            {
              id: 'des001-5',
              title: 'Define mounting structure design',
              isCompleted: false,
              order: 5,
            },
            {
              id: 'des001-6',
              title: 'Calculate system losses and expected generation',
              isCompleted: false,
              order: 6,
            },
          ],
        },
      },
      {
        code: 'DES-002',
        name: 'DSS Received',
        description:
          'Verify and formally receive the completed DSS document. Check for accuracy, completeness, and compliance with standards.',
        type: 'design',
        defaultDepartment: 'Design Engineering',
        defaultRoleCode: 'design_engineer',
        defaultMilestoneType: 'design',
        sequenceOrder: 310,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['DES-001'],
        estimatedDurationHours: 2,
      },
      {
        code: 'DES-003',
        name: 'Design Confirmation',
        description:
          'Get final design approval from the customer and internal team. Lock the design for material procurement and execution.',
        type: 'design',
        defaultDepartment: 'Design Engineering',
        defaultRoleCode: 'design_engineer',
        defaultMilestoneType: 'design',
        sequenceOrder: 320,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['DES-002'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            { id: 'des003-1', title: 'Present design to customer', isCompleted: false, order: 1 },
            {
              id: 'des003-2',
              title: 'Address customer queries and change requests',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'des003-3',
              title: 'Get written design approval from customer',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'des003-4',
              title: 'Lock design and notify procurement team',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },

      // ===================================================================
      // STORE — Material Dispatch
      // ===================================================================
      {
        code: 'STORE-001',
        name: 'Electrical Kit Dispatch',
        description:
          'Prepare and dispatch the electrical kit (cables, connectors, MCBs, SPDs, junction boxes, earthing material) to the project site.',
        type: 'store',
        defaultDepartment: 'Store Department',
        defaultRoleCode: 'store',
        defaultMilestoneType: 'material_procurement',
        sequenceOrder: 400,
        isMandatory: true,
        canRunParallel: true,
        dependsOnTaskCodes: ['DES-003'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'sto001-1',
              title: 'Pick DC and AC cables as per BOM',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'sto001-2',
              title: 'Pack MC4 connectors and junction boxes',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'sto001-3',
              title: 'Include MCBs, SPDs, and distribution board',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'sto001-4',
              title: 'Include earthing material (rods, wire, compound)',
              isCompleted: false,
              order: 4,
            },
            {
              id: 'sto001-5',
              title: 'Verify against BOM and pack for dispatch',
              isCompleted: false,
              order: 5,
            },
          ],
        },
      },
      {
        code: 'STORE-002',
        name: 'Fabrication Kit Dispatch',
        description:
          'Prepare and dispatch the fabrication/mounting structure kit (rails, clamps, L-angles, fasteners) for panel mounting.',
        type: 'store',
        defaultDepartment: 'Store Department',
        defaultRoleCode: 'store',
        defaultMilestoneType: 'material_procurement',
        sequenceOrder: 410,
        isMandatory: true,
        canRunParallel: true,
        dependsOnTaskCodes: ['DES-003'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'sto002-1',
              title: 'Pick mounting rails and L-angles as per design',
              isCompleted: false,
              order: 1,
            },
            { id: 'sto002-2', title: 'Pack mid and end clamps', isCompleted: false, order: 2 },
            {
              id: 'sto002-3',
              title: 'Include all fasteners (bolts, nuts, washers)',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'sto002-4',
              title: 'Verify quantities against BOM',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },
      {
        code: 'STORE-003',
        name: 'Inverter Dispatch',
        description:
          'Dispatch the solar inverter(s) to the project site. Verify model, capacity, and serial numbers before shipping.',
        type: 'store',
        defaultDepartment: 'Store Department',
        defaultRoleCode: 'store',
        defaultMilestoneType: 'material_procurement',
        sequenceOrder: 420,
        isMandatory: true,
        canRunParallel: true,
        dependsOnTaskCodes: ['DES-003'],
        estimatedDurationHours: 2,
        checklistTemplate: {
          items: [
            {
              id: 'sto003-1',
              title: 'Verify inverter make and model against PO',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'sto003-2',
              title: 'Verify inverter capacity (kW)',
              isCompleted: false,
              order: 2,
            },
            { id: 'sto003-3', title: 'Record serial number', isCompleted: false, order: 3 },
            {
              id: 'sto003-4',
              title: 'Check physical condition and pack securely',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },
      {
        code: 'STORE-004',
        name: 'Panel Dispatch',
        description:
          'Dispatch solar panels to the project site. Verify make, type, wattage, quantity, and check for physical damage.',
        type: 'store',
        defaultDepartment: 'Store Department',
        defaultRoleCode: 'store',
        defaultMilestoneType: 'material_procurement',
        sequenceOrder: 430,
        isMandatory: true,
        canRunParallel: true,
        dependsOnTaskCodes: ['DES-003'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'sto004-1',
              title: 'Verify panel make and type against PO',
              isCompleted: false,
              order: 1,
            },
            { id: 'sto004-2', title: 'Verify panel wattage (Wp)', isCompleted: false, order: 2 },
            { id: 'sto004-3', title: 'Count and verify quantity', isCompleted: false, order: 3 },
            {
              id: 'sto004-4',
              title: 'Inspect panels for physical damage',
              isCompleted: false,
              order: 4,
            },
            {
              id: 'sto004-5',
              title: 'Record serial numbers of all panels',
              isCompleted: false,
              order: 5,
            },
          ],
        },
      },
      {
        code: 'STORE-005',
        name: 'All Material Dispatch Confirmation',
        description:
          'Confirm that all material kits (electrical, fabrication, inverter, panels) have been dispatched and received at site.',
        type: 'store',
        defaultDepartment: 'Store Department',
        defaultRoleCode: 'store',
        defaultMilestoneType: 'material_procurement',
        sequenceOrder: 440,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['STORE-001', 'STORE-002', 'STORE-003', 'STORE-004'],
        estimatedDurationHours: 2,
        checklistTemplate: {
          items: [
            {
              id: 'sto005-1',
              title: 'Verify electrical kit delivery at site',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'sto005-2',
              title: 'Verify fabrication kit delivery at site',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'sto005-3',
              title: 'Verify inverter delivery at site',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'sto005-4',
              title: 'Verify panel delivery at site',
              isCompleted: false,
              order: 4,
            },
            {
              id: 'sto005-5',
              title: 'Get site delivery acknowledgement signed',
              isCompleted: false,
              order: 5,
            },
          ],
        },
      },
      {
        code: 'STORE-006',
        name: 'Reverse Pickup',
        description:
          'Arrange return pickup for any damaged, excess, or incorrect material from the project site back to the warehouse.',
        type: 'store',
        defaultDepartment: 'Store Department',
        defaultRoleCode: 'store',
        defaultMilestoneType: 'material_procurement',
        sequenceOrder: 450,
        isMandatory: false,
        canRunParallel: true,
        estimatedDurationHours: 4,
      },

      // ===================================================================
      // EXECUTION — Installation & Quality
      // ===================================================================
      {
        code: 'EXEC-001',
        name: 'Block Work',
        description:
          'Complete civil work for mounting structure foundations — RCC blocks, base plates, or roof anchor points as per structural design.',
        type: 'execution',
        defaultDepartment: 'Execution Department',
        defaultRoleCode: 'execution',
        defaultMilestoneType: 'installation',
        sequenceOrder: 500,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['STORE-005'],
        estimatedDurationHours: 8,
        checklistTemplate: {
          items: [
            {
              id: 'exec001-1',
              title: 'Mark foundation positions as per layout',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'exec001-2',
              title: 'Prepare RCC blocks / base plates',
              isCompleted: false,
              order: 2,
            },
            { id: 'exec001-3', title: 'Verify level and alignment', isCompleted: false, order: 3 },
            {
              id: 'exec001-4',
              title: 'Allow curing time if applicable',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },
      {
        code: 'EXEC-002',
        name: 'Fabrication Work',
        description:
          'Install the mounting structure (rails, L-angles, clamps) on the prepared foundation/roof surface.',
        type: 'execution',
        defaultDepartment: 'Execution Department',
        defaultRoleCode: 'execution',
        defaultMilestoneType: 'installation',
        sequenceOrder: 510,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['EXEC-001'],
        estimatedDurationHours: 8,
        checklistTemplate: {
          items: [
            {
              id: 'exec002-1',
              title: 'Install mounting rails on foundations',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'exec002-2',
              title: 'Fix L-angles and cross bracing',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'exec002-3',
              title: 'Check tilt angle and orientation',
              isCompleted: false,
              order: 3,
            },
            { id: 'exec002-4', title: 'Verify structural rigidity', isCompleted: false, order: 4 },
          ],
        },
      },
      {
        code: 'EXEC-003',
        name: 'Electrical Work',
        description:
          'Complete all electrical wiring — DC cabling from panels to inverter, AC cabling from inverter to distribution board, earthing connections.',
        type: 'execution',
        defaultDepartment: 'Execution Department',
        defaultRoleCode: 'execution',
        defaultMilestoneType: 'installation',
        sequenceOrder: 520,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['EXEC-002'],
        estimatedDurationHours: 12,
        checklistTemplate: {
          items: [
            {
              id: 'exec003-1',
              title: 'Route and connect DC cables (panel to inverter)',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'exec003-2',
              title: 'Install MC4 connectors and junction boxes',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'exec003-3',
              title: 'Route and connect AC cables (inverter to DB)',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'exec003-4',
              title: 'Install MCBs and surge protection devices',
              isCompleted: false,
              order: 4,
            },
            {
              id: 'exec003-5',
              title: 'Complete earthing connections',
              isCompleted: false,
              order: 5,
            },
            {
              id: 'exec003-6',
              title: 'Label all cables and connections',
              isCompleted: false,
              order: 6,
            },
          ],
        },
      },
      {
        code: 'EXEC-004',
        name: 'Inverter Fitting',
        description:
          'Mount and configure the solar inverter. Connect DC input from panels and AC output to the distribution board.',
        type: 'execution',
        defaultDepartment: 'Execution Department',
        defaultRoleCode: 'execution',
        defaultMilestoneType: 'installation',
        sequenceOrder: 530,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['EXEC-003'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'exec004-1',
              title: 'Mount inverter on wall/structure',
              isCompleted: false,
              order: 1,
            },
            { id: 'exec004-2', title: 'Connect DC input cables', isCompleted: false, order: 2 },
            { id: 'exec004-3', title: 'Connect AC output cables', isCompleted: false, order: 3 },
            {
              id: 'exec004-4',
              title: 'Configure inverter settings (WiFi, grid parameters)',
              isCompleted: false,
              order: 4,
            },
            {
              id: 'exec004-5',
              title: 'Verify inverter display and connectivity',
              isCompleted: false,
              order: 5,
            },
          ],
        },
      },
      {
        code: 'EXEC-005',
        name: 'Panel Installation',
        description:
          'Mount all solar panels on the fabrication structure. Ensure proper alignment, tilt, and secure clamping.',
        type: 'execution',
        defaultDepartment: 'Execution Department',
        defaultRoleCode: 'execution',
        defaultMilestoneType: 'installation',
        sequenceOrder: 540,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['EXEC-002'],
        estimatedDurationHours: 8,
        checklistTemplate: {
          items: [
            {
              id: 'exec005-1',
              title: 'Place panels on mounting structure',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'exec005-2',
              title: 'Secure with mid and end clamps',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'exec005-3',
              title: 'Verify panel orientation and spacing',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'exec005-4',
              title: 'Connect panel strings as per wiring diagram',
              isCompleted: false,
              order: 4,
            },
            {
              id: 'exec005-5',
              title: 'Check for physical damage post-installation',
              isCompleted: false,
              order: 5,
            },
          ],
        },
      },
      {
        code: 'EXEC-006',
        name: 'Earthing / Landing Check',
        description:
          'Verify all earthing connections and measure earth resistance. Ensure compliance with IS/IEC standards for safety.',
        type: 'execution',
        defaultDepartment: 'Execution Department',
        defaultRoleCode: 'execution',
        defaultMilestoneType: 'inspection',
        sequenceOrder: 550,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['EXEC-003', 'EXEC-005'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'exec006-1',
              title: 'Measure earth resistance (must be < 5 ohms)',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'exec006-2',
              title: 'Verify LA (Lightning Arrestor) earthing',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'exec006-3',
              title: 'Verify body earthing of all metallic parts',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'exec006-4',
              title: 'Record earthing test readings',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },
      {
        code: 'EXEC-007',
        name: 'Quality Control',
        description:
          'Internal quality control check of the entire installation before external inspection. Verify all electrical, structural, and safety parameters.',
        type: 'execution',
        defaultDepartment: 'Execution Department',
        defaultRoleCode: 'execution',
        defaultMilestoneType: 'inspection',
        sequenceOrder: 560,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['EXEC-004', 'EXEC-005', 'EXEC-006'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'exec007-1',
              title: 'Inspect mounting structure for stability',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'exec007-2',
              title: 'Verify all DC string voltages',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'exec007-3',
              title: 'Verify AC output voltage and frequency',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'exec007-4',
              title: 'Check inverter communication and monitoring',
              isCompleted: false,
              order: 4,
            },
            {
              id: 'exec007-5',
              title: 'Verify cable management and labeling',
              isCompleted: false,
              order: 5,
            },
            {
              id: 'exec007-6',
              title: 'Take installation photographs',
              isCompleted: false,
              order: 6,
            },
          ],
        },
      },

      // ===================================================================
      // LIAISONING — Phase 2: Commissioning, Metering & Subsidy
      // ===================================================================
      {
        code: 'LIA-008',
        name: 'WCR (Work Completion Report)',
        description:
          'Prepare and submit the Work Completion Report to MSEDCL confirming that the solar installation is complete and ready for inspection.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'commissioning',
        sequenceOrder: 600,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['EXEC-007'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'lia008-1',
              title: 'Compile installation completion details',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'lia008-2',
              title: 'Attach installation photographs',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'lia008-3',
              title: 'Fill WCR form with system specifications',
              isCompleted: false,
              order: 3,
            },
            { id: 'lia008-4', title: 'Submit WCR to MSEDCL', isCompleted: false, order: 4 },
          ],
        },
      },
      {
        code: 'LIA-009',
        name: 'QC Inspection',
        description:
          'Coordinate the official quality control inspection by MSEDCL. Ensure site readiness and all documentation is prepared.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'inspection',
        sequenceOrder: 610,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['LIA-008'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'lia009-1',
              title: 'Schedule MSEDCL QC inspection',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'lia009-2',
              title: 'Ensure site is clean and accessible',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'lia009-3',
              title: 'Keep all documents and test reports ready',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'lia009-4',
              title: 'Attend inspection with MSEDCL officer',
              isCompleted: false,
              order: 4,
            },
            {
              id: 'lia009-5',
              title: 'Collect inspection clearance report',
              isCompleted: false,
              order: 5,
            },
          ],
        },
      },
      {
        code: 'LIA-010',
        name: 'Release Order',
        description:
          'Obtain the release order from MSEDCL post QC inspection approval, authorizing net meter installation.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'commissioning',
        sequenceOrder: 620,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['LIA-009'],
        estimatedDurationHours: 2,
      },
      {
        code: 'LIA-011',
        name: 'Meter Installation',
        description:
          'Coordinate the bidirectional (net) meter installation by MSEDCL at the customer premises.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'commissioning',
        sequenceOrder: 630,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['LIA-010'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'lia011-1',
              title: 'Schedule meter installation with MSEDCL',
              isCompleted: false,
              order: 1,
            },
            { id: 'lia011-2', title: 'Ensure customer availability', isCompleted: false, order: 2 },
            {
              id: 'lia011-3',
              title: 'Verify bidirectional meter readings post install',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'lia011-4',
              title: 'Collect new meter number and details',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },
      {
        code: 'LIA-012',
        name: 'Project Run / System Startup',
        description:
          'Perform the first official system startup after net meter installation. Verify generation, grid export, and monitoring.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'commissioning',
        sequenceOrder: 640,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['LIA-011'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            { id: 'lia012-1', title: 'Switch on the solar system', isCompleted: false, order: 1 },
            {
              id: 'lia012-2',
              title: 'Verify power generation on inverter display',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'lia012-3',
              title: 'Verify grid export on net meter',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'lia012-4',
              title: 'Set up monitoring app for customer',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },
      {
        code: 'LIA-013',
        name: 'Commissioning',
        description:
          'Complete the formal commissioning process — generate commissioning certificate and update records on MSEDCL and solar portals.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'commissioning',
        sequenceOrder: 650,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['LIA-012'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'lia013-1',
              title: 'Generate commissioning certificate',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'lia013-2',
              title: 'Update status on MSEDCL portal',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'lia013-3',
              title: 'Update status on national solar portal',
              isCompleted: false,
              order: 3,
            },
            { id: 'lia013-4', title: 'Record commissioning date', isCompleted: false, order: 4 },
          ],
        },
      },
      {
        code: 'LIA-014',
        name: 'Subsidy Application',
        description:
          'Apply for the government solar subsidy (PM Surya Ghar / state scheme) on the national portal after successful commissioning.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'handover',
        sequenceOrder: 660,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['LIA-013'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'lia014-1',
              title: 'Upload commissioning certificate on portal',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'lia014-2',
              title: 'Upload net meter installation proof',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'lia014-3',
              title: 'Verify customer bank details for subsidy credit',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'lia014-4',
              title: 'Submit subsidy claim application',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },
      {
        code: 'LIA-015',
        name: 'Handover Final File',
        description:
          'Prepare and hand over the complete project file to the customer — warranty cards, manuals, test reports, drawings, and commissioning certificate.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'handover',
        sequenceOrder: 670,
        isMandatory: true,
        canRunParallel: true,
        dependsOnTaskCodes: ['LIA-013'],
        estimatedDurationHours: 4,
        checklistTemplate: {
          items: [
            {
              id: 'lia015-1',
              title: 'Compile warranty cards for all equipment',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'lia015-2',
              title: 'Include inverter and panel user manuals',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'lia015-3',
              title: 'Include system design drawings',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'lia015-4',
              title: 'Include commissioning and test reports',
              isCompleted: false,
              order: 4,
            },
            {
              id: 'lia015-5',
              title: 'Hand over file to customer with acknowledgement',
              isCompleted: false,
              order: 5,
            },
          ],
        },
      },
      {
        code: 'LIA-016',
        name: 'Subsidy Disbursement',
        description:
          'Track the government subsidy disbursement until it is credited to the customer or company account. Follow up with DISCOM/portal if delayed.',
        type: 'liaisoning',
        defaultDepartment: 'Liaisoning Department',
        defaultRoleCode: 'liaisoning',
        defaultMilestoneType: 'handover',
        sequenceOrder: 680,
        isMandatory: true,
        canRunParallel: false,
        dependsOnTaskCodes: ['LIA-014'],
        estimatedDurationHours: 2,
        checklistTemplate: {
          items: [
            {
              id: 'lia016-1',
              title: 'Check subsidy application status on portal',
              isCompleted: false,
              order: 1,
            },
            {
              id: 'lia016-2',
              title: 'Follow up with DISCOM if pending',
              isCompleted: false,
              order: 2,
            },
            {
              id: 'lia016-3',
              title: 'Verify subsidy credit in bank account',
              isCompleted: false,
              order: 3,
            },
            {
              id: 'lia016-4',
              title: 'Inform customer of subsidy receipt',
              isCompleted: false,
              order: 4,
            },
          ],
        },
      },
    ];
  }
}

interface TaskTemplateSeed {
  code: string;
  name: string;
  description: string;
  type: string;
  defaultDepartment: string;
  defaultRoleCode: string;
  defaultMilestoneType: string;
  sequenceOrder: number;
  isMandatory: boolean;
  canRunParallel: boolean;
  dependsOnTaskCodes?: string[];
  estimatedDurationHours: number;
  checklistTemplate?: {
    items: Array<{
      id: string;
      title: string;
      isCompleted: boolean;
      order: number;
    }>;
  };
}
