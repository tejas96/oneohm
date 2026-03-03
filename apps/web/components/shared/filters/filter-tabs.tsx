'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface FilterTab<T extends string = string> {
  /** Unique identifier for the tab */
  id: T;
  /** Display label */
  label: string;
  /** Optional count to show */
  count?: number;
  /** Icon to show before label */
  icon?: React.ReactNode;
}

export interface FilterTabsProps<T extends string = string> {
  /** Array of tabs to display */
  tabs: FilterTab<T>[];
  /** Currently active tab ID */
  value: T;
  /** Called when tab changes */
  onChange: (value: T) => void;
  /** Visual variant */
  variant?: 'default' | 'pills' | 'underline';
  /** Size */
  size?: 'xs' | 'sm' | 'default';
  /** Full width tabs */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function FilterTabs<T extends string = string>({
  tabs,
  value,
  onChange,
  variant = 'default',
  size = 'default',
  fullWidth = false,
  className,
}: FilterTabsProps<T>): React.JSX.Element {
  const baseTabClasses = cn(
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-fast cursor-pointer',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2',
  );

  const sizeClasses = {
    xs: 'text-xs px-2 py-1',
    sm: 'text-xs px-2.5 py-1.5',
    default: 'text-sm px-3 py-2',
  };

  const variantClasses = {
    default: {
      container: 'inline-flex p-1 bg-muted rounded-lg',
      tab: cn(sizeClasses[size], 'rounded-md'),
      active: 'bg-background text-foreground shadow-sm',
      inactive: 'text-foreground-secondary hover:text-foreground',
    },
    pills: {
      container: 'inline-flex gap-2',
      tab: cn(sizeClasses[size], 'rounded-full border'),
      active: 'border-primary bg-primary/10 text-primary',
      inactive:
        'border-border-light text-foreground-secondary hover:border-primary/50 hover:text-foreground',
    },
    underline: {
      container: 'inline-flex border-b border-border-light',
      tab: cn(sizeClasses[size], '-mb-px border-b-2'),
      active: 'border-primary text-primary',
      inactive:
        'border-transparent text-foreground-secondary hover:text-foreground hover:border-border-medium',
    },
  };

  const styles = variantClasses[variant];

  return (
    <div role="tablist" className={cn(styles.container, fullWidth && 'flex w-full', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === value;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              baseTabClasses,
              styles.tab,
              isActive ? styles.active : styles.inactive,
              fullWidth && 'flex-1',
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full flex items-center justify-center',
                  isActive
                    ? variant === 'pills'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-primary/10 text-primary'
                    : 'bg-muted text-foreground-secondary',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
