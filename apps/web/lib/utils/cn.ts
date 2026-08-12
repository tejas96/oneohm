import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes: `clsx` resolves the conditionals, `tailwind-merge`
 * drops the losers when two classes target the same property, so a caller's
 * `className` reliably beats a component's default.
 *
 * Lived in `lib/utils.ts` — a file that sat *beside* the `lib/utils/`
 * directory and shadowed it, so `@/lib/utils` resolved to the file and the
 * directory's own `index.ts` was unreachable. Two barrels, one of them dead
 * and silently ignoring anything added to it. This is now just another module
 * in the directory.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
