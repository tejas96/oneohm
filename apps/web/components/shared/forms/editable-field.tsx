'use client';

import { Check, X, Pencil } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface EditableFieldProps {
  /** Current value */
  value: string;
  /** Called when value is saved */
  onSave: (value: string) => void;
  /** Field type */
  type?: 'text' | 'email' | 'phone' | 'textarea';
  /** Placeholder when empty */
  placeholder?: string;
  /** Label shown above value */
  label?: string;
  /** Show label */
  showLabel?: boolean;
  /** Custom display formatter */
  displayValue?: (value: string) => React.ReactNode;
  /** Validation function */
  validate?: (value: string) => string | null; // Returns error message or null
  /** Loading state during save */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function EditableField({
  value,
  onSave,
  type = 'text',
  placeholder = 'Click to edit',
  label,
  showLabel = false,
  displayValue,
  validate,
  isLoading = false,
  disabled = false,
  className,
}: EditableFieldProps): React.JSX.Element {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync edit value when prop changes
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easier replacement
      if ('select' in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
  };

  const handleSave = () => {
    // Validate if validator provided
    if (validate) {
      const validationError = validate(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    onSave(editValue);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Display mode
  if (!isEditing) {
    const displayContent = displayValue ? displayValue(value) : value;

    return (
      <div className={cn('group', className)}>
        {showLabel && label && (
          <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider mb-1">
            {label}
          </p>
        )}
        <button
          type="button"
          onClick={handleStartEdit}
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-2 text-left rounded-md px-2 py-1 -mx-2 -my-1',
            'transition-colors duration-fast',
            !disabled && 'hover:bg-muted cursor-pointer',
            disabled && 'cursor-default'
          )}
        >
          <span className={cn('text-sm', !value && 'text-foreground-tertiary italic')}>
            {displayContent || placeholder}
          </span>
          {!disabled && (
            <Pencil className="size-icon-sm text-foreground-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      </div>
    );
  }

  // Edit mode
  const InputComponent = type === 'textarea' ? Textarea : Input;

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && label && (
        <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
          {label}
        </p>
      )}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <InputComponent
            ref={inputRef as React.Ref<HTMLInputElement & HTMLTextAreaElement>}
            type={type === 'email' ? 'email' : type === 'phone' ? 'tel' : 'text'}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              'h-input-md',
              error && 'border-error focus:border-error focus:ring-error/15'
            )}
          />
          {error && (
            <p className="text-xs text-error mt-1">{error}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
            className="size-8 p-0"
          >
            <Check className="size-icon-sm text-success" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
            className="size-8 p-0"
          >
            <X className="size-icon-sm text-foreground-tertiary" />
          </Button>
        </div>
      </div>
    </div>
  );
}
