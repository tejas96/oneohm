'use client';

import * as React from 'react';

/**
 * Local replacement for `@radix-ui/react-tabs`.
 *
 * Written as a primitive rather than wrapping MUI's `Tabs` because the two
 * models don't line up: MUI takes `value`/`onChange` on a container with `Tab`
 * children and renders its own indicator, while every call site here composes
 * `TabsList` / `TabsTrigger` / `TabsContent` freely and styles the active
 * state off `data-state="active"`. Wrapping MUI would mean suppressing its
 * indicator and re-deriving the composition — more code, and lossy.
 *
 * Unlike the popover-family components, tabs need no floating positioning, so
 * there is nothing here that MUI would do better.
 *
 * Implements the roving-tabindex keyboard pattern: arrows move between tabs,
 * Home/End jump to the ends, and the list is a single tab stop.
 */

interface TabsContextValue {
  value: string | undefined;
  setValue: (value: string) => void;
  baseId: string;
  orientation: 'horizontal' | 'vertical';
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs(component: string): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be rendered inside <Tabs.Root>`);
  return ctx;
}

export interface RootProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

export const Root = React.forwardRef<HTMLDivElement, RootProps>(
  ({ value, defaultValue, onValueChange, orientation = 'horizontal', children, ...props }, ref) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
    const isControlled = value !== undefined;
    const current = isControlled ? value : uncontrolled;
    const baseId = React.useId();

    const setValue = React.useCallback(
      (next: string) => {
        if (!isControlled) setUncontrolled(next);
        onValueChange?.(next);
      },
      [isControlled, onValueChange],
    );

    const ctx = React.useMemo(
      () => ({ value: current, setValue, baseId, orientation }),
      [current, setValue, baseId, orientation],
    );

    return (
      <TabsContext.Provider value={ctx}>
        <div ref={ref} data-orientation={orientation} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  },
);
Root.displayName = 'Tabs.Root';

export const List = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, onKeyDown, ...props }, ref) => {
    const { orientation } = useTabs('Tabs.List');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
      onKeyDown?.(e);
      const keys =
        orientation === 'vertical'
          ? ['ArrowUp', 'ArrowDown', 'Home', 'End']
          : ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(e.key)) return;
      e.preventDefault();

      const tabs = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')].filter(
        (t) => !t.disabled,
      );
      const active = document.activeElement as HTMLButtonElement | null;
      const index = active ? tabs.indexOf(active) : -1;

      let next: HTMLButtonElement | undefined;
      if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      else {
        const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
        next = tabs[(index + (forward ? 1 : -1) + tabs.length) % tabs.length];
      }

      next?.focus();
      // Automatic activation — selection follows focus, as Radix does by default.
      next?.click();
    };

    return (
      <div
        ref={ref}
        role="tablist"
        aria-orientation={orientation}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </div>
    );
  },
);
List.displayName = 'Tabs.List';

export interface TriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const Trigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
  ({ value, children, onClick, ...props }, ref) => {
    const { value: selected, setValue, baseId } = useTabs('Tabs.Trigger');
    const active = selected === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={`${baseId}-trigger-${value}`}
        aria-selected={active}
        aria-controls={`${baseId}-content-${value}`}
        // The styling contract every call site keys off.
        data-state={active ? 'active' : 'inactive'}
        tabIndex={active ? 0 : -1}
        onClick={(e) => {
          onClick?.(e);
          if (!props.disabled) setValue(value);
        }}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Trigger.displayName = 'Tabs.Trigger';

export interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  /** Keep mounted while hidden, for panels that hold form state. */
  forceMount?: boolean;
}

export const Content = React.forwardRef<HTMLDivElement, ContentProps>(
  ({ value, forceMount, children, ...props }, ref) => {
    const { value: selected, baseId } = useTabs('Tabs.Content');
    const active = selected === value;

    if (!active && !forceMount) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`${baseId}-content-${value}`}
        aria-labelledby={`${baseId}-trigger-${value}`}
        data-state={active ? 'active' : 'inactive'}
        hidden={!active}
        tabIndex={0}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Content.displayName = 'Tabs.Content';
