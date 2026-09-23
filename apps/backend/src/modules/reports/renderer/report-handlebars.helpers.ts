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

  /** Empty / whitespace-only values render as an underline for physical fill-in. */
  Handlebars.registerHelper('dash', (value: unknown) =>
    isBlank(value)
      ? new Handlebars.SafeString('<span class="blank-line"></span>')
      : toDisplayString(value),
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

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const isoParts = (value: unknown): [string, string, string] | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof value === 'string' ? value.trim() : '');
    return match ? [match[1]!, match[2]!, match[3]!] : null;
  };
  Handlebars.registerHelper('formatDate', (value: unknown) => {
    const parts = isoParts(value);
    return parts ? `${parts[2]}-${parts[1]}-${parts[0]}` : '—';
  });
  Handlebars.registerHelper('dateDay', (value: unknown) => {
    const parts = isoParts(value);
    return parts ? String(Number(parts[2])) : '—';
  });
  Handlebars.registerHelper('dateMonthName', (value: unknown) => {
    const parts = isoParts(value);
    return parts ? MONTH_NAMES[Number(parts[1]) - 1] : '—';
  });
  Handlebars.registerHelper('dateYear', (value: unknown) => {
    const parts = isoParts(value);
    return parts ? parts[0] : '—';
  });
  Handlebars.registerHelper('formatAadhaar', (value: unknown) => {
    const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
    return digits.length === 12 ? `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}` : '—';
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

/** Shared blocks any report template can use: {{> docTitle …}} and {{> signature …}}. */
export function registerReportPartials(): void {
  Handlebars.registerPartial(
    'docTitle',
    autoDashFieldPlaceholders(
      `<header class="doc-head"><h1 class="doc-title">{{title}}</h1><p class="doc-subtitle">{{subtitle}}</p></header>`,
    ),
  );
  Handlebars.registerPartial(
    'signature',
    autoDashFieldPlaceholders(
      `<div class="sig-block"><div class="sig-space"></div><div class="sig-rule"></div><div class="sig-name">{{name}}</div><div class="sig-role">{{role}}</div></div>`,
    ),
  );
}
