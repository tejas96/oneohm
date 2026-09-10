/**
 * Shared inventory primitives. Imported by both the inventory dashboard
 * and the per-resource list/detail pages. Charts live under
 * ./charts/* with `next/dynamic({ ssr:false })` wrappers around the
 * recharts implementations.
 */

export type { MetricTileProps } from './metric-tile';

export { KpiStripe } from './kpi-stripe';
export { TimeWindowPicker } from './time-window-picker';
export { InventoryActivityTimeline } from './inventory-activity-timeline';
export type { InventoryActivityEvent, InventoryEventKind } from './inventory-activity-timeline';

// Charts
export { TrendLineChart, StackedBarChart, HorizontalBarChart, FunnelChartReusable } from './charts';
export type { TrendPoint, TopItem, FunnelStageInput } from './charts';
