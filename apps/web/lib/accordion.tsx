'use client';

import * as React from 'react';

/**
 * Local replacement for `@radix-ui/react-accordion`.
 *
 * Kept as a primitive rather than swapped for MUI's `Accordion`: the wizard's
 * milestone group composes its own header (trigger and action buttons as
 * siblings, to avoid nesting a button inside a button) and styles off
 * `data-state="open"`. MUI's Accordion owns its summary markup and would break
 * both.
 *
 * Reproduces the Radix surface in use: `Root` (single/multiple, controlled or
 * not, `collapsible`), `Item`, `Header`, `Trigger`, `Content`, and the
 * `data-state` attribute the Tailwind classes key off.
 */

interface AccordionContextValue {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
}
const AccordionContext = React.createContext<AccordionContextValue | null>(null);

interface ItemContextValue {
  value: string;
  open: boolean;
  contentId: string;
  triggerId: string;
}
const ItemContext = React.createContext<ItemContextValue | null>(null);

function useItem(component: string): ItemContextValue {
  const ctx = React.useContext(ItemContext);
  if (!ctx) throw new Error(`<${component}> must be rendered inside an <Accordion.Item>`);
  return ctx;
}

type RootProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> &
  (
    | {
        type: 'single';
        value?: string;
        defaultValue?: string;
        onValueChange?: (value: string) => void;
        collapsible?: boolean;
      }
    | {
        type: 'multiple';
        value?: string[];
        defaultValue?: string[];
        onValueChange?: (value: string[]) => void;
        collapsible?: never;
      }
  );

export const Root = React.forwardRef<HTMLDivElement, RootProps>((props, ref) => {
  const { type, value, defaultValue, onValueChange, children, ...rest } = props as RootProps & {
    value?: string | string[];
    defaultValue?: string | string[];
    onValueChange?: (v: never) => void;
  };
  const collapsible = type === 'single' ? (props as { collapsible?: boolean }).collapsible : true;

  const [uncontrolled, setUncontrolled] = React.useState<string[]>(() => {
    if (defaultValue == null) return [];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });

  const isControlled = value !== undefined;
  const open = React.useMemo<string[]>(() => {
    if (!isControlled) return uncontrolled;
    return Array.isArray(value) ? value : value ? [value] : [];
  }, [isControlled, value, uncontrolled]);

  const commit = React.useCallback(
    (next: string[]) => {
      if (!isControlled) setUncontrolled(next);
      // `single` reports a bare string, `multiple` an array — matching Radix.
      (onValueChange as ((v: string | string[]) => void) | undefined)?.(
        type === 'single' ? (next[0] ?? '') : next,
      );
    },
    [isControlled, onValueChange, type],
  );

  const ctx = React.useMemo<AccordionContextValue>(
    () => ({
      isOpen: (v) => open.includes(v),
      toggle: (v) => {
        const currentlyOpen = open.includes(v);
        if (type === 'single') {
          if (currentlyOpen && collapsible === false) return;
          commit(currentlyOpen ? [] : [v]);
        } else {
          commit(currentlyOpen ? open.filter((x) => x !== v) : [...open, v]);
        }
      },
    }),
    [open, type, collapsible, commit],
  );

  return (
    <AccordionContext.Provider value={ctx}>
      <div ref={ref} {...rest}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
});
Root.displayName = 'Accordion.Root';

export interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  ({ value, children, ...props }, ref) => {
    const group = React.useContext(AccordionContext);
    if (!group) throw new Error('<Accordion.Item> must be rendered inside an <Accordion.Root>');
    const id = React.useId();
    const open = group.isOpen(value);

    const ctx = React.useMemo(
      () => ({ value, open, contentId: `${id}-content`, triggerId: `${id}-trigger` }),
      [value, open, id],
    );

    return (
      <ItemContext.Provider value={ctx}>
        <div ref={ref} data-state={open ? 'open' : 'closed'} {...props}>
          {children}
        </div>
      </ItemContext.Provider>
    );
  },
);
Item.displayName = 'Accordion.Item';

export const Header = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => {
    const item = useItem('Accordion.Header');
    return (
      <div ref={ref} data-state={item.open ? 'open' : 'closed'} {...props}>
        {children}
      </div>
    );
  },
);
Header.displayName = 'Accordion.Header';

export const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const group = React.useContext(AccordionContext);
  const item = useItem('Accordion.Trigger');
  return (
    <button
      ref={ref}
      type="button"
      id={item.triggerId}
      aria-expanded={item.open}
      aria-controls={item.contentId}
      data-state={item.open ? 'open' : 'closed'}
      onClick={(e) => {
        onClick?.(e);
        group?.toggle(item.value);
      }}
      {...props}
    >
      {children}
    </button>
  );
});
Trigger.displayName = 'Accordion.Trigger';

export const Content = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => {
    const item = useItem('Accordion.Content');
    // Unmounted when closed, as Radix does by default — collapsed content must
    // not be reachable by tab or find-in-page.
    if (!item.open) return null;
    return (
      <div
        ref={ref}
        id={item.contentId}
        role="region"
        aria-labelledby={item.triggerId}
        data-state="open"
        {...props}
      >
        {children}
      </div>
    );
  },
);
Content.displayName = 'Accordion.Content';
