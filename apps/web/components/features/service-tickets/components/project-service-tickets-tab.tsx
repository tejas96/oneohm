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
import {
  DetailCard,
  detailTableSx,
  EmptyPane,
  IconCircle,
  Mono,
  RowSkeleton,
  SectionHeading,
  tableCardSx,
  TonePill,
} from './project-service-tab-parts';
import { ServiceTicketFormDialog } from './service-ticket-form-dialog';
import { useServiceTickets, type ServiceTicketListParams } from '../hooks/use-service-tickets';

import { MUIAvatar } from '@/components/ui/mui-avatar';
import { ROUTES, buildRoute } from '@/lib/config/routes';
import {
  formatBusinessDate,
  formatDate,
  formatDueDatePendingLabel,
  getDueDateMuiColor,
} from '@/lib/utils';

export interface ProjectServiceTicketsTabProps {
  projectId: string;
  /** Pre-selects the customer on a new ticket. */
  customerId?: string;
  enabled: boolean;
}

/** Statuses that still need someone — used for the open-count in the heading. */
const LIVE_STATUSES: readonly ServiceTicketStatus[] = [
  ServiceTicketStatus.OPEN,
  ServiceTicketStatus.IN_PROGRESS,
];

/**
 * The Service tab of the project page: every ticket raised against the project.
 *
 * The page renders tab content straight onto the canvas, so this owns its own
 * surface: the `tableCardSx` shell, overline headers, zebra rows and tone pills.
 */
export function ProjectServiceTicketsTab({
  projectId,
  customerId,
  enabled,
}: ProjectServiceTicketsTabProps): JSX.Element {
  const [formOpen, setFormOpen] = useState(false);

  const params = useMemo<ServiceTicketListParams>(() => ({ projectId, limit: 50 }), [projectId]);

  const { data, isLoading } = useServiceTickets(params, enabled);
  const tickets = useMemo(() => data?.items ?? [], [data?.items]);

  const openCount = useMemo(
    () => tickets.filter((ticket) => LIVE_STATUSES.includes(ticket.status)).length,
    [tickets],
  );

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
      lockedCustomerId={customerId}
      lockedProjectId={projectId}
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
            description="Tickets raised against this project will appear here."
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
                  <TableCell sx={{ minWidth: 160 }}>Assignee</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Due</TableCell>
                  <TableCell sx={{ minWidth: 130 }}>Raised by</TableCell>
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
                        {ticket.createdByName ? (
                          <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
                            <MUIAvatar name={ticket.createdByName} size="sm" />
                            <Typography
                              sx={{
                                fontSize: '0.8125rem',
                                color: 'var(--ds-text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {ticket.createdByName}
                            </Typography>
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
