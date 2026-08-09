'use client';

import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Divider, Link as MuiLink, Stack } from '@mui/material';
import NextLink from 'next/link';
import { type JSX, useMemo, useState } from 'react';

import {
  SERVICE_TICKET_PRIORITY_LABELS,
  SERVICE_TICKET_PRIORITY_TONE,
  SERVICE_TICKET_STATUS_LABELS,
  SERVICE_TICKET_STATUS_TONE,
} from '../constants';
import { ServiceTicketFormDialog } from './service-ticket-form-dialog';
import { useServiceTickets, type ServiceTicketListParams } from '../hooks/use-service-tickets';

import { CrmStatusPill } from '@/components/shared/crm-table';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES, buildRoute } from '@/lib/config/routes';
import { color } from '@/lib/theme/tokens';
import { formatDate } from '@/lib/utils';

export type ServiceTicketScope = 'customer' | 'property' | 'project';

export interface EntityServiceTicketsTabProps {
  scope: ServiceTicketScope;
  /** The customer / property / project id, per `scope`. */
  id: string;
  /** Lets the property and project tabs pre-select the customer on create. */
  customerId?: string;
  /**
   * Property scope only: a property has exactly one project, so passing it locks
   * the new ticket to that project. Without it the user could file the ticket
   * against another of the customer's projects and it would vanish from this tab.
   */
  projectId?: string;
  enabled: boolean;
}

const EMPTY_COPY: Record<ServiceTicketScope, string> = {
  customer: 'No service tickets for this customer.',
  property: 'No service tickets for this property.',
  project: 'No service tickets for this project.',
};

/**
 * The single service-tickets tab, rendered by the customer, property and
 * project detail screens alike. It branches on `scope` only to pick the query
 * parameter and the empty-state wording — everything else is shared, so the
 * three tabs cannot drift.
 */
export function EntityServiceTicketsTab({
  scope,
  id,
  customerId,
  projectId,
  enabled,
}: EntityServiceTicketsTabProps): JSX.Element {
  const [formOpen, setFormOpen] = useState(false);

  const params = useMemo<ServiceTicketListParams>(() => {
    if (scope === 'customer') return { customerId: id, limit: 50 };
    if (scope === 'property') return { propertyId: id, limit: 50 };
    return { projectId: id, limit: 50 };
  }, [scope, id]);

  const { data, isLoading } = useServiceTickets(params, enabled);
  const tickets = data?.items ?? [];

  // Customer scope locks the customer; project scope locks both; property scope
  // locks the customer and — when the caller supplies it — the property's project.
  const lockedCustomerId = scope === 'customer' ? id : customerId;
  const lockedProjectId = scope === 'project' ? id : scope === 'property' ? projectId : undefined;

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <MUITypography variant="sectionTitle">
          Service Tickets{tickets.length > 0 ? ` (${tickets.length})` : ''}
        </MUITypography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setFormOpen(true)}
        >
          New Ticket
        </Button>
      </Stack>

      {isLoading ? (
        <MUITypography variant="body">Loading tickets…</MUITypography>
      ) : tickets.length === 0 ? (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <MUITypography variant="placeholder">{EMPTY_COPY[scope]}</MUITypography>
        </Box>
      ) : (
        <Stack divider={<Divider flexItem />}>
          {tickets.map((ticket) => (
            <Stack
              key={ticket.id}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ sm: 'center' }}
              sx={{ py: 1.5 }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <MuiLink
                    component={NextLink}
                    href={buildRoute(ROUTES.SERVICE.DETAIL, { id: ticket.id })}
                    underline="hover"
                    sx={{ fontWeight: 600 }}
                  >
                    {ticket.title}
                  </MuiLink>
                  <CrmStatusPill
                    label={SERVICE_TICKET_STATUS_LABELS[ticket.status]}
                    tone={SERVICE_TICKET_STATUS_TONE[ticket.status]}
                  />
                  <CrmStatusPill
                    label={SERVICE_TICKET_PRIORITY_LABELS[ticket.priority]}
                    tone={SERVICE_TICKET_PRIORITY_TONE[ticket.priority]}
                    dot
                  />
                </Stack>
                <MUITypography variant="finePrint" sx={{ mt: 0.25 }}>
                  {[ticket.ticketNumber, ticket.projectNumber, formatDate(ticket.createdAt)]
                    .filter(Boolean)
                    .join(' · ')}
                </MUITypography>
              </Box>

              {ticket.assigneeName ? (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                  <MUIAvatar name={ticket.assigneeName} size="sm" />
                  <MUITypography variant="bodyPrimary" noWrap>
                    {ticket.assigneeName}
                  </MUITypography>
                </Stack>
              ) : (
                <MUITypography
                  variant="placeholder"
                  sx={{ flexShrink: 0, color: color['text-tertiary'] }}
                >
                  Unassigned
                </MUITypography>
              )}
            </Stack>
          ))}
        </Stack>
      )}

      <ServiceTicketFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        lockedCustomerId={lockedCustomerId}
        lockedProjectId={lockedProjectId}
      />
    </Box>
  );
}
