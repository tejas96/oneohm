import type { JSX, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** The page's name, one line under it, and its actions at the right. */
export function ListTitle({
  title,
  sub,
  actions,
}: {
  title: string;
  /** One sentence: the list's facts, or what the list is for. */
  sub?: ReactNode;
  actions?: ReactNode;
}): JSX.Element {
  return (
    <header className="mb-[26px] flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="m-0 text-[26px] font-semibold leading-[1.45] tracking-[-0.02em]">{title}</h1>
        <p className="mt-1 min-h-[1.45em] text-[14px] text-foreground-secondary">{sub}</p>
      </div>
      {actions ? (
        <div className="flex flex-none flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </header>
  );
}

/** The one green button a list page has ("+ Add customer"). */
export function PrimaryAction({
  children,
  onClick,
  allowed = true,
}: {
  children: ReactNode;
  onClick: () => void;
  /** False when the user lacks the permission: the button dims but still explains itself on click. */
  allowed?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={!allowed}
      className={cn(
        'flex-none rounded-pill bg-primary px-[18px] py-2.5 text-[14px] font-medium text-white shadow-calm-cta',
        'transition-transform duration-200 ease-calm hover:-translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        !allowed && 'opacity-50',
      )}
    >
      {children}
    </button>
  );
}
