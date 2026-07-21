import { Lock } from 'lucide-react';
import { type JSX } from 'react';
import { Controller, type Control, type FieldArrayWithId } from 'react-hook-form';

import type { ProductTypeFormData } from '../schemas/product-type.schema';

import { FieldLabel } from '@/components/shared';
import {
  Badge,
  Button,
  MUIInput,
  MUISelect,
  MUISwitch,
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
  systemAttributeKeys?: Set<string>;
}

export function ProductTypeAttributesEditor({
  control,
  fields,
  onAdd,
  onRemove,
  watch,
  systemAttributeKeys,
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
            const isSystemAttr = systemAttributeKeys?.has(field.attributeKey) === true;

            return (
              <div key={field.id} className="rounded-lg shadow-e2 p-4 space-y-4">
                {isSystemAttr && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" size="xs" shape="rounded" className="gap-1">
                      <Lock className="size-2.5" />
                      Required by system
                    </Badge>
                    <span className="text-2xs text-foreground-tertiary">
                      Key and data type are locked. You can edit labels, help text, and validation.
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Controller
                      name={`attributes.${index}.attributeKey`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <MUIInput
                          fieldLabel="Attribute Key"
                          required
                          tooltip={
                            isSystemAttr
                              ? 'System attribute key cannot be changed.'
                              : 'Unique key used in product specs (e.g., wattage).'
                          }
                          placeholder="e.g. wattage"
                          disabled={isSystemAttr}
                          {...controllerField}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <Controller
                      name={`attributes.${index}.label`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <MUIInput
                          fieldLabel="Label"
                          required
                          tooltip="Display label shown to admins (e.g., Wattage)."
                          placeholder="e.g. Wattage"
                          {...controllerField}
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Controller
                      name={`attributes.${index}.dataType`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <MUISelect
                          fieldLabel="Data Type"
                          required
                          tooltip={
                            isSystemAttr
                              ? 'System attribute data type cannot be changed.'
                              : 'Controls the input type shown in product forms.'
                          }
                          value={controllerField.value}
                          onChange={(event) => controllerField.onChange(event.target.value)}
                          disabled={isSystemAttr}
                          options={DATA_TYPE_OPTIONS.map((option) => ({
                            value: option.value,
                            label: option.label,
                          }))}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <Controller
                      name={`attributes.${index}.groupName`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <MUIInput
                          fieldLabel="Group"
                          tooltip="Group name used to cluster fields (e.g., Electrical)."
                          placeholder="e.g. general"
                          {...controllerField}
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Controller
                      name={`attributes.${index}.defaultValue`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <MUIInput
                          fieldLabel="Default Value"
                          tooltip="Optional default value used when creating products."
                          placeholder="e.g. 540"
                          {...controllerField}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <Controller
                      name={`attributes.${index}.sortOrder`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <MUIInput
                          fieldLabel="Sort Order"
                          tooltip="Lower numbers appear first in the form."
                          type="number"
                          min={1}
                          step="1"
                          placeholder="e.g. 1"
                          {...controllerField}
                          onChange={(event) =>
                            controllerField.onChange(
                              event.target.value === '' ? 1 : Number(event.target.value),
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
                    <div>
                      <Controller
                        name={`attributes.${index}.validationMin`}
                        control={control}
                        render={({ field: controllerField }) => (
                          <MUIInput
                            fieldLabel="Min Value"
                            tooltip="Minimum allowed value for this field."
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
                    <div>
                      <Controller
                        name={`attributes.${index}.validationMax`}
                        control={control}
                        render={({ field: controllerField }) => (
                          <MUIInput
                            fieldLabel="Max Value"
                            tooltip="Maximum allowed value for this field."
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
                  <div>
                    <Controller
                      name={`attributes.${index}.validationOptions`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <MUIInput
                          fieldLabel="Enum Options"
                          required
                          tooltip="Comma-separated list of allowed values."
                          placeholder="e.g. perc, topcon"
                          {...controllerField}
                        />
                      )}
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center justify-between rounded-lg shadow-e2 p-3 flex-1 min-w-[220px]">
                    <Controller
                      name={`attributes.${index}.isRequired`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <MUISwitch
                          checked={controllerField.value}
                          onCheckedChange={controllerField.onChange}
                          label="Required"
                          description="Must be provided for every product"
                          tooltip="If enabled, this value must be provided for every product."
                          labelPosition="left"
                        />
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg shadow-e2 p-3 flex-1 min-w-[220px]">
                    <Controller
                      name={`attributes.${index}.isFilterable`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <MUISwitch
                          checked={controllerField.value}
                          onCheckedChange={controllerField.onChange}
                          label="Filterable"
                          description="Show this attribute in filters"
                          tooltip="Show this attribute in filters."
                          labelPosition="left"
                        />
                      )}
                    />
                  </div>
                </div>

                {!isSystemAttr && (
                  <div className="flex justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)}>
                      Remove Attribute
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
