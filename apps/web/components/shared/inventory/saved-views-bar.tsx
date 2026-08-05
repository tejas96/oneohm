'use client';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DriveFileRenameOutlineRoundedIcon from '@mui/icons-material/DriveFileRenameOutlineRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import { SaveViewDialog, type SaveViewDialogMode } from './save-view-dialog';
import { useSavedViewState } from './use-saved-view-state';

import {
  useSavedViewMutations,
  useSavedViews,
  type SavedView,
  type SavedViewResource,
} from '@/lib/hooks/resources';
import type { FeatureAccessKey } from '@/lib/access-control/feature-policy';
import { useFeatureAccess } from '@/lib/hooks/use-feature-access';

/**
 * SavedViewsBar — segmented chips strip for saved filter views.
 *
 * Mounted at the top of every inventory list page. Reads `?view=<id>`
 * from the URL (passed in by the parent) to drive the active chip; on
 * chip click the parent applies the saved filters via
 * `onApplyFilters(view.filters)` AND updates the URL with the view's id.
 *
 * Why the parent owns URL writes (not this component): every list page
 * already has a `useTableUrlState` instance that batches URL updates
 * for filters/page/sort. If we wrote `?view=<id>` directly here we'd
 * race with that hook's `replaceState`. Easier contract: parent passes
 * `activeId` in, `onSelect(id|null)` out.
 *
 * Permission gating:
 *   - no host-module view access -> renders nothing.
 *   - view only             -> chips visible, save/manage hidden.
 *   - host-module manage    -> full toolbar.
 *
 * Stale-view safety: if the URL `?view=<id>` references a view that
 * no longer exists (deleted in another tab), `useSavedViewState`
 * returns `status: 'stale'`. We fire `onSelect(null)` once on mount
 * to silently strip the stale param so the user lands on the "All"
 * chip without an error toast.
 */

export interface SavedViewsBarProps {
  resource: SavedViewResource;
  /** Current `?view=<id>` from the URL. Pass `null` for the "All" chip. */
  activeId: string | null;
  /**
   * Live filter object from `useTableUrlState`. Drives the modified-dot
   * indicator on the active chip and is sent to the backend on
   * "Save view" / "Update view".
   */
  currentFilters: Record<string, unknown>;
  /**
   * Called when the user picks a chip ("All" passes `null`,
   * `filters: {}`). The parent must:
   *   1. write `?view=<id|null>` to the URL.
   *   2. apply `filters` via its filter-state setter.
   * Both happen as a single transition so no race with `?page=1` reset.
   */
  onSelect: (id: string | null, filters: Record<string, unknown>) => void;
}

const SAVED_VIEW_FEATURE_ACCESS: Record<
  SavedViewResource,
  { read: FeatureAccessKey; write: FeatureAccessKey }
> = {
  'inventory-stock': {
    read: 'inventory.stock.view',
    write: 'inventory.stock.manage',
  },
  'inventory-transactions': {
    read: 'inventory.transactions.view',
    write: 'inventory.transactions.view',
  },
  'purchase-orders': {
    read: 'inventory.procurement.view',
    write: 'inventory.procurement.manage',
  },
  'material-dispatches': {
    read: 'inventory.dispatch.view',
    write: 'inventory.dispatch.manage',
  },
  'stock-allocations': {
    read: 'inventory.allocations.view',
    write: 'inventory.allocations.manage',
  },
  vendors: {
    read: 'inventory.stock.view',
    write: 'inventory.stock.manage',
  },
  warehouses: {
    read: 'inventory.stock.view',
    write: 'inventory.stock.manage',
  },
};

export function SavedViewsBar({
  resource,
  activeId,
  currentFilters,
  onSelect,
}: SavedViewsBarProps): React.JSX.Element | null {
  const featureAccess = SAVED_VIEW_FEATURE_ACCESS[resource];
  const canRead = useFeatureAccess(featureAccess.read);
  const canWrite = useFeatureAccess(featureAccess.write);

  const viewsQuery = useSavedViews(resource);
  const mutations = useSavedViewMutations();

  const views = useMemo<SavedView[]>(() => viewsQuery.data ?? [], [viewsQuery.data]);

  const { selectedView, isModified, status } = useSavedViewState({
    resource,
    views,
    activeId,
    currentFilters,
  });

  // Strip stale `?view` once we've confirmed the list loaded and the id
  // is missing. We deliberately only fire after the query resolves
  // (`isSuccess`) so we don't drop the param during the initial load.
  useEffect(() => {
    if (status === 'stale' && viewsQuery.isSuccess) {
      onSelect(null, {});
    }
  }, [status, viewsQuery.isSuccess, onSelect]);

  // ============================================================
  // Dialog state — for create AND rename. Reuses one dialog so the
  // bar stays under 500 lines; mode + initial name discriminate.
  // ============================================================
  const [dialogMode, setDialogMode] = useState<SaveViewDialogMode | null>(null);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);

  const renameTarget = useMemo<SavedView | null>(
    () => views.find((v) => v.id === renameTargetId) ?? null,
    [views, renameTargetId],
  );

  const closeDialog = (): void => {
    setDialogMode(null);
    setRenameTargetId(null);
  };

  const handleSaveSubmit = async (name: string): Promise<void> => {
    if (dialogMode === 'create') {
      const created = await mutations.create.mutateAsync({
        resource,
        name,
        filters: currentFilters,
      });
      // Auto-select the new view so the user sees their work persist.
      onSelect(created.id, created.filters);
      return;
    }
    if (dialogMode === 'rename' && renameTarget) {
      await mutations.update.mutateAsync({
        id: renameTarget.id,
        data: { name },
      });
    }
  };

  // ============================================================
  // Per-view overflow menu (rename / delete / update-from-current).
  // We keep one menu instance and re-anchor it to whichever chip
  // triggered it — saves ~3 menu instances per page.
  // ============================================================
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuTargetId, setMenuTargetId] = useState<string | null>(null);
  const menuTarget = useMemo<SavedView | null>(
    () => views.find((v) => v.id === menuTargetId) ?? null,
    [views, menuTargetId],
  );

  const openMenu = (event: React.MouseEvent<HTMLElement>, viewId: string): void => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuTargetId(viewId);
  };
  const closeMenu = (): void => {
    setMenuAnchor(null);
    setMenuTargetId(null);
  };

  const handleUpdateFromCurrent = async (): Promise<void> => {
    if (!menuTarget) return;
    closeMenu();
    await mutations.update.mutateAsync({
      id: menuTarget.id,
      data: { filters: currentFilters },
    });
  };

  const handleRenameClick = (): void => {
    if (!menuTarget) return;
    setRenameTargetId(menuTarget.id);
    setDialogMode('rename');
    closeMenu();
  };

  const handleDeleteClick = async (): Promise<void> => {
    if (!menuTarget) return;
    const target = menuTarget;
    closeMenu();
    // If the user deletes the active view, fall back to "All" before
    // the cache invalidation flips the chip into a stale state.
    if (target.id === activeId) {
      onSelect(null, {});
    }
    await mutations.remove.mutateAsync(target.id);
  };

  // ============================================================
  // Render — bail out if the user cannot read saved views at all.
  // ============================================================
  if (!canRead) return null;

  // Loading: avoid flashing chips. Show a slim skeleton row so the
  // page doesn't reflow when the data lands.
  if (viewsQuery.isLoading) {
    return (
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 40 }}>
        <CircularProgress size={14} />
        <Typography variant="caption" color="text.secondary">
          Loading saved views…
        </Typography>
      </Stack>
    );
  }

  const isAllActive = !selectedView;
  const isMutating =
    mutations.create.isPending || mutations.update.isPending || mutations.remove.isPending;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ flexWrap: 'wrap', rowGap: 1, minHeight: 40 }}
    >
      <Chip
        label="All"
        size="small"
        clickable
        color={isAllActive ? 'primary' : 'default'}
        variant={isAllActive ? 'filled' : 'outlined'}
        onClick={() => {
          if (!isAllActive) onSelect(null, {});
        }}
      />

      {views.map((view) => {
        const active = selectedView?.id === view.id;
        const showDot = active && isModified;
        return (
          <Chip
            key={view.id}
            size="small"
            clickable
            color={active ? 'primary' : 'default'}
            variant={active ? 'filled' : 'outlined'}
            onClick={() => onSelect(view.id, view.filters)}
            label={
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{ pr: canWrite ? 0 : 0.5 }}
              >
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ fontWeight: active ? 600 : 500 }}
                >
                  {view.name}
                </Typography>
                {showDot ? (
                  <Tooltip title="Filters changed since this view was saved">
                    <Box
                      component="span"
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: 'warning.main',
                        display: 'inline-block',
                      }}
                    />
                  </Tooltip>
                ) : null}
                {canWrite ? (
                  <IconButton
                    size="small"
                    onClick={(e) => openMenu(e, view.id)}
                    sx={{ p: 0.25, ml: 0.25, color: active ? 'inherit' : 'text.secondary' }}
                    aria-label={`Manage view ${view.name}`}
                  >
                    <MoreHorizRoundedIcon fontSize="inherit" />
                  </IconButton>
                ) : null}
              </Stack>
            }
          />
        );
      })}

      {canWrite ? (
        <Button
          size="small"
          variant="text"
          startIcon={<AddRoundedIcon />}
          onClick={() => setDialogMode('create')}
          disabled={isMutating}
        >
          Save view
        </Button>
      ) : null}

      {canWrite && selectedView && isModified ? (
        <Button
          size="small"
          variant="outlined"
          color="warning"
          startIcon={<SaveRoundedIcon />}
          onClick={() => {
            void mutations.update.mutateAsync({
              id: selectedView.id,
              data: { filters: currentFilters },
            });
          }}
          disabled={isMutating}
        >
          Update view
        </Button>
      ) : null}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}
      >
        <MenuItem
          onClick={() => {
            void handleUpdateFromCurrent();
          }}
          disabled={isMutating}
        >
          <ListItemIcon>
            <SaveRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Update from current filters" />
        </MenuItem>
        <MenuItem onClick={handleRenameClick} disabled={isMutating}>
          <ListItemIcon>
            <DriveFileRenameOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Rename" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            void handleDeleteClick();
          }}
          disabled={isMutating}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Delete" />
        </MenuItem>
      </Menu>

      <SaveViewDialog
        open={dialogMode !== null}
        mode={dialogMode ?? 'create'}
        initialName={dialogMode === 'rename' ? (renameTarget?.name ?? '') : ''}
        onClose={closeDialog}
        onSubmit={handleSaveSubmit}
      />
    </Stack>
  );
}
