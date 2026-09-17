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
  type MaintenanceItemResult,
} from '@tejas96/shared/types';
import { emptyMaintenanceChecklist, maintenanceChecklistDoneCount } from '@tejas96/shared/utils';
import { type JSX, useEffect, useRef, useState } from 'react';

import { useServiceTicketMutations, type ServiceTicketDetail } from '../hooks/use-service-tickets';

import { describeCustomerWhatsapp } from '@/components/features/tasks/components/task-drawer-whatsapp';
import { MUITypography } from '@/components/ui/mui-typography';
import { color } from '@/lib/theme/tokens';

export function ServiceTicketChecklistCard({
  ticket,
}: {
  ticket: ServiceTicketDetail;
}): JSX.Element {
  const { saveChecklist } = useServiceTicketMutations();
  const checklist: MaintenanceChecklist = ticket.checklist ?? emptyMaintenanceChecklist();
  const locked = ticket.status === ServiceTicketStatus.CLOSED;
  const done = maintenanceChecklistDoneCount(checklist);

  // Notes and readings are typed locally and saved on blur, not per key.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [readings, setReadings] = useState<Record<string, string>>({});
  // Whichever note/reading field is currently focused keeps its in-progress
  // local value when the re-seed effect below runs, instead of being
  // clobbered by a save that landed for a *different* field (e.g. an All OK
  // click, another item's OK/Issue toggle, or a status change).
  const focusedNoteKeyRef = useRef<string | null>(null);
  const focusedReadingKeyRef = useRef<'generationKwh' | 'netMeterReading' | null>(null);
  useEffect(() => {
    setNotes((prev) => {
      const next = Object.fromEntries(
        Object.entries(checklist.items).map(([key, a]) => [key, a.note ?? '']),
      );
      const focused = focusedNoteKeyRef.current;
      if (focused !== null) next[focused] = prev[focused] ?? '';
      return next;
    });
    setReadings((prev) => {
      const next = {
        generationKwh: checklist.readings.generationKwh?.toString() ?? '',
        netMeterReading: checklist.readings.netMeterReading?.toString() ?? '',
      };
      const focused = focusedReadingKeyRef.current;
      if (focused !== null) next[focused] = prev[focused] ?? '';
      return next;
    });
    // Re-seed only when the server copy changes.
    // (react-hooks/exhaustive-deps is off in this repo's eslint config, so no
    // disable comment is needed here.)
  }, [ticket.updatedAt]);

  const setResult = (key: string, result: MaintenanceItemResult): void => {
    saveChecklist.mutate({
      id: ticket.id,
      items: { [key]: { result, note: result === 'issue' ? (notes[key] ?? null) : null } },
    });
  };

  const allOk = (keys: string[]): void => {
    saveChecklist.mutate({
      id: ticket.id,
      items: Object.fromEntries(keys.map((key) => [key, { result: 'ok' as const, note: null }])),
    });
  };

  const saveNote = (key: string): void => {
    const current = checklist.items[key];
    if (current?.result !== 'issue' || (current.note ?? '') === (notes[key] ?? '')) return;
    saveChecklist.mutate({
      id: ticket.id,
      items: { [key]: { result: 'issue', note: notes[key] } },
    });
  };

  const saveReading = (key: 'generationKwh' | 'netMeterReading'): void => {
    const raw = (readings[key] ?? '').trim();
    const value = raw === '' ? null : Number(raw);
    if (value !== null && !Number.isFinite(value)) return;
    if (value === checklist.readings[key]) return;
    saveChecklist.mutate({ id: ticket.id, readings: { [key]: value } });
  };

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
                    const answer = checklist.items[item.key];
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
                            value={notes[item.key] ?? ''}
                            onChange={(event) =>
                              setNotes((prev) => ({ ...prev, [item.key]: event.target.value }))
                            }
                            onFocus={() => {
                              focusedNoteKeyRef.current = item.key;
                            }}
                            onBlur={() => {
                              focusedNoteKeyRef.current = null;
                              saveNote(item.key);
                            }}
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
              {MAINTENANCE_READINGS.map((reading) => (
                <TextField
                  key={reading.key}
                  label={reading.label}
                  size="small"
                  type="number"
                  disabled={locked}
                  value={readings[reading.key] ?? ''}
                  onChange={(event) =>
                    setReadings((prev) => ({ ...prev, [reading.key]: event.target.value }))
                  }
                  onFocus={() => {
                    focusedReadingKeyRef.current = reading.key;
                  }}
                  onBlur={() => {
                    focusedReadingKeyRef.current = null;
                    saveReading(reading.key);
                  }}
                  inputProps={{ min: 0, step: 'any' }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
