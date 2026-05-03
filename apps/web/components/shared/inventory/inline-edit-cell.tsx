'use client';

import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { CircularProgress, IconButton } from '@mui/material';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Inline-edit cell for table rows and detail-page key/value pairs.
 * Click the row to switch to edit mode, type a new value, hit Enter
 * (or the green check) to save, Escape (or the red X) to cancel.
 *
 * Optimistic UX without optimistic data: the cell shows a spinner
 * while saving, the consumer's onSave returns a Promise — if it
 * rejects we keep the cell in edit mode so the user can retry. The
 * caller is responsible for surfacing the error via a toast or
 * inline error.
 *
 * Why we don't ship a fully optimistic mutation hook here: the FDAL
 * layer already supports optimistic updates for individual list/detail
 * caches via TanStack Query's `useMutation({ onMutate })`. The cell
 * doesn't need to know about that — it just calls the consumer's
 * save function and reflects loading/error.
 *
 * Variants:
 *   * `text` (default) — single-line input
 *   * `multiline` — textarea, save on Cmd/Ctrl+Enter
 *   * `date` — `<input type="date">` accepting YYYY-MM-DD
 *   * `number` — `<input type="number">` with optional min/max/step
 *
 * v1 keeps it simple: no select / combobox variants. Those go in their
 * own component if the rebuild needs them.
 */

export type InlineEditVariant = 'text' | 'multiline' | 'date' | 'number';

export interface InlineEditCellProps {
  value: string;
  /** Display fallback when value is empty. */
  placeholder?: string;
  variant?: InlineEditVariant;
  /** Disable editing (e.g. caller doesn't have permission). */
  disabled?: boolean;
  /** Min/max for `number` variant. */
  min?: number;
  max?: number;
  step?: number;
  /** Caller's save handler. Resolve to commit, reject to keep edit mode open. */
  onSave: (next: string) => Promise<void> | void;
  /** Optional aria-label. */
  ariaLabel?: string;
  className?: string;
}

export function InlineEditCell({
  value,
  placeholder = '—',
  variant = 'text',
  disabled,
  min,
  max,
  step,
  onSave,
  ariaLabel,
  className,
}: InlineEditCellProps): React.JSX.Element {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  const startEdit = (): void => {
    if (disabled || isSaving) return;
    setDraft(value);
    setIsEditing(true);
  };

  const cancelEdit = (): void => {
    setDraft(value);
    setIsEditing(false);
  };

  const commitEdit = async (): Promise<void> => {
    if (draft === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsEditing(false);
    } catch {
      // Keep editing mode so the user can retry. Caller surfaces toast.
    } finally {
      setIsSaving(false);
    }
  };

  const handleKey = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    } else if (event.key === 'Enter') {
      if (variant === 'multiline' && !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      void commitEdit();
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        disabled={disabled}
        aria-label={ariaLabel ?? 'Edit value'}
        className={cn(
          'group flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm',
          !disabled && 'hover:bg-muted',
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
      >
        <span className={cn('truncate', !value && 'text-foreground-tertiary')}>
          {value || placeholder}
        </span>
        {!disabled && (
          <EditOutlinedIcon
            sx={{ fontSize: 14 }}
            className="ml-auto shrink-0 text-foreground-tertiary opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </button>
    );
  }

  const sharedInputClasses =
    'block w-full rounded-md border border-border-medium bg-surface px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className={cn('flex items-start gap-1', className)}>
      {variant === 'multiline' ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          disabled={isSaving}
          rows={3}
          className={cn(sharedInputClasses, 'resize-y')}
          aria-label={ariaLabel}
        />
      ) : (
        <input
          autoFocus
          type={variant === 'date' ? 'date' : variant === 'number' ? 'number' : 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          disabled={isSaving}
          min={min}
          max={max}
          step={step}
          className={sharedInputClasses}
          aria-label={ariaLabel}
        />
      )}
      <IconButton
        size="small"
        onClick={() => {
          void commitEdit();
        }}
        disabled={isSaving}
        aria-label="Save"
        sx={{ color: 'success.main', p: 0.5 }}
      >
        {isSaving ? <CircularProgress size={14} /> : <CheckRoundedIcon sx={{ fontSize: 16 }} />}
      </IconButton>
      <IconButton
        size="small"
        onClick={cancelEdit}
        disabled={isSaving}
        aria-label="Cancel"
        sx={{ color: 'error.main', p: 0.5 }}
      >
        <CloseRoundedIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </div>
  );
}

InlineEditCell.displayName = 'InlineEditCell';
