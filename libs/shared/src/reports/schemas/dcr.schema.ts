import { defineReportField, type ReportSchema } from './report-field.schema';
import { DocumentTag } from '../../types/enums/document.enum';
import { buildEmptyFields, getFieldKeys } from '../utils/empty-view-model';

const SECTIONS = [
  { id: 'vendor_project', title: 'Vendor & Project Details' },
  { id: 'application', title: 'Application Details' },
  { id: 'pv_modules', title: 'PV Module Details' },
  { id: 'signatory', title: 'Signatory Details' },
] as const;

export const DCR_SCHEMA: ReportSchema = {
  id: 'dcr',
  name: 'DCR Undertaking / Self-Declaration',
  description: 'Domestic Content Requirement self-declaration for MNRE/MSEDCL submission.',
  documentTag: DocumentTag.DCR,
  sections: [...SECTIONS],
  fields: [
    defineReportField('vendor_name', 'Vendor / Company Name', 'vendor_project', {
      autoFillSource: 'org',
      colSpan: 2,
    }),
    defineReportField('capacity_kw', 'Installed Capacity (KW)', 'vendor_project', {
      autoFillSource: 'project',
      type: 'number',
    }),
    defineReportField('consumer_name', 'Consumer Name', 'vendor_project', {
      autoFillSource: 'property',
    }),
    defineReportField('consumer_address', 'Consumer Address', 'vendor_project', {
      autoFillSource: 'property',
      type: 'textarea',
      colSpan: 2,
    }),
    defineReportField('application_number', 'Application Number', 'application', {
      autoFillSource: 'manual',
    }),
    defineReportField('application_date', 'Application Date', 'application', {
      autoFillSource: 'manual',
      type: 'date',
    }),
    defineReportField('pv_module_capacities', 'PV Module Capacities', 'pv_modules', {
      autoFillSource: 'project',
    }),
    defineReportField('number_of_pv_modules', 'Number of PV Modules', 'pv_modules', {
      autoFillSource: 'project',
      type: 'number',
    }),
    defineReportField('pv_module_serial_numbers', 'PV Module Serial Numbers', 'pv_modules', {
      autoFillSource: 'bom',
      type: 'textarea',
      colSpan: 2,
    }),
    defineReportField('pv_module_make', 'PV Module Make', 'pv_modules', {
      autoFillSource: 'project',
    }),
    defineReportField('cell_manufacturer_name', 'Cell Manufacturer Name', 'pv_modules', {
      autoFillSource: 'manual',
    }),
    defineReportField('cell_gst_invoice_no', 'Cell GST Invoice No.', 'pv_modules', {
      autoFillSource: 'manual',
    }),
    defineReportField('signatory_name', 'Signatory Name', 'signatory', {
      autoFillSource: 'manual',
    }),
    defineReportField('signatory_designation', 'Signatory Designation', 'signatory', {
      autoFillSource: 'manual',
    }),
    defineReportField('signatory_phone', 'Signatory Phone', 'signatory', {
      autoFillSource: 'manual',
      type: 'phone',
    }),
    defineReportField('signatory_email', 'Signatory Email', 'signatory', {
      autoFillSource: 'manual',
      type: 'email',
    }),
  ],
};

export const DCR_FIELD_KEYS = getFieldKeys(DCR_SCHEMA);
export type DcrViewModel = Record<(typeof DCR_FIELD_KEYS)[number], string>;
export const DCR_DEFAULT_FIELDS = buildEmptyFields(DCR_SCHEMA) as DcrViewModel;
