import type { DocumentCategory, DocumentEntityType } from '@tejas96/shared/types';

import type { DocumentRecord } from '@/lib/api/documents';

export type ViewMode = 'list' | 'grid';

export interface DocumentManagerProps {
  entityType: DocumentEntityType;
  entityId: string | undefined;
  propertyId?: string;
  allowedTags?: string[];
  title?: string;
  description?: string;
  readOnly?: boolean;
  className?: string;
  /** When entityId is undefined, component operates in draft mode:
   *  files upload to S3 and are held locally until flush(entityId) is called. */
  onDraftDocumentsChange?: (docs: DraftDocument[]) => void;
  documents?: DocumentRecord[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  disableEntityTypeSelector?: boolean;
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
  entityType?: DocumentEntityType;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}
