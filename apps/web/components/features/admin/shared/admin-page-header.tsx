'use client';

import React from 'react';

import { Typography } from '@/components/ui';

interface AdminPageHeaderProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: AdminPageHeaderProps): React.JSX.Element {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
      <div>
        <Typography variant="h2">{title}</Typography>
        <Typography variant="body" color="muted" className="mt-1">
          {description}
        </Typography>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
