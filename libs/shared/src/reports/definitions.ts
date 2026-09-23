import type { FactKey } from './facts/report-facts';
import { DocumentTag } from '../types/enums/document.enum';

export interface ReportFactRef {
  key: FactKey;
  required?: boolean;
}

export interface ReportDefinition {
  id: string;
  name: string;
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
  description: 'Solar plant installation completion certificate (WCR).',
  documentTag: DocumentTag.WCR,
  templateVersion: 2,
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
  description: 'Domestic Content Requirement self-declaration for MNRE/MSEDCL submission.',
  documentTag: DocumentTag.DCR,
  templateVersion: 3,
  facts: [
    req('vendor_name'),
    req('installed_capacity_kw'),
    req('consumer_name'),
    req('site_address'),
    req('application_number'),
    opt('application_date'),
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
  name: 'Net Metering Connection Agreement',
  description: 'Annexure-3 legal agreement between consumer and MSEDCL for net-metering.',
  documentTag: DocumentTag.NET_METERING_AGREEMENT,
  templateVersion: 2,
  facts: [
    req('site_city'),
    req('agreement_date'),
    req('consumer_name'),
    req('site_address'),
    req('consumer_number'),
    opt('licensee_address'),
    req('installed_capacity_wp'),
    opt('witness_consumer_name'),
    opt('witness_licensee_name'),
    req('signatory_licensee_name'),
  ],
};

export const ANNEXURE_PROFORMA_A_REPORT: ReportDefinition = {
  id: 'annexure-proforma-a',
  name: 'Annexure-I & Proforma-A',
  description: 'MAHAVITARAN commissioning report for grid-connected solar PV plant.',
  documentTag: DocumentTag.ANNEXURE_PROFORMA_A,
  templateVersion: 3,
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
    req('inverter_total_kw'),
    req('inverter_make'),
    req('module_count'),
    opt('module_total_kw'),
    opt('site_city'),
    opt('site_state'),
    req('vendor_name'),
  ],
};

/** Order here is the order on screen. A new report is added here and nowhere else in code. */
export const REPORT_DEFINITIONS: readonly ReportDefinition[] = [
  WCR_REPORT,
  ANNEXURE_PROFORMA_A_REPORT,
  NET_METERING_AGREEMENT_REPORT,
  DCR_REPORT,
];

export function getReportDefinition(id: string): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((definition) => definition.id === id);
}
