import { getFact } from '@tejas96/shared/reports';

/**
 * True for a fact whose value comes from the approved quote (`project`) or
 * this project's BOM (`bom`) — the two sources a missing value cannot be
 * typed in here, only fixed by revising the quote or the BOM tab.
 */
export function isQuoteSourcedKey(key: string): boolean {
  const source = getFact(key)?.source;
  return source === 'project' || source === 'bom';
}
