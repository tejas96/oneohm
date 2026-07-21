import * as React from 'react';

import { cn } from './utils';

/**
 * Local replacement for `@radix-ui/react-slot`.
 *
 * `Slot` renders its props onto its single child instead of emitting a wrapper
 * element — the mechanism behind the `asChild` pattern (`<Button asChild><Link
 * /></Button>` renders one `<a>`, not a button wrapping a link).
 *
 * Radix's version also handles slottable children and composed refs across
 * React versions. This app only ever wraps a single element — typically a
 * next/link `<Link>` — so cloning with merged props covers every call site.
 *
 * Merge rules, matching Radix:
 *   - `className` is combined (slot's first, so the child's wins on conflict)
 *   - `style` is merged, child taking precedence
 *   - event handlers are chained: slot's runs, then the child's
 *   - everything else: child overrides slot
 *
 * React 19 passes `ref` as a normal prop, so no `composeRefs` helper is
 * needed here.
 */

type AnyProps = Record<string, unknown>;

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...slotProps, ...childProps };

  for (const key of Object.keys(slotProps)) {
    const slotValue = slotProps[key];
    const childValue = childProps[key];

    // Event handlers chain rather than overwrite, so an `onClick` on the
    // wrapper still fires alongside one on the child.
    if (/^on[A-Z]/.test(key) && typeof slotValue === 'function') {
      merged[key] =
        typeof childValue === 'function'
          ? (...args: unknown[]) => {
              (slotValue as (...a: unknown[]) => void)(...args);
              (childValue as (...a: unknown[]) => void)(...args);
            }
          : slotValue;
    } else if (key === 'style') {
      merged.style = { ...(slotValue as object), ...(childValue as object) };
    } else if (key === 'className') {
      merged.className = cn(slotValue as string, childValue as string);
    }
  }

  return merged;
}

export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

export const Slot = React.forwardRef<HTMLElement, SlotProps>(({ children, ...slotProps }, ref) => {
  if (!React.isValidElement(children)) {
    /**
     * Render the children rather than nothing.
     *
     * Returning `null` here is the same failure the tooltip adapter had: an
     * `asChild` given a text node, a fragment, or a conditional expression
     * would silently erase the content instead of degrading. Radix warns and
     * drops it; for this codebase, showing unstyled content beats showing an
     * empty space where a control should be — a missing button is far harder
     * to notice than a slightly-off one.
     */
    return <>{children}</>;
  }

  const child = children as React.ReactElement<AnyProps>;
  return React.cloneElement(child, {
    ...mergeProps(slotProps as AnyProps, child.props),
    ref,
  } as AnyProps);
});
Slot.displayName = 'Slot';
