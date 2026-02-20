// Quotes Feature - Barrel Exports

// Components
export { QuoteListPage } from './components/quote-list-page';
export { QuoteBuilder } from './components/quote-builder';
export { QuotePreviewPanel } from './components/quote-preview-panel';
export type { QuotePreviewPanelProps } from './components/quote-preview-panel';
export { QuoteDetailPage } from './components/quote-detail-page';

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
} from './hooks';
export type {
  QuoteFilters,
  QuoteListItem,
  QuoteListResponse,
  QuoteStatusCounts,
  PanelBrandOption,
  InverterBrandOption,
  PanelTechnologyVariant,
  UseQuoteFormLogicOptions,
  UseQuoteFormLogicReturn,
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
  SYSTEM_TYPE_LABELS,
  QUOTE_FILTER_TABS,
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  PROJECT_TYPE_OPTIONS,
  PHASE_TYPE_OPTIONS,
  STRUCTURE_TYPE_OPTIONS,
  DCR_PREFERENCE_OPTIONS,
  QUICK_SIZE_OPTIONS,
  DISCOUNT_PRESETS,
} from './constants';

// Schemas
export { quoteBuilderSchema, createQuoteSchema } from './schemas/quote.schema';
export type { QuoteBuilderFormData, CreateQuoteFormData } from './schemas/quote.schema';
