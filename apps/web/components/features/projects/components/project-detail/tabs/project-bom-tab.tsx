'use client';

import { TextField } from '@mui/material';
import { type BomItem, SERIALIZED_BOM_ITEM_TYPES } from '@tejas96/shared/types';
import { ChevronDown, ChevronRight, PackageCheck, PackageX } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import {
  ColumnHeader,
  DetailCard,
  EmptyPane,
  Mono,
  ROW_BLEED,
  TONE,
  TonePill,
  type Tone,
} from '../primitives';
import { ProjectWarehouseSelector } from './overview/project-warehouse-selector';

import { ProcurementSection } from '@/components/features/projects/components/procurement/procurement-section';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllocateBomPending, useEntityBom, useUpdateBomItemSerial } from '@/lib/hooks/resources';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

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

type RowAllocStatus = 'allocated' | 'partial' | 'pending' | 'over-dispatched';

const ALLOC_TONE: Record<RowAllocStatus, Tone> = {
  allocated: 'success',
  partial: 'warning',
  pending: 'neutral',
  'over-dispatched': 'danger',
};

const ALLOC_LABEL: Record<RowAllocStatus, string> = {
  allocated: 'Reserved',
  partial: 'Partial',
  pending: 'Pending',
  'over-dispatched': 'Over-dispatched',
};

const COLS = 'md:grid-cols-[minmax(0,1fr)_88px_104px_112px_128px]';

/**
 * The bill of materials, and what has been reserved against it.
 *
 * There is no "add item": the bill is generated from the accepted quote and no
 * endpoint exists to add a line to it. Reserving stock is the action this tab
 * is for — without it nothing ever leaves Pending — which is why it sits in
 * the card header next to the warehouse it draws from.
 */
export const ProjectBomTab = React.memo(
  ({ projectId, defaultWarehouseId }: ProjectBomTabProps): React.JSX.Element => {
    const { data: bom, isLoading, isError, refetch } = useEntityBom('project', projectId);
    const { execute: updateSerial, isPending: isSerialUpdatePending } = useUpdateBomItemSerial();
    const { execute: allocatePending, isPending: isAllocating } = useAllocateBomPending();

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [draftSerials, setDraftSerials] = useState<Record<string, string>>({});

    const allocationStatus = (bom as { allocationStatus?: string } | undefined)?.allocationStatus;
    const productAllocationStatus = (
      bom as { productAllocationStatus?: Record<string, RowAllocStatus> } | undefined
    )?.productAllocationStatus;
    const isFullyAllocated = allocationStatus === 'fully_allocated';
    const hasAnyAllocation = allocationStatus === 'partial' || isFullyAllocated;

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

    const serialStats = useMemo(() => {
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

    // Per-row status from the API's per-product data where it exists, falling
    // back to the BOM-level status only for lines with no linked product.
    const rowAllocStatus = useMemo(() => {
      const statusMap = new Map<string, RowAllocStatus>();
      for (const row of groupedRows) {
        const hasOverDispatched = row.items.some(
          (i) =>
            (i as { specifications?: { overDispatched?: boolean } }).specifications
              ?.overDispatched === true,
        );
        if (hasOverDispatched) {
          statusMap.set(row.groupId, 'over-dispatched');
          continue;
        }
        if (row.productId && productAllocationStatus?.[row.productId]) {
          statusMap.set(row.groupId, productAllocationStatus[row.productId] as RowAllocStatus);
          continue;
        }
        if (allocationStatus === 'fully_allocated') statusMap.set(row.groupId, 'allocated');
        else if (allocationStatus === 'partial') statusMap.set(row.groupId, 'partial');
        else statusMap.set(row.groupId, 'pending');
      }
      return statusMap;
    }, [groupedRows, allocationStatus, productAllocationStatus]);

    const overDispatchedRows = groupedRows.filter(
      (r) => rowAllocStatus.get(r.groupId) === 'over-dispatched',
    );

    const contractTotal = groupedRows.reduce((sum, row) => sum + row.totalPrice, 0);

    const commitSerial = (item: BomItem): void => {
      const nextValue = (draftSerials[item.id] ?? item.serialNumber ?? '').trim();
      const currentValue = (item.serialNumber ?? '').trim();
      if (nextValue === currentValue) return;
      void updateSerial({
        itemId: item.id,
        serialNumber: nextValue.length > 0 ? nextValue : null,
      });
    };

    return (
      <div className="grid grid-cols-12 gap-4">
        <DetailCard
          label="Materials"
          aside={
            bom
              ? `${formatNumber(groupedRows.length)} ${groupedRows.length === 1 ? 'line' : 'lines'}`
              : undefined
          }
          isError={isError}
          onRetry={() => {
            void refetch();
          }}
          errorHeight={240}
          action={
            <div className="flex items-center gap-2">
              {serialStats.totalUnits > 0 ? (
                <TonePill
                  label={`Serials ${serialStats.assignedUnits}/${serialStats.totalUnits}`}
                  tone={
                    serialStats.assignedUnits === serialStats.totalUnits ? 'success' : 'warning'
                  }
                  dot
                />
              ) : null}
              {isFullyAllocated ? (
                <TonePill label="Stock reserved" tone="success" dot />
              ) : bom?.id ? (
                <button
                  type="button"
                  onClick={() => void allocatePending(bom.id)}
                  // Reserving without a warehouse is rejected by the server, so
                  // the button says why up front instead of failing on click.
                  disabled={isAllocating || !defaultWarehouseId}
                  title={
                    defaultWarehouseId
                      ? "Reserves stock from the project's warehouse. A partial reservation is allowed."
                      : 'Choose the warehouse this project draws from first.'
                  }
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill bg-primary px-3.5 text-[12.5px] font-medium text-white transition-[filter,transform] duration-fast hover:brightness-105 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <PackageCheck className="size-3.5" strokeWidth={2} aria-hidden />
                  {isAllocating ? 'Reserving…' : 'Reserve stock'}
                </button>
              ) : null}
            </div>
          }
          className="col-span-12"
        >
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 rounded-2xl" />
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-11 rounded-xl" />
              ))}
            </div>
          ) : groupedRows.length === 0 ? (
            <EmptyPane
              size="page"
              icon={<PackageX className="size-4" strokeWidth={2} />}
              title="No bill of materials"
              description="The bill is generated from the accepted quote. It appears here once the quote carries line items."
            />
          ) : (
            <>
              <ProjectWarehouseSelector
                projectId={projectId}
                defaultWarehouseId={defaultWarehouseId}
                locked={hasAnyAllocation}
              />

              {allocationStatus === 'partial' && overDispatchedRows.length === 0 ? (
                <p
                  className="mb-3 rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed"
                  style={{ background: TONE.warning.tint, color: TONE.warning.ink }}
                >
                  <span className="font-semibold">Some lines are still pending.</span> Stock ran out
                  part way through. Replenish the warehouse and reserve again.
                </p>
              ) : null}

              {overDispatchedRows.length > 0 ? (
                <p
                  className="mb-3 rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed"
                  style={{ background: TONE.danger.tint, color: TONE.danger.ink }}
                >
                  <span className="font-semibold">
                    More was dispatched than reserved on {overDispatchedRows.length}{' '}
                    {overDispatchedRows.length === 1 ? 'line' : 'lines'}:
                  </span>{' '}
                  {overDispatchedRows.map((r) => r.name).join(', ')}. Return requests are waiting in
                  Inventory.
                </p>
              ) : null}

              <div
                className={cn('hidden items-center gap-3 pb-1.5 md:grid', ROW_BLEED, COLS)}
                aria-hidden
              >
                <ColumnHeader>Material</ColumnHeader>
                <ColumnHeader className="text-right">Qty</ColumnHeader>
                <ColumnHeader className="text-right">Unit price</ColumnHeader>
                <ColumnHeader className="text-right">Total</ColumnHeader>
                <ColumnHeader>State</ColumnHeader>
              </div>

              {groupedRows.map((row) => {
                const status = rowAllocStatus.get(row.groupId) ?? 'pending';
                const expandable = row.hasSerializedUnits && row.items.length > 1;
                const expanded = expandedGroups[row.groupId] ?? false;
                const serialsDone = row.items.filter((i) => i.serialNumber?.trim()).length;

                return (
                  <React.Fragment key={row.groupId}>
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-xl py-2.5 transition-colors duration-fast even:bg-surface-alt hover:bg-background-tertiary md:grid md:gap-3',
                        ROW_BLEED,
                        COLS,
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {expandable ? (
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-label={`${expanded ? 'Hide' : 'Show'} the units of ${row.name}`}
                            onClick={() =>
                              setExpandedGroups((prev) => ({
                                ...prev,
                                [row.groupId]: !prev[row.groupId],
                              }))
                            }
                            className="flex size-5 shrink-0 items-center justify-center rounded-md text-foreground-tertiary transition-colors duration-fast hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                          >
                            {expanded ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="size-5 shrink-0" aria-hidden />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-medium text-foreground">
                            {row.name}
                          </span>
                          {row.brand ? (
                            <span className="block truncate text-[11px] text-foreground-tertiary">
                              {row.brand}
                            </span>
                          ) : null}
                        </span>
                      </div>

                      <Mono className="hidden text-right text-[12.5px] text-foreground md:block">
                        {formatNumber(row.quantity)}
                        {row.unit ? (
                          <span className="ml-1 font-sans text-[11px] text-foreground-tertiary">
                            {row.unit}
                          </span>
                        ) : null}
                      </Mono>

                      <Mono className="hidden text-right text-[12.5px] text-foreground-secondary md:block">
                        {row.unitPrice != null ? formatCurrency(row.unitPrice) : '—'}
                      </Mono>

                      <Mono className="hidden text-right text-[12.5px] font-medium text-foreground md:block">
                        {formatCurrency(row.totalPrice)}
                      </Mono>

                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <TonePill label={ALLOC_LABEL[status]} tone={ALLOC_TONE[status]} dot />
                        {row.hasSerializedUnits ? (
                          <TonePill
                            label={`${serialsDone}/${row.items.length}`}
                            tone={serialsDone === row.items.length ? 'success' : 'warning'}
                            className="h-[18px] px-1.5 text-[10px]"
                            title={`${serialsDone} of ${row.items.length} serial numbers recorded`}
                          />
                        ) : null}
                      </div>
                    </div>

                    {/* Serial numbers attach to UNITS, not to the line. These
                        feed the DCR and the WCR, so each unit gets its own field. */}
                    {row.hasSerializedUnits && (expanded || row.items.length === 1)
                      ? row.items.map((item, index) => (
                          <div
                            key={item.id}
                            className={cn(
                              'flex items-center gap-3 rounded-xl py-2 pl-7',
                              ROW_BLEED,
                            )}
                            style={{ background: 'var(--ds-canvas-sunken)' }}
                          >
                            <span className="w-20 shrink-0 text-[11.5px] text-foreground-secondary">
                              Unit {item.unitIndex ?? index + 1}
                            </span>
                            <TextField
                              size="small"
                              value={draftSerials[item.id] ?? item.serialNumber ?? ''}
                              placeholder="Serial number"
                              aria-label={`Serial number for unit ${item.unitIndex ?? index + 1} of ${row.name}`}
                              onChange={(event) =>
                                setDraftSerials((prev) => ({
                                  ...prev,
                                  [item.id]: event.target.value.toUpperCase(),
                                }))
                              }
                              onBlur={() => commitSerial(item)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') commitSerial(item);
                              }}
                              disabled={isSerialUpdatePending}
                              sx={{ maxWidth: 320, flex: 1 }}
                            />
                          </div>
                        ))
                      : null}
                  </React.Fragment>
                );
              })}

              <div className="flex items-baseline justify-between gap-3 pt-3.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground-secondary">
                  Bill total
                </span>
                <Mono className="text-[15px] font-bold tracking-[-0.02em] text-foreground">
                  {formatCurrency(contractTotal)}
                </Mono>
              </div>
            </>
          )}
        </DetailCard>

        <div className="col-span-12">
          <ProcurementSection projectId={projectId} />
        </div>
      </div>
    );
  },
);

ProjectBomTab.displayName = 'ProjectBomTab';
