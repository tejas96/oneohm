'use client';

import type { JSX } from 'react';

import { MUISelect, type MUISelectOption } from '@/components/ui/mui-select';

export type { MUISelectOption };

export function ColorDotLabel({ color, label }: { color: string; label: string }): JSX.Element {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          flexShrink: 0,
          backgroundColor: color,
        }}
      />
      <span style={{ fontSize: '11px', fontWeight: 500 }}>{label}</span>
    </span>
  );
}

export function QuickSelect({
  value,
  color,
  label,
  options,
  onChange,
}: {
  value: string;
  color: string;
  label: string;
  options: MUISelectOption[];
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <MUISelect
      value={value}
      onChange={(e) => onChange(e.target.value as string)}
      size="small"
      variant="outlined"
      formControlProps={{
        size: 'small',
        sx: {
          minWidth: '92px',
          maxWidth: '100%',
          '& .MuiOutlinedInput-root': {
            fontSize: '11px',
            height: '24px',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: `${color}30` },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: `${color}60` },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: color },
          },
          '& .MuiSelect-select': {
            padding: '2px 8px',
            color,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          },
        },
      }}
      renderValue={() => <ColorDotLabel color={color} label={label} />}
      options={options}
    />
  );
}
