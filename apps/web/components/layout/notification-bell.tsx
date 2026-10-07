'use client';

import NotificationsIcon from '@mui/icons-material/Notifications';
import { Badge, Box, ButtonBase, IconButton, Popover, Tooltip } from '@mui/material';
import { useRouter } from 'next/navigation';
import { type JSX, useEffect, useRef, useState } from 'react';

import { NotificationRow, useOpenNotification } from './notification-row';

import {
  useNotificationActions,
  useNotificationUnreadCount,
  useRecentNotifications,
} from '@/lib/hooks/resources/notifications';
import { useRefreshMoneyViews } from '@/lib/hooks/resources/payment-approvals';
import { color, crm, radius } from '@/lib/theme/tokens';

/**
 * The header bell and the list behind it.
 *
 * Clicking a notification marks it read and opens what it points at, in one
 * action. The badge polls; the list is fetched only while it is open.
 */
export function NotificationBell(): JSX.Element {
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  const { data: unreadData } = useNotificationUnreadCount();
  const unreadCount = unreadData?.count ?? 0;
  const recent = useRecentNotifications(open);
  const { markAllRead } = useNotificationActions();
  const refreshMoney = useRefreshMoneyViews();

  // A new notice means something changed somewhere else — a payment waiting,
  // approved or rejected. Refetch the money screens then, so the page under the
  // bell agrees with it instead of waiting for someone to reload.
  const lastCount = useRef<number | null>(null);
  useEffect(() => {
    if (!unreadData) return;
    if (lastCount.current !== null && unreadData.count > lastCount.current) refreshMoney();
    lastCount.current = unreadData.count;
  }, [unreadData, refreshMoney]);

  const openItem = useOpenNotification(() => setAnchor(null));

  const items = recent.data ?? [];

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          size="small"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          aria-haspopup="true"
          aria-expanded={open}
          onClick={(event) => setAnchor(event.currentTarget)}
          sx={{ borderRadius: '8px' }}
        >
          <Badge
            badgeContent={unreadCount > 0 ? unreadCount : undefined}
            color="error"
            max={99}
            sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 } }}
          >
            <NotificationsIcon sx={{ fontSize: 20, color: 'var(--color-muted-foreground)' }} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              width: 'min(380px, calc(100vw - 32px))',
              borderRadius: radius['card-functional'],
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.25,
            borderBottom: `1px solid ${color.divider}`,
          }}
        >
          <Box component="span" sx={{ fontWeight: 700, fontSize: crm['text-row-title'] }}>
            Notifications
          </Box>
          <ButtonBase
            onClick={() => markAllRead.mutate()}
            disabled={unreadCount === 0 || markAllRead.isPending}
            sx={{
              fontSize: crm['text-row-sm'],
              fontWeight: 600,
              color: unreadCount === 0 ? color['text-tertiary'] : color.accent,
              borderRadius: '6px',
              px: 0.75,
              py: 0.25,
            }}
          >
            Mark all read
          </ButtonBase>
        </Box>

        <Box
          component="ul"
          sx={{ m: 0, p: 0, listStyle: 'none', maxHeight: 440, overflowY: 'auto' }}
        >
          {recent.isLoading ? (
            <EmptyLine text="Loading…" />
          ) : recent.isError ? (
            <EmptyLine text="Could not load notifications. Try again." />
          ) : items.length === 0 ? (
            <EmptyLine text="Nothing here yet." />
          ) : (
            items.map((item) => <NotificationRow key={item.id} item={item} onOpen={openItem} />)
          )}
        </Box>

        <ButtonBase
          onClick={() => {
            setAnchor(null);
            router.push('/notifications');
          }}
          sx={{
            width: '100%',
            py: 1,
            fontSize: crm['text-row-sm'],
            fontWeight: 600,
            color: color.accent,
            borderTop: `1px solid ${color.divider}`,
          }}
        >
          See all
        </ButtonBase>
      </Popover>
    </>
  );
}

function EmptyLine({ text }: { text: string }): JSX.Element {
  return (
    <Box
      component="li"
      sx={{
        px: 2,
        py: 3,
        textAlign: 'center',
        fontSize: crm['text-row-sm'],
        color: color['text-tertiary'],
      }}
    >
      {text}
    </Box>
  );
}
