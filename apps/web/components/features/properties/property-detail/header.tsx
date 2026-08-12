'use client';

import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import {
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { PropertyStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { useState, type JSX, type ReactNode } from 'react';

import { LEAD_TEMPERATURE_TONE, PROPERTY_TYPE_LABELS } from '../constants';
import type { CustomerPropertyResponse } from '../hooks';
import { getPropertyDisplayName } from '../utils';

import {
  PROPERTY_STATUS_TONE,
  PROPERTY_TYPE_TONE,
} from '@/components/features/customers/constants';
import {
  DetailCard,
  IconCircle,
  TonePill,
  type DetailTone,
} from '@/components/features/customers/customer-detail/primitives';
import { WhatsAppIcon } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { formatDate, formatPhoneForWhatsApp, toTitleLabel } from '@/lib/utils';

export interface PropertyHeaderSignal {
  id: string;
  label: string;
  tone: DetailTone;
  onClick?: () => void;
}

interface PropertyDetailHeaderProps {
  property: CustomerPropertyResponse;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  isInactiveCustomer: boolean;
  quoteLocked: boolean;
  lockedQuoteNumber?: string;
  hasProject: boolean;
  onEdit: () => void;
  onCreateQuote: () => void;
  onGoToProject: () => void;
  onLogFollowup: () => void;
  onMarkLost: () => void;
  showDelete?: boolean;
  deleteDisabled?: boolean;
  deleteTooltip?: string;
  onDelete?: () => void;
  /**
   * What needs doing about this site — rendered as pills inside the header
   * rather than as the separate "Needs attention" band that used to sit below
   * it. The band cost a full row of the screen to carry two short strings that
   * repeated the tiles underneath.
   */
  signals?: PropertyHeaderSignal[];
}

const INACTIVE_TOOLTIP = 'This customer is inactive. Reactivate to continue this action.';

/** Sites where a "lost" outcome is still meaningful — a won or lost site is settled. */
const LOSABLE_STATUSES: readonly PropertyStatus[] = [
  PropertyStatus.ACTIVE,
  PropertyStatus.PENDING_VERIFICATION,
];

/**
 * One inline fact. Facts that can be acted on (the address, the customer, the
 * phone) render as links, which is what removed the row of bare icon buttons
 * the header used to carry: you call the customer by clicking their number,
 * where you were already looking.
 */
function Fact({
  icon,
  children,
  href,
  newTab,
  label,
}: {
  icon: ReactNode;
  children: ReactNode;
  href?: string;
  /** Opens in a new tab. Never set this on `tel:` — it strands an empty tab. */
  newTab?: boolean;
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

  /* Internal routes go through NextLink so they prefetch; everything else — */
  /* map links, tel:, wa.me — is a plain anchor.                             */
  const isInternal = href.startsWith('/');

  return (
    <Box
      component={isInternal ? NextLink : 'a'}
      href={href}
      aria-label={label}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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

export function PropertyDetailHeader({
  property,
  customerId,
  customerName,
  customerPhone,
  isInactiveCustomer,
  quoteLocked,
  lockedQuoteNumber,
  hasProject,
  onEdit,
  onCreateQuote,
  onGoToProject,
  onLogFollowup,
  onMarkLost,
  showDelete = false,
  deleteDisabled = false,
  deleteTooltip,
  onDelete,
  signals = [],
}: PropertyDetailHeaderProps): JSX.Element {
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  const siteName = getPropertyDisplayName(property);
  const statusTone = PROPERTY_STATUS_TONE[property.status] ?? 'neutral';
  const typeTone = PROPERTY_TYPE_TONE[property.propertyType] ?? 'neutral';
  const address = [property.address, property.city, property.state, property.pincode]
    .filter(Boolean)
    .join(', ');
  const phoneForWhatsApp = customerPhone ? formatPhoneForWhatsApp(customerPhone) : '';

  /*
   * A site's temperature only means anything while the site is still being
   * chased, and "lost" is only an outcome you can still choose then. Printing
   * "Hot lead" on a site that converted two months ago is noise dressed as a
   * signal.
   */
  const isInPlay = LOSABLE_STATUSES.includes(property.status);
  const canMarkLost = isInPlay;

  /*
   * GPS beats the typed address when we have it — a pin drops on the roof, a
   * search string drops on whatever the geocoder guesses.
   */
  const mapHref =
    property.gpsCoordinates?.latitude != null && property.gpsCoordinates.longitude != null
      ? `https://maps.google.com/?q=${property.gpsCoordinates.latitude},${property.gpsCoordinates.longitude}`
      : address
        ? `https://maps.google.com/?q=${encodeURIComponent(address)}`
        : undefined;

  const quoteBlockedReason = isInactiveCustomer
    ? INACTIVE_TOOLTIP
    : quoteLocked
      ? `Locked by accepted quote ${lockedQuoteNumber ?? ''}`.trim()
      : '';

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
          <IconCircle tone={typeTone} size={40}>
            <HomeWorkOutlinedIcon />
          </IconCircle>

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
                {siteName}
              </Typography>
              <TonePill label={toTitleLabel(property.status)} tone={statusTone} dot />
              {property.isPrimary && <TonePill label="Primary" tone="accent" />}
              {isInPlay && (
                <TonePill
                  label={`${toTitleLabel(property.leadTemperature)} lead`}
                  tone={LEAD_TEMPERATURE_TONE[property.leadTemperature] ?? 'neutral'}
                  dot
                />
              )}
              {property.propertyCode && (
                <Typography
                  component="span"
                  sx={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    color: 'var(--ds-text-tertiary)',
                  }}
                >
                  {property.propertyCode}
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
              {address && (
                <Fact
                  icon={<PlaceOutlinedIcon />}
                  href={mapHref}
                  newTab
                  label="Open in Google Maps"
                >
                  {address}
                </Fact>
              )}
              <Fact
                icon={<PersonOutlineOutlinedIcon />}
                href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: customerId })}
                label="Open customer"
              >
                {customerName}
              </Fact>
              {customerPhone && (
                <Fact
                  icon={<PhoneOutlinedIcon />}
                  href={`tel:${customerPhone}`}
                  label="Call customer"
                >
                  {customerPhone}
                </Fact>
              )}
              {phoneForWhatsApp && (
                <Fact
                  icon={<WhatsAppIcon className="size-3.5" />}
                  href={`https://wa.me/${phoneForWhatsApp}`}
                  newTab
                  label="Message on WhatsApp"
                >
                  WhatsApp
                </Fact>
              )}
              <Fact icon={<HomeWorkOutlinedIcon />}>
                {PROPERTY_TYPE_LABELS[property.propertyType] ?? toTitleLabel(property.propertyType)}
                {property.createdAt ? ` · Added ${formatDate(property.createdAt)}` : ''}
              </Fact>
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
          <Tooltip title={quoteBlockedReason}>
            <Box component="span" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PostAddOutlinedIcon />}
                onClick={onCreateQuote}
                disabled={isInactiveCustomer || quoteLocked}
              >
                New quote
              </Button>
            </Box>
          </Tooltip>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FolderOpenOutlinedIcon />}
            onClick={onGoToProject}
            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
          >
            {hasProject ? 'Open project' : 'Convert to project'}
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<EventNoteOutlinedIcon />}
            onClick={onLogFollowup}
          >
            Log follow-up
          </Button>
          {(canMarkLost || showDelete) && (
            <IconButton
              size="small"
              aria-label="More actions"
              onClick={(event) => setMoreAnchor(event.currentTarget)}
            >
              <MoreVertOutlinedIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </Stack>

      {(canMarkLost || showDelete) && (
        <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
          {canMarkLost && (
            <MenuItem
              onClick={() => {
                setMoreAnchor(null);
                onMarkLost();
              }}
            >
              <ListItemIcon>
                <HighlightOffOutlinedIcon fontSize="small" />
              </ListItemIcon>
              Mark as lost
            </MenuItem>
          )}
          {canMarkLost && showDelete && <Divider />}
          {showDelete && (
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
                  Delete site
                </MenuItem>
              </span>
            </Tooltip>
          )}
        </Menu>
      )}

      {isInactiveCustomer && (
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
          {customerName} is inactive. Creating quotes and converting this site stay blocked until
          they are reactivated.
        </Box>
      )}
    </DetailCard>
  );
}
