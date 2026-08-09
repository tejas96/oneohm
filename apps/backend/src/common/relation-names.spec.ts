/**
 * Every name in a TypeORM `relations` array must be a real relation on some entity.
 *
 * TypeORM resolves `relations: ['customer', 'organization']` against entity
 * metadata when it builds the query, and throws on anything it can't find:
 *
 *     EntityPropertyNotFoundError: Property "organization" was not found in
 *     "CustomerPropertyEntity". Make sure your query is correct.
 *
 * These are string literals, so `tsc` sees nothing. That is how the organization
 * removal left 25 of them behind across four files — the cleanup plan
 * (docs/plans/2026-08-07-org-cleanup.md) leaned on `tsc` to enumerate the work,
 * and every relation array was invisible to it. One of them sat on
 * `CustomerPropertyRepository.findById()`, which meant loading any property —
 * and creating any property-level follow-up — threw at runtime.
 *
 * A deleted relation is the failure this guards. It compares each name used
 * against the union of relation names declared across ALL entities, so dropping
 * a relation while a `relations: [...]` array still asks for it fails here
 * instead of on a user's page load.
 *
 * What it deliberately does NOT catch: a name that is a valid relation on some
 * other entity but not the one being queried (asking for 'discom' on a quote).
 * Pinning each array to its entity would mean inferring the repository's generic
 * type, which is more machinery than the bug rate justifies. The union check is
 * what would have caught the org removal, which is the realistic failure mode.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from '@jest/globals';

const SRC = join(__dirname, '..');

const RELATION_DECORATOR = /@(?:ManyToOne|OneToMany|OneToOne|ManyToMany)\b/;
const COLUMN_DECORATOR = /@(?:Column|CreateDateColumn|UpdateDateColumn|DeleteDateColumn)\b/;
const PROPERTY_DECLARATION = /^\s*(\w+)[?!]?:\s/;

/** `relations: [...]` and `const relations = cond ? [...] : []`. */
const RELATIONS_ASSIGNMENT = /\brelations\b\s*[:=]\s*/g;

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

/**
 * Relation property names declared on an entity.
 *
 * A relation decorator can span several lines and be followed by `@JoinColumn`,
 * so the flag is tracked forward to the next property declaration rather than
 * matching decorator and property in one pattern.
 *
 * Paren depth matters: a decorator's own options object looks exactly like a
 * property declaration one line in —
 *
 *     @ManyToOne(() => DiscomEntity, (discom) => discom.properties, {
 *       onDelete: 'SET NULL',        <- not a property
 *     })
 *     @JoinColumn({ name: 'discom_id' })
 *     discom?: DiscomEntity;         <- the property
 *
 * so a declaration only counts when the line starts outside every open paren.
 */
function declaredRelations(source: string): string[] {
  const names: string[] = [];
  let pending = false;
  let depth = 0;

  for (const raw of source.split('\n')) {
    const line = raw.replace(/\/\/.*$/, '');
    const isComment = /^\s*(\*|\/\*)/.test(line);
    const atMemberLevel = depth === 0;

    if (!isComment) {
      for (const char of line) {
        if (char === '(' || char === '[') depth++;
        else if (char === ')' || char === ']') depth--;
      }
    }
    if (isComment) continue;

    if (RELATION_DECORATOR.test(line)) {
      pending = true;
      continue;
    }
    if (COLUMN_DECORATOR.test(line)) {
      pending = false;
      continue;
    }
    if (!atMemberLevel) continue;

    const property = PROPERTY_DECLARATION.exec(line);
    if (property && pending) {
      names.push(property[1]);
      pending = false;
    }
  }
  return names;
}

/**
 * String literals inside the array(s) that a `relations` assignment resolves to.
 *
 * Walks from the assignment collecting literals found inside brackets, and stops
 * at the first `;`, `,` or `}` seen at depth zero. That handles the object-property
 * form, the ternary form, and both together.
 */
function relationNamesUsed(source: string, from: number): { name: string; index: number }[] {
  const found: { name: string; index: number }[] = [];
  let depth = 0;

  for (let i = from; i < source.length; i++) {
    const char = source[i];

    if (char === '[' || char === '{' || char === '(') depth++;
    else if (char === ']' || char === '}' || char === ')') {
      if (depth === 0) break;
      depth--;
    } else if (depth === 0 && (char === ';' || char === ',')) break;
    else if (char === "'" || char === '"') {
      const close = source.indexOf(char, i + 1);
      if (close === -1) break;
      if (depth > 0) found.push({ name: source.slice(i + 1, close), index: i });
      i = close;
    }
  }
  return found;
}

describe('TypeORM relation names resolve to a declared relation', () => {
  it('every name in a relations array exists on some entity', () => {
    const files = walk(SRC);

    const valid = new Set<string>();
    for (const file of files.filter((f) => f.endsWith('.entity.ts'))) {
      for (const name of declaredRelations(readFileSync(file, 'utf8'))) valid.add(name);
    }

    // A sanity floor: if the scan silently stops finding relations, an empty
    // `valid` set would make every assertion below pass for the wrong reason.
    expect(valid.size).toBeGreaterThan(50);

    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');

      for (const match of source.matchAll(RELATIONS_ASSIGNMENT)) {
        for (const used of relationNamesUsed(source, match.index + match[0].length)) {
          // Nested paths ('project.customer') are valid at every segment.
          const segments = used.name.split('.');
          if (segments.every((segment) => valid.has(segment))) continue;

          const line = source.slice(0, used.index).split('\n').length;
          offenders.push(
            `${file.replace(SRC, 'src')}:${line}  '${used.name}' is not a relation on any entity`,
          );
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
