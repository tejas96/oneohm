import type { FactKey } from './facts/report-facts';
import { DocumentTag } from '../types/enums/document.enum';

export interface ReportFactRef {
  key: FactKey;
  required?: boolean;
}

export interface ReportDefinition {
  id: string;
  name: string;
  /** Tag text where the full name does not fit, e.g. "Used by WCR, DCR". */
  shortName: string;
  description: string;
  documentTag: DocumentTag;
  /** Bump when the template's wording or layout changes: filed copies turn "out of date". */
  templateVersion: number;
  /** Exact page count the PDF must have. Only declared where it has been measured. */
  pages?: number;
  facts: readonly ReportFactRef[];
}

const req = (key: FactKey): ReportFactRef => ({ key, required: true });
const opt = (key: FactKey): ReportFactRef => ({ key });

export const WCR_REPORT: ReportDefinition = {
  id: 'wcr',
  name: 'Work Completion Report',
  shortName: 'WCR',
  description: 'Solar plant installation completion certificate (WCR).',
  documentTag: DocumentTag.WCR,
  // 3: lightning arrester "Standard", CMC 5 years, printed as fixed values.
  templateVersion: 3,
  pages: 2,
  facts: [
    req('vendor_name'),
    req('consumer_name'),
    req('consumer_number'),
    opt('site_category'),
    req('site_address'),
    opt('sanction_number'),
    opt('sanction_date'),
    req('sanctioned_capacity_kw'),
    req('installed_capacity_kw'),
    req('module_make'),
    opt('module_model_number'),
    req('module_wattage'),
    req('module_count'),
    opt('module_total_kw'),
    opt('module_warranty'),
    req('inverter_make_model'),
    req('inverter_total_kw'),
    opt('charge_controller_type'),
    opt('inverter_hpd'),
    opt('inverter_year_of_manufacturing'),
    req('earthing_details'),
    opt('lightning_arrester_text'),
    opt('cmc_period_years'),
    opt('consumer_aadhaar_number'),
  ],
};

export const DCR_REPORT: ReportDefinition = {
  id: 'dcr',
  name: 'DCR Undertaking / Self-Declaration',
  shortName: 'DCR',
  description: 'Domestic Content Requirement self-declaration for MNRE/MSEDCL submission.',
  documentTag: DocumentTag.DCR,
  // 4: prints the one application / sanction number and date the WCR prints.
  // 6: the company signatory makes the declaration (not the customer); module capacity in Wp.
  templateVersion: 6,
  facts: [
    req('vendor_name'),
    req('installed_capacity_kw'),
    req('consumer_name'),
    req('site_address'),
    req('sanction_number'),
    opt('sanction_date'),
    opt('module_wattage'),
    req('module_count'),
    opt('module_serial_numbers'),
    req('module_make'),
    opt('cell_manufacturer_name'),
    opt('cell_gst_invoice_no'),
    req('signatory_name'),
    req('signatory_designation'),
    opt('signatory_phone'),
    opt('signatory_email'),
  ],
};

export const NET_METERING_AGREEMENT_REPORT: ReportDefinition = {
  id: 'net-metering-agreement',
  name: 'Net Metering Agreement',
  shortName: 'Net metering',
  description: 'Net metering agreement between the consumer and MSEDCL.',
  documentTag: DocumentTag.NET_METERING_AGREEMENT,
  // 3: agreement date left blank to fill by hand, customer name in the witness
  // line, no "Shri.", customer name optional.
  // 4: the client's new format: title once on page 1, kW, MSEDCL registered office,
  // clause 11.0, no signatures or witnesses (submission is the agreement).
  templateVersion: 4,
  facts: [
    opt('consumer_name'),
    req('site_address'),
    req('consumer_number'),
    req('installed_capacity_kw'),
  ],
};

export const ANNEXURE_PROFORMA_A_REPORT: ReportDefinition = {
  id: 'annexure-proforma-a',
  name: 'Annexure-I & Proforma-A',
  shortName: 'Annexure A',
  description: 'MAHAVITARAN commissioning report for grid-connected solar PV plant.',
  documentTag: DocumentTag.ANNEXURE_PROFORMA_A,
  // 6: one-line header, WCR-style signatures (vendor name as the agency), page 2 top margin.
  // 7: a mount that does not apply (and rooftop + ground) prints N/A once the other mount's kW is saved.
  // 8: the installation date blanks carry a light DD-MM-YYYY guide.
  templateVersion: 8,
  facts: [
    req('consumer_name'),
    req('consumer_number'),
    req('consumer_phone'),
    opt('consumer_email'),
    req('site_address'),
    opt('re_arrangement_type'),
    opt('re_source'),
    req('sanctioned_capacity_kw'),
    opt('capacity_type'),
    opt('project_model'),
    req('installed_capacity_kw'),
    opt('re_installed_capacity_rooftop_kw'),
    opt('re_installed_capacity_ground_kw'),
    opt('re_installed_capacity_rooftop_ground_kw'),
    req('inverter_total_kw'),
    req('inverter_make'),
    req('module_count'),
    opt('module_total_kw'),
    opt('site_city'),
    opt('site_state'),
    req('vendor_name'),
  ],
};

export const MODEL_AGREEMENT_REPORT: ReportDefinition = {
  id: 'model-agreement',
  name: 'Model Agreement',
  shortName: 'Model agreement',
  description:
    'MNRE model agreement between the applicant and the vendor (Rooftop Solar Programme Ph-II).',
  documentTag: DocumentTag.MODEL_AGREEMENT,
  templateVersion: 1,
  facts: [
    req('consumer_name'),
    req('consumer_number'),
    req('site_address'),
    req('vendor_name'),
    req('vendor_address'),
    req('module_total_kw'),
    req('module_make'),
    opt('module_model_number'),
    req('module_wattage'),
    opt('module_efficiency'),
    req('inverter_make_model'),
    req('inverter_total_kw'),
    req('system_cost'),
    req('signatory_name'),
  ],
};

export const METER_TEST_LETTER_REPORT: ReportDefinition = {
  id: 'meter-test-letter',
  name: 'Meter Test Covering Letter',
  shortName: 'Meter test letter',
  description: 'Letter asking MSEDCL to test the generation meter, with or without CT.',
  documentTag: DocumentTag.METER_TEST_LETTER,
  templateVersion: 1,
  facts: [
    req('vendor_name'),
    req('consumer_name'),
    req('consumer_number'),
    req('sanction_number'),
    opt('sanction_date'),
    req('meter_serial_number'),
    req('meter_make'),
    req('meter_capacity'),
    req('signatory_name'),
    opt('signatory_designation'),
  ],
};

/** Order here is the order on screen. A new report is added here and nowhere else in code. */
export const REPORT_DEFINITIONS: readonly ReportDefinition[] = [
  WCR_REPORT,
  ANNEXURE_PROFORMA_A_REPORT,
  NET_METERING_AGREEMENT_REPORT,
  DCR_REPORT,
  MODEL_AGREEMENT_REPORT,
  METER_TEST_LETTER_REPORT,
];

export function getReportDefinition(id: string): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((definition) => definition.id === id);
}
