'use client';

import type { WorkspaceFact } from '@tejas96/shared/reports';
import type { AxiosError } from 'axios';
import { useMemo, useRef, useState } from 'react';

import {
  isUtilityFact,
  missingUtilityMessage,
  saveErrorMessage,
  UTILITY_FACT_KEYS,
  utilityBatch,
} from '../utils/utility-details';

type SaveError = AxiosError<{ message?: string | string[] }>;

interface UtilityDetails {
  /** Utility details to mark "Needed": the missing ones, while any of the four is being edited or shows an error. */
  neededKeys: ReadonlySet<string>;
  /** Per utility fact: reports whether its field is focused, changed or showing an error. */
  activityHandlers: ReadonlyMap<string, (active: boolean) => void>;
  /** Saves one field. Rejects with an Error whose message goes under the field. */
  save: (fact: WorkspaceFact, value: string | null) => Promise<void>;
}

/**
 * Saves the Reports tab's fields, holding utility details back while any of
 * the four is missing. The site refuses a utility change unless all four are
 * complete afterwards, so on a site missing its DISCOM and connection type a
 * one-field save could never succeed. A held value waits (its field says what
 * else to set) and all of them go in one request once the last one is set.
 * A held value is dropped when its field goes back to its stored value.
 */
export function useUtilityDetails(
  facts: WorkspaceFact[],
  send: (patch: Record<string, string | null>) => Promise<unknown>,
): UtilityDetails {
  const held = useRef(new Map<string, string>());
  const [heldVersion, setHeldVersion] = useState(0);
  const [active, setActive] = useState<ReadonlySet<string>>(new Set());

  const setHeld = (next: Map<string, string>): void => {
    held.current = next;
    setHeldVersion((v) => v + 1);
  };

  const activityHandlers = useMemo(
    () =>
      new Map(
        UTILITY_FACT_KEYS.map((key) => [
          key as string,
          (isActive: boolean) => {
            if (!isActive && held.current.has(key)) {
              const next = new Map(held.current);
              next.delete(key);
              setHeld(next);
            }
            setActive((prev) => {
              if (prev.has(key) === isActive) return prev;
              const next = new Set(prev);
              if (isActive) next.add(key);
              else next.delete(key);
              return next;
            });
          },
        ]),
      ),
    [],
  );

  // Recomputed each render; `heldVersion` changing is what re-renders after a hold.
  void heldVersion;
  const neededKeys = new Set(active.size > 0 ? utilityBatch(facts, held.current).missing : []);

  const save = async (fact: WorkspaceFact, value: string | null): Promise<void> => {
    if (!isUtilityFact(fact.key)) {
      try {
        await send({ [fact.key]: value });
      } catch (err) {
        throw new Error(saveErrorMessage(facts, new Map(), fact.key, err as SaveError));
      }
      return;
    }

    const changes = new Map(held.current);
    changes.set(fact.key, value ?? '');
    const { missing, send: patch } = utilityBatch(facts, changes);
    if (missing.length > 0) {
      setHeld(changes);
      throw new Error(missingUtilityMessage(missing, facts));
    }
    try {
      await send(patch);
      setHeld(new Map());
    } catch (err) {
      throw new Error(saveErrorMessage(facts, changes, fact.key, err as SaveError));
    }
  };

  return { neededKeys, activityHandlers, save };
}
