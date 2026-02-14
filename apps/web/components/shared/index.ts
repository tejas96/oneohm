// Export shared components

// Guards
export { AuthGuard, PermissionGuard } from './guards';

// Alerts
export { Alert, alertVariants } from './alerts';
export type { AlertProps } from './alerts';

// Data Table
export { Pagination, TablePagination } from './data-table';
export type { PaginationProps, TablePaginationProps } from './data-table';

// Feedback (Empty States)
export {
  EmptyState,
  emptyStateVariants,
  NoData,
  NoSearchResults,
  NoCustomers,
  ErrorState,
  TableEmpty,
  NoQuotes,
} from './feedback';
export type { EmptyStateProps, NoSearchResultsProps, ErrorStateProps } from './feedback';

// Forms
export { RadioCard, RadioCardGroup } from './forms';
export type { RadioCardProps, RadioCardGroupProps } from './forms';

// Search
export { SearchInput, SearchTrigger } from './search';
export type {
  SearchResult,
  SearchResultGroup,
  SearchInputProps,
  SearchTriggerProps,
} from './search';

// Wizards
export { Stepper } from './wizards';
export type { Step, StepStatus, StepperProps } from './wizards';

// Timeline
export { Timeline } from './timeline';
export type { TimelineItem, TimelineProps } from './timeline';

// Display
export { FieldDisplay } from './display';
export type {
  FieldDisplayProps,
  FieldDisplaySize,
  ReferralData,
  GPSData,
  ShadingData,
  ShadingLevel,
  ShadingDetail,
  DocumentStatusData,
  DocumentItem,
  DocumentStatus,
  ConnectionData,
  ConnectionType,
  LoanData,
} from './display';
