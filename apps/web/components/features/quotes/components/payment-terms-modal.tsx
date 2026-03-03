'use client';

import type { PaymentMilestone } from '@oneohm-epc/shared-types';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { formatCurrency } from '@/lib/utils/format';

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

export function PaymentTermsModal({
  open,
  onClose,
  defaultMilestones,
  grossTotal,
  onConfirm,
}: PaymentTermsModalProps) {
  const nextId = useRef(0);
  const toRows = useCallback(
    (milestones: typeof defaultMilestones): MilestoneRow[] =>
      milestones.map((m) => ({
        id: nextId.current++,
        stage: m.stage,
        name: m.name,
        percentage: m.percentage,
        order: m.order,
      })),
    [],
  );

  const [rows, setRows] = useState<MilestoneRow[]>(() => toRows(defaultMilestones));

  useEffect(() => {
    if (open) {
      setRows(toRows(defaultMilestones));
    }
  }, [open, defaultMilestones, toRows]);

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
      prev.map((r, i) =>
        i === index ? { ...r, name: value, stage: toStageKey(value) } : r,
      ),
    );
  }, []);

  const handlePercentageChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
      const num = parseInt(e.target.value, 10);
      setRows((prev) =>
        prev.map((r, i) =>
          i === index ? { ...r, percentage: isNaN(num) ? 0 : num } : r,
        ),
      );
    },
    [],
  );

  const handleAddRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: nextId.current++,
        stage: '',
        name: '',
        percentage: 0,
        order: prev.length + 1,
      },
    ]);
  }, []);

  const handleRemoveRow = useCallback(
    (index: number) => {
      if (rows.length <= 1) return;
      setRows((prev) =>
        prev
          .filter((_, i) => i !== index)
          .map((r, i) => ({ ...r, order: i + 1 })),
      );
    },
    [rows.length],
  );

  const handleReset = useCallback(() => {
    setRows(toRows(defaultMilestones));
  }, [defaultMilestones, toRows]);

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

        <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_100px_40px] gap-3 items-center px-1">
            <span className="text-2xs font-medium text-foreground-muted uppercase">
              Milestone
            </span>
            <span className="text-2xs font-medium text-foreground-muted uppercase">
              Percentage
            </span>
            <span />
          </div>

          {rows.map((row, index) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_100px_40px] gap-3 items-start"
            >
              <Input
                size="sm"
                placeholder="Milestone name"
                value={row.name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                error={row.name.trim().length === 0}
              />
              <select
                value={row.percentage || ''}
                onChange={(e) => handlePercentageChange(index, e)}
                className={cn(
                  'h-input-sm w-full rounded-md border-1.5 bg-background px-2 text-xs text-foreground',
                  'transition-all duration-fast outline-none cursor-pointer',
                  'hover:border-border focus:border-primary focus:ring-focus focus:ring-primary/15',
                  'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70',
                  row.percentage > 0
                    ? 'border-border-medium'
                    : 'border-error text-foreground-tertiary',
                )}
              >
                <option value="" disabled>
                  Select %
                </option>
                {buildOptions(row.percentage).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}%
                  </option>
                ))}
              </select>
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
          <div className="rounded-lg border border-border-light bg-background-secondary p-3 space-y-2">
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
                  <span className="ml-1 text-2xs">
                    (+{percentageDiff}% over)
                  </span>
                )}
                {percentageDiff < -0.01 && (
                  <span className="ml-1 text-2xs">
                    ({percentageDiff}% remaining)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-secondary">Gross Total</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(grossTotal)}
              </span>
            </div>

            {/* Per-milestone preview */}
            <div className="border-t border-border-light pt-2 space-y-1">
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
                      {formatCurrency(
                        Math.round(grossTotal * (r.percentage / 100) * 100) /
                          100,
                      )}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="mr-auto"
          >
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
