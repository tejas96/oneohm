'use client';

import * as React from 'react';

import { AGING_BUCKET_COLOR, AGING_BUCKET_LABEL } from '../constants';

import { MUIStatusChip } from '@/components/ui';
import type { AgingBucket } from '@/lib/hooks/resources';

export interface AgingBucketChipProps {
  bucket: AgingBucket;
  /** Tight chips inside table cells; comfortable elsewhere. */
  size?: 'small' | 'medium';
  /** Override the auto-mapped label (e.g. show only the count). */
  label?: string;
}

/**
 * Visual shorthand for an AR aging bucket. Thin wrapper over
 * `MUIStatusChip` so all aging indicators stay in lockstep with the
 * MUI palette and never drift from the bucket→color map in `constants`.
 */
export function AgingBucketChip({
  bucket,
  size = 'small',
  label,
}: AgingBucketChipProps): React.JSX.Element {
  return (
    <MUIStatusChip
      label={label ?? AGING_BUCKET_LABEL[bucket]}
      color={AGING_BUCKET_COLOR[bucket]}
      size={size}
    />
  );
}
