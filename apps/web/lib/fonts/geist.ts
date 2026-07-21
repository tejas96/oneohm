import localFont from 'next/font/local';

/**
 * Geist + Geist Mono — the design system's typefaces, self-hosted.
 *
 * Self-hosted rather than the `geist` npm package (not a dependency here) or
 * Google Fonts (Geist isn't served there). The `.woff2` files are the
 * variable cuts copied from the DS package's `assets/fonts/`, renamed from
 * `Geist[wght].woff2` — the square brackets in the original filename are
 * awkward for bundler path resolution.
 *
 * One variable axis covers 100–900, so a single file replaces the static
 * Regular/Medium/Bold cuts. The DS uses 400 and 700 in normal text, with 500
 * reserved for buttons, tabs and table headers.
 *
 * Geist Mono is for IDs, kWh readings, coordinates and invoice numbers —
 * anything that should align in a column.
 *
 * `display: 'swap'` keeps text visible during load, which matters on the
 * mid-range Android hardware the field app targets.
 */

export const geistSans = localFont({
  src: './geist/Geist-Variable.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-geist-sans',
  // Metric-adjusted so the swap from the fallback doesn't jolt the layout.
  fallback: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
});

export const geistMono = localFont({
  src: './geist/GeistMono-Variable.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-geist-mono',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
});

/** Convenience for the root layout's `<html className>`. */
export const geistFontVariables = `${geistSans.variable} ${geistMono.variable}`;
