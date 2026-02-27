'use client';

import { ChevronDown, Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type StepCardStatus = 'pending' | 'active' | 'completed';

export interface CollapsibleStepCardProps {
  /** Step number (1-based) */
  stepNumber: number;
  /** Step title */
  title: string;
  /** Summary text shown when collapsed */
  summary?: string;
  /** Current status of the step */
  status: StepCardStatus;
  /** Whether the step is expanded */
  isExpanded: boolean;
  /** Called when step header is clicked */
  onToggle: () => void;
  /** Whether clicking is allowed */
  disabled?: boolean;
  /** Content to render when expanded */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CollapsibleStepCard({
  stepNumber,
  title,
  summary,
  status,
  isExpanded,
  onToggle,
  disabled = false,
  children,
  className,
}: CollapsibleStepCardProps): React.JSX.Element {
  const isCompleted = status === 'completed';
  const isActive = status === 'active';
  const isPending = status === 'pending';

  return (
    <div
      className={cn(
        'rounded-lg border transition-all duration-fast overflow-hidden',
        isExpanded ? 'border-primary' : 'border-border-light',
        isActive && 'border-primary shadow-sm',
        className
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-4 px-4 py-3 text-left transition-colors duration-fast',
          !disabled && 'cursor-pointer hover:bg-muted',
          disabled && 'cursor-not-allowed opacity-50',
          isExpanded && 'border-b border-border-light'
        )}
        aria-expanded={isExpanded}
      >
        {/* Step number / check indicator */}
        <div
          className={cn(
            'size-8 rounded-full flex items-center justify-center shrink-0 font-medium text-sm',
            isCompleted && 'bg-success text-white',
            isActive && 'bg-primary text-white',
            isPending && 'bg-muted text-foreground-secondary border border-border-light'
          )}
        >
          {isCompleted ? (
            <Check className="size-icon-sm" />
          ) : (
            stepNumber
          )}
        </div>

        {/* Title and summary */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium',
              isActive || isExpanded ? 'text-foreground' : 'text-foreground-secondary'
            )}
          >
            {title}
          </p>
          {!isExpanded && summary && (
            <p className="text-xs text-foreground-tertiary truncate mt-0.5">{summary}</p>
          )}
        </div>

        {/* Expand/collapse indicator */}
        <ChevronDown
          className={cn(
            'size-icon-sm text-foreground-tertiary shrink-0 transition-transform duration-fast',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Collapsible content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-fast',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Step Card Group (convenience wrapper)
// ============================================================================

export interface StepCardGroupProps {
  /** Currently expanded step index (0-based) */
  expandedIndex: number;
  /** Called when a step is clicked */
  onStepChange: (index: number) => void;
  /** Step statuses array */
  statuses: StepCardStatus[];
  /** Children should be CollapsibleStepCard components */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function StepCardGroup({
  children,
  className,
}: StepCardGroupProps): React.JSX.Element {
  return <div className={cn('space-y-3', className)}>{children}</div>;
}
