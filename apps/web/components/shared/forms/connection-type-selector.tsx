'use client';

import { FormControl, FormControlLabel, FormHelperText, Radio, RadioGroup } from '@mui/material';
import { ConnectionType } from '@tejas96/shared/types';
import * as React from 'react';

import { MUIFieldLabel } from '@/components/ui';
import { CONNECTION_TYPE_OPTIONS } from '@/lib/config/constants';
import { cn } from '@/lib/utils';

export interface ConnectionTypeSelectorProps {
  value?: ConnectionType | null;
  onChange: (value: ConnectionType) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

export function ConnectionTypeSelector({
  value,
  onChange,
  error,
  required = false,
  className,
}: ConnectionTypeSelectorProps): React.JSX.Element {
  const labelId = React.useId();

  return (
    <div className={cn(className)}>
      <MUIFieldLabel fieldLabel="Connection Type" required={required} id={labelId} />
      <FormControl error={!!error} component="fieldset" variant="standard">
        <RadioGroup
          row
          aria-labelledby={labelId}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value as ConnectionType)}
          className="gap-1"
        >
          {CONNECTION_TYPE_OPTIONS.map((option) => (
            <FormControlLabel
              key={option.value}
              value={option.value}
              control={<Radio size="small" />}
              label={option.label}
            />
          ))}
        </RadioGroup>
        {error ? <FormHelperText>{error}</FormHelperText> : null}
      </FormControl>
    </div>
  );
}
