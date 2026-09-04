'use client';

import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import {
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import type { JSX } from 'react';

import { PROPERTY_STATUS_TONE, QUOTE_STATUS_TONE } from '../../constants';
import type { CustomerPropertyResponse } from '../../hooks';
import {
  DetailCard,
  EmptyPane,
  IconCircle,
  Mono,
  RowSkeleton,
  SectionHeading,
  TonePill,
  type DetailTone,
} from '../primitives';
import { SiteStageBar } from '../site-stage';
import { detailTableSx, tableCardSx } from '../styles';

import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { useGatedAction } from '@/lib/rbac';
import { formatSystemSize, siteValue, toTitleLabel } from '@/lib/utils';

export interface PropertiesTabProps {
  customerId: string;
  properties: CustomerPropertyResponse[];
  isLoading: boolean;
  isInactive: boolean;
  onAddProperty: () => void;
  onOpenProperty: (propertyId: string) => void;
}

const INACTIVE_TOOLTIP = 'This customer is inactive. Reactivate to continue this action.';

export function PropertiesTab({
  properties,
  isLoading,
  isInactive,
  onAddProperty,
  onOpenProperty,
}: PropertiesTabProps): JSX.Element {
  const addPropertyAction = useGatedAction('properties.create', onAddProperty, 'Add site');
  if (isLoading) {
    return (
      <Box sx={tableCardSx}>
        <RowSkeleton rows={4} />
      </Box>
    );
  }

  if (properties.length === 0) {
    return (
      <DetailCard>
        <EmptyPane
          size="page"
          icon={<HomeWorkOutlinedIcon />}
          title="No sites yet"
          description="A site is the roof you'll install on. Add the first one to start surveying, quoting and converting."
          action={
            <Tooltip title={isInactive ? INACTIVE_TOOLTIP : ''}>
              <span>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddBusinessOutlinedIcon />}
                  onClick={addPropertyAction.onGatedClick}
                  aria-disabled={!addPropertyAction.allowed}
                  disabled={isInactive}
                >
                  Add site
                </Button>
              </span>
            </Tooltip>
          }
        />
      </DetailCard>
    );
  }

  return (
    <Stack gap={1.5}>
      <SectionHeading
        count={properties.length}
        sx={{ mb: 0 }}
        action={
          <Tooltip title={isInactive ? INACTIVE_TOOLTIP : ''}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddBusinessOutlinedIcon />}
                onClick={addPropertyAction.onGatedClick}
                aria-disabled={!addPropertyAction.allowed}
                disabled={isInactive}
              >
                Add site
              </Button>
            </span>
          </Tooltip>
        }
      >
        Sites
      </SectionHeading>

      <Box sx={tableCardSx}>
        <TableContainer>
          <Table size="small" sx={detailTableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 220 }}>Site</TableCell>
                <TableCell sx={{ minWidth: 130 }}>Location</TableCell>
                <TableCell sx={{ minWidth: 190 }}>Stage</TableCell>
                {/* Not "Latest quote": once a site converts, the figure below
                    is the project's contract, which moves with change orders
                    while the quote never does. */}
                <TableCell sx={{ minWidth: 150 }}>Quote &amp; value</TableCell>
                <TableCell sx={{ minWidth: 110 }}>Status</TableCell>
                <TableCell align="right" sx={{ width: 56 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {properties.map((property) => {
                const statusTone = PROPERTY_STATUS_TONE[property.status] ?? 'neutral';
                // A converted site is worth what its contract says today, not
                // what its quote said at signing — see lib/utils/site-value.ts.
                const value = siteValue(property);
                const quoteStatus = property.latestQuoteStatus;
                const quoteTone: DetailTone = quoteStatus
                  ? (QUOTE_STATUS_TONE[quoteStatus] ?? 'neutral')
                  : 'neutral';

                return (
                  <TableRow
                    key={property.id}
                    hover={false}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => onOpenProperty(property.id)}
                  >
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
                        <IconCircle tone={statusTone}>
                          <HomeWorkOutlinedIcon />
                        </IconCircle>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" gap={0.75}>
                            <Typography
                              sx={{
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: 'var(--ds-text-primary)',
                              }}
                            >
                              {getPropertyDisplayName(property)}
                            </Typography>
                            {property.isPrimary && <TonePill label="Primary" tone="accent" />}
                          </Stack>
                          <Typography
                            sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}
                          >
                            {toTitleLabel(property.propertyType)}
                            {property.consumerNumber ? ` · ${property.consumerNumber}` : ''}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ color: 'var(--ds-text-secondary)' }}>
                      {[property.city, property.state].filter(Boolean).join(', ') || '—'}
                    </TableCell>

                    <TableCell>
                      <SiteStageBar property={property} />
                    </TableCell>

                    <TableCell>
                      {quoteStatus ? (
                        <Stack gap={0.5} alignItems="flex-start">
                          <TonePill label={toTitleLabel(quoteStatus)} tone={quoteTone} dot />
                          <Stack direction="row" alignItems="baseline" gap={0.75}>
                            {value.label ? (
                              <Mono sx={{ fontWeight: 500 }}>{value.label}</Mono>
                            ) : null}
                            {property.latestQuoteSystemSizeKw ? (
                              <Typography
                                sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}
                              >
                                {formatSystemSize(property.latestQuoteSystemSizeKw)} kW
                              </Typography>
                            ) : null}
                          </Stack>
                          {value.note ? (
                            <Typography
                              sx={{
                                fontSize: '0.625rem',
                                color: 'var(--ds-text-tertiary)',
                                lineHeight: 1.35,
                              }}
                            >
                              {value.note}
                            </Typography>
                          ) : null}
                        </Stack>
                      ) : (
                        <Typography sx={{ fontSize: '0.75rem', color: 'var(--ds-text-tertiary)' }}>
                          Not quoted
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <TonePill label={toTitleLabel(property.status)} tone={statusTone} dot />
                    </TableCell>

                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label={`Open ${getPropertyDisplayName(property)}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenProperty(property.id);
                        }}
                      >
                        <ChevronRightIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Stack>
  );
}
