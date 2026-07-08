'use client';

import CloseIcon from '@mui/icons-material/Close';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
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
import { CustomerStatus } from '@tejas96/shared/types';
import { useRouter } from 'next/navigation';
import { type JSX, useEffect, useState } from 'react';

import {
  type Customer,
  useAssignCustomer,
  useUpdateCustomer,
  useUpdateCustomerStatus,
} from '../hooks';

import { useEmployees } from '@/components/features/employees';
import { MUIUserAssigneeSelector, showToast } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils';

export interface CustomerEditDrawerProps {
  open: boolean;
  onClose: () => void;
  customer: Customer;
}

const STATUS_OPTIONS = [
  CustomerStatus.LEAD,
  CustomerStatus.PROSPECT,
  CustomerStatus.ACTIVE,
  CustomerStatus.INACTIVE,
];

function stripPhonePrefix(phone?: string): string {
  return phone?.replace(/^\+91/, '') ?? '';
}

function CustomerEditDrawerForm({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}): JSX.Element {
  const router = useRouter();
  const updateCustomer = useUpdateCustomer();
  const updateStatus = useUpdateCustomerStatus();
  const assignCustomer = useAssignCustomer();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();

  const [firstName, setFirstName] = useState(customer.firstName);
  const [lastName, setLastName] = useState(customer.lastName ?? '');
  const [phone, setPhone] = useState(stripPhonePrefix(customer.phone));
  const [email, setEmail] = useState(customer.email ?? '');
  const [status, setStatus] = useState(customer.status);
  const [assigneeId, setAssigneeId] = useState<string | null>(customer.assigneeId ?? null);

  useEffect(() => {
    setFirstName(customer.firstName);
    setLastName(customer.lastName ?? '');
    setPhone(stripPhonePrefix(customer.phone));
    setEmail(customer.email ?? '');
    setStatus(customer.status);
    setAssigneeId(customer.assigneeId ?? null);
  }, [customer]);

  const isSaving = updateCustomer.isPending || updateStatus.isPending || assignCustomer.isPending;

  const handleSave = async (): Promise<void> => {
    if (!firstName.trim() || phone.length !== 10) {
      showToast.error('First name and a valid 10-digit phone are required');
      return;
    }

    try {
      await updateCustomer.mutateAsync({
        id: customer.id,
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          phone: `+91${phone}`,
          email: email.trim() ? email.trim().toLowerCase() : null,
        },
      });

      if (status !== customer.status) {
        await updateStatus.mutateAsync({ id: customer.id, status });
      }

      const currentAssignee = customer.assigneeId ?? null;
      if (assigneeId !== currentAssignee) {
        await assignCustomer.mutateAsync({ id: customer.id, assigneeId });
      }

      showToast.success('Customer updated');
      onClose();
    } catch (error: unknown) {
      showToast.error(getErrorMessage(error));
    }
  };

  const handleFullEdit = (): void => {
    onClose();
    router.push(buildRoute(ROUTES.CUSTOMERS.EDIT, { id: customer.id }));
  };

  const employeeOptions = employees.map((employee) => ({
    id: employee.userId,
    displayName: [employee.user?.firstName, employee.user?.lastName].filter(Boolean).join(' '),
  }));

  return (
    <>
      <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>
        <Stack spacing={2}>
          <TextField
            label="First name"
            size="small"
            fullWidth
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
          <TextField
            label="Last name"
            size="small"
            fullWidth
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
          <TextField
            label="Phone"
            size="small"
            fullWidth
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
            inputProps={{ inputMode: 'numeric' }}
            helperText="10-digit mobile number"
          />
          <TextField
            label="Email"
            size="small"
            fullWidth
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            select
            label="Status"
            size="small"
            fullWidth
            value={status}
            onChange={(event) => setStatus(event.target.value as CustomerStatus)}
          >
            {STATUS_OPTIONS.map((value) => (
              <MenuItem key={value} value={value}>
                {value.charAt(0) + value.slice(1).toLowerCase()}
              </MenuItem>
            ))}
          </TextField>
          <MUIUserAssigneeSelector
            fieldLabel="Assignee"
            value={assigneeId}
            onChange={setAssigneeId}
            options={employeeOptions}
            optionsLoading={employeesLoading}
            allowUnassign
            placeholder="Unassigned"
          />
        </Stack>
        <Button
          size="small"
          startIcon={<OpenInNewOutlinedIcon />}
          onClick={handleFullEdit}
          sx={{ mt: 2 }}
        >
          Full edit (address, group, lead source)
        </Button>
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
        <Button size="small" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={() => void handleSave()}
          disabled={isSaving || !firstName.trim() || phone.length !== 10}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </Box>
    </>
  );
}

export function CustomerEditDrawer({
  open,
  onClose,
  customer,
}: CustomerEditDrawerProps): JSX.Element {
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
          Edit Customer
        </Typography>
        <IconButton size="small" aria-label="Close edit drawer" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {open ? <CustomerEditDrawerForm customer={customer} onClose={onClose} /> : null}
    </Drawer>
  );
}
