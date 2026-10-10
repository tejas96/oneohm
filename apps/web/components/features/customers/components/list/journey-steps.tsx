import type { JourneySteps as StepFacts } from '@tejas96/shared/types';
import type { JSX } from 'react';

import { journeyStepLines, type StepState } from './format';

import { CheckIcon } from '@/components/shared/calm-list';
import { cn } from '@/lib/utils';

const NOTE: Record<StepState, string | null> = {
  done: null,
  now: 'current step',
  missing: 'not recorded',
  todo: null,
};

/** What a screen reader hears after the step's name. */
const SPOKEN: Record<StepState, string> = {
  done: ' — done',
  now: '',
  missing: '',
  todo: ' — not yet',
};

/**
 * The six steps as a checklist. A step is ticked only when it is on record
 * (`steps`, from the server); a step the journey has passed without a record
 * reads "not recorded" and carries no tick; the current one is marked; later
 * ones are quiet. A lost journey has no current step.
 */
export function JourneySteps({
  stageIndex,
  lost,
  hasSite,
  steps,
}: {
  stageIndex: number;
  lost: boolean;
  hasSite: boolean;
  /** Which steps are on record; from `journey.steps` / `journeySteps`. */
  steps: StepFacts | undefined;
}): JSX.Element {
  const lines = journeyStepLines(stageIndex, lost, hasSite, steps);

  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {lines.map(({ name, state }, step) => {
        const last = step === lines.length - 1;
        const note = NOTE[state];
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
                (state === 'todo' || state === 'missing') &&
                  'bg-surface ring-2 ring-inset ring-gray-300',
              )}
            >
              {state === 'done' ? <CheckIcon /> : null}
            </span>
            <div>
              <span
                className={cn(
                  'block',
                  state === 'done' || state === 'now'
                    ? 'font-medium'
                    : 'font-normal text-foreground-tertiary',
                )}
              >
                {name}
                <span className="sr-only">{SPOKEN[state]}</span>
              </span>
              {note ? (
                <small className="block text-[12px] text-foreground-tertiary">{note}</small>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
