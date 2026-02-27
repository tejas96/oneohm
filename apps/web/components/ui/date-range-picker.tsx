'use client';

import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface DateRangePickerProps {
  /** Selected date range */
  value?: DateRange;
  /** Called when date range changes */
  onChange?: (range: DateRange | undefined) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Date format string (date-fns format) */
  dateFormat?: string;
  /** Show preset range options */
  showPresets?: boolean;
  /** Number of months to display */
  numberOfMonths?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Preset Ranges
// ============================================================================

interface PresetRange {
  label: string;
  getValue: () => DateRange;
}

const getPresetRanges = (): PresetRange[] => {
  const today = new Date();
  
  return [
    {
      label: 'Today',
      getValue: () => ({ from: today, to: today }),
    },
    {
      label: 'Yesterday',
      getValue: () => {
        const yesterday = subDays(today, 1);
        return { from: yesterday, to: yesterday };
      },
    },
    {
      label: 'This Week',
      getValue: () => ({
        from: startOfWeek(today, { weekStartsOn: 1 }),
        to: endOfWeek(today, { weekStartsOn: 1 }),
      }),
    },
    {
      label: 'Last 7 Days',
      getValue: () => ({
        from: subDays(today, 6),
        to: today,
      }),
    },
    {
      label: 'This Month',
      getValue: () => ({
        from: startOfMonth(today),
        to: endOfMonth(today),
      }),
    },
    {
      label: 'Last 30 Days',
      getValue: () => ({
        from: subDays(today, 29),
        to: today,
      }),
    },
  ];
};

// ============================================================================
// Component
// ============================================================================

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pick a date range',
  dateFormat = 'LLL dd, y',
  showPresets = true,
  numberOfMonths = 2,
  disabled = false,
  className,
}: DateRangePickerProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const presets = React.useMemo(() => getPresetRanges(), []);

  const handleSelect = (range: DateRange | undefined) => {
    onChange?.(range);
  };

  const handlePreset = (preset: PresetRange) => {
    const range = preset.getValue();
    onChange?.(range);
    setOpen(false);
  };

  const formatDateRange = () => {
    if (!value?.from) return placeholder;
    if (!value.to) return format(value.from, dateFormat);
    return `${format(value.from, dateFormat)} - ${format(value.to, dateFormat)}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-input-lg',
            !value && 'text-foreground-tertiary',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 size-icon-sm" />
          <span className="truncate">{formatDateRange()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets sidebar */}
          {showPresets && (
            <div className="flex flex-col gap-1 p-3 border-r border-border-light min-w-[140px]">
              <p className="text-2xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2">
                Quick Select
              </p>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-sm font-normal"
                  onClick={() => handlePreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}

          {/* Calendar */}
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={handleSelect}
            numberOfMonths={numberOfMonths}
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
