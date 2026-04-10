// Export shared components

// Re-export commonly used UI components for convenience
export { StatsCard } from '../ui';
export type { StatsCardProps } from '../ui';

// Address Autocomplete
export { AddressAutocompleteInput } from './address-autocomplete-input';

// Command Palette
export { CommandPalette } from './command-palette';

// Guards
export { AuthGuard, PermissionGuard } from './guards';

// Alerts
export { Alert, alertVariants } from './alerts';
export type { AlertProps } from './alerts';

// Forms
export { FieldLabel } from './forms';

// Data Table
export {
  Pagination,
  TablePagination,
  DataTable,
  createSortableHeader,
  createSelectionColumn,
} from './data-table';
export type { PaginationProps, TablePaginationProps, DataTableProps } from './data-table';

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
export {
  RadioCard,
  RadioCardGroup,
  PropertySelector,
  EditableField,
  LeadTemperatureSelector,
  NumberStepper,
  CreatableCombobox,
} from './forms';
export type {
  RadioCardProps,
  RadioCardGroupProps,
  Property,
  PropertySelectorProps,
  EditableFieldProps,
  LeadTemperatureSelectorProps,
  NumberStepperProps,
  CreatableComboboxProps,
  ComboboxOption,
} from './forms';

// Search
export { SearchInput, SearchTrigger, CustomerSearchCombobox } from './search';
export type {
  SearchResult,
  SearchResultGroup,
  SearchInputProps,
  SearchTriggerProps,
  Customer,
  CustomerSearchComboboxProps,
} from './search';

// Filters
export { FilterTabs } from './filters';
export type { FilterTab, FilterTabsProps } from './filters';

// Drawers
export { DrillDownDrawer } from './drawers';
export type { DrillDownItem, DrillDownDrawerProps } from './drawers';

// Wizards
export { Stepper, CollapsibleStepCard, StepCardGroup } from './wizards';
export type {
  Step,
  StepStatus,
  StepperProps,
  StepCardStatus,
  CollapsibleStepCardProps,
  StepCardGroupProps,
} from './wizards';

// Timeline
export { Timeline } from './timeline';
export type { TimelineItem, TimelineProps } from './timeline';

// Charts
export { FunnelChart } from './charts';
export type { FunnelStage, FunnelChartProps } from './charts';

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

// Document Collector
export {
  DocumentCollector,
  DocumentSlot,
  LOAN_DOCUMENT_SLOTS,
  getDocumentSlots,
  LoanDocumentType,
  toPropertyDocuments,
} from './document-collector';
export type {
  DocumentCollectorProps,
  DocumentSlotConfig,
  CapturedDocument,
} from './document-collector';