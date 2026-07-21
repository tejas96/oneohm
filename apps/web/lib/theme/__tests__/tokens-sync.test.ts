/**
 * Drift guard for the design-token pipeline.
 *
 * `tokens.ts` is the single source of truth; `tokens.generated.css` is derived
 * from it and committed so the stylesheet needs no build step. This test fails
 * the moment the two diverge.
 *
 * Why a test rather than a standalone CLI: `apps/web` is `"type": "module"`
 * while `scripts/` is CJS, so a cross-package script fights the module system
 * for no benefit. ts-jest already resolves this repo's module graph correctly,
 * so the test doubles as the generator:
 *
 *   npm run tokens:gen     — rewrite tokens.generated.css from tokens.ts
 *   npm run tokens:check   — verify only (what CI runs)
 *
 * This guard exists because comment-enforced sync has already failed here
 * once: `lib/charts/palette.ts` documented itself as a "direct mirror" of the
 * `chart.*` tokens in `tailwind.config.ts` and every value had drifted.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { CHART_COLORS, CHART_SERIES_COLORS } from '../../charts/palette';
import { color } from '../tokens';
import { renderTokensCss } from '../tokens-css';

const GENERATED_CSS_PATH = join(__dirname, '..', 'tokens.generated.css');

describe('design tokens', () => {
  it('tokens.generated.css matches tokens.ts', () => {
    const expected = renderTokensCss();

    if (process.env.TOKENS_WRITE === '1') {
      writeFileSync(GENERATED_CSS_PATH, expected, 'utf8');
      return;
    }

    expect(existsSync(GENERATED_CSS_PATH)).toBe(true);

    const actual = readFileSync(GENERATED_CSS_PATH, 'utf8');

    expect(actual).toBe(expected);
  });

  it('emits the CSS variables MUI and recharts read at runtime', () => {
    const css = renderTokensCss();

    // Guards the exact failure mode that caused the existing drift: a token
    // that consumers reference but the stylesheet never actually emits.
    for (const v of [
      '--ds-accent:',
      '--ds-action-primary:',
      '--ds-text-secondary:',
      '--ds-chart-1:',
      '--radius-pill:',
      '--shadow-e2:',
      '--ease-spring:',
      '--font-sans:',
    ]) {
      expect(css).toContain(v);
    }
  });

  /**
   * The regression guard for the collision that nearly shipped: `@theme` and
   * `@config` share a namespace and `@theme` wins silently. Emitting a colour
   * here overrode the config's `accent` (#fafafa → #76c044, turning every
   * dropdown focus state green), plus `success`, `warning` and `info` — 393
   * live usages — because the DS uses those names for readable foregrounds
   * while the config uses them for vivid fills.
   *
   * Colours belong in `:root` under `--ds-`, never in `@theme`.
   */
  it('never emits a colour namespace into @theme', () => {
    const themeBlock = renderTokensCss().split('@theme {')[1]?.split('\n}')[0] ?? '';

    expect(themeBlock).not.toMatch(/--color-/);
    expect(themeBlock).not.toMatch(/--font-/);

    // and the colours really are emitted, just namespaced
    expect(renderTokensCss()).toContain('--ds-success:');
  });

  it('keeps gradients out of any colour namespace', () => {
    const css = renderTokensCss();

    // `--color-gradient-brand: linear-gradient(...)` would make Tailwind emit
    // `background-color: linear-gradient(...)`, which is invalid CSS.
    expect(css).not.toMatch(/--(color|ds)-[a-z0-9-]*:\s*(linear|radial)-gradient/);
    expect(css).toContain('--gradient-brand:');
  });

  /**
   * `lib/charts/palette.ts` is the file whose drift motivated this whole
   * guard: it documented itself as a "direct mirror" of the `chart.*` tokens
   * and every one of its five values disagreed. Asserting parity here makes
   * that class of drift unrepresentable rather than merely discouraged.
   */
  it('chart palette is derived from the tokens, not redeclared', () => {
    expect(Object.values(CHART_COLORS)).toEqual([
      color['chart-1'],
      color['chart-2'],
      color['chart-3'],
      color['chart-4'],
      color['chart-5'],
      color['chart-6'],
      color['chart-7'],
      color['chart-8'],
    ]);

    expect(CHART_SERIES_COLORS).toEqual(Object.values(CHART_COLORS));
  });
});
