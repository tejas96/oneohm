/**
 * `orderBy()` must be given ENTITY PROPERTY PATHS, never database column names.
 *
 * TypeORM resolves an order-by criteria with
 * `alias.metadata.findColumnWithPropertyPath(propertyPath)`, which looks up the
 * *property* name. Hand it a column name like `request.submitted_at` and the
 * lookup returns `undefined`; TypeORM then reads `.databaseName` off it and the
 * request dies with:
 *
 *     TypeError: Cannot read properties of undefined (reading 'databaseName')
 *
 * The trap is that this only fires on the DISTINCT-PAGINATION path — when
 * `skip`/`take` are combined with a join that can multiply rows. Every other
 * query passes the string through as raw SQL and works fine, so a snake_case
 * order-by can sit harmlessly for months and then break the moment someone adds
 * pagination or a join. Three endpoints were already broken this way
 * (`/approval-requests`, `/approval-templates`, `/audit-logs`) while 28 more
 * sites waited their turn.
 *
 * This guard fails on the pattern rather than on the symptom, so the next one is
 * caught at commit time instead of in production.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from '@jest/globals';

const SRC = join(__dirname, '..');

/** `.orderBy('alias.some_column')` / `.addOrderBy(...)` — dotted, with an underscore. */
const SNAKE_ORDER_BY = /\.(?:orderBy|addOrderBy)\(\s*'([A-Za-z_][\w]*)\.([a-z][a-z0-9]*_[a-z0-9_]+)'/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Historical migrations legitimately contain raw SQL column names.
      if (entry === 'migrations' || entry === 'node_modules' || entry === 'dist') continue;
      walk(full, out);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('orderBy uses entity property paths, not column names', () => {
  it('has no snake_case order-by criteria anywhere in the backend', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(SNAKE_ORDER_BY)) {
        const line = source.slice(0, match.index).split('\n').length;
        offenders.push(`${file.replace(SRC, 'src')}:${line}  ${match[1]}.${match[2]}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
