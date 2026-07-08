'use client';

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Link as MuiLink,
  Stack,
  Typography,
} from '@mui/material';
import { LeadTemperature } from '@tejas96/shared/types';
import type { JSX } from 'react';

import { LEAD_TEMPERATURE_CONFIG } from '../../constants';
import {
  useUpdateProperty,
  type CustomerPropertyResponse,
  type PropertyFinanceSnapshot,
} from '../../hooks';
import { PropertyPipelineStrip } from '../pipeline-strip';

import type { Customer } from '@/components/features/customers/hooks';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';

interface OverviewTabProps {
  property: CustomerPropertyResponse;
  customer: Customer | null;
  financeSnapshot: PropertyFinanceSnapshot;
  financeLoading: boolean;
  onLogFollowup: () => void;
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

export function OverviewTab({
  property,
  customer,
  financeSnapshot,
  financeLoading,
  onLogFollowup,
}: OverviewTabProps): JSX.Element {
  const updateProperty = useUpdateProperty();

  const outstandingDisplay = financeLoading
    ? '…'
    : financeSnapshot.hasProject
      ? formatCurrency(financeSnapshot.totalOutstanding)
      : '—';
  const openTermsDisplay = financeLoading
    ? '…'
    : financeSnapshot.hasProject
      ? String(financeSnapshot.openTermCount)
      : '—';

  const handleTempChange = (temperature: LeadTemperature): void => {
    if (property.leadTemperature === temperature || updateProperty.isPending) return;
    updateProperty.mutate({ id: property.id, data: { leadTemperature: temperature } });
  };

  const mapLink =
    property.gpsCoordinates?.latitude != null && property.gpsCoordinates?.longitude != null
      ? `https://maps.google.com/?q=${property.gpsCoordinates.latitude},${property.gpsCoordinates.longitude}`
      : null;

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Property Overview
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<EventNoteOutlinedIcon />}
                  onClick={onLogFollowup}
                >
                  Log Follow-up
                </Button>
              </Stack>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FieldRow label="Property Name" value={property.propertyName} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FieldRow label="Property Code" value={property.propertyCode} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FieldRow label="Type" value={toTitleLabel(property.propertyType)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FieldRow label="Status" value={toTitleLabel(property.status)} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FieldRow label="Address" value={property.address} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <FieldRow label="City" value={property.city} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <FieldRow label="State" value={property.state} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <FieldRow label="PIN" value={property.pincode} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <FieldRow label="Current Load" value={property.currentLoad} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <FieldRow label="DISCOM" value={property.discomName} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <FieldRow label="Consumer #" value={property.consumerNumber} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <FieldRow
                    label="Connection"
                    value={toTitleLabel(property.connectionType ?? '')}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <FieldRow
                    label="Sanctioned Load"
                    value={property.sanctionedLoad != null ? `${property.sanctionedLoad} kW` : '—'}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">
                Lead Temperature
              </Typography>
              <Stack direction="row" spacing={1} mt={0.75}>
                {(Object.keys(LEAD_TEMPERATURE_CONFIG) as LeadTemperature[]).map((temp) => (
                  <Button
                    key={temp}
                    size="small"
                    variant={property.leadTemperature === temp ? 'contained' : 'outlined'}
                    onClick={() => handleTempChange(temp)}
                  >
                    {LEAD_TEMPERATURE_CONFIG[temp].label}
                  </Button>
                ))}
              </Stack>

              {mapLink && (
                <MuiLink
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mt: 2, display: 'inline-block' }}
                >
                  Open GPS Location
                </MuiLink>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                  Customer
                </Typography>
                <FieldRow
                  label="Name"
                  value={
                    customer?.firstName
                      ? `${customer.firstName} ${customer.lastName ?? ''}`.trim()
                      : property.customerName
                  }
                />
                <Box sx={{ mt: 1 }}>
                  <FieldRow label="Phone" value={customer?.phone ?? property.customerPhone} />
                </Box>
                <Box sx={{ mt: 1 }}>
                  <FieldRow label="Email" value={customer?.email ?? property.customerEmail} />
                </Box>
                <Button
                  size="small"
                  sx={{ mt: 1.5 }}
                  startIcon={<EditOutlinedIcon />}
                  href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: property.customerId })}
                >
                  Open Customer
                </Button>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                  Financial Snapshot
                </Typography>
                <Stack spacing={1}>
                  <FieldRow label="Outstanding" value={outstandingDisplay} />
                  <FieldRow label="Open Terms" value={openTermsDisplay} />
                  <FieldRow
                    label="Last Receipt"
                    value={
                      financeLoading
                        ? '…'
                        : financeSnapshot.lastReceiptDate
                          ? formatDate(financeSnapshot.lastReceiptDate)
                          : '—'
                    }
                  />
                  {!financeSnapshot.hasProject && !financeLoading && (
                    <Typography variant="caption" color="text.secondary">
                      Receivables appear after this property is converted to a project.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                Pipeline
              </Typography>
              <PropertyPipelineStrip property={property} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
