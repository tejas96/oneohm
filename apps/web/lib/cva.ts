import { cn } from './utils';

/**
 * Local, dependency-free replacement for `class-variance-authority`.
 *
 * The migration constraint is "Tailwind and MUI only". CVA is a third-party
 * styling library, but it was load-bearing in 14 components whose variant maps
 * encode real design decisions. Hand-rewriting all of them risked subtle
 * behaviour changes for no benefit, so the API is reimplemented here instead
 * and the import swapped — the variant logic itself is untouched.
 *
 * Supports the surface actually used in this codebase:
 *   - string or string[] base classes
 *   - `variants` / `defaultVariants`
 *   - `compoundVariants`
 *   - the `VariantProps` type helper
 *   - boolean variant groups (`{ true: '…', false: '…' }`), which callers
 *     pass as real booleans and CVA stringifies
 *
 * Not implemented: CVA's `cx`, which nothing imports — `cn` covers it and
 * additionally merges conflicting Tailwind classes, which `cx` does not.
 *
 * Resolution order matches CVA: base → variants → compound → caller
 * `className`, so a caller's class still wins.
 */

/**
 * A class expression. Arrays are supported because several variant maps group
 * a variant's classes across multiple lines for readability (see
 * `tabsTriggerVariants`) — CVA allows this, and omitting it here silently
 * broke type inference for those files.
 */
type ClassValue = string | null | undefined | false | ClassValue[];

type VariantShape = Record<string, Record<string, ClassValue>>;

/**
 * The accepted values for one variant group. String keys pass through; a group
 * keyed `true`/`false` additionally accepts real booleans, matching how these
 * are written at call sites (`<Button pill />`).
 */
type VariantValue<G> = Extract<keyof G, string> | ('true' extends keyof G ? boolean : never);

/** The props object a `cva` function accepts. */
type VariantSelection<V extends VariantShape> = {
  [K in keyof V]?: VariantValue<V[K]> | null;
};

/**
 * `V` is inferred from `variants` alone. `defaultVariants` and
 * `compoundVariants` are wrapped in `NoInfer` because referencing `V` in
 * three positions makes inference circular — TypeScript gives up and widens
 * `V` to its constraint, at which point `keyof V` is `string` and
 * `VariantProps` degrades into an index signature that collides with the
 * component's own DOM props.
 */
interface Config<V extends VariantShape> {
  variants?: V;
  defaultVariants?: NoInfer<VariantSelection<V>>;
  // CVA accepts either key on a compound rule; this codebase uses `className`.
  compoundVariants?: Array<
    NoInfer<VariantSelection<V>> & { class?: ClassValue; className?: ClassValue }
  >;
}

/** A function produced by `cva`. */
export type VariantFn<V extends VariantShape> = (
  props?: VariantSelection<V> & { class?: ClassValue; className?: ClassValue },
) => string;

/**
 * Extracts the variant props of a `cva` function, for composing into a
 * component's own props interface. Mirrors CVA's own `VariantProps`.
 *
 * Reads the parameter type rather than `infer`-ing the shape back out of
 * `VariantFn`: `V` appears only in parameter position, so inference there
 * widens every group to `Record<string, ClassValue>` and the resulting index
 * signature collides with the component's real DOM props.
 */
export type VariantProps<T extends (...args: never[]) => string> = Omit<
  NonNullable<Parameters<T>[0]>,
  'class' | 'className'
>;

/**
 * `V` defaults to an empty shape for the config-less form (`cva('…')`, used by
 * `labelVariants`). Without the default it falls back to the constraint, and
 * `VariantProps` again degrades into a `string` index signature.
 */
export function cva<V extends VariantShape = Record<never, never>>(
  base: ClassValue | ClassValue[],
  config?: Config<V>,
): VariantFn<V> {
  const { variants, defaultVariants, compoundVariants } = config ?? {};
  const baseClasses = Array.isArray(base) ? base : [base];

  return (props) => {
    if (!variants) return cn(...baseClasses, props?.class, props?.className);

    // Merged so an omitted prop falls back to its default. Values are
    // stringified because variant maps are always keyed by string, while
    // callers may pass booleans.
    const selection: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries({ ...defaultVariants, ...props })) {
      if (key === 'class' || key === 'className') continue;
      selection[key] = value == null ? undefined : String(value);
    }

    const variantClasses = Object.keys(variants).map((name) => {
      const value = selection[name];
      return value === undefined ? undefined : variants[name]?.[value];
    });

    const compoundClasses = (compoundVariants ?? [])
      .filter((rule) =>
        Object.entries(rule).every(([key, expected]) =>
          key === 'class' || key === 'className' ? true : selection[key] === String(expected),
        ),
      )
      .map((rule) => rule.class ?? rule.className);

    return cn(
      ...baseClasses,
      ...variantClasses,
      ...compoundClasses,
      props?.class,
      props?.className,
    );
  };
}
