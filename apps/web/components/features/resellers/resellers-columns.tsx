'use client';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, IconButton, ListItemIcon, Menu, MenuItem } from '@mui/material';
import { type JSX, useState } from 'react';

import { CrmStatusPill, type CrmColumn } from '@/components/shared/crm-table';
import type { ResellerSummary } from '@/lib/hooks/resources/resellers';
import { color, crm } from '@/lib/theme/tokens';
import { formatPaise } from '@/lib/utils/paise';

function Money({ paise, danger }: { paise: number; danger?: boolean }): JSX.Element {
  return (
    <Box
      sx={{
        fontVariantNumeric: 'tabular-nums',
        color: paise === 0 ? color['text-tertiary'] : danger ? color.danger : undefined,
      }}
    >
      {paise === 0 ? '—' : formatPaise(paise)}
    </Box>
  );
}

/** Always visible `⋮` — never a hover reveal. */
function RowMenu({ row, onOpen }: { row: ResellerSummary; onOpen: (r: ResellerSummary) => void }): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton
        size="small"
        aria-label={`Actions for ${row.name}`}
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onOpen(row);
          }}
        >
          <ListItemIcon>
            <OpenInNewIcon fontSize="small" />
          </ListItemIcon>
          Open
        </MenuItem>
      </Menu>
    </>
  );
}

export function buildResellerColumns(onOpen: (r: ResellerSummary) => void): CrmColumn<ResellerSummary>[] {
  return [
    {
      field: 'name',
      header: 'Reseller',
      track: crm['col-customer'],
      renderCell: (r) => (
        <Box sx={{ opacity: r.status === 'active' ? 1 : 0.55 }}>
          <Box sx={{ fontWeight: 600 }}>{r.name}</Box>
          <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-tertiary'] }}>
            {[r.code, r.status !== 'active' ? r.status : null].filter(Boolean).join(' · ') || '—'}
          </Box>
        </Box>
      ),
    },
    {
      field: 'rate',
      header: 'Rate',
      track: crm['col-status'],
      // Left-aligned: right-aligning a narrow track butted the "5%" straight
      // against the next (left-aligned) funnel column with no gap between
      // them — "RATELEADS → QUOTED → WON" in the header, "5%0 → 0 → 0" in
      // the cells. CrmTable's grid has no column gap, so alignment is the
      // only thing that keeps adjacent tracks apart.
      renderCell: (r) => (r.ratePercent === null ? <CrmStatusPill tone="warning" label="Not set" /> : `${r.ratePercent}%`),
    },
    {
      field: 'funnel',
      header: 'Leads → quoted → won',
      track: crm['col-portfolio'],
      renderCell: (r) => (
        <Box sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {r.leads} → {r.quoted} → {r.won}
          <Box component="span" sx={{ ml: 1, color: color['text-tertiary'] }}>
            {r.winRate === null ? '—' : `${r.winRate}%`}
          </Box>
        </Box>
      ),
    },
    { field: 'revenue', header: 'Revenue', track: crm['col-reseller-money'], align: 'right', renderCell: (r) => <Money paise={r.revenuePaise} /> },
    { field: 'pending', header: 'Pending', track: crm['col-reseller-money'], align: 'right', renderCell: (r) => <Money paise={r.pendingPaise} /> },
    { field: 'owed', header: 'Owed', track: crm['col-reseller-money'], align: 'right', renderCell: (r) => <Money paise={r.owedPaise} /> },
    { field: 'paid', header: 'Paid', track: crm['col-reseller-money'], align: 'right', renderCell: (r) => <Money paise={r.paidPaise} /> },
    {
      field: 'recover',
      header: 'To recover',
      track: crm['col-reseller-money'],
      align: 'right',
      renderCell: (r) => <Money paise={r.toRecoverPaise} danger />,
    },
    {
      field: 'actions',
      header: '',
      track: crm['col-actions'],
      align: 'right',
      stopPropagation: true,
      renderCell: (r) => <RowMenu row={r} onOpen={onOpen} />,
    },
  ];
}
