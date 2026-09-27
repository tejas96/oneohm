'use client';

import {
  Box,
  Button,
  IconButton,
  Link,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { validateFactInput, type WorkspaceFact } from '@tejas96/shared/reports';
import { maskAadhaar } from '@tejas96/shared/utils';
import { Info, Lock } from 'lucide-react';
import { useId, useState } from 'react';

import { DiscomFactInput } from './discom-fact-input';
import { TonePill } from '../../primitives';

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
export function shownValue(fact: WorkspaceFact, value: string): string {
  if (fact.key !== 'consumer_aadhaar_number' || !value) return value;
  const full = maskAadhaar(value, ' ');
  if (full) return full;
  const digits = value.replace(/\D/g, '');
  return digits.length > 4 ? `XXXX ${digits.slice(-4)}` : 'XXXX';
}

/** Never editable here: BOM, company and fixed facts. A cancelled project is read-only without the lock. */
export function isLockedFact(fact: WorkspaceFact): boolean {
  return fact.source !== 'manual' && !fact.edit && fact.quoteValue === undefined;
}

/**
 * A value typed here replaces one that came from the quote. A fact whose
 * source had nothing (serial numbers before any are recorded) is just typed:
 * no "Changed from quote" and no Reset.
 */
export function isChangedFromSource(fact: WorkspaceFact): boolean {
  return !!fact.overridden && !!fact.quoteValue;
}

/** Where a changeable value came from: the quote, or the BOM (panel serial numbers). */
export function sourceWord(fact: WorkspaceFact): string {
  return fact.source === 'bom' ? 'BOM' : 'quote';
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
  /** Changed and not saved yet. */
  unsaved: boolean;
  /** A quote or BOM fact printing a value typed here: which one it was changed from. */
  changedFrom: string | null;
}

/** Label · ⓘ · spacer · Required / Needed · quiet used-by text. The ⓘ opens on hover, keyboard focus and tap. */
function FactLabelRow({
  inputId,
  label,
  help,
  required,
  needed,
  usedBy,
  unsaved,
  changedFrom,
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
        {unsaved && <TonePill label="Unsaved" tone="info" dot className="h-[18px] px-2" />}
        {changedFrom && (
          <TonePill label={`Changed from ${changedFrom}`} tone="info" className="h-[18px] px-2" />
        )}
        {required && <TonePill label="Required" tone="warning" className="h-[18px] px-2" />}
        {needed && !required && (
          <TonePill label="Needed" tone="warning" className="h-[18px] px-2" />
        )}
        <Typography
          variant="caption"
          noWrap
          sx={{ color: 'text.disabled', fontSize: 11, alignSelf: 'center' }}
        >
          {usedBy}
        </Typography>
      </Box>
    </Box>
  );
}

interface FactFieldProps {
  fact: WorkspaceFact;
  help: string;
  usedBy: string;
  required: boolean;
  /** A utility detail the site needs before a changed utility field can save. */
  needed: boolean;
  /** No `projects.edit`, or reports are being generated. */
  readOnly: boolean;
  /** Save is running: the input keeps its draft but cannot change. */
  busy: boolean;
  /** The value typed and not saved yet; undefined shows the stored value. */
  draft?: string;
  /** The draft would change what is stored. */
  changed: boolean;
  /** Its rule, a failed save, or the utility details still to set. */
  error: string | null;
  /** Show the error even while the field is focused: Save was pressed. */
  forceError: boolean;
  /** Quiet line under the input when there is no error (e.g. how many panels have a serial). */
  hint?: string | null;
  onChange: (raw: string) => void;
  /** Back to the stored value. */
  onUndo: () => void;
}

/** One fact: the same box for every fact; locked ones are muted with a lock and never editable. */
export function FactField({
  fact,
  help,
  usedBy,
  required,
  needed,
  readOnly,
  busy,
  draft,
  changed,
  error,
  forceError,
  hint,
  onChange,
  onUndo,
}: FactFieldProps): React.JSX.Element {
  const inputId = useId();
  return (
    <Box
      data-fact-key={fact.key}
      sx={{ minWidth: 0, gridColumn: fact.type === 'textarea' ? '1 / -1' : undefined }}
    >
      <FactLabelRow
        inputId={inputId}
        label={fact.label}
        help={help}
        required={required}
        needed={needed}
        usedBy={usedBy}
        unsaved={changed}
        changedFrom={!changed && isChangedFromSource(fact) ? sourceWord(fact) : null}
      />
      {fact.editable && !readOnly ? (
        <EditableFactInput
          inputId={inputId}
          fact={fact}
          draft={draft}
          changed={changed}
          error={error}
          forceError={forceError}
          hint={hint ?? null}
          readOnly={busy}
          onChange={onChange}
          onUndo={onUndo}
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
 * Typing changes the draft only: nothing is sent until the tab's Save. Esc and
 * Undo put the stored value back. A rule error shows once the field loses
 * focus, or at once after Save was pressed. Multi-line facts keep their line
 * breaks.
 *
 * A quote fact changed here shows Reset, which brings the quote value back
 * (on Save). Emptied, it shows the quote value as its placeholder.
 *
 * A date whose stored value fails its rule renders as plain text (showing
 * exactly what is stored, with the rule error) so it can be retyped; it goes
 * back to `type="date"` once the stored value is a valid ISO date.
 */
function EditableFactInput({
  inputId,
  fact,
  draft,
  changed,
  error,
  forceError,
  hint,
  readOnly,
  onChange,
  onUndo,
}: {
  inputId: string;
  fact: WorkspaceFact;
  draft?: string;
  changed: boolean;
  error: string | null;
  forceError: boolean;
  hint: string | null;
  readOnly: boolean;
  onChange: (raw: string) => void;
  onUndo: () => void;
}): React.JSX.Element {
  const [focused, setFocused] = useState(false);
  const value = draft ?? fact.editValue;
  const shownError =
    draft === undefined ? storedError(fact) : focused && !forceError && changed ? null : error;
  const resetting =
    isChangedFromSource(fact) && changed && (!value.trim() || value.trim() === fact.quoteValue);

  const helperLink = (label: string, onClick: () => void, aria: string): React.ReactNode => (
    <Link
      component="button"
      type="button"
      variant="caption"
      disabled={readOnly}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={aria}
      sx={{ verticalAlign: 'baseline' }}
    >
      {label}
    </Link>
  );
  const helper =
    shownError || changed || isChangedFromSource(fact) || hint ? (
      <>
        {shownError ??
          (resetting ? `Goes back to the ${sourceWord(fact)} value when saved.` : hint)}{' '}
        {changed
          ? helperLink('Undo', onUndo, `Undo the change to ${fact.label}`)
          : isChangedFromSource(fact)
            ? helperLink(
                `Reset to ${sourceWord(fact)}`,
                () => onChange(fact.quoteValue ?? ''),
                `Reset ${fact.label} to the ${sourceWord(fact)} value`,
              )
            : null}
      </>
    ) : undefined;

  const focusTracking = {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };

  if (fact.edit?.input === 'discom') {
    return (
      <Box {...focusTracking}>
        <DiscomFactInput
          inputId={inputId}
          value={value}
          error={shownError}
          helper={helper}
          saving={readOnly}
          onPick={onChange}
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
        value={value}
        error={!!shownError}
        helperText={helper}
        onChange={(e) => onChange(e.target.value)}
        slotProps={{ select: { readOnly, displayEmpty: true } }}
      >
        {!value && (
          <MenuItem value="" disabled>
            Not set
          </MenuItem>
        )}
        {Object.entries(fact.edit.options ?? {}).map(([option, label]) => (
          <MenuItem key={option} value={option}>
            {label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  const storedIsInvalidDate = fact.type === 'date' && storedError(fact) !== null;
  const type = fact.type === 'date' && !storedIsInvalidDate ? 'date' : 'text';
  const multiline = fact.type === 'textarea';
  const shown = focused ? value : shownValue(fact, value);

  return (
    <TextField
      id={inputId}
      size="small"
      fullWidth
      type={multiline ? undefined : type}
      multiline={multiline}
      {...(multiline ? MULTILINE_ROWS : {})}
      placeholder={fact.quoteValue ? fact.quoteValue : fact.placeholder}
      value={shown}
      error={!!shownError}
      helperText={helper}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onUndo();
        }
      }}
      slotProps={{
        htmlInput: { inputMode: inputMode(fact) },
        input: {
          readOnly,
          endAdornment:
            fact.type === 'date' && !readOnly ? (
              <Button size="small" onClick={() => onChange(todayIso())}>
                Today
              </Button>
            ) : undefined,
        },
      }}
    />
  );
}
