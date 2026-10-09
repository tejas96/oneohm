'use client';

import { RotateCw } from 'lucide-react';
import * as React from 'react';

export function BandError({
  what,
  onRetry,
}: {
  what: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <section className="rounded-xl bg-surface p-5 shadow-e2">
      <p className="text-sm text-foreground-secondary">Could not load {what}.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-pill bg-accent-subtle px-3 text-xs font-medium text-primary-dark"
      >
        <RotateCw className="size-3" aria-hidden="true" />
        Retry
      </button>
    </section>
  );
}
