'use client';

import { LeadTemperature } from '@oneohm-epc/shared-types';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface LeadTemperatureSelectorProps {
  /** Currently selected temperature */
  value?: LeadTemperature;
  /** Callback when selection changes */
  onChange?: (value: LeadTemperature) => void;
  /** Show error styling */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Disable the selector */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

interface TemperatureOption {
  value: LeadTemperature;
  label: string;
  description: string;
  dotColor: string;
  selectedBorder: string;
  selectedBg: string;
}

const TEMPERATURE_OPTIONS: TemperatureOption[] = [
  {
    value: LeadTemperature.HOT,
    label: 'Hot',
    description: 'High priority',
    dotColor: 'bg-destructive',
    selectedBorder: 'border-destructive',
    selectedBg: 'bg-destructive/10',
  },
  {
    value: LeadTemperature.WARM,
    label: 'Warm',
    description: 'Medium priority',
    dotColor: 'bg-warning',
    selectedBorder: 'border-warning',
    selectedBg: 'bg-warning/10',
  },
  {
    value: LeadTemperature.COLD,
    label: 'Cold',
    description: 'Low priority',
    dotColor: 'bg-info',
    selectedBorder: 'border-info',
    selectedBg: 'bg-info/10',
  },
];

/**
 * LeadTemperatureSelector - Color-coded temperature selection cards
 * Based on UX design with Hot (red), Warm (yellow), Cold (blue)
 */
export function LeadTemperatureSelector({
  value,
  onChange,
  error,
  errorMessage,
  disabled,
  className,
}: LeadTemperatureSelectorProps): React.JSX.Element {
  const handleSelect = (temp: LeadTemperature): void => {
    if (!disabled) {
      onChange?.(temp);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, temp: LeadTemperature, index: number): void => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(temp);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % TEMPERATURE_OPTIONS.length;
      const nextOption = TEMPERATURE_OPTIONS[nextIndex] as TemperatureOption;
      handleSelect(nextOption.value);
      // Focus the next element
      const nextElement = document.querySelector(
        `[data-temp="${nextOption.value}"]`,
      ) as HTMLElement;
      nextElement?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + TEMPERATURE_OPTIONS.length) % TEMPERATURE_OPTIONS.length;
      const prevOption = TEMPERATURE_OPTIONS[prevIndex] as TemperatureOption;
      handleSelect(prevOption.value);
      // Focus the previous element
      const prevElement = document.querySelector(
        `[data-temp="${prevOption.value}"]`,
      ) as HTMLElement;
      prevElement?.focus();
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div
        role="radiogroup"
        aria-label="Lead Temperature"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {TEMPERATURE_OPTIONS.map((option, index) => {
          const isSelected = value === option.value;

          return (
            <div
              key={option.value}
              role="radio"
              aria-checked={isSelected}
              tabIndex={disabled ? -1 : isSelected || (!value && index === 0) ? 0 : -1}
              data-temp={option.value}
              onClick={() => handleSelect(option.value)}
              onKeyDown={(e) => handleKeyDown(e, option.value, index)}
              className={cn(
                'p-4 rounded-lg border-2 cursor-pointer transition-all duration-fast',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
                isSelected
                  ? cn(option.selectedBorder, option.selectedBg)
                  : 'border-border-light bg-background hover:border-border-medium',
                disabled && 'opacity-50 cursor-not-allowed',
                error && !isSelected && 'border-error/50',
              )}
            >
              <div className="flex items-center gap-3">
                {/* Color dot */}
                <div className={cn('size-icon-sm rounded-full shrink-0', option.dotColor)} />

                {/* Label and description */}
                <div>
                  <div className="font-medium text-foreground">{option.label}</div>
                  <div className="text-xs text-foreground-tertiary">{option.description}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && errorMessage && <p className="text-xs text-error">{errorMessage}</p>}
    </div>
  );
}
