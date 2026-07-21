/**
 * Shared chart palette for every recharts surface.
 *
 * Derived from `lib/theme/tokens.ts` — the design-system source of truth.
 * A TS module (rather than Tailwind classes) because recharts and other SVG
 * chart libs need string colour values at render time: utilities don't apply
 * to `fill`/`stroke` props.
 *
 * SSR-safe by construction: no DOM access, no `window`/`document`, no
 * `getComputedStyle`. Importable from server components.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * This file previously hardcoded its own ramp. Its header claimed to mirror
 * `theme.extend.colors.chart` in `tailwind.config.ts` "verbatim" while a
 * second comment thirty lines down explained why the values deliberately
 * differed — and all five had drifted from the config. That is why the
 * values now come from one place and `__tests__/tokens-sync.test.ts` guards
 * it. Do not reintroduce literals here.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { color } from '../theme/tokens';

/**
 * Ordered, colourblind-safe ramp. Keys match the Tailwind index for
 * ergonomics: `CHART_COLORS[1]` pairs with `bg-chart-1`.
 *
 * Green and blue lead because they are the brand spine and read as
 * "primary"/"secondary" in any dashboard; the rest step through amber, sky,
 * deep green, mid blue, bronze and stone.
 */
export const CHART_COLORS = {
  1: color['chart-1'],
  2: color['chart-2'],
  3: color['chart-3'],
  4: color['chart-4'],
  5: color['chart-5'],
  6: color['chart-6'],
  7: color['chart-7'],
  8: color['chart-8'],
} as const;

export type ChartColorIndex = keyof typeof CHART_COLORS;

/** Ordered palette for series-by-index assignment (`series[i % length]`). */
export const CHART_SERIES_COLORS: readonly string[] = [
  CHART_COLORS[1],
  CHART_COLORS[2],
  CHART_COLORS[3],
  CHART_COLORS[4],
  CHART_COLORS[5],
  CHART_COLORS[6],
  CHART_COLORS[7],
  CHART_COLORS[8],
];

/**
 * Semantic status colours for charts that convey state (success funnel,
 * warning bucket, error/critical, info). Kept separate from
 * `CHART_SERIES_COLORS` so generic series charts don't read as "alerts".
 *
 * These are the vivid `-main` fills, not the readable foregrounds — a chart
 * segment is a fill, not text.
 */
export const SEMANTIC_CHART_COLORS = {
  success: color['success-main'],
  warning: color['warning-main'],
  danger: color.danger,
  info: color['info-main'],
  neutral: color.neutral,
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
 * Look up a semantic colour by name; returns `neutral` if a caller passes an
 * unknown key (rare but possible when a status enum widens).
 */
export function getSemanticChartColor(name: SemanticChartColor | (string & {})): string {
  if (name in SEMANTIC_CHART_COLORS) {
    return SEMANTIC_CHART_COLORS[name as SemanticChartColor];
  }
  return SEMANTIC_CHART_COLORS.neutral;
}

/**
 * Standard axis tick styling for recharts XAxis/YAxis. Uses `text-secondary`
 * (7.63:1 on white) rather than `text-tertiary` — the DS tertiary tone is
 * 2.52:1 and fails WCAG AA, which matters for axis labels people actually
 * read. Use as: `<XAxis tick={CHART_AXIS_TICK_STYLE} />`.
 */
export const CHART_AXIS_TICK_STYLE = {
  fontSize: 11,
  fill: color['text-secondary'],
} as const;

/** Gridlines sit at the quietest step so series stay dominant. */
export const CHART_GRIDLINE_COLOR = color['chart-gridline'];

/**
 * Subtle hover cursor for `<Tooltip cursor={CHART_TOOLTIP_CURSOR} />`.
 * 4% black is barely visible but enough to anchor where the user is pointing
 * without dominating the chart.
 */
export const CHART_TOOLTIP_CURSOR = { fill: 'rgba(0,0,0,0.04)' } as const;
