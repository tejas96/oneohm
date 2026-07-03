import Handlebars from 'handlebars';

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number' || typeof value === 'boolean') return false;
  return true;
}

function toDisplayString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/** Register helpers shared by all report templates. */
export function registerReportHandlebarsHelpers(): void {
  Handlebars.registerHelper('eq', (a, b) => a === b);

  /** Empty / whitespace-only values render as an em dash. */
  Handlebars.registerHelper('dash', (value: unknown) =>
    isBlank(value) ? '—' : toDisplayString(value),
  );

  /** Renders block only when every argument is non-empty. */
  Handlebars.registerHelper('ifAll', function (this: unknown, ...args: unknown[]) {
    const options = args.pop() as Handlebars.HelperOptions;
    const values = args;
    if (values.every((v) => !isBlank(v))) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  /** Renders block when at least one argument is non-empty. */
  Handlebars.registerHelper('ifAny', function (this: unknown, ...args: unknown[]) {
    const options = args.pop() as Handlebars.HelperOptions;
    const values = args;
    if (values.some((v) => !isBlank(v))) {
      return options.fn(this);
    }
    return options.inverse(this);
  });
}

const RESERVED_MUSTACHE = new Set([
  'else',
  'if',
  'unless',
  'each',
  'with',
  'ifAll',
  'ifAny',
  'eq',
  'dash',
]);

/**
 * Wrap bare {{field_key}} placeholders with {{dash field_key}} at compile time so
 * empty values never leave holes in tables, headers, or signatures.
 */
export function autoDashFieldPlaceholders(source: string): string {
  return source.replace(/\{\{([^{}]+)\}\}/g, (match, inner: string) => {
    const token = inner.trim();
    if (
      token.startsWith('#') ||
      token.startsWith('/') ||
      token.startsWith('>') ||
      token.startsWith('!')
    ) {
      return match;
    }
    if (token.startsWith('dash ') || token.includes(' ')) {
      return match;
    }
    if (RESERVED_MUSTACHE.has(token)) {
      return match;
    }
    return `{{dash ${token}}}`;
  });
}
