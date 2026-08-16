'use client';

import AddIcon from '@mui/icons-material/Add';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ServiceTicketStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { type JSX, useMemo, useState } from 'react';

import {
  isTicketOverdue,
  SERVICE_TICKET_PRIORITY_LABELS,
  SERVICE_TICKET_PRIORITY_TONE,
  SERVICE_TICKET_STATUS_LABELS,
  SERVICE_TICKET_STATUS_TONE,
} from '../constants';
import { ServiceTicketFormDialog } from './service-ticket-form-dialog';
import { useServiceTickets, type ServiceTicketListParams } from '../hooks/use-service-tickets';

import {
  DetailCard,
  EmptyPane,
  IconCircle,
  Mono,
  RowSkeleton,
  SectionHeading,
  TonePill,
} from '@/components/features/customers/customer-detail/primitives';
import { detailTableSx, tableCardSx } from '@/components/features/customers/customer-detail/styles';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { ROUTES, buildRoute } from '@/lib/config/routes';
import {
  formatBusinessDate,
  formatDate,
  formatDueDatePendingLabel,
  getDueDateMuiColor,
} from '@/lib/utils';

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
  customer: 'Tickets raised against any of this customer’s installations will appear here.',
  property: 'Tickets raised against this site’s installation will appear here.',
  project: 'Tickets raised against this project will appear here.',
};

/** Statuses that still need someone — used for the open-count in the heading. */
const LIVE_STATUSES: readonly ServiceTicketStatus[] = [
  ServiceTicketStatus.OPEN,
  ServiceTicketStatus.IN_PROGRESS,
];

/**
 * The single service-tickets tab, rendered by the customer, property and
 * project detail screens alike. It branches on `scope` only to pick the query
 * parameter and the empty-state wording — everything else is shared, so the
 * three tabs cannot drift.
 *
 * All three pages render tab content straight onto the canvas, so this owns its
 * own surface: the same `tableCardSx` shell, overline headers, zebra rows and
 * tone pills every other detail tab uses. It used to be a bare divider-ruled
 * list on no surface at all, which made it the one tab on each page that looked
 * like it came from a different product.
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
  const tickets = useMemo(() => data?.items ?? [], [data?.items]);

  const openCount = useMemo(
    () => tickets.filter((ticket) => LIVE_STATUSES.includes(ticket.status)).length,
    [tickets],
  );

  // Customer scope locks the customer; project scope locks both; property scope
  // locks the customer and — when the caller supplies it — the property's project.
  const lockedCustomerId = scope === 'customer' ? id : customerId;
  const lockedProjectId = scope === 'project' ? id : scope === 'property' ? projectId : undefined;

  const newTicketButton = (
    <Button
      size="small"
      variant="contained"
      startIcon={<AddIcon />}
      onClick={() => setFormOpen(true)}
    >
      New ticket
    </Button>
  );

  const dialog = (
    <ServiceTicketFormDialog
      open={formOpen}
      onClose={() => setFormOpen(false)}
      lockedCustomerId={lockedCustomerId}
      lockedProjectId={lockedProjectId}
    />
  );

  if (isLoading && tickets.length === 0) {
    return (
      <Box sx={tableCardSx}>
        <RowSkeleton rows={4} />
      </Box>
    );
  }

  if (tickets.length === 0) {
    return (
      <>
        <DetailCard>
          <EmptyPane
            size="page"
            icon={<BuildOutlinedIcon />}
            title="No service tickets"
            description={EMPTY_COPY[scope]}
            action={newTicketButton}
          />
        </DetailCard>
        {dialog}
      </>
    );
  }

  return (
    <>
      <Stack gap={1.5}>
        <SectionHeading count={tickets.length} sx={{ mb: 0 }} action={newTicketButton}>
          Service tickets
        </SectionHeading>

        {/*
         * Total is on the heading; this says how many still need someone. A
         * count of 12 reads very differently once you know 11 are closed.
         */}
        {openCount > 0 && <TonePill label={`${openCount} still open`} tone="warning" dot />}

        <Box sx={tableCardSx}>
          <TableContainer>
            <Table size="small" sx={detailTableSx}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 260 }}>Ticket</TableCell>
                  <TableCell sx={{ minWidth: 130 }}>Status</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Priority</TableCell>
                  {scope !== 'project' && <TableCell sx={{ minWidth: 160 }}>Project</TableCell>}
                  <TableCell sx={{ minWidth: 160 }}>Assignee</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Due</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Raised</TableCell>
                  <TableCell align="right" sx={{ width: 56 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.map((ticket) => {
                  const href = buildRoute(ROUTES.SERVICE.DETAIL, { id: ticket.id });
                  const statusTone = SERVICE_TICKET_STATUS_TONE[ticket.status];

                  return (
                    <TableRow key={ticket.id}>
                      {/*
                       * Titles are free text with no length limit, so the cell
                       * needs a ceiling — without one a long one stretches the
                       * row past the viewport and pushes the rest off-screen.
                       */}
                      <TableCell sx={{ maxWidth: 340 }}>
                        <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
                          <IconCircle tone={statusTone}>
                            <BuildOutlinedIcon />
                          </IconCircle>
                          <Box sx={{ minWidth: 0 }}>
                            <Box
                              component={NextLink}
                              href={href}
                              title={ticket.title}
                              sx={{
                                display: 'block',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: 'var(--ds-link)',
                                textDecoration: 'none',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                '&:hover': { textDecoration: 'underline' },
                              }}
                            >
                              {ticket.title}
                            </Box>
                            <Mono sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}>
                              {ticket.ticketNumber}
                            </Mono>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <TonePill
                          label={SERVICE_TICKET_STATUS_LABELS[ticket.status]}
                          tone={statusTone}
                          dot
                        />
                      </TableCell>

                      <TableCell>
                        <TonePill
                          label={SERVICE_TICKET_PRIORITY_LABELS[ticket.priority]}
                          tone={SERVICE_TICKET_PRIORITY_TONE[ticket.priority]}
                          dot
                        />
                      </TableCell>

                      {/* Redundant on the project page — every row is that project. */}
                      {scope !== 'project' && (
                        <TableCell>
                          <Mono sx={{ color: 'var(--ds-text-secondary)' }}>
                            {ticket.projectNumber || '—'}
                          </Mono>
                        </TableCell>
                      )}

                      <TableCell>
                        {ticket.assigneeName ? (
                          <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
                            <MUIAvatar name={ticket.assigneeName} size="sm" />
                            <Typography
                              sx={{
                                fontSize: '0.8125rem',
                                color: 'var(--ds-text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {ticket.assigneeName}
                            </Typography>
                          </Stack>
                        ) : (
                          /*
                           * An unassigned live ticket is a gap someone has to
                           * close, so it reads as one. On a closed ticket it is
                           * just history and stays quiet.
                           */
                          <TonePill
                            label="Unassigned"
                            tone={LIVE_STATUSES.includes(ticket.status) ? 'warning' : 'neutral'}
                            dot={LIVE_STATUSES.includes(ticket.status)}
                          />
                        )}
                      </TableCell>

                      <TableCell>
                        {ticket.dueDate ? (
                          <Stack spacing={0.25}>
                            <Mono
                              sx={{
                                fontSize: '0.75rem',
                                color: isTicketOverdue(ticket)
                                  ? 'error.main'
                                  : getDueDateMuiColor(ticket.dueDate),
                              }}
                            >
                              {formatBusinessDate(ticket.dueDate)}
                            </Mono>
                            {isTicketOverdue(ticket) && (
                              <Mono sx={{ fontSize: '0.6875rem', color: 'error.main' }}>
                                {formatDueDatePendingLabel(ticket.dueDate)}
                              </Mono>
                            )}
                          </Stack>
                        ) : (
                          <Mono sx={{ fontSize: '0.75rem', color: 'var(--ds-text-tertiary)' }}>
                            —
                          </Mono>
                        )}
                      </TableCell>

                      <TableCell>
                        <Mono sx={{ fontSize: '0.75rem', color: 'var(--ds-text-secondary)' }}>
                          {formatDate(ticket.createdAt)}
                        </Mono>
                      </TableCell>

                      <TableCell align="right">
                        <IconButton
                          size="small"
                          component={NextLink}
                          href={href}
                          aria-label={`Open ticket ${ticket.ticketNumber}`}
                        >
                          <ChevronRightIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Stack>

      {dialog}
    </>
  );
}
