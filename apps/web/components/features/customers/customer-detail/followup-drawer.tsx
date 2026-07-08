'use client';

import CloseIcon from '@mui/icons-material/Close';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FollowupPriority, FollowupType } from '@tejas96/shared/types';
import { type JSX, useEffect, useMemo, useState } from 'react';

import { type CustomerPropertyResponse, useCreateFollowup } from '../hooks';

import { useEmployees } from '@/components/features/employees';
import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { getErrorMessage, toTitleLabel } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

export interface FollowupDrawerProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  properties: CustomerPropertyResponse[];
  initialPropertyId?: string | null;
}

const FOLLOWUP_TYPES = Object.values(FollowupType);
const FOLLOWUP_PRIORITIES = Object.values(FollowupPriority);

interface FollowupDrawerFormProps {
  customerId: string;
  properties: CustomerPropertyResponse[];
  initialPropertyId?: string | null;
  onClose: () => void;
}

function FollowupDrawerForm({
  customerId,
  properties,
  initialPropertyId,
  onClose,
}: FollowupDrawerFormProps): JSX.Element {
  const { user } = useAuth();
  const createMutation = useCreateFollowup();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();

  const [type, setType] = useState<FollowupType>(FollowupType.TASK);
  const [subject, setSubject] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState(user?.id ?? '');
  const [priority, setPriority] = useState<FollowupPriority>(FollowupPriority.NORMAL);
  const [notes, setNotes] = useState('');
  const [propertyId, setPropertyId] = useState<string | null>(initialPropertyId ?? null);

  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        id: employee.userId,
        label: [employee.user?.firstName, employee.user?.lastName].filter(Boolean).join(' '),
      })),
    [employees],
  );

  useEffect(() => {
    setType(FollowupType.TASK);
    setSubject('');
    setScheduledAt('');
    setPriority(FollowupPriority.NORMAL);
    setNotes('');
    setPropertyId(initialPropertyId ?? null);
    setAssignedToUserId(user?.id ?? '');
  }, [initialPropertyId, user?.id]);

  const selectedEmployee = employeeOptions.find((option) => option.id === assignedToUserId) ?? null;

  const propertyOptions = useMemo(
    () => [
      { id: null as string | null, label: 'Customer-level' },
      ...properties.map((property) => ({
        id: property.id,
        label: getPropertyDisplayName(property),
      })),
    ],
    [properties],
  );

  const selectedProperty =
    propertyOptions.find((option) => option.id === propertyId) ?? propertyOptions[0];

  const handleSubmit = (): void => {
    if (!subject.trim() || !scheduledAt || !assignedToUserId) return;

    createMutation.mutate(
      {
        customerId,
        propertyId,
        type,
        subject: subject.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        assignedToUserId,
        priority,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          console.error(getErrorMessage(error));
        },
      },
    );
  };

  return (
    <>
      <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>
        <Stack spacing={2}>
          <TextField
            select
            label="Type"
            size="small"
            fullWidth
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
            label="Subject"
            size="small"
            fullWidth
            required
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />

          <TextField
            id="followup-scheduled-at"
            name="scheduledAt"
            label="Scheduled at"
            type="datetime-local"
            size="small"
            fullWidth
            required
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <Autocomplete
            options={employeeOptions}
            loading={employeesLoading}
            value={selectedEmployee}
            onChange={(_, value) => setAssignedToUserId(value?.id ?? '')}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Assigned to"
                size="small"
                required
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {employeesLoading ? <CircularProgress color="inherit" size={16} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          <Autocomplete
            options={propertyOptions}
            value={selectedProperty}
            onChange={(_, value) => setPropertyId(value?.id ?? null)}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => <TextField {...params} label="Scope" size="small" />}
          />

          <TextField
            select
            label="Priority"
            size="small"
            fullWidth
            value={priority}
            onChange={(event) => setPriority(event.target.value as FollowupPriority)}
          >
            {FOLLOWUP_PRIORITIES.map((value) => (
              <MenuItem key={value} value={value}>
                {toTitleLabel(value)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Notes"
            size="small"
            fullWidth
            multiline
            minRows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Stack>
      </Box>

      <Box
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          px: 2.5,
          py: 1.5,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
        }}
      >
        <Button size="small" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleSubmit}
          disabled={
            createMutation.isPending || !subject.trim() || !scheduledAt || !assignedToUserId
          }
        >
          {createMutation.isPending ? 'Saving…' : 'Schedule'}
        </Button>
      </Box>
    </>
  );
}

export function FollowupDrawer({
  open,
  onClose,
  customerId,
  properties,
  initialPropertyId,
}: FollowupDrawerProps): JSX.Element {
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
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          px: 2.5,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Schedule Follow-up
        </Typography>
        <IconButton size="small" aria-label="Close" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {open ? (
        <FollowupDrawerForm
          customerId={customerId}
          properties={properties}
          initialPropertyId={initialPropertyId}
          onClose={onClose}
        />
      ) : null}
    </Drawer>
  );
}
