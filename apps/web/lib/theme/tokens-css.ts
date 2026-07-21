/**
 * Renders `lib/theme/tokens.ts` into the CSS that `app/globals.css` imports.
 *
 * Pure and dependency-free by design: `scripts/gen-tokens.ts` calls it to
 * write the file, and `__tests__/tokens-sync.test.ts` calls it to assert the
 * committed file still matches. That shared call is the drift guard — the
 * test needs no new dependencies and runs in the existing `testEnvironment:
 * 'node'`, which makes it the only automated gate available on day one.
 */

import { TOKENS } from './tokens';

export const GENERATED_HEADER = [
  '/* ─────────────────────────────────────────────────────────────────────',
  '   AUTO-GENERATED — DO NOT EDIT.',
  '   Source:    apps/web/lib/theme/tokens.ts',
  '   Regenerate: npm run tokens:gen',
  '   Guarded by: apps/web/lib/theme/__tests__/tokens-sync.test.ts',
  '   ───────────────────────────────────────────────────────────────────── */',
].join('\n');

function renderBlock(group: Record<string, Record<string, string>>, indent: string): string {
  return Object.entries(group)
    .map(([namespace, entries]) => {
      const lines = Object.entries(entries).map(
        ([name, value]) => `${indent}--${namespace}-${name}: ${value};`,
      );
      return `${indent}/* ${namespace} */\n${lines.join('\n')}`;
    })
    .join('\n\n');
}

/**
 * The emitted stylesheet.
 *
 * `@theme` carries ONLY namespaces that `tailwind.config.ts` does not also
 * define (radius, shadow, ease) — those become real Tailwind utilities like
 * `rounded-pill`, `shadow-e2`, `ease-spring`.
 *
 * Colours and font-family go to `:root` under a `--ds-` prefix instead.
 * `@theme` and `@config` share one namespace and `@theme` silently wins, so
 * emitting `--color-success` here would override the config's own `success`
 * with a different value. The `--ds-` prefix makes that class of bug
 * unrepresentable; `tailwind.config.ts` bridges the names it wants.
 */
export function renderTokensCss(): string {
  return [
    GENERATED_HEADER,
    '',
    '@theme {',
    renderBlock(TOKENS.theme as unknown as Record<string, Record<string, string>>, '  '),
    '}',
    '',
    ':root {',
    renderBlock(TOKENS.root as unknown as Record<string, Record<string, string>>, '  '),
    '}',
    '',
  ].join('\n');
}
