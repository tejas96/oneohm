'use client';

import type { WorkspaceFact } from '@tejas96/shared/reports';
import type { AxiosError } from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  isUtilityFact,
  missingUtilityMessage,
  saveErrorMessage,
  UTILITY_FACT_KEYS,
  utilityBatch,
} from '../utils/utility-details';

import { useUpdateReportFacts } from '@/components/features/projects/hooks/use-project-reports';

type SaveError = AxiosError<{ message?: string | string[] }>;

/** `held`: kept in the page until the site's other utility details are set. */
export type FactSaveResult = 'saved' | 'held';

/** A held value and the stored value it replaces; a changed stored value makes it stale. */
export interface HeldEntry {
  value: string;
  base: string;
}

export interface ReportFactSaves {
  /** Utility values not sent yet, by fact key, with the stored value each was based on. */
  held: ReadonlyMap<string, HeldEntry>;
  /** Values a batch saved, by fact key, until the workspace shows them: the fields' baseline meanwhile. */
  saved: ReadonlyMap<string, string>;
  /** The note under a field: a failed batch's message, or "Not saved yet — also set …" on a held field. */
  noteFor: (key: string) => string | null;
  /** Utility details to mark "Needed" while any of the four is being edited, held or failing. */
  neededKeys: ReadonlySet<string>;
  /** Show all four utility fields whatever report is picked: the site is incomplete or something is held. */
  showUtilityFields: boolean;
  /** Per utility fact: whether its field is focused, changed or showing an error. */
  activityHandlers: ReadonlyMap<string, (active: boolean) => void>;
  /** Saves one field. Rejects with an Error whose message goes under the field. */
  save: (fact: WorkspaceFact, value: string | null) => Promise<FactSaveResult>;
  /** The field went back to its stored value, or its new value is invalid: drop what it held. */
  discard: (key: string) => void;
}

const editValueOf = (facts: WorkspaceFact[], key: string): string =>
  facts.find((fact) => fact.key === key)?.editValue ?? '';

const valuesOf = (entries: ReadonlyMap<string, HeldEntry>): Map<string, string> =>
  new Map([...entries].map(([key, entry]) => [key, entry.value]));

/** The workspace as the site stands after batch saves it does not show yet. */
const withSaved = (
  facts: WorkspaceFact[],
  saved: ReadonlyMap<string, HeldEntry>,
): WorkspaceFact[] =>
  saved.size === 0
    ? facts
    : facts.map((fact) => {
        const s = saved.get(fact.key);
        return s ? { ...fact, editValue: s.value, fallback: undefined } : fact;
      });

/**
 * Every save on the Reports tab, owned by the tab so held values survive
 * Preview, picking a report and generating.
 *
 * The site refuses a change to its utility details (consumer name and
 * number, DISCOM, connection type) unless all four are complete afterwards,
 * so on a site missing two of them a one-field save could never succeed.
 * While any is missing, a changed utility value is held and every held field
 * says what else to set; once the last one is set, all held values go in one
 * request. A failed batch keeps them held and shows its message under each
 * field in it. Leaving the page while anything is held asks first.
 *
 * Each held value remembers the stored value it replaces. If the stored value
 * changes underneath it (another user, or a save while the form was hidden),
 * the held value is stale and dropped. If the site becomes complete while
 * values are held, they are sent, or dropped when they already match.
 */
export function useReportFactSaves(
  projectId: string,
  facts: WorkspaceFact[],
  /** `projects.edit` and the project is not cancelled. Without it nothing is ever sent or held. */
  canSave: boolean,
): ReportFactSaves {
  const update = useUpdateReportFacts(projectId);
  const heldRef = useRef<Map<string, HeldEntry>>(new Map());
  const [heldEntries, setHeldEntries] = useState<ReadonlyMap<string, HeldEntry>>(new Map());
  /** Keys → values of the batch in flight; stale-pruning leaves them alone. */
  const inFlight = useRef<Map<string, string> | null>(null);
  /** Keys discarded while a batch was in flight: a failure must not bring them back. */
  const discardedInFlight = useRef(new Set<string>());
  const [saved, setSaved] = useState<ReadonlyMap<string, HeldEntry>>(new Map());
  const [batchError, setBatchError] = useState<{ keys: Set<string>; message: string } | null>(null);
  const [active, setActive] = useState<ReadonlySet<string>>(new Set());

  const setHeld = (next: Map<string, HeldEntry>): void => {
    heldRef.current = next;
    setHeldEntries(next);
  };

  const held = useMemo(() => valuesOf(heldEntries), [heldEntries]);

  // Read-only now (cancelled, or no `projects.edit`): the fields cannot clear
  // anything later, so held values and a batch error go at once.
  useEffect(() => {
    if (canSave) return;
    heldRef.current = new Map();
    setHeldEntries(new Map());
    setBatchError(null);
  }, [canSave]);
  const current = withSaved(facts, saved);

  useEffect(() => {
    if (held.size === 0) return;
    const warn = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [held.size]);

  const activityHandlers = useMemo(
    () =>
      new Map(
        UTILITY_FACT_KEYS.map((key) => [
          key as string,
          (isActive: boolean) =>
            setActive((prev) => {
              if (prev.has(key) === isActive) return prev;
              const next = new Set(prev);
              if (isActive) next.add(key);
              else next.delete(key);
              return next;
            }),
        ]),
      ),
    [],
  );

  /**
   * Sends the held values plus `changes`. On success, drops only the sent
   * entries still holding what was sent; an entry changed meanwhile stays,
   * rebased on the value just saved. On failure, the sent values go back into
   * the current held map without overwriting anything held meanwhile.
   */
  const sendBatch = async (
    changes: Map<string, HeldEntry>,
    triggerKey: string | null,
  ): Promise<void> => {
    if (!canSave) throw new Error('This project can no longer be changed here.');
    const batch = utilityBatch(current, valuesOf(changes));
    const sent = new Map(Object.entries(batch.send));
    inFlight.current = sent;
    discardedInFlight.current = new Set();
    try {
      await update.mutateAsync(batch.send);
      // Entries replaced during the flight were based on the sent value already (see save).
      const next = new Map(heldRef.current);
      for (const [key, value] of sent) if (next.get(key)?.value === value) next.delete(key);
      setHeld(next);
      setSaved((prev) => {
        const nextSaved = new Map(prev);
        for (const [key, value] of Object.entries(batch.send)) {
          nextSaved.set(key, { value, base: editValueOf(facts, key) });
        }
        return nextSaved;
      });
    } catch (err) {
      // Nothing was stored: entries replaced during the flight go back to the
      // stored value as their base, and the sent values rejoin the held map
      // without overwriting anything held meanwhile.
      const next = new Map<string, HeldEntry>();
      for (const [key, entry] of heldRef.current) {
        next.set(
          key,
          sent.get(key) === entry.base && entry.base !== editValueOf(current, key)
            ? { value: entry.value, base: editValueOf(current, key) }
            : entry,
        );
      }
      for (const [key, entry] of changes) {
        if (!next.has(key) && !discardedInFlight.current.has(key)) next.set(key, entry);
      }
      setHeld(next);
      const message = saveErrorMessage(
        current,
        valuesOf(changes),
        triggerKey ?? Object.keys(batch.send)[0] ?? '',
        err as SaveError,
      );
      setBatchError({ keys: new Set(Object.keys(batch.send)), message });
      throw new Error(message);
    } finally {
      inFlight.current = null;
      discardedInFlight.current = new Set();
    }
  };

  // The workspace moved on: forget batch-saved values it now shows (or that
  // another change replaced), drop held values that are stale or already
  // stored, and send what is held if the site has become complete.
  useEffect(() => {
    setSaved((prev) => {
      if (prev.size === 0) return prev;
      const next = new Map([...prev].filter(([key, s]) => editValueOf(facts, key) === s.base));
      return next.size === prev.size ? prev : next;
    });

    if (!canSave || inFlight.current || heldRef.current.size === 0) return;
    // Stale: the stored value moved away from what the held value replaced.
    // Pointless: the stored value already is the held value.
    const next = new Map(
      [...heldRef.current].filter(([key, entry]) => {
        const stored = editValueOf(facts, key);
        return stored === entry.base && stored !== entry.value;
      }),
    );
    if (next.size !== heldRef.current.size) setHeld(next);
    if (
      next.size > 0 &&
      !batchError &&
      utilityBatch(withSaved(facts, saved), valuesOf(next)).missing.length === 0
    ) {
      void sendBatch(next, null).catch(() => undefined); // its message shows under each field
    }
    // Runs on workspace changes only; sendBatch and batchError are read at that moment.
  }, [facts]);

  const discard = (key: string): void => {
    if (inFlight.current) discardedInFlight.current.add(key);
    if (heldRef.current.has(key)) {
      const next = new Map(heldRef.current);
      next.delete(key);
      setHeld(next);
    }
    setBatchError((current) => (current?.keys.has(key) ? null : current));
  };

  const save = async (fact: WorkspaceFact, value: string | null): Promise<FactSaveResult> => {
    if (!canSave) throw new Error('This project can no longer be changed here.');
    if (!isUtilityFact(fact.key)) {
      try {
        await update.mutateAsync({ [fact.key]: value });
      } catch (err) {
        throw new Error(saveErrorMessage(current, new Map(), fact.key, err as SaveError));
      }
      return 'saved';
    }

    setBatchError(null);
    const changes = new Map(heldRef.current);
    // During a batch this value replaces what that batch is storing, so that is its base.
    const flying = inFlight.current;
    const base = flying?.get(fact.key) ?? editValueOf(current, fact.key);
    changes.set(fact.key, { value: value ?? '', base });
    if (flying || utilityBatch(current, valuesOf(changes)).missing.length > 0) {
      setHeld(changes);
      return 'held';
    }
    await sendBatch(changes, fact.key);
    return 'saved';
  };

  const heldNote = missingUtilityMessage(current, held);
  const { missing } = utilityBatch(current, held);
  const incomplete =
    utilityBatch(current, new Map()).missing.length > 0 ||
    current.some((fact) => isUtilityFact(fact.key) && fact.fallback);

  return {
    held: heldEntries,
    saved: new Map([...saved].map(([key, s]) => [key, s.value])),
    noteFor: (key) =>
      batchError?.keys.has(key) ? batchError.message : held.has(key) ? heldNote : null,
    neededKeys: new Set(active.size > 0 || held.size > 0 ? missing : []),
    showUtilityFields: incomplete || held.size > 0,
    activityHandlers,
    save,
    discard,
  };
}
