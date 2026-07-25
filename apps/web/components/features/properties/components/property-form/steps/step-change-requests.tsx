'use client';

import { Checkbox, FormControlLabel, FormHelperText, MenuItem, TextField } from '@mui/material';
import { ChangeRequestType, type StoredChangeRequest } from '@tejas96/shared/types';
import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import {
  CHANGE_REQUEST_OPTIONS,
  formatChangeRequestSummary,
  type ChangeRequestFormItem,
} from '../../../utils/change-request-display';

import { ConnectionTypeSelector } from '@/components/shared/forms';
import { MUIInput, MUITypography } from '@/components/ui';
import { PROPERTY_TYPE_OPTIONS } from '@/lib/config/constants';

export function StepChangeRequests({
  convertedChangeRequests = [],
}: {
  convertedChangeRequests?: StoredChangeRequest[];
}): React.JSX.Element {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const changeRequests = (watch('changeRequests') as ChangeRequestFormItem[] | undefined) ?? [];
  const selectedTypes = changeRequests.map((item) => item.type);
  const convertedTypes = React.useMemo(
    () => new Set(convertedChangeRequests.map((item) => item.type)),
    [convertedChangeRequests],
  );
  const arrayError = errors.changeRequests?.message as string | undefined;

  const setRequests = React.useCallback(
    (next: ChangeRequestFormItem[]) => {
      setValue('changeRequests', next, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const toggleType = (type: ChangeRequestType, checked: boolean) => {
    if (convertedTypes.has(type)) return;
    if (checked) {
      if (selectedTypes.includes(type)) return;
      setRequests([...changeRequests, { type }]);
      return;
    }
    setRequests(changeRequests.filter((item) => item.type !== type));
  };

  const updateItem = (type: ChangeRequestType, patch: Partial<ChangeRequestFormItem>) => {
    setRequests(
      changeRequests.map((item) => (item.type === type ? { ...item, ...patch, type } : item)),
    );
  };

  const getItem = (type: ChangeRequestType): ChangeRequestFormItem =>
    changeRequests.find((item) => item.type === type) ?? { type };

  return (
    <div className="space-y-6">
      <div>
        <MUITypography variant="sectionTitle">Change of Request</MUITypography>
        <MUITypography variant="body" className="mt-1 text-foreground-secondary">
          Select any customer change requests. These will create high-priority special tasks when
          the project is created.
        </MUITypography>
      </div>

      <div className="space-y-3">
        {CHANGE_REQUEST_OPTIONS.map(({ type, label }) => {
          const item = getItem(type);
          const isConverted = convertedTypes.has(type);
          const isSelected = selectedTypes.includes(type) || isConverted;
          const convertedItem = convertedChangeRequests.find((cr) => cr.type === type);

          return (
            <div
              key={type}
              className={`rounded-lg border p-4 ${isConverted ? 'border-warning/40 bg-warning/5' : 'border-border'}`}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isSelected}
                    disabled={isConverted}
                    onChange={(event) => toggleType(type, event.target.checked)}
                  />
                }
                label={label}
              />
              {isConverted && convertedItem ? (
                <FormHelperText className="ml-8">
                  Converted to project task — {formatChangeRequestSummary(convertedItem)}
                </FormHelperText>
              ) : null}

              {isSelected && !isConverted && (
                <div className="mt-3 space-y-4 border-t border-border pt-4">
                  {type === ChangeRequestType.CONSUMER_NAME_CHANGE && (
                    <MUIInput
                      fieldLabel="New consumer name"
                      required
                      value={item.newName ?? ''}
                      onChange={(event) => updateItem(type, { newName: event.target.value })}
                    />
                  )}

                  {type === ChangeRequestType.NAME_SPELLING_CORRECTION && (
                    <MUIInput
                      fieldLabel="Corrected consumer name"
                      required
                      value={item.correctedName ?? ''}
                      onChange={(event) => updateItem(type, { correctedName: event.target.value })}
                    />
                  )}

                  {type === ChangeRequestType.PROPERTY_TYPE_CHANGE && (
                    <Controller
                      name="changeRequests"
                      control={control}
                      render={() => (
                        <TextField
                          select
                          fullWidth
                          required
                          label="New property type"
                          value={item.newPropertyType ?? ''}
                          onChange={(event) =>
                            updateItem(type, { newPropertyType: event.target.value })
                          }
                        >
                          {PROPERTY_TYPE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  )}

                  {type === ChangeRequestType.LOAD_CHANGE && (
                    <div className="space-y-4">
                      <div>
                        <MUITypography variant="body" className="mb-2 font-medium">
                          New connection phase
                        </MUITypography>
                        <ConnectionTypeSelector
                          value={item.phase}
                          onChange={(value) => updateItem(type, { phase: value })}
                        />
                      </div>
                      <MUIInput
                        fieldLabel="New sanctioned load (kW)"
                        type="number"
                        inputProps={{ min: 0, step: 0.1 }}
                        value={item.newSanctionedLoad ?? ''}
                        onChange={(event) =>
                          updateItem(type, {
                            newSanctionedLoad:
                              event.target.value === '' ? undefined : Number(event.target.value),
                          })
                        }
                      />
                    </div>
                  )}

                  {type === ChangeRequestType.NEW_EV_METER && (
                    <MUIInput
                      fieldLabel="Note (optional)"
                      multiline
                      minRows={2}
                      value={item.note ?? ''}
                      onChange={(event) => updateItem(type, { note: event.target.value })}
                    />
                  )}

                  {type === ChangeRequestType.NEW_CONNECTION && (
                    <div className="space-y-4">
                      <div>
                        <MUITypography variant="body" className="mb-2 font-medium">
                          Connection phase
                        </MUITypography>
                        <ConnectionTypeSelector
                          value={item.phase}
                          onChange={(value) => updateItem(type, { phase: value })}
                        />
                      </div>
                      <MUIInput
                        fieldLabel="Note (optional)"
                        multiline
                        minRows={2}
                        value={item.note ?? ''}
                        onChange={(event) => updateItem(type, { note: event.target.value })}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {arrayError ? <FormHelperText error>{arrayError}</FormHelperText> : null}
    </div>
  );
}
