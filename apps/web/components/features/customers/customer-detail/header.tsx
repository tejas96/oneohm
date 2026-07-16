'use client';

import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { CustomerStatus } from '@tejas96/shared/types';
import { useState, type JSX } from 'react';

import { CUSTOMER_STATUS_CHIP_COLOR } from '../constants';
import { customerAvatarSx, stickyHeaderPaperSx } from './styles';
import { getCustomerDisplayName } from './utils';
import type { Customer } from '../hooks';

import { WhatsAppIcon } from '@/components/ui';
import { formatDate, formatPhoneForWhatsApp, getInitials, toTitleLabel } from '@/lib/utils';

interface CustomerDetailHeaderProps {
  customer: Customer & { customerCode?: string };
  assigneeName?: string;
  isInactive: boolean;
  onEdit: () => void;
  onAddProperty: () => void;
  onCreateQuote: () => void;
  onLogFollowup: () => void;
  showDelete?: boolean;
  deleteDisabled?: boolean;
  deleteTooltip?: string;
  onDelete?: () => void;
}

export function CustomerDetailHeader({
  customer,
  assigneeName,
  isInactive,
  onEdit,
  onAddProperty,
  onCreateQuote,
  onLogFollowup,
  showDelete = false,
  deleteDisabled = false,
  deleteTooltip,
  onDelete,
}: CustomerDetailHeaderProps): JSX.Element {
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const fullName = getCustomerDisplayName(customer);
  const phoneForWhatsApp = customer.phone ? formatPhoneForWhatsApp(customer.phone) : '';
  const statusColor = CUSTOMER_STATUS_CHIP_COLOR[customer.status] ?? 'default';
  const inactiveTooltip = 'This customer is inactive. Reactivate to continue this action.';

  return (
    <Paper elevation={0} sx={stickyHeaderPaperSx}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={2}
        alignItems={{ lg: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar sx={customerAvatarSx}>{getInitials(fullName)}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {fullName}
              </Typography>
              {customer.customerCode && (
                <Typography variant="caption" color="text.secondary">
                  {customer.customerCode}
                </Typography>
              )}
              <Chip label={toTitleLabel(customer.status)} color={statusColor} size="small" />
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block">
              Customer since {formatDate(customer.createdAt)}
              {assigneeName ? ` · Assigned to ${assigneeName}` : ''}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
          {customer.phone && (
            <Tooltip title="Call customer">
              <IconButton
                component="a"
                href={`tel:${customer.phone}`}
                size="small"
                aria-label="Call customer"
              >
                <PhoneOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {phoneForWhatsApp && (
            <Tooltip title="WhatsApp">
              <IconButton
                component="a"
                href={`https://wa.me/${phoneForWhatsApp}`}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                aria-label="WhatsApp customer"
              >
                <WhatsAppIcon className="size-4" />
              </IconButton>
            </Tooltip>
          )}
          {customer.email && (
            <Tooltip title="Email">
              <IconButton
                component="a"
                href={`mailto:${customer.email}`}
                size="small"
                aria-label="Email customer"
              >
                <EmailOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }}
          />

          <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={onEdit}>
            Edit
          </Button>
          <Tooltip title={isInactive ? inactiveTooltip : ''}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddBusinessOutlinedIcon />}
                onClick={onAddProperty}
                disabled={isInactive}
              >
                Property
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={isInactive ? inactiveTooltip : ''}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PostAddOutlinedIcon />}
                onClick={onCreateQuote}
                disabled={isInactive}
              >
                Quote
              </Button>
            </span>
          </Tooltip>
          <Button
            size="small"
            variant="contained"
            startIcon={<EventNoteOutlinedIcon />}
            onClick={onLogFollowup}
          >
            Follow-up
          </Button>
          {showDelete ? (
            <IconButton size="small" onClick={(event) => setMoreAnchor(event.currentTarget)}>
              <MoreVertOutlinedIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
      </Stack>

      {showDelete ? (
        <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
          <Tooltip title={deleteTooltip ?? ''}>
            <span>
              <MenuItem
                disabled={deleteDisabled}
                onClick={() => {
                  if (deleteDisabled) return;
                  setMoreAnchor(null);
                  onDelete?.();
                }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon>
                  <DeleteOutlinedIcon fontSize="small" sx={{ color: 'error.main' }} />
                </ListItemIcon>
                Delete Customer
              </MenuItem>
            </span>
          </Tooltip>
        </Menu>
      ) : null}

      {customer.status === CustomerStatus.INACTIVE && <AlertInactiveBanner />}
    </Paper>
  );
}

function AlertInactiveBanner(): JSX.Element {
  return (
    <Box
      sx={{
        mt: 1.5,
        px: 1.5,
        py: 1,
        borderRadius: 1,
        bgcolor: 'warning.light',
        color: 'warning.dark',
        fontSize: '0.75rem',
      }}
      role="alert"
    >
      This customer is inactive. Adding properties, creating quotes, and site visits are blocked
      until reactivated.
    </Box>
  );
}
