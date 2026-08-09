'use client';

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import { Box, Button, Card, CardContent, Link as MuiLink, Stack, Tooltip } from '@mui/material';
import { ServiceTicketStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { type JSX, useState } from 'react';

import {
  SERVICE_TICKET_PRIORITY_LABELS,
  SERVICE_TICKET_PRIORITY_TONE,
  SERVICE_TICKET_STATUS_LABELS,
  SERVICE_TICKET_STATUS_TONE,
} from '../constants';
import { ServiceTicketFormDialog } from './service-ticket-form-dialog';
import { ServiceTicketStatusDialog } from './service-ticket-status-dialog';
import { ServiceTicketTimeline } from './service-ticket-timeline';
import { useServiceTicket } from '../hooks/use-service-tickets';

import { CrmStatusPill } from '@/components/shared/crm-table';
import { MUITypography } from '@/components/ui/mui-typography';
import { ROUTES, buildRoute } from '@/lib/config/routes';
import { color, crm, radius } from '@/lib/theme/tokens';
import { formatDate } from '@/lib/utils';

export interface ServiceTicketDetailPageProps {
  ticketId: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <Box sx={{ minWidth: 0 }}>
      <MUITypography variant="metaLabel">{label}</MUITypography>
      <Box sx={{ mt: 0.25 }}>{children}</Box>
    </Box>
  );
}

export function ServiceTicketDetailPage({ ticketId }: ServiceTicketDetailPageProps): JSX.Element {
  const { data: ticket, isLoading, isError } = useServiceTicket(ticketId);
  const [statusOpen, setStatusOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <MUITypography variant="body">Loading ticket…</MUITypography>
      </Box>
    );
  }

  if (isError || !ticket) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <MUITypography variant="sectionTitle">Ticket not found</MUITypography>
        <Box sx={{ mt: 1 }}>
          <MuiLink component={NextLink} href={ROUTES.SERVICE.HOME} underline="hover">
            Back to all tickets
          </MuiLink>
        </Box>
      </Box>
    );
  }

  const isClosed = ticket.status === ServiceTicketStatus.CLOSED;
  const closedHint = 'Closed tickets cannot be modified.';

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'flex-start' }}
        spacing={2}
      >
        <Box sx={{ minWidth: 0 }}>
          <MuiLink component={NextLink} href={ROUTES.SERVICE.HOME} underline="hover">
            <MUITypography variant="finePrint">← All tickets</MUITypography>
          </MuiLink>
          <Box
            component="h1"
            sx={{
              m: 0,
              mt: 0.5,
              fontSize: crm['text-page-title'],
              fontWeight: 700,
              letterSpacing: crm['text-page-title-track'],
            }}
          >
            {ticket.title}
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap">
            <MUITypography variant="timestamp">{ticket.ticketNumber}</MUITypography>
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
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Tooltip title={isClosed ? closedHint : ''}>
            {/* span keeps the tooltip working on a disabled button */}
            <span>
              <Button
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={() => setEditOpen(true)}
                disabled={isClosed}
              >
                Edit
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={isClosed ? closedHint : ''}>
            <span>
              <Button
                variant="contained"
                startIcon={<SwapHorizOutlinedIcon />}
                onClick={() => setStatusOpen(true)}
                disabled={isClosed}
              >
                Change Status
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
        {/* ── Main column ──────────────────────────────────────── */}
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Card variant="outlined">
            <CardContent>
              <MUITypography variant="sectionTitle">Issue</MUITypography>
              <MUITypography variant="body" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
                {ticket.description}
              </MUITypography>
            </CardContent>
          </Card>

          {ticket.photos && ticket.photos.length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <MUITypography variant="sectionTitle">
                  Photos ({ticket.photos.length})
                </MUITypography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  {ticket.photos.map((photo) => (
                    <MuiLink
                      key={photo.fileKey}
                      href={photo.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        width: 104,
                        height: 104,
                        borderRadius: radius['card-functional'],
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: color.hairline,
                        display: 'block',
                      }}
                    >
                      {/* Plain <img>: S3-served URL, not a Next-optimised asset. */}
                      <img
                        src={photo.publicUrl}
                        alt={photo.fileName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </MuiLink>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {ticket.resolutionNote && (
            <Card variant="outlined">
              <CardContent>
                <MUITypography variant="sectionTitle">Resolution</MUITypography>
                <MUITypography variant="body" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
                  {ticket.resolutionNote}
                </MUITypography>
              </CardContent>
            </Card>
          )}

          <Card variant="outlined">
            <CardContent>
              <MUITypography variant="sectionTitle">Details</MUITypography>
              <Box
                sx={{
                  mt: 1.5,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 2,
                }}
              >
                <Field label="CUSTOMER">
                  <MuiLink
                    component={NextLink}
                    href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: ticket.customerId })}
                    underline="hover"
                  >
                    {ticket.customerName}
                  </MuiLink>
                </Field>
                <Field label="PROJECT">
                  <MuiLink
                    component={NextLink}
                    href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: ticket.projectId })}
                    underline="hover"
                  >
                    {ticket.projectNumber}
                  </MuiLink>
                </Field>
                <Field label="PROPERTY">
                  <MuiLink
                    component={NextLink}
                    href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: ticket.propertyId })}
                    underline="hover"
                  >
                    {ticket.propertyLabel}
                  </MuiLink>
                </Field>
                <Field label="ASSIGNEE">
                  {ticket.assigneeName ? (
                    <MUITypography variant="bodyPrimary">{ticket.assigneeName}</MUITypography>
                  ) : (
                    <MUITypography variant="placeholder">Unassigned</MUITypography>
                  )}
                </Field>
                <Field label="RAISED BY">
                  <MUITypography variant="bodyPrimary">{ticket.createdByName ?? '—'}</MUITypography>
                </Field>
                <Field label="RAISED ON">
                  <MUITypography variant="bodyPrimary">
                    {formatDate(ticket.createdAt)}
                  </MUITypography>
                </Field>
                {ticket.resolvedAt && (
                  <Field label="RESOLVED ON">
                    <MUITypography variant="bodyPrimary">
                      {formatDate(ticket.resolvedAt)}
                    </MUITypography>
                  </Field>
                )}
                {ticket.closedAt && (
                  <Field label="CLOSED ON">
                    <MUITypography variant="bodyPrimary">
                      {formatDate(ticket.closedAt)}
                    </MUITypography>
                  </Field>
                )}
              </Box>
            </CardContent>
          </Card>
        </Stack>

        {/* ── Timeline ─────────────────────────────────────────── */}
        <Card variant="outlined" sx={{ width: { xs: '100%', lg: 340 }, flexShrink: 0 }}>
          <CardContent>
            <MUITypography variant="sectionTitle">Status history</MUITypography>
            <Box sx={{ mt: 1.5 }}>
              <ServiceTicketTimeline entries={ticket.statusHistory} />
            </Box>
          </CardContent>
        </Card>
      </Stack>

      <ServiceTicketStatusDialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        ticket={ticket}
      />
      <ServiceTicketFormDialog open={editOpen} onClose={() => setEditOpen(false)} ticket={ticket} />
    </Box>
  );
}
