'use client';

import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  FollowupPriority,
  FollowupType,
  type LeadTemperature,
  nextFollowupDate,
} from '@tejas96/shared/types';
import { useEffect, useState, type JSX } from 'react';

import { useCreateFollowup } from '../hooks';

import { useEmployees } from '@/components/features/employees';
import { showToast } from '@/components/ui';
import { MUIDatePicker } from '@/components/ui/mui-date-picker';
import { MUIUserAssigneeSelector } from '@/components/ui/mui-user-assignee-selector';
import { getErrorMessage, toTitleLabel } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

/** Minimal shape needed to offer a property choice — avoids importing the full DTO. */
export interface FollowupDrawerProperty {
  id: string;
  propertyName?: string | null;
  city?: string | null;
  leadTemperature?: string | null;
}

interface FollowupDrawerProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  /**
   * Fixed property — the property detail page. Mutually exclusive with
   * `properties`; when set, no picker is shown.
   */
  propertyId?: string;
  /**
   * Temperature of the fixed property, for the date prefill.
   *
   * Required alongside `propertyId`, because without it the cadence silently
   * falls back to the customer-lead default and a WARM site gets chased on the
   * HOT rhythm — the prefill would be wrong every time on the property page.
   */
  leadTemperature?: string | null;
  /**
   * Selectable properties — the customer detail page. Leaving the picker empty
   * creates a customer-level followup, which is what a lead with no site needs.
   */
  properties?: FollowupDrawerProperty[];
  initialPropertyId?: string | null;
}

const FOLLOWUP_TYPES = Object.values(FollowupType);

const displayName = (property: FollowupDrawerProperty): string =>
  property.propertyName?.trim() || property.city?.trim() || 'Unnamed property';

/**
 * One drawer for both levels.
 *
 * The customer-level vs property-level distinction is exactly what the schema
 * already models (`property_id` is nullable), so a single component with an
 * optional property covers both instead of two near-identical files.
 */
export function FollowupDrawer({
  open,
  onClose,
  customerId,
  propertyId,
  leadTemperature,
  properties,
  initialPropertyId,
}: FollowupDrawerProps): JSX.Element {
  const { user } = useAuth();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees({ enabled: open });
  const createMutation = useCreateFollowup();

  const showPicker = !propertyId && Boolean(properties?.length);

  const [type, setType] = useState<FollowupType>(FollowupType.TASK);
  const [subject, setSubject] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [assignedToUserId, setAssignedToUserId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const effectivePropertyId = propertyId ?? (selectedPropertyId || undefined);
  // Fixed-property callers pass the temperature directly; picker callers carry
  // it on the selected property.
  const temperature =
    leadTemperature ??
    properties?.find((p) => p.id === effectivePropertyId)?.leadTemperature ??
    null;

  useEffect(() => {
    if (!open) return;
    setType(FollowupType.TASK);
    setSubject('');
    setNotes('');
    setSelectedPropertyId(initialPropertyId ?? '');
  }, [open, initialPropertyId]);

  /**
   * Default the owner to the current user — but only once they are actually a
   * selectable option.
   *
   * Not every logged-in user has an employee profile, and the selector can only
   * render a value it can resolve to an option. Setting the id blindly leaves
   * the control showing "Assign user" while a hidden value is armed underneath,
   * so the field looks empty and submits someone anyway. Better to leave it
   * genuinely unset and let the required marker do its job.
   */
  useEffect(() => {
    if (!open || employeesLoading) return;
    const selectable = employees.some((employee) => employee.userId === user?.id);
    setAssignedToUserId(selectable ? (user?.id ?? null) : null);
  }, [open, employees, employeesLoading, user?.id]);

  // Prefilled from the lead's cadence — always editable, never enforced.
  // Re-runs when the chosen property changes, so switching to a HOT site does
  // not leave the date on the previous site's rhythm.
  useEffect(() => {
    if (!open) return;
    setScheduledAt(nextFollowupDate(new Date(), (temperature as LeadTemperature | null) ?? null));
  }, [open, temperature]);

  const canSubmit = Boolean(subject.trim() && scheduledAt && assignedToUserId);

  const handleSubmit = (): void => {
    if (!scheduledAt || !assignedToUserId) return;

    createMutation.mutate(
      {
        customerId,
        propertyId: effectivePropertyId,
        type,
        subject: subject.trim(),
        scheduledAt: scheduledAt.toISOString(),
        assignedToUserId,
        priority: FollowupPriority.NORMAL,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          showToast.success('Follow-up scheduled');
          onClose();
        },
        onError: (error) => showToast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 440 },
          maxWidth: '100vw',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box
        className="flex items-center justify-between"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          px: 2.5,
          py: 1.75,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Schedule follow-up
        </Typography>
        <IconButton size="small" aria-label="Close" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Stack spacing={2.5} sx={{ p: 2.5, overflowY: 'auto' }}>
        {showPicker && (
          <TextField
            select
            fullWidth
            size="small"
            label="Property"
            value={selectedPropertyId}
            onChange={(event) => setSelectedPropertyId(event.target.value)}
            helperText="Leave empty for a customer-level follow-up"
          >
            <MenuItem value="">
              <em>No specific property</em>
            </MenuItem>
            {properties?.map((property) => (
              <MenuItem key={property.id} value={property.id}>
                {displayName(property)}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          select
          fullWidth
          size="small"
          label="Type"
          value={type}
          onChange={(event) => setType(event.target.value as FollowupType)}
        >
          {FOLLOWUP_TYPES.map((value) => (
            <MenuItem key={value} value={value}>
              {toTitleLabel(value)}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          size="small"
          label="Subject"
          required
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="e.g. Call about revised quote"
        />

        <MUIDatePicker
          fieldLabel="Scheduled for"
          required
          value={scheduledAt}
          onChange={setScheduledAt}
          fullWidth
        />

        <MUIUserAssigneeSelector
          fieldLabel="Owner"
          required
          value={assignedToUserId}
          onChange={setAssignedToUserId}
          employees={employees}
          optionsLoading={employeesLoading}
          disablePortal
        />

        <TextField
          fullWidth
          multiline
          minRows={3}
          size="small"
          label="Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit || createMutation.isPending}
        >
          Schedule
        </Button>
      </Stack>
    </Drawer>
  );
}
