'use client';

import MuiTooltip, { type TooltipProps as MuiTooltipProps } from '@mui/material/Tooltip';
import * as React from 'react';

/**
 * Radix-shaped tooltip API backed by MUI's `Tooltip`.
 *
 * Unlike `tabs` or `radio-group`, this is an adapter rather than a
 * from-scratch primitive: a tooltip needs collision-aware floating
 * positioning (flipping when it would overflow the viewport, shifting along
 * the edge, tracking scroll). Radix uses Floating UI for that; MUI uses
 * Popper. Reimplementing it would be a real regression, so the compound API
 * is preserved and the positioning delegated.
 *
 * `Root` pairs its `Trigger` and `Content` children and passes them to MUI as
 * child and `title`. Both are always direct children at every call site, so
 * scanning one level is sufficient.
 *
 * Radix's `side`/`align` map onto MUI's single `placement`; `sideOffset`
 * becomes a Popper `offset` modifier. `data-side` is set on the content so
 * the existing `data-[side=…]:slide-in-from-*` animation classes keep working.
 */

const PLACEMENT = {
  'top-start': 'top-start',
  'top-center': 'top',
  'top-end': 'top-end',
  'bottom-start': 'bottom-start',
  'bottom-center': 'bottom',
  'bottom-end': 'bottom-end',
  'left-center': 'left',
  'right-center': 'right',
} as const;

interface TooltipContextValue {
  delayDuration?: number;
}
const TooltipContext = React.createContext<TooltipContextValue>({});

/** Supplies a shared open delay, mirroring Radix's Provider. */
export function Provider({
  children,
  delayDuration,
}: {
  children?: React.ReactNode;
  delayDuration?: number;
}): React.JSX.Element {
  const value = React.useMemo(() => ({ delayDuration }), [delayDuration]);
  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>;
}

export interface TriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
  children?: React.ReactNode;
}
/** Marker component — `Root` reads its children; it never renders directly. */
export const Trigger = ({ children }: TriggerProps): React.ReactNode => children;
Trigger.displayName = 'Tooltip.Trigger';

export interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  children?: React.ReactNode;
}
/**
 * Marker component — `Root` reads its props and children; this never renders
 * on its own. `forwardRef` only so call sites may pass a ref without a type
 * error; there is no element here to attach it to.
 */
export const Content = React.forwardRef<HTMLDivElement, ContentProps>(
  // `ref` is accepted and intentionally unused: `Root` reads this component's
  // props rather than rendering it, so there is no element to attach to.
  // React warns if a forwardRef render fn declares fewer than two parameters.
  ({ children }, _ref) => children as React.ReactElement,
);
Content.displayName = 'Tooltip.Content';

/**
 * MUI's Tooltip portals its own popper, so this is a transparent pass-through
 * kept purely for API compatibility with the Radix composition.
 */
export const Portal = ({ children }: { children?: React.ReactNode }): React.ReactNode => children;
Portal.displayName = 'Tooltip.Portal';

/**
 * Radix renders the arrow as a child element; MUI draws it from the `arrow`
 * prop on the tooltip itself. Rendering nothing here avoids a stray element —
 * the visible arrow is opted into via `showArrow` on the wrapper component.
 */
export const Arrow = (
  _props: React.HTMLAttributes<HTMLSpanElement> & {
    width?: number;
    height?: number;
  },
): null => null;
Arrow.displayName = 'Tooltip.Arrow';

export interface RootProps {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
}

export function Root({
  children,
  open,
  defaultOpen,
  onOpenChange,
  delayDuration,
}: RootProps): React.JSX.Element | null {
  const ctx = React.useContext(TooltipContext);
  const kids = React.Children.toArray(children) as React.ReactElement[];

  const trigger = kids.find(
    (k) => (k.type as { displayName?: string })?.displayName === 'Tooltip.Trigger',
  );
  const content = kids.find(
    (k) => (k.type as { displayName?: string })?.displayName === 'Tooltip.Content',
  );

  const triggerNode = trigger ? ((trigger.props as TriggerProps).children ?? null) : null;

  /**
   * The trigger must render even when there is no Content.
   *
   * Call sites legitimately render the content conditionally — the quote
   * builder does `{tooltipMessage && <TooltipContent>…}` so the hint only
   * appears while the action is blocked. Returning `null` here unmounted the
   * trigger along with it, which silently removed the "Calculate Quote"
   * button from the page whenever the form was valid. Radix keeps the trigger
   * mounted regardless; so does this.
   */
  if (!content) {
    return <>{triggerNode}</>;
  }

  if (!trigger) return null;

  const contentProps = content.props as ContentProps;
  const { side = 'top', align = 'center', sideOffset = 4, className } = contentProps;
  const placement = (PLACEMENT[`${side}-${align}` as keyof typeof PLACEMENT] ??
    side) as MuiTooltipProps['placement'];

  const triggerChild = (trigger.props as TriggerProps).children;

  return (
    <MuiTooltip
      placement={placement}
      enterDelay={delayDuration ?? ctx.delayDuration}
      {...(open !== undefined ? { open } : {})}
      {...(defaultOpen !== undefined ? { defaultOpen } : {})}
      onOpen={() => onOpenChange?.(true)}
      onClose={() => onOpenChange?.(false)}
      slotProps={{
        /**
         * The surface is MUI's own tooltip slot, styled centrally in
         * `mui-theme.ts`. `className` is forwarded when a call site supplies
         * one, but the DS look must NOT depend on it: the wrapper in
         * `components/ui/tooltip.tsx` computes its classes internally and they
         * never arrive here, which is exactly how this ended up rendering
         * white-on-transparent and invisible.
         */
        tooltip: {
          className,
          'data-side': side,
        } as never,
        popper: {
          modifiers: [{ name: 'offset', options: { offset: [0, sideOffset] } }],
        },
      }}
      // Children, not the element: MUI's own tooltip slot is the surface (see
      // the theme's MuiTooltip override), so wrapping them in another styled
      // div would stack two backgrounds.
      title={contentProps.children}
    >
      {React.isValidElement(triggerChild) ? triggerChild : <span>{triggerChild}</span>}
    </MuiTooltip>
  );
}
Root.displayName = 'Tooltip.Root';
