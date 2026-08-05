'use client';

import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Divider, IconButton, ListItemIcon, Menu, MenuItem, Tooltip } from '@mui/material';
import { useRouter } from 'next/navigation';
import { type JSX, useState } from 'react';

import {
  formatDeleteBlockTooltip,
  getPropertyDeleteBlockReasons,
} from '../utils/delete-eligibility';

import { GuardedFeatureAction } from '@/components/shared/guards';
import { buildRoute, ROUTES } from '@/lib/config/routes';

export interface PropertyRowActionsTarget {
  id: string;
  customerId: string;
  latestQuoteId?: string;
  propertyName?: string;
  propertyCode?: string;
  deleteBlockReasons?: string[];
}

interface PropertyRowActionsMenuProps {
  property: PropertyRowActionsTarget;
  onMarkAsLost: (property: PropertyRowActionsTarget) => void;
  onRequestDelete?: (property: PropertyRowActionsTarget) => void;
  showDelete?: boolean;
}

export function PropertyRowActionsMenu({
  property,
  onMarkAsLost,
  onRequestDelete,
  showDelete = false,
}: PropertyRowActionsMenuProps): JSX.Element {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClose = (): void => setAnchorEl(null);
  const deleteReasons = getPropertyDeleteBlockReasons(property);
  const deleteDisabled = deleteReasons.length > 0;
  const deleteTooltip = formatDeleteBlockTooltip(deleteReasons);

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        aria-label="Row actions"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { elevation: 2, sx: { minWidth: 180 } } }}
      >
        <MenuItem
          onClick={() => {
            handleClose();
            void router.push(buildRoute(ROUTES.PROPERTIES.DETAIL, { id: property.id }));
          }}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            void router.push(buildRoute(ROUTES.PROPERTIES.EDIT, { id: property.id }));
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Property
        </MenuItem>

        {property.latestQuoteId && (
          <MenuItem
            onClick={() => {
              handleClose();
              void router.push(buildRoute(ROUTES.QUOTES.DETAIL, { id: property.latestQuoteId }));
            }}
          >
            <ListItemIcon>
              <VisibilityIcon fontSize="small" />
            </ListItemIcon>
            View Quote
          </MenuItem>
        )}

        <MenuItem
          onClick={() => {
            handleClose();
            void router.push(
              `${ROUTES.QUOTES.NEW}?propertyId=${property.id}&customerId=${property.customerId}`,
            );
          }}
        >
          <ListItemIcon>
            <NoteAddIcon fontSize="small" />
          </ListItemIcon>
          Create Quote
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            onMarkAsLost(property);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <WarningAmberIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          Mark as Lost
        </MenuItem>

        {showDelete && <Divider />}
        {showDelete && (
          <GuardedFeatureAction feature="properties.delete" label="Delete property">
            <Tooltip title={deleteTooltip ?? ''}>
              <span>
                <MenuItem
                  disabled={deleteDisabled}
                  onClick={() => {
                    if (deleteDisabled) return;
                    handleClose();
                    onRequestDelete?.(property);
                  }}
                  sx={{ color: 'error.main' }}
                >
                  <ListItemIcon>
                    <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
                  </ListItemIcon>
                  Delete Property
                </MenuItem>
              </span>
            </Tooltip>
          </GuardedFeatureAction>
        )}
      </Menu>
    </>
  );
}
