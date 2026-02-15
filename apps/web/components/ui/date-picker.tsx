'use client';

import { format, addDays } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface DatePickerProps {
  /** Selected date */
  value?: Date;
  /** Called when date changes */
  onChange?: (date: Date | undefined) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Date format string (date-fns format) */
  dateFormat?: string;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Show quick date selection buttons */
  showQuickSelect?: boolean;
  /** Quick select options */
  quickSelectOptions?: { label: string; days: number }[];
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_QUICK_OPTIONS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'In 1 week', days: 7 },
];

// ============================================================================
// Component
// ============================================================================

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  dateFormat = 'PPP',
  minDate,
  maxDate,
  showQuickSelect = false,
  quickSelectOptions = DEFAULT_QUICK_OPTIONS,
  disabled = false,
  className,
}: DatePickerProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date);
    if (date) {
      setOpen(false);
    }
  };

  const handleQuickSelect = (days: number) => {
    const date = addDays(new Date(), days);
    onChange?.(date);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-input-md',
            !value && 'text-foreground-tertiary',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 size-icon-sm" />
          {value ? format(value, dateFormat) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {showQuickSelect && (
          <div className="flex flex-wrap gap-2 p-3 border-b border-border-light">
            {quickSelectOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(option.days)}
                className="text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
