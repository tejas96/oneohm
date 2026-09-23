'use client';

import { Box, Button, CircularProgress, MenuItem, TextField } from '@mui/material';
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
  runningName: string | null;
  canGenerate: boolean;
}

export function ReportsToolbar({
  reports,
  picked,
  onPick,
  mode,
  onToggleMode,
  onGenerate,
  generating,
  runningName,
  canGenerate,
}: ReportsToolbarProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
      <TextField
        select
        size="small"
        value={picked}
        onChange={(e) => onPick(e.target.value)}
        sx={{ minWidth: 220 }}
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
      >
        {mode === 'edit' ? 'Preview' : 'Edit details'}
      </Button>
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
      >
        {generating
          ? `Filing ${runningName ?? ''}…`
          : picked === ALL_REPORTS
            ? 'Generate all'
            : 'Generate'}
      </Button>
    </Box>
  );
}
