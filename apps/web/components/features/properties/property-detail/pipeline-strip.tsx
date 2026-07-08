'use client';

import { Box, Chip, Stack, Typography } from '@mui/material';
import { PropertyStatus, QuoteStatus } from '@tejas96/shared/types';
import type { JSX } from 'react';

import { pipelineStepChipSx } from '@/components/features/customers/customer-detail/styles';
import type { CustomerPropertyResponse } from '@/components/features/customers/hooks';
import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { toTitleLabel } from '@/lib/utils';

type PipelineStepState = 'done' | 'current' | 'pending';

interface PipelineStep {
  label: string;
  state: PipelineStepState;
}

function getPipelineSteps(property: CustomerPropertyResponse): PipelineStep[] {
  const steps: PipelineStep[] = [{ label: 'Property', state: 'done' }];

  const quoteStatus = property.latestQuoteStatus;
  const hasQuote = Boolean(property.latestQuoteNumber || quoteStatus);
  const quoteAccepted = quoteStatus === QuoteStatus.ACCEPTED;
  const hasProject = property.status === PropertyStatus.CONVERTED || Boolean(property.projectId);

  if (hasQuote) {
    steps.push({
      label: quoteAccepted ? 'Quote accepted' : `Quote ${toTitleLabel(quoteStatus ?? 'draft')}`,
      state: quoteAccepted ? 'done' : 'current',
    });
  } else {
    steps.push({ label: 'No quote', state: 'pending' });
  }

  if (property.wantsLoan) {
    steps.push({
      label: 'Loan',
      state: hasProject ? 'done' : hasQuote ? 'current' : 'pending',
    });
  }

  if (hasProject) {
    steps.push({ label: 'Project active', state: 'current' });
    steps.push({ label: 'Payments', state: 'pending' });
    steps.push({ label: 'Subsidy', state: 'pending' });
    steps.push({ label: 'Service', state: 'pending' });
  } else if (hasQuote) {
    steps.push({ label: 'No project yet', state: 'pending' });
  }

  return steps;
}

interface PropertyPipelineStripProps {
  property: CustomerPropertyResponse;
  compact?: boolean;
}

export function PropertyPipelineStrip({
  property,
  compact,
}: PropertyPipelineStripProps): JSX.Element {
  const steps = getPipelineSteps(property);

  return (
    <Box>
      {!compact && (
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="body2" fontWeight={600} noWrap>
                {getPropertyDisplayName(property)}
              </Typography>
              {property.isPrimary && <Chip label="Primary" size="small" color="primary" />}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {[property.city, property.propertyType, property.currentLoad]
                .filter(Boolean)
                .join(' · ')}
            </Typography>
          </Box>
        </Stack>
      )}
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
        {steps.map((step, index) => (
          <Box
            key={`${step.label}-${index}`}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            {index > 0 && (
              <Typography variant="caption" color="text.disabled">
                →
              </Typography>
            )}
            <Chip
              label={step.label}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.625rem',
                border: 1,
                ...pipelineStepChipSx[step.state],
              }}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
