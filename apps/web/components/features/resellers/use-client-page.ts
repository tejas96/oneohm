import { PAGE_SIZE_OPTIONS } from '@/components/shared/calm-list';
import { useListUrl } from '@/lib/hooks';

/**
 * Paging for a list the API returns whole (the reseller list and one
 * reseller's commissions). The list only draws the rows it is given, so
 * without this it drew every row while its footer said "1–10 of 14".
 * `page` is zero-indexed.
 *
 * The page and its size live in the URL under `prefix`, so Back from a
 * reseller or a project returns to the page it was left on.
 */
export function useClientPage<T>(rows: T[], prefix: string, initialPageSize = 10) {
  const url = useListUrl({
    prefix,
    defaultPageSize: initialPageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  });
  const { page, pageSize } = url.state;
  // A list that shrank (a filter, a period chip) must not strand the reader on
  // an empty page past its end.
  const lastPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
  const current = Math.min(page, lastPage);
  return {
    url,
    pageRows: rows.slice(current * pageSize, (current + 1) * pageSize),
    tableProps: {
      page: current,
      pageSize,
      totalRowCount: rows.length,
      onPageChange: url.setPage,
      onPageSizeChange: url.setPageSize,
    },
  };
}
