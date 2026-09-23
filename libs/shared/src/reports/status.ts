import type { ReportDefinition } from './definitions';
import { type FactKey, getFact } from './facts/report-facts';

export type ReportStatus = 'missing' | 'ready' | 'filed' | 'stale';

export interface FiledReportMeta {
  factsHash?: string;
  templateVersion?: number;
}

export interface MissingFact {
  key: FactKey;
  label: string;
}

export interface ReportStatusResult {
  status: ReportStatus;
  missing: MissingFact[];
}

export function getMissingFacts(
  definition: ReportDefinition,
  facts: Record<string, string>,
): MissingFact[] {
  return definition.facts
    .filter((ref) => ref.required && !facts[ref.key]?.trim())
    .map((ref) => ({ key: ref.key, label: getFact(ref.key)?.label ?? ref.key }));
}

/**
 * A filed copy is current only while both its fingerprint and its template
 * version match. A copy filed before fingerprints existed has neither, so it
 * reads as out of date — correct, since every template changed with them.
 */
export function getReportStatus(
  definition: ReportDefinition,
  facts: Record<string, string>,
  filed: FiledReportMeta | null,
  currentHash: string,
): ReportStatusResult {
  const missing = getMissingFacts(definition, facts);

  if (filed) {
    const current =
      filed.factsHash === currentHash && filed.templateVersion === definition.templateVersion;
    if (current) return { status: 'filed', missing };
    return { status: missing.length > 0 ? 'missing' : 'stale', missing };
  }

  return { status: missing.length > 0 ? 'missing' : 'ready', missing };
}

export function isPendingStatus(status: ReportStatus): boolean {
  return status !== 'filed';
}
