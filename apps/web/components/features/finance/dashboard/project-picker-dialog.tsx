'use client';

import { CircularProgress, List, ListItemButton, TextField } from '@mui/material';
import * as React from 'react';

import { useProjects } from '@/components/features/projects';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogHeader,
  MUIDialogTitle,
  MUITypography,
} from '@/components/ui';

/**
 * Lightweight project picker used by the dashboard SpeedDial. Every
 * "quick action" (Record Receipt, Add Expense, Add Payment Term)
 * needs a project context, but the dashboard isn't scoped to one.
 *
 * Implementation notes:
 *  - Debounced search (220ms) — `useProjects` already enforces a
 *    minimum length of 2, so short queries fall back to the recent
 *    list (limit 10) for fast picks.
 *  - Selecting a project resolves via `onPick(projectId)` and
 *    leaves dialog cleanup to the caller (which typically closes
 *    this dialog and opens the next one).
 *  - No filtering by org-context here — `useProjects` already binds
 *    to the active organization via the auth provider.
 */
export interface ProjectPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onPick: (projectId: string, projectName: string) => void;
}

export function ProjectPickerDialog({
  open,
  onOpenChange,
  title = 'Select a project',
  onPick,
}: ProjectPickerDialogProps): React.JSX.Element {
  const [searchInput, setSearchInput] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 220);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  React.useEffect(() => {
    if (!open) {
      setSearchInput('');
      setDebouncedSearch('');
    }
  }, [open]);

  const { data, isLoading } = useProjects({
    search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
    limit: 25,
    enabled: open,
  });

  const items = data?.data ?? [];

  return (
    <MUIDialog open={open} onOpenChange={onOpenChange} size="sm">
      <MUIDialogHeader>
        <MUIDialogTitle>{title}</MUIDialogTitle>
      </MUIDialogHeader>
      <MUIDialogBody>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Search by project number or name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ mb: 1.5 }}
        />

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <CircularProgress size={20} />
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-foreground-tertiary py-8 text-center text-sm">
            {debouncedSearch ? 'No matching projects' : 'No projects found'}
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <List dense disablePadding sx={{ maxHeight: 320, overflowY: 'auto' }}>
            {items.map((p) => (
              <ListItemButton
                key={p.id}
                onClick={() => onPick(p.id, p.name)}
                sx={{ borderRadius: 1, mb: 0.25 }}
              >
                <div className="flex w-full flex-col">
                  <div className="flex items-baseline gap-2">
                    <MUITypography variant="bodyPrimary">{p.projectNumber}</MUITypography>
                    <span className="text-foreground-tertiary text-xs uppercase tracking-wide">
                      {p.status}
                    </span>
                  </div>
                  <MUITypography variant="body" className="text-foreground-secondary truncate">
                    {p.name}
                    {p.property?.customerName ? ` · ${p.property.customerName}` : ''}
                  </MUITypography>
                </div>
              </ListItemButton>
            ))}
          </List>
        )}
      </MUIDialogBody>
    </MUIDialog>
  );
}
