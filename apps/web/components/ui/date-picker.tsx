'use client';

import { format, addDays } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  dateFormat?: string;
  minDate?: Date;
  maxDate?: Date;
  showQuickSelect?: boolean;
  quickSelectOptions?: { label: string; days: number }[];
  disabled?: boolean;
  className?: string;
  showIcon?: boolean;
}

const DEFAULT_QUICK_OPTIONS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'In 1 week', days: 7 },
];

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
  showIcon = true,
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
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-foreground-tertiary',
            className,
          )}
          disabled={disabled}
        >
          {showIcon && <CalendarIcon className="mr-2 size-icon-sm" />}
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
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
