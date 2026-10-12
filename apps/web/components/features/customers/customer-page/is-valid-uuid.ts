const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A route id that is not a UUID is not a record: the page says "not found" without asking the API. */
export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
