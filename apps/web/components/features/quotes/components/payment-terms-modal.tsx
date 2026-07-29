'use client';

import type { PaymentMilestone } from '@tejas96/shared/types';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrencyDecimal } from '@/lib/utils/format';

const PERCENTAGE_STEPS = Array.from({ length: 20 }, (_, i) => (i + 1) * 5);

interface MilestoneRow {
  id: number;
  stage: string;
  name: string;
  percentage: number;
  order: number;
}

interface PaymentTermsModalProps {
  open: boolean;
  onClose: () => void;
  defaultMilestones: Array<{
    stage: string;
    name: string;
    percentage: number;
    order: number;
  }>;
  grossTotal: number;
  onConfirm: (milestones: PaymentMilestone[]) => void;
}

function toStageKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

function buildOptions(currentValue: number): number[] {
  const set = new Set(PERCENTAGE_STEPS);
  if (currentValue > 0) set.add(currentValue);
  return Array.from(set).sort((a, b) => a - b);
}

let globalRowId = 0;

function createRow(m: {
  stage: string;
  name: string;
  percentage: number;
  order: number;
}): MilestoneRow {
  return {
    id: globalRowId++,
    stage: m.stage,
    name: m.name,
    percentage: m.percentage,
    order: m.order,
  };
}

export function PaymentTermsModal({
  open,
  onClose,
  defaultMilestones,
  grossTotal,
  onConfirm,
}: PaymentTermsModalProps) {
  const [rows, setRows] = useState<MilestoneRow[]>([]);

  useLayoutEffect(() => {
    if (open) {
      setRows(defaultMilestones.map(createRow));
    }
  }, [open, defaultMilestones]);

  const totalPercentage = useMemo(
    () => rows.reduce((sum, r) => sum + (r.percentage || 0), 0),
    [rows],
  );

  const canAddRow = totalPercentage < 100;

  const isValid = useMemo(() => {
    if (rows.length === 0) return false;
    if (Math.abs(totalPercentage - 100) > 0.01) return false;
    return rows.every((r) => r.name.trim().length > 0 && r.percentage > 0);
  }, [rows, totalPercentage]);

  const handleNameChange = useCallback((index: number, value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, name: value, stage: toStageKey(value) } : r)),
    );
  }, []);

  const handlePercentageChange = useCallback((index: number, value: string) => {
    const num = parseInt(value, 10);
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, percentage: isNaN(num) ? 0 : num } : r)),
    );
  }, []);

  const handleAddRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      createRow({ stage: '', name: '', percentage: 0, order: prev.length + 1 }),
    ]);
  }, []);

  const handleRemoveRow = useCallback(
    (index: number) => {
      if (rows.length <= 1) return;
      setRows((prev) => prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, order: i + 1 })));
    },
    [rows.length],
  );

  const handleReset = useCallback(() => {
    setRows(defaultMilestones.map(createRow));
  }, [defaultMilestones]);

  const handleConfirm = useCallback(() => {
    const milestones: PaymentMilestone[] = rows.map((r, i) => ({
      stage: r.stage || toStageKey(r.name),
      name: r.name.trim(),
      percentage: r.percentage,
      amount: Math.round(grossTotal * (r.percentage / 100) * 100) / 100,
      order: i + 1,
    }));
    onConfirm(milestones);
  }, [rows, grossTotal, onConfirm]);

  const percentageDiff = Math.round((totalPercentage - 100) * 100) / 100;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Payment Terms</DialogTitle>
          <DialogDescription>
            Set payment milestones for this quote. Total must equal 100%.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_120px_40px] gap-3 items-center px-1">
            <span className="text-2xs font-medium text-foreground-muted uppercase">Milestone</span>
            <span className="text-2xs font-medium text-foreground-muted uppercase">Percentage</span>
            <span />
          </div>

          {rows.map((row, index) => (
            <div key={row.id} className="grid grid-cols-[1fr_120px_40px] gap-3 items-start">
              <Input
                size="sm"
                placeholder="Milestone name"
                value={row.name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                error={row.name.trim().length === 0}
              />
              <Select
                value={row.percentage > 0 ? String(row.percentage) : undefined}
                onValueChange={(val) => handlePercentageChange(index, val)}
              >
                <SelectTrigger
                  className={cn(
                    'h-input-sm text-xs',
                    row.percentage === 0 && 'border-error text-foreground-tertiary',
                  )}
                >
                  <SelectValue placeholder="Select %" />
                </SelectTrigger>
                <SelectContent className="z-popover">
                  {buildOptions(row.percentage).map((opt) => (
                    <SelectItem key={opt} value={String(opt)}>
                      {opt}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => handleRemoveRow(index)}
                disabled={rows.length <= 1}
                className="p-2 rounded-md text-foreground-tertiary hover:text-error hover:bg-error/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}

          {/* Add row */}
          <button
            type="button"
            onClick={handleAddRow}
            disabled={!canAddRow}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium transition-colors',
              canAddRow
                ? 'text-primary hover:text-primary/80 cursor-pointer'
                : 'text-foreground-tertiary cursor-not-allowed opacity-50',
            )}
          >
            <Plus className="size-3.5" />
            Add Milestone
            {!canAddRow && (
              <span className="text-2xs text-foreground-tertiary font-normal ml-1">
                (100% allocated)
              </span>
            )}
          </button>

          {/* Summary */}
          <div className="rounded-lg shadow-e2 bg-background-secondary p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-secondary">Total Percentage</span>
              <span
                className={
                  Math.abs(percentageDiff) > 0.01
                    ? 'font-semibold text-error'
                    : 'font-semibold text-success'
                }
              >
                {totalPercentage}%
                {percentageDiff > 0.01 && (
                  <span className="ml-1 text-2xs">(+{percentageDiff}% over)</span>
                )}
                {percentageDiff < -0.01 && (
                  <span className="ml-1 text-2xs">({percentageDiff}% remaining)</span>
                )}
              </span>
            </div>
            {/* Paise, not whole rupees, on both the total and the lines below.
                Rounding each figure independently made the milestones appear to
                sum ₹1 short of the gross — the stored paise are exact, but a
                finance operator checking the arithmetic on screen saw it fail. */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-secondary">Gross Total</span>
              <span className="font-semibold text-foreground">
                {formatCurrencyDecimal(grossTotal)}
              </span>
            </div>

            {/* Per-milestone preview */}
            <div className="pt-2 space-y-1">
              {rows
                .filter((r) => r.name.trim() && r.percentage > 0)
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-2xs text-foreground-secondary"
                  >
                    <span>
                      {r.name} ({r.percentage}%)
                    </span>
                    <span className="font-medium text-foreground">
                      {formatCurrencyDecimal(
                        Math.round(grossTotal * (r.percentage / 100) * 100) / 100,
                      )}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleReset} className="mr-auto">
            <RotateCcw className="size-3.5 mr-1.5" />
            Reset to Defaults
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!isValid} onClick={handleConfirm}>
            Confirm & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
