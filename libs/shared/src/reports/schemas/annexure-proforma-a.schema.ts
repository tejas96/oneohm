import { defineReportField, type ReportSchema } from './report-field.schema';
import { DocumentTag } from '../../types/enums/document.enum';
import { buildEmptyFields, getFieldKeys } from '../utils/empty-view-model';

const SECTIONS = [
  { id: 'consumer', title: 'Consumer Details' },
  { id: 'installation', title: 'Installation Details' },
  { id: 'capacity', title: 'Capacity & Equipment' },
  { id: 'location', title: 'Location & Vendor' },
] as const;

export const ANNEXURE_PROFORMA_A_SCHEMA: ReportSchema = {
  id: 'annexure-proforma-a',
  name: 'Annexure-I & Proforma-A',
  description: 'MAHAVITARAN commissioning report for grid-connected solar PV plant.',
  documentTag: DocumentTag.ANNEXURE_PROFORMA_A,
  sections: [...SECTIONS],
  fields: [
    defineReportField('consumer_name', 'Consumer Name', 'consumer', { autoFillSource: 'property' }),
    defineReportField('consumer_number', 'Consumer Number', 'consumer', {
      autoFillSource: 'property',
    }),
    defineReportField('mobile_number', 'Mobile Number', 'consumer', {
      autoFillSource: 'property',
      type: 'phone',
    }),
    defineReportField('email', 'Email', 'consumer', { autoFillSource: 'property', type: 'email' }),
    defineReportField('address_of_installation', 'Address of Installation', 'consumer', {
      autoFillSource: 'property',
      type: 'textarea',
      colSpan: 2,
    }),
    defineReportField('re_arrangement_type', 'RE Arrangement Type', 'installation', {
      autoFillSource: 'manual',
    }),
    defineReportField('re_source', 'RE Source', 'installation', { autoFillSource: 'manual' }),
    defineReportField('sanctioned_capacity_kw', 'Sanctioned Capacity (KW)', 'installation', {
      autoFillSource: 'property',
      type: 'number',
    }),
    defineReportField('capacity_type', 'Capacity Type', 'installation', {
      autoFillSource: 'manual',
    }),
    defineReportField('project_model', 'Project Model', 'installation', {
      autoFillSource: 'manual',
    }),
    defineReportField(
      're_installed_capacity_rooftop_kw',
      'RE Installed Capacity Rooftop (KW)',
      'capacity',
      {
        autoFillSource: 'project',
        type: 'number',
      },
    ),
    defineReportField(
      're_installed_capacity_rooftop_ground_kw',
      'RE Installed Capacity Rooftop+Ground (KW)',
      'capacity',
      { autoFillSource: 'manual', type: 'number' },
    ),
    defineReportField(
      're_installed_capacity_ground_kw',
      'RE Installed Capacity Ground (KW)',
      'capacity',
      {
        autoFillSource: 'manual',
        type: 'number',
      },
    ),
    defineReportField('installation_date', 'Installation Date', 'capacity', {
      autoFillSource: 'manual',
      type: 'date',
    }),
    defineReportField('inverter_capacity_kw', 'Inverter Capacity (KW)', 'capacity', {
      autoFillSource: 'project',
      type: 'number',
    }),
    defineReportField('inverter_make', 'Inverter Make', 'capacity', { autoFillSource: 'project' }),
    defineReportField('no_of_pv_modules', 'No. of PV Modules', 'capacity', {
      autoFillSource: 'project',
      type: 'number',
    }),
    defineReportField('module_capacity_kw', 'Module Capacity (KW)', 'capacity', {
      autoFillSource: 'project',
      type: 'number',
    }),
    defineReportField('district', 'District', 'location', { autoFillSource: 'property' }),
    defineReportField('state', 'State', 'location', { autoFillSource: 'property' }),
    defineReportField('vendor_name', 'Vendor Name', 'location', { autoFillSource: 'org' }),
  ],
};

export const ANNEXURE_PROFORMA_A_FIELD_KEYS = getFieldKeys(ANNEXURE_PROFORMA_A_SCHEMA);
export type AnnexureProformaAViewModel = Record<
  (typeof ANNEXURE_PROFORMA_A_FIELD_KEYS)[number],
  string
>;
export const ANNEXURE_PROFORMA_A_DEFAULT_FIELDS = buildEmptyFields(
  ANNEXURE_PROFORMA_A_SCHEMA,
) as AnnexureProformaAViewModel;
