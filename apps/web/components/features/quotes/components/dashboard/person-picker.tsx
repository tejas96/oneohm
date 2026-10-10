'use client';

import type { QuotesDashboard } from '@tejas96/shared/types';
import * as React from 'react';

import { MUISelect } from '@/components/ui';

const EVERYONE = '';

export function PersonPicker({
  people,
  value,
  onChange,
}: {
  people: QuotesDashboard['people'];
  value: string | undefined;
  onChange: (person: string | undefined) => void;
}): React.JSX.Element {
  const options = React.useMemo(() => {
    const list = [
      { value: EVERYONE, label: 'Everyone' },
      ...people.map((p) => ({ value: p.id, label: p.name })),
    ];
    // A cold `?person=` link (e.g. Back from the list) renders before the people
    // arrive: keep the value in range so the select is never blank or warned about.
    if (value && !people.some((p) => p.id === value)) {
      list.splice(1, 0, { value, label: '…' });
    }
    return list;
  }, [people, value]);
  return (
    <MUISelect
      size="small"
      aria-label="Person"
      displayEmpty
      value={value ?? EVERYONE}
      options={options}
      onChange={(e) => {
        const next = String(e.target.value);
        onChange(next === EVERYONE ? undefined : next);
      }}
      sx={{ minWidth: 160 }}
    />
  );
}
