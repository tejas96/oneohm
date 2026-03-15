// Quotes Feature - Barrel Exports

// Components
export { QuoteListPage } from './components/quote-list-page';
export { QuoteBuilder } from './components/quote-builder';
export { QuotePreviewPanel } from './components/quote-preview-panel';
export type { QuotePreviewPanelProps } from './components/quote-preview-panel';
export { QuoteDetailPage } from './components/quote-detail-page';
export { QuoteStatusDropdown } from './components/quote-status-dropdown';

// Hooks
export {
  quoteKeys,
  useQuotes,
  useQuote,
  useQuoteStatusCounts,
  useSendQuote,
  useDeleteQuote,
  useAcceptQuote,
  useRejectQuote,
  useConvertToProject,
  useQuoteConfig,
  useCalculateQuote,
  useSaveQuote,
  useQuoteFormLogic,
  useQuotePdf,
  quoteDetailKeys,
  useQuoteDetail,
  useQuoteVersion,
} from './hooks';
export type {
  QuoteFilters,
  QuoteListItem,
  QuoteListResponse,
  QuoteStatusCounts,
  UseQuoteFormLogicOptions,
  UseQuoteFormLogicReturn,
  QuoteDetail,
  QuoteVersionDetail,
  QuoteLineItemDetail,
  QuotePaymentMilestone,
} from './hooks';

// Types
export type {
  CalculateQuoteRequest,
  CalculateQuoteResponse,
  CreateFromCalculationRequest,
  SaveQuoteResponse,
  QuoteConfigResponse,
  SubsidyConfigResponse,
  QuotePdfData,
  QuoteCustomerInfo,
  QuotePropertyInfo,
} from './types';

// Constants
export {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_BADGE_VARIANTS,
  QUOTE_STATUS_TRANSITIONS,
  SYSTEM_TYPE_LABELS,
  QUOTE_FILTER_TABS,
  QUOTE_DETAIL_TABS,
  ITEM_CATEGORY_LABELS,
  PROJECT_TYPE_LABELS,
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  PROJECT_TYPE_OPTIONS,
  PHASE_TYPE_OPTIONS,
  DCR_PREFERENCE_OPTIONS,
  QUICK_SIZE_OPTIONS,
  DISCOUNT_PRESETS,
} from './constants';
export type { QuoteDetailTab } from './constants';

// Schemas
export { quoteBuilderSchema, createQuoteSchema } from './schemas/quote.schema';
export type { QuoteBuilderFormData, CreateQuoteFormData } from './schemas/quote.schema';
