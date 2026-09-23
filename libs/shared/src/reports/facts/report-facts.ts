export type FactSource =
  | 'company'
  | 'customer'
  | 'property'
  | 'project'
  | 'bom'
  | 'manual'
  | 'fixed';

export type FactType = 'text' | 'textarea' | 'number' | 'date' | 'email' | 'phone' | 'year';

export type FactGroup =
  | 'vendor'
  | 'consumer'
  | 'sanction'
  | 'system'
  | 'installation'
  | 'agreement'
  | 'signatory';

/** Where a read-only fact is changed. Company facts have none: they are constants. */
export type FactEditAt = 'customer' | 'property' | 'quote' | 'bom';

export interface ReportFact {
  readonly key: string;
  readonly label: string;
  readonly type: FactType;
  readonly group: FactGroup;
  readonly source: FactSource;
  readonly placeholder?: string;
  readonly editAt?: FactEditAt;
  readonly fixedValue?: string;
}

export const FACT_GROUPS: ReadonlyArray<{ id: FactGroup; title: string }> = [
  { id: 'vendor', title: 'Vendor' },
  { id: 'consumer', title: 'Consumer' },
  { id: 'sanction', title: 'DISCOM application' },
  { id: 'system', title: 'System' },
  { id: 'installation', title: 'Installation and service' },
  { id: 'agreement', title: 'Net metering agreement' },
  { id: 'signatory', title: 'Vendor signatory' },
];

export const REPORT_FACTS = [
  { key: 'vendor_name', label: 'Vendor name', type: 'text', group: 'vendor', source: 'company' },

  { key: 'consumer_name', label: 'Consumer name', type: 'text', group: 'consumer', source: 'property', editAt: 'property' },
  { key: 'consumer_number', label: 'Consumer number', type: 'text', group: 'consumer', source: 'property', editAt: 'property' },
  { key: 'consumer_phone', label: 'Mobile number', type: 'phone', group: 'consumer', source: 'customer', editAt: 'customer' },
  { key: 'consumer_email', label: 'Email', type: 'email', group: 'consumer', source: 'customer', editAt: 'customer' },
  { key: 'consumer_aadhaar_number', label: 'Aadhaar number', type: 'text', group: 'consumer', source: 'customer', editAt: 'customer' },
  { key: 'site_address', label: 'Site address', type: 'textarea', group: 'consumer', source: 'property', editAt: 'property' },
  { key: 'site_city', label: 'City / district', type: 'text', group: 'consumer', source: 'property', editAt: 'property' },
  { key: 'site_state', label: 'State', type: 'text', group: 'consumer', source: 'property', editAt: 'property' },
  { key: 'site_category', label: 'Category', type: 'text', group: 'consumer', source: 'property', editAt: 'property' },

  { key: 'sanction_number', label: 'Sanction number', type: 'text', group: 'sanction', source: 'manual', placeholder: '63436547' },
  { key: 'sanction_date', label: 'Sanction date', type: 'date', group: 'sanction', source: 'manual' },
  { key: 'sanctioned_capacity_kw', label: 'Sanctioned capacity (kW)', type: 'number', group: 'sanction', source: 'property', editAt: 'property' },
  { key: 'application_number', label: 'Application number', type: 'text', group: 'sanction', source: 'manual' },
  { key: 'application_date', label: 'Application date', type: 'date', group: 'sanction', source: 'manual' },
  { key: 're_arrangement_type', label: 'RE arrangement type', type: 'text', group: 'sanction', source: 'manual', placeholder: 'Net metering' },
  { key: 're_source', label: 'RE source', type: 'text', group: 'sanction', source: 'manual', placeholder: 'Solar' },
  { key: 'capacity_type', label: 'Capacity type', type: 'text', group: 'sanction', source: 'manual', placeholder: 'Rooftop' },
  { key: 'project_model', label: 'Project model', type: 'text', group: 'sanction', source: 'manual', placeholder: 'CAPEX' },

  { key: 'installed_capacity_kw', label: 'Installed capacity (kW)', type: 'number', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'installed_capacity_wp', label: 'Installed capacity (Wp)', type: 'number', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_make', label: 'Module make', type: 'text', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_model_number', label: 'ALMM model number', type: 'text', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_wattage', label: 'Wattage per module (Wp)', type: 'number', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_count', label: 'Number of modules', type: 'number', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_total_kw', label: 'Module capacity (kW)', type: 'number', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_warranty', label: 'Module warranty', type: 'text', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'module_serial_numbers', label: 'Module serial numbers', type: 'textarea', group: 'system', source: 'bom', editAt: 'bom' },
  { key: 'inverter_make_model', label: 'Inverter make and model', type: 'text', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'inverter_make', label: 'Inverter make', type: 'text', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'inverter_total_kw', label: 'Inverter capacity (kW)', type: 'number', group: 'system', source: 'project', editAt: 'quote' },
  { key: 'inverter_hpd', label: 'HPD', type: 'text', group: 'system', source: 'fixed', fixedValue: 'Not applicable' },
  { key: 'charge_controller_type', label: 'Charge controller type', type: 'text', group: 'system', source: 'manual', placeholder: 'MPPT' },
  { key: 'inverter_year_of_manufacturing', label: 'Inverter year of manufacture', type: 'year', group: 'system', source: 'manual', placeholder: '2026' },
  { key: 'cell_manufacturer_name', label: 'Cell manufacturer', type: 'text', group: 'system', source: 'manual' },
  { key: 'cell_gst_invoice_no', label: 'Cell GST invoice number', type: 'text', group: 'system', source: 'manual' },

  { key: 'earthing_details', label: 'Earthing details', type: 'text', group: 'installation', source: 'manual', placeholder: '3 - 3Ω, 4Ω, 3Ω' },
  { key: 'lightning_arrester_text', label: 'Lightning arrester', type: 'textarea', group: 'installation', source: 'manual' },
  { key: 'cmc_period_years', label: 'CMC period (years)', type: 'number', group: 'installation', source: 'manual', placeholder: '5' },

  { key: 'agreement_date', label: 'Agreement date', type: 'date', group: 'agreement', source: 'manual' },
  { key: 'licensee_address', label: 'Licensee address', type: 'textarea', group: 'agreement', source: 'manual' },
  { key: 'signatory_licensee_name', label: 'Signatory (licensee)', type: 'text', group: 'agreement', source: 'manual' },
  { key: 'witness_consumer_name', label: 'Witness (consumer)', type: 'text', group: 'agreement', source: 'manual' },
  { key: 'witness_licensee_name', label: 'Witness (licensee)', type: 'text', group: 'agreement', source: 'manual' },

  { key: 'signatory_name', label: 'Signatory name', type: 'text', group: 'signatory', source: 'manual' },
  { key: 'signatory_designation', label: 'Signatory designation', type: 'text', group: 'signatory', source: 'manual' },
  { key: 'signatory_phone', label: 'Signatory phone', type: 'phone', group: 'signatory', source: 'manual' },
  { key: 'signatory_email', label: 'Signatory email', type: 'email', group: 'signatory', source: 'manual' },
] as const satisfies readonly ReportFact[];

export type FactKey = (typeof REPORT_FACTS)[number]['key'];

const FACTS_BY_KEY = new Map<string, ReportFact>(
  (REPORT_FACTS as readonly ReportFact[]).map((fact) => [fact.key, fact]),
);

export function getFact(key: string): ReportFact | undefined {
  return FACTS_BY_KEY.get(key);
}
