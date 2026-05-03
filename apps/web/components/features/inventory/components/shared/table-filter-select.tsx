'use client';

import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from '@mui/material';

interface TableFilterOption {
  value: string;
  label: string;
}

interface TableFilterSelectProps {
  label: string;
  value: string;
  options: TableFilterOption[];
  onChange: (value: string) => void;
  minWidth?: number;
  allLabel?: string;
}

export function TableFilterSelect({
  label,
  value,
  options,
  onChange,
  minWidth = 170,
  allLabel = 'All',
}: TableFilterSelectProps): React.JSX.Element {
  const handleChange = (event: SelectChangeEvent): void => {
    onChange(event.target.value);
  };

  return (
    <FormControl size="small" sx={{ minWidth }}>
      <InputLabel>{label}</InputLabel>
      <Select value={value} label={label} onChange={handleChange}>
        <MenuItem value="all">{allLabel}</MenuItem>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
