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

export { pickDeterministic } from './color';

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
  formatTimeAgo,
  getDueDateColor,
  getDueDateMuiColor,
  getInitials,
  toTitleLabel,
} from './format';

export { paiseToRupees } from './paise';

export { formatPhoneForWhatsApp, normalizePhoneToE164, stripPhoneCountryCode } from './phone';

export { buildTasksTabUrl } from './project';

export { recordRecentView } from './recent-views';
export { contractMovedNote, siteValue } from './site-value';
