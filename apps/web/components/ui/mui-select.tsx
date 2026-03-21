'use client';

import {
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
  type FormControlProps,
  type SelectProps,
} from '@mui/material';
import * as React from 'react';

import { MUIFieldLabel, mergeRefs } from './mui-shared';

export type MUISelectOption = {
  value: string | number;
  label: React.ReactNode;
  disabled?: boolean;
};

export type MUISelectProps = Omit<SelectProps, 'error'> & {
  helperText?: React.ReactNode;
  error?: boolean | string;
  success?: boolean | string;
  options?: MUISelectOption[];
  formControlProps?: FormControlProps;
  /** Label rendered above the select */
  fieldLabel?: React.ReactNode;
  /** Marks the label with a red asterisk */
  required?: boolean;
  /** Info tooltip shown next to the label */
  tooltip?: React.ReactNode;
  /** Placeholder shown when no value is selected */
  placeholder?: string;
};

const MUISelectInner = (
  {
    helperText,
    error,
    success,
    options,
    formControlProps,
    fieldLabel,
    required,
    tooltip,
    placeholder,
    children,
    id,
    variant,
    color,
    fullWidth,
    inputRef,
    renderValue,
    displayEmpty,
    ...selectProps
  }: MUISelectProps,
  ref: React.ForwardedRef<HTMLInputElement>,
): React.JSX.Element => {
  const generatedId = React.useId().replace(/:/g, '');
  const hasError = Boolean(error);
  const hasSuccess = Boolean(success) && !hasError;
  const errorMsg = typeof error === 'string' ? error : undefined;
  const successMsg = typeof success === 'string' ? success : undefined;
  const resolvedHelper = errorMsg ?? successMsg ?? helperText;
  const resolvedColor: SelectProps['color'] = color ?? (hasError ? 'error' : success ? 'success' : 'primary');
  const resolvedId = id ?? `mui-select-${generatedId}`;
  const mergedRef = mergeRefs<HTMLInputElement>(inputRef, ref);

  const resolvedChildren =
    options && options.length > 0 && !children
      ? options.map((o) => (
          <MenuItem key={o.value} value={o.value} disabled={o.disabled}>{o.label}</MenuItem>
        ))
      : children;

  const resolvedRenderValue = renderValue ?? (placeholder
    ? (selected: unknown) => {
        if (selected === '' || selected === undefined || selected === null) {
          return <span style={{ color: '#a1a1aa' }}>{placeholder}</span>;
        }
        const opt = options?.find((o) => o.value === selected);
        return opt ? opt.label : (selected as React.ReactNode);
      }
    : undefined);

  return (
    <div>
      <MUIFieldLabel fieldLabel={fieldLabel} required={required} tooltip={tooltip} htmlFor={resolvedId} />
      <FormControl
        {...formControlProps}
        variant={variant ?? formControlProps?.variant}
        fullWidth={fullWidth ?? formControlProps?.fullWidth ?? true}
        error={hasError}
        color={resolvedColor}
        size={formControlProps?.size}
      >
        <Select
          {...selectProps}
          id={resolvedId}
          variant={variant}
          color={resolvedColor}
          inputRef={mergedRef}
          displayEmpty={displayEmpty ?? Boolean(placeholder)}
          renderValue={resolvedRenderValue}
          MenuProps={selectProps.MenuProps}
        >
          {resolvedChildren}
        </Select>
        {resolvedHelper && (
          <FormHelperText sx={hasSuccess ? { color: 'success.main' } : undefined}>
            {resolvedHelper}
          </FormHelperText>
        )}
      </FormControl>
    </div>
  );
};

export const MUISelect = React.forwardRef<HTMLInputElement, MUISelectProps>(MUISelectInner);
MUISelect.displayName = 'MUISelect';
