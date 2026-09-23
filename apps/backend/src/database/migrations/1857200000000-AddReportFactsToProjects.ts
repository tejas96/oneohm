import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hand-typed report facts move from each filed report's own copy
 * (documents.metadata.reportFields) to one store per project.
 *
 * Only facts that are still typed by hand are carried. Values a user typed
 * over live data (consumer name, capacity…) are dropped on purpose: those
 * reports now read the live value and show as out of date until re-filed.
 * When two reports disagree, the most recently filed wins.
 */
const MANUAL_KEYS: Record<string, string> = {
  sanction_number: 'sanction_number',
  charge_controller_type: 'charge_controller_type',
  inverter_year_of_manufacturing: 'inverter_year_of_manufacturing',
  earthing_details: 'earthing_details',
  lightning_arrester_text: 'lightning_arrester_text',
  cmc_period_years: 'cmc_period_years',
  application_number: 'application_number',
  application_date: 'application_date',
  cell_manufacturer_name: 'cell_manufacturer_name',
  cell_gst_invoice_no: 'cell_gst_invoice_no',
  signatory_name: 'signatory_name',
  signatory_designation: 'signatory_designation',
  signatory_phone: 'signatory_phone',
  signatory_email: 'signatory_email',
  licensee_address: 'licensee_address',
  witness_consumer_name: 'witness_consumer_name',
  witness_licensee_name: 'witness_licensee_name',
  signatory_licensee_name: 'signatory_licensee_name',
  re_arrangement_type: 're_arrangement_type',
  re_source: 're_source',
  capacity_type: 'capacity_type',
  project_model: 'project_model',
};

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function agreementDate(fields: Record<string, unknown>): string | null {
  const day = Number(String(fields.day ?? '').trim());
  const monthIndex = MONTHS.indexOf(String(fields.month ?? '').trim().toLowerCase());
  const year = Number(String(fields.year ?? '').trim());
  if (!Number.isInteger(day) || day < 1 || day > 31 || monthIndex < 0 || !Number.isInteger(year) || year < 2000) {
    return null;
  }
  const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return parsed.toISOString().startsWith(iso) ? iso : null;
}

export class AddReportFactsToProjects1857200000000 implements MigrationInterface {
  name = 'AddReportFactsToProjects1857200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS report_facts jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );

    const rows: Array<{ project_id: string; tag: string; fields: Record<string, unknown> }> =
      await queryRunner.query(
        `SELECT d.entity_id AS project_id, d.tag, d.metadata->'reportFields' AS fields
           FROM documents d
          WHERE d.entity_type = 'project'
            AND d.category = 'report'
            AND d.tag IN ('wcr', 'dcr', 'net_metering_agreement', 'annexure_proforma_a')
            AND d.deleted_at IS NULL
            AND d.metadata ? 'reportFields'
          ORDER BY d.created_at ASC`,
      );

    const factsByProject = new Map<string, Record<string, string>>();
    const aadhaarByProject = new Map<string, string>();

    for (const row of rows) {
      const fields = row.fields ?? {};
      const facts = factsByProject.get(row.project_id) ?? {};

      for (const [oldKey, newKey] of Object.entries(MANUAL_KEYS)) {
        const value = fields[oldKey];
        if (typeof value === 'string' && value.trim()) facts[newKey] = value.trim();
      }
      if (row.tag === 'net_metering_agreement') {
        const date = agreementDate(fields);
        if (date) facts.agreement_date = date;
      }
      if (row.tag === 'wcr' && typeof fields.consumer_aadhaar_number === 'string') {
        const digits = fields.consumer_aadhaar_number.replace(/\D/g, '');
        if (digits.length === 12) aadhaarByProject.set(row.project_id, digits);
      }

      factsByProject.set(row.project_id, facts);
    }

    for (const [projectId, facts] of factsByProject) {
      await queryRunner.query(`UPDATE projects SET report_facts = $1::jsonb WHERE id = $2`, [
        JSON.stringify(facts),
        projectId,
      ]);
    }

    for (const [projectId, aadhaar] of aadhaarByProject) {
      await queryRunner.query(
        `UPDATE customer_profiles cp
            SET aadhaar_number = $1
           FROM projects p
           JOIN customer_properties prop ON prop.id = p.property_id
          WHERE p.id = $2
            AND cp.id = prop.customer_id
            AND cp.aadhaar_number IS NULL`,
        [aadhaar, projectId],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS report_facts`);
  }
}
