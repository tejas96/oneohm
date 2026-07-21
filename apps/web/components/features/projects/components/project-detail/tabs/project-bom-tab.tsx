'use client';

import { CheckCircle, ExpandLess, ExpandMore, Inventory2, Warning } from '@mui/icons-material';
import { Alert, Button, IconButton, TextField } from '@mui/material';
import { type BomItem, SERIALIZED_BOM_ITEM_TYPES } from '@tejas96/shared/types';
import React, { useMemo, useState } from 'react';

import { ProjectWarehouseSelector } from './overview/project-warehouse-selector';

import { ProcurementSection } from '@/components/features/finance';
import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { MUITypography } from '@/components/ui/mui-typography';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAllocateBomPending,
  useEntityBom,
  useSyncProjectBom,
  useUpdateBomItemSerial,
} from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils/error';
import { formatCurrency } from '@/lib/utils/format';

interface ProjectBomTabProps {
  projectId: string;
  defaultWarehouseId?: string;
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
  productId?: string;
}

const SERIALIZED_ITEM_TYPES_SET = new Set<string>(SERIALIZED_BOM_ITEM_TYPES);

// Derive a simple allocation status badge from the BOM's allocationStatus
// and per-product allocation data. The backend returns allocationStatus on the BOM.
type RowAllocStatus = 'allocated' | 'partial' | 'pending' | 'over-dispatched';

function AllocationBadge({ status }: { status: RowAllocStatus }) {
  if (status === 'allocated') {
    return (
      <Badge variant="success" size="xs">
        Allocated
      </Badge>
    );
  }
  if (status === 'over-dispatched') {
    return (
      <Badge variant="destructive" size="xs">
        Over-dispatched
      </Badge>
    );
  }
  if (status === 'partial') {
    return (
      <Badge variant="warning" size="xs">
        Partial
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" size="xs">
      Pending
    </Badge>
  );
}

export const ProjectBomTab = React.memo(
  ({ projectId, defaultWarehouseId }: ProjectBomTabProps): React.JSX.Element => {
    const { data: bom, isLoading, isError, error, refetch } = useEntityBom('project', projectId);
    const { execute: updateSerial, isPending: isSerialUpdatePending } = useUpdateBomItemSerial();
    const { execute: allocatePending, isPending: isAllocating } = useAllocateBomPending();
    // useSyncProjectBom kept as admin/emergency path — not shown in UI
    const { execute: syncBom } = useSyncProjectBom(projectId);
    void syncBom; // satisfies linter; kept for future admin use

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [draftSerials, setDraftSerials] = useState<Record<string, string>>({});

    const allocationStatus = (bom as any)?.allocationStatus as string | undefined;
    const productAllocationStatus = (bom as any)?.productAllocationStatus as
      | Record<string, 'allocated' | 'partial' | 'pending'>
      | undefined;
    const isFullyAllocated = allocationStatus === 'fully_allocated';

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
            productId: item.productId,
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

    // Determine per-row allocation status using per-product data from the API when available,
    // falling back to the BOM-level allocationStatus only for rows with no productId.
    const rowAllocStatus = useMemo(() => {
      const statusMap = new Map<string, RowAllocStatus>();
      for (const row of groupedRows) {
        const hasOverDispatched = row.items.some(
          (i) => (i as any).specifications?.overDispatched === true,
        );
        if (hasOverDispatched) {
          statusMap.set(row.groupId, 'over-dispatched');
          continue;
        }

        // Use per-product status from the API if available
        if (row.productId && productAllocationStatus?.[row.productId]) {
          statusMap.set(row.groupId, productAllocationStatus[row.productId] as RowAllocStatus);
          continue;
        }

        // Fallback to BOM-level status for rows without a linked product
        if (allocationStatus === 'fully_allocated') {
          statusMap.set(row.groupId, 'allocated');
        } else if (allocationStatus === 'partial') {
          statusMap.set(row.groupId, 'partial');
        } else {
          statusMap.set(row.groupId, 'pending');
        }
      }
      return statusMap;
    }, [groupedRows, allocationStatus, productAllocationStatus]);

    const overDispatchedRows = groupedRows.filter(
      (r) => rowAllocStatus.get(r.groupId) === 'over-dispatched',
    );

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
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Default Warehouse Selector - moved from Overview tab */}
        <ProjectWarehouseSelector projectId={projectId} defaultWarehouseId={defaultWarehouseId} />

        {/* Partial allocation banner */}
        {allocationStatus === 'partial' && overDispatchedRows.length === 0 && (
          <Alert severity="warning" icon={<Warning fontSize="small" />}>
            <MUITypography variant="body">
              Some items are still pending stock reservation. Click <strong>Reserve Stock</strong>{' '}
              to retry after replenishing inventory.
            </MUITypography>
          </Alert>
        )}

        {/* Over-dispatch banner */}
        {overDispatchedRows.length > 0 && (
          <Alert severity="error" icon={<Warning fontSize="small" />}>
            <MUITypography variant="body">
              <strong>Over-dispatched items:</strong>{' '}
              {overDispatchedRows.map((r) => r.name).join(', ')}. More units were dispatched than
              currently required. Pending return requests have been created — resolve them in the
              Inventory section.
            </MUITypography>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">BOM &amp; Inventory</h3>
          <div className="flex items-center gap-2">
            {serializedStats.totalUnits > 0 && (
              <Badge variant="secondary" size="xs">
                Serials {serializedStats.assignedUnits}/{serializedStats.totalUnits}
              </Badge>
            )}
            {!isFullyAllocated && bom?.id && (
              <Button
                variant="contained"
                size="small"
                color="primary"
                startIcon={<CheckCircle />}
                onClick={() => void allocatePending(bom.id)}
                disabled={isAllocating}
                title="Reserves stock from the project's default warehouse. Partial allocation is allowed."
              >
                {isAllocating ? 'Reserving…' : 'Reserve Stock'}
              </Button>
            )}
            {isFullyAllocated && (
              <Badge variant="success" size="sm">
                Stock Reserved
              </Badge>
            )}
          </div>
        </div>

        <div className="rounded-lg shadow-e2 overflow-hidden">
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
                  Status
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
                      <div className="flex flex-col gap-1">
                        <AllocationBadge status={rowAllocStatus.get(row.groupId) ?? 'pending'} />
                        {row.hasSerializedUnits && (
                          <Badge
                            variant={
                              row.items.every((item) => item.serialNumber?.trim())
                                ? 'success'
                                : 'warning'
                            }
                            size="xs"
                          >
                            {row.items.filter((item) => item.serialNumber?.trim()).length}/
                            {row.items.length} serials
                          </Badge>
                        )}
                      </div>
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

        <div className="pt-6">
          <ProcurementSection projectId={projectId} />
        </div>
      </div>
    );
  },
);
