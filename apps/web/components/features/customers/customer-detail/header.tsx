'use client';

import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { CustomerStatus } from '@tejas96/shared/types';
import { useState, type JSX, type ReactNode } from 'react';

import { CUSTOMER_STATUS_TONE } from '../constants';
import { DetailCard, TonePill, type DetailTone } from './primitives';
import { customerAvatarSx } from './styles';
import { getCustomerDisplayName } from './utils';
import type { Customer } from '../hooks';

import { WhatsAppIcon } from '@/components/ui';
import { formatDate, formatPhoneForWhatsApp, getInitials, toTitleLabel } from '@/lib/utils';

export interface HeaderSignal {
  id: string;
  label: string;
  tone: DetailTone;
  onClick?: () => void;
}

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
  /**
   * What needs doing about this customer. Rendered as pills inside the header
   * rather than as the separate warning banner that used to sit below it — the
   * band cost a full row of the screen to carry two short strings.
   */
  signals?: HeaderSignal[];
}

const INACTIVE_TOOLTIP = 'This customer is inactive. Reactivate to continue this action.';

/**
 * One inline fact. Facts that can be acted on (phone, email) render as links,
 * so the three separate icon buttons the header used to carry are gone — you
 * call a customer by clicking their number, which is where you were looking.
 */
function Fact({
  icon,
  children,
  href,
  external,
  label,
}: {
  icon: ReactNode;
  children: ReactNode;
  href?: string;
  external?: boolean;
  label?: string;
}): JSX.Element {
  const content = (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.625}
      sx={{
        minWidth: 0,
        fontSize: '0.75rem',
        color: 'var(--ds-text-secondary)',
        '& > svg': { fontSize: 14, color: 'var(--ds-text-tertiary)', flexShrink: 0 },
      }}
    >
      {icon}
      <Box component="span" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Box>
    </Stack>
  );

  if (!href) return content;

  return (
    <Box
      component="a"
      href={href}
      aria-label={label}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      sx={{
        textDecoration: 'none',
        borderRadius: 'var(--radius-rf-xs)',
        transition: 'color 120ms var(--ease-standard)',
        '&:hover': { color: 'var(--ds-link)', '& span': { textDecoration: 'underline' } },
        '&:focus-visible': { outline: '2px solid var(--ds-accent)', outlineOffset: 2 },
      }}
    >
      {content}
    </Box>
  );
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
  signals = [],
}: CustomerDetailHeaderProps): JSX.Element {
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const fullName = getCustomerDisplayName(customer);
  const phoneForWhatsApp = customer.phone ? formatPhoneForWhatsApp(customer.phone) : '';
  const statusTone = CUSTOMER_STATUS_TONE[customer.status] ?? 'neutral';
  const location = [customer.city, customer.state].filter(Boolean).join(', ');

  return (
    <DetailCard
      sx={{
        position: 'relative',
        overflow: 'hidden',
        mb: 2,
        /*
         * The one accent gesture on the page: an ambient brand bloom bleeding
         * from the top-right corner. It is atmosphere — nothing sits on it and
         * it never tints a control.
         */
        '&::after': {
          content: '""',
          position: 'absolute',
          top: -110,
          right: -70,
          width: 320,
          height: 220,
          background: 'var(--gradient-glow)',
          opacity: 0.5,
          pointerEvents: 'none',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        gap={2}
        justifyContent="space-between"
        alignItems={{ lg: 'flex-start' }}
        sx={{ position: 'relative', zIndex: 1 }}
      >
        <Stack direction="row" gap={1.75} sx={{ minWidth: 0 }}>
          <Avatar sx={customerAvatarSx}>{getInitials(fullName)}</Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" useFlexGap>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: '1.0625rem', md: '1.25rem' },
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  color: 'var(--ds-text-primary)',
                  minWidth: 0,
                }}
              >
                {fullName}
              </Typography>
              <TonePill label={toTitleLabel(customer.status)} tone={statusTone} dot />
              {customer.customerCode && (
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    color: 'var(--ds-text-tertiary)',
                  }}
                >
                  {customer.customerCode}
                </Typography>
              )}
            </Stack>

            <Stack
              direction="row"
              flexWrap="wrap"
              useFlexGap
              gap={{ xs: 1, sm: 1.75 }}
              sx={{ mt: 1 }}
            >
              {customer.phone && (
                <Fact
                  icon={<PhoneOutlinedIcon />}
                  href={`tel:${customer.phone}`}
                  label="Call customer"
                >
                  {customer.phone}
                </Fact>
              )}
              {phoneForWhatsApp && (
                <Fact
                  icon={<WhatsAppIcon className="size-3.5" />}
                  href={`https://wa.me/${phoneForWhatsApp}`}
                  external
                  label="Message on WhatsApp"
                >
                  WhatsApp
                </Fact>
              )}
              {customer.email && (
                <Fact
                  icon={<EmailOutlinedIcon />}
                  href={`mailto:${customer.email}`}
                  label="Email customer"
                >
                  {customer.email}
                </Fact>
              )}
              {location && <Fact icon={<LocationOnOutlinedIcon />}>{location}</Fact>}
              <Fact icon={<PersonOutlineOutlinedIcon />}>{assigneeName ?? 'Unassigned'}</Fact>
              <Fact icon={<CakeOutlinedIcon />}>Since {formatDate(customer.createdAt)}</Fact>
            </Stack>

            {signals.length > 0 && (
              <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75} sx={{ mt: 1.5 }}>
                {signals.map((signal) => (
                  <TonePill
                    key={signal.id}
                    label={signal.label}
                    tone={signal.tone}
                    dot
                    onClick={signal.onClick}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>

        <Stack
          direction="row"
          gap={0.75}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ flexShrink: 0 }}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditOutlinedIcon />}
            onClick={onEdit}
            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
          >
            Edit
          </Button>
          <Tooltip title={isInactive ? INACTIVE_TOOLTIP : ''}>
            <Box component="span" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddBusinessOutlinedIcon />}
                onClick={onAddProperty}
                disabled={isInactive}
              >
                Add site
              </Button>
            </Box>
          </Tooltip>
          <Tooltip title={isInactive ? INACTIVE_TOOLTIP : ''}>
            <Box component="span" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PostAddOutlinedIcon />}
                onClick={onCreateQuote}
                disabled={isInactive}
              >
                New quote
              </Button>
            </Box>
          </Tooltip>
          <Button
            size="small"
            variant="contained"
            startIcon={<EventNoteOutlinedIcon />}
            onClick={onLogFollowup}
          >
            Log follow-up
          </Button>
          {showDelete ? (
            <IconButton
              size="small"
              aria-label="More actions"
              onClick={(event) => setMoreAnchor(event.currentTarget)}
            >
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
                sx={{ color: 'var(--ds-danger)' }}
              >
                <ListItemIcon>
                  <DeleteOutlinedIcon fontSize="small" sx={{ color: 'var(--ds-danger)' }} />
                </ListItemIcon>
                Delete customer
              </MenuItem>
            </span>
          </Tooltip>
        </Menu>
      ) : null}

      {customer.status === CustomerStatus.INACTIVE && (
        <Box
          role="alert"
          sx={{
            position: 'relative',
            zIndex: 1,
            mt: 2,
            px: 1.5,
            py: 1,
            borderRadius: 'var(--radius-rf-md)',
            bgcolor: 'var(--ds-warning-bg)',
            color: 'var(--ds-warning-main)',
            fontSize: '0.75rem',
            lineHeight: 1.5,
          }}
        >
          This customer is inactive. Adding sites, creating quotes and site visits stay blocked
          until you reactivate them.
        </Box>
      )}
    </DetailCard>
  );
}
