// Export utility functions
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
} from './format';
export { formatPhoneForWhatsApp, formatPhoneForDisplay, isValidPhone } from './phone';
export { getRecentViews, recordRecentView } from './recent-views';
export type { RecentViewItem, RecentViewType } from './recent-views';
