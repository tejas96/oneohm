import { SITE_JOURNEY_STEPS } from '@tejas96/shared/utils';
import type { JSX } from 'react';

import { CheckIcon } from './icons';

import { cn } from '@/lib/utils';

type StepState = 'done' | 'now' | 'todo';

/**
 * The six steps as a checklist: ticked up to where the customer stands, the
 * current one marked. A lost customer keeps its ticks up to where it stopped
 * and has no current step.
 */
export function JourneySteps({
  stageIndex,
  lost,
  hasSite,
}: {
  stageIndex: number;
  lost: boolean;
  hasSite: boolean;
}): JSX.Element {
  const stateOf = (step: number): StepState => {
    if (!hasSite) return 'todo';
    if (step < stageIndex) return 'done';
    if (step === stageIndex) return lost ? 'done' : 'now';
    return 'todo';
  };

  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {SITE_JOURNEY_STEPS.map((name, step) => {
        const state = stateOf(step);
        const last = step === SITE_JOURNEY_STEPS.length - 1;
        return (
          <li
            key={name}
            aria-current={state === 'now' ? 'step' : undefined}
            className={cn('relative flex items-start gap-3', !last && 'pb-3.5')}
          >
            {!last ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute bottom-0 left-2 top-[18px] w-0.5',
                  state === 'done' ? 'bg-[var(--ds-primary-soft)]' : 'bg-border',
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                'z-[1] mt-px grid size-[18px] flex-none place-items-center rounded-full text-white',
                state === 'done' && 'bg-primary',
                state === 'now' && 'bg-surface ring-[5px] ring-inset ring-primary',
                state === 'todo' && 'bg-surface ring-2 ring-inset ring-gray-300',
              )}
            >
              {state === 'done' ? <CheckIcon /> : null}
            </span>
            <div>
              <span
                className={cn(
                  'block',
                  state === 'todo' ? 'font-normal text-foreground-muted' : 'font-medium',
                )}
              >
                {name}
                <span className="sr-only">
                  {state === 'done' ? ' — done' : state === 'todo' ? ' — not yet' : ''}
                </span>
              </span>
              {state === 'now' ? (
                <small className="block text-[12px] text-foreground-muted">current step</small>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
