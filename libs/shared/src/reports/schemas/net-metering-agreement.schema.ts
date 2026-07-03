import { defineReportField, type ReportSchema } from './report-field.schema';
import { DocumentTag } from '../../types/enums/document.enum';
import { buildEmptyFields, getFieldKeys } from '../utils/empty-view-model';

const SECTIONS = [
  { id: 'agreement', title: 'Agreement Details' },
  { id: 'parties', title: 'Consumer & Licensee' },
  { id: 'capacity', title: 'System Capacity' },
  { id: 'signatures', title: 'Witnesses & Signatories' },
] as const;

export const NET_METERING_AGREEMENT_SCHEMA: ReportSchema = {
  id: 'net-metering-agreement',
  name: 'Net Metering Connection Agreement',
  description: 'Annexure-3 legal agreement between consumer and MSEDCL for net-metering.',
  documentTag: DocumentTag.NET_METERING_AGREEMENT,
  sections: [...SECTIONS],
  fields: [
    defineReportField('location', 'Location (City)', 'agreement', { autoFillSource: 'property' }),
    defineReportField('day', 'Day', 'agreement', { autoFillSource: 'manual' }),
    defineReportField('month', 'Month', 'agreement', { autoFillSource: 'manual' }),
    defineReportField('year', 'Year', 'agreement', { autoFillSource: 'manual' }),
    defineReportField('consumer_name', 'Consumer Name', 'parties', { autoFillSource: 'property' }),
    defineReportField('consumer_address', 'Consumer Address', 'parties', {
      autoFillSource: 'property',
      type: 'textarea',
      colSpan: 2,
    }),
    defineReportField('consumer_number', 'Consumer Number', 'parties', {
      autoFillSource: 'property',
    }),
    defineReportField('licensee_address', 'Licensee Address', 'parties', {
      autoFillSource: 'manual',
      type: 'textarea',
      colSpan: 2,
    }),
    defineReportField('installed_capacity_wp', 'Installed Capacity (Wp)', 'capacity', {
      autoFillSource: 'project',
      type: 'number',
    }),
    defineReportField('witness_consumer_name', 'Witness (Consumer)', 'signatures', {
      autoFillSource: 'manual',
    }),
    defineReportField('witness_licensee_name', 'Witness (Licensee)', 'signatures', {
      autoFillSource: 'manual',
    }),
    defineReportField('signatory_consumer_name', 'Signatory (Consumer)', 'signatures', {
      autoFillSource: 'manual',
    }),
    defineReportField('signatory_licensee_name', 'Signatory (Licensee)', 'signatures', {
      autoFillSource: 'manual',
    }),
  ],
};

export const NET_METERING_AGREEMENT_FIELD_KEYS = getFieldKeys(NET_METERING_AGREEMENT_SCHEMA);
export type NetMeteringAgreementViewModel = Record<
  (typeof NET_METERING_AGREEMENT_FIELD_KEYS)[number],
  string
>;
export const NET_METERING_AGREEMENT_DEFAULT_FIELDS = buildEmptyFields(
  NET_METERING_AGREEMENT_SCHEMA,
) as NetMeteringAgreementViewModel;
