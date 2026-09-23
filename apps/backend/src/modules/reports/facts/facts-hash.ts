import { createHash } from 'crypto';

import type { ReportDefinition } from '@tejas96/shared/reports';

/** The values one report prints, in definition order. Stored on the filed document for audit. */
export function pickReportFacts(
  definition: ReportDefinition,
  facts: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(definition.facts.map(({ key }) => [key, (facts[key] ?? '').trim()]));
}

export function hashReportFacts(
  definition: ReportDefinition,
  facts: Record<string, string>,
): string {
  const pairs = definition.facts.map(({ key }) => [key, (facts[key] ?? '').trim()]);
  return createHash('sha256').update(JSON.stringify(pairs)).digest('hex');
}
