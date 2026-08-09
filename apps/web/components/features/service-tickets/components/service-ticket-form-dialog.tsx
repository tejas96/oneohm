'use client';

import { Alert, Box, Button, Stack } from '@mui/material';
import { ServiceTicketPriority, type ServiceTicketPhoto } from '@tejas96/shared/types';
import { type JSX, useEffect, useMemo, useState } from 'react';

import { SERVICE_TICKET_PRIORITY_LABELS } from '../constants';
import { ServiceTicketPhotos } from './service-ticket-photos';
import { useServiceTicketMutations, type ServiceTicketDetail } from '../hooks/use-service-tickets';

import { useCustomers } from '@/components/features/customers/hooks';
import { useEmployees } from '@/components/features/employees';
import { useProjects } from '@/components/features/projects/hooks';
import { MUIUserAssigneeSelector, type AssigneeOption } from '@/components/ui';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
} from '@/components/ui/mui-dialog';
import { MUIInput } from '@/components/ui/mui-input';
import { MUISelect } from '@/components/ui/mui-select';
import { useDebounce } from '@/lib/hooks/use-debounce';

/** Index signature required by MUIInput's autocomplete `SearchOption`. */
interface Option {
  label: string;
  value: string;
  secondaryText?: string;
  [key: string]: unknown;
}

export interface ServiceTicketFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Ticket being edited; omit to create. */
  ticket?: ServiceTicketDetail;
  /** Pre-selects and locks the customer — used by the entity tabs. */
  lockedCustomerId?: string;
  /** Pre-selects and locks the project — used by the project tab. */
  lockedProjectId?: string;
}

const PRIORITY_OPTIONS = Object.values(ServiceTicketPriority).map((priority) => ({
  value: priority,
  label: SERVICE_TICKET_PRIORITY_LABELS[priority],
}));

export function ServiceTicketFormDialog({
  open,
  onClose,
  ticket,
  lockedCustomerId,
  lockedProjectId,
}: ServiceTicketFormDialogProps): JSX.Element {
  const isEdit = Boolean(ticket);
  const { create, update } = useServiceTicketMutations();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ServiceTicketPriority>(ServiceTicketPriority.MEDIUM);
  const [customerId, setCustomerId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ServiceTicketPhoto[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const debouncedCustomerSearch = useDebounce(customerSearch, 400);

  // Reset the form every time the dialog opens so a previous edit never leaks
  // into the next create.
  useEffect(() => {
    if (!open) return;
    setTitle(ticket?.title ?? '');
    setDescription(ticket?.description ?? '');
    setPriority(ticket?.priority ?? ServiceTicketPriority.MEDIUM);
    setCustomerId(ticket?.customerId ?? lockedCustomerId ?? '');
    setProjectId(ticket?.projectId ?? lockedProjectId ?? '');
    setAssigneeId(ticket?.assignedToEmployeeId ?? null);
    setPhotos(ticket?.photos ?? []);
    setCustomerSearch('');
    setErrors({});
  }, [open, ticket, lockedCustomerId, lockedProjectId]);

  const customerLocked = Boolean(lockedCustomerId) || isEdit;
  const projectLocked = Boolean(lockedProjectId) || isEdit;

  const { data: customerData, isFetching: customersLoading } = useCustomers({
    ...(debouncedCustomerSearch.length >= 2 ? { search: debouncedCustomerSearch } : {}),
    limit: 20,
    enabled: open && !customerLocked,
  });

  // Projects are scoped to the chosen customer, so a mismatched pair cannot be
  // submitted in the first place — the API rejects it, but the UI should never
  // offer it.
  const { data: projectData, isFetching: projectsLoading } = useProjects({
    customerId: customerId || undefined,
    limit: 100,
    enabled: open && Boolean(customerId) && !projectLocked,
  });

  const { data: employees, isLoading: employeesLoading } = useEmployees({ enabled: open });

  const customerOptions = useMemo<Option[]>(
    () =>
      (customerData?.data ?? []).map((customer) => ({
        value: customer.id,
        label: [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim(),
        secondaryText: customer.phone ?? undefined,
      })),
    [customerData?.data],
  );

  const projectOptions = useMemo<Option[]>(
    () =>
      (projectData?.data ?? []).map((project) => ({
        value: project.id,
        label: project.projectNumber,
        secondaryText: project.name,
      })),
    [projectData?.data],
  );

  /**
   * The assignee selector's legacy `employees` path emits `userId`, but the API
   * stores an employee-profile id. Building options here keeps the right id.
   */
  const assigneeOptions = useMemo<AssigneeOption[]>(
    () =>
      (employees ?? []).map((employee) => ({
        id: employee.id,
        displayName:
          [employee.user?.firstName, employee.user?.lastName].filter(Boolean).join(' ').trim() ||
          employee.user?.email ||
          employee.user?.phone ||
          'Unnamed employee',
        secondaryText: [employee.designation, employee.department].filter(Boolean).join(' · '),
      })),
    [employees],
  );

  /**
   * True only once the projects query has settled — otherwise the warning
   * flashes for a moment on every customer while their projects load.
   */
  const customerHasNoProjects =
    Boolean(customerId) && !projectLocked && !projectsLoading && projectOptions.length === 0;

  const selectedCustomer = useMemo(
    () => customerOptions.find((option) => option.value === customerId) ?? null,
    [customerOptions, customerId],
  );
  const selectedProject = useMemo(
    () => projectOptions.find((option) => option.value === projectId) ?? null,
    [projectOptions, projectId],
  );

  const handleCustomerChange = (next: Option | null): void => {
    setCustomerId(next?.value ?? '');
    // Changing the customer invalidates the project — clear it so a stale
    // pairing can never be submitted.
    setProjectId('');
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Title is required';
    if (title.length > 255) next.title = 'Title must be 255 characters or fewer';
    if (!description.trim()) next.description = 'Description is required';
    if (!customerId) next.customerId = 'Customer is required';
    if (!projectId) {
      next.projectId = customerHasNoProjects
        ? 'This customer has no project to raise a ticket against'
        : 'Project is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const isSubmitting = create.isPending || update.isPending;

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) return;

    try {
      if (ticket) {
        await update.mutateAsync({
          id: ticket.id,
          title: title.trim(),
          description: description.trim(),
          priority,
          assignedToEmployeeId: assigneeId ?? undefined,
          photos,
        });
      } else {
        await create.mutateAsync({
          title: title.trim(),
          description: description.trim(),
          priority,
          customerId,
          projectId,
          assignedToEmployeeId: assigneeId ?? undefined,
          photos,
        });
      }
      onClose();
    } catch {
      // The mutation surfaces the message via toast; keep the dialog open so
      // everything the user typed survives.
    }
  };

  return (
    <MUIDialog open={open} onOpenChange={(next) => !next && onClose()} size="default">
      <MUIDialogHeader>
        <MUIDialogTitle>{isEdit ? 'Edit Ticket' : 'New Service Ticket'}</MUIDialogTitle>
      </MUIDialogHeader>

      <MUIDialogBody>
        <Stack spacing={2}>
          <MUIInput
            fieldLabel="Title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Short summary of the issue"
            error={errors.title}
            fullWidth
          />

          <MUIInput
            fieldLabel="Description"
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What did the customer report?"
            error={errors.description}
            multiline
            minRows={3}
            fullWidth
          />

          {!customerLocked && (
            <MUIInput
              mode="autocomplete"
              fieldLabel="Customer"
              required
              options={customerOptions}
              value={selectedCustomer}
              onChange={(next) => handleCustomerChange(next as Option | null)}
              inputValue={customerSearch}
              onInputChange={setCustomerSearch}
              loading={customersLoading}
              showAvatar
              error={errors.customerId}
              textFieldProps={{ placeholder: 'Search by name or phone' }}
            />
          )}

          {!projectLocked && (
            <Box>
              <MUIInput
                mode="autocomplete"
                fieldLabel="Project"
                required
                options={projectOptions}
                value={selectedProject}
                onChange={(next) => setProjectId((next as Option | null)?.value ?? '')}
                loading={projectsLoading}
                disabled={!customerId || customerHasNoProjects}
                error={errors.projectId}
                noOptionsText="This customer has no project yet"
                textFieldProps={{
                  placeholder: customerId ? 'Select a project' : 'Choose a customer first',
                }}
              />

              {/*
                A service ticket is raised against an installation, so it needs a
                project. Without this the field just said "No options" once you
                opened it — a dead end with no way forward. Roughly four in five
                customers have no project yet, so this is the common case, not
                the edge one.
              */}
              {customerHasNoProjects && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  This customer has no project yet, and a service ticket has to be raised against
                  one. Create the project first, or log a <strong>Follow-up</strong> on the
                  customer instead if this is a pre-installation query.
                </Alert>
              )}
            </Box>
          )}

          <MUISelect
            fieldLabel="Priority"
            required
            value={priority}
            onChange={(event) => setPriority(event.target.value as ServiceTicketPriority)}
            options={PRIORITY_OPTIONS}
            fullWidth
          />

          <Box>
            <MUIUserAssigneeSelector
              fieldLabel="Assignee"
              value={assigneeId}
              onChange={setAssigneeId}
              options={assigneeOptions}
              optionsLoading={employeesLoading}
              allowUnassign
              placeholder="Unassigned"
              disablePortal
            />
          </Box>

          <ServiceTicketPhotos
            value={photos}
            onChange={setPhotos}
            ticketId={ticket?.id}
            disabled={isSubmitting}
          />
        </Stack>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button variant="outlined" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={isSubmitting}>
          {isEdit ? 'Save changes' : 'Create ticket'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
