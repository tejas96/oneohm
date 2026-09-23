'use client';

import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { normalizeFactInput, validateFactInput, type WorkspaceFact } from '@tejas96/shared/reports';
import { maskAadhaar } from '@tejas96/shared/utils';
import { Info, Lock } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { DiscomFactInput } from './discom-fact-input';
import { TonePill } from '../../primitives';
import type { FactSaveResult } from '../hooks/use-report-fact-saves';

const MUTED_BOX = { '& .MuiInputBase-root': { bgcolor: 'action.hover' } };

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Stored value's own rule error: legacy values that fail it show it, and are never wiped. */
function storedError(fact: WorkspaceFact): string | null {
  return fact.editValue ? validateFactInput(fact, fact.editValue) : null;
}

/**
 * Aadhaar reads masked everywhere except inside the focused input, even with
 * unsaved changes. A stored value that is not 12 digits still shows only its
 * last 4 digits.
 */
function shownValue(fact: WorkspaceFact, value: string): string {
  if (fact.key !== 'consumer_aadhaar_number' || !value) return value;
  const full = maskAadhaar(value, ' ');
  if (full) return full;
  const digits = value.replace(/\D/g, '');
  return digits.length > 4 ? `XXXX ${digits.slice(-4)}` : 'XXXX';
}

/** Never editable here: quote, BOM, company and fixed facts. A cancelled project is read-only without the lock. */
function isLockedFact(fact: WorkspaceFact): boolean {
  return fact.source !== 'manual' && !fact.edit;
}

/** Multi-line facts keep their line breaks: a single-line input would join them on any edit. Read-only ones grow to fit. */
const MULTILINE_ROWS = { minRows: 1, maxRows: 4 } as const;

function inputMode(fact: WorkspaceFact): React.HTMLAttributes<HTMLInputElement>['inputMode'] {
  if (fact.edit?.input === 'digits') return 'numeric';
  if (fact.type === 'number' || fact.type === 'year') return 'decimal';
  if (fact.type === 'phone') return 'tel';
  if (fact.type === 'email') return 'email';
  return undefined;
}

interface FactLabelRowProps {
  inputId: string;
  label: string;
  help: string;
  required: boolean;
  needed: boolean;
  usedBy: string;
}

/** Label · ⓘ · spacer · Required / Needed · used-by. The ⓘ opens on hover, keyboard focus and tap. */
function FactLabelRow({
  inputId,
  label,
  help,
  required,
  needed,
  usedBy,
}: FactLabelRowProps): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, minWidth: 0 }}>
      <Typography
        component="label"
        htmlFor={inputId}
        variant="caption"
        sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}
      >
        {label}
      </Typography>
      <Tooltip title={help} enterTouchDelay={0} leaveTouchDelay={6000} arrow describeChild>
        <IconButton size="small" aria-label={`About ${label}`} sx={{ p: 0.25 }}>
          <Info className="size-3.5" />
        </IconButton>
      </Tooltip>
      <Box sx={{ flex: 1 }} />
      <Box sx={{ display: 'flex', gap: 0.5, minWidth: 0, overflow: 'hidden' }}>
        {required && <TonePill label="Required" tone="warning" className="h-[18px] px-2" />}
        {needed && !required && (
          <TonePill label="Needed" tone="warning" className="h-[18px] px-2" />
        )}
        <TonePill label={usedBy} tone="neutral" className="h-[18px] px-2" />
      </Box>
    </Box>
  );
}

interface FactFieldProps {
  fact: WorkspaceFact;
  help: string;
  usedBy: string;
  required: boolean;
  /** A utility detail the site needs before a utility field being edited can save. */
  needed: boolean;
  /** No `projects.edit`, or reports are being generated. */
  readOnly: boolean;
  /** Rejects with an Error whose message is shown under the field. */
  onSave: (value: string | null) => Promise<FactSaveResult>;
  /** Focused, changed or showing an error. */
  onActivity?: (active: boolean) => void;
  /** A utility value held by the tab, not saved yet: the input shows it. */
  held?: string;
  /** The stored value `held` replaces. */
  heldBase?: string;
  /** A value a batch just saved for this field, until the workspace shows it: the baseline meanwhile. */
  savedValue?: string;
  /** Shown under the field when it has no error of its own (held note, failed batch). */
  note?: string | null;
  /** The field went back to its stored value or holds an invalid value: drop what it held. */
  onDiscard?: () => void;
}

/** One fact: the same box for every fact; locked ones are muted with a lock and never editable. */
export function FactField({
  fact,
  help,
  usedBy,
  required,
  needed,
  readOnly,
  onSave,
  onActivity,
  held,
  heldBase,
  savedValue,
  note,
  onDiscard,
}: FactFieldProps): React.JSX.Element {
  const inputId = useId();
  return (
    <Box sx={{ minWidth: 0, gridColumn: fact.type === 'textarea' ? '1 / -1' : undefined }}>
      <FactLabelRow
        inputId={inputId}
        label={fact.label}
        help={help}
        required={required}
        needed={needed}
        usedBy={usedBy}
      />
      {fact.editable && !readOnly ? (
        <EditableFactInput
          inputId={inputId}
          fact={fact}
          onSave={onSave}
          onActivity={onActivity}
          held={held}
          heldBase={heldBase}
          savedValue={savedValue}
          note={note ?? null}
          onDiscard={onDiscard}
        />
      ) : (
        <ReadOnlyFactInput inputId={inputId} fact={fact} />
      )}
    </Box>
  );
}

function ReadOnlyFactInput({
  inputId,
  fact,
}: {
  inputId: string;
  fact: WorkspaceFact;
}): React.JSX.Element {
  const locked = isLockedFact(fact);
  const error = locked ? null : storedError(fact);
  const multiline = fact.type === 'textarea';
  return (
    <TextField
      id={inputId}
      size="small"
      fullWidth
      value={shownValue(fact, fact.value)}
      placeholder="Not set"
      multiline={multiline}
      minRows={multiline ? 1 : undefined}
      error={!!error}
      helperText={error ?? undefined}
      sx={MUTED_BOX}
      slotProps={{
        input: {
          readOnly: true,
          endAdornment: locked ? (
            <Lock className="size-3.5 shrink-0 text-foreground-tertiary" aria-label="Locked" />
          ) : undefined,
        },
      }}
    />
  );
}

/**
 * Saves on blur and on Enter — only when the draft actually changed. Some
 * stored values are legacy text that fails its own rule (e.g. an
 * `application_date` saved as "12/03/2025"). Blurring an untouched field must
 * never send anything for a value like that: `dirty` tracks a real edit and
 * a save only runs when it is set. A failed save stays dirty with the server's
 * message under the field. Esc puts the stored value back. Multi-line facts
 * (addresses, the lightning arrester text) keep their line breaks: Shift+Enter
 * adds one, Enter alone saves.
 *
 * A date whose stored value fails its rule renders as plain text (showing
 * exactly what is stored, with the rule error) so it can be retyped; it goes
 * back to `type="date"` once the stored value is a valid ISO date.
 */
function EditableFactInput({
  inputId,
  fact,
  onSave,
  onActivity,
  held,
  heldBase,
  savedValue,
  note,
  onDiscard,
}: {
  inputId: string;
  fact: WorkspaceFact;
  onSave: (value: string | null) => Promise<FactSaveResult>;
  onActivity?: (active: boolean) => void;
  held?: string;
  heldBase?: string;
  savedValue?: string;
  note: string | null;
  onDiscard?: () => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState(held ?? savedValue ?? fact.editValue);
  const [dirty, setDirty] = useState(held !== undefined);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    held !== undefined ? null : storedError(fact),
  );
  // What this field last saved, until the workspace catches up: when saves
  // overlap the cache waits for a refetch, and Esc must not flash the old value.
  const [saved, setSaved] = useState<string | null>(null);
  const baseline = saved ?? savedValue ?? fact.editValue;

  // A batch another field completed saved this one too: it is no longer a
  // change, so a blur must not hold or send it again.
  useEffect(() => {
    if (savedValue === undefined || normalizeFactInput(fact, draft) !== savedValue) return;
    setDirty(false);
    setError(null);
  }, [savedValue]);

  // React only when the stored value changes (a save, or another user's save
  // on refetch) — not on mount, so a held value shown on remount stays. A held
  // value based on the new stored value (typed while a batch was saving) is
  // kept; anything else resets to the stored value and drops what it held.
  const lastEditValue = useRef(fact.editValue);
  useEffect(() => {
    if (lastEditValue.current === fact.editValue) return;
    lastEditValue.current = fact.editValue;
    setSaved(null);
    if (held !== undefined && heldBase === fact.editValue) {
      setDraft(held);
      setDirty(true);
      setError(null);
      return;
    }
    setDraft(fact.editValue);
    setDirty(false);
    setError(storedError(fact));
    onDiscard?.();
  }, [fact.editValue]);

  const shownError = error ?? note;
  const active = focused || dirty || !!shownError;
  useEffect(() => {
    onActivity?.(active);
    return () => onActivity?.(false);
  }, [active, onActivity]);

  const commit = (raw: string): void => {
    if (saving) return;
    const value = normalizeFactInput(fact, raw);
    if (value === baseline) {
      setDraft(baseline);
      setDirty(false);
      setError(baseline === fact.editValue ? storedError(fact) : null);
      onDiscard?.();
      return;
    }
    const message = validateFactInput(fact, value);
    setError(message);
    if (message) {
      // An invalid replacement must not leave an older held value to be sent later.
      onDiscard?.();
      return;
    }

    setSaving(true);
    onSave(value === '' ? null : value)
      .then(
        (result) => {
          if (result === 'held') return; // stays dirty; the tab's note says what else to set
          setDirty(false);
          setSaved(value);
        },
        (err: unknown) =>
          setError(
            err instanceof Error && err.message ? err.message : 'Could not save. Try again.',
          ),
      )
      .finally(() => setSaving(false));
  };

  const restore = (): void => {
    setDraft(baseline);
    setDirty(false);
    setError(baseline === fact.editValue ? storedError(fact) : null);
    onDiscard?.();
  };

  // A held value can always be undone, including in a select, where Esc only
  // closes the menu. Same path as Esc: back to the stored value, held entry dropped.
  const helper =
    held !== undefined ? (
      <>
        {shownError}{' '}
        <Link
          component="button"
          type="button"
          variant="caption"
          disabled={saving}
          // Keep focus in the input: a blur here would re-commit the held value first.
          onMouseDown={(e) => e.preventDefault()}
          onClick={restore}
          aria-label={`Undo the change to ${fact.label}`}
          sx={{ verticalAlign: 'baseline' }}
        >
          Undo
        </Link>
      </>
    ) : (
      (shownError ?? undefined)
    );

  const pick = (value: string): void => {
    setDraft(value);
    setDirty(true);
    commit(value);
  };
  const focusTracking = {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };

  if (fact.edit?.input === 'discom') {
    return (
      <Box {...focusTracking}>
        <DiscomFactInput
          inputId={inputId}
          value={draft}
          error={shownError}
          helper={helper}
          saving={saving}
          onPick={pick}
        />
      </Box>
    );
  }

  if (fact.edit?.input === 'select') {
    return (
      <TextField
        {...focusTracking}
        id={inputId}
        select
        size="small"
        fullWidth
        value={draft}
        error={!!shownError}
        helperText={helper}
        onChange={(e) => pick(e.target.value)}
        slotProps={{
          select: { readOnly: saving, displayEmpty: true },
          input: {
            endAdornment: saving ? <CircularProgress size={14} sx={{ mr: 3 }} /> : undefined,
          },
        }}
      >
        {!draft && (
          <MenuItem value="" disabled>
            Not set
          </MenuItem>
        )}
        {Object.entries(fact.edit.options ?? {}).map(([value, label]) => (
          <MenuItem key={value} value={value}>
            {label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  const storedIsInvalidDate = fact.type === 'date' && storedError(fact) !== null;
  const type = fact.type === 'date' && !storedIsInvalidDate ? 'date' : 'text';
  const multiline = fact.type === 'textarea';
  const shown = focused ? draft : shownValue(fact, draft);

  return (
    <TextField
      id={inputId}
      size="small"
      fullWidth
      type={multiline ? undefined : type}
      multiline={multiline}
      {...(multiline ? MULTILINE_ROWS : {})}
      placeholder={fact.placeholder}
      value={shown}
      error={!!shownError}
      helperText={helper}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        setDraft(e.target.value);
        setDirty(true);
      }}
      onBlur={() => {
        setFocused(false);
        if (dirty) commit(draft);
      }}
      onKeyDown={(e) => {
        // Shift+Enter is a line break in a multi-line fact; Enter alone saves.
        if (e.key === 'Enter' && !(multiline && e.shiftKey)) {
          e.preventDefault();
          if (dirty) commit(draft);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          restore();
        }
      }}
      slotProps={{
        htmlInput: { inputMode: inputMode(fact) },
        input: {
          readOnly: saving,
          endAdornment: saving ? (
            <CircularProgress size={14} aria-label="Saving" />
          ) : fact.type === 'date' ? (
            <Button
              size="small"
              onClick={() => {
                const today = todayIso();
                setDraft(today);
                setDirty(true);
                commit(today);
              }}
            >
              Today
            </Button>
          ) : undefined,
        },
      }}
    />
  );
}
