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
  /** Set while documents are being picked for printing: items show a checkbox instead of actions. */
  selection?: ManagerSelection;
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

/** One item while documents are being picked for printing. */
export interface ItemSelection {
  selected: boolean;
  /** Not a PDF or JPG/PNG photo: it cannot go in a print bundle. */
  disabled: boolean;
  onToggle: () => void;
}

/** Picking documents across a manager: the hub owns what is picked. */
export interface ManagerSelection {
  isSelected: (id: string) => boolean;
  canSelect: (doc: DocumentRecord) => boolean;
  onToggle: (doc: DocumentRecord) => void;
}
