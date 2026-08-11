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
  disabled,
  pill = false,
}: {
  value: string;
  color: string;
  label: string;
  options: MUISelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /**
   * Opt-in borderless treatment: a fully-rounded chip filled with an 8% tint
   * of `color` instead of a bordered box. Used by My Tasks; the default
   * (outlined) is left untouched for the project task list.
   */
  pill?: boolean;
}): JSX.Element {
  const outlinedSx = {
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
  };

  const pillSx = {
    minWidth: 0,
    maxWidth: '100%',
    '& .MuiOutlinedInput-root': {
      fontSize: '11px',
      height: '23px',
      borderRadius: '999px',
      backgroundColor: `${color}14`,
      transition: 'background-color var(--dur-micro) var(--ease-standard)',
      '&:hover': { backgroundColor: `${color}24` },
      '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
      '&.Mui-focused': { backgroundColor: `${color}24` },
      '&.Mui-disabled': { backgroundColor: 'var(--ds-canvas-sunken)', opacity: 0.7 },
    },
    // The caret eats ~24px of a 96px cell; the chip reads better without it,
    // and the whole chip stays clickable.
    '& .MuiSelect-icon': { display: 'none' },
    '& .MuiSelect-select': {
      padding: '0 10px !important',
      color,
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
  };

  return (
    <MUISelect
      value={value}
      onChange={(e) => onChange(e.target.value as string)}
      size="small"
      variant="outlined"
      disabled={disabled}
      formControlProps={{
        size: 'small',
        sx: pill ? pillSx : outlinedSx,
      }}
      renderValue={() => <ColorDotLabel color={color} label={label} />}
      options={options}
    />
  );
}
