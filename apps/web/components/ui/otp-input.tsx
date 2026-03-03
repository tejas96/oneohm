'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface OtpInputProps {
  /** Number of OTP digits */
  length?: number;
  /** Current OTP value */
  value?: string;
  /** Callback when OTP changes */
  onChange?: (value: string) => void;
  /** Callback when all digits are filled */
  onComplete?: (otp: string) => void;
  /** Disable input */
  disabled?: boolean;
  /** Show error styling */
  error?: boolean;
  /** Auto-focus first input on mount */
  autoFocus?: boolean;
  /** Container className */
  className?: string;
}

const OtpInput = React.forwardRef<HTMLDivElement, OtpInputProps>(
  (
    { length = 6, value = '', onChange, onComplete, disabled, error, autoFocus = true, className },
    ref,
  ) => {
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    // Sync refs array with length
    React.useEffect(() => {
      inputRefs.current = inputRefs.current.slice(0, length);
    }, [length]);

    // Auto-focus first input
    React.useEffect(() => {
      if (autoFocus && !disabled) {
        inputRefs.current[0]?.focus();
      }
    }, [autoFocus, disabled]);

    const handleChange = (index: number, inputValue: string) => {
      // Only allow digits
      const digit = inputValue.replace(/\D/g, '').slice(-1);
      if (!digit && inputValue !== '') return;

      const newOtp = value.split('');
      newOtp[index] = digit;
      const newValue = newOtp.join('').slice(0, length);

      onChange?.(newValue);

      // Move to next input if digit was entered
      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Check if complete
      if (newValue.length === length && !newValue.includes('')) {
        onComplete?.(newValue);
      }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const newOtp = value.split('');

        if (newOtp[index]) {
          // Clear current digit
          newOtp[index] = '';
          onChange?.(newOtp.join(''));
        } else if (index > 0) {
          // Move to previous input and clear it
          newOtp[index - 1] = '';
          onChange?.(newOtp.join(''));
          inputRefs.current[index - 1]?.focus();
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        e.preventDefault();
        inputRefs.current[index + 1]?.focus();
      }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);

      if (pastedData) {
        onChange?.(pastedData);

        // Focus the next empty input or the last one
        const nextIndex = Math.min(pastedData.length, length - 1);
        inputRefs.current[nextIndex]?.focus();

        // Check if complete
        if (pastedData.length === length) {
          onComplete?.(pastedData);
        }
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    };

    return (
      <div ref={ref} className={cn('flex gap-2', className)}>
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={handleFocus}
            disabled={disabled}
            className={cn(
              'size-container-lg text-center text-lg font-semibold rounded-lg border-1.5',
              'bg-background text-foreground',
              'transition-all duration-fast outline-none',
              'focus:border-primary focus:ring-focus focus:ring-primary/15',
              'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70',
              error
                ? 'border-error focus:border-error focus:ring-error/15'
                : 'border-border-medium hover:border-border',
            )}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
    );
  },
);
OtpInput.displayName = 'OtpInput';

export { OtpInput };
