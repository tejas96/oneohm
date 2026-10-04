import { readFileSync } from 'fs';

import { formatRupees } from '@tejas96/shared/reports';
import Handlebars from 'handlebars';

import { resolveReportAsset } from '../utils/report.utils';

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

  const isoParts = (value: unknown): [string, string, string] | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof value === 'string' ? value.trim() : '');
    return match ? [match[1]!, match[2]!, match[3]!] : null;
  };
  /** ISO dates print DD-MM-YYYY; legacy free-text dates print as typed. */
  Handlebars.registerHelper('formatDate', (value: unknown) => {
    if (isBlank(value)) return new Handlebars.SafeString('<span class="blank-line"></span>');
    const parts = isoParts(value);
    return parts ? `${parts[2]}-${parts[1]}-${parts[0]}` : toDisplayString(value);
  });
  /** "610" → "610 Wp"; a value that already ends in the unit prints as typed; blank → a line. */
  Handlebars.registerHelper('withUnit', (value: unknown, unit: unknown) => {
    if (isBlank(value)) return new Handlebars.SafeString('<span class="blank-line"></span>');
    const text = toDisplayString(value);
    const suffix = typeof unit === 'string' ? unit : '';
    return suffix && !text.toLowerCase().endsWith(suffix.toLowerCase())
      ? `${text} ${suffix}`
      : text;
  });
  /** 944817.93 → "₹9,44,818/-" (see formatRupees); blank → a line. */
  Handlebars.registerHelper('rupees', (value: unknown) =>
    isBlank(value)
      ? new Handlebars.SafeString('<span class="blank-line"></span>')
      : formatRupees(toDisplayString(value)),
  );
  /** 12 digits print as "1234 5678 9012"; empty prints a line to fill, like every other blank. */
  Handlebars.registerHelper('formatAadhaar', (value: unknown) => {
    if (isBlank(value)) return new Handlebars.SafeString('<span class="blank-line"></span>');
    const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
    return digits.length === 12
      ? `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`
      : toDisplayString(value);
  });
}

/** The director's signature and company seal, the same image the quote PDF prints. */
function vendorStampHtml(): string {
  const stamp = readFileSync(resolveReportAsset('renderer', 'assets', 'vendor-stamp.png')).toString(
    'base64',
  );
  return `<img class="rpt-stamp" src="data:image/png;base64,${stamp}" alt="Signature and seal" />`;
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

/**
 * Shared blocks any report template can use: {{> docTitle …}}, {{> signature …}},
 * {{> vendorSignature …}}, {{> vendorStamp}} and {{> dateBlank}}.
 *
 * Wrapper/element classes are prefixed `rpt-` so the shared CSS in
 * report-print-base.css can target them without colliding with the several
 * other report templates that already define their own `.doc-title`,
 * `.sig-block`, `.sig-name`, etc. (see report-print-base.css for the scoped
 * selectors).
 */
export function registerReportPartials(): void {
  Handlebars.registerPartial(
    'docTitle',
    autoDashFieldPlaceholders(
      `<header class="rpt-doc-head"><h1 class="rpt-doc-title">{{title}}</h1><p class="rpt-doc-subtitle">{{subtitle}}</p></header>`,
    ),
  );
  Handlebars.registerPartial(
    'signature',
    autoDashFieldPlaceholders(
      `<div class="rpt-sig"><div class="rpt-sig-space"></div><div class="rpt-sig-name">{{name}}</div><div class="rpt-sig-rule"></div><div class="rpt-sig-role">{{role}}</div></div>`,
    ),
  );
  // A date written by hand on the printed copy: a blank line with a light DD-MM-YYYY guide.
  Handlebars.registerPartial(
    'dateBlank',
    '<span class="blank-line rpt-date-guide">DD-MM-YYYY</span>',
  );
  // The vendor signs with the stamp: the stamp first, then the name, the line and the role.
  Handlebars.registerPartial('vendorStamp', vendorStampHtml());
  Handlebars.registerPartial(
    'vendorSignature',
    autoDashFieldPlaceholders(
      `<div class="rpt-sig rpt-sig--vendor">${vendorStampHtml()}<div class="rpt-sig-name">{{name}}</div><div class="rpt-sig-rule"></div><div class="rpt-sig-role">{{role}}</div></div>`,
    ),
  );
}
