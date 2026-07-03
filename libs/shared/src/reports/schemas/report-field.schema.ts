import type { DocumentTag } from '../../types/enums/document.enum';

export type ReportFieldType = 'text' | 'textarea' | 'number' | 'date' | 'email' | 'phone';

export type ReportAutoFillSource = 'project' | 'property' | 'org' | 'bom' | 'manual';

export interface ReportFieldDefinition {
  key: string;
  label: string;
  placeholder?: string;
  type: ReportFieldType;
  required?: boolean;
  colSpan?: 1 | 2;
  section: string;
  helpText?: string;
  autoFillSource?: ReportAutoFillSource;
}

export interface ReportSectionDefinition {
  id: string;
  title: string;
}

export interface ReportSchema {
  id: string;
  name: string;
  description: string;
  documentTag: DocumentTag;
  sections: ReportSectionDefinition[];
  fields: ReportFieldDefinition[];
}

export function defineReportField(
  key: string,
  label: string,
  section: string,
  overrides: Partial<Omit<ReportFieldDefinition, 'key' | 'label' | 'section'>> = {},
): ReportFieldDefinition {
  return { key, label, section, type: 'text', ...overrides };
}
