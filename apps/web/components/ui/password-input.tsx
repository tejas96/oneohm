'use client';

import { Eye, EyeOff, Lock } from 'lucide-react';
import * as React from 'react';

import { Input, type InputProps } from './input';

import { cn } from '@/lib/utils';

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  /** Show password strength meter */
  showStrength?: boolean;
  /** Custom strength labels */
  strengthLabels?: {
    weak: string;
    fair: string;
    good: string;
    strong: string;
  };
}

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

const DEFAULT_STRENGTH_LABELS = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

const STRENGTH_CONFIG: Record<StrengthLevel, { color: string; width: string }> = {
  weak: { color: 'bg-error', width: 'w-1/4' },
  fair: { color: 'bg-warning', width: 'w-2/4' },
  good: { color: 'bg-info', width: 'w-3/4' },
  strong: { color: 'bg-success', width: 'w-full' },
};

function calculateStrength(password: string): StrengthLevel {
  if (!password) return 'weak';

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return 'weak';
  if (score <= 2) return 'fair';
  if (score <= 3) return 'good';
  return 'strong';
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      showStrength,
      strengthLabels = DEFAULT_STRENGTH_LABELS,
      leftIcon,
      value,
      containerClassName,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const strength = showStrength ? calculateStrength(String(value || '')) : null;
    const strengthConfig = strength ? STRENGTH_CONFIG[strength] : null;

    const inputElement = (
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        value={value}
        leftIcon={leftIcon || <Lock />}
        rightIcon={showPassword ? <EyeOff /> : <Eye />}
        onRightIconClick={() => setShowPassword(!showPassword)}
        containerClassName={containerClassName}
        {...props}
      />
    );

    // If no strength meter, return Input directly (no extra wrapper)
    if (!showStrength) {
      return inputElement;
    }

    // With strength meter, wrap in container
    return (
      <div className="flex flex-col">
        {inputElement}
        {value && strengthConfig && (
          <div className="mt-2">
            <div className="h-1 w-full bg-border rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  strengthConfig.color,
                  strengthConfig.width,
                )}
              />
            </div>
            <p className="text-xs text-foreground-tertiary mt-1">{strengthLabels[strength!]}</p>
          </div>
        )}
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
