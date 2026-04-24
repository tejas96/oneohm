'use client';

import { useCallback, useEffect, useState } from 'react';

interface Slide {
  headline: string;
  highlight: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    headline: 'One Source Of Truth',
    highlight: 'For Every Workflow',
    description:
      'From lead capture to project handover — streamline your entire solar EPC workflow in one platform.',
  },
  {
    headline: 'Track Every Project',
    highlight: 'In Real Time',
    description:
      'Monitor installations, manage teams, and hit milestones on schedule with full visibility.',
  },
  {
    headline: 'Quote Smarter',
    highlight: 'Close Faster',
    description:
      'Generate accurate solar quotes with automated BOM, pricing, and financing options in minutes.',
  },
];

const INTERVAL = 5000;

export function HeroTextSlider(): React.JSX.Element {
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);

  const goTo = useCallback((idx: number) => {
    setFade(false);
    setTimeout(() => {
      setCurrent(idx);
      setFade(true);
    }, 400);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((current + 1) % SLIDES.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [current, goTo]);

  const slide = SLIDES[current] ?? SLIDES[0]!;

  return (
    <div>
      <div
        className="transition-all duration-500 ease-in-out"
        style={{ opacity: fade ? 1 : 0, transform: fade ? 'translateY(0)' : 'translateY(12px)' }}
      >
        <h1 className="text-5xl font-semibold text-foreground leading-tight tracking-tight mb-2">
          {slide.headline}
        </h1>
        <h1 className="text-5xl font-semibold leading-tight tracking-tight mb-6 text-primary">
          {slide.highlight}
        </h1>
        <p className="text-lg text-foreground-tertiary leading-relaxed max-w-md">
          {slide.description}
        </p>
      </div>

      {/* Dots */}
      <div className="flex items-center gap-2 mt-8">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? 'w-6 h-2 bg-primary'
                : 'w-2 h-2 bg-foreground-muted/30 hover:bg-foreground-muted/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
