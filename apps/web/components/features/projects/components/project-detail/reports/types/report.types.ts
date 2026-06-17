import type { DocumentTag } from '@tejas96/shared/types';
import type React from 'react';

export type GenerateStatus = 'idle' | 'generating' | 'uploading' | 'saving' | 'success' | 'error';

export const GENERATE_STATUS_LABELS: Record<GenerateStatus, string> = {
  idle: '',
  generating: 'Generating PDF…',
  uploading: 'Uploading to storage…',
  saving: 'Saving record…',
  success: 'Report generated successfully',
  error: 'Generation failed',
};

export interface ReportFormProps<TFields> {
  fields: TFields;
  onChange: (fields: TFields) => void;
  disabled?: boolean;
}

export interface ReportTemplate<TFields = Record<string, string>> {
  id: string;
  name: string;
  description: string;
  documentTag: DocumentTag;
  generateHtml: (fields: TFields) => string;
  defaultFields: TFields;
  FormComponent: React.ComponentType<ReportFormProps<TFields>>;
  /** CSS selector for the printable content element inside the generated HTML.
   *  html2pdf targets this element — same pattern as quote-pdf.service.ts uses `.document`. */
  contentSelector: string;
}
