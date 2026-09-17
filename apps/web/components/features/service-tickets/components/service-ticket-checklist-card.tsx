'use client';

import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  MAINTENANCE_CHECKLIST,
  MAINTENANCE_CHECKLIST_TOTAL,
  MAINTENANCE_READINGS,
} from '@tejas96/shared/constants';
import {
  ServiceTicketStatus,
  type MaintenanceChecklist,
  type MaintenanceChecklistAnswer,
  type MaintenanceItemResult,
} from '@tejas96/shared/types';
import { emptyMaintenanceChecklist, maintenanceChecklistDoneCount } from '@tejas96/shared/utils';
import { type JSX, useEffect, useRef, useState } from 'react';

import { useServiceTicketMutations, type ServiceTicketDetail } from '../hooks/use-service-tickets';

import { describeCustomerWhatsapp } from '@/components/features/tasks/components/task-drawer-whatsapp';
import { MUITypography } from '@/components/ui/mui-typography';
import { color } from '@/lib/theme/tokens';

type ReadingKey = 'generationKwh' | 'netMeterReading';

interface ChecklistDraft {
  items: Record<string, MaintenanceChecklistAnswer>;
  readings: Record<ReadingKey, string>;
}

function draftFromChecklist(checklist: MaintenanceChecklist): ChecklistDraft {
  return {
    items: { ...checklist.items },
    readings: {
      generationKwh: checklist.readings.generationKwh?.toString() ?? '',
      netMeterReading: checklist.readings.netMeterReading?.toString() ?? '',
    },
  };
}

/** Comma decimals (`12,5`) are read as `12.5`. Empty string is "not entered". */
function parseReadingInput(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(value) || value < 0) return 'invalid';
  return value;
}

/**
 * The draft as a `MaintenanceChecklist`, so the "{done} of 20 done" counter
 * can count the draft (spec section 7), not just the last saved copy.
 * Invalid/empty readings count as not entered, same as `null`.
 */
function checklistFromDraft(draft: ChecklistDraft): MaintenanceChecklist {
  return {
    items: draft.items,
    readings: {
      generationKwh: readingOrNull(parseReadingInput(draft.readings.generationKwh)),
      netMeterReading: readingOrNull(parseReadingInput(draft.readings.netMeterReading)),
    },
  };
}

function readingOrNull(parsed: number | null | 'invalid'): number | null {
  return parsed === 'invalid' ? null : parsed;
}

/** Item keys whose draft answer differs from the saved copy. */
function diffItemKeys(
  draftItems: Record<string, MaintenanceChecklistAnswer>,
  savedItems: Record<string, MaintenanceChecklistAnswer>,
): string[] {
  const keys = new Set([...Object.keys(draftItems), ...Object.keys(savedItems)]);
  const changed: string[] = [];
  for (const key of keys) {
    const draftResult = draftItems[key]?.result ?? null;
    const savedResult = savedItems[key]?.result ?? null;
    const draftNote = draftResult === 'issue' ? (draftItems[key]?.note ?? '') : '';
    const savedNote = savedResult === 'issue' ? (savedItems[key]?.note ?? '') : '';
    if (draftResult !== savedResult || draftNote !== savedNote) changed.push(key);
  }
  return changed;
}

/** Reading keys whose draft value differs from the saved copy, and which ones are invalid. */
function diffReadingKeys(
  draftReadings: Record<ReadingKey, string>,
  savedReadings: MaintenanceChecklist['readings'],
): { changed: ReadingKey[]; invalid: ReadingKey[] } {
  const changed: ReadingKey[] = [];
  const invalid: ReadingKey[] = [];
  for (const reading of MAINTENANCE_READINGS) {
    const key = reading.key as ReadingKey;
    const parsed = parseReadingInput(draftReadings[key]);
    if (parsed === 'invalid') {
      invalid.push(key);
      changed.push(key);
      continue;
    }
    if (parsed !== (savedReadings[key] ?? null)) changed.push(key);
  }
  return { changed, invalid };
}

export function ServiceTicketChecklistCard({
  ticket,
  onDirtyChange,
}: {
  ticket: ServiceTicketDetail;
  onDirtyChange: (dirty: boolean) => void;
}): JSX.Element {
  const { saveChecklist } = useServiceTicketMutations();
  const checklist: MaintenanceChecklist = ticket.checklist ?? emptyMaintenanceChecklist();
  const locked = ticket.status === ServiceTicketStatus.CLOSED;

  const [draft, setDraft] = useState<ChecklistDraft>(() => draftFromChecklist(checklist));

  /**
   * The checklist the current draft was seeded from: set on mount, on a
   * clean re-seed below, and after a successful save. Diffing (and the
   * re-seed effect's "is the draft clean" check) is always against THIS, not
   * the latest `ticket.checklist` — otherwise a save by someone else (or a
   * refetch that just brings newer answers) would make an untouched draft
   * look dirty against the new copy, and Save would send back the old
   * values for fields the user never touched.
   */
  const seededChecklistRef = useRef<MaintenanceChecklist>(checklist);

  // The counter counts the draft, so it moves as the user taps, before Save.
  const done = maintenanceChecklistDoneCount(checklistFromDraft(draft));

  const itemChanges = diffItemKeys(draft.items, seededChecklistRef.current.items);
  const readingChanges = diffReadingKeys(draft.readings, seededChecklistRef.current.readings);
  const changeCount = itemChanges.length + readingChanges.changed.length;
  const isDirty = changeCount > 0;
  const hasInvalidReading = readingChanges.invalid.length > 0;

  // Re-seed from the server copy only when the draft is clean (isDirty is
  // false, i.e. it still matches what it was seeded from): another save or a
  // refetch should not clobber changes the user is mid-typing.
  useEffect(() => {
    if (!isDirty) {
      seededChecklistRef.current = checklist;
      setDraft(draftFromChecklist(checklist));
    }
    // react-hooks/exhaustive-deps is off in this repo's eslint config, so no
    // disable comment is needed here.
  }, [ticket.updatedAt]);

  // Report "has unsaved changes" up without depending on the parent's
  // callback identity, so this effect only re-runs when dirtiness changes.
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  useEffect(() => {
    onDirtyChangeRef.current(isDirty);
  }, [isDirty]);
  useEffect(() => () => onDirtyChangeRef.current(false), []);

  const setResult = (key: string, result: MaintenanceItemResult): void => {
    setDraft((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [key]: { result, note: result === 'issue' ? (prev.items[key]?.note ?? '') : null },
      },
    }));
  };

  const allOk = (keys: string[]): void => {
    setDraft((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        ...Object.fromEntries(keys.map((key) => [key, { result: 'ok' as const, note: null }])),
      },
    }));
  };

  const setNote = (key: string, note: string): void => {
    setDraft((prev) => ({
      ...prev,
      items: { ...prev.items, [key]: { result: 'issue', note } },
    }));
  };

  const setReading = (key: ReadingKey, raw: string): void => {
    setDraft((prev) => ({ ...prev, readings: { ...prev.readings, [key]: raw } }));
  };

  const handleSave = (): void => {
    if (!isDirty || hasInvalidReading) return;
    const body: {
      items?: Record<string, MaintenanceChecklistAnswer>;
      readings?: Partial<MaintenanceChecklist['readings']>;
    } = {};
    if (itemChanges.length > 0) {
      // itemChanges only contains keys the user has answered in the draft
      // (the UI never removes an existing answer), so this is always defined.
      body.items = Object.fromEntries(
        itemChanges.map((key) => [key, draft.items[key] as MaintenanceChecklistAnswer]),
      );
    }
    if (readingChanges.changed.length > 0) {
      body.readings = Object.fromEntries(
        readingChanges.changed.map((key) => {
          const parsed = parseReadingInput(draft.readings[key]);
          return [key, parsed === 'invalid' ? null : parsed];
        }),
      );
    }
    saveChecklist.mutate(
      { id: ticket.id, ...body },
      {
        onSuccess: (updated) => {
          const savedChecklist = updated.checklist ?? emptyMaintenanceChecklist();
          seededChecklistRef.current = savedChecklist;
          setDraft(draftFromChecklist(savedChecklist));
        },
      },
    );
  };

  const saveLabel = isDirty
    ? `Save checklist (${changeCount} ${changeCount === 1 ? 'change' : 'changes'})`
    : 'Saved';

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <MUITypography variant="sectionTitle">Inspection checklist</MUITypography>
          <MUITypography variant="finePrint">
            {done} of {MAINTENANCE_CHECKLIST_TOTAL} done
          </MUITypography>
        </Stack>

        {ticket.customerWhatsapp && (
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {(['opened', 'closed'] as const).map((event) => {
              const status = ticket.customerWhatsapp?.[event];
              if (!status) return null;
              const problem = status.state === 'failed' || status.state === 'skipped';
              return (
                <Stack key={event} direction="row" spacing={1} alignItems="center">
                  <WhatsAppIcon
                    sx={{ fontSize: 16, color: problem ? 'error.main' : color['text-secondary'] }}
                  />
                  <MUITypography
                    variant="finePrint"
                    sx={{ color: problem ? 'error.main' : undefined }}
                  >
                    {event === 'opened' ? 'Checkup opened' : 'Checkup done'}:{' '}
                    {describeCustomerWhatsapp(status)}
                  </MUITypography>
                </Stack>
              );
            })}
          </Stack>
        )}

        <Stack spacing={2.5} sx={{ mt: 2 }}>
          {MAINTENANCE_CHECKLIST.map((group) => {
            const keys = group.items.map((item) => item.key);
            return (
              <Box key={group.key}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <MUITypography variant="metaLabel">{group.title.toUpperCase()}</MUITypography>
                  <Button size="small" disabled={locked} onClick={() => allOk(keys)}>
                    All OK
                  </Button>
                </Stack>
                <Stack spacing={1} sx={{ mt: 0.5 }}>
                  {group.items.map((item) => {
                    const answer = draft.items[item.key];
                    return (
                      <Box key={item.key}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          spacing={2}
                        >
                          <MUITypography variant="body">{item.label}</MUITypography>
                          <ToggleButtonGroup
                            exclusive
                            size="small"
                            disabled={locked}
                            value={answer?.result ?? null}
                            onChange={(_, next: MaintenanceItemResult | null) => {
                              if (next) setResult(item.key, next);
                            }}
                          >
                            <ToggleButton value="ok" color="success">
                              OK
                            </ToggleButton>
                            <ToggleButton value="issue" color="error">
                              Issue
                            </ToggleButton>
                          </ToggleButtonGroup>
                        </Stack>
                        {answer?.result === 'issue' && (
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="What is wrong?"
                            disabled={locked}
                            value={answer.note ?? ''}
                            onChange={(event) => setNote(item.key, event.target.value)}
                            inputProps={{ maxLength: 500 }}
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            );
          })}

          <Box>
            <MUITypography variant="metaLabel">READINGS</MUITypography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
              {MAINTENANCE_READINGS.map((reading) => {
                const key = reading.key as ReadingKey;
                const invalid = readingChanges.invalid.includes(key);
                return (
                  <TextField
                    key={reading.key}
                    label={reading.label}
                    size="small"
                    disabled={locked}
                    value={draft.readings[key]}
                    onChange={(event) => setReading(key, event.target.value)}
                    error={invalid}
                    helperText={invalid ? 'Must be 0 or more' : undefined}
                    inputProps={{ inputMode: 'decimal' }}
                  />
                );
              })}
            </Stack>
          </Box>

          <Box>
            <Button
              variant="contained"
              disabled={locked || !isDirty || hasInvalidReading}
              onClick={handleSave}
            >
              {saveLabel}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
