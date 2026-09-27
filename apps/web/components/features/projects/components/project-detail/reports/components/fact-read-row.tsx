'use client';

import { Box, Tooltip, Typography } from '@mui/material';
import type { WorkspaceFact } from '@tejas96/shared/reports';
import { Lock } from 'lucide-react';

import { isChangedFromSource, isLockedFact, shownValue, sourceWord } from './fact-field';

/** Where a value that cannot be changed here comes from. */
function lockedSource(fact: WorkspaceFact): string {
  if (fact.readOnlyNote) return fact.readOnlyNote;
  if (fact.source === 'bom') return 'From the BOM tab';
  if (fact.source === 'company') return 'Company details';
  if (fact.source === 'property' || fact.source === 'customer') return 'From the site survey';
  return 'Fixed';
}

/** What the row shows: the unsaved draft when there is one, else what reports print. */
function readValue(fact: WorkspaceFact, draft: string | undefined): string {
  if (draft === undefined) return shownValue(fact, fact.value);
  const raw = draft.trim();
  if (fact.quoteValue !== undefined && !raw) return fact.quoteValue;
  if (fact.edit?.input === 'select') return fact.edit.options?.[raw] ?? raw;
  if (fact.edit?.input === 'discom') return raw ? 'New DISCOM picked' : '';
  return shownValue(fact, raw);
}

interface FactReadRowProps {
  fact: WorkspaceFact;
  help: string;
  draft?: string;
  changed: boolean;
  /** A report needs it and it is empty, and it cannot be filled here. */
  missing: boolean;
}

/**
 * One fact as plain text: label on the left, value on the right. No box, no
 * report tags: the calm view of a group that is not being edited. A blue dot
 * marks an unsaved change or a quote value changed for the reports.
 */
export function FactReadRow({
  fact,
  help,
  draft,
  changed,
  missing,
}: FactReadRowProps): React.JSX.Element {
  const value = readValue(fact, changed ? draft : undefined);
  const locked = isLockedFact(fact);
  const marked = changed || isChangedFromSource(fact);

  return (
    <Box
      data-fact-key={fact.key}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)',
        gap: 2,
        py: 1,
        borderTop: 1,
        borderColor: 'divider',
        minWidth: 0,
      }}
    >
      <Tooltip title={help} enterTouchDelay={0} leaveTouchDelay={6000} placement="top-start">
        <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 0 }}>
          {fact.label}
        </Typography>
      </Tooltip>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          columnGap: 0.75,
          minWidth: 0,
        }}
      >
        {marked && (
          <Tooltip title={changed ? 'Unsaved change' : `Changed from the ${sourceWord(fact)}`}>
            <Box
              component="span"
              aria-label={changed ? 'Unsaved change' : `Changed from the ${sourceWord(fact)}`}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'info.main',
                flexShrink: 0,
                alignSelf: 'center',
              }}
            />
          </Tooltip>
        )}
        {value ? (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
            {value}
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ color: missing ? 'warning.main' : 'text.disabled' }}>
            {missing ? 'Missing' : 'Not set'}
          </Typography>
        )}
        {locked && (
          <Tooltip title={lockedSource(fact)}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Lock className="size-3 text-foreground-tertiary" aria-hidden />
              <Typography variant="caption" sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}>
                {lockedSource(fact)}
              </Typography>
            </Box>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
