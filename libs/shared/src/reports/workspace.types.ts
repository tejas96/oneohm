import type { FactEdit, FactGroup, FactKey, FactSource, FactType } from './facts/report-facts';
import type { MissingFact, ReportStatus } from './status';

/** One field on the Reports tab. Hidden (composed or derived) facts are not listed. */
export interface WorkspaceFact {
  key: FactKey;
  label: string;
  type: FactType;
  group: FactGroup;
  source: FactSource;
  placeholder?: string;
  /** Tooltip text. */
  help: string;
  /** Present on customer and site facts that save to their owner. */
  edit?: FactEdit;
  /** What reports print. */
  value: string;
  /** What the input starts from, e.g. the stored property type rather than its label. */
  editValue: string;
  /** The value can be changed here: a manual or editable source fact, project not cancelled. `projects.edit` is checked by the web. */
  editable: boolean;
  /** Ids of the reports that print this fact, or the composed/derived fact it stands for. */
  usedBy: string[];
  /** The fact itself plus the hidden facts it stands for; a report missing any of them marks this field Required. */
  covers: FactKey[];
  /** Form-only facts (printed by no report): chip text shown in place of report names. */
  chip?: string;
  /** The value shown is a fallback: the fact's own field is empty (a site without a consumer name shows the customer's name). */
  fallback?: boolean;
}

export interface FiledReportInfo {
  documentId: string;
  fileUrl: string;
  fileName: string;
  filedAt: string;
}

export interface WorkspaceReport {
  id: string;
  name: string;
  shortName: string;
  description: string;
  status: ReportStatus;
  missing: MissingFact[];
  pages?: number;
  filed: FiledReportInfo | null;
}

export interface ReportWorkspace {
  projectId: string;
  customerId: string;
  propertyId: string;
  quoteId: string;
  facts: WorkspaceFact[];
  reports: WorkspaceReport[];
  pendingCount: number;
  /** True when the project is cancelled: reports are read-only, facts cannot be edited or filed. */
  locked: boolean;
}

export interface ReportRenderResult {
  html: string;
  pages?: number;
  /** Fingerprint of the facts this html was rendered from; filing sends it back. */
  factsHash: string;
}
