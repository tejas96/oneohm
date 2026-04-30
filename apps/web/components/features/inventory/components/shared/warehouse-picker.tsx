'use client';

import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';

import { MUIInput } from '@/components/ui';
import { useWarehouses } from '@/lib/hooks/resources/warehouses';

export interface WarehousePickerProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  required?: boolean;
}

export function WarehousePicker<T extends FieldValues>({
  control,
  name,
  label = 'Warehouse',
  required = false,
}: WarehousePickerProps<T>): React.JSX.Element {
  const { items, isLoading } = useWarehouses({
    syncToUrl: false,
    defaultPageSize: 200,
  });

  const options = items.map((w) => ({
    value: w.id,
    label: `${w.name} (${w.code})`,
  }));

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <MUIInput
          mode="autocomplete"
          fieldLabel={label}
          required={required}
          options={options}
          loading={isLoading}
          value={options.find((o) => o.value === field.value) ?? null}
          onChange={(opt) => {
            const v = opt && typeof opt === 'object' && 'value' in opt ? String(opt.value) : '';
            field.onChange(v);
          }}
          error={fieldState.error?.message}
          getOptionLabel={(option) =>
            typeof option === 'string' ? option : (option.label ?? String(option.value ?? ''))
          }
        />
      )}
    />
  );
}
