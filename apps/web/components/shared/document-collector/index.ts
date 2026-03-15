/**
 * Document Collector - Barrel Exports
 *
 * @module shared/document-collector
 */

export { DocumentCollector, type DocumentCollectorProps } from './document-collector';
export { DocumentSlot } from './document-slot';
export {
  LOAN_DOCUMENT_SLOTS,
  getDocumentSlots,
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  formatFileSize,
} from './constants';
export {
  LoanDocumentType,
  toPropertyDocuments,
  type DocumentSlot as DocumentSlotConfig,
  type CapturedDocument,
} from './types';
