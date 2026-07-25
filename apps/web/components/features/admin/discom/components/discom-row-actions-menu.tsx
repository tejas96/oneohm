'use client';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import { IconButton, ListItemIcon, Menu, MenuItem } from '@mui/material';
import { type JSX, useState } from 'react';

import type { DiscomAdmin } from '../hooks/use-discoms-admin';

import { color } from '@/lib/theme/tokens';

interface DiscomRowActionsMenuProps {
  discom: DiscomAdmin;
  onEdit: (discom: DiscomAdmin) => void;
  onDuplicate: (discom: DiscomAdmin) => void;
  onToggleActive: (discom: DiscomAdmin) => void;
  onDelete: (discom: DiscomAdmin) => void;
}

export function DiscomRowActionsMenu({
  discom,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}: DiscomRowActionsMenuProps): JSX.Element {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        size="small"
        aria-label="Row actions"
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        sx={{ width: 30, height: 30 }}
      >
        <MoreVertIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        onClick={(e) => e.stopPropagation()}
        slotProps={{
          paper: {
            sx: { borderRadius: '16px', minWidth: 196, py: 0.75 },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onEdit(discom);
          }}
        >
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Edit DISCOM
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onDuplicate(discom);
          }}
        >
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          Duplicate as new
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onToggleActive(discom);
          }}
        >
          <ListItemIcon>
            <PowerSettingsNewIcon fontSize="small" />
          </ListItemIcon>
          {discom.isActive ? 'Deactivate' : 'Activate'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onDelete(discom);
          }}
          sx={{ color: color.danger }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" sx={{ color: color.danger }} />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
    </>
  );
}
