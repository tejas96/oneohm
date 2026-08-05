'use client';

import { cloneElement, isValidElement, type MouseEvent, type ReactElement, type ReactNode } from 'react';

import { showFeatureAccessDenied } from '@/lib/access-control/access-feedback';
import type { FeatureAccessKey } from '@/lib/access-control/feature-policy';
import { useFeatureAccess } from '@/lib/hooks/use-feature-access';

interface GuardedFeatureActionProps {
  feature: FeatureAccessKey;
  label?: string;
  children: ReactNode;
  onDenied?: () => void;
}

export function GuardedFeatureAction({
  feature,
  label,
  children,
  onDenied,
}: GuardedFeatureActionProps): React.JSX.Element {
  const allowed = useFeatureAccess(feature);

  if (allowed) {
    return <>{children}</>;
  }

  const handleDenied = (event?: MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    showFeatureAccessDenied({ feature, label });
    onDenied?.();
  };

  if (isValidElement(children)) {
    const child = children as ReactElement<{
      onClick?: (event: MouseEvent) => void;
      disabled?: boolean;
    }>;

    return cloneElement(child, {
      onClick: (event: MouseEvent) => {
        handleDenied(event);
      },
    });
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleDenied}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleDenied();
        }
      }}
      className="inline-flex"
    >
      {children}
    </span>
  );
}
