import type { WorkspaceFact } from '@tejas96/shared/reports';
import { isValidConsumerNumber } from '@tejas96/shared/utils';
import type { AxiosError } from 'axios';

/**
 * The site's utility details. The site owner saves a change to any of them
 * only when all four are complete afterwards (CustomerPropertyService, the
 * utility-details rule). This mirrors that rule on the Reports tab so it can
 * say which ones are missing, and so a site missing two of them can still be
 * completed: saving one alone would always be refused, so they are held and
 * sent together once all four have a value.
 */
export const UTILITY_FACT_KEYS = [
  'consumer_name',
  'consumer_number',
  'site_discom',
  'site_connection_type',
] as const;

const SHORT_NAME: Record<string, string> = {
  consumer_name: 'consumer name',
  consumer_number: 'consumer number',
  site_discom: 'DISCOM',
  site_connection_type: 'connection type',
};

export function isUtilityFact(key: string): boolean {
  return (UTILITY_FACT_KEYS as readonly string[]).includes(key);
}

export interface UtilityBatch {
  /** Utility details still empty (or, for the number, not 10–12 digits). */
  missing: string[];
  /** What to send: the changed values, plus a shown fallback that is not stored yet. */
  send: Record<string, string>;
}

/**
 * The utility details as they would be saved, with `changes` applied over the
 * stored values. A fact shown from a fallback (the consumer name falling back
 * to the customer's name) is not stored on the site, so it is sent too.
 */
export function utilityBatch(
  facts: WorkspaceFact[],
  changes: ReadonlyMap<string, string>,
): UtilityBatch {
  const missing: string[] = [];
  const send: Record<string, string> = {};
  for (const key of UTILITY_FACT_KEYS) {
    const fact = facts.find((f) => f.key === key);
    let value = fact?.editValue ?? '';
    const changed = changes.get(key);
    if (changed !== undefined) {
      value = changed;
      send[key] = changed;
    } else if (fact?.fallback && value.trim()) {
      send[key] = value;
    }
    const trimmed = value.trim();
    if (!trimmed || (key === 'consumer_number' && !isValidConsumerNumber(trimmed))) {
      missing.push(key);
    }
  }
  return { missing, send };
}

function listOf(names: string[]): string {
  return names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "Set the DISCOM and connection type too. …" — the message under a held utility field. */
export function missingUtilityMessage(missing: string[], facts: WorkspaceFact[]): string {
  const names = listOf(missing.map((key) => SHORT_NAME[key] ?? key));
  const badNumber =
    missing.includes('consumer_number') &&
    !!facts.find((f) => f.key === 'consumer_number')?.editValue.trim();
  return `Set the ${names} too${badNumber ? ' (the consumer number must be 10–12 digits)' : ''}. The site's utility details save together.`;
}

/**
 * The message a failed save shows under its field. A utility save the server
 * refused while other utility details are missing names them (it can happen
 * when the page is out of date); anything else shows the server's message.
 */
export function saveErrorMessage(
  facts: WorkspaceFact[],
  changes: ReadonlyMap<string, string>,
  key: string,
  err: AxiosError<{ message?: string | string[] }>,
): string {
  const body = err.response?.data?.message;
  const serverMessage =
    (Array.isArray(body) ? body.join('; ') : body) ?? 'Could not save. Try again.';
  if (err.response?.status !== 400 || !isUtilityFact(key)) return serverMessage;
  const { missing } = utilityBatch(facts, changes);
  return missing.length > 0 ? missingUtilityMessage(missing, facts) : serverMessage;
}
