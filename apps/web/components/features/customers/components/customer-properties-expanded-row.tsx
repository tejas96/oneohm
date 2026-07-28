'use client';

import AddIcon from '@mui/icons-material/Add';
import AgricultureOutlinedIcon from '@mui/icons-material/AgricultureOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import DomainOutlinedIcon from '@mui/icons-material/DomainOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FactoryOutlinedIcon from '@mui/icons-material/FactoryOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { Box, Button, CircularProgress, Skeleton } from '@mui/material';
import { PropertyStatus, PropertyType } from '@tejas96/shared/types';
import { useRouter } from 'next/navigation';
import { type ComponentType, type JSX, useCallback, useMemo, useState } from 'react';

import {
  getSiteStageIndex,
  PROPERTY_STATUS_TONE,
  PROPERTY_TYPE_TONE,
  QUOTE_STATUS_TONE,
  SITE_STAGES,
} from '../constants';
import {
  useCustomerProperties,
  type CustomerPropertyResponse,
} from '../hooks/use-customer-properties';

import {
  PropertyRowActionsMenu,
  type PropertyRowActionsTarget,
} from '@/components/features/properties/components/property-row-actions-menu';
import { PROPERTY_TYPE_LABELS } from '@/components/features/properties/constants';
import { useDeleteProperty } from '@/components/features/properties/hooks/use-properties';
import { MarkAsLostDialog } from '@/components/features/properties/property-detail/mark-as-lost-dialog';
import { ORG_ADMIN_ROLES } from '@/components/features/properties/utils/delete-eligibility';
import { CRM_TONE_FILL, CrmStatusPill, type CrmTone } from '@/components/shared/crm-table';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import { color, crm, gradient, radius, shadow } from '@/lib/theme/tokens';
import { formatCurrency, toTitleLabel } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Static maps
// ============================================================================

/** One glyph per site type — the fastest way to scan a mixed portfolio. */
const TYPE_ICON: Record<PropertyType, ComponentType<{ sx?: object }>> = {
  [PropertyType.RESIDENTIAL]: HomeOutlinedIcon,
  [PropertyType.RESIDENTIAL_APARTMENT]: ApartmentOutlinedIcon,
  [PropertyType.COMMERCIAL]: StorefrontOutlinedIcon,
  [PropertyType.INDUSTRIAL]: FactoryOutlinedIcon,
  [PropertyType.AGRICULTURAL]: AgricultureOutlinedIcon,
  [PropertyType.INSTITUTIONAL]: SchoolOutlinedIcon,
};

/** Column tracks for the sites sub-grid, straight from the theme. */
const SITES_GRID_TEMPLATE = [
  crm['sites-col-site'],
  crm['sites-col-type'],
  crm['sites-col-stage'],
  crm['sites-col-quote'],
  crm['sites-col-cost'],
  crm['sites-col-discom'],
  crm['sites-col-status'],
  crm['sites-col-added'],
  crm['sites-col-actions'],
].join(' ');

const SITES_HEADERS = [
  'Site',
  'Type',
  'Stage',
  'Quote',
  'Quoted cost',
  'Discom · load',
  'Status',
  'Added',
  '',
] as const;

/** The one right-aligned column (quoted cost), by header index. */
const RIGHT_ALIGNED_HEADER_INDEX = 4;

// ============================================================================
// Shell
// ============================================================================

/**
 * The sunken well the panel content sits in, with its ambient brand glow.
 *
 * Every state — loading, error, empty, populated — renders inside this so the
 * expanded row's geometry never jumps as data arrives.
 */
function SitesPanelShell({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <Box
      sx={{
        pl: crm['sites-indent'],
        pr: crm['row-gutter'],
        pb: 1.75,
        backgroundColor: color.surface,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          backgroundColor: color['canvas-sunken'],
          borderRadius: radius['rf-lg'],
          padding: crm['sites-panel-pad'],
          overflow: 'hidden',
          animation: 'crmPanelDrop var(--dur-standard) var(--ease-enter)',
          '@keyframes crmPanelDrop': {
            from: { opacity: 0, transform: 'translateY(-6px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: `calc(${crm['sites-glow-size']} / -2)`,
            right: -60,
            width: crm['sites-glow-size'],
            height: crm['sites-glow-size'],
            background: gradient.glow,
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ position: 'relative' }}>{children}</Box>
      </Box>
    </Box>
  );
}

/** A summary stat in the panel header — value in mono, label in prose. */
function SummaryPill({ value, label }: { value: string; label: string }): JSX.Element {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: crm['sites-summary-pill-height'],
        px: 1.25,
        borderRadius: radius.pill,
        backgroundColor: color.surface,
        boxShadow: shadow.e1,
        fontSize: crm['text-row-sm'],
        color: color['text-secondary'],
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        component="span"
        sx={{
          fontFamily: 'var(--font-mono)',
          color: color['text-primary'],
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Box>
      {label}
    </Box>
  );
}

// ============================================================================
// Site row
// ============================================================================

interface SiteRowProps {
  property: CustomerPropertyResponse;
  index: number;
  isOrgAdmin: boolean;
  onMarkAsLost: (property: PropertyRowActionsTarget) => void;
  onRequestDelete: (property: PropertyRowActionsTarget) => void;
  onOpen: (propertyId: string) => void;
}

function SiteRow({
  property,
  index,
  isOrgAdmin,
  onMarkAsLost,
  onRequestDelete,
  onOpen,
}: SiteRowProps): JSX.Element {
  const typeTone: CrmTone = PROPERTY_TYPE_TONE[property.propertyType] ?? 'neutral';
  const TypeIcon = TYPE_ICON[property.propertyType] ?? HomeOutlinedIcon;
  const statusTone: CrmTone = PROPERTY_STATUS_TONE[property.status] ?? 'neutral';

  const stageIndex = getSiteStageIndex(property);
  const stagePct = `${Math.round(((stageIndex + 1) / SITE_STAGES.length) * 100)}%`;
  // A lost or stalled site keeps its progress bar but recolours it, so the bar
  // never implies healthy momentum on a site that has none.
  const stageTone: CrmTone =
    property.status === PropertyStatus.INACTIVE
      ? 'danger'
      : property.status === PropertyStatus.PENDING_VERIFICATION
        ? 'warning'
        : stageIndex >= 4
          ? 'success'
          : 'accent';

  const loadParts: string[] = [];
  if (property.sanctionedLoad !== undefined)
    loadParts.push(`${property.sanctionedLoad.toFixed(2)} kW`);
  if (property.connectionType) loadParts.push(toTitleLabel(property.connectionType));

  const cellSx = { minWidth: 0, display: 'flex', alignItems: 'center' } as const;

  return (
    <Box
      onClick={() => onOpen(property.id)}
      sx={{
        display: 'grid',
        gridTemplateColumns: SITES_GRID_TEMPLATE,
        alignItems: 'center',
        px: crm['sites-gutter'],
        py: crm['sites-row-pad-y'],
        minHeight: crm['sites-row-height'],
        cursor: 'pointer',
        transition: 'background var(--dur-micro) var(--ease-standard)',
        backgroundColor: index % 2 ? color['surface-alt'] : color.surface,
        '&:hover': { backgroundColor: color['accent-subtle'] },
      }}
    >
      {/* Site — icon, code, primary badge, address */}
      <Box sx={{ ...cellSx, gap: 1.125, pr: 1.25 }}>
        <Box
          component="span"
          aria-hidden
          sx={{
            width: crm['sites-icon-size'],
            height: crm['sites-icon-size'],
            borderRadius: '50%',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: color.surface,
            color: CRM_TONE_FILL[typeTone],
            boxShadow: shadow.e1,
          }}
        >
          <TypeIcon sx={{ fontSize: 15 }} />
        </Box>
        <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <Box
            component="span"
            sx={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 500,
              color: color['text-primary'],
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {property.propertyCode ?? property.propertyName ?? 'Unnamed site'}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            {property.isPrimary ? (
              <Box
                component="span"
                sx={{
                  flexShrink: 0,
                  height: crm['sites-primary-chip-height'],
                  px: 0.75,
                  borderRadius: radius.pill,
                  backgroundColor: color['accent-subtle'],
                  color: color['accent-ink'],
                  fontSize: crm['text-overline-xs'],
                  fontWeight: 700,
                  letterSpacing: crm['text-overline-xs-track'],
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Primary
              </Box>
            ) : null}
            <Box
              component="span"
              sx={{
                fontSize: crm['text-row-xs'],
                color: color['text-tertiary'],
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {property.address ?? property.city ?? '—'}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Type */}
      <Box sx={cellSx}>
        <CrmStatusPill
          label={PROPERTY_TYPE_LABELS[property.propertyType] ?? toTitleLabel(property.propertyType)}
          tone={typeTone}
          dot={false}
          size="sm"
        />
      </Box>

      {/* Stage */}
      <Box sx={{ ...cellSx, flexDirection: 'column', alignItems: 'stretch', gap: 0.5, pr: 1.75 }}>
        <Box
          component="span"
          sx={{
            fontSize: crm['text-row-xs'],
            color: color['text-secondary'],
            whiteSpace: 'nowrap',
          }}
        >
          {SITE_STAGES[stageIndex]}
        </Box>
        <Box
          sx={{
            height: crm['sites-stage-bar-height'],
            borderRadius: radius.pill,
            backgroundColor: color['neutral-bg'],
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: stagePct,
              borderRadius: radius.pill,
              backgroundColor: CRM_TONE_FILL[stageTone],
            }}
          />
        </Box>
      </Box>

      {/* Quote */}
      <Box sx={cellSx}>
        {property.latestQuoteStatus ? (
          <CrmStatusPill
            label={toTitleLabel(property.latestQuoteStatus)}
            tone={QUOTE_STATUS_TONE[property.latestQuoteStatus] ?? 'neutral'}
            dot={false}
            size="sm"
          />
        ) : (
          <Box
            component="span"
            sx={{
              fontSize: crm['text-row-sm'],
              color: color['text-tertiary'],
              fontStyle: 'italic',
            }}
          >
            Not quoted
          </Box>
        )}
      </Box>

      {/* Quoted cost */}
      <Box
        sx={{
          ...cellSx,
          justifyContent: 'flex-end',
          pr: 1.75,
          fontFamily: 'var(--font-mono)',
          fontSize: crm['text-row'],
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          color:
            property.latestQuoteFinalPrice != null ? color['text-primary'] : color['text-tertiary'],
        }}
      >
        {property.latestQuoteFinalPrice != null
          ? formatCurrency(Number(property.latestQuoteFinalPrice))
          : '—'}
      </Box>

      {/* Discom · load */}
      <Box sx={{ ...cellSx, flexDirection: 'column', alignItems: 'flex-start', gap: '1px' }}>
        <Box
          component="span"
          sx={{
            fontSize: crm['text-row-sm'],
            color: color['text-secondary'],
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {property.discom?.label ?? '—'}
        </Box>
        {loadParts.length > 0 ? (
          <Box
            component="span"
            sx={{
              fontFamily: 'var(--font-mono)',
              fontSize: crm['text-row-2xs'],
              color: color['text-tertiary'],
              whiteSpace: 'nowrap',
            }}
          >
            {loadParts.join(' · ')}
          </Box>
        ) : null}
      </Box>

      {/* Status */}
      <Box sx={cellSx}>
        <CrmStatusPill label={toTitleLabel(property.status)} tone={statusTone} size="xs" />
      </Box>

      {/* Added */}
      <Box
        sx={{
          ...cellSx,
          fontSize: crm['text-row-sm'],
          color: color['text-tertiary'],
          whiteSpace: 'nowrap',
        }}
      >
        {new Date(property.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        })}
      </Box>

      {/* Actions */}
      <Box sx={{ ...cellSx, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        <PropertyRowActionsMenu
          property={property}
          onMarkAsLost={onMarkAsLost}
          onRequestDelete={onRequestDelete}
          showDelete={isOrgAdmin}
        />
      </Box>
    </Box>
  );
}

// ============================================================================
// Panel
// ============================================================================

interface CustomerPropertiesExpandedRowProps {
  customerId: string;
  /**
   * Site count from the list payload's `sitePortfolio`, used to size the
   * loading skeleton so the panel opens at roughly its final height instead of
   * snapping taller when the fetch lands.
   */
  expectedSiteCount?: number;
}

/**
 * The nested sites sub-grid revealed when a customer row is expanded.
 *
 * Sites are fetched per customer on expand rather than embedded in the list
 * payload: a customer can own dozens of them, and the list page only ever has
 * a handful of rows open at once. The list's `sitePortfolio` aggregate carries
 * everything the *collapsed* row needs, so nothing here blocks the grid.
 */
export function CustomerPropertiesExpandedRow({
  customerId,
  expectedSiteCount,
}: CustomerPropertiesExpandedRowProps): JSX.Element {
  const router = useRouter();
  const { hasAnyRole } = useAuth();
  const isOrgAdmin = hasAnyRole([...ORG_ADMIN_ROLES]);
  const deletePropertyMutation = useDeleteProperty();
  const deleteConfirmation = useDeleteConfirmation<PropertyRowActionsTarget>({
    mutation: deletePropertyMutation,
    getId: (property) => property.id,
  });

  const {
    data: properties = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCustomerProperties(customerId);

  const [markLostTarget, setMarkLostTarget] = useState<PropertyRowActionsTarget | null>(null);

  const handleMarkAsLost = useCallback((property: PropertyRowActionsTarget): void => {
    setMarkLostTarget(property);
  }, []);

  const handleOpenSite = useCallback(
    (propertyId: string): void => {
      void router.push(buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId }));
    },
    [router],
  );

  const handleAddSite = useCallback((): void => {
    void router.push(buildRoute(ROUTES.ONBOARDING.NEW, undefined, { customerId }));
  }, [router, customerId]);

  const summary = useMemo(() => {
    const quotedTotal = properties.reduce(
      (sum, p) => sum + (p.latestQuoteFinalPrice != null ? Number(p.latestQuoteFinalPrice) : 0),
      0,
    );
    const capacity = properties.reduce(
      (sum, p) => sum + (p.latestQuoteSystemSizeKw != null ? Number(p.latestQuoteSystemSizeKw) : 0),
      0,
    );
    const converted = properties.filter((p) => p.status === PropertyStatus.CONVERTED).length;
    return { quotedTotal, capacity, converted };
  }, [properties]);

  if (isLoading) {
    return (
      <SitesPanelShell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.25 }}>
          <CircularProgress size={14} />
          <Box
            component="span"
            sx={{ fontSize: crm['text-row-sm'], color: color['text-secondary'] }}
          >
            Loading sites…
          </Box>
        </Box>
        <Box
          sx={{
            backgroundColor: color.surface,
            borderRadius: radius['rf-md'],
            boxShadow: shadow.e1,
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: Math.min(Math.max(expectedSiteCount ?? 2, 1), 4) }).map((_, i) => (
            <Box
              key={i}
              sx={{
                px: crm['sites-gutter'],
                py: crm['sites-row-pad-y'],
                minHeight: crm['sites-row-height'],
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Skeleton variant="text" width="45%" height={14} />
            </Box>
          ))}
        </Box>
      </SitesPanelShell>
    );
  }

  if (isError) {
    return (
      <SitesPanelShell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ErrorOutlineIcon color="error" fontSize="small" />
          <Box component="span" sx={{ flex: 1, fontSize: crm['text-row-sm'], color: color.danger }}>
            {error?.message || 'Failed to load sites'}
          </Box>
          <Button size="small" variant="outlined" color="error" onClick={() => void refetch()}>
            Retry
          </Button>
        </Box>
      </SitesPanelShell>
    );
  }

  if (properties.length === 0) {
    return (
      <SitesPanelShell>
        <Box
          sx={{
            backgroundColor: color.surface,
            borderRadius: radius['rf-md'],
            boxShadow: shadow.e1,
            p: 2.75,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.25,
          }}
        >
          <Box
            component="span"
            aria-hidden
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: color['accent-subtle'],
              color: color['accent-ink'],
            }}
          >
            <DomainOutlinedIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ fontSize: crm['text-row-title'], fontWeight: 700 }}>
              No sites for this customer yet
            </Box>
            <Box sx={{ fontSize: crm['text-row'], color: color['text-secondary'], mt: '2px' }}>
              Add the first rooftop or plant address to start a survey.
            </Box>
          </Box>
          <Button size="small" variant="contained" onClick={handleAddSite}>
            Add site
          </Button>
        </Box>
      </SitesPanelShell>
    );
  }

  return (
    <SitesPanelShell>
      {/* Header: count, roll-ups, add action */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
          mb: 1.25,
        }}
      >
        <Box
          component="span"
          sx={{
            fontSize: crm['text-row-xs'],
            fontWeight: 700,
            letterSpacing: 'var(--text-overline-track)',
            textTransform: 'uppercase',
            color: color['text-secondary'],
          }}
        >
          Sites · {properties.length}
        </Box>
        <SummaryPill value={formatCurrency(summary.quotedTotal)} label="quoted" />
        <SummaryPill value={`${summary.capacity.toFixed(2)} kWp`} label="capacity" />
        <SummaryPill value={String(summary.converted)} label="converted" />

        <Box sx={{ ml: 'auto' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={handleAddSite}
          >
            Add site
          </Button>
        </Box>
      </Box>

      {/* Sub-grid */}
      <Box
        sx={{
          backgroundColor: color.surface,
          borderRadius: radius['rf-md'],
          boxShadow: shadow.e1,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: SITES_GRID_TEMPLATE,
            alignItems: 'center',
            px: crm['sites-gutter'],
            height: crm['sites-head-height'],
            backgroundColor: color['surface-alt'],
            fontSize: crm['text-overline-sm'],
            fontWeight: 700,
            letterSpacing: crm['text-overline-sm-track'],
            textTransform: 'uppercase',
            color: color['text-tertiary'],
          }}
        >
          {SITES_HEADERS.map((header, i) => (
            <Box
              key={header || 'actions'}
              sx={i === RIGHT_ALIGNED_HEADER_INDEX ? { textAlign: 'right', pr: 1.75 } : undefined}
            >
              {header}
            </Box>
          ))}
        </Box>

        {properties.map((property, index) => (
          <SiteRow
            key={property.id}
            property={property}
            index={index}
            isOrgAdmin={isOrgAdmin}
            onMarkAsLost={handleMarkAsLost}
            onRequestDelete={deleteConfirmation.requestDelete}
            onOpen={handleOpenSite}
          />
        ))}
      </Box>

      <MarkAsLostDialog
        open={!!markLostTarget}
        onClose={() => setMarkLostTarget(null)}
        propertyName={markLostTarget?.propertyName ?? markLostTarget?.propertyCode}
      />

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        title="Delete Property"
        itemName={
          deleteConfirmation.target?.propertyName ||
          deleteConfirmation.target?.propertyCode ||
          'this property'
        }
        isPending={deleteConfirmation.isPending}
        onCancel={deleteConfirmation.cancel}
        onConfirm={() => void deleteConfirmation.confirm()}
      />
    </SitesPanelShell>
  );
}
