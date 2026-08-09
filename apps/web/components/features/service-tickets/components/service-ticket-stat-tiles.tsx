'use client';

import { Box, Skeleton } from '@mui/material';
import { type JSX, useMemo } from 'react';

import type { ServiceTicketStats } from '../hooks/use-service-tickets';

import { color, crm, radius, shadow } from '@/lib/theme/tokens';
import { formatNumber } from '@/lib/utils';

/**
 * Tile keys. The four status keys write to the status filter; `urgent` is a
 * PRIORITY, not a status, so it writes to the priority filter instead.
 */
export type TicketTileKey = 'open' | 'in_progress' | 'resolved' | 'closed' | 'urgent';

interface TileProps {
  label: string;
  value: number;
  active: boolean;
  loading: boolean;
  onClick: () => void;
}

function Tile({ label, value, active, loading, onClick }: TileProps): JSX.Element {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-pressed={active}
      sx={{
        height: crm['kpi-height'],
        px: 2,
        py: 1.75,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        textAlign: 'left',
        cursor: 'pointer',
        border: '1px solid',
        borderColor: active ? color.accent : 'transparent',
        backgroundColor: color.surface,
        borderRadius: radius['card-functional'],
        boxShadow: shadow.e2,
        transition: 'border-color 120ms ease',
        '&:hover': { borderColor: color.accent },
      }}
    >
      <Box
        component="span"
        sx={{
          fontSize: 'var(--text-overline-size)',
          fontWeight: 700,
          letterSpacing: 'var(--text-overline-track)',
          textTransform: 'uppercase',
          color: color['text-tertiary'],
        }}
      >
        {label}
      </Box>

      {loading ? (
        <Skeleton variant="text" width="60%" height={28} />
      ) : (
        <Box
          component="span"
          sx={{
            fontSize: 'var(--text-h3-size)',
            lineHeight: 'var(--text-h3-line)',
            letterSpacing: 'var(--text-h3-track)',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatNumber(value)}
        </Box>
      )}
    </Box>
  );
}

export interface ServiceTicketStatTilesProps {
  stats: ServiceTicketStats | undefined;
  loading: boolean;
  /** Currently selected tile, or null when no tile-driven filter is applied. */
  activeKey: TicketTileKey | null;
  onSelect: (key: TicketTileKey) => void;
}

/**
 * Counts here are company-wide and deliberately unaffected by the table's
 * filters — they are the fixed frame of reference the user filters *from*.
 * Recomputing them from the visible rows would make every tile show the number
 * you already filtered to.
 */
export function ServiceTicketStatTiles({
  stats,
  loading,
  activeKey,
  onSelect,
}: ServiceTicketStatTilesProps): JSX.Element {
  const tiles = useMemo(
    () => [
      { key: 'open' as const, label: 'Open', value: stats?.open ?? 0 },
      { key: 'in_progress' as const, label: 'In Progress', value: stats?.inProgress ?? 0 },
      { key: 'resolved' as const, label: 'Resolved', value: stats?.resolved ?? 0 },
      { key: 'closed' as const, label: 'Closed', value: stats?.closed ?? 0 },
      { key: 'urgent' as const, label: 'Urgent', value: stats?.urgent ?? 0 },
    ],
    [stats],
  );

  return (
    <Box
      sx={{
        // Five fixed tiles, so they are laid out explicitly rather than with
        // auto-fit — at `kpi-min-width` the fifth wrapped onto its own row and
        // read as a separate, unrelated card.
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          lg: 'repeat(5, 1fr)',
        },
        gap: 1.5,
        flexShrink: 0,
      }}
    >
      {tiles.map((tile) => (
        <Tile
          key={tile.key}
          label={tile.label}
          value={tile.value}
          loading={loading}
          active={activeKey === tile.key}
          onClick={() => onSelect(tile.key)}
        />
      ))}
    </Box>
  );
}
