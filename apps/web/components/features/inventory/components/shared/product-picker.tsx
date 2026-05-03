'use client';

import { ProductStatus } from '@oneohm-epc/shared/types';
import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';

import { MUIInput } from '@/components/ui';
import { useResourceList } from '@/lib/hooks/core';
import {
  type ProductAdminFilters,
  type ProductAdminItem,
} from '@/lib/hooks/resources/products-admin';

export interface ProductPickerProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  required?: boolean;
}

export function ProductPicker<T extends FieldValues>({
  control,
  name,
  label = 'Product',
  required = false,
}: ProductPickerProps<T>): React.JSX.Element {
  const { items, isLoading } = useResourceList<ProductAdminItem, ProductAdminFilters>({
    resource: 'products-admin',
    endpoint: '/products',
    defaultPageSize: 50,
    syncToUrl: false,
    defaultFilters: { status: ProductStatus.ACTIVE },
  });

  const options = items.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.code})`,
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
