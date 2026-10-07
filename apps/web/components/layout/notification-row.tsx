'use client';

import type { SvgIconComponent } from '@mui/icons-material';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import PersonAddAltOutlined from '@mui/icons-material/PersonAddAltOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import WbSunnyOutlined from '@mui/icons-material/WbSunnyOutlined';
import { Box, ButtonBase } from '@mui/material';
import { useRouter } from 'next/navigation';
import { type JSX, useCallback } from 'react';

import { type Notification, useNotificationActions } from '@/lib/hooks/resources/notifications';
import { useRefreshMoneyViews } from '@/lib/hooks/resources/payment-approvals';
import { color, crm } from '@/lib/theme/tokens';
import { formatTimeAgo } from '@/lib/utils';

/**
 * A link this web app can open. Customer notifications carry `/consumer/...`
 * links for the customer app — a few staff are customers too, and pushing
 * them to a route the web does not have would land on "not found".
 */
export function isWebLink(link: string | null | undefined): link is string {
  return (
    Boolean(link) &&
    link!.startsWith('/') &&
    !link!.startsWith('//') &&
    !link!.startsWith('/consumer/')
  );
}

const ICONS: Record<string, SvgIconComponent> = {
  task_assigned: AssignmentOutlined,
  task_blocked: BlockOutlined,
  project_assigned: FolderOutlined,
  project_team_added: FolderOutlined,
  lead_assigned: PersonAddAltOutlined,
  followup_assigned: EventOutlined,
  site_visit_assigned: PlaceOutlined,
  site_survey_assigned: PlaceOutlined,
  service_ticket_assigned: BuildOutlined,
  daily_summary: WbSunnyOutlined,
  admin_daily_summary: InsightsOutlined,
  payment_approval_pending: PaymentsOutlined,
  payment_approved: PaymentsOutlined,
  payment_rejected: PaymentsOutlined,
};

/**
 * Clicking a notification marks it read and opens what it points at, in one
 * action. Shared by the bell and the full list so both behave the same.
 */
export function useOpenNotification(onOpened?: () => void): (item: Notification) => void {
  const router = useRouter();
  const { markRead } = useNotificationActions();
  const refreshMoney = useRefreshMoneyViews();
  return useCallback(
    (item: Notification) => {
      if (!item.readAt) markRead.mutate(item.id);
      // The page this opens must show what the notice describes, even when the
      // notice arrived before the badge's last poll noticed it.
      if (item.type.startsWith('payment_')) refreshMoney();
      onOpened?.();
      if (isWebLink(item.link)) router.push(item.link);
    },
    [markRead, refreshMoney, onOpened, router],
  );
}

export function NotificationRow({
  item,
  onOpen,
}: {
  item: Notification;
  onOpen: (item: Notification) => void;
}): JSX.Element {
  const Icon = ICONS[item.type] ?? NotificationsNoneOutlined;
  const unread = !item.readAt;
  return (
    <Box component="li" sx={{ borderBottom: `1px solid ${color.divider}` }}>
      <ButtonBase
        onClick={() => onOpen(item)}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.25,
          px: 2,
          py: 1.25,
          textAlign: 'left',
        }}
      >
        <Icon
          aria-hidden
          sx={{
            mt: '2px',
            fontSize: 18,
            flexShrink: 0,
            color: unread ? color.accent : color['text-tertiary'],
          }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              fontSize: crm['text-row-title'],
              fontWeight: unread ? 700 : 500,
              color: item.severity === 'warning' && unread ? color.danger : undefined,
            }}
          >
            {unread ? <span className="sr-only">Unread: </span> : null}
            {item.title}
          </Box>
          {item.body ? (
            <Box
              sx={{
                mt: 0.25,
                fontSize: crm['text-row-sm'],
                color: color['text-secondary'],
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {item.body}
            </Box>
          ) : null}
          <Box sx={{ mt: 0.5, fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
            {formatTimeAgo(item.createdAt)}
          </Box>
        </Box>
      </ButtonBase>
    </Box>
  );
}
