import { PROPERTY_TYPE_LABELS } from '../../types/enums/customer.enum';

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

/** The record a source fact is saved on when it is edited on the Reports tab. */
export type FactEditTarget = 'property' | 'customer';

/** `digits` is a text box that accepts only digits (Aadhaar, PIN code, consumer number). */
export type FactEditInput = 'text' | 'number' | 'select' | 'digits';

/**
 * How a customer or site fact is edited in place. The save goes through the
 * owner's own update (DTO, conflicts, normalisation, side effects), so the
 * rules here only catch bad input early; the owner has the last word.
 */
export interface FactEdit {
  readonly target: FactEditTarget;
  /** Field on the owner's update DTO. */
  readonly field: string;
  /** Default `text`. */
  readonly input?: FactEditInput;
  /** For `digits`: accepted lengths. */
  readonly digits?: { readonly min: number; readonly max: number };
  /** For `select`: stored value → label. */
  readonly options?: Readonly<Record<string, string>>;
  /** The owner cannot store an empty value: clearing is refused. */
  readonly required?: boolean;
}

export interface ReportFact {
  readonly key: string;
  readonly label: string;
  readonly type: FactType;
  readonly group: FactGroup;
  readonly source: FactSource;
  /** Always starts with "e.g. ": it must never read as a saved value. */
  readonly placeholder?: string;
  readonly fixedValue?: string;
  /** Tooltip: where the value is saved or comes from, and what else changes with it. */
  readonly help: string;
  /** Set when a customer or site fact can be edited on the Reports tab. */
  readonly edit?: FactEdit;
  /** Printed by reports but not shown on the form: composed or derived from facts that are. */
  readonly hidden?: boolean;
  /** A shown fact that is one part of a hidden composed fact (the site address). */
  readonly partOf?: string;
  /** A hidden fact worked out from a shown one (Wp from kW). */
  readonly derivedFrom?: string;
}

const OUT_OF_DATE = 'Filed reports turn Out of date.';
const FROM_QUOTE =
  'From the approved quote. Change it by revising the quote, so the contract and the paperwork match.';

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
  {
    key: 'vendor_name',
    label: 'Vendor name',
    type: 'text',
    group: 'vendor',
    source: 'company',
    help: 'Our registered company name, the same on every report. It is fixed and cannot be changed here.',
  },

  {
    key: 'consumer_name',
    label: 'Consumer name',
    type: 'text',
    group: 'consumer',
    source: 'property',
    help: `Name on the electricity bill, saved on this site. Shows on the site page and every report that prints it. ${OUT_OF_DATE} For a real name change at the DISCOM, raise a change request instead.`,
    edit: { target: 'property', field: 'consumerName', required: true },
  },
  {
    key: 'consumer_number',
    label: 'Consumer number',
    type: 'text',
    group: 'consumer',
    source: 'property',
    placeholder: 'e.g. 170012345678',
    help: `Consumer number on the electricity bill, saved on this site. 10–12 digits, and no other site may use it. ${OUT_OF_DATE}`,
    edit: {
      target: 'property',
      field: 'consumerNumber',
      input: 'digits',
      digits: { min: 10, max: 12 },
      required: true,
    },
  },
  {
    key: 'consumer_phone',
    label: 'Mobile number',
    type: 'phone',
    group: 'consumer',
    source: 'customer',
    placeholder: 'e.g. 98765 43210',
    help: `Saved on the customer. Also changes the number they log in with and where WhatsApp messages go, for all their projects. ${OUT_OF_DATE}`,
    edit: { target: 'customer', field: 'phone', required: true },
  },
  {
    key: 'consumer_email',
    label: 'Email',
    type: 'email',
    group: 'consumer',
    source: 'customer',
    placeholder: 'e.g. name@example.com',
    help: `Saved on the customer. Also changes the email on their login, for all their projects. Clear it to remove it from the customer. ${OUT_OF_DATE}`,
    edit: { target: 'customer', field: 'email' },
  },
  {
    key: 'consumer_aadhaar_number',
    label: 'Aadhaar number',
    type: 'text',
    group: 'consumer',
    source: 'customer',
    placeholder: 'e.g. 1234 5678 9012',
    help: `Saved on the customer, for all their projects. Shown masked; the full number shows while you edit it. Clear it to remove it. ${OUT_OF_DATE}`,
    edit: {
      target: 'customer',
      field: 'aadhaarNumber',
      input: 'digits',
      digits: { min: 12, max: 12 },
    },
  },
  {
    key: 'site_address',
    label: 'Site address',
    type: 'textarea',
    group: 'consumer',
    source: 'property',
    hidden: true,
    help: 'The site address, city, state, PIN code and country, printed as one line.',
  },
  {
    key: 'site_address_line',
    label: 'Site address',
    type: 'textarea',
    group: 'consumer',
    source: 'property',
    partOf: 'site_address',
    placeholder: 'e.g. 12, Shivaji Nagar',
    help: `Street address of the site, saved on this site. Reports print it with the city, state and PIN code as the site address. ${OUT_OF_DATE}`,
    edit: { target: 'property', field: 'address' },
  },
  {
    key: 'site_city',
    label: 'City / district',
    type: 'text',
    group: 'consumer',
    source: 'property',
    partOf: 'site_address',
    placeholder: 'e.g. Pune',
    help: `City of the site, saved on this site. Part of the printed site address. ${OUT_OF_DATE}`,
    edit: { target: 'property', field: 'city' },
  },
  {
    key: 'site_state',
    label: 'State',
    type: 'text',
    group: 'consumer',
    source: 'property',
    partOf: 'site_address',
    placeholder: 'e.g. Maharashtra',
    help: `State of the site, saved on this site. Part of the printed site address. ${OUT_OF_DATE}`,
    edit: { target: 'property', field: 'state' },
  },
  {
    key: 'site_pincode',
    label: 'PIN code',
    type: 'text',
    group: 'consumer',
    source: 'property',
    partOf: 'site_address',
    placeholder: 'e.g. 411001',
    help: `6-digit PIN code of the site, saved on this site. Part of the printed site address. ${OUT_OF_DATE}`,
    edit: { target: 'property', field: 'pincode', input: 'digits', digits: { min: 6, max: 6 } },
  },
  {
    key: 'site_category',
    label: 'Category',
    type: 'text',
    group: 'consumer',
    source: 'property',
    help: `Property type, saved on this site. The project's existing tasks do not change. For a real change at the DISCOM, raise a change request. ${OUT_OF_DATE}`,
    edit: {
      target: 'property',
      field: 'propertyType',
      input: 'select',
      options: PROPERTY_TYPE_LABELS,
      required: true,
    },
  },

  {
    key: 'sanction_number',
    label: 'Sanction number',
    type: 'text',
    group: 'sanction',
    source: 'manual',
    placeholder: 'e.g. 63436547',
    help: "The number on the DISCOM's sanction letter.",
  },
  {
    key: 'sanction_date',
    label: 'Sanction date',
    type: 'date',
    group: 'sanction',
    source: 'manual',
    help: "The date on the DISCOM's sanction letter.",
  },
  {
    key: 'sanctioned_capacity_kw',
    label: 'Sanctioned capacity (kW)',
    type: 'number',
    group: 'sanction',
    source: 'property',
    placeholder: 'e.g. 5',
    help: `Sanctioned load on the electricity bill, in kW, saved on this site. ${OUT_OF_DATE}`,
    edit: { target: 'property', field: 'sanctionedLoad', input: 'number' },
  },
  {
    key: 'application_number',
    label: 'Application number',
    type: 'text',
    group: 'sanction',
    source: 'manual',
    help: 'The DISCOM application number for this connection.',
  },
  {
    key: 'application_date',
    label: 'Application date',
    type: 'date',
    group: 'sanction',
    source: 'manual',
    help: 'The date the DISCOM application was made.',
  },
  {
    key: 're_arrangement_type',
    label: 'RE arrangement type',
    type: 'text',
    group: 'sanction',
    source: 'manual',
    placeholder: 'e.g. Net metering',
    help: 'How the plant connects to the grid, as the DISCOM form asks.',
  },
  {
    key: 're_source',
    label: 'RE source',
    type: 'text',
    group: 'sanction',
    source: 'manual',
    placeholder: 'e.g. Solar',
    help: 'The renewable energy source, as the DISCOM form asks.',
  },
  {
    key: 'capacity_type',
    label: 'Capacity type',
    type: 'text',
    group: 'sanction',
    source: 'manual',
    placeholder: 'e.g. Rooftop',
    help: 'Where the plant is installed, as the DISCOM form asks.',
  },
  {
    key: 'project_model',
    label: 'Project model',
    type: 'text',
    group: 'sanction',
    source: 'manual',
    placeholder: 'e.g. CAPEX',
    help: 'How the plant is owned and paid for, as the DISCOM form asks.',
  },

  {
    key: 'installed_capacity_kw',
    label: 'Installed capacity (kW)',
    type: 'number',
    group: 'system',
    source: 'project',
    help: `${FROM_QUOTE} The net metering agreement prints it in Wp.`,
  },
  {
    key: 'installed_capacity_wp',
    label: 'Installed capacity (Wp)',
    type: 'number',
    group: 'system',
    source: 'project',
    hidden: true,
    derivedFrom: 'installed_capacity_kw',
    help: 'The installed capacity in Wp, worked out from the kW on the approved quote.',
  },
  {
    key: 'module_make',
    label: 'Module make',
    type: 'text',
    group: 'system',
    source: 'project',
    help: FROM_QUOTE,
  },
  {
    key: 'module_model_number',
    label: 'ALMM model number',
    type: 'text',
    group: 'system',
    source: 'project',
    help: FROM_QUOTE,
  },
  {
    key: 'module_wattage',
    label: 'Wattage per module (Wp)',
    type: 'number',
    group: 'system',
    source: 'project',
    help: FROM_QUOTE,
  },
  {
    key: 'module_count',
    label: 'Number of modules',
    type: 'number',
    group: 'system',
    source: 'project',
    help: FROM_QUOTE,
  },
  {
    key: 'module_total_kw',
    label: 'Module capacity (kW)',
    type: 'number',
    group: 'system',
    source: 'project',
    help: `${FROM_QUOTE} Worked out as wattage × number of modules.`,
  },
  {
    key: 'module_warranty',
    label: 'Module warranty',
    type: 'text',
    group: 'system',
    source: 'project',
    help: FROM_QUOTE,
  },
  {
    key: 'module_serial_numbers',
    label: 'Module serial numbers',
    type: 'textarea',
    group: 'system',
    source: 'bom',
    help: "From this project's BOM tab: the serial numbers recorded against its panels. Change them there.",
  },
  {
    key: 'inverter_make_model',
    label: 'Inverter make and model',
    type: 'text',
    group: 'system',
    source: 'project',
    help: FROM_QUOTE,
  },
  {
    key: 'inverter_make',
    label: 'Inverter make',
    type: 'text',
    group: 'system',
    source: 'project',
    help: FROM_QUOTE,
  },
  {
    key: 'inverter_total_kw',
    label: 'Inverter capacity (kW)',
    type: 'number',
    group: 'system',
    source: 'project',
    help: `${FROM_QUOTE} Worked out as capacity × quantity of each inverter.`,
  },
  {
    key: 'inverter_hpd',
    label: 'HPD',
    type: 'text',
    group: 'system',
    source: 'fixed',
    fixedValue: 'Not applicable',
    help: 'Always printed as "Not applicable" for these systems. It is fixed and cannot be changed.',
  },
  {
    key: 'charge_controller_type',
    label: 'Charge controller type',
    type: 'text',
    group: 'system',
    source: 'manual',
    placeholder: 'e.g. MPPT',
    help: "The inverter's charge controller type, from its datasheet.",
  },
  {
    key: 'inverter_year_of_manufacturing',
    label: 'Inverter year of manufacture',
    type: 'year',
    group: 'system',
    source: 'manual',
    placeholder: 'e.g. 2026',
    help: "The year on the inverter's nameplate.",
  },
  {
    key: 'cell_manufacturer_name',
    label: 'Cell manufacturer',
    type: 'text',
    group: 'system',
    source: 'manual',
    help: "The solar cell maker, from the module supplier's DCR certificate.",
  },
  {
    key: 'cell_gst_invoice_no',
    label: 'Cell GST invoice number',
    type: 'text',
    group: 'system',
    source: 'manual',
    help: 'The GST invoice number for the cells, from the module supplier.',
  },

  {
    key: 'earthing_details',
    label: 'Earthing details',
    type: 'text',
    group: 'installation',
    source: 'manual',
    placeholder: 'e.g. 3 - 3Ω, 4Ω, 3Ω',
    help: 'Number of earthing pits and the resistance measured at each.',
  },
  {
    key: 'lightning_arrester_text',
    label: 'Lightning arrester',
    type: 'textarea',
    group: 'installation',
    source: 'manual',
    help: 'The lightning arrester installed, as it should read on the report.',
  },
  {
    key: 'cmc_period_years',
    label: 'CMC period (years)',
    type: 'number',
    group: 'installation',
    source: 'manual',
    placeholder: 'e.g. 5',
    help: 'Years of comprehensive maintenance included with the plant.',
  },

  {
    key: 'agreement_date',
    label: 'Agreement date',
    type: 'date',
    group: 'agreement',
    source: 'manual',
    help: 'The date the net metering agreement is signed.',
  },
  {
    key: 'licensee_address',
    label: 'Licensee address',
    type: 'textarea',
    group: 'agreement',
    source: 'manual',
    help: 'Address of the DISCOM office that signs the agreement.',
  },
  {
    key: 'signatory_licensee_name',
    label: 'Signatory (licensee)',
    type: 'text',
    group: 'agreement',
    source: 'manual',
    help: 'The DISCOM officer who signs the agreement.',
  },
  {
    key: 'witness_consumer_name',
    label: 'Witness (consumer)',
    type: 'text',
    group: 'agreement',
    source: 'manual',
    help: "The witness who signs on the consumer's side.",
  },
  {
    key: 'witness_licensee_name',
    label: 'Witness (licensee)',
    type: 'text',
    group: 'agreement',
    source: 'manual',
    help: "The witness who signs on the DISCOM's side.",
  },

  {
    key: 'signatory_name',
    label: 'Signatory name',
    type: 'text',
    group: 'signatory',
    source: 'manual',
    help: 'The person from our company who signs the declaration.',
  },
  {
    key: 'signatory_designation',
    label: 'Signatory designation',
    type: 'text',
    group: 'signatory',
    source: 'manual',
    help: "The signatory's job title.",
  },
  {
    key: 'signatory_phone',
    label: 'Signatory phone',
    type: 'phone',
    group: 'signatory',
    source: 'manual',
    help: "The signatory's phone number.",
  },
  {
    key: 'signatory_email',
    label: 'Signatory email',
    type: 'email',
    group: 'signatory',
    source: 'manual',
    help: "The signatory's email address.",
  },
] as const satisfies readonly ReportFact[];

export type FactKey = (typeof REPORT_FACTS)[number]['key'];

type CatalogFact = (typeof REPORT_FACTS)[number];
type MustBeFactKey<K extends FactKey> = K;
/** Compile-time check: every `partOf` / `derivedFrom` names a fact in this catalog. */
export type LinkedFactKey = MustBeFactKey<
  | Extract<CatalogFact, { partOf: string }>['partOf']
  | Extract<CatalogFact, { derivedFrom: string }>['derivedFrom']
>;

const FACTS_BY_KEY = new Map<string, ReportFact>(
  (REPORT_FACTS as readonly ReportFact[]).map((fact) => [fact.key, fact]),
);

export function getFact(key: string): ReportFact | undefined {
  return FACTS_BY_KEY.get(key);
}

/**
 * The facts one shown fact stands for on the form: itself, the composed fact
 * it is part of (the site address), and hidden facts worked out from it (Wp
 * from kW). Its "used by" and "Required" chips read all of them.
 */
export function factCoverage(key: string): string[] {
  const fact = getFact(key);
  if (!fact) return [key];
  const derived = (REPORT_FACTS as readonly ReportFact[])
    .filter((other) => other.derivedFrom === key)
    .map((other) => other.key);
  return [key, ...(fact.partOf ? [fact.partOf] : []), ...derived];
}
