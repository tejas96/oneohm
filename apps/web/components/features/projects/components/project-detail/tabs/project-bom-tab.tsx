'use client';

import { CheckCircle, ExpandLess, ExpandMore, Inventory2, Sync } from '@mui/icons-material';
import { Button, IconButton, TextField } from '@mui/material';
import { type BomItem, SERIALIZED_BOM_ITEM_TYPES } from '@oneohm-epc/shared/types';
import React, { useMemo, useState } from 'react';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
} from '@/components/ui/mui-dialog';
import { MUIInput } from '@/components/ui/mui-input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEntityBom,
  useFinalizeBomAndAllocate,
  useSyncProjectBom,
  useUpdateBomItemSerial,
} from '@/lib/hooks/resources';
import { useWarehouses } from '@/lib/hooks/resources/warehouses';
import { getErrorMessage } from '@/lib/utils/error';
import { formatCurrency } from '@/lib/utils/format';

interface ProjectBomTabProps {
  projectId: string;
}

interface GroupedBomRow {
  groupId: string;
  itemType: string;
  name: string;
  brand?: string;
  unit: string;
  quantity: number;
  totalPrice: number;
  unitPrice?: number;
  items: BomItem[];
  hasSerializedUnits: boolean;
  minSortOrder: number;
}

const SERIALIZED_ITEM_TYPES_SET = new Set<string>(SERIALIZED_BOM_ITEM_TYPES);

export const ProjectBomTab = React.memo(({ projectId }: ProjectBomTabProps): React.JSX.Element => {
  const { data: bom, isLoading, isError, error, refetch } = useEntityBom('project', projectId);
  const { execute: updateSerial, isPending: isSerialUpdatePending } = useUpdateBomItemSerial();
  const { execute: syncBom, isPending: isSyncing } = useSyncProjectBom(projectId);
  const { execute: finalizeAndAllocate, isPending: isFinalizing } = useFinalizeBomAndAllocate();
  const { items: warehouses, isLoading: isWarehousesLoading } = useWarehouses({
    syncToUrl: false,
    defaultPageSize: 200,
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [draftSerials, setDraftSerials] = useState<Record<string, string>>({});
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  const isAllocated = bom?.status === 'allocated';
  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` })),
    [warehouses],
  );

  const handleConfirmFinalize = async (): Promise<void> => {
    if (!bom?.id || !selectedWarehouseId) return;
    try {
      await finalizeAndAllocate(bom.id, selectedWarehouseId);
      setIsFinalizeDialogOpen(false);
      setSelectedWarehouseId('');
    } catch {
      // Toast handled inside the mutation hook
    }
  };

  const groupedRows = useMemo(() => {
    if (!bom?.items?.length) return [] as GroupedBomRow[];
    const groups = new Map<string, GroupedBomRow>();

    for (const item of bom.items) {
      const groupId = item.groupKey || `${item.itemType}:${item.productId ?? item.id}`;
      const existing = groups.get(groupId);
      if (existing) {
        existing.items.push(item);
        existing.quantity += item.quantity;
        existing.totalPrice += Number(item.totalPrice ?? 0);
        existing.minSortOrder = Math.min(existing.minSortOrder, item.sortOrder);
      } else {
        groups.set(groupId, {
          groupId,
          itemType: item.itemType,
          name: item.name,
          brand: item.brand,
          unit: item.unit,
          quantity: item.quantity,
          totalPrice: Number(item.totalPrice ?? 0),
          unitPrice: item.unitPrice,
          items: [item],
          hasSerializedUnits: SERIALIZED_ITEM_TYPES_SET.has(item.itemType),
          minSortOrder: item.sortOrder,
        });
      }
    }

    return [...groups.values()].sort((a, b) => a.minSortOrder - b.minSortOrder);
  }, [bom]);

  const serializedStats = useMemo(() => {
    let totalUnits = 0;
    let assignedUnits = 0;
    for (const row of groupedRows) {
      if (!row.hasSerializedUnits) continue;
      for (const item of row.items) {
        totalUnits += 1;
        if (item.serialNumber?.trim()) assignedUnits += 1;
      }
    }
    return { totalUnits, assignedUnits };
  }, [groupedRows]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load BOM"
        description={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  if (!groupedRows.length) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          icon={<Inventory2 className="w-full h-full" />}
          iconColor="muted"
          title="No materials listed"
          description="Bill of materials will appear here once items are added to the project."
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<Sync />}
          onClick={() => void syncBom()}
          disabled={isSyncing}
        >
          {isSyncing ? 'Syncing BOM…' : 'Sync BOM from Quote'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">BOM & Inventory</h3>
        <div className="flex items-center gap-2">
          {serializedStats.totalUnits > 0 && (
            <Badge variant="secondary" size="xs">
              Serials {serializedStats.assignedUnits}/{serializedStats.totalUnits}
            </Badge>
          )}
          <Button
            variant="text"
            size="small"
            startIcon={<Sync />}
            onClick={() => void syncBom()}
            disabled={isSyncing || isFinalizing}
          >
            {isSyncing ? 'Syncing…' : 'Sync'}
          </Button>
          <Button
            variant="contained"
            size="small"
            color="primary"
            startIcon={<CheckCircle />}
            onClick={() => setIsFinalizeDialogOpen(true)}
            disabled={isFinalizing || isSyncing || isAllocated || !bom?.id}
          >
            {isAllocated ? 'BOM Allocated' : 'Finalize & Allocate BOM'}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border-light overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
                Material
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
                Qty
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-right px-3 py-2">
                Unit Price
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-right px-3 py-2">
                Total
              </th>
              <th className="text-2xs font-medium text-foreground-muted uppercase text-left px-3 py-2">
                Serials
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {groupedRows.map((row) => (
              <React.Fragment key={row.groupId}>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="text-xs text-foreground font-medium px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {row.hasSerializedUnits && row.items.length > 1 ? (
                        <IconButton
                          size="small"
                          onClick={() =>
                            setExpandedGroups((prev) => ({
                              ...prev,
                              [row.groupId]: !prev[row.groupId],
                            }))
                          }
                        >
                          {expandedGroups[row.groupId] ? (
                            <ExpandLess fontSize="small" />
                          ) : (
                            <ExpandMore fontSize="small" />
                          )}
                        </IconButton>
                      ) : null}
                      <div>
                        <p>{row.name}</p>
                        {row.brand ? (
                          <p className="text-2xs text-foreground-secondary font-normal">
                            {row.brand}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="text-xs text-foreground text-right px-3 py-2.5">
                    {row.quantity}
                    {row.unit ? ` ${row.unit}` : ''}
                  </td>
                  <td className="text-xs text-foreground text-right px-3 py-2.5">
                    {row.unitPrice != null ? formatCurrency(row.unitPrice) : '—'}
                  </td>
                  <td className="text-xs text-foreground font-medium text-right px-3 py-2.5">
                    {row.totalPrice != null ? formatCurrency(row.totalPrice) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.hasSerializedUnits ? (
                      <Badge
                        variant={
                          row.items.every((item) => item.serialNumber?.trim())
                            ? 'success'
                            : 'warning'
                        }
                        size="xs"
                      >
                        {row.items.filter((item) => item.serialNumber?.trim()).length}/
                        {row.items.length} assigned
                      </Badge>
                    ) : (
                      <span className="text-2xs text-foreground-secondary">Not required</span>
                    )}
                  </td>
                </tr>
                {row.hasSerializedUnits &&
                  (expandedGroups[row.groupId] || row.items.length === 1) &&
                  row.items.map((item, index) => (
                    <tr key={item.id} className="bg-background-secondary/60">
                      <td className="text-xs text-foreground-secondary px-3 py-2.5">
                        Unit {item.unitIndex ?? index + 1}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-foreground-secondary">
                        1 {item.unit}
                      </td>
                      <td className="text-xs text-foreground text-right px-3 py-2.5">
                        {item.unitPrice != null ? formatCurrency(item.unitPrice) : '—'}
                      </td>
                      <td className="text-xs text-foreground text-right px-3 py-2.5">
                        {item.totalPrice != null ? formatCurrency(item.totalPrice) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <TextField
                          size="small"
                          value={draftSerials[item.id] ?? item.serialNumber ?? ''}
                          placeholder="Enter serial number"
                          onChange={(event) =>
                            setDraftSerials((prev) => ({
                              ...prev,
                              [item.id]: event.target.value.toUpperCase(),
                            }))
                          }
                          onBlur={() => {
                            const nextValue = (
                              draftSerials[item.id] ??
                              item.serialNumber ??
                              ''
                            ).trim();
                            const currentValue = (item.serialNumber ?? '').trim();
                            if (nextValue === currentValue) return;
                            void updateSerial({
                              itemId: item.id,
                              serialNumber: nextValue.length > 0 ? nextValue : null,
                            });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              const nextValue = (
                                draftSerials[item.id] ??
                                item.serialNumber ??
                                ''
                              ).trim();
                              const currentValue = (item.serialNumber ?? '').trim();
                              if (nextValue === currentValue) return;
                              void updateSerial({
                                itemId: item.id,
                                serialNumber: nextValue.length > 0 ? nextValue : null,
                              });
                            }
                          }}
                          disabled={isSerialUpdatePending}
                          fullWidth
                        />
                      </td>
                    </tr>
                  ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <MUIDialog
        open={isFinalizeDialogOpen}
        onOpenChange={(open) => {
          setIsFinalizeDialogOpen(open);
          if (!open) setSelectedWarehouseId('');
        }}
        size="sm"
      >
        <MUIDialogHeader>
          <MUIDialogTitle>Finalize BOM &amp; Allocate Stock</MUIDialogTitle>
          <MUIDialogDescription>
            Choose the source warehouse to allocate stock for this project&apos;s BOM. This action
            is idempotent; if any product is short, allocations will be partial and reported.
          </MUIDialogDescription>
        </MUIDialogHeader>
        <MUIDialogBody>
          <MUIInput
            mode="select"
            fieldLabel="Source warehouse"
            required
            value={selectedWarehouseId}
            onChange={(event) => setSelectedWarehouseId(event.target.value as string)}
            options={warehouseOptions}
            placeholder={isWarehousesLoading ? 'Loading warehouses…' : 'Select a warehouse'}
            disabled={isWarehousesLoading || isFinalizing}
          />
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setIsFinalizeDialogOpen(false)}
            disabled={isFinalizing}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => void handleConfirmFinalize()}
            disabled={!selectedWarehouseId || isFinalizing}
          >
            {isFinalizing ? 'Allocating…' : 'Finalize & Allocate'}
          </Button>
        </MUIDialogFooter>
      </MUIDialog>
    </div>
  );
});
