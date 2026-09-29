import { useState } from 'react';

/**
 * Paging for a list the API returns whole (the reseller list and one
 * reseller's commissions). CrmTable only draws the rows it is given, so
 * without this it drew every row while its footer said "1–10 of 14".
 * CrmTable's `page` is zero-indexed.
 */
export function useClientPage<T>(rows: T[], initialPageSize = 10) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  // A list that shrank (a filter, a period chip) must not strand the reader on
  // an empty page past its end.
  const lastPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
  const current = Math.min(page, lastPage);
  return {
    pageRows: rows.slice(current * pageSize, (current + 1) * pageSize),
    tableProps: {
      page: current,
      pageSize,
      totalRowCount: rows.length,
      onPageChange: setPage,
      onPageSizeChange: (next: number) => {
        setPageSize(next);
        setPage(0);
      },
    },
  };
}
