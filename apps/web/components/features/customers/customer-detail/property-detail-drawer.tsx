'use client';

import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, Drawer, IconButton, Stack, Typography } from '@mui/material';
import NextLink from 'next/link';
import type { JSX } from 'react';

import { getSiteLifecycle, PROPERTY_TYPE_TONE, QUOTE_STATUS_TONE } from '../constants';
import { type CustomerPropertyResponse } from '../hooks';
import { FieldGrid, Mono, SectionHeading, TonePill, type DetailTone } from './primitives';
import { SiteStageBar } from './site-stage';

import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import {
  contractMovedNote,
  formatCurrency,
  formatDate,
  formatFollowupWhen,
  formatSystemSize,
  toTitleLabel,
} from '@/lib/utils';

export interface PropertyDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  property: CustomerPropertyResponse | null;
  customerId: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <Box>
      <SectionHeading>{title}</SectionHeading>
      {children}
    </Box>
  );
}

export function PropertyDetailDrawer({
  open,
  onClose,
  property,
  customerId: _customerId,
}: PropertyDetailDrawerProps): JSX.Element {
  const propertyHref = property
    ? buildRoute(ROUTES.PROPERTIES.DETAIL, { id: property.id })
    : undefined;

  // The site's own status stops at "Converted" for life; once a project
  // exists, its state is what this site is actually doing.
  const lifecycle = property ? getSiteLifecycle(property) : null;
  const typeTone: DetailTone = property
    ? (PROPERTY_TYPE_TONE[property.propertyType] ?? 'neutral')
    : 'neutral';
  const quoteStatus = property?.latestQuoteStatus;
  const quoteTone: DetailTone = quoteStatus
    ? (QUOTE_STATUS_TONE[quoteStatus] ?? 'neutral')
    : 'neutral';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 420 },
            maxWidth: '100vw',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'var(--ds-canvas)',
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'var(--ds-surface)',
          boxShadow: 'var(--shadow-e1)',
          px: 2.5,
          py: 1.75,
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                letterSpacing: '-0.015em',
                color: 'var(--ds-text-primary)',
                lineHeight: 1.25,
                overflowWrap: 'anywhere',
              }}
            >
              {property ? getPropertyDisplayName(property) : 'Site'}
            </Typography>
            {property && (
              <Typography sx={{ fontSize: '0.75rem', color: 'var(--ds-text-tertiary)', mt: 0.25 }}>
                {[property.city, property.state, property.pincode].filter(Boolean).join(', ')}
              </Typography>
            )}
          </Box>
          <Stack direction="row" gap={0.5} sx={{ flexShrink: 0 }}>
            {propertyHref && (
              <Button
                component={NextLink}
                href={propertyHref}
                size="small"
                variant="outlined"
                startIcon={<OpenInNewIcon />}
              >
                Open
              </Button>
            )}
            <IconButton size="small" aria-label="Close" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {property && (
          <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
            {lifecycle ? <TonePill label={lifecycle.label} tone={lifecycle.tone} dot /> : null}
            <TonePill label={toTitleLabel(property.propertyType)} tone={typeTone} />
            {property.isPrimary && <TonePill label="Primary" tone="accent" />}
            {property.wantsLoan && <TonePill label="Wants loan" tone="warning" />}
            {property.needsFollowup && <TonePill label="Needs follow-up" tone="danger" dot />}
          </Stack>
        )}
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2.5 }}>
        {!property ? (
          <Typography sx={{ fontSize: '0.8125rem', color: 'var(--ds-text-secondary)' }}>
            Select a site to view its details.
          </Typography>
        ) : (
          <Stack gap={3}>
            <Box>
              <SectionHeading>Pipeline</SectionHeading>
              <SiteStageBar property={property} />
            </Box>

            {/*
             * Survey state was never shown in this drawer even though it is the
             * thing that gates every next step — you had to open the full site
             * page to find out whether anyone had been to the roof.
             */}
            <Section title="Site & survey">
              <FieldGrid
                fields={[
                  {
                    label: 'Site visit',
                    value: property.siteVisitDone ? (
                      <TonePill
                        label={
                          property.siteVisitCompletedAt
                            ? `Done ${formatDate(property.siteVisitCompletedAt)}`
                            : 'Done'
                        }
                        tone="success"
                        dot
                      />
                    ) : (
                      <TonePill label="Not done" tone="neutral" dot />
                    ),
                  },
                  {
                    label: 'Survey',
                    value: property.surveyDone ? (
                      <TonePill
                        label={
                          property.siteSurveyCompletedAt
                            ? `Done ${formatDate(property.siteSurveyCompletedAt)}`
                            : 'Done'
                        }
                        tone="success"
                        dot
                      />
                    ) : (
                      <TonePill label="Not done" tone="neutral" dot />
                    ),
                  },
                  { label: 'Visit assignee', value: property.siteVisitAssigneeName || '—' },
                  { label: 'Survey assignee', value: property.siteSurveyAssigneeName || '—' },
                  {
                    label: 'Usable roof area',
                    value: property.availableRoofAreaSqft
                      ? `${property.availableRoofAreaSqft} sq ft`
                      : '—',
                    mono: true,
                  },
                  {
                    label: 'Lead temperature',
                    value: toTitleLabel(property.leadTemperature),
                  },
                  {
                    label: 'Next follow-up',
                    value: property.nextFollowupAt
                      ? formatFollowupWhen(property.nextFollowupAt)
                      : '—',
                    mono: true,
                  },
                  { label: 'Site code', value: property.propertyCode || '—', mono: true },
                ]}
              />
            </Section>

            {quoteStatus && (
              <Section title="Latest quote">
                <FieldGrid
                  fields={[
                    {
                      label: 'Quote number',
                      value: property.latestQuoteNumber || '—',
                      mono: true,
                    },
                    {
                      label: 'Status',
                      value: <TonePill label={toTitleLabel(quoteStatus)} tone={quoteTone} dot />,
                    },
                    {
                      // This panel is about the QUOTE, so the quote's own price
                      // stays — it is the document the customer signed and
                      // rewriting it would be a lie. But saying nothing is what
                      // made the figures look contradictory: bill for material
                      // added on site and the project's Money tab moves while
                      // this stays put. So it says what it was, and points at
                      // what the project became.
                      label: 'Value',
                      value: (
                        <Stack gap={0.25}>
                          <Mono>
                            {property.latestQuoteFinalPrice
                              ? formatCurrency(property.latestQuoteFinalPrice)
                              : '—'}
                          </Mono>
                          {contractMovedNote(property) ? (
                            <Typography
                              sx={{
                                fontSize: '0.6875rem',
                                color: 'var(--ds-text-tertiary)',
                                lineHeight: 1.35,
                              }}
                            >
                              {contractMovedNote(property)}
                            </Typography>
                          ) : null}
                        </Stack>
                      ),
                    },
                    {
                      label: 'System size',
                      value: property.latestQuoteSystemSizeKw
                        ? `${formatSystemSize(property.latestQuoteSystemSizeKw)} kW`
                        : '—',
                      mono: true,
                    },
                    {
                      label: 'Quoted on',
                      value: property.latestQuoteDate ? formatDate(property.latestQuoteDate) : '—',
                      mono: true,
                    },
                  ]}
                />
              </Section>
            )}

            <Section title="Utility connection">
              <FieldGrid
                fields={[
                  { label: 'Consumer number', value: property.consumerNumber || '—', mono: true },
                  { label: 'Consumer name', value: property.consumerName || '—' },
                  { label: 'DISCOM', value: property.discom?.label || '—' },
                  {
                    label: 'Connection type',
                    value: property.connectionType ? toTitleLabel(property.connectionType) : '—',
                  },
                  { label: 'Current load', value: property.currentLoad || '—', mono: true },
                  {
                    label: 'Sanctioned load',
                    value:
                      property.sanctionedLoad != null
                        ? `${formatSystemSize(property.sanctionedLoad)} kW`
                        : '—',
                    mono: true,
                  },
                  { label: 'Meter number', value: property.meterNumber || '—', mono: true },
                ]}
              />
            </Section>

            <Section title="Address">
              <FieldGrid
                columns={1}
                fields={[
                  { label: 'Street', value: property.address || '—' },
                  {
                    label: 'City / state / PIN',
                    value:
                      [property.city, property.state, property.pincode]
                        .filter(Boolean)
                        .join(', ') || '—',
                  },
                ]}
              />
            </Section>

            {property.notes && (
              <Section title="Notes">
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    color: 'var(--ds-text-secondary)',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {property.notes}
                </Typography>
              </Section>
            )}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
