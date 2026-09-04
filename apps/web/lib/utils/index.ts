/**
 * The single barrel for `@/lib/utils`.
 *
 * There used to be two. A `lib/utils.ts` file sat beside this directory and
 * shadowed it — Node and TypeScript both resolve `@/lib/utils` to the *file*
 * before the directory — so this `index.ts` looked authoritative while nothing
 * imported it. The two drifted: each carried exports the other lacked, and
 * anything added here simply never appeared, failing as
 * "has no exported member" from a barrel that plainly showed the member.
 *
 * `cn` now lives in `./cn` like every other util, and this is the only barrel.
 */

export { cn } from './cn';

export { deterministicIndex, getMuiAvatarColors, pickDeterministic } from './color';

export { buildCsv, CSV_CAP, downloadCsv } from './csv';
export type { CsvColumn } from './csv';

export { downloadFromUrl, PayloadTooLargeError } from './download';

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
  formatBusinessDate,
  formatLocalDate,
  parseLocalDate,
  formatDate,
  formatDueDatePendingLabel,
  formatFollowupClockTime,
  formatFollowupWhen,
  formatLabel,
  formatNumber,
  formatRelativeDate,
  formatRoleCode,
  formatSystemSize,
  formatSystemSizeDisplay,
  formatTimeAgo,
  getDueDateColor,
  getDueDateMuiColor,
  getInitials,
  toTitleLabel,
} from './format';

export { formatPaise, paiseToRupees, rupeesToPaise } from './paise';

export {
  formatPhoneForDisplay,
  formatPhoneForWhatsApp,
  isValidPhone,
  normalizePhoneToE164,
  stripPhoneCountryCode,
} from './phone';

export { buildTasksTabUrl } from './project';

export { getRecentViews, recordRecentView } from './recent-views';
export type { RecentViewItem, RecentViewType } from './recent-views';

export { contractMovedNote, siteValue } from './site-value';
export type { SiteValue, SiteValueInput } from './site-value';
