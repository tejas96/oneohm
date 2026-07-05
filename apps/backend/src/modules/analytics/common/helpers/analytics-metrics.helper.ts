export interface AnalyticsTrendMetric {
  value: number;
  /** `new` — no comparable value in the previous period, so no percentage change is meaningful */
  direction: 'up' | 'down' | 'flat' | 'new';
}

export function parseNumericValue(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeConversionRate(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round((current / previous) * 1000) / 10;
}

export function computeTrendMetric(current: number, previous: number): AnalyticsTrendMetric {
  if (previous === 0) {
    // No baseline to compare against — reporting a fabricated "+100%" would be misleading.
    return { value: 0, direction: current > 0 ? 'new' : 'flat' };
  }
  const pctChange = Math.round(((current - previous) / previous) * 1000) / 10;
  const direction = pctChange > 0 ? 'up' : pctChange < 0 ? 'down' : 'flat';
  return { value: Math.abs(pctChange), direction };
}

export function computePreviousWindow(
  fromDate: string,
  toDate: string,
): {
  fromDate: string;
  toDate: string;
} {
  const start = new Date(`${fromDate}T00:00:00.000Z`);
  const end = new Date(`${toDate}T00:00:00.000Z`);
  const spanDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(prevEnd.getTime() - (spanDays - 1) * 24 * 60 * 60 * 1000);
  return {
    fromDate: prevStart.toISOString().slice(0, 10),
    toDate: prevEnd.toISOString().slice(0, 10),
  };
}
