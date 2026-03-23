// Export utility functions
export { extractAddressComponents } from './address-utils';
export type { PlaceDetails } from './address-utils';
export { getErrorMessage } from './error';
export {
  extractFileKey,
  getFileExtension,
  isImageFile,
  isPdfFile,
  isPreviewableFile,
} from './file';
export {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  getDueDateColor,
  formatRelativeDate,
  formatSystemSize,
  formatTimeAgo,
  getInitials,
} from './format';
export { formatPhoneForWhatsApp, formatPhoneForDisplay, isValidPhone } from './phone';
export { getRecentViews, recordRecentView } from './recent-views';
export type { RecentViewItem, RecentViewType } from './recent-views';
