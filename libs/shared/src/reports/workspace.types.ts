import type { FactEditAt, FactGroup, FactKey, FactSource, FactType } from './facts/report-facts';
import type { MissingFact, ReportStatus } from './status';

export interface WorkspaceFact {
  key: FactKey;
  label: string;
  type: FactType;
  group: FactGroup;
  source: FactSource;
  placeholder?: string;
  editAt?: FactEditAt;
  value: string;
  /** Ids of the reports that print this fact. */
  usedBy: string[];
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
}

export interface ReportRenderResult {
  html: string;
  pages?: number;
}
