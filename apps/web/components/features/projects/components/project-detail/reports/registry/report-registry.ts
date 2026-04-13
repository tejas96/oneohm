'use client';

import { DocumentTag } from '@oneohm-epc/shared/types';

import { AnnexureProformaForm } from '../components/forms/annexure-proforma-a-form';
import { DcrForm } from '../components/forms/dcr-form';
import { NetMeteringAgreementForm } from '../components/forms/net-metering-agreement-form';
import { WcrForm } from '../components/forms/wcr-form';
import {
  generateAnnexureProformaHtml,
  type AnnexureProformaFields,
} from '../templates/annexure-proforma-a.template';
import { generateDcrHtml, type DcrFields } from '../templates/dcr.template';
import {
  generateNetMeteringAgreementHtml,
  type NetMeteringAgreementFields,
} from '../templates/net-metering-agreement.template';
import { generateWcrHtml, type WcrFields } from '../templates/wcr.template';
import type { ReportTemplate } from '../types/report.types';

export const WCR_DEFAULT_FIELDS: WcrFields = {
  vendor_name: '',
  consumer_name: '',
  consumer_number: '',
  site_address: '',
  category: '',
  sanction_number: '',
  sanctioned_capacity_kw: '',
  installed_capacity_kw: '',
  module_make: '',
  module_model_number: '',
  module_wattage: '',
  module_count: '',
  total_capacity_kwp: '',
  module_warranty: '',
  inverter_make_model: '',
  inverter_rating: '',
  charge_controller_type: '',
  inverter_capacity: '',
  inverter_hpd: '',
  inverter_year_of_manufacturing: '',
  earthing_details: '',
  lightning_arrester_text: '',
  cmc_period_years: '',
  consumer_id_type: '',
  consumer_aadhaar_number: '',
};

export const ANNEXURE_PROFORMA_A_DEFAULT_FIELDS: AnnexureProformaFields = {
  consumer_name: '',
  consumer_number: '',
  mobile_number: '',
  email: '',
  address_of_installation: '',
  re_arrangement_type: '',
  re_source: '',
  sanctioned_capacity_kw: '',
  capacity_type: '',
  project_model: '',
  re_installed_capacity_rooftop_kw: '',
  re_installed_capacity_rooftop_ground_kw: '',
  re_installed_capacity_ground_kw: '',
  installation_date: '',
  inverter_capacity_kw: '',
  inverter_make: '',
  no_of_pv_modules: '',
  module_capacity_kw: '',
  district: '',
  state: '',
  vendor_name: '',
};

export const DCR_DEFAULT_FIELDS: DcrFields = {
  vendor_name: '',
  capacity_kw: '',
  consumer_name: '',
  consumer_address: '',
  application_number: '',
  application_date: '',
  pv_module_capacities: '',
  number_of_pv_modules: '',
  pv_module_serial_numbers: '',
  pv_module_make: '',
  cell_manufacturer_name: '',
  cell_gst_invoice_no: '',
  signatory_name: '',
  signatory_designation: '',
  signatory_phone: '',
  signatory_email: '',
};

export const NET_METERING_AGREEMENT_DEFAULT_FIELDS: NetMeteringAgreementFields = {
  location: '',
  day: '',
  month: '',
  year: '',
  consumer_name: '',
  consumer_address: '',
  consumer_number: '',
  licensee_address: '',
  installed_capacity_wp: '',
  witness_consumer_name: '',
  witness_licensee_name: '',
  signatory_consumer_name: '',
  signatory_licensee_name: '',
};

function defineTemplate<T>(t: ReportTemplate<T>): ReportTemplate {
  return t as unknown as ReportTemplate;
}

/**
 * All report templates registered in the system.
 * To add a new template: create its .template.ts + form component + add one entry here.
 */
export const REPORT_REGISTRY: ReportTemplate[] = [
  defineTemplate<WcrFields>({
    id: 'wcr',
    name: 'Work Completion Report',
    description: 'Solar plant installation completion certificate (WCR).',
    documentTag: DocumentTag.WCR,
    generateHtml: generateWcrHtml,
    defaultFields: WCR_DEFAULT_FIELDS,
    FormComponent: WcrForm,
    contentSelector: '.pdf-wrapper',
  }),
  defineTemplate<AnnexureProformaFields>({
    id: 'annexure-proforma-a',
    name: 'Annexure-I & Proforma-A',
    description: 'MAHAVITARAN commissioning report for grid-connected solar PV plant.',
    documentTag: DocumentTag.ANNEXURE_PROFORMA_A,
    generateHtml: generateAnnexureProformaHtml,
    defaultFields: ANNEXURE_PROFORMA_A_DEFAULT_FIELDS,
    FormComponent: AnnexureProformaForm,
    contentSelector: '.pdf-wrapper',
  }),
  defineTemplate<NetMeteringAgreementFields>({
    id: 'net-metering-agreement',
    name: 'Net Metering Connection Agreement',
    description: 'Annexure-3 legal agreement between consumer and MSEDCL for net-metering.',
    documentTag: DocumentTag.NET_METERING_AGREEMENT,
    generateHtml: generateNetMeteringAgreementHtml,
    defaultFields: NET_METERING_AGREEMENT_DEFAULT_FIELDS,
    FormComponent: NetMeteringAgreementForm,
    contentSelector: '.pdf-wrapper',
  }),
  defineTemplate<DcrFields>({
    id: 'dcr',
    name: 'DCR Undertaking / Self-Declaration',
    description: 'Domestic Content Requirement self-declaration for MNRE/MSEDCL submission.',
    documentTag: DocumentTag.DCR,
    generateHtml: generateDcrHtml,
    defaultFields: DCR_DEFAULT_FIELDS,
    FormComponent: DcrForm,
    contentSelector: '.pdf-wrapper',
  }),
];
