'use client';

import { Plus, Trash2 } from 'lucide-react';
import { type JSX, useCallback, useState } from 'react';
import { type UseFormReturn } from 'react-hook-form';

import type { InstallationPricingFormData } from '../schemas/installation-pricing.schema';

import { Button, MUIInput, Typography } from '@/components/ui';
import { formatLabel } from '@/lib/utils';

interface CostComponentsEditorProps {
  form: UseFormReturn<InstallationPricingFormData>;
}

function normalizeComponentKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function sortCostComponentKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === 'variable_floor') return -1;
    if (b === 'variable_floor') return 1;
    return a.localeCompare(b);
  });
}

export function CostComponentsEditor({ form }: CostComponentsEditorProps): JSX.Element {
  const [showAddInput, setShowAddInput] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  const costComponents = form.watch('costComponents') ?? {};
  const entries: [string, number][] = sortCostComponentKeys(Object.keys(costComponents)).map(
    (key) => [key, costComponents[key] ?? 0],
  );

  const confirmAddComponent = useCallback((): void => {
    const nextKey = normalizeComponentKey(newKeyName);
    if (!nextKey) return;
    const current = form.getValues('costComponents') ?? {};
    if (current[nextKey] !== undefined) return;
    form.setValue('costComponents', { ...current, [nextKey]: 0 }, { shouldValidate: true });
    setShowAddInput(false);
    setNewKeyName('');
  }, [form, newKeyName]);

  const cancelAddComponent = useCallback((): void => {
    setShowAddInput(false);
    setNewKeyName('');
  }, []);

  const removeKey = useCallback(
    (key: string): void => {
      if (key === 'variable_floor') return;
      const current = form.getValues('costComponents') ?? {};
      if (Object.keys(current).length <= 1) return;
      const { [key]: removedValue, ...rest } = current;
      void removedValue;
      form.setValue('costComponents', rest, { shouldValidate: true });
    },
    [form],
  );

  const costComponentsErr = form.formState.errors.costComponents;
  const costComponentsErrMsg =
    costComponentsErr &&
    typeof costComponentsErr === 'object' &&
    'message' in costComponentsErr &&
    typeof costComponentsErr.message === 'string'
      ? costComponentsErr.message
      : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-foreground-tertiary">
        Add or remove line items. Use snake_case keys (e.g. electrical_work).
      </p>
      {costComponentsErrMsg && <p className="text-xs text-error">{costComponentsErrMsg}</p>}
      <div className="grid grid-cols-1 gap-4">
        {entries.map(([key]) => (
          <div
            key={key}
            className="flex flex-col gap-3 rounded-lg border border-border-light p-3 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1">
              <Typography variant="body" className="text-sm font-semibold">
                {formatLabel(key)}
              </Typography>
              <p className="mt-0.5 text-2xs text-foreground-tertiary">{key}</p>
            </div>
            <div className="w-full sm:max-w-[200px]">
              <MUIInput
                fieldLabel="Amount (₹)"
                tooltip="Cost for this component in this tier."
                type="number"
                step="0.01"
                placeholder="0"
                {...form.register(`costComponents.${key}`, { valueAsNumber: true })}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={key === 'variable_floor' || entries.length <= 1}
              onClick={() => removeKey(key)}
              aria-label={`Remove ${key}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      {showAddInput ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g. electrical_work"
            className="h-9 min-w-[12rem] flex-1 rounded-md border border-border-light bg-background px-3 text-sm text-foreground"
            autoFocus
          />
          <Button type="button" variant="default" size="sm" onClick={confirmAddComponent}>
            Add
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={cancelAddComponent}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowAddInput(true)}>
          <Plus className="mr-1.5 size-4" />
          Add Component
        </Button>
      )}
    </div>
  );
}
