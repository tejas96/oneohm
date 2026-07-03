import { ANNEXURE_PROFORMA_A_SCHEMA } from './schemas/annexure-proforma-a.schema';
import { DCR_SCHEMA } from './schemas/dcr.schema';
import { NET_METERING_AGREEMENT_SCHEMA } from './schemas/net-metering-agreement.schema';
import type { ReportSchema } from './schemas/report-field.schema';
import { WCR_SCHEMA } from './schemas/wcr.schema';

export const REPORT_CATALOG: ReportSchema[] = [
  WCR_SCHEMA,
  ANNEXURE_PROFORMA_A_SCHEMA,
  NET_METERING_AGREEMENT_SCHEMA,
  DCR_SCHEMA,
];

export type ReportId = (typeof REPORT_CATALOG)[number]['id'];

export function getReportSchema(id: string): ReportSchema {
  const schema = REPORT_CATALOG.find((r) => r.id === id);
  if (!schema) {
    throw new Error(`Unknown report: ${id}`);
  }
  return schema;
}

export function isReportId(id: string): id is ReportId {
  return REPORT_CATALOG.some((r) => r.id === id);
}

export interface ReportCatalogEntry {
  id: string;
  name: string;
  description: string;
  documentTag: ReportSchema['documentTag'];
}

export function getReportCatalogEntries(): ReportCatalogEntry[] {
  return REPORT_CATALOG.map(({ id, name, description, documentTag }) => ({
    id,
    name,
    description,
    documentTag,
  }));
}

export function getReportDocumentTags(): ReportSchema['documentTag'][] {
  return REPORT_CATALOG.map((schema) => schema.documentTag);
}
