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
  Chip,
} from '@mui/material';
import { LeadTemperature, SiteStatus } from '@tejas96/shared/types';
import { useState, type JSX } from 'react';

import { LEAD_TEMPERATURE_CONFIG } from '../../constants';
import {
  useUpdateProperty,
  useCompletePropertyVisit,
  useCompletePropertySurvey,
  useCancelPropertySiteActivity,
  type CustomerPropertyResponse,
  type PropertyFinanceSnapshot,
} from '../../hooks';
import { EditSiteDataModal } from '../components/edit-site-data-modal';
import { PropertyPipelineStrip } from '../pipeline-strip';

import type { Customer } from '@/components/features/customers/hooks';
import { showToast } from '@/components/ui';
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

function SiteProgressCard({ property }: { property: CustomerPropertyResponse }): JSX.Element {
  const completeVisit = useCompletePropertyVisit();
  const completeSurvey = useCompletePropertySurvey();
  const cancelActivity = useCancelPropertySiteActivity();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const getStatusColor = (status: SiteStatus): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case SiteStatus.COMPLETED:
        return 'success';
      case SiteStatus.IN_PROGRESS:
        return 'warning';
      case SiteStatus.CANCELLED:
        return 'error';
      case SiteStatus.PENDING:
        return 'default';
    }
  };

  const handleCompleteVisit = (): void => {
    completeVisit.mutate(property.id);
  };

  const handleCompleteSurvey = (): void => {
    if (!property.surveyData?.roofType || !property.surveyData?.roofCondition) {
      showToast.error(
        'Please fill out Roof Type and Roof Condition in "Edit Data" before completing the survey.',
      );
      return;
    }
    completeSurvey.mutate(property.id);
  };

  const handleCancelActivity = (): void => {
    cancelActivity.mutate(property.id);
  };

  const isPending = completeVisit.isPending || completeSurvey.isPending || cancelActivity.isPending;

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle2" fontWeight={600}>
            Site Progress
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {property.siteStatus !== SiteStatus.CANCELLED && (
              <Button
                size="small"
                variant="text"
                onClick={() => setEditModalOpen(true)}
                sx={{ minWidth: 0, fontSize: '0.75rem', py: 0.25, px: 0.75 }}
              >
                Edit Data
              </Button>
            )}
            <Chip
              size="small"
              label={toTitleLabel(property.siteStatus || 'pending')}
              color={getStatusColor(property.siteStatus)}
            />
          </Stack>
        </Stack>

        <Stack spacing={2}>
          {/* Site Visit Section */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
            >
              1. SITE VISIT
            </Typography>
            <Stack
              spacing={0.5}
              pl={1}
              borderLeft="2px solid"
              borderColor={property.siteVisitDone ? 'success.main' : 'divider'}
            >
              <FieldRow
                label="Visit Status"
                value={property.siteVisitDone ? 'Completed' : 'Pending'}
              />
              {property.siteVisitCompletedAt && (
                <FieldRow label="Completed At" value={formatDate(property.siteVisitCompletedAt)} />
              )}
              {property.siteVisitAssigneeName && (
                <FieldRow label="Assignee" value={property.siteVisitAssigneeName} />
              )}
              {property.availableRoofAreaSqft != null && (
                <FieldRow label="Roof Area" value={`${property.availableRoofAreaSqft} sqft`} />
              )}
              {property.siteNotes && <FieldRow label="Visit Notes" value={property.siteNotes} />}
              {!property.siteVisitDone && property.siteStatus !== SiteStatus.CANCELLED && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleCompleteVisit}
                  disabled={isPending}
                  sx={{ mt: 1, alignSelf: 'flex-start' }}
                >
                  Mark Visit Complete
                </Button>
              )}
            </Stack>
          </Box>

          {/* Site Survey Section */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
            >
              2. TECHNICAL SURVEY
            </Typography>
            <Stack
              spacing={0.5}
              pl={1}
              borderLeft="2px solid"
              borderColor={property.surveyDone ? 'success.main' : 'divider'}
            >
              <FieldRow
                label="Survey Status"
                value={property.surveyDone ? 'Completed' : 'Pending'}
              />
              {property.siteSurveyCompletedAt && (
                <FieldRow label="Completed At" value={formatDate(property.siteSurveyCompletedAt)} />
              )}
              {property.siteSurveyAssigneeName && (
                <FieldRow label="Surveyor" value={property.siteSurveyAssigneeName} />
              )}
              {property.surveyData?.roofType && (
                <FieldRow label="Roof Type" value={property.surveyData.roofType} />
              )}
              {property.surveyData?.roofCondition && (
                <FieldRow
                  label="Roof Condition"
                  value={toTitleLabel(property.surveyData.roofCondition)}
                />
              )}
              {property.surveyData?.roofOrientation && (
                <FieldRow
                  label="Roof Orientation"
                  value={toTitleLabel(property.surveyData.roofOrientation)}
                />
              )}
              {property.surveyData?.isMaterialUnloadingAreaSafe !== undefined && (
                <FieldRow
                  label="Unloading Safe"
                  value={property.surveyData.isMaterialUnloadingAreaSafe ? 'Yes' : 'No'}
                />
              )}
              {property.shadingAnalysis?.hasShading !== undefined && (
                <FieldRow
                  label="Has Shading"
                  value={
                    property.shadingAnalysis.hasShading
                      ? `Yes (${property.shadingAnalysis.shadingPercentage ?? 0}%)`
                      : 'No'
                  }
                />
              )}
              {property.surveyData?.notes && (
                <FieldRow label="Survey Notes" value={property.surveyData.notes} />
              )}
              {property.siteVisitDone &&
                !property.surveyDone &&
                property.siteStatus !== SiteStatus.CANCELLED && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleCompleteSurvey}
                    disabled={isPending}
                    sx={{ mt: 1, alignSelf: 'flex-start' }}
                  >
                    Mark Survey Complete
                  </Button>
                )}
            </Stack>
          </Box>

          {/* Cancel Site Activity Action */}
          {property.siteStatus !== SiteStatus.COMPLETED &&
            property.siteStatus !== SiteStatus.CANCELLED && (
              <Button
                size="small"
                variant="text"
                color="error"
                onClick={handleCancelActivity}
                disabled={isPending}
                sx={{ alignSelf: 'flex-start' }}
              >
                Cancel Site Activity
              </Button>
            )}
        </Stack>

        <EditSiteDataModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          property={property}
        />
      </CardContent>
    </Card>
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
          <Stack spacing={2}>
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
                      value={
                        property.sanctionedLoad != null ? `${property.sanctionedLoad} kW` : '—'
                      }
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

            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                  Pipeline
                </Typography>
                <PropertyPipelineStrip property={property} />
              </CardContent>
            </Card>
          </Stack>
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

            <SiteProgressCard property={property} />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
