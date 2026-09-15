'use client';

import { useEffect, useMemo, useState } from 'react';
import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';

import { MUIInput } from '@/components/ui';
import { useResourceDetail } from '@/lib/hooks/core';
import { useVendors, type Vendor } from '@/lib/hooks/resources/vendors';

interface VendorOption {
  value: string;
  label: string;
  [key: string]: unknown;
}

export interface VendorPickerProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

const toOption = (v: Pick<Vendor, 'id' | 'name' | 'code'>): VendorOption => ({
  value: v.id,
  label: v.code ? `${v.name} (${v.code})` : v.name,
});

export function VendorPicker<T extends FieldValues>({
  control,
  name,
  label = 'Vendor',
  required = false,
  placeholder = 'Search vendors…',
}: VendorPickerProps<T>): React.JSX.Element {
  const [inputValue, setInputValue] = useState('');

  const { items, isFetching, setSearch } = useVendors({
    syncToUrl: false,
    defaultPageSize: 25,
    defaultFilters: { status: 'active' } as Record<string, unknown>,
  });

  useEffect(() => {
    setSearch(inputValue);
  }, [inputValue, setSearch]);

  const options = useMemo(() => items.map(toOption), [items]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <VendorPickerControlled
          value={typeof field.value === 'string' ? field.value : ''}
          onChange={(v) => field.onChange(v)}
          options={options}
          loading={isFetching}
          inputValue={inputValue}
          onInputChange={setInputValue}
          label={label}
          required={required}
          placeholder={placeholder}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

export interface VendorPickerControlledProps {
  value: string;
  onChange: (next: string) => void;
  options: VendorOption[];
  loading: boolean;
  inputValue: string;
  onInputChange: (v: string) => void;
  label: string;
  required: boolean;
  placeholder: string;
  error?: string;
  /**
   * Offer to create a vendor when what was typed matches none. Receives the
   * typed name. Leave it out and the picker behaves exactly as it always has —
   * the Inventory form does not pass it.
   */
  onCreateNew?: (name: string) => void;
}

/** A value no real vendor id can take, marking the "add a new vendor" row. */
const CREATE_VALUE = '__create_vendor__';

/**
 * The controlled half of the vendor picker, with no react-hook-form
 * dependency — for a caller like `RecordMoneyDialog` that manages its own
 * `useState` and has no form to hang a `Control` off of. `VendorPicker` above
 * is a thin `Controller` wrapper around this; both render the exact same
 * autocomplete, so a vendor picked here and one picked through the RHF form
 * look and behave identically.
 */
export function VendorPickerControlled({
  value,
  onChange,
  options,
  loading,
  inputValue,
  onInputChange,
  label,
  required,
  placeholder,
  error,
  onCreateNew,
}: VendorPickerControlledProps): React.JSX.Element {
  const pageHasMatch = options.some((o) => o.value === value);

  const detail = useResourceDetail<Vendor>({
    resource: 'vendors',
    endpoint: '/vendors',
    id: value,
    enabled: Boolean(value) && !pageHasMatch,
  });

  useEffect(() => {
    if (value && !pageHasMatch && detail.isError) {
      onChange('');
    }
  }, [value, pageHasMatch, detail.isError, onChange]);

  const preloaded: VendorOption | null = useMemo(() => {
    if (pageHasMatch || !value) return null;
    if (!detail.data) return null;
    return toOption(detail.data);
  }, [pageHasMatch, value, detail.data]);

  const mergedOptions = useMemo(
    () =>
      preloaded ? [preloaded, ...options.filter((o) => o.value !== preloaded.value)] : options,
    [preloaded, options],
  );

  const selected =
    mergedOptions.find((o) => o.value === value) ?? (value && preloaded ? preloaded : null);

  /*
   * "Add “Sharma Traders” as a new vendor", LAST in the list. Search is fuzzy,
   * so typing "Arihant" also lists "Arihant Associates" — an existing vendor
   * must sit above the offer to create one, or people add duplicates.
   *
   * Hidden when the typed text already names a vendor. An option's label is
   * "Name (CODE)", and after a pick the input holds that label, so both forms
   * count as a match — otherwise picking a vendor would offer to create it.
   */
  const typed = inputValue.trim();
  const typedLower = typed.toLowerCase();
  const namesExisting = mergedOptions.some((o) => {
    const label = o.label.toLowerCase();
    return label === typedLower || label.startsWith(`${typedLower} (`);
  });
  const optionsWithCreate =
    onCreateNew && typed && !namesExisting
      ? [...mergedOptions, { value: CREATE_VALUE, label: `Add “${typed}” as a new vendor` }]
      : mergedOptions;

  return (
    <MUIInput
      mode="autocomplete"
      fieldLabel={label}
      required={required}
      options={optionsWithCreate}
      value={selected}
      onChange={(opt) => {
        const next = opt && typeof opt === 'object' && 'value' in opt ? String(opt.value) : '';
        if (next === CREATE_VALUE) {
          // Not a selection. The caller opens its own dialog and sets the
          // search text itself when that closes.
          onCreateNew?.(typed);
          return;
        }
        onChange(next);
      }}
      inputValue={inputValue}
      onInputChange={onInputChange}
      loading={loading}
      error={error}
      textFieldProps={{ placeholder }}
      noOptionsText={inputValue ? 'No matches' : 'Type to search'}
      filterOptions={(x) => x}
      isOptionEqualToValue={(a, b) => {
        const av = typeof a === 'object' && a !== null ? (a as VendorOption).value : a;
        const bv = typeof b === 'object' && b !== null ? (b as VendorOption).value : b;
        return av === bv;
      }}
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : (option.label ?? String(option.value ?? ''))
      }
    />
  );
}
