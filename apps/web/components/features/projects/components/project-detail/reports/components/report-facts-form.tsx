'use client';

import { Box, Button, Link as MuiLink, TextField, Typography } from '@mui/material';
import {
  FACT_GROUPS,
  validateFactValue,
  type ReportWorkspace,
  type WorkspaceFact,
} from '@tejas96/shared/reports';
import NextLink from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { factEditHref } from '../utils/fact-edit-href';

import { useUpdateReportFacts } from '@/components/features/projects/hooks/use-project-reports';

interface ReportFactsFormProps {
  workspace: ReportWorkspace;
  /** null = every report. */
  reportId: string | null;
  disabled?: boolean;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function ReportFactsForm({ workspace, reportId, disabled }: ReportFactsFormProps) {
  const update = useUpdateReportFacts(workspace.projectId);

  const reportNames = useMemo(
    () => new Map(workspace.reports.map((r) => [r.id, r.name.split(' ')[0]])),
    [workspace.reports],
  );
  const missingKeys = useMemo(
    () =>
      new Set(
        workspace.reports
          .filter((r) => !reportId || r.id === reportId)
          .flatMap((r) => r.missing.map((m) => m.key as string)),
      ),
    [workspace.reports, reportId],
  );
  const visible = workspace.facts.filter((f) => !reportId || f.usedBy.includes(reportId));

  const usedByText = (fact: WorkspaceFact) =>
    fact.usedBy.length === workspace.reports.length
      ? 'All reports'
      : fact.usedBy.map((id) => reportNames.get(id) ?? id).join(', ');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {FACT_GROUPS.map((group) => {
        const facts = visible.filter((f) => f.group === group.id);
        if (facts.length === 0) return null;
        const manual = facts.filter((f) => f.source === 'manual');
        const readOnly = facts.filter((f) => f.source !== 'manual');

        return (
          <Box component="section" key={group.id}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              {group.title}
            </Typography>

            {manual.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2,
                  mb: readOnly.length ? 2 : 0,
                }}
              >
                {manual.map((fact) => (
                  <ManualFactInput
                    key={fact.key}
                    fact={fact}
                    hint={usedByText(fact)}
                    missing={missingKeys.has(fact.key)}
                    disabled={disabled || update.isPending}
                    onCommit={(value) => update.mutate({ [fact.key]: value })}
                  />
                ))}
              </Box>
            )}

            {readOnly.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  columnGap: 2,
                  rowGap: 1.25,
                }}
              >
                {readOnly.map((fact) => (
                  <Box key={fact.key} sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      {fact.label}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        color={fact.value ? 'text.primary' : missingKeys.has(fact.key) ? 'warning.main' : 'text.secondary'}
                        sx={{ overflowWrap: 'anywhere' }}
                      >
                        {fact.value || 'Not set'}
                      </Typography>
                      {fact.editAt && (
                        <MuiLink
                          component={NextLink}
                          href={factEditHref(fact.editAt, workspace)}
                          variant="caption"
                          sx={{ flexShrink: 0 }}
                        >
                          Edit
                        </MuiLink>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

interface ManualFactInputProps {
  fact: WorkspaceFact;
  hint: string;
  missing: boolean;
  disabled?: boolean;
  onCommit: (value: string | null) => void;
}

/**
 * Saves on blur — but only when the draft actually changed. Some stored manual
 * values are legacy free text that fails its own rule (e.g. an
 * `application_date` saved as "12/03/2025" before this form existed). Blurring
 * an untouched field must never send `null` for a value like that: it would
 * silently wipe data an `<input type="date">` cannot even display. `dirty`
 * tracks a real edit; commit only runs when it is set.
 *
 * A date fact whose stored value fails validation renders as plain text
 * (showing exactly what is stored, with the rule error as its helper text) so
 * the user can retype it — e.g. as YYYY-MM-DD, or with "Today" — instead of
 * seeing a blank date picker. It goes back to `type="date"` once the stored
 * value is a valid ISO date.
 */
function ManualFactInput({ fact, hint, missing, disabled, onCommit }: ManualFactInputProps) {
  const [draft, setDraft] = useState(fact.value);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(
    fact.value ? validateFactValue(fact, fact.value) : null,
  );

  useEffect(() => {
    setDraft(fact.value);
    setDirty(false);
    setError(fact.value ? validateFactValue(fact, fact.value) : null);
  }, [fact.value]);

  const commit = (raw: string) => {
    const value = raw.trim();
    if (value === fact.value) {
      setError(null);
      setDirty(false);
      return;
    }
    const message = validateFactValue(fact, value);
    setError(message);
    if (!message) {
      onCommit(value === '' ? null : value);
      setDirty(false);
    }
  };

  const storedIsInvalidDate =
    fact.type === 'date' && !!fact.value && validateFactValue(fact, fact.value) !== null;
  const inputType = fact.type === 'date' && !storedIsInvalidDate ? 'date' : 'text';

  return (
    <TextField
      size="small"
      fullWidth
      label={fact.label}
      type={inputType}
      multiline={fact.type === 'textarea'}
      minRows={fact.type === 'textarea' ? 2 : undefined}
      placeholder={fact.placeholder}
      value={draft}
      disabled={disabled}
      required={missing}
      onChange={(e) => {
        setDraft(e.target.value);
        setDirty(true);
      }}
      onBlur={() => {
        if (!dirty) return;
        commit(draft);
      }}
      error={!!error || (missing && !draft.trim())}
      helperText={error ?? (missing && !draft.trim() ? `Required · ${hint}` : hint)}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: {
          inputMode: fact.type === 'number' || fact.type === 'year' ? 'decimal' : undefined,
        },
        input:
          fact.type === 'date'
            ? {
                endAdornment: (
                  <Button
                    size="small"
                    disabled={disabled}
                    onClick={() => {
                      const today = todayIso();
                      setDraft(today);
                      setDirty(true);
                      commit(today);
                    }}
                  >
                    Today
                  </Button>
                ),
              }
            : undefined,
      }}
    />
  );
}
