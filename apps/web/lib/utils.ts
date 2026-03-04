import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export utilities
export { getErrorMessage } from './utils/error';
export {
  extractFileKey,
  getFileExtension,
  isImageFile,
  isPdfFile,
  isPreviewableFile,
} from './utils/file';
export {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  getDueDateColor,
  formatRelativeDate,
  formatSystemSize,
  getInitials,
} from './utils/format';
export { formatPhoneForWhatsApp, formatPhoneForDisplay, isValidPhone } from './utils/phone';
