'use client';

import NotificationsIcon from '@mui/icons-material/Notifications';
import { Badge, Box, ButtonBase, IconButton, Popover, Tooltip } from '@mui/material';
import { useRouter } from 'next/navigation';
import { type JSX, useEffect, useRef, useState } from 'react';

import {
  type Notification,
  useNotificationActions,
  useNotificationUnreadCount,
  useRecentNotifications,
} from '@/lib/hooks/resources/notifications';
import { useRefreshMoneyViews } from '@/lib/hooks/resources/payment-approvals';
import { color, crm, radius } from '@/lib/theme/tokens';
import { formatTimeAgo } from '@/lib/utils';

/**
 * A link this web app can open. Customer notifications carry `/consumer/...`
 * links for the customer app — a few staff are customers too, and pushing
 * them to a route the web does not have would land on "not found".
 */
function isWebLink(link: string | null | undefined): link is string {
  return (
    Boolean(link) &&
    link!.startsWith('/') &&
    !link!.startsWith('//') &&
    !link!.startsWith('/consumer/')
  );
}

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
  const { markRead, markAllRead } = useNotificationActions();
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

  const openItem = (item: Notification): void => {
    if (!item.readAt) markRead.mutate(item.id);
    // The page this opens must show what the notice describes, even when the
    // notice arrived before the badge's last poll noticed it.
    if (item.type.startsWith('payment_')) refreshMoney();
    setAnchor(null);
    if (isWebLink(item.link)) router.push(item.link);
  };

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
            items.map((item) => (
              <Box component="li" key={item.id} sx={{ borderBottom: `1px solid ${color.divider}` }}>
                <ButtonBase
                  onClick={() => openItem(item)}
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
                  <Box
                    aria-hidden
                    sx={{
                      mt: '6px',
                      width: 8,
                      height: 8,
                      flexShrink: 0,
                      borderRadius: '50%',
                      backgroundColor: item.readAt ? 'transparent' : color.accent,
                    }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box
                      sx={{
                        fontSize: crm['text-row-title'],
                        fontWeight: item.readAt ? 500 : 700,
                        color:
                          item.severity === 'warning' && !item.readAt ? color.danger : undefined,
                      }}
                    >
                      {item.readAt ? null : <span className="sr-only">Unread: </span>}
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
                    <Box
                      sx={{ mt: 0.5, fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}
                    >
                      {formatTimeAgo(item.createdAt)}
                    </Box>
                  </Box>
                </ButtonBase>
              </Box>
            ))
          )}
        </Box>
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
