'use client';

import * as React from 'react';
import { DayPicker, type DayPickerProps } from 'react-day-picker';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CalendarProps = DayPickerProps;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps): React.JSX.Element {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-foreground-secondary rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell: cn(
          'h-9 w-9 text-center text-sm p-0 relative',
          '[&:has([aria-selected].day-range-end)]:rounded-r-md',
          '[&:has([aria-selected].day-outside)]:bg-primary/50',
          '[&:has([aria-selected])]:bg-primary/10',
          'first:[&:has([aria-selected])]:rounded-l-md',
          'last:[&:has([aria-selected])]:rounded-r-md',
          'focus-within:relative focus-within:z-20'
        ),
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        day_range_end: 'day-range-end',
        day_selected:
          'bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white',
        day_today: 'bg-muted text-foreground',
        day_outside:
          'day-outside text-foreground-tertiary aria-selected:bg-primary/50 aria-selected:text-foreground-secondary',
        day_disabled: 'text-foreground-tertiary opacity-50',
        day_range_middle: 'aria-selected:bg-primary/10 aria-selected:text-foreground',
        day_hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
