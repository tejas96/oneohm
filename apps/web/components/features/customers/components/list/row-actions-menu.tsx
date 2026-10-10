'use client';

import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Divider, IconButton, ListItemIcon, Menu, MenuItem, Tooltip } from '@mui/material';
import { useRouter } from 'next/navigation';
import { type JSX, useState } from 'react';

import { customerLinks } from './links';
import type { Customer } from '../../hooks/use-customers';

import {
  formatDeleteBlockTooltip,
  getCustomerDeleteBlockReasons,
} from '@/components/features/properties/utils/delete-eligibility';
import { useGatedAction } from '@/lib/rbac';

/**
 * The customer row's ⋮ menu. Moved here unchanged from `customer-list-page.tsx`
 * — same items, same gates, same delete-block rules; only the trigger is
 * restyled to the row's round button.
 */
export function RowActionsMenu({
  customer,
  showDelete = false,
  onRequestDelete,
}: {
  customer: Customer;
  showDelete?: boolean;
  onRequestDelete?: (customer: Customer) => void;
}): JSX.Element {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClose = (): void => setAnchorEl(null);
  const deleteReasons = getCustomerDeleteBlockReasons(customer);
  const deleteDisabled = deleteReasons.length > 0;
  const deleteCustomer = useGatedAction(
    'customers.delete',
    () => onRequestDelete?.(customer),
    'Delete customer',
  );
  const deleteTooltip = formatDeleteBlockTooltip(deleteReasons);
  const editCustomer = useGatedAction(
    'customers.edit',
    () => {
      handleClose();
      void router.push(customerLinks.edit(customer.id));
    },
    'Edit customer',
  );
  // Same route as the "new customer" wizard, so its own gate cannot tell this
  // apart — see the note on the other "Add site" buttons.
  const addProperty = useGatedAction(
    'properties.create',
    () => {
      handleClose();
      void router.push(customerLinks.addSite(customer.id));
    },
    'Add property',
  );

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        aria-label="Row actions"
        title="More actions"
        className="size-[34px] text-foreground-secondary transition-transform duration-200 ease-calm hover:scale-[1.08] hover:bg-background-tertiary motion-reduce:transition-none"
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
            void router.push(customerLinks.customer(customer.id));
          }}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>

        <MenuItem
          onClick={editCustomer.onGatedClick}
          aria-disabled={!editCustomer.allowed}
          sx={{ opacity: editCustomer.allowed ? 1 : 0.5 }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Customer
        </MenuItem>

        <MenuItem
          onClick={addProperty.onGatedClick}
          aria-disabled={!addProperty.allowed}
          sx={{ opacity: addProperty.allowed ? 1 : 0.5 }}
        >
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          Add Property
        </MenuItem>

        <Divider />

        {showDelete ? (
          <Tooltip title={deleteTooltip ?? ''}>
            <span>
              <MenuItem
                disabled={deleteDisabled}
                onClick={() => {
                  if (deleteDisabled) return;
                  handleClose();
                  deleteCustomer.onGatedClick();
                }}
                aria-disabled={!deleteCustomer.allowed}
                sx={{ color: 'error.main', ...(deleteCustomer.allowed ? {} : { opacity: 0.5 }) }}
              >
                <ListItemIcon>
                  <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
                </ListItemIcon>
                Delete Customer
              </MenuItem>
            </span>
          </Tooltip>
        ) : null}
      </Menu>
    </>
  );
}
