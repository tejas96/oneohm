'use client';

import { type JSX, useMemo } from 'react';
import { Controller, type Control } from 'react-hook-form';

import type { ProductFormData } from '../schemas/product.schema';

import { MUIInput, MUISelect, MUISwitch, Typography } from '@/components/ui';
import type { ProductTypeAttribute } from '@/lib/hooks/resources';

interface ProductSpecificationsFieldsProps {
  attributes: ProductTypeAttribute[];
  control: Control<ProductFormData>;
}

function getValidationNumber(
  validation: Record<string, unknown> | undefined,
  key: 'min' | 'max',
): number | undefined {
  const value = validation?.[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getValidationValues(validation: Record<string, unknown> | undefined): string[] {
  const options = validation?.options;
  if (Array.isArray(options)) return options as string[];
  const values = validation?.values;
  return Array.isArray(values) ? (values as string[]) : [];
}

export function ProductSpecificationsFields({
  attributes,
  control,
}: ProductSpecificationsFieldsProps): JSX.Element | null {
  const groupedAttributes = useMemo(() => {
    const groups = new Map<string, ProductTypeAttribute[]>();
    attributes
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((attr) => {
        const groupName = attr.groupName || 'General';
        if (!groups.has(groupName)) groups.set(groupName, []);
        groups.get(groupName)?.push(attr);
      });
    return Array.from(groups.entries());
  }, [attributes]);

  if (attributes.length === 0) return null;

  return (
    <div className="space-y-6">
      {groupedAttributes.map(([groupName, groupAttrs]) => (
        <div key={groupName} className="space-y-3">
          <Typography variant="body" className="text-xs font-semibold uppercase tracking-wide">
            {groupName}
          </Typography>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groupAttrs.map((attr) => {
              const fieldName = `specifications.${attr.attributeKey}` as const;
              const enumValues =
                attr.dataType === 'enum' ? getValidationValues(attr.validation) : [];
              const isNumeric =
                attr.dataType === 'number' ||
                attr.dataType === 'integer' ||
                attr.dataType === 'decimal';
              const min = isNumeric ? getValidationNumber(attr.validation, 'min') : undefined;
              const max = isNumeric ? getValidationNumber(attr.validation, 'max') : undefined;

              if (attr.dataType === 'boolean') {
                return (
                  <div
                    key={attr.attributeKey}
                    className="flex items-center justify-between rounded-lg shadow-e2 p-3"
                  >
                    <Controller
                      name={fieldName}
                      control={control}
                      render={({ field }) => (
                        <MUISwitch
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                          label={attr.label}
                          description={attr.helpText || undefined}
                          tooltip={attr.helpText || 'Toggle this specification on or off.'}
                          labelPosition="left"
                        />
                      )}
                    />
                  </div>
                );
              }

              if (attr.dataType === 'enum' && enumValues.length > 0) {
                return (
                  <div key={attr.attributeKey}>
                    <Controller
                      name={fieldName}
                      control={control}
                      render={({ field }) => (
                        <MUISelect
                          fieldLabel={attr.label}
                          required={attr.isRequired}
                          tooltip={attr.helpText || 'Select a value from the allowed options.'}
                          placeholder={`Select ${attr.label.toLowerCase()}`}
                          value={
                            typeof field.value === 'string' || typeof field.value === 'number'
                              ? String(field.value)
                              : ''
                          }
                          onChange={(event) => field.onChange(event.target.value)}
                          options={enumValues.map((value) => ({
                            value,
                            label: value,
                          }))}
                        />
                      )}
                    />
                    {attr.helpText && (
                      <p className="text-xs text-foreground-tertiary mt-1">{attr.helpText}</p>
                    )}
                  </div>
                );
              }

              return (
                <div key={attr.attributeKey}>
                  <Controller
                    name={fieldName}
                    control={control}
                    render={({ field }) => (
                      <MUIInput
                        fieldLabel={attr.label}
                        required={attr.isRequired}
                        tooltip={
                          attr.helpText ||
                          (isNumeric
                            ? `Enter a ${attr.dataType} value${
                                min !== undefined || max !== undefined
                                  ? ` (${min ?? 'any'} to ${max ?? 'any'})`
                                  : ''
                              }.`
                            : 'Enter a value for this specification.')
                        }
                        type={isNumeric ? 'number' : 'text'}
                        step={attr.dataType === 'integer' ? '1' : isNumeric ? '0.01' : undefined}
                        min={min}
                        max={max}
                        placeholder={
                          isNumeric ? `e.g. ${min ?? 0}` : `e.g. ${attr.label.toLowerCase()}`
                        }
                        value={
                          typeof field.value === 'string' || typeof field.value === 'number'
                            ? String(field.value)
                            : ''
                        }
                        onChange={(event) => {
                          const value = event.target.value;
                          if (isNumeric) {
                            field.onChange(value === '' ? undefined : Number(value));
                          } else {
                            field.onChange(value);
                          }
                        }}
                      />
                    )}
                  />
                  {attr.helpText && (
                    <p className="text-xs text-foreground-tertiary mt-1">{attr.helpText}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
