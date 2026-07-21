'use client';

import * as React from 'react';

/**
 * Local replacement for `@radix-ui/react-radio-group`.
 *
 * Two files style their radio cards off Radix's `data-state="checked"`
 * attribute (`data-[state=checked]:border-primary` and similar), so this shim
 * reproduces that contract exactly — the consuming Tailwind classes are
 * unchanged.
 *
 * MUI's `RadioGroup`/`Radio` were not used here: they render their own dot
 * control, whereas these call sites are full selectable *cards* that supply
 * their own indicator. Wrapping MUI would mean hiding its control and fighting
 * its layout.
 *
 * Keyboard behaviour matches the radio pattern: arrow keys move between
 * enabled items and select as they go; the group exposes a single tab stop.
 */

interface RadioGroupContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

function useRadioGroup(component: string): RadioGroupContextValue {
  const ctx = React.useContext(RadioGroupContext);
  if (!ctx) throw new Error(`<${component}> must be rendered inside a <RadioGroup.Root>`);
  return ctx;
}

export interface RootProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
}

export const Root = React.forwardRef<HTMLDivElement, RootProps>(
  ({ value, defaultValue, onValueChange, disabled, name, children, ...props }, ref) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
    const isControlled = value !== undefined;
    const current = isControlled ? value : uncontrolled;
    const generatedName = React.useId();

    const handleChange = React.useCallback(
      (next: string) => {
        if (!isControlled) setUncontrolled(next);
        onValueChange?.(next);
      },
      [isControlled, onValueChange],
    );

    const ctx = React.useMemo(
      () => ({
        value: current,
        onValueChange: handleChange,
        disabled,
        name: name ?? generatedName,
      }),
      [current, handleChange, disabled, name, generatedName],
    );

    return (
      <RadioGroupContext.Provider value={ctx}>
        <div ref={ref} role="radiogroup" {...props}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  },
);
Root.displayName = 'RadioGroup.Root';

export interface ItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
}

export const Item = React.forwardRef<HTMLButtonElement, ItemProps>(
  ({ value, disabled, children, onClick, onKeyDown, ...props }, ref) => {
    const group = useRadioGroup('RadioGroup.Item');
    const checked = group.value === value;
    const isDisabled = disabled || group.disabled;

    /** Arrow keys move to the next/previous enabled item and select it. */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
      onKeyDown?.(e);
      if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) return;
      e.preventDefault();

      const container = e.currentTarget.closest('[role="radiogroup"]');
      if (!container) return;
      const items = [...container.querySelectorAll<HTMLButtonElement>('[role="radio"]')].filter(
        (el) => !el.disabled,
      );
      const index = items.indexOf(e.currentTarget);
      if (index === -1) return;

      const forward = e.key === 'ArrowDown' || e.key === 'ArrowRight';
      const next = items[(index + (forward ? 1 : -1) + items.length) % items.length];
      next?.focus();
      next?.click();
    };

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={isDisabled}
        // The styling contract these call sites depend on.
        data-state={checked ? 'checked' : 'unchecked'}
        data-disabled={isDisabled ? '' : undefined}
        // Only the selected item (or the first, when none is) is tabbable, so
        // the group behaves as one tab stop.
        tabIndex={checked ? 0 : -1}
        onClick={(e) => {
          onClick?.(e);
          if (!isDisabled) group.onValueChange?.(value);
        }}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Item.displayName = 'RadioGroup.Item';

/** Renders its children only while the enclosing Item is selected. */
export const Indicator = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ children, ...props }, ref) => {
    const [checked, setChecked] = React.useState(false);
    const localRef = React.useRef<HTMLSpanElement | null>(null);

    // Read state from the parent button rather than context: an Indicator does
    // not know its own item's value, and this keeps the API identical to Radix.
    React.useEffect(() => {
      const item = localRef.current?.closest('[role="radio"]');
      if (!item) return;
      const sync = (): void => setChecked(item.getAttribute('data-state') === 'checked');
      sync();
      const observer = new MutationObserver(sync);
      observer.observe(item, { attributes: true, attributeFilter: ['data-state'] });
      return () => observer.disconnect();
    }, []);

    return (
      <span
        ref={(node) => {
          localRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        data-state={checked ? 'checked' : 'unchecked'}
        {...props}
      >
        {checked ? children : null}
      </span>
    );
  },
);
Indicator.displayName = 'RadioGroup.Indicator';
