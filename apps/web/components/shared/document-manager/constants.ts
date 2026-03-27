import { DOCUMENT_TAG_LABELS, DOCUMENT_CATEGORY_LABELS } from '@oneohm-epc/shared/constants';
import { DocumentCategory } from '@oneohm-epc/shared/types';

export const DOCUMENT_TAG_OPTIONS: { value: string; label: string }[] = Object.entries(
  DOCUMENT_TAG_LABELS,
).map(([value, label]) => ({ value, label }));

export const TAG_LABEL_MAP: Record<string, string> = DOCUMENT_TAG_LABELS;

export const DOCUMENT_CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] =
  Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => ({
    value: value as DocumentCategory,
    label,
  }));

export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.pdf';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
