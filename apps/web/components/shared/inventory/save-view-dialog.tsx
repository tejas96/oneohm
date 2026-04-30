'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';

/**
 * Save-as / Rename dialog used by the `SavedViewsBar`.
 *
 * Single component handles both modes via the `mode` prop:
 *   - "create": empty initial name, save => `useSavedViewMutations.create({ resource, name, filters })`
 *   - "rename": initial name pre-filled, save => `useSavedViewMutations.update({ id, data: { name } })`
 *
 * Validation policy:
 *   - Trim before submit.
 *   - 1..100 char range (matches backend DTO).
 *   - Empty / whitespace-only name disables the Save button (no toast spam).
 *
 * 409 / 400 handling: the parent's `onSubmit` returns a Promise. If it
 * rejects we keep the dialog open so the user can correct the name (the
 * mutation hook already toasts the server-side reason via
 * `normalizeApiError`). On resolve we close.
 *
 * Why a controlled dialog vs the existing `useModalForm` companion:
 * the form has a single text field — the modal-form helper would add
 * 4x the boilerplate without the schema validation it's designed for.
 */

const MIN_LENGTH = 1;
const MAX_LENGTH = 100;

export type SaveViewDialogMode = 'create' | 'rename';

export interface SaveViewDialogProps {
  open: boolean;
  mode: SaveViewDialogMode;
  /** Pre-filled name; required for rename, optional for create. */
  initialName?: string;
  onClose: () => void;
  /**
   * Handle the submit. Resolve to close the dialog; reject (or throw)
   * to keep it open. The parent already shows a toast via the FDAL
   * mutation's onError, so don't re-toast inside `onSubmit`.
   */
  onSubmit: (name: string) => Promise<void>;
}

export function SaveViewDialog({
  open,
  mode,
  initialName,
  onClose,
  onSubmit,
}: SaveViewDialogProps): React.JSX.Element {
  const [name, setName] = useState(initialName ?? '');
  const [submitting, setSubmitting] = useState(false);

  // Reset name whenever the dialog re-opens or the underlying view
  // changes — avoids stale state when the same dialog instance is
  // reused for different views.
  useEffect(() => {
    if (open) {
      setName(initialName ?? '');
      setSubmitting(false);
    }
  }, [open, initialName]);

  const trimmed = name.trim();
  const isValid = trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH;

  const handleSubmit = async (): Promise<void> => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch {
      // Parent FDAL hook surfaces the server message via toast; keep
      // the dialog open so the user can adjust the name (likely
      // duplicate). Intentionally swallow here.
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const title = mode === 'rename' ? 'Rename saved view' : 'Save current filters as a view';
  const helper =
    mode === 'rename'
      ? 'Change the name shown on the view chip and in the Manage views menu.'
      : 'Capture the current filters under a name. Only you will see it.';

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="save-view-dialog-title"
    >
      <DialogTitle id="save-view-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2, fontSize: 13 }}>{helper}</DialogContentText>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="View name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          inputProps={{ maxLength: MAX_LENGTH }}
          helperText={`${trimmed.length}/${MAX_LENGTH}`}
          disabled={submitting}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={!isValid || submitting}
        >
          {submitting ? 'Saving…' : mode === 'rename' ? 'Rename' : 'Save view'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
