import { type JSX } from 'react';
import { Controller, type Control, type FieldArrayWithId } from 'react-hook-form';

import type { ProductTypeFormData } from '../schemas/product-type.schema';

import { FieldLabel } from '@/components/shared';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  Typography,
} from '@/components/ui';

const DATA_TYPE_OPTIONS = [
  { value: 'string', label: 'Text' },
  { value: 'integer', label: 'Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'enum', label: 'Enum' },
] as const;

interface ProductTypeAttributesEditorProps {
  control: Control<ProductTypeFormData>;
  fields: FieldArrayWithId<ProductTypeFormData, 'attributes'>[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  watch: (name: `attributes.${number}.dataType`) => string | undefined;
}

export function ProductTypeAttributesEditor({
  control,
  fields,
  onAdd,
  onRemove,
  watch,
}: ProductTypeAttributesEditorProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="body" className="font-semibold">
            Attributes
          </Typography>
          <Typography variant="body" color="muted" className="text-xs">
            Define the specifications collected for products of this type.
          </Typography>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          Add Attribute
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-light p-4 text-sm text-foreground-tertiary">
          No attributes configured. Add attributes to enable spec fields in product forms.
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => {
            const dataType = watch(`attributes.${index}.dataType`);
            const isNumber = dataType === 'integer' || dataType === 'decimal';
            const isEnum = dataType === 'enum';

            return (
              <div key={field.id} className="rounded-lg border border-border-light p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Attribute Key"
                      required
                      tooltip="Unique key used in product specs (e.g., wattage)."
                    />
                    <Controller
                      name={`attributes.${index}.attributeKey`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <Input {...controllerField} placeholder="e.g. wattage" />
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Label"
                      required
                      tooltip="Display label shown to admins (e.g., Wattage)."
                    />
                    <Controller
                      name={`attributes.${index}.label`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <Input {...controllerField} placeholder="e.g. Wattage" />
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Data Type"
                      required
                      tooltip="Controls the input type shown in product forms."
                    />
                    <Controller
                      name={`attributes.${index}.dataType`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <Select
                          value={controllerField.value}
                          onValueChange={controllerField.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type (e.g., Text)" />
                          </SelectTrigger>
                          <SelectContent>
                            {DATA_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Group"
                      tooltip="Group name used to cluster fields (e.g., Electrical)."
                    />
                    <Controller
                      name={`attributes.${index}.groupName`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <Input {...controllerField} placeholder="e.g. general" />
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Default Value"
                      tooltip="Optional default value used when creating products."
                    />
                    <Controller
                      name={`attributes.${index}.defaultValue`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <Input {...controllerField} placeholder="e.g. 540" />
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Sort Order"
                      tooltip="Lower numbers appear first in the form."
                    />
                    <Controller
                      name={`attributes.${index}.sortOrder`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <Input
                          type="number"
                          placeholder="e.g. 1"
                          {...controllerField}
                          onChange={(event) =>
                            controllerField.onChange(
                              event.target.value === '' ? 0 : Number(event.target.value),
                            )
                          }
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel
                    label="Help Text"
                    tooltip="Short hint shown below the field in product forms."
                  />
                  <Controller
                    name={`attributes.${index}.helpText`}
                    control={control}
                    render={({ field: controllerField }) => (
                      <Textarea
                        {...controllerField}
                        size="sm"
                        rows={2}
                        placeholder="e.g. Enter in watts"
                      />
                    )}
                  />
                </div>

                {isNumber && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <FieldLabel
                        label="Min Value"
                        tooltip="Minimum allowed value for this field."
                      />
                      <Controller
                        name={`attributes.${index}.validationMin`}
                        control={control}
                        render={({ field: controllerField }) => (
                          <Input
                            type="number"
                            step={dataType === 'integer' ? '1' : '0.01'}
                            placeholder={dataType === 'integer' ? 'e.g. 1' : 'e.g. 0.5'}
                            value={controllerField.value ?? ''}
                            onChange={(event) =>
                              controllerField.onChange(
                                event.target.value === '' ? undefined : Number(event.target.value),
                              )
                            }
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel
                        label="Max Value"
                        tooltip="Maximum allowed value for this field."
                      />
                      <Controller
                        name={`attributes.${index}.validationMax`}
                        control={control}
                        render={({ field: controllerField }) => (
                          <Input
                            type="number"
                            step={dataType === 'integer' ? '1' : '0.01'}
                            placeholder={dataType === 'integer' ? 'e.g. 999' : 'e.g. 10.5'}
                            value={controllerField.value ?? ''}
                            onChange={(event) =>
                              controllerField.onChange(
                                event.target.value === '' ? undefined : Number(event.target.value),
                              )
                            }
                          />
                        )}
                      />
                    </div>
                  </div>
                )}

                {isEnum && (
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Enum Options"
                      required
                      tooltip="Comma-separated list of allowed values."
                    />
                    <Controller
                      name={`attributes.${index}.validationOptions`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <Input {...controllerField} placeholder="e.g. perc, topcon" />
                      )}
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center justify-between rounded-lg border border-border-light p-3 flex-1 min-w-[220px]">
                    <div>
                      <FieldLabel
                        label="Required"
                        tooltip="If enabled, this value must be provided for every product."
                      />
                      <p className="text-xs text-foreground-tertiary">
                        Must be provided for every product
                      </p>
                    </div>
                    <Controller
                      name={`attributes.${index}.isRequired`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <Switch
                          checked={controllerField.value}
                          onCheckedChange={controllerField.onChange}
                        />
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border-light p-3 flex-1 min-w-[220px]">
                    <div>
                      <FieldLabel label="Filterable" tooltip="Show this attribute in filters." />
                      <p className="text-xs text-foreground-tertiary">
                        Show this attribute in filters
                      </p>
                    </div>
                    <Controller
                      name={`attributes.${index}.isFilterable`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <Switch
                          checked={controllerField.value}
                          onCheckedChange={controllerField.onChange}
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)}>
                    Remove Attribute
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
