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

interface ControlledProps {
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
}

function VendorPickerControlled({
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
}: ControlledProps): React.JSX.Element {
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

  return (
    <MUIInput
      mode="autocomplete"
      fieldLabel={label}
      required={required}
      options={mergedOptions}
      value={selected}
      onChange={(opt) => {
        const next = opt && typeof opt === 'object' && 'value' in opt ? String(opt.value) : '';
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
