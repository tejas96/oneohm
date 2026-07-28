'use client';

import { Box } from '@mui/material';
import { LeadTemperature } from '@tejas96/shared/types';
import * as React from 'react';

import { OptionCard } from './option-card';

import { color } from '@/lib/theme/tokens';
import { cn } from '@/lib/utils';

export interface LeadTemperatureSelectorProps {
  /** Currently selected temperature */
  value?: LeadTemperature;
  /** Callback when selection changes */
  onChange?: (value: LeadTemperature) => void;
  /** Show error styling */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Disable the selector */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

interface TemperatureOption {
  value: LeadTemperature;
  label: string;
  /** Follow-up cadence the temperature implies. */
  description: string;
  dot: string;
}

const TEMPERATURE_OPTIONS: TemperatureOption[] = [
  {
    value: LeadTemperature.HOT,
    label: 'Hot',
    description: 'Follow up within 3 days',
    dot: color.danger,
  },
  {
    value: LeadTemperature.WARM,
    label: 'Warm',
    description: 'Follow up within 10 days',
    dot: color['warning-main'],
  },
  {
    value: LeadTemperature.COLD,
    label: 'Cold',
    description: 'Follow up within 15 days',
    dot: color.info,
  },
];

/**
 * Temperature selection cards. The colour dot carries the hot/warm/cold
 * signal; selection itself reads as the standard accent fill + ring, so the
 * two meanings never compete.
 */
export function LeadTemperatureSelector({
  value,
  onChange,
  error,
  errorMessage,
  disabled,
  className,
}: LeadTemperatureSelectorProps): React.JSX.Element {
  return (
    <div className={cn(className)}>
      <Box
        role="radiogroup"
        aria-label="Lead Temperature"
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 1.5,
        }}
      >
        {TEMPERATURE_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            layout="stacked"
            active={value === option.value}
            disabled={disabled}
            onClick={() => onChange?.(option.value)}
            label={option.label}
            meta={option.description}
            leading={
              <Box
                sx={{ width: 9, height: 9, borderRadius: '50%', background: option.dot }}
                aria-hidden
              />
            }
          />
        ))}
      </Box>
      {error && errorMessage ? (
        <Box sx={{ fontSize: 12, color: color.danger, mt: 0.875 }}>{errorMessage}</Box>
      ) : null}
    </div>
  );
}
