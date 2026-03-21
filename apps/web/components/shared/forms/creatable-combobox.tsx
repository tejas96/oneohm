'use client';

import { ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input, type InputProps } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label?: string;
  description?: string;
}

export interface CreatableComboboxProps {
  id?: string;
  name?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyMessage?: string;
  allowCustom?: boolean;
  disabled?: boolean;
  error?: InputProps['error'];
  className?: string;
}

export function CreatableCombobox({
  id,
  name,
  inputRef,
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Select or type...',
  emptyMessage = 'No matches found.',
  allowCustom = true,
  disabled = false,
  error,
  className,
}: CreatableComboboxProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const inputValue = value ?? '';
  const query = inputValue.trim().toLowerCase();

  const filteredOptions = React.useMemo(() => {
    if (!query) return options;
    return options.filter((option) => {
      const label = option.label ?? option.value;
      return (
        label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query)
      );
    });
  }, [options, query]);

  const hasExactMatch = React.useMemo(
    () =>
      options.some(
        (option) => option.value.toLowerCase() === inputValue.trim().toLowerCase(),
      ),
    [options, inputValue],
  );

  const showCreate = allowCustom && inputValue.trim().length > 0 && !hasExactMatch;

  const handleSelect = (selected: string) => {
    onChange(selected);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverAnchor asChild>
        <div className={cn('w-full', className)}>
          <Input
            id={id}
            name={name}
            ref={inputRef}
            value={inputValue}
            onChange={(event) => {
              onChange(event.target.value);
              if (!disabled) setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                setOpen(true);
              }
              if (event.key === 'Escape') {
                setOpen(false);
              }
            }}
            onFocus={() => {
              if (!disabled) setOpen(true);
            }}
            onBlur={() => {
              onBlur?.();
            }}
            placeholder={placeholder}
            rightIcon={<ChevronsUpDown className="size-icon-sm" />}
            onRightIconClick={() => {
              if (!disabled) setOpen((prev) => !prev);
            }}
            error={error}
            disabled={disabled}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="p-0 w-(--radix-popover-trigger-width)"
      >
        <Command shouldFilter={false}>
          <CommandList>
            {showCreate && (
              <CommandGroup>
                <CommandItem
                  value={inputValue.trim()}
                  onMouseDown={(event) => event.preventDefault()}
                  onSelect={() => handleSelect(inputValue.trim())}
                >
                  <div className="flex w-full items-center justify-between">
                    <span>Use "{inputValue.trim()}"</span>
                    <span className="text-xs text-foreground-tertiary">New</span>
                  </div>
                </CommandItem>
              </CommandGroup>
            )}
            {filteredOptions.length > 0 ? (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onMouseDown={(event) => event.preventDefault()}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <div className="flex flex-col">
                      <span>{option.label ?? option.value}</span>
                      {option.description && (
                        <span className="text-xs text-foreground-tertiary">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              !showCreate && <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
