'use client';

import { Suspense } from 'react';

import { ProjectCreatePage } from './project-create-wizard';

import { Spinner } from '@/components/ui';

export function ProjectNewPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-5xl p-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            <span className="text-sm text-foreground-secondary">Loading...</span>
          </div>
        }
      >
        <ProjectCreatePage />
      </Suspense>
    </div>
  );
}
