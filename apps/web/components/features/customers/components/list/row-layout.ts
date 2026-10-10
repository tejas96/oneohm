/**
 * The row's grid, shared by the real row and its loading skeleton so the two
 * are the same shape at every width.
 */

/**
 * Wide: who · journey · follow-up · value · ⋮ on one line. Narrow (the list
 * itself under 960px, so an open side panel counts): name and ⋮, then the
 * journey, then follow-up and value side by side.
 */
export const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto_34px] items-center gap-x-3 gap-y-3.5 @[960px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1.75fr)_minmax(0,1.15fr)_112px_34px] @[960px]:gap-[22px]';

const WIDE = '@[960px]:col-auto @[960px]:row-auto';
export const ROW_CELL = {
  who: `col-span-2 col-start-1 row-start-1 ${WIDE}`,
  journey: `col-span-3 row-start-2 ${WIDE}`,
  next: `col-start-1 row-start-3 ${WIDE}`,
  value: `col-span-2 col-start-2 row-start-3 ${WIDE}`,
  actions: `col-start-3 row-start-1 ${WIDE}`,
} as const;
