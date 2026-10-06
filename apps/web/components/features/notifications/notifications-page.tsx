'use client';

import { Box, ButtonBase, Pagination, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { type JSX, useState } from 'react';

import { NotificationRow, useOpenNotification } from '@/components/layout/notification-row';
import { useNotificationActions, useNotificationsPage } from '@/lib/hooks/resources/notifications';
import { color, crm, radius } from '@/lib/theme/tokens';

/** Every notification, newest first — the bell only shows the last ten. */
export function NotificationsPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const query = useNotificationsPage(page, unreadOnly);
  const { markAllRead } = useNotificationActions();
  const openItem = useOpenNotification();

  const items = query.data?.data ?? [];
  const totalPages = query.data?.meta.totalPages ?? 1;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Box component="h1" sx={{ m: 0, fontSize: 20, fontWeight: 700, flex: 1 }}>
          Notifications
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={unreadOnly ? 'unread' : 'all'}
          onChange={(_, v: 'all' | 'unread' | null) => {
            if (!v) return;
            setUnreadOnly(v === 'unread');
            setPage(1);
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="unread">Unread</ToggleButton>
        </ToggleButtonGroup>
        <ButtonBase
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          sx={{ fontSize: crm['text-row-sm'], fontWeight: 600, color: color.accent, px: 1 }}
        >
          Mark all read
        </ButtonBase>
      </Box>

      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          listStyle: 'none',
          border: `1px solid ${color.divider}`,
          borderRadius: radius['card-functional'],
          overflow: 'hidden',
        }}
      >
        {query.isLoading ? (
          <Line text="Loading…" />
        ) : query.isError ? (
          <Line text="Could not load notifications. Try again." />
        ) : items.length === 0 ? (
          <Line text={unreadOnly ? 'No unread notifications.' : 'Nothing here yet.'} />
        ) : (
          items.map((item) => <NotificationRow key={item.id} item={item} onOpen={openItem} />)
        )}
      </Box>

      {totalPages > 1 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
        </Box>
      ) : null}
    </Box>
  );
}

function Line({ text }: { text: string }): JSX.Element {
  return (
    <Box component="li" sx={{ px: 2, py: 3, color: color['text-secondary'], textAlign: 'center' }}>
      {text}
    </Box>
  );
}
