/**
 * Shared inventory primitives. Imported by both the inventory dashboard
 * and the per-resource list/detail pages. Charts live under
 * ./charts/* with `next/dynamic({ ssr:false })` wrappers around the
 * recharts implementations.
 */

export { MetricTile } from './metric-tile';
export type { MetricTileProps } from './metric-tile';

export { KpiStripe } from './kpi-stripe';
export type { KpiStripeProps, KpiStripeColumns } from './kpi-stripe';

export { ProgressBarCell } from './progress-bar-cell';
export type { ProgressBarCellProps, ProgressBarIntent } from './progress-bar-cell';

export { EntityLink } from './entity-link';
export type { EntityLinkProps, EntityType } from './entity-link';

export { TimeWindowPicker, TIME_WINDOW_PRESETS } from './time-window-picker';
export type { TimeWindowPickerProps, TimeWindowPreset } from './time-window-picker';

export { RowActionMenu } from './row-action-menu';
export type { RowActionMenuProps, RowAction } from './row-action-menu';

export { InlineEditCell } from './inline-edit-cell';
export type { InlineEditCellProps, InlineEditVariant } from './inline-edit-cell';

export { InventoryActivityTimeline } from './inventory-activity-timeline';
export type {
  InventoryActivityTimelineProps,
  InventoryActivityEvent,
  InventoryEventKind,
} from './inventory-activity-timeline';

export { SavedViewsBar } from './saved-views-bar';
export type { SavedViewsBarProps } from './saved-views-bar';

export { useSavedViewState } from './use-saved-view-state';
export type {
  SavedViewStatus,
  UseSavedViewStateOptions,
  UseSavedViewStateReturn,
} from './use-saved-view-state';

export { SaveViewDialog } from './save-view-dialog';
export type { SaveViewDialogProps, SaveViewDialogMode } from './save-view-dialog';

// Charts
export {
  ChartShell,
  TrendLineChart,
  StackedBarChart,
  DonutChart,
  HorizontalBarChart,
  FunnelChartReusable,
} from './charts';
export type {
  ChartShellProps,
  TrendLineChartProps,
  StackedBarChartProps,
  DonutChartProps,
  HorizontalBarChartProps,
  FunnelChartReusableProps,
  TrendPoint,
  TopItem,
  FunnelStageInput,
} from './charts';
