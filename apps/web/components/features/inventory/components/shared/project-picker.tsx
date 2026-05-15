'use client';

import { useEffect, useMemo, useState } from 'react';
import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';

import { MUIInput } from '@/components/ui';
import { useResourceDetail, useResourceList, type BaseFilters } from '@/lib/hooks/core';

interface ProjectPick {
  id: string;
  name: string;
  projectNumber?: string;
}

interface ProjectOption {
  value: string;
  label: string;
  [key: string]: unknown;
}

export interface ProjectPickerProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

const toOption = (p: ProjectPick): ProjectOption => ({
  value: p.id,
  label: p.projectNumber ? `${p.projectNumber} — ${p.name}` : p.name,
});

export function ProjectPicker<T extends FieldValues>({
  control,
  name,
  label = 'Project (Optional)',
  required = false,
  placeholder = 'Search projects…',
}: ProjectPickerProps<T>): React.JSX.Element {
  const [inputValue, setInputValue] = useState('');

  const { items, isFetching, setSearch } = useResourceList<ProjectPick, BaseFilters>({
    resource: 'projects',
    endpoint: '/projects',
    defaultPageSize: 25,
    syncToUrl: false,
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
        <ProjectPickerControlled
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
  options: ProjectOption[];
  loading: boolean;
  inputValue: string;
  onInputChange: (v: string) => void;
  label: string;
  required: boolean;
  placeholder: string;
  error?: string;
}

function ProjectPickerControlled({
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

  const detail = useResourceDetail<ProjectPick>({
    resource: 'projects',
    endpoint: '/projects',
    id: value,
    enabled: Boolean(value) && !pageHasMatch,
  });

  useEffect(() => {
    if (value && !pageHasMatch && detail.isError) {
      onChange('');
    }
  }, [value, pageHasMatch, detail.isError, onChange]);

  const preloaded: ProjectOption | null = useMemo(() => {
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
      clearable={!required}
      textFieldProps={{ placeholder }}
      noOptionsText={inputValue ? 'No matches' : 'Type to search'}
      filterOptions={(x) => x}
      isOptionEqualToValue={(a, b) => {
        const av = typeof a === 'object' && a !== null ? (a as ProjectOption).value : a;
        const bv = typeof b === 'object' && b !== null ? (b as ProjectOption).value : b;
        return av === bv;
      }}
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : (option.label ?? String(option.value ?? ''))
      }
    />
  );
}
