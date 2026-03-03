'use client';

import { Check, AlertTriangle } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface Step {
  /** Unique identifier for the step */
  id: string;
  /** Step title/label */
  label: string;
  /** Optional description text */
  description?: string;
  /** Custom icon for the step (used with 'with-icons' variant) */
  icon?: React.ReactNode;
}

export type StepStatus = 'completed' | 'current' | 'pending' | 'error';

export interface StepperProps {
  /** Array of steps to display */
  steps: Step[];
  /** Current active step (0-indexed) */
  currentStep: number;
  /** Visual variant */
  variant?: 'horizontal' | 'vertical' | 'simple' | 'with-icons' | 'compact' | 'dot';
  /** Called when a step is clicked */
  onStepClick?: (stepIndex: number) => void;
  /** Allow clicking on previous steps */
  allowClickPrevious?: boolean;
  /** Index of step with error (0-indexed) */
  errorStep?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStepStatus(index: number, currentStep: number, errorStep?: number): StepStatus {
  if (errorStep !== undefined && index === errorStep) {
    return 'error';
  }
  if (index < currentStep) {
    return 'completed';
  }
  if (index === currentStep) {
    return 'current';
  }
  return 'pending';
}

// ============================================================================
// Step Circle Component
// ============================================================================

interface StepCircleProps {
  index: number;
  status: StepStatus;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const CIRCLE_SIZES = {
  sm: 'size-container-sm',
  md: 'size-container-md',
  lg: 'size-container-lg',
} as const;

const ICON_SIZES = {
  sm: 'size-icon-sm',
  md: 'size-icon-md',
  lg: 'size-icon-lg',
} as const;

const TEXT_SIZES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
} as const;

const StepCircle = ({ index, status, icon, size = 'md', showIcon = false }: StepCircleProps) => {
  const circleClasses = cn(
    'rounded-full flex items-center justify-center font-semibold transition-all duration-fast',
    CIRCLE_SIZES[size],
    {
      'bg-primary text-white': status === 'completed' || status === 'current',
      'ring-4 ring-primary/20': status === 'current',
      'bg-border text-foreground-secondary': status === 'pending',
      'bg-error text-error-foreground ring-4 ring-error/20': status === 'error',
    },
  );

  const iconClasses = ICON_SIZES[size];
  const textClasses = TEXT_SIZES[size];

  // Render content based on status
  const renderContent = () => {
    if (status === 'completed') {
      return <Check className={iconClasses} aria-hidden="true" />;
    }
    if (status === 'error') {
      return <AlertTriangle className={iconClasses} aria-hidden="true" />;
    }
    if (showIcon && icon) {
      return icon;
    }
    return <span className={textClasses}>{index + 1}</span>;
  };

  return (
    <div className={circleClasses} aria-hidden="true">
      {renderContent()}
    </div>
  );
};

// ============================================================================
// Connector Line Component
// ============================================================================

interface ConnectorProps {
  status: 'completed' | 'pending';
  orientation: 'horizontal' | 'vertical';
}

const Connector = ({ status, orientation }: ConnectorProps) => {
  const classes = cn(
    'transition-colors duration-fast',
    status === 'completed' ? 'bg-primary' : 'bg-border',
    orientation === 'horizontal' ? 'flex-1 h-0.5 mx-4' : 'w-0.5 h-16',
  );

  return <div className={classes} aria-hidden="true" />;
};

// ============================================================================
// Horizontal Stepper
// ============================================================================

function HorizontalStepper({
  steps,
  currentStep,
  onStepClick,
  allowClickPrevious,
  errorStep,
  className,
}: StepperProps) {
  return (
    <div className={cn('relative', className)} role="list" aria-label="Progress steps">
      {/* Connecting line - positioned behind circles, spans from first to last step center */}
      <div
        className="absolute top-5 h-0.5 bg-border"
        style={{
          left: `calc(100% / ${steps.length} / 2)`,
          right: `calc(100% / ${steps.length} / 2)`,
        }}
        aria-hidden="true"
      >
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{
            width: currentStep === 0 ? '0%' : `${(currentStep / (steps.length - 1)) * 100}%`,
          }}
        />
      </div>

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(index, currentStep, errorStep);
          const isClickable = onStepClick && (allowClickPrevious ? index < currentStep : false);

          return (
            <div
              key={step.id}
              className={cn('flex flex-col items-center', isClickable && 'cursor-pointer group')}
              role="listitem"
              aria-current={status === 'current' ? 'step' : undefined}
              aria-label={`Step ${index + 1}: ${step.label}, ${status}`}
              onClick={isClickable ? () => onStepClick(index) : undefined}
              onKeyDown={
                isClickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onStepClick(index);
                      }
                    }
                  : undefined
              }
              tabIndex={isClickable ? 0 : undefined}
            >
              {/* Step circle */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 bg-background',
                  status === 'completed' && 'bg-primary text-white',
                  status === 'current' && 'bg-primary text-white ring-4 ring-primary/20',
                  status === 'pending' &&
                    'bg-white border-2 border-border text-foreground-tertiary',
                  status === 'error' && 'bg-error text-white ring-4 ring-error/20',
                  isClickable && 'group-hover:ring-4 group-hover:ring-primary/10',
                )}
              >
                {status === 'completed' ? (
                  <Check className="size-icon-sm" aria-hidden="true" />
                ) : status === 'error' ? (
                  <AlertTriangle className="size-icon-sm" aria-hidden="true" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Step label */}
              <p
                className={cn(
                  'mt-2 text-xs font-medium text-center whitespace-nowrap',
                  status === 'completed' && 'text-primary',
                  status === 'current' && 'text-primary',
                  status === 'pending' && 'text-foreground-tertiary',
                  status === 'error' && 'text-error',
                )}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Vertical Stepper
// ============================================================================

function VerticalStepper({
  steps,
  currentStep,
  onStepClick,
  allowClickPrevious,
  errorStep,
  className,
}: StepperProps) {
  return (
    <div className={cn('space-y-0', className)} role="list" aria-label="Progress steps">
      {steps.map((step, index) => {
        const status = getStepStatus(index, currentStep, errorStep);
        const isClickable = onStepClick && (allowClickPrevious ? index < currentStep : false);
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex gap-4" role="listitem">
            <div className="flex flex-col items-center">
              <div
                className={isClickable ? 'cursor-pointer' : undefined}
                onClick={isClickable ? () => onStepClick(index) : undefined}
                onKeyDown={
                  isClickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onStepClick(index);
                        }
                      }
                    : undefined
                }
                tabIndex={isClickable ? 0 : undefined}
                aria-current={status === 'current' ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${step.label}, ${status}`}
              >
                <StepCircle index={index} status={status} />
              </div>
              {!isLast && (
                <Connector
                  status={index < currentStep ? 'completed' : 'pending'}
                  orientation="vertical"
                />
              )}
            </div>
            <div className={cn('pb-8', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-medium',
                  status === 'pending' ? 'text-foreground-tertiary' : 'text-foreground',
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p
                  className={cn(
                    'text-xs mt-1',
                    status === 'current'
                      ? 'text-primary'
                      : status === 'error'
                        ? 'text-error'
                        : 'text-foreground-secondary',
                  )}
                >
                  {step.description}
                </p>
              )}
              {/* Content area for current step */}
              {status === 'current' && step.description && (
                <div className="mt-3 p-4 bg-muted rounded-lg">
                  <p className="text-xs text-foreground-secondary">{step.description}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Simple Stepper (Numbers only)
// ============================================================================

function SimpleStepper({ steps, currentStep, errorStep, className }: StepperProps) {
  return (
    <div
      className={cn('flex items-center justify-center gap-4', className)}
      role="list"
      aria-label="Progress steps"
    >
      {steps.map((step, index) => {
        const status = getStepStatus(index, currentStep, errorStep);
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <StepCircle index={index} status={status} size="sm" />
            {!isLast && (
              <div
                className={cn('w-12 h-0.5', index < currentStep ? 'bg-primary' : 'bg-border')}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================================================
// With Icons Stepper
// ============================================================================

function IconStepper({
  steps,
  currentStep,
  onStepClick,
  allowClickPrevious,
  errorStep,
  className,
}: StepperProps) {
  return (
    <div
      className={cn('flex items-center justify-between', className)}
      role="list"
      aria-label="Progress steps"
    >
      {steps.map((step, index) => {
        const status = getStepStatus(index, currentStep, errorStep);
        const isClickable = onStepClick && (allowClickPrevious ? index < currentStep : false);
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn('flex flex-col items-center', isClickable && 'cursor-pointer')}
              role="listitem"
              aria-current={status === 'current' ? 'step' : undefined}
              aria-label={`Step ${index + 1}: ${step.label}, ${status}`}
              onClick={isClickable ? () => onStepClick(index) : undefined}
              onKeyDown={
                isClickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onStepClick(index);
                      }
                    }
                  : undefined
              }
              tabIndex={isClickable ? 0 : undefined}
            >
              <StepCircle index={index} status={status} icon={step.icon} size="lg" showIcon />
              <p
                className={cn(
                  'text-xs font-medium mt-2',
                  status === 'current'
                    ? 'text-primary'
                    : status === 'pending'
                      ? 'text-foreground-tertiary'
                      : 'text-foreground',
                )}
              >
                {step.label}
              </p>
            </div>
            {!isLast && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2',
                  index < currentStep ? 'bg-primary' : 'bg-border',
                )}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================================================
// Compact Stepper (Progress bar style)
// ============================================================================

function CompactStepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div
      className={cn('flex items-center justify-between max-w-md', className)}
      role="group"
      aria-label="Progress"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className="text-sm text-foreground-secondary">{steps[currentStep]?.label}</span>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'w-8 h-1 rounded-full transition-colors duration-fast',
              index <= currentStep ? 'bg-primary' : 'bg-border',
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Dot Stepper (Carousel style)
// ============================================================================

function DotStepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  return (
    <div
      className={cn('flex items-center justify-center gap-2', className)}
      role="tablist"
      aria-label="Progress dots"
    >
      {steps.map((step, index) => {
        const isCurrent = index === currentStep;
        const isClickable = onStepClick !== undefined;

        return (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={isCurrent}
            aria-label={`Go to step ${index + 1}: ${step.label}`}
            onClick={isClickable ? () => onStepClick(index) : undefined}
            disabled={!isClickable}
            className={cn(
              'rounded-full transition-all duration-fast',
              isCurrent ? 'w-3 h-3 bg-primary ring-4 ring-primary/20' : 'w-2 h-2',
              !isCurrent && index < currentStep && 'bg-primary',
              !isCurrent && index > currentStep && 'bg-border-medium',
              isClickable && 'cursor-pointer hover:scale-110',
            )}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Stepper Component
// ============================================================================

export function Stepper({
  steps,
  currentStep,
  variant = 'horizontal',
  onStepClick,
  allowClickPrevious = true,
  errorStep,
  className,
}: StepperProps) {
  const props = {
    steps,
    currentStep,
    onStepClick,
    allowClickPrevious,
    errorStep,
    className,
  };

  switch (variant) {
    case 'vertical':
      return <VerticalStepper {...props} />;
    case 'simple':
      return <SimpleStepper {...props} />;
    case 'with-icons':
      return <IconStepper {...props} />;
    case 'compact':
      return <CompactStepper {...props} />;
    case 'dot':
      return <DotStepper {...props} />;
    case 'horizontal':
    default:
      return <HorizontalStepper {...props} />;
  }
}
