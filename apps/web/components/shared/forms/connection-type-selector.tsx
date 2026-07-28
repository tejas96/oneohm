'use client';

import { Box, Radio } from '@mui/material';
import { ConnectionType } from '@tejas96/shared/types';
import * as React from 'react';

import { OptionCard } from './option-card';

import { MUIFieldLabel } from '@/components/ui';
import { CONNECTION_TYPE_OPTIONS } from '@/lib/config/constants';
import { color } from '@/lib/theme/tokens';
import { cn } from '@/lib/utils';

export interface ConnectionTypeSelectorProps {
  value?: ConnectionType | null;
  onChange: (value: ConnectionType) => void;
  error?: string;
  required?: boolean;
  /** Hides the built-in label when the caller renders its own. */
  hideLabel?: boolean;
  className?: string;
}

export function ConnectionTypeSelector({
  value,
  onChange,
  error,
  required = false,
  hideLabel = false,
  className,
}: ConnectionTypeSelectorProps): React.JSX.Element {
  return (
    <div className={cn(className)}>
      {!hideLabel && <MUIFieldLabel fieldLabel="Connection Type" required={required} />}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 1.5,
          mt: hideLabel ? 0 : 1,
        }}
      >
        {CONNECTION_TYPE_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            active={value === option.value}
            onClick={() => onChange(option.value)}
            label={option.label}
            meta={option.description}
            leading={<Radio checked={value === option.value} size="small" sx={{ p: 0 }} />}
          />
        ))}
      </Box>
      {error ? <Box sx={{ fontSize: 12, color: color.danger, mt: 0.875 }}>{error}</Box> : null}
    </div>
  );
}
