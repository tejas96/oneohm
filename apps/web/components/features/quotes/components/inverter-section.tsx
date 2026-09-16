'use client';

import type { InverterProductOption } from '@tejas96/shared/utils';
import { AlertTriangle, Info, Plus, X } from 'lucide-react';
import { useCallback } from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/lib/config/routes';
import { cn } from '@/lib/utils';

export interface InverterOverride {
  productId: string;
  quantity: number;
}

/** One row per product. Past this the list stops being a choice and starts being a form. */
const MAX_ROWS = 10;
/** Matches @Max(20) on InverterOverrideDto.quantity. */
const MAX_QUANTITY_PER_ROW = 20;

export interface InverterSectionProps {
  mode: 'auto' | 'manual';
  onModeChange: (mode: 'auto' | 'manual') => void;

  /** Auto mode */
  brandValue: string | undefined;
  onBrandChange: (value: string) => void;
  brandOptions: Array<{ value: string; label: string; capacityRange?: string }>;
  capacityValue: number | undefined;
  onCapacityChange: (value: number | undefined) => void;
  capacityOptions: Array<{ value: number; label: string }>;

  /** Manual mode */
  rows: InverterOverride[];
  onRowsChange: (rows: InverterOverride[]) => void;
  productOptions: InverterProductOption[];

  systemSizeKw: number;
  phaseType: string;
  isLoading: boolean;
}

export function InverterSection({
  mode,
  onModeChange,
  brandValue,
  onBrandChange,
  brandOptions,
  capacityValue,
  onCapacityChange,
  capacityOptions,
  rows,
  onRowsChange,
  productOptions,
  systemSizeKw,
  phaseType,
  isLoading,
}: InverterSectionProps): React.JSX.Element {
  const byId = new Map(productOptions.map((p) => [p.productId, p]));
  const totalCapacityKw = rows.reduce(
    (sum, row) => sum + (byId.get(row.productId)?.capacityKw ?? 0) * row.quantity,
    0,
  );

  /*
    Adding a product already on the list merges into its row.

    Two rows of one product are two identical lines on the quote and on the
    BOM, and the server refuses them outright — so the merge happens here
    rather than as an error the rep has to read and undo.
  */
  const addRow = useCallback(
    (productId: string) => {
      const existing = rows.find((row) => row.productId === productId);
      if (existing) {
        onRowsChange(
          rows.map((row) =>
            row.productId === productId
              ? { ...row, quantity: Math.min(MAX_QUANTITY_PER_ROW, row.quantity + 1) }
              : row,
          ),
        );
        return;
      }
      if (rows.length >= MAX_ROWS) return;
      onRowsChange([...rows, { productId, quantity: 1 }]);
    },
    [rows, onRowsChange],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      onRowsChange(
        rows.map((row) =>
          row.productId === productId
            ? { ...row, quantity: Math.min(MAX_QUANTITY_PER_ROW, Math.max(1, quantity)) }
            : row,
        ),
      );
    },
    [rows, onRowsChange],
  );

  const removeRow = useCallback(
    (productId: string) => onRowsChange(rows.filter((row) => row.productId !== productId)),
    [rows, onRowsChange],
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Inverters</Label>
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (brandOptions.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Inverters</Label>
        <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
          <AlertTriangle className="size-3.5 shrink-0 text-warning" />
          <p className="text-xs text-foreground-secondary">
            No active inverters found.{' '}
            <a href={ROUTES.ADMIN.PRODUCTS} className="font-medium text-primary hover:underline">
              Add inverters
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Inverters</Label>
        <div className="flex items-center overflow-hidden rounded-lg border border-border-light">
          {(['auto', 'manual'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onModeChange(option)}
              className={cn(
                'px-3 py-1 text-xs font-medium capitalize transition-colors duration-fast',
                mode === option
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground-secondary hover:bg-background-secondary',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {mode === 'auto' ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-foreground-secondary">Brand</Label>
            <Select
              value={brandValue || 'auto'}
              onValueChange={(v) => onBrandChange(v === 'auto' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Auto-select best available" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <span className="text-foreground-tertiary">Auto-select best available</span>
                </SelectItem>
                {brandOptions.map((brand) => (
                  <SelectItem key={brand.value} value={brand.value}>
                    {brand.label}
                    {brand.capacityRange && (
                      <span className="ml-2 text-foreground-secondary">{brand.capacityRange}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-foreground-secondary">Capacity</Label>
            {capacityOptions.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md bg-background-secondary px-3 py-2">
                <Info className="size-3.5 shrink-0 text-foreground-tertiary" />
                <p className="text-xs text-foreground-tertiary">
                  Nothing from this brand at {phaseType.replace(/_/g, ' ')}. Try another brand, or
                  leave it on auto.
                </p>
              </div>
            ) : (
              <Select
                value={capacityValue?.toString() ?? 'auto'}
                onValueChange={(v) => onCapacityChange(v === 'auto' ? undefined : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-select optimal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <span className="text-foreground-tertiary">Auto-select optimal</span>
                  </SelectItem>
                  {capacityOptions.map((cap) => (
                    <SelectItem key={cap.value} value={cap.value.toString()}>
                      {cap.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.length === 0 && (
            <div className="flex items-center gap-2 rounded-md bg-background-secondary px-3 py-2">
              <Info className="size-3.5 shrink-0 text-foreground-tertiary" />
              <p className="text-xs text-foreground-tertiary">
                Add at least one inverter, or switch back to auto.
              </p>
            </div>
          )}

          {rows.map((row) => {
            const product = byId.get(row.productId);
            return (
              <div
                key={row.productId}
                className="flex items-center gap-2 rounded-lg border border-border-light px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {product ? `${product.capacityKw} kW · ${product.brandName}` : 'Unavailable'}
                  </p>
                  <p className="truncate text-2xs text-foreground-tertiary">
                    {product?.name ?? 'This inverter is no longer in the catalogue. Remove it.'}
                  </p>
                </div>
                <div className="flex items-center overflow-hidden rounded-lg bg-muted">
                  <button
                    type="button"
                    onClick={() => setQuantity(row.productId, row.quantity - 1)}
                    disabled={row.quantity <= 1}
                    className="px-2.5 py-1 text-sm text-foreground-secondary transition-colors duration-fast hover:bg-background-secondary disabled:opacity-40"
                  >
                    &minus;
                  </button>
                  <span className="min-w-6 px-1 text-center text-sm font-semibold">
                    {row.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(row.productId, row.quantity + 1)}
                    disabled={row.quantity >= MAX_QUANTITY_PER_ROW}
                    className="px-2.5 py-1 text-sm text-foreground-secondary transition-colors duration-fast hover:bg-background-secondary disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.productId)}
                  aria-label="Remove inverter"
                  className="rounded-md p-1 text-foreground-tertiary transition-colors duration-fast hover:bg-background-secondary hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}

          {rows.length < MAX_ROWS && (
            <Select value="" onValueChange={addRow}>
              {/*
                No asChild: the design-system SelectTrigger always renders its own
                chevron beside its children, and Radix's Slot accepts exactly one
                child — asChild here crashed the page the moment Manual opened.
              */}
              <SelectTrigger>
                <span className="flex items-center gap-1.5 text-foreground-secondary">
                  <Plus className="size-3.5" />
                  Add inverter
                </span>
              </SelectTrigger>
              <SelectContent>
                {productOptions.map((product) => (
                  <SelectItem key={product.productId} value={product.productId}>
                    {product.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {rows.length > 0 && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-xs',
                totalCapacityKw < systemSizeKw
                  ? 'border border-warning/30 bg-warning/5 text-foreground-secondary'
                  : 'bg-background-secondary text-foreground-tertiary',
              )}
            >
              {totalCapacityKw < systemSizeKw ? (
                <>
                  <AlertTriangle className="size-3.5 shrink-0 text-warning" />
                  <span>
                    Only {totalCapacityKw} kW of inverters for a {systemSizeKw} kW system. Output may
                    be cut.
                  </span>
                </>
              ) : (
                <span>
                  Total {totalCapacityKw} kW · system is {systemSizeKw} kW
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
