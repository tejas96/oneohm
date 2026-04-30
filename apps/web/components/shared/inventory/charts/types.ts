/**
 * Shared types for the inventory chart wrappers. These mirror the
 * shapes the backend stats endpoints return (`TrendResponse`,
 * `TopItemsResponse`, `FunnelResponse`) but are duplicated here so the
 * shared/inventory/charts package doesn't have to import from a
 * backend-coupled location.
 *
 * If these drift from the backend, the FDAL hooks that consume the
 * stats endpoints are responsible for adapting one shape to the other.
 */

export interface TrendPoint {
  /** Bucket label (e.g. ISO date `YYYY-MM-DD` or `YYYY-WW`). */
  date: string;
  /** Optional named series; when absent, `value` is used as the lone series. */
  series?: string;
  value: number;
}

export interface TopItem {
  id: string;
  label: string;
  value: number;
  /** Optional secondary value rendered next to the bar (e.g. order count). */
  secondaryValue?: number;
}

export interface FunnelStageInput {
  id: string;
  label: string;
  value: number;
}
