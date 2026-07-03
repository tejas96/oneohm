import { defineReportField, type ReportSchema } from './report-field.schema';
import { DocumentTag } from '../../types/enums/document.enum';
import { buildEmptyFields, getFieldKeys } from '../utils/empty-view-model';

const SECTIONS = [
  { id: 'vendor_consumer', title: 'Vendor & Consumer Info' },
  { id: 'capacity', title: 'System Capacity' },
  { id: 'module', title: 'Module Specifications' },
  { id: 'inverter', title: 'Inverter / PCU' },
  { id: 'safety', title: 'Safety' },
  { id: 'cmc_identity', title: 'CMC & Consumer Identity' },
] as const;

export const WCR_SCHEMA: ReportSchema = {
  id: 'wcr',
  name: 'Work Completion Report',
  description: 'Solar plant installation completion certificate (WCR).',
  documentTag: DocumentTag.WCR,
  sections: [...SECTIONS],
  fields: [
    defineReportField('vendor_name', 'Vendor Name', 'vendor_consumer', {
      autoFillSource: 'org',
      placeholder: 'Company legal name',
    }),
    defineReportField('consumer_name', 'Consumer Name', 'vendor_consumer', {
      autoFillSource: 'property',
      placeholder: 'Full name',
    }),
    defineReportField('consumer_number', 'Consumer Number', 'vendor_consumer', {
      autoFillSource: 'property',
      placeholder: 'e.g. 279692003475',
    }),
    defineReportField('category', 'Category', 'vendor_consumer', {
      autoFillSource: 'manual',
      placeholder: 'e.g. Private / Government',
    }),
    defineReportField('site_address', 'Site Address', 'vendor_consumer', {
      autoFillSource: 'property',
      type: 'textarea',
      colSpan: 2,
      placeholder: 'Complete address with PIN',
    }),
    defineReportField('sanction_number', 'Sanction Number', 'vendor_consumer', {
      autoFillSource: 'manual',
      placeholder: 'e.g. 63436547',
    }),
    defineReportField('sanctioned_capacity_kw', 'Sanctioned Capacity (KW)', 'capacity', {
      autoFillSource: 'property',
      type: 'number',
    }),
    defineReportField('installed_capacity_kw', 'Installed Capacity (KW)', 'capacity', {
      autoFillSource: 'project',
      type: 'number',
    }),
    defineReportField('module_make', 'Make of Module', 'module', {
      autoFillSource: 'project',
    }),
    defineReportField('module_model_number', 'ALMM Model Number', 'module', {
      autoFillSource: 'project',
    }),
    defineReportField('module_wattage', 'Wattage per Module (Wp)', 'module', {
      autoFillSource: 'project',
      type: 'number',
    }),
    defineReportField('module_count', 'No. of Modules', 'module', {
      autoFillSource: 'project',
      type: 'number',
    }),
    defineReportField('total_capacity_kwp', 'Total Capacity (KWp)', 'module', {
      autoFillSource: 'project',
      type: 'number',
    }),
    defineReportField('module_warranty', 'Warranty Details', 'module', {
      autoFillSource: 'project',
      placeholder: 'e.g. 12+30 Years',
    }),
    defineReportField('inverter_make_model', 'Make & Model Number', 'inverter', {
      autoFillSource: 'project',
      colSpan: 2,
    }),
    defineReportField('inverter_rating', 'Rating (KW)', 'inverter', {
      autoFillSource: 'project',
      type: 'number',
    }),
    defineReportField('charge_controller_type', 'Charge Controller Type', 'inverter', {
      autoFillSource: 'manual',
      placeholder: 'e.g. MPPT',
    }),
    defineReportField('inverter_capacity', 'Inverter Capacity (KW)', 'inverter', {
      autoFillSource: 'project',
      type: 'number',
    }),
    defineReportField('inverter_hpd', 'HPD', 'inverter', {
      autoFillSource: 'manual',
      placeholder: 'e.g. NA',
    }),
    defineReportField('inverter_year_of_manufacturing', 'Year of Manufacturing', 'inverter', {
      autoFillSource: 'manual',
    }),
    defineReportField('earthing_details', 'Earthing Details', 'safety', {
      autoFillSource: 'manual',
      placeholder: 'e.g. 3 - 3Ω, 4Ω, 3Ω',
    }),
    defineReportField('lightning_arrester_text', 'Lightning Arrester', 'safety', {
      autoFillSource: 'manual',
    }),
    defineReportField('cmc_period_years', 'CMC Period (Years)', 'cmc_identity', {
      autoFillSource: 'manual',
      type: 'number',
    }),
    defineReportField('consumer_id_type', 'Identity Type', 'cmc_identity', {
      autoFillSource: 'manual',
      placeholder: 'e.g. Aadhar Card',
    }),
    defineReportField('consumer_aadhaar_number', 'Aadhar Number', 'cmc_identity', {
      autoFillSource: 'manual',
      colSpan: 2,
    }),
  ],
};

export const WCR_FIELD_KEYS = getFieldKeys(WCR_SCHEMA) as readonly [
  (typeof WCR_SCHEMA.fields)[number]['key'],
  ...(typeof WCR_SCHEMA.fields)[number]['key'][],
];
export type WcrViewModel = Record<(typeof WCR_FIELD_KEYS)[number], string>;
export const WCR_DEFAULT_FIELDS = buildEmptyFields(WCR_SCHEMA) as WcrViewModel;
