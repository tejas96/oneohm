'use client';

import { Warehouse } from '@mui/icons-material';
import React, { useEffect, useState } from 'react';

import { MUIInput } from '@/components/ui/mui-input';
import { MUITypography } from '@/components/ui/mui-typography';
import { showToast } from '@/components/ui/sonner';
import { useUpdateProjectWarehouse } from '@/lib/hooks/resources';
import { useWarehouses } from '@/lib/hooks/resources/warehouses';
import { getErrorMessage } from '@/lib/utils/error';

interface ProjectWarehouseSelectorProps {
  projectId: string;
  defaultWarehouseId?: string;
}

/**
 * Inline warehouse selector for project inventory allocation.
 * Sets project.defaultWarehouseId — required before "Reserve Stock" works.
 * Once any active allocation exists, the backend returns 409 if you try to change it.
 */
export function ProjectWarehouseSelector({
  projectId,
  defaultWarehouseId,
}: ProjectWarehouseSelectorProps) {
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

  const handleChange = async (newWarehouseId: string) => {
    setSelected(newWarehouseId);
    try {
      await updateWarehouse(projectId, newWarehouseId || null);
      showToast.success('Default warehouse updated');
    } catch (err) {
      // Roll back optimistic change on error
      setSelected(defaultWarehouseId ?? '');
      showToast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="rounded-lg shadow-e2 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Warehouse className="text-foreground-muted" fontSize="small" />
        <MUITypography variant="body" className="font-semibold text-foreground">
          Default Warehouse
        </MUITypography>
      </div>
      <MUITypography variant="placeholder" className="text-foreground-secondary">
        Select the warehouse from which materials will be reserved for this project. Cannot be
        changed once stock has been allocated.
      </MUITypography>
      <MUIInput
        mode="select"
        fieldLabel="Warehouse"
        value={selected}
        onChange={(event) => void handleChange(event.target.value as string)}
        options={warehouseOptions}
        placeholder={isLoadingWarehouses ? 'Loading warehouses…' : 'Select a warehouse'}
        disabled={isLoadingWarehouses || isPending}
        fullWidth
      />
    </div>
  );
}
