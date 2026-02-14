'use client';

import { Phone } from 'lucide-react';
import * as React from 'react';

import { Input, type InputProps } from './input';

export interface PhoneInputProps extends Omit<InputProps, 'type' | 'prefix' | 'value' | 'onChange'> {
  /** Phone number value (10-digit number only) */
  value?: string;
  /** Callback when phone number changes (returns cleaned digits only) */
  onChange?: (value: string) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, leftIcon, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      // Remove all non-digit characters
      const digitsOnly = rawValue.replace(/\D/g, '');
      // Limit to 10 digits
      const limitedValue = digitsOnly.slice(0, 10);
      onChange?.(limitedValue);
    };

    // If leftIcon provided, use it instead of prefix
    // Otherwise use +91 prefix (default)
    const usePrefix = !leftIcon;

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        prefix={usePrefix ? '+91' : undefined}
        leftIcon={leftIcon || (usePrefix ? undefined : <Phone />)}
        value={value}
        onChange={handleChange}
        maxLength={10}
        placeholder="9876543210"
        {...props}
      />
    );
  },
);
PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
