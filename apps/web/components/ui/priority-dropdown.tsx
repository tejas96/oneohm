'use client';

import { LookupTypeCode } from '@oneohm-epc/shared/types';
import { useMemo } from 'react';

import { MUISelect, type MUISelectOption, type MUISelectProps } from './mui-select';

import { useLookupOptions } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

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
  const { items, isLoading, isError, error } = useLookupOptions(LookupTypeCode.PRIORITY);

  const options = useMemo((): MUISelectOption[] => {
    if (isLoading) {
      return [{ value: '', label: 'Loading priorities…', disabled: true }];
    }

    const mapped: MUISelectOption[] = items.map((item) => ({
      value: item.value,
      label: item.label,
    }));
    return includeAllOption ? [{ value: '', label: allLabel }, ...mapped] : mapped;
  }, [allLabel, includeAllOption, isLoading, items]);

  const helperText = isError ? getErrorMessage(error) : props.helperText;

  return (
    <MUISelect
      {...props}
      disabled={disabled || isLoading || isError}
      options={options}
      helperText={helperText}
    />
  );
}
