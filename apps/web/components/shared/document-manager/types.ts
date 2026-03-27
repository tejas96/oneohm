import type { DocumentCategory, DocumentEntityType } from '@oneohm-epc/shared/types';

export type ViewMode = 'list' | 'grid';

export interface DocumentManagerProps {
  entityType: DocumentEntityType;
  entityId: string | undefined;
  title?: string;
  description?: string;
  readOnly?: boolean;
  className?: string;
  /** When entityId is undefined, component operates in draft mode:
   *  files upload to S3 and are held locally until flush(entityId) is called. */
  onDraftDocumentsChange?: (docs: DraftDocument[]) => void;
}

export interface DraftDocument {
  id: string;
  file: File;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSizeBytes: number;
  mimeType: string;
  tag: string;
  category: DocumentCategory;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}
