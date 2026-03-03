/**
 * Safely convert a value to a number, returning undefined for null/undefined.
 * PostgreSQL decimal/numeric columns are returned as strings by TypeORM.
 * Use this in @Transform decorators to ensure numeric API responses.
 */
export const toNum = (v: unknown): number | undefined => (v != null ? Number(v) : undefined);

/**
 * Like toNum but preserves null (for fields typed `number | null`
 * where null has semantic meaning, e.g. "not yet approved").
 */
export const toNumNullable = (v: unknown): number | null => (v != null ? Number(v) : null);
