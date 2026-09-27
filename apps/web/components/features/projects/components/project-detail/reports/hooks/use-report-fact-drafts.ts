'use client';

import {
  isProjectStoredFact,
  normalizeFactInput,
  validateFactInput,
  type WorkspaceFact,
} from '@tejas96/shared/reports';
import type { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';

import {
  isUtilityFact,
  missingUtilityMessage,
  saveErrorMessage,
  utilityBatch,
} from '../utils/utility-details';

import { useUpdateReportFacts } from '@/components/features/projects/hooks/use-project-reports';

type SaveError = AxiosError<{ message?: string | string[] }>;

/** What a typed value would store: normalised, and '' to clear. A quote fact set back to the quote's value clears its override. */
export function targetOf(fact: WorkspaceFact, raw: string): string {
  const value = normalizeFactInput(fact, raw);
  if (fact.quoteValue !== undefined && value === fact.quoteValue) return '';
  return value;
}

/** What is stored now, in the same terms as targetOf. */
export function storedOf(fact: WorkspaceFact): string {
  if (fact.quoteValue !== undefined) return fact.overridden ? fact.editValue : '';
  return fact.editValue;
}

interface Draft {
  /** As typed. */
  raw: string;
  /** storedOf(fact) when the draft started: a different stored value later makes it stale. */
  base: string;
}

export interface ReportFactDrafts {
  /** Typed values by fact key, not saved yet. */
  drafts: ReadonlyMap<string, string>;
  /** Fields whose draft would change what is stored. */
  changedKeys: ReadonlySet<string>;
  saving: boolean;
  /** The message under a field: its rule, a failed save, or the utility details still to set. */
  errorFor: (key: string) => string | null;
  /** Utility details to mark "Needed" while one of the four is changed. */
  neededKeys: ReadonlySet<string>;
  /** Show all four utility fields whatever report is picked: the site is incomplete or one is changed. */
  showUtilityFields: boolean;
  /** Save was pressed while fields were invalid: their errors show even while focused. */
  showAllErrors: boolean;
  change: (fact: WorkspaceFact, raw: string) => void;
  /** Back to the stored value. */
  undo: (key: string) => void;
  discardAll: () => void;
  /** Sends every change. False when nothing could be sent or a request failed; the fields say why. */
  saveAll: () => Promise<boolean>;
}

/**
 * Every change on the Reports tab waits here until Save. Owned by the tab so
 * drafts survive Preview, picking a report and switching project tabs.
 *
 * The API saves one kind of field per request: the project's own facts, the
 * site's, or the customer's. Save sends one request per kind, in turn; a
 * failed one keeps its drafts and shows its message under each of them.
 *
 * The site refuses a change to its utility details (consumer name and number,
 * DISCOM, connection type) unless all four are complete afterwards, so Save
 * waits until they are, and says which are missing.
 */
export function useReportFactDrafts(
  projectId: string,
  facts: WorkspaceFact[],
  /** `projects.edit` and the project is not cancelled. */
  canSave: boolean,
): ReportFactDrafts {
  const update = useUpdateReportFacts(projectId);
  const [drafts, setDrafts] = useState<ReadonlyMap<string, Draft>>(new Map());
  const [serverErrors, setServerErrors] = useState<ReadonlyMap<string, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);

  const byKey = useMemo(() => new Map(facts.map((f) => [f.key as string, f])), [facts]);

  useEffect(() => {
    if (canSave) return;
    setDrafts(new Map());
    setServerErrors(new Map());
  }, [canSave]);

  // Another save moved a stored value away from what a draft replaced: that draft is stale.
  useEffect(() => {
    setDrafts((prev) => {
      const next = new Map(
        [...prev].filter(([key, d]) => {
          const fact = byKey.get(key);
          return fact !== undefined && storedOf(fact) === d.base;
        }),
      );
      return next.size === prev.size ? prev : next;
    });
  }, [byKey]);

  const changedKeys = useMemo(
    () =>
      new Set(
        [...drafts]
          .filter(([key, d]) => {
            const fact = byKey.get(key);
            return fact !== undefined && targetOf(fact, d.raw) !== storedOf(fact);
          })
          .map(([key]) => key),
      ),
    [drafts, byKey],
  );

  useEffect(() => {
    if (changedKeys.size === 0) return;
    const warn = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changedKeys.size]);

  const utilityChanges = useMemo(
    () =>
      new Map(
        [...changedKeys]
          .filter(isUtilityFact)
          .map((key) => [key, targetOf(byKey.get(key)!, drafts.get(key)!.raw)]),
      ),
    [changedKeys, byKey, drafts],
  );
  const utilityNote = utilityChanges.size > 0 ? missingUtilityMessage(facts, utilityChanges) : null;

  const ruleError = (key: string): string | null => {
    const fact = byKey.get(key);
    const draft = drafts.get(key);
    if (!fact || !draft || !changedKeys.has(key)) return null;
    return validateFactInput(fact, targetOf(fact, draft.raw));
  };

  const errorFor = (key: string): string | null =>
    ruleError(key) ?? serverErrors.get(key) ?? (utilityChanges.has(key) ? utilityNote : null);

  const clearServerError = (key: string): void =>
    setServerErrors((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });

  const change = (fact: WorkspaceFact, raw: string): void => {
    setDrafts((prev) => {
      const next = new Map(prev);
      next.set(fact.key, { raw, base: prev.get(fact.key)?.base ?? storedOf(fact) });
      return next;
    });
    clearServerError(fact.key);
  };

  const undo = (key: string): void => {
    setDrafts((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
    clearServerError(key);
  };

  const discardAll = (): void => {
    setDrafts(new Map());
    setServerErrors(new Map());
    setShowAllErrors(false);
  };

  const saveAll = async (): Promise<boolean> => {
    if (!canSave || saving || changedKeys.size === 0) return changedKeys.size === 0;
    if ([...changedKeys].some((key) => ruleError(key) !== null) || utilityNote) {
      setShowAllErrors(true);
      return false;
    }

    // One request per kind of field: the API refuses a mixed one.
    const groups = new Map<string, Record<string, string | null>>();
    const add = (group: string, key: string, value: string | null): void => {
      groups.set(group, { ...groups.get(group), [key]: value });
    };
    for (const key of changedKeys) {
      const fact = byKey.get(key)!;
      const value = targetOf(fact, drafts.get(key)!.raw);
      const group = isProjectStoredFact(fact) ? 'manual' : (fact.edit?.target ?? 'manual');
      add(group, key, value === '' ? null : value);
    }
    // A shown fallback (the customer's name as consumer name) is not stored on the site yet.
    if (utilityChanges.size > 0) {
      for (const [key, value] of Object.entries(utilityBatch(facts, utilityChanges).send)) {
        add('property', key, value === '' ? null : value);
      }
    }

    setSaving(true);
    setShowAllErrors(false);
    const failed = new Map<string, string>();
    try {
      for (const [, patch] of groups) {
        try {
          await update.mutateAsync(patch);
          setDrafts((prev) => {
            const next = new Map(prev);
            for (const key of Object.keys(patch)) next.delete(key);
            return next;
          });
        } catch (err) {
          const keys = Object.keys(patch).filter((key) => changedKeys.has(key));
          const message = saveErrorMessage(facts, utilityChanges, keys[0] ?? '', err as SaveError);
          for (const key of keys) failed.set(key, message);
        }
      }
    } finally {
      setSaving(false);
      setServerErrors(failed);
    }
    return failed.size === 0;
  };

  const incomplete =
    utilityBatch(facts, new Map()).missing.length > 0 ||
    facts.some((fact) => isUtilityFact(fact.key) && fact.fallback);

  return {
    drafts: new Map([...drafts].map(([key, d]) => [key, d.raw])),
    changedKeys,
    saving,
    errorFor,
    neededKeys: new Set(utilityNote ? utilityBatch(facts, utilityChanges).missing : []),
    showUtilityFields: incomplete || utilityChanges.size > 0,
    showAllErrors,
    change,
    undo,
    discardAll,
    saveAll,
  };
}
