/**
 * Shared chart palette for the inventory dashboard and any other recharts
 * surface. Mirrors the `chart.*` tokens defined in `tailwind.config.ts`
 * (chart.1 .. chart.5) verbatim so a chart fill is exactly the same colour
 * the rest of the design system uses for that index.
 *
 * Why a TS module instead of consuming the Tailwind tokens directly:
 * recharts (and other svg chart libs) need string colour values at render
 * time — Tailwind classes don't apply to `fill`/`stroke` props. Pulling
 * the values into one module keeps every chart in lockstep with the
 * design system: when the tokens change in tailwind.config.ts they MUST
 * change here too (and vice versa).
 *
 * Dark-mode parity: the v2 design system currently defines the same hex
 * values for chart.* in light and dark mode (see tailwind.config.ts), so
 * static constants are correct. If we ever introduce per-mode chart
 * tokens, replace the values with `getComputedStyle()`-resolved CSS vars
 * inside a small `useChartPalette()` hook — keep this module's API
 * stable so consumers don't churn.
 *
 * SSR-safe by construction: no DOM access, no `window`/`document`, no
 * `getComputedStyle` calls. Importable from server components.
 */

/**
 * Direct mirror of `theme.extend.colors.chart` in tailwind.config.ts.
 * Keys match the Tailwind index for ergonomics: `CHART_COLORS[1]` is
 * `bg-chart-1`.
 */
/**
 * Analytical chart palette — desaturated, mid-luminance tones picked for
 * readability across long sessions. Saturated brand colors (#76c044,
 * #0d74b8 et al) are perfect on marketing surfaces but compete with the
 * data on a dashboard, so we use softer Tailwind-500 equivalents that
 * read clearly when stacked or sat next to each other for hours.
 */
export const CHART_COLORS = {
  1: '#3b82f6', // blue-500   — primary series / first stage
  2: '#14b8a6', // teal-500   — secondary
  3: '#f59e0b', // amber-500  — accent / warning-ish
  4: '#8b5cf6', // violet-500 — alt accent
  5: '#f43f5e', // rose-500   — terminal / error-ish
} as const;

export type ChartColorIndex = keyof typeof CHART_COLORS;

/**
 * Ordered palette for series-by-index assignment (`series[i % length]`).
 * The order is intentional: green and blue first because they're the
 * brand spine and read as "primary"/"secondary" in any dashboard, then
 * amber/purple/orange as accent steps.
 */
export const CHART_SERIES_COLORS: readonly string[] = [
  CHART_COLORS[1],
  CHART_COLORS[2],
  CHART_COLORS[3],
  CHART_COLORS[4],
  CHART_COLORS[5],
];

/**
 * Semantic status colours for charts that need to convey state (success
 * funnel, warning bucket, error/critical, info). Mirrors the matching
 * `success/warning/error/info` tokens from tailwind.config.ts. Keep this
 * separate from `CHART_SERIES_COLORS` so generic series charts don't
 * accidentally read as "alerts".
 *
 * `neutral` is gray-500 from the same config; we use it for inactive
 * legends, "other" buckets, and disabled states.
 */
export const SEMANTIC_CHART_COLORS = {
  success: '#22c55e',
  warning: '#eab308',
  danger: '#dc2626',
  info: '#0ea5e9',
  neutral: '#71717a',
} as const;

export type SemanticChartColor = keyof typeof SEMANTIC_CHART_COLORS;

/**
 * Look up a chart colour by zero-based series index, wrapping around the
 * palette so callers never need to count or take a modulo themselves.
 *
 * @param index zero-based series index (0..n)
 * @param fallback used only if the palette is somehow empty (defensive)
 */
export function getChartColor(index: number, fallback = SEMANTIC_CHART_COLORS.neutral): string {
  if (CHART_SERIES_COLORS.length === 0) return fallback;
  const i =
    ((index % CHART_SERIES_COLORS.length) + CHART_SERIES_COLORS.length) %
    CHART_SERIES_COLORS.length;
  return CHART_SERIES_COLORS[i] ?? fallback;
}

/**
 * Look up a semantic colour by name; returns `neutral` if a caller
 * passes an unknown key (rare but possible when a status enum widens).
 */
export function getSemanticChartColor(name: SemanticChartColor | (string & {})): string {
  if (name in SEMANTIC_CHART_COLORS) {
    return SEMANTIC_CHART_COLORS[name as SemanticChartColor];
  }
  return SEMANTIC_CHART_COLORS.neutral;
}

/**
 * Standard axis tick styling for recharts XAxis/YAxis. Matches the
 * `text-foreground-tertiary` token from the design system (gray-500)
 * so axis labels read as quiet metadata rather than competing with the
 * series themselves. Use as: `<XAxis tick={CHART_AXIS_TICK_STYLE} />`.
 */
export const CHART_AXIS_TICK_STYLE = {
  fontSize: 11,
  fill: '#71717a', // gray-500 / foreground-tertiary
} as const;

/**
 * Subtle hover cursor for `<Tooltip cursor={CHART_TOOLTIP_CURSOR} />`.
 * 4% black is barely-visible but enough to anchor where the user is
 * pointing without dominating the chart. Mirrors the inline value
 * already used by the existing priority-breakdown-chart.
 */
export const CHART_TOOLTIP_CURSOR = { fill: 'rgba(0,0,0,0.04)' } as const;
