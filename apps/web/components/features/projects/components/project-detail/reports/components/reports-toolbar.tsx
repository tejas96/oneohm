'use client';

import { Box, Button, CircularProgress, MenuItem, TextField, Typography } from '@mui/material';
import type { WorkspaceReport } from '@tejas96/shared/reports';
import { Eye, FileDown, Pencil } from 'lucide-react';

export const ALL_REPORTS = 'all';

interface ReportsToolbarProps {
  reports: WorkspaceReport[];
  picked: string;
  onPick: (value: string) => void;
  mode: 'edit' | 'preview';
  onToggleMode: () => void;
  onGenerate: () => void;
  generating: boolean;
  /** What the Generate button reads, idle or running — computed by the tab, which knows the pick and progress. */
  generateLabel: string;
  canGenerate: boolean;
  /** Cancelled projects have nothing left to file. */
  hideGenerate?: boolean;
  /** Why Generate is off when the reason is not obvious (held utility details). */
  blockedReason?: string;
}

export function ReportsToolbar({
  reports,
  picked,
  onPick,
  mode,
  onToggleMode,
  onGenerate,
  generating,
  generateLabel,
  canGenerate,
  hideGenerate,
  blockedReason,
}: ReportsToolbarProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
      <TextField
        select
        size="small"
        value={picked}
        onChange={(e) => onPick(e.target.value)}
        sx={{ flex: '0 1 260px', minWidth: 200 }}
        slotProps={{ htmlInput: { 'aria-label': 'Report' } }}
      >
        <MenuItem value={ALL_REPORTS}>All reports ({reports.length})</MenuItem>
        {reports.map((r) => (
          <MenuItem key={r.id} value={r.id}>
            {r.name}
          </MenuItem>
        ))}
      </TextField>
      <Box sx={{ flex: 1 }} />
      <Button
        variant="outlined"
        startIcon={mode === 'edit' ? <Eye className="size-4" /> : <Pencil className="size-4" />}
        onClick={onToggleMode}
        disabled={generating}
        sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
      >
        {mode === 'edit' ? 'Preview' : 'Edit details'}
      </Button>
      {!hideGenerate && blockedReason && (
        <Typography variant="caption" sx={{ color: 'warning.main' }}>
          {blockedReason}
        </Typography>
      )}
      {!hideGenerate && (
        <Button
          variant="contained"
          startIcon={
            generating ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <FileDown className="size-4" />
            )
          }
          onClick={onGenerate}
          disabled={generating || !canGenerate}
          sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          {generateLabel}
        </Button>
      )}
    </Box>
  );
}
