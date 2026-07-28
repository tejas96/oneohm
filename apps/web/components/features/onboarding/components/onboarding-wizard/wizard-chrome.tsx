'use client';

import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { Box } from '@mui/material';
import Link from 'next/link';
import * as React from 'react';

import { STEP_GROUP_ORDER, type OnboardingStepConfig } from '../../constants';

import { MUIAvatar } from '@/components/ui';
import { color, radius, shadow } from '@/lib/theme/tokens';

/* -------------------------------------------------------------------------- */
/*  Shared type scale — lifted straight from the design spec                   */
/* -------------------------------------------------------------------------- */

const OVERLINE_SX = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: color['text-tertiary'],
} as const;

/* -------------------------------------------------------------------------- */
/*  StepCard — the surface every step renders inside                           */
/* -------------------------------------------------------------------------- */

interface StepCardProps {
  overline: string;
  title: string;
  blurb?: string;
  children: React.ReactNode;
}

export function StepCard({ overline, title, blurb, children }: StepCardProps): React.JSX.Element {
  return (
    <Box
      sx={{
        background: color.surface,
        borderRadius: radius['card-functional'],
        boxShadow: shadow.e2,
        p: { xs: 2, sm: '22px 24px' },
      }}
    >
      <Box component="p" sx={{ ...OVERLINE_SX, m: 0 }}>
        {overline}
      </Box>
      <Box
        component="h2"
        sx={{
          m: '6px 0 4px',
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: color['text-primary'],
        }}
      >
        {title}
      </Box>
      {blurb ? (
        <Box
          component="p"
          sx={{
            m: '0 0 18px',
            fontSize: 13,
            color: color['text-secondary'],
            maxWidth: 520,
            textWrap: 'pretty',
          }}
        >
          {blurb}
        </Box>
      ) : (
        <Box sx={{ height: 12 }} />
      )}
      {children}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*  Banners                                                                    */
/* -------------------------------------------------------------------------- */

interface BlockedBannerProps {
  title: string;
  body: string;
}

/** Hard stop — e.g. the looked-up customer is inactive. */
export function BlockedBanner({ title, body }: BlockedBannerProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        p: '14px 16px',
        borderRadius: radius['rf-lg'],
        background: color['danger-bg'],
      }}
    >
      <WarningAmberRoundedIcon sx={{ color: color.danger, fontSize: 20, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em', color: color.danger }}
        >
          {title}
        </Box>
        <Box sx={{ fontSize: 12.5, color: color['text-secondary'], mt: '2px', textWrap: 'pretty' }}>
          {body}
        </Box>
      </Box>
    </Box>
  );
}

interface ErrorSummaryProps {
  messages: string[];
}

/** Collected validation errors for the current step, shown above the card. */
export function ErrorSummary({ messages }: ErrorSummaryProps): React.JSX.Element | null {
  if (messages.length === 0) return null;
  return (
    <Box
      sx={{ p: '14px 16px', borderRadius: radius['rf-lg'], background: color['danger-bg'] }}
      role="alert"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.125 }}>
        <ErrorOutlineRoundedIcon sx={{ color: color.danger, fontSize: 17 }} />
        <Box sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', color: color.danger }}>
          {messages.length === 1
            ? 'One thing to fix before moving on'
            : `${messages.length} things to fix before moving on`}
        </Box>
      </Box>
      <Box component="ul" sx={{ m: '8px 0 0', pl: '28px', display: 'grid', gap: '3px' }}>
        {messages.map((text) => (
          <Box component="li" key={text} sx={{ fontSize: 12.5, color: color['text-secondary'] }}>
            {text}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*  Customer chip (page header)                                                */
/* -------------------------------------------------------------------------- */

interface CustomerChipProps {
  name: string;
  /** Secondary line — customer code, phone, or a status note. */
  meta: string;
  /**
   * Shows the customer's initials instead of the saved-check. Use when the
   * chip answers "whose site is this?" rather than "did the save land?".
   */
  showAvatar?: boolean;
  /** Turns the chip into a link to the customer record. */
  href?: string;
}

export function CustomerChip({
  name,
  meta,
  showAvatar = false,
  href,
}: CustomerChipProps): React.JSX.Element {
  return (
    <Box
      component={href ? Link : 'div'}
      {...(href ? { href } : {})}
      sx={{
        ml: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        p: '9px 14px 9px 10px',
        background: color.surface,
        borderRadius: radius.pill,
        boxShadow: shadow.e2,
        flexShrink: 0,
        textDecoration: 'none',
        color: 'inherit',
        ...(href
          ? {
              transition: 'box-shadow 160ms ease',
              '&:hover': { boxShadow: shadow.e3 },
            }
          : {}),
      }}
    >
      {showAvatar ? (
        <MUIAvatar name={name} size="sm" />
      ) : (
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: color['success-bg'],
            color: color.success,
            flexShrink: 0,
          }}
        >
          <CheckRoundedIcon sx={{ fontSize: 16 }} />
        </Box>
      )}
      <Box sx={{ lineHeight: 1.25, whiteSpace: 'nowrap' }}>
        <Box sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>{name}</Box>
        <Box sx={{ fontSize: 11, color: color['text-tertiary'], fontFamily: 'var(--font-mono)' }}>
          {meta}
        </Box>
      </Box>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sidebar stepper — grouped by phase                                         */
/* -------------------------------------------------------------------------- */

interface WizardStepperProps {
  steps: OnboardingStepConfig[];
  activeStep: number;
  completedSteps: Set<number>;
  onStepClick: (index: number) => void;
}

export function WizardStepper({
  steps,
  activeStep,
  completedSteps,
  onStepClick,
}: WizardStepperProps): React.JSX.Element {
  const groups = STEP_GROUP_ORDER.map((label) => ({
    label,
    items: steps.map((step, index) => ({ step, index })).filter((x) => x.step.group === label),
  })).filter((g) => g.items.length > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {groups.map((group) => (
        <Box key={group.label} sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Only label groups when there's more than one — a single-group
              (edit) flow reads as a plain list. */}
          {groups.length > 1 && (
            <Box sx={{ ...OVERLINE_SX, fontSize: 10.5, p: '0 4px 4px' }}>{group.label}</Box>
          )}
          {group.items.map(({ step, index }) => {
            const isActive = index === activeStep;
            const isDone = completedSteps.has(index) || index < activeStep;
            const isClickable = index < activeStep || completedSteps.has(index - 1);

            return (
              <Box
                key={step.key}
                onClick={() => isClickable && onStepClick(index)}
                role="button"
                tabIndex={isClickable ? 0 : -1}
                aria-current={isActive ? 'step' : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onStepClick(index);
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '11px',
                  p: '8px 10px',
                  borderRadius: radius['rf-lg'],
                  cursor: isClickable ? 'pointer' : 'default',
                  background: isActive ? color.surface : 'transparent',
                  boxShadow: isActive ? shadow.e2 : 'none',
                  transition: 'background 160ms ease, box-shadow 160ms ease',
                  '&:hover': isClickable && !isActive ? { background: color['surface-alt'] } : {},
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: isActive
                      ? color['action-primary']
                      : isDone
                        ? color['success-bg']
                        : color.surface,
                    color: isActive ? '#fff' : isDone ? color.success : color['text-tertiary'],
                    boxShadow: isActive || isDone ? 'none' : shadow.e1,
                  }}
                >
                  {isDone && !isActive ? <CheckRoundedIcon sx={{ fontSize: 14 }} /> : index + 1}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 500,
                      letterSpacing: '-0.01em',
                      color: isActive
                        ? color['text-primary']
                        : isDone
                          ? color['text-secondary']
                          : color['text-tertiary'],
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {step.label}
                  </Box>
                  <Box
                    sx={{
                      fontSize: 11,
                      color: color['text-tertiary'],
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {step.description}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page header                                                                */
/* -------------------------------------------------------------------------- */

interface WizardHeaderProps {
  overline: string;
  title: string;
  blurb: string;
  chip?: React.ReactNode;
}

export function WizardHeader({
  overline,
  title,
  blurb,
  chip,
}: WizardHeaderProps): React.JSX.Element {
  return (
    <Box>
      <Box component="p" sx={{ ...OVERLINE_SX, m: 0 }}>
        {overline}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Box
            component="h1"
            sx={{ m: '5px 0 3px', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}
          >
            {title}
          </Box>
          <Box
            component="p"
            sx={{
              m: 0,
              fontSize: 13.5,
              color: color['text-secondary'],
              maxWidth: 620,
              textWrap: 'pretty',
            }}
          >
            {blurb}
          </Box>
        </Box>
        {chip}
      </Box>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mobile progress header                                                     */
/* -------------------------------------------------------------------------- */

interface MobileProgressProps {
  activeLabel: string;
  stepCounter: string;
  progressPct: number;
}

export function MobileProgress({
  activeLabel,
  stepCounter,
  progressPct,
}: MobileProgressProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: { xs: 'block', md: 'none' },
        background: color.surface,
        borderRadius: radius['card-functional'],
        boxShadow: shadow.e1,
        p: 2,
        mb: 3,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>{activeLabel}</Box>
        <Box sx={{ fontSize: 11.5, color: color['text-tertiary'] }}>{stepCounter}</Box>
      </Box>
      <Box
        sx={{
          height: 6,
          borderRadius: radius.pill,
          background: color['canvas-sunken'],
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${progressPct}%`,
            background: color['action-primary'],
            borderRadius: radius.pill,
            transition: 'width 240ms ease',
          }}
        />
      </Box>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sticky footer                                                              */
/* -------------------------------------------------------------------------- */

interface WizardFooterProps {
  hint: string;
  children: React.ReactNode;
}

export function WizardFooter({ hint, children }: WizardFooterProps): React.JSX.Element {
  return (
    <Box sx={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
      <Box
        sx={{
          background: color.surface,
          borderRadius: radius['card-functional'],
          boxShadow: shadow.e3,
          p: '12px 16px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              fontSize: 12,
              color: color['text-tertiary'],
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {hint}
          </Box>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.25 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
