'use client';

import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import PriceCheckOutlinedIcon from '@mui/icons-material/PriceCheckOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import { Button, Card, CardContent, Chip } from '@mui/material';
import { ConnectionType, LeadTemperature, DocumentEntityType } from '@tejas96/shared/types';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { type CustomerResponse } from '../../../../customers';
import { LEAD_TEMPERATURE_CONFIG, PROPERTY_TYPE_LABELS } from '../../../constants';

import { useDocumentsByProperty } from '@/components/features/documents/hooks';
import { type DraftDocument } from '@/components/shared/document-manager';
import { MUIAvatar, MUITypography } from '@/components/ui';

interface Step6ReviewProps {
  isEditMode?: boolean;
  propertyId?: string;
  resolvedCustomer?: CustomerResponse;
  propertyDraftDocs: DraftDocument[];
  loanDraftDocs: DraftDocument[];
  onJumpToStep: (stepIndex: number) => void;
}

export function Step6Review({
  isEditMode = false,
  propertyId,
  resolvedCustomer,
  propertyDraftDocs,
  loanDraftDocs,
  onJumpToStep,
}: Step6ReviewProps): React.JSX.Element {
  const { watch } = useFormContext();

  // Fetch existing documents from DB if in edit mode
  const { data: existingDocs = [] } = useDocumentsByProperty(
    isEditMode && propertyId ? propertyId : undefined,
  );

  const existingPropertyDocs = React.useMemo(() => {
    return existingDocs.filter((d) => d.entityType === DocumentEntityType.PROPERTY);
  }, [existingDocs]);

  const existingLoanDocs = React.useMemo(() => {
    return existingDocs.filter((d) => d.entityType === DocumentEntityType.LOAN);
  }, [existingDocs]);

  const propertyDocsCount = isEditMode ? existingPropertyDocs.length : propertyDraftDocs.length;
  const loanDocsCount = isEditMode ? existingLoanDocs.length : loanDraftDocs.length;

  const propertyDocsList = React.useMemo(() => {
    return isEditMode
      ? existingPropertyDocs.map((d) => ({ fileName: d.fileName, tag: d.tag }))
      : propertyDraftDocs.map((d) => ({ fileName: d.fileName, tag: d.tag }));
  }, [isEditMode, existingPropertyDocs, propertyDraftDocs]);

  const loanDocsList = React.useMemo(() => {
    return isEditMode
      ? existingLoanDocs.map((d) => ({ fileName: d.fileName, tag: d.tag }))
      : loanDraftDocs.map((d) => ({ fileName: d.fileName, tag: d.tag }));
  }, [isEditMode, existingLoanDocs, loanDraftDocs]);

  const propertyName = watch('propertyName') as string;
  const propertyType = watch('propertyType') as string;
  const isPrimary = Boolean(watch('isPrimary'));
  const address = watch('address') as string;
  const city = watch('city') as string;
  const state = watch('state') as string;
  const pincode = watch('pincode') as string;

  const discomName = watch('discomName') as string;
  const consumerName = watch('consumerName') as string;
  const consumerNumber = watch('consumerNumber') as string;
  const connectionType = watch('connectionType') as ConnectionType | undefined;
  const sanctionedLoad = watch('sanctionedLoad') as number | undefined;
  const currentLoad = watch('currentLoad') as string;
  const meterNumber = watch('meterNumber') as string;

  const leadTemperature = watch('leadTemperature') as LeadTemperature | undefined;
  const wantsLoan = Boolean(watch('wantsLoan'));
  const notes = watch('notes') as string;

  const renderSectionHeader = (title: string, icon: React.ReactNode, stepIndex: number) => (
    <div className="flex items-center justify-between pb-2 mb-3">
      <div className="flex items-center gap-2">
        <span className="text-primary flex items-center justify-center size-5">{icon}</span>
        <MUITypography variant="sectionTitle" className="font-semibold text-sm">
          {title}
        </MUITypography>
      </div>
      <Button
        size="small"
        variant="text"
        color="primary"
        onClick={() => onJumpToStep(stepIndex)}
        startIcon={<EditOutlinedIcon sx={{ fontSize: '14px !important' }} />}
        sx={{ minWidth: 0, py: 0.25, px: 1, fontSize: 12 }}
      >
        Edit
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card variant="outlined">
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <RateReviewOutlinedIcon fontSize="small" />
          </div>
          <div className="flex-1 min-w-0">
            <MUITypography variant="sectionTitle">Review & Submit</MUITypography>
            <MUITypography variant="body">Double check all details before finalizing</MUITypography>
          </div>
        </div>
        <CardContent className="p-5 space-y-6">
          {/* Grid Layout for Review Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info Section */}
            {resolvedCustomer && (
              <div className="md:col-span-2 p-4 rounded-lg bg-background-secondary/40">
                {renderSectionHeader(
                  'Customer Information',
                  <PersonOutlineOutlinedIcon fontSize="small" />,
                  0,
                )}
                <div className="flex items-center gap-3 mt-2">
                  <MUIAvatar
                    name={`${resolvedCustomer.firstName} ${resolvedCustomer.lastName ?? ''}`}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <MUITypography variant="bodyPrimary" className="font-semibold text-sm">
                      {resolvedCustomer.firstName} {resolvedCustomer.lastName ?? ''}
                    </MUITypography>
                    <div className="flex flex-col sm:flex-row sm:gap-4 text-xs text-foreground-secondary mt-0.5">
                      <span>Phone: {resolvedCustomer.phone}</span>
                      {resolvedCustomer.email && <span>Email: {resolvedCustomer.email}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Property Details & Location */}
            <div className="p-4 rounded-lg bg-background-secondary/40 space-y-3">
              {renderSectionHeader('Property & Location', <HomeOutlinedIcon fontSize="small" />, 0)}
              <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs">
                <div>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    Property Name
                  </MUITypography>
                  <MUITypography variant="bodyPrimary" className="font-medium text-sm mt-0.5">
                    {propertyName}
                  </MUITypography>
                </div>
                <div>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    Property Type
                  </MUITypography>
                  <MUITypography variant="bodyPrimary" className="font-medium text-sm mt-0.5">
                    {propertyType
                      ? PROPERTY_TYPE_LABELS[propertyType as keyof typeof PROPERTY_TYPE_LABELS]
                      : '—'}
                  </MUITypography>
                </div>
                {isPrimary && (
                  <div className="col-span-2">
                    <Chip
                      label="Primary Property"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </div>
                )}
                <div className="col-span-2">
                  <MUITypography
                    variant="timestamp"
                    className="text-foreground-secondary flex items-center gap-0.5"
                  >
                    <LocationOnOutlinedIcon sx={{ fontSize: 12 }} /> Address
                  </MUITypography>
                  <MUITypography
                    variant="body"
                    className="mt-0.5 leading-relaxed text-foreground-secondary"
                  >
                    {(() => {
                      if (!address) return '—';
                      const addressLower = address.toLowerCase();
                      let displayAddress = address;

                      if (city && !addressLower.includes(city.toLowerCase())) {
                        displayAddress += `, ${city}`;
                      }

                      const hasState = state && addressLower.includes(state.toLowerCase());
                      const hasPincode = pincode && addressLower.includes(pincode.toLowerCase());

                      if (state && !hasState) {
                        if (pincode && !hasPincode) {
                          displayAddress += `, ${state} - ${pincode}`;
                        } else {
                          displayAddress += `, ${state}`;
                        }
                      } else if (pincode && !hasPincode) {
                        displayAddress += `, ${pincode}`;
                      }

                      return displayAddress;
                    })()}
                  </MUITypography>
                </div>
              </div>
            </div>

            {/* Utility / Electricity */}
            <div className="p-4 rounded-lg bg-background-secondary/40 space-y-3">
              {renderSectionHeader('Electricity Details', <BoltOutlinedIcon fontSize="small" />, 2)}
              <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs">
                <div>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    DISCOM Provider
                  </MUITypography>
                  <MUITypography variant="bodyPrimary" className="font-medium mt-0.5">
                    {discomName || '—'}
                  </MUITypography>
                </div>
                <div>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    Consumer Name
                  </MUITypography>
                  <MUITypography variant="bodyPrimary" className="font-medium mt-0.5">
                    {consumerName || '—'}
                  </MUITypography>
                </div>
                <div>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    Consumer Number
                  </MUITypography>
                  <MUITypography variant="bodyPrimary" className="font-medium mt-0.5">
                    {consumerNumber || '—'}
                  </MUITypography>
                </div>
                <div>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    Connection Phase
                  </MUITypography>
                  <MUITypography variant="bodyPrimary" className="font-medium mt-0.5">
                    {connectionType === ConnectionType.SINGLE_PHASE
                      ? 'Single Phase'
                      : connectionType === ConnectionType.THREE_PHASE
                        ? 'Three Phase'
                        : '—'}
                  </MUITypography>
                </div>
                <div>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    Sanctioned Load
                  </MUITypography>
                  <MUITypography variant="bodyPrimary" className="font-medium mt-0.5">
                    {sanctionedLoad !== undefined ? `${sanctionedLoad} kW` : '—'}
                  </MUITypography>
                </div>
                <div>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    Current Load
                  </MUITypography>
                  <MUITypography variant="bodyPrimary" className="font-medium mt-0.5">
                    {currentLoad || '—'}
                  </MUITypography>
                </div>
                <div>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    Meter Number
                  </MUITypography>
                  <MUITypography variant="bodyPrimary" className="font-medium mt-0.5">
                    {meterNumber || '—'}
                  </MUITypography>
                </div>
              </div>
            </div>

            {/* Lead Details (Lead Temp + Notes) */}
            <div className="p-4 rounded-lg bg-background-secondary/40 space-y-3">
              {renderSectionHeader(
                'Lead Details',
                <PersonOutlineOutlinedIcon fontSize="small" />,
                3,
              )}
              <div className="space-y-3 text-xs">
                <div>
                  <MUITypography
                    variant="timestamp"
                    className="text-foreground-secondary block mb-1"
                  >
                    Lead Temp
                  </MUITypography>
                  {leadTemperature ? (
                    <Chip
                      label={LEAD_TEMPERATURE_CONFIG[leadTemperature].label}
                      size="small"
                      sx={{
                        backgroundColor:
                          leadTemperature === LeadTemperature.HOT
                            ? '#FEE2E2'
                            : leadTemperature === LeadTemperature.WARM
                              ? '#FEF3C7'
                              : '#E0F2FE',
                        color:
                          leadTemperature === LeadTemperature.HOT
                            ? '#DC2626'
                            : leadTemperature === LeadTemperature.WARM
                              ? '#D97706'
                              : '#0284C7',
                        fontWeight: 600,
                        height: 20,
                      }}
                    />
                  ) : (
                    <MUITypography variant="bodyPrimary" className="font-medium">
                      —
                    </MUITypography>
                  )}
                </div>
                <div>
                  <MUITypography variant="timestamp" className="text-foreground-secondary">
                    Notes
                  </MUITypography>
                  <MUITypography
                    variant="body"
                    className="mt-0.5 leading-relaxed text-foreground-secondary"
                  >
                    {notes || 'No notes added.'}
                  </MUITypography>
                </div>
              </div>
            </div>

            {/* Finance Details (Interested state + Financing Documents) */}
            <div className="p-4 rounded-lg bg-background-secondary/40 space-y-3">
              {renderSectionHeader(
                'Finance Details',
                <PriceCheckOutlinedIcon fontSize="small" />,
                4,
              )}
              <div className="space-y-4 text-xs">
                <div>
                  <MUITypography
                    variant="timestamp"
                    className="text-foreground-secondary block mb-1"
                  >
                    Financing / Loan
                  </MUITypography>
                  <Chip
                    label={wantsLoan ? 'Interested' : 'Self-Financed'}
                    size="small"
                    color={wantsLoan ? 'success' : 'default'}
                    variant={wantsLoan ? 'filled' : 'outlined'}
                    sx={{ height: 20, fontWeight: 500 }}
                  />
                </div>
                {wantsLoan && (
                  <div className="/60 pt-3 space-y-2">
                    <MUITypography variant="timestamp" className="text-foreground-secondary block">
                      {isEditMode ? 'Uploaded Financing Documents' : 'Staged Financing Documents'}
                    </MUITypography>
                    <div className="flex justify-between items-center bg-background-secondary p-2 rounded">
                      <span className="text-foreground-secondary">
                        {isEditMode ? 'Uploaded Loan Docs Count:' : 'Staged Loan Docs Count:'}
                      </span>
                      <span className="font-semibold">{loanDocsCount}</span>
                    </div>
                    {loanDocsCount > 0 ? (
                      <ul className="list-disc pl-4 space-y-1 text-foreground-secondary max-h-32 overflow-y-auto">
                        {loanDocsList.map((doc, idx) => (
                          <li key={idx} className="truncate">
                            {doc.fileName}{' '}
                            <span className="text-primary font-medium">({doc.tag})</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <MUITypography variant="body" className="text-foreground-secondary italic">
                        {isEditMode
                          ? 'No financing documents uploaded.'
                          : 'No financing documents staged.'}
                      </MUITypography>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Property Documents Checklist (Spanning full width) */}
            <div className="md:col-span-2 p-4 rounded-lg bg-background-secondary/40 space-y-3">
              {renderSectionHeader(
                'Property Documents',
                <DescriptionOutlinedIcon fontSize="small" />,
                5,
              )}
              <div className="text-xs space-y-2">
                <div className="flex justify-between items-center bg-background-secondary p-2 rounded">
                  <span className="text-foreground-secondary">
                    {isEditMode ? 'Uploaded Property Docs Count:' : 'Staged Property Docs Count:'}
                  </span>
                  <span className="font-semibold">{propertyDocsCount}</span>
                </div>
                {propertyDocsCount > 0 ? (
                  <ul className="list-disc pl-4 space-y-1 text-foreground-secondary max-h-32 overflow-y-auto">
                    {propertyDocsList.map((doc, idx) => (
                      <li key={idx} className="truncate">
                        {doc.fileName} <span className="text-primary font-medium">({doc.tag})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <MUITypography variant="body" className="text-foreground-secondary italic">
                    {isEditMode
                      ? 'No property documents uploaded.'
                      : 'No property documents staged.'}
                  </MUITypography>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
