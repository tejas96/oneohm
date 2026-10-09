'use client';

import * as React from 'react';

import { formatCount } from './format';
import { useCountUp } from './motion';

export function AnimatedNumber({
  value,
  format = formatCount,
}: {
  value: number;
  format?: (n: number) => string;
}): React.JSX.Element {
  const shown = useCountUp(value);
  // Screen readers get the real value, not every frame of the tween.
  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
