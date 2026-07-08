'use client';

import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import NextLink from 'next/link';
import type { JSX } from 'react';

import { type CustomerPropertyResponse } from '../hooks';

import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { toTitleLabel } from '@/lib/utils';

export interface PropertyDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  property: CustomerPropertyResponse | null;
  customerId: string;
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.625rem' }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.25 }}>
        {value || '—'}
      </Typography>
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

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 380 },
          maxWidth: '100vw',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          px: 2.5,
          py: 1.75,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {property ? getPropertyDisplayName(property) : 'Property'}
          </Typography>
          {property && (
            <Typography variant="caption" color="text.secondary" display="block">
              {[property.city, property.state, property.pincode].filter(Boolean).join(', ')}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={0.5}>
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
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>
        {!property ? (
          <Typography variant="body2" color="text.secondary">
            Select a property to view details.
          </Typography>
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              <Chip label={toTitleLabel(property.propertyType)} size="small" />
              <Chip label={toTitleLabel(property.status)} size="small" color="info" />
              {property.isPrimary && <Chip label="Primary" size="small" color="primary" />}
              {property.wantsLoan && <Chip label="Wants loan" size="small" color="warning" />}
            </Stack>

            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Utility Details
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6 }}>
                  <FieldRow label="Consumer Number" value={property.consumerNumber} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FieldRow label="Consumer Name" value={property.consumerName} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FieldRow label="DISCOM" value={property.discomName} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FieldRow
                    label="Connection Type"
                    value={toTitleLabel(property.connectionType ?? '')}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FieldRow label="Current Load" value={property.currentLoad} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FieldRow
                    label="Sanctioned Load"
                    value={
                      property.sanctionedLoad != null ? `${property.sanctionedLoad} kW` : undefined
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FieldRow label="Meter Number" value={property.meterNumber} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FieldRow
                    label="Lead Temperature"
                    value={toTitleLabel(property.leadTemperature)}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Address
              </Typography>
              <FieldRow label="Street" value={property.address} />
              <Box sx={{ mt: 1 }}>
                <FieldRow
                  label="City / State / PIN"
                  value={[property.city, property.state, property.pincode]
                    .filter(Boolean)
                    .join(', ')}
                />
              </Box>
            </Box>

            <Divider />
            {property.notes && (
              <>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} mb={1}>
                    Notes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {property.notes}
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
