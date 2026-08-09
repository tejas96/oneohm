'use client';

import { Box, Stack } from '@mui/material';
import { type JSX, useMemo } from 'react';

import { SERVICE_TICKET_STATUS_LABELS, SERVICE_TICKET_STATUS_TONE } from '../constants';
import type { ServiceTicketHistoryEntry } from '../hooks/use-service-tickets';

import { CRM_TONE_FILL } from '@/components/shared/crm-table';
import { MUITypography } from '@/components/ui/mui-typography';
import { color } from '@/lib/theme/tokens';
import { formatDate } from '@/lib/utils';

export interface ServiceTicketTimelineProps {
  entries: ServiceTicketHistoryEntry[];
}

/**
 * Newest-first list of every status transition, including the ticket's
 * creation. This is what answers "who closed this, and when".
 */
export function ServiceTicketTimeline({ entries }: ServiceTicketTimelineProps): JSX.Element {
  const ordered = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [entries],
  );

  if (ordered.length === 0) {
    return <MUITypography variant="placeholder">No status changes recorded.</MUITypography>;
  }

  return (
    <Stack spacing={0}>
      {ordered.map((entry, index) => {
        const isLast = index === ordered.length - 1;
        const label = entry.fromStatus
          ? `${SERVICE_TICKET_STATUS_LABELS[entry.fromStatus]} → ${SERVICE_TICKET_STATUS_LABELS[entry.toStatus]}`
          : 'Created';

        return (
          <Stack key={entry.id} direction="row" spacing={1.5} alignItems="stretch">
            {/* Dot + connector rail */}
            <Stack alignItems="center" sx={{ width: 12, flexShrink: 0 }}>
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  mt: '5px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  backgroundColor: CRM_TONE_FILL[SERVICE_TICKET_STATUS_TONE[entry.toStatus]],
                }}
              />
              {!isLast && (
                <Box sx={{ width: '1px', flex: 1, backgroundColor: color.hairline, my: '3px' }} />
              )}
            </Stack>

            <Box sx={{ pb: isLast ? 0 : 2, minWidth: 0 }}>
              <MUITypography variant="bodyPrimary" sx={{ fontWeight: 500 }}>
                {label}
              </MUITypography>
              <MUITypography variant="finePrint">
                {[entry.changedByName, formatDate(entry.createdAt)].filter(Boolean).join(' · ')}
              </MUITypography>
              {entry.note && (
                <MUITypography variant="body" sx={{ mt: 0.5 }}>
                  {entry.note}
                </MUITypography>
              )}
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}
