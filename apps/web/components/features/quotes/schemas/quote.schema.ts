export {
  quoteBuilderSchema,
  type QuoteBuilderFormData,
  createQuoteSchema,
  type CreateQuoteFormData,
  acceptQuoteSchema,
  type AcceptQuoteFormData,
  rejectQuoteSchema,
  type RejectQuoteFormData,
} from '@tejas96/shared/schemas';

export const REJECTION_REASONS = [
  { value: 'price_too_high', label: 'Price too high' },
  { value: 'competitor_chosen', label: 'Chose competitor' },
  { value: 'project_delayed', label: 'Project delayed' },
  { value: 'requirements_changed', label: 'Requirements changed' },
  { value: 'financing_issues', label: 'Financing issues' },
  { value: 'other', label: 'Other' },
] as const;
