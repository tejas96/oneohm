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

export interface ReportFactSaves {
  /** Utility values not sent yet, by fact key. */
  held: ReadonlyMap<string, string>;
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
 */
export function useReportFactSaves(projectId: string, facts: WorkspaceFact[]): ReportFactSaves {
  const update = useUpdateReportFacts(projectId);
  const heldRef = useRef<Map<string, string>>(new Map());
  const [held, setHeldState] = useState<ReadonlyMap<string, string>>(new Map());
  const [batchError, setBatchError] = useState<{ keys: Set<string>; message: string } | null>(null);
  const [active, setActive] = useState<ReadonlySet<string>>(new Set());

  const setHeld = (next: Map<string, string>): void => {
    heldRef.current = next;
    setHeldState(next);
  };

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

  const heldNote = missingUtilityMessage(facts, held);
  const { missing } = utilityBatch(facts, held);
  const incomplete =
    utilityBatch(facts, new Map()).missing.length > 0 ||
    facts.some((fact) => isUtilityFact(fact.key) && fact.fallback);

  const discard = (key: string): void => {
    if (heldRef.current.has(key)) {
      const next = new Map(heldRef.current);
      next.delete(key);
      setHeld(next);
    }
    setBatchError((current) => (current?.keys.has(key) ? null : current));
  };

  const save = async (fact: WorkspaceFact, value: string | null): Promise<FactSaveResult> => {
    if (!isUtilityFact(fact.key)) {
      try {
        await update.mutateAsync({ [fact.key]: value });
      } catch (err) {
        throw new Error(saveErrorMessage(facts, new Map(), fact.key, err as SaveError));
      }
      return 'saved';
    }

    setBatchError(null);
    const changes = new Map(heldRef.current);
    changes.set(fact.key, value ?? '');
    const batch = utilityBatch(facts, changes);
    if (batch.missing.length > 0) {
      setHeld(changes);
      return 'held';
    }
    try {
      await update.mutateAsync(batch.send);
      setHeld(new Map());
      return 'saved';
    } catch (err) {
      const message = saveErrorMessage(facts, changes, fact.key, err as SaveError);
      setHeld(changes);
      setBatchError({ keys: new Set(Object.keys(batch.send)), message });
      throw new Error(message);
    }
  };

  return {
    held,
    noteFor: (key) =>
      batchError?.keys.has(key) ? batchError.message : held.has(key) ? heldNote : null,
    neededKeys: new Set(active.size > 0 || held.size > 0 ? missing : []),
    showUtilityFields: incomplete || held.size > 0,
    activityHandlers,
    save,
    discard,
  };
}
