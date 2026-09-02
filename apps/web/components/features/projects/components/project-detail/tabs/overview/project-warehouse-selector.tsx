'use client';

import { Warehouse } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { TONE } from '../../primitives';

import { MUIInput } from '@/components/ui/mui-input';
import { showToast } from '@/components/ui/sonner';
import { useUpdateProjectWarehouse } from '@/lib/hooks/resources';
import { useWarehouses } from '@/lib/hooks/resources/warehouses';
import { getErrorMessage } from '@/lib/utils/error';

interface ProjectWarehouseSelectorProps {
  projectId: string;
  defaultWarehouseId?: string;
  /** True once any stock is reserved — the backend refuses a change with 409. */
  locked?: boolean;
}

/**
 * Which warehouse this project draws stock from.
 *
 * Reserving stock needs this set, so it sits at the top of the materials card
 * rather than in a panel of its own — it is a precondition of the button
 * beside it, not a separate subject. Once anything is allocated the backend
 * refuses to change it, and the control says so instead of failing on save.
 */
export function ProjectWarehouseSelector({
  projectId,
  defaultWarehouseId,
  locked = false,
}: ProjectWarehouseSelectorProps): React.JSX.Element {
  const { items: warehouses, isLoading: isLoadingWarehouses } = useWarehouses({
    syncToUrl: false,
    defaultPageSize: 200,
  });
  const { execute: updateWarehouse, isPending } = useUpdateProjectWarehouse();
  const [selected, setSelected] = useState(defaultWarehouseId ?? '');

  // Sync if parent project data changes (e.g. after page navigation)
  useEffect(() => {
    setSelected(defaultWarehouseId ?? '');
  }, [defaultWarehouseId]);

  const warehouseOptions = warehouses.map((w) => ({
    value: w.id,
    label: `${w.name} (${w.code})`,
  }));

  const handleChange = async (newWarehouseId: string): Promise<void> => {
    setSelected(newWarehouseId);
    try {
      await updateWarehouse(projectId, newWarehouseId || null);
      showToast.success('Default warehouse updated');
    } catch (err) {
      // Roll back the optimistic change on error.
      setSelected(defaultWarehouseId ?? '');
      showToast.error(getErrorMessage(err));
    }
  };

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-3.5 py-3"
      style={{ background: 'var(--ds-canvas-sunken)' }}
    >
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-full"
        style={{ background: TONE.accent.tint, color: TONE.accent.ink }}
      >
        <Warehouse className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-foreground-secondary">
          Stock comes from
        </span>
        <span className="block text-[11.5px] text-foreground-tertiary">
          {locked
            ? 'Locked — stock is already reserved against this project.'
            : 'Set this before reserving stock.'}
        </span>
      </div>
      <div className="ml-auto w-full min-w-[220px] sm:w-auto">
        <MUIInput
          mode="select"
          aria-label="Default warehouse"
          value={selected}
          onChange={(event) => void handleChange(event.target.value as string)}
          options={warehouseOptions}
          placeholder={isLoadingWarehouses ? 'Loading warehouses…' : 'Choose a warehouse'}
          disabled={isLoadingWarehouses || isPending || locked}
          fullWidth
        />
      </div>
    </div>
  );
}
