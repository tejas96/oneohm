// Export utility functions
export { getErrorMessage } from './error';
export {
  extractFileKey,
  FILE_TYPE_CONFIG,
  getFileExtension,
  getFileType,
  isImageFile,
  isPdfFile,
  isPreviewableFile,
} from './file';
export type { FileType } from './file';
export {
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyDecimal,
  formatDate,
  formatLabel,
  formatNumber,
  getDueDateColor,
  getDueDateMuiColor,
  formatRelativeDate,
  formatRoleCode,
  formatSystemSize,
  formatSystemSizeDisplay,
  formatTimeAgo,
  getInitials,
  toTitleLabel,
} from './format';
export { formatPhoneForWhatsApp, formatPhoneForDisplay, isValidPhone } from './phone';
export { getRecentViews, recordRecentView } from './recent-views';
export type { RecentViewItem, RecentViewType } from './recent-views';
export { deterministicIndex, pickDeterministic } from './color';
