import { Readable } from 'node:stream';

import { PayloadTooLargeException, StreamableFile } from '@nestjs/common';

/**
 * CSV streaming helper.
 *
 * Hard cap of 50,000 rows per request: above that the endpoint returns
 * 413 Payload Too Large with a hint to narrow the filter. The cap protects
 * the DB from runaway exports and the client from impractically large
 * downloads (50k rows of CSV is already 5-15 MB).
 *
 * The Readable yields the header line first, then paginates the source in
 * fixed-size chunks of 500 rows. Each row is RFC 4180 escaped: cells
 * containing commas, quotes, newlines, or carriage returns are wrapped in
 * double-quotes with embedded quotes doubled.
 */

export const CSV_ROW_HARD_CAP = 50_000;
export const CSV_CHUNK_SIZE = 500;

export interface CsvColumn<TRow> {
  /** Header label as it appears in the first CSV line. */
  header: string;
  /** Pull the cell value out of the row. Return undefined/null for empty cells. */
  pick: (row: TRow) => unknown;
}

export interface CsvStreamSource<TRow> {
  /** Total row count BEFORE the cap is enforced — used to short-circuit with 413. */
  total: number;
  /**
   * Fetch one page of rows from the DB. Page is 1-indexed. limit is
   * CSV_CHUNK_SIZE. Implementations should reuse their existing findAll()
   * with the SAME filters used to compute `total`.
   */
  fetchPage: (page: number, limit: number) => Promise<TRow[]>;
}

/**
 * RFC 4180 cell escaping.
 * https://www.rfc-editor.org/rfc/rfc4180
 */
export function escapeCsvCell(value: unknown): string {
  if (value == null) return '';
  const str = stringifyCsvValue(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function stringifyCsvValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString();

  switch (typeof value) {
    case 'undefined':
      return '';
    case 'string':
      return value;
    case 'number':
    case 'boolean':
    case 'bigint':
      return String(value);
    case 'symbol':
      return value.description ? `Symbol(${value.description})` : 'Symbol()';
    case 'function':
      return value.name ? `[Function: ${value.name}]` : '[Function]';
    case 'object':
      return JSON.stringify(value);
    default:
      return '';
  }
}

function buildHeaderLine<TRow>(columns: CsvColumn<TRow>[]): string {
  return `${columns.map((c) => escapeCsvCell(c.header)).join(',')}\r\n`;
}

function buildDataLine<TRow>(row: TRow, columns: CsvColumn<TRow>[]): string {
  return `${columns.map((c) => escapeCsvCell(c.pick(row))).join(',')}\r\n`;
}

/**
 * Build a StreamableFile from a paginated source and a column whitelist.
 * Throws PayloadTooLargeException synchronously if total > CSV_ROW_HARD_CAP
 * so the client gets a clean 413 BEFORE any data flows.
 */
export function buildCsvStream<TRow>(
  source: CsvStreamSource<TRow>,
  columns: CsvColumn<TRow>[],
  filename: string,
): StreamableFile {
  if (source.total > CSV_ROW_HARD_CAP) {
    throw new PayloadTooLargeException(
      `Export of ${source.total} rows exceeds the ${CSV_ROW_HARD_CAP}-row cap. Apply more filters and try again.`,
    );
  }

  const stream = new Readable({ read() {} });
  stream.push(buildHeaderLine(columns));

  void (async () => {
    try {
      let page = 1;
      let pushed = 0;
      while (pushed < source.total) {
        const rows = await source.fetchPage(page, CSV_CHUNK_SIZE);
        if (rows.length === 0) break;
        for (const row of rows) {
          stream.push(buildDataLine(row, columns));
          pushed += 1;
          if (pushed >= CSV_ROW_HARD_CAP) break;
        }
        page += 1;
      }
      stream.push(null);
    } catch (err) {
      stream.destroy(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return new StreamableFile(stream, {
    type: 'text/csv; charset=utf-8',
    disposition: `attachment; filename="${filename}"`,
  });
}
