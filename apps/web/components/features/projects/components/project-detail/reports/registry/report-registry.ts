'use client';

import { DocumentTag } from '@oneohm-epc/shared/types';

import { WcrForm } from '../components/forms/wcr-form';
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

function defineTemplate<T extends Record<string, string>>(t: ReportTemplate<T>): ReportTemplate {
  return t as ReportTemplate;
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
];
