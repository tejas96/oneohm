'use client';

import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { Box, Typography } from '@mui/material';
import type { CustomerWhatsappStatus } from '@tejas96/shared/types';

import { SectionHeading } from './task-drawer-main-content';

/** The send is once a day, so every time here can be another day — always date it. */
function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
}

/** The one line that says what happened to the customer's WhatsApp update. */
function describeCustomerWhatsapp(status: CustomerWhatsappStatus): string {
  switch (status.state) {
    case 'waiting':
      return `WhatsApp to customer at ${formatWhen(status.at)}`;
    case 'sending':
      return 'Sending WhatsApp to customer';
    case 'sent':
      return `WhatsApp sent to customer, ${formatWhen(status.at)}`;
    case 'delivered':
      return `WhatsApp delivered, ${formatWhen(status.at)}`;
    case 'read':
      return `WhatsApp read by customer, ${formatWhen(status.at)}`;
    case 'failed':
      return `WhatsApp failed: ${status.reason ?? 'no reason given'}`;
    case 'skipped':
      return `WhatsApp not sent: ${status.reason ?? 'no reason given'}`;
  }
}

export function TaskDrawerWhatsapp({
  status,
}: {
  status: CustomerWhatsappStatus;
}): React.JSX.Element {
  const isProblem = status.state === 'failed' || status.state === 'skipped';
  return (
    <Box sx={{ mt: 3 }}>
      <SectionHeading>Customer WhatsApp</SectionHeading>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <WhatsAppIcon
          sx={{
            fontSize: 16,
            mt: '2px',
            color: isProblem ? 'error.main' : 'var(--ds-text-tertiary)',
          }}
        />
        <Typography
          sx={{
            fontSize: 13,
            lineHeight: 1.5,
            color: isProblem ? 'error.main' : 'var(--ds-text-secondary)',
          }}
        >
          {describeCustomerWhatsapp(status)}
        </Typography>
      </Box>
    </Box>
  );
}
