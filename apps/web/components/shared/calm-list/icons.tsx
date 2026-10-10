import type { JSX, SVGProps } from 'react';

/**
 * The list's own line icons: 2px round strokes, drawn to the approved design.
 * MUI's filled glyphs are heavier than the rows they would sit in.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Stroke({ size = 18, children, ...rest }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps): JSX.Element {
  return (
    <Stroke {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Stroke>
  );
}

export function FiltersIcon(props: IconProps): JSX.Element {
  return (
    <Stroke {...props}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </Stroke>
  );
}

export function SortIcon(props: IconProps): JSX.Element {
  return (
    <Stroke {...props}>
      <path d="M7 4v16M7 20l-3-3M17 20V4M17 4l3 3" />
    </Stroke>
  );
}

export function CalendarIcon(props: IconProps): JSX.Element {
  return (
    <Stroke size={17} {...props}>
      <rect x="4" y="5" width="16" height="16" rx="3" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </Stroke>
  );
}

export function PhoneIcon(props: IconProps): JSX.Element {
  return (
    <Stroke size={17} {...props}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </Stroke>
  );
}

export function CloseIcon(props: IconProps): JSX.Element {
  return (
    <Stroke {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Stroke>
  );
}

export function CheckIcon(props: IconProps): JSX.Element {
  return (
    <Stroke size={11} strokeWidth={3.5} {...props}>
      <path d="m5 12 5 5 9-10" />
    </Stroke>
  );
}

export function TicketIcon(props: IconProps): JSX.Element {
  return (
    <Stroke size={15} {...props}>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
      <path d="M14 6v12" strokeDasharray="2 3" />
    </Stroke>
  );
}

export function ChevronIcon({
  direction,
  ...props
}: IconProps & { direction: 'left' | 'right' }): JSX.Element {
  return (
    <Stroke size={16} {...props}>
      <path d={direction === 'left' ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'} />
    </Stroke>
  );
}
