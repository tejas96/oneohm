'use client';

import * as React from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { Input, type InputProps } from './input';

type RenderFn = (props: {
  value: unknown;
  onChange: (...event: unknown[]) => void;
  onBlur: () => void;
  name: string;
  error: boolean;
  errorMessage?: string;
}) => React.ReactNode;

export interface FormFieldInputProps<T extends FieldValues>
  extends Omit<InputProps, 'value' | 'onChange' | 'onBlur' | 'name' | 'error' | 'errorMessage'> {
  /** react-hook-form control */
  control: Control<T>;
  /** Field name from form schema */
  name: FieldPath<T>;
  /** Custom render function for non-Input fields */
  render?: RenderFn;
}

/**
 * FormFieldInput - react-hook-form integrated Input component
 *
 * Uses enhanced Input under the hood with automatic error handling.
 * Errors are automatically extracted from form state.
 *
 * @example
 * // Basic usage
 * <FormFieldInput
 *   control={form.control}
 *   name="email"
 *   label="Email Address"
 *   required
 *   leftIcon={<Mail />}
 *   placeholder="you@company.com"
 * />
 *
 * @example
 * // With custom input
 * <FormFieldInput
 *   control={form.control}
 *   name="password"
 *   render={({ value, onChange, onBlur, error, errorMessage }) => (
 *     <PasswordInput
 *       value={value as string}
 *       onChange={(e) => onChange(e.target.value)}
 *       onBlur={onBlur}
 *       error={error}
 *       errorMessage={errorMessage}
 *       showStrength
 *     />
 *   )}
 * />
 */
function FormFieldInput<T extends FieldValues>({
  control,
  name,
  render,
  ...inputProps
}: FormFieldInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = !!fieldState.error;
        const errorMessage = fieldState.error?.message;

        // Custom render function for custom inputs
        if (render) {
          return (
            <>
              {render({
                value: field.value,
                onChange: field.onChange,
                onBlur: field.onBlur,
                name: field.name,
                error,
                errorMessage,
              })}
            </>
          );
        }

        // Default: render enhanced Input
        return (
          <Input
            {...inputProps}
            {...field}
            error={error}
            errorMessage={errorMessage}
          />
        );
      }}
    />
  );
}
FormFieldInput.displayName = 'FormFieldInput';

export { FormFieldInput };
