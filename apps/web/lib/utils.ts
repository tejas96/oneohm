import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]): string {
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
  formatCurrencyDecimal,
  formatDate,
  formatLabel,
  formatNumber,
  getDueDateColor,
  formatRelativeDate,
  formatRoleCode,
  formatSystemSize,
  formatTimeAgo,
  getInitials,
  toTitleLabel,
} from './utils/format';
export {
  formatPhoneForWhatsApp,
  formatPhoneForDisplay,
  isValidPhone,
  normalizePhoneToE164,
  stripPhoneCountryCode,
} from './utils/phone';
export { getRecentViews, recordRecentView } from './utils/recent-views';
export type { RecentViewItem, RecentViewType } from './utils/recent-views';
export { buildTasksTabUrl } from './utils/project';
export { deterministicIndex, getMuiAvatarColors, pickDeterministic } from './utils/color';
