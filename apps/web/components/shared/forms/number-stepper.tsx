'use client';

import { Minus, Plus } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  disabled = false,
  label,
  hint,
  className,
  size = 'md',
}: NumberStepperProps) {
  const canDecrement = value - step >= min;
  const canIncrement = value + step <= max;

  const handleDecrement = () => {
    if (canDecrement && !disabled) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrement = () => {
    if (canIncrement && !disabled) {
      onChange(Math.min(max, value + step));
    }
  };

  const iconSize = size === 'sm' ? 'size-3.5' : 'size-4';
  const buttonSize = size === 'sm' ? 'size-7' : 'size-8';
  const valueSize = size === 'sm' ? 'min-w-[2.5rem] text-sm' : 'min-w-[3rem] text-base';

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <span className="text-sm font-medium text-foreground">{label}</span>
      )}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(buttonSize, 'rounded-lg')}
          disabled={disabled || !canDecrement}
          onClick={handleDecrement}
        >
          <Minus className={iconSize} />
        </Button>
        <span
          className={cn(
            'text-center font-semibold tabular-nums',
            valueSize,
            disabled && 'text-foreground-secondary',
          )}
        >
          {value}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(buttonSize, 'rounded-lg')}
          disabled={disabled || !canIncrement}
          onClick={handleIncrement}
        >
          <Plus className={iconSize} />
        </Button>
      </div>
      {hint && (
        <p className="text-xs text-foreground-secondary">{hint}</p>
      )}
    </div>
  );
}
