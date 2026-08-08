/**
 * `orderBy()` criteria must match how the alias was joined.
 *
 * TypeORM resolves an order-by criteria with
 * `alias.metadata.findColumnWithPropertyPath(propertyPath)` — but only for
 * aliases it has entity metadata for. That gives two rules, and using the wrong
 * one breaks in a different way each time:
 *
 *   ENTITY-MAPPED alias — `createQueryBuilder('x')`, `leftJoin('x.relation', 'y')`
 *     -> must use the ENTITY PROPERTY path (`request.submittedAt`).
 *        A column name makes findColumnWithPropertyPath return undefined, and
 *        TypeORM reads `.databaseName` off it:
 *          TypeError: Cannot read properties of undefined (reading 'databaseName')
 *        Only fires on the DISTINCT-PAGINATION path (skip/take + a row-multiplying
 *        join), so it can sit latent for months and then break when someone adds
 *        pagination. This killed /approval-requests, /approval-templates and
 *        /audit-logs while 28 more sites waited their turn.
 *
 *   RAW-JOIN alias — `leftJoin('(SELECT …)', 'y')` or `leftJoin('table', 'y')`
 *     -> must use the actual SQL COLUMN name (`price.unit_price`).
 *        There is no metadata, so TypeORM emits the string verbatim. An unquoted
 *        camelCase identifier is folded to lowercase by Postgres:
 *          ERROR: column price.unitprice does not exist
 *        This one fails loudly and immediately — it broke quote calculation.
 *
 * This guard checks each order-by against the way its alias was actually
 * introduced, so it catches both directions instead of enforcing one blindly.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from '@jest/globals';

const SRC = join(__dirname, '..');

/** `createQueryBuilder('x')` and `leftJoin('x.relation', 'y')` — TypeORM knows these. */
const ENTITY_ALIAS = [
  /createQueryBuilder\(\s*'(\w+)'/g,
  /\.(?:left|inner)Join(?:AndSelect)?\(\s*'[A-Za-z_]\w*\.\w+'\s*,\s*'(\w+)'/g,
];
/** `leftJoin('(SELECT …)', 'y')` / `leftJoin('table_name', 'y')` — no metadata. */
const RAW_ALIAS = /\.(?:left|inner)Join\(\s*(?:`[^`]*`|'(?!\w+\.)[\w_]+')\s*,\s*'(\w+)'/gs;

const ORDER_BY = /\.(?:orderBy|addOrderBy)\(\s*'(\w+)\.(\w+)'/g;

const isSnake = (s: string): boolean => s.includes('_');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'migrations' || entry === 'node_modules' || entry === 'dist') continue;
      walk(full, out);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('orderBy criteria match how their alias was joined', () => {
  it('entity aliases use property paths and raw-join aliases use column names', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      const source = readFileSync(file, 'utf8');

      const raw = new Set<string>();
      for (const m of source.matchAll(RAW_ALIAS)) raw.add(m[1]);

      const entity = new Set<string>();
      for (const pattern of ENTITY_ALIAS) {
        for (const m of source.matchAll(pattern)) entity.add(m[1]);
      }

      for (const m of source.matchAll(ORDER_BY)) {
        const [, alias, prop] = m;
        const line = source.slice(0, m.index).split('\n').length;
        const where = `${file.replace(SRC, 'src')}:${line}`;

        // A raw join wins: the same name can appear in both lists when an alias
        // is reused, and the raw form is what actually reaches Postgres.
        if (raw.has(alias)) {
          if (!isSnake(prop) && prop !== prop.toLowerCase()) {
            offenders.push(`${where}  ${alias}.${prop} — raw-join alias needs the SQL column name`);
          }
        } else if (entity.has(alias) && isSnake(prop)) {
          offenders.push(`${where}  ${alias}.${prop} — entity alias needs the property path`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
