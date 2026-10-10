'use client';

import { SITE_JOURNEY_STEPS } from '@tejas96/shared/utils';
import { type JSX, useEffect, useState } from 'react';

import { journeyAltText, journeyPercent } from './format';

import { usePrefersReducedMotion } from '@/components/features/dashboard/kit';
import { cn } from '@/lib/utils';

const GLIDE = 'duration-[1200ms] ease-calm motion-reduce:transition-none motion-reduce:duration-0';

interface JourneyTrackProps {
  /** Index into `SITE_JOURNEY_STEPS` (0–5), as the backend computed it. */
  stageIndex: number;
  /** Out of play: the fill and the pin go grey where it stopped. */
  lost?: boolean;
  /** False for a customer with no site: an empty track, no pin. */
  hasSite?: boolean;
  /** Fill from the left on mount. Off once the list has made its entrance. */
  animateIn?: boolean;
  /** False when the stage was not sent at all: an empty track that claims nothing. */
  known?: boolean;
  className?: string;
}

/**
 * The six-stop track with its fill and pin. A change of stage tweens; the
 * entrance from zero only plays when `animateIn` is set.
 */
export function JourneyTrack({
  stageIndex,
  lost = false,
  hasSite = true,
  animateIn = false,
  known = true,
  className,
}: JourneyTrackProps): JSX.Element {
  const reduced = usePrefersReducedMotion();
  const target = journeyPercent(stageIndex, hasSite);
  const [shown, setShown] = useState(animateIn && !reduced ? 0 : target);

  useEffect(() => {
    // A timer, not rAF: frames pause in a background tab and the track would
    // sit empty until the tab is looked at.
    const timer = setTimeout(() => setShown(target), 40);
    return () => clearTimeout(timer);
  }, [target]);

  return (
    <div
      role="img"
      aria-label={journeyAltText(stageIndex, lost, hasSite, known)}
      className={cn('relative h-1.5 rounded-pill bg-background-tertiary', className)}
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 rounded-pill transition-[width]',
          GLIDE,
          lost
            ? 'bg-gray-300'
            : 'bg-[linear-gradient(90deg,var(--ds-primary-soft),var(--ds-primary))]',
        )}
        style={{ width: `${shown}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-between">
        {SITE_JOURNEY_STEPS.map((step, index) => (
          <i
            key={step}
            className={cn(
              'block size-1.5 rounded-full bg-surface ring-[1.5px]',
              hasSite && index <= stageIndex ? 'ring-primary' : 'ring-gray-300',
            )}
          />
        ))}
      </div>
      {hasSite ? (
        <div
          className={cn(
            'absolute top-1/2 -ml-[7px] -mt-[7px] size-3.5 rounded-full bg-surface ring-[3px] transition-[left]',
            GLIDE,
            lost ? 'ring-gray-400' : 'shadow-calm-pin ring-primary',
          )}
          style={{ left: `${shown}%` }}
        />
      ) : null}
    </div>
  );
}
