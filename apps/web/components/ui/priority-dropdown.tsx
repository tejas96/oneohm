'use client';

import { TASK_PRIORITY_OPTIONS } from '@tejas96/shared/constants';
import { useMemo } from 'react';

import { MUISelect, type MUISelectOption, type MUISelectProps } from './mui-select';

export interface PriorityDropdownProps extends Omit<MUISelectProps, 'options' | 'ref'> {
  includeAllOption?: boolean;
  allLabel?: string;
}

export function PriorityDropdown({
  includeAllOption = false,
  allLabel = 'All Priority',
  disabled,
  ...props
}: PriorityDropdownProps): React.JSX.Element {
  const options = useMemo((): MUISelectOption[] => {
    const mapped: MUISelectOption[] = TASK_PRIORITY_OPTIONS.map((item) => ({
      value: item.value,
      label: item.label,
    }));
    return includeAllOption ? [{ value: '', label: allLabel }, ...mapped] : mapped;
  }, [allLabel, includeAllOption]);

  return <MUISelect {...props} disabled={disabled} options={options} />;
}
