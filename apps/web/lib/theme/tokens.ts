/**
 * Oneohm Design System — the single source of truth for design tokens.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THIS FILE IS THE ONLY PLACE A DESIGN VALUE IS AUTHORED.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Everything downstream is derived from it:
 *   • `tokens.generated.css`  — emitted by the sync test, imported by
 *     `app/globals.css`. Provides the `@theme` namespaces and `:root` vars.
 *   • `lib/theme/mui-theme.ts` — imports these literals directly. MUI's
 *     palette CANNOT take `var()` strings (createTheme runs lighten/darken/
 *     getContrastRatio on palette entries and throws `Unsupported var(...)
 *     color`), so MUI is fed resolved hex from here.
 *   • `lib/charts/palette.ts`  — re-exports the chart ramp for recharts,
 *     which needs string colours at render time for `fill`/`stroke`.
 *   • `tailwind.config.ts`     — bridges its existing utility names to these
 *     vars (`primary: { DEFAULT: 'var(--ds-primary)' }`), so the app's class
 *     vocabulary is unchanged while the values come from one place.
 *
 * Do NOT hand-edit `tokens.generated.css`. Run `npm run tokens:gen`.
 * `__tests__/tokens-sync.test.ts` fails the build if they diverge.
 *
 * Values transcribed from `~/Downloads/Oneohm Design System/tokens/*.css`.
 * Note: that package's `readme.md` is STALE — it describes a violet accent
 * and a near-black primary. `tokens/*.css` (green primary) is authoritative;
 * `Palette Explorations.html` confirms the "Warm Sand" palette was adopted
 * after the readme was written.
 */

/**
 * Tokens emitted into `@theme`, i.e. ones Tailwind turns into utilities.
 * Key = the Tailwind v4 theme namespace; emitting `--<namespace>-<name>`.
 *
 * ONLY namespaces with no counterpart in `tailwind.config.ts` belong here.
 * `@theme` and `@config` share one namespace and `@theme` wins, so a name
 * present in both is silently overridden. Verified the hard way: putting the
 * colour ramp here hijacked `accent` (#fafafa → #76c044, which would have
 * turned every dropdown focus state bright green), plus `success`
 * (#22c55e → #15803d), `warning` and `info` — 393 live usages — because the
 * DS names its readable-foreground variants `success`/`warning`/`info` while
 * this config uses those names for the vivid fills.
 *
 * Colours and font-family therefore live in `root` under a `--ds-` prefix,
 * where they cannot collide. Radius, shadow and easing have no config
 * counterpart, so they are safe here and give us `rounded-pill`, `shadow-e2`
 * and `ease-spring` as real utilities.
 */
const theme = {
  /**
   * `--radius-*` → `rounded-*`.
   * `rf-*` is Functional density (the web app default — data tables, forms,
   * admin). `r-*` is Expressive (auth, dashboard home, empty states, modals).
   * Config's own scale (sm/DEFAULT/md/lg/xl/2xl/3xl) is untouched.
   */
  radius: {
    // Functional
    'rf-xs': '4px',
    'rf-sm': '6px',
    'rf-md': '8px',
    'rf-lg': '12px',
    'rf-xl': '16px',
    // Expressive
    'r-xs': '8px',
    'r-sm': '12px',
    'r-md': '16px',
    'r-lg': '24px',
    'r-xl': '32px',
    'r-2xl': '40px',
    // Assignments
    'card-functional': '12px',
    'card-expressive': '24px',
    'input-functional': '10px',
    'input-expressive': '14px',
    'sheet-top': '32px',
    /** Buttons and chips are ALWAYS this. Non-negotiable in the DS. */
    pill: '999px',
  },

  /**
   * `--shadow-*` → `shadow-*`.
   * This ladder REPLACES borders entirely — the DS's governing rule is that
   * hierarchy comes from luminance and softness, never from lines.
   * canvas → e2 (card) → e3 (hover/dropdown) → e4 (popover/nav) → e5 (modal).
   */
  shadow: {
    e0: 'none',
    e1: '0 1px 2px rgba(16,24,40,0.04)',
    e2: '0 2px 8px rgba(16,24,40,0.05)',
    e3: '0 8px 24px rgba(16,24,40,0.06)',
    e4: '0 16px 48px rgba(16,24,40,0.08)',
    e5: '0 24px 72px rgba(16,24,40,0.10)',
  },

  /** `--ease-*` → `ease-*`. Extends Tailwind's built-in in/out/in-out. */
  ease: {
    standard: 'cubic-bezier(0.4,0,0.2,1)',
    enter: 'cubic-bezier(0,0,0.2,1)',
    exit: 'cubic-bezier(0.4,0,1,1)',
    /** Sheets, FAB, radial menus. */
    spring: 'cubic-bezier(0.34,1.56,0.64,1)',
  },
} as const;

/**
 * Plain `:root` custom properties — consumed by `tailwind.config.ts` (which
 * remains the utility surface), by MUI, and by inline styles.
 *
 * The `--ds-` prefix on colours is deliberate: it guarantees a DS token can
 * never silently override a config colour of the same name. See the note on
 * `theme` above.
 *
 * Also here, and NOT in `@theme`, because Tailwind v4 has no matching theme
 * namespace and because the app's spacing / font-size scales are frozen by
 * the Functional-density decision (`text-sm` stays 13px so 67 data pages
 * don't reflow): `dur`, `sp`, `text`.
 *
 * `gradient` is here because a gradient is not a colour — in `--color-*` it
 * would generate `background-color: linear-gradient(…)`, which is invalid.
 *
 * Namespaces mirror the DS package's own variable names (`--sp-*`, `--dur-*`)
 * so a token can be grepped straight from the DS spec. The one deliberate
 * divergence is `--text-*`: the DS splits each step across `--fs-`/`--lh-`/
 * `--tr-`, which is harder to read than keeping a step's size/line/track
 * together.
 *
 * Note: JS orders integer-like object keys numerically and ahead of string
 * keys, so `--sp-0-5` is emitted after `--sp-24` rather than after `--sp-0`.
 * Deterministic and harmless — CSS custom property order is irrelevant.
 */
const root = {
  ds: {
    // ── Neutrals — warm stone ──────────────────────────────────────────
    canvas: '#FAFAF9',
    'canvas-sunken': '#F5F5F4',
    surface: '#FFFFFF',
    'surface-alt': '#FAF9F7',

    /** 17.49:1 on white. */
    'text-primary': '#1C1917',
    /** 7.63:1 on white — the correct token for small secondary copy. */
    'text-secondary': '#57534E',
    /**
     * ⚠ 2.52:1 on white — FAILS WCAG AA for text.
     * Decorative, disabled, and large-text use ONLY. Small text that is
     * currently `foreground-tertiary` (#71717a, 4.83:1) must map to
     * `text-secondary`, NOT here, or the migration silently regresses
     * accessibility. See the guardrail lint rule.
     */
    'text-tertiary': '#A8A29E',
    /** 1.49:1 — disabled affordances only, never load-bearing text. */
    'text-disabled': '#D6D3D1',

    hairline: '#E7E5E4',
    divider: '#E7E5E4',

    /**
     * ── Neutral ramp — app-level extension, NOT from the DS package ───────
     *
     * The DS defines only seven neutral steps, and by semantic role
     * (`canvas`, `hairline`, `text-secondary`, …) rather than as a scale.
     * The app also needs an 11-step ramp because `gray-50…950` is used
     * directly in ~200 places, inherited from the shadcn config.
     *
     * Those seven DS values are exactly Tailwind's **stone** ramp, so this
     * completes it with stone's remaining four steps. That is what makes the
     * zinc→stone migration a true 1:1 swap: at every step the lightness
     * matches the zinc value it replaces to within 0.27 contrast points, so
     * no text/background pair changes its WCAG standing.
     *
     * Values that duplicate a DS token are noted; keep them in sync.
     */
    'neutral-50': '#FAFAF9', //  = canvas
    'neutral-100': '#F5F5F4', // = canvas-sunken
    'neutral-200': '#E7E5E4', // = hairline / divider
    'neutral-300': '#D6D3D1', // = text-disabled
    'neutral-400': '#A8A29E', // = text-tertiary
    'neutral-500': '#78716C',
    'neutral-600': '#57534E', // = text-secondary
    'neutral-700': '#44403C',
    'neutral-800': '#292524',
    'neutral-900': '#1C1917', // = text-primary
    'neutral-950': '#0C0A09',

    // ── Brand — green primary, blue secondary (unchanged from today) ───
    primary: '#76C044',
    /**
     * ⚠ Differs from today's Tailwind `primary.dark` (#5ea031) — a
     * pre-existing three-way drift: config says #5ea031, `mui-theme.ts` and
     * the DS both say #4D7C0F. Bridging this token shifts 19 usages, so it
     * is deliberately NOT bridged in the plumbing phase.
     */
    'primary-dark': '#4D7C0F',
    'primary-light': '#8FD35F',
    'primary-contrast': '#FFFFFF',
    secondary: '#0D74B8',
    'secondary-dark': '#0A5C92',
    'secondary-light': '#2B8FD4',

    // ── Interactive accent — focus, selected, active tab, control fill ─
    accent: '#76C044',
    'accent-hover': '#4D7C0F',
    'accent-subtle': '#EEF6E2',
    /** 4.99:1 — the accent as text/icon on light. WCAG-safe. */
    'accent-ink': '#4D7C0F',

    // ── Actions ───────────────────────────────────────────────────────
    /**
     * ⚠ White on this is 2.24:1 — fails AA. Pre-existing (today's theme
     * pairs the same two), but Phase 5 rebuilds every button and is the
     * cheap moment to fix it. Pending decision: fill with `primary-dark`
     * (4.99:1) instead.
     */
    'action-primary': '#76C044',
    'action-primary-hover': '#6AAE3B',
    'action-primary-pressed': '#4D7C0F',

    // ── Semantic ──────────────────────────────────────────────────────
    // Bare names are the READABLE FOREGROUND; `-main` is the vivid fill.
    // Today's config uses the bare names for the fills — hence `--ds-`.
    success: '#15803D',
    'success-main': '#22C55E',
    'success-bg': '#EAFBEF',
    warning: '#A16207',
    'warning-main': '#EAB308',
    'warning-bg': '#FEF7E6',
    danger: '#DC2626',
    'danger-hover': '#B91C1C',
    'danger-bg': '#FDECEC',
    info: '#0369A1',
    'info-main': '#0EA5E9',
    'info-bg': '#E8F4FB',
    neutral: '#57534E',
    'neutral-bg': '#F5F5F4',

    // ── Chart ramp — ordered, colourblind-safe ────────────────────────
    'chart-1': '#76C044',
    'chart-2': '#0D74B8',
    'chart-3': '#EAB308',
    'chart-4': '#0EA5E9',
    'chart-5': '#4D7C0F',
    'chart-6': '#2B8FD4',
    'chart-7': '#A16207',
    'chart-8': '#A8A29E',
    'chart-gridline': '#F5F5F4',

    // ── Links ─────────────────────────────────────────────────────────
    link: '#0D74B8',
    'link-hover': '#0A5C92',
  },

  /**
   * Not in `@theme`: config already owns `fontFamily.sans`, and swapping
   * Inter → Geist is its own isolated phase because it moves every metric
   * in the app at once.
   */
  font: {
    sans: '"Geist", "Inter", -apple-system, system-ui, sans-serif',
    mono: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  },

  /** Overlays blur and fade toward WHITE — never a dark scrim. */
  gradient: {
    brand: 'linear-gradient(135deg,#76C044 0%,#0D74B8 100%)',
    glow: 'radial-gradient(circle,rgba(118,192,68,0.22) 0%,rgba(13,116,184,0.12) 45%,rgba(255,255,255,0) 72%)',
  },

  dur: {
    micro: '120ms',
    standard: '200ms',
    emphasised: '320ms',
    ambient: '500ms',
  },

  /** 4px base. */
  sp: {
    '0': '0',
    '0-5': '2px',
    '1': '4px',
    '2': '8px',
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '8': '32px',
    '10': '40px',
    '12': '48px',
    '16': '64px',
    '20': '80px',
    '24': '96px',
  },

  /**
   * DS desktop type scale. Headings are tightly tracked — that tracking is
   * essential to the look, not a nicety.
   * Weights: 400 and 700 in normal use; 500 for buttons, tabs and table
   * headers ONLY.
   */
  text: {
    'display-size': '40px',
    'display-line': '44px',
    'display-track': '-0.03em',
    'h1-size': '32px',
    'h1-line': '36px',
    'h1-track': '-0.025em',
    'h2-size': '24px',
    'h2-line': '28px',
    'h2-track': '-0.02em',
    'h3-size': '20px',
    'h3-line': '22px',
    'h3-track': '-0.015em',
    'h4-size': '17px',
    'h4-line': '18px',
    'h4-track': '-0.01em',
    'body-lg-size': '17px',
    'body-lg-line': '1.55',
    'body-size': '15px',
    'body-line': '1.55',
    'body-sm-size': '13px',
    'body-sm-line': '1.5',
    'caption-size': '12px',
    'caption-line': '1.4',
    /** The signature overline device — 11px/700/0.12em, uppercase. */
    'overline-size': '11px',
    'overline-track': '0.12em',
    'button-size': '15px',
    'button-track': '-0.01em',
    'table-size': '13px',
    'table-line': '1.45',
  },

  /**
   * ── CRM data grid (`Customers v2`) ────────────────────────────────────
   *
   * The CRM list is the app's densest surface: a customer row, its site
   * portfolio summary, and — when expanded — a nested sites sub-grid, all in
   * one viewport. That density needs steps BETWEEN the DS type scale's
   * `caption` (12px) and `overline` (11px), plus fixed column tracks and
   * control heights that the DS scale has no opinion about.
   *
   * They live here rather than inline in the component for the same reason
   * every other value does: the grid is pixel-matched to the design spec, and
   * a spec change must be a one-line edit in this file, not a hunt through
   * JSX. `crm-table/` reads these exclusively — it contains no raw px.
   *
   * `-size` values are lengths; `-columns` are full `grid-template-columns`
   * strings (commas inside `minmax()` are legal in a custom property value).
   */
  crm: {
    // ── Customer grid: column tracks ───────────────────────────────────
    /**
     * One `grid-template-columns` track per column, authored individually
     * rather than as one composite string so hiding a column can rebuild the
     * template from exactly the tracks that survive. The column defs in
     * `customer-list-page.tsx` reference these by name; nothing concatenates
     * them by hand.
     *
     * Below `grid-min-width` the grid scrolls horizontally rather than crushing
     * the portfolio bar and the mono numerics.
     */
    'col-select': '38px',
    'col-caret': '30px',
    'col-customer': 'minmax(196px,1.6fr)',
    'col-contact': '148px',
    'col-location': 'minmax(102px,0.9fr)',
    'col-source': '116px',
    'col-portfolio': '178px',
    'col-status': '106px',
    'col-onboarded': '102px',
    'col-owner': 'minmax(122px,1fr)',
    /** "Created by" — hidden by default, same width as owner. */
    'col-creator': 'minmax(122px,1fr)',
    'col-actions': '40px',
    // Payment approval queue (design min-width 1180px)
    'col-approval-request': '152px',
    'col-approval-date': '96px',
    'col-approval-type': '88px',
    'col-approval-project': 'minmax(148px,1.2fr)',
    'col-approval-customer': 'minmax(148px,1.3fr)',
    'col-approval-amount': '112px',
    'col-approval-reference': 'minmax(108px,1fr)',
    'col-approval-submitter': 'minmax(120px,1fr)',
    'col-approval-waiting': '80px',
    'col-approval-status': '104px',
    // DISCOM admin grid (design min-width 1360px)
    'col-discom-hierarchy': 'minmax(250px,1.7fr)',
    'col-discom-circle': 'minmax(160px,1.1fr)',
    'col-discom-officers': 'minmax(150px,1fr)',
    'col-discom-contact': 'minmax(170px,1.1fr)',
    'col-discom-sites': '118px',
    'col-discom-status': '96px',
    'col-discom-updated': '104px',
    'col-discom-actions': '44px',
    'grid-min-width-discom': '1360px',
    'toolbar-search-width-discom': '250px',
    // Service tickets grid (design min-width 1240px).
    // Ticket numbers are `TKT-ONEOHM_EPC-2026-0001` — 24 characters, wider than
    // any other code in the app, so this track is sized to hold one unclipped.
    'col-ticket-number': '224px',
    'col-ticket-title': 'minmax(220px,1.8fr)',
    'col-ticket-customer': 'minmax(160px,1.2fr)',
    // Same width as the ticket number: both hold a 24-char code
    // (PRJ-ONEOHM_EPC-2026-0220), and at 180px it collided with Priority.
    'col-ticket-project': '224px',
    'col-ticket-priority': '104px',
    'col-ticket-status': '116px',
    'col-ticket-assignee': 'minmax(130px,1fr)',
    'col-ticket-created': '104px',
    // Sum of the ticket columns' minimum tracks (224+220+160+224+104+116+130+104
    // = 1282) plus headroom, so the grid scrolls rather than squeezing the
    // flexible columns below their minmax floors.
    'grid-min-width-ticket': '1320px',

    // ── Project grid: column tracks ────────────────────────────────────
    /**
     * These mirror the widths the project list carried as an `AdvancedTable`,
     * so migrating the grid did not silently re-proportion columns whose cells
     * were already tuned to them — the project cell wraps three chips under the
     * code at 210px, and the contract cell holds a change-order line at 190px.
     */
    'col-project-name': '210px',
    /** Was `flex: 2` — the only column that should absorb spare width. */
    'col-project-customer': 'minmax(220px,2fr)',
    'col-project-size': '165px',
    'col-project-contract': '190px',
    'col-project-progress': '180px',
    'col-project-phase': '130px',
    'col-project-type': '140px',
    'col-project-start': '130px',
    'col-project-due': '130px',
    'col-project-team': '140px',
    'col-project-actions': '48px',
    // Hidden by default, but they still need a track to reappear into.
    'col-project-status': '130px',
    'col-project-priority': '110px',
    'col-project-creator': '140px',
    'col-project-pending-task': '150px',
    'col-project-tickets': '150px',
    'col-project-address': 'minmax(240px,1.4fr)',
    // Sum of the default-visible tracks (210+220+165+190+180+130+140+130+130
    // +140+48 = 1683) plus the 16px gutters between them, so the grid scrolls
    // rather than squeezing Customer below its floor.
    'grid-min-width-project': '1840px',

    'grid-min-width': '1280px',
    'row-gutter': '16px',
    'head-height': '40px',
    /** Comfortable density — the default. */
    'row-height': '64px',
    'row-height-compact': '50px',
    /** The gradient rail that marks an expanded row. */
    'spine-width': '3px',
    'spine-radius': '0 3px 3px 0',
    'caret-size': '24px',
    'avatar-size': '34px',
    'owner-avatar-size': '22px',
    'row-action-size': '30px',
    'group-chip-height': '18px',
    'group-chip-max-width': '150px',
    'whatsapp-size': '22px',
    'portfolio-bar-height': '4px',
    'status-pill-height': '23px',
    'status-dot-size': '5px',

    // ── Toolbar ────────────────────────────────────────────────────────
    'toolbar-pad-y': '12px',
    'toolbar-gap': '12px',
    'toolbar-search-width': '232px',
    'toolbar-input-height': '38px',
    'toolbar-control-size': '34px',
    'toolbar-chip-height': '26px',
    'toolbar-chip-gap': '7px',

    // ── Footer / pagination ────────────────────────────────────────────
    'footer-pad-y': '11px',
    'footer-button-size': '30px',
    'footer-page-min-width': '84px',

    // ── Floating bulk-selection bar ────────────────────────────────────
    /** Clears the pagination footer. */
    'selection-bar-offset': '62px',
    'selection-bar-pad': '7px 8px 7px 18px',

    // ── Nested sites panel ─────────────────────────────────────────────
    /** Aligns the panel's left edge with the customer-name column. */
    'sites-indent': '68px',
    /** Column tracks for the nested sites sub-grid. */
    'sites-col-site': 'minmax(252px,1.7fr)',
    'sites-col-type': '112px',
    'sites-col-stage': '128px',
    'sites-col-quote': '112px',
    'sites-col-cost': '118px',
    'sites-col-discom': 'minmax(132px,1fr)',
    'sites-col-status': '100px',
    'sites-col-added': '88px',
    'sites-col-actions': '34px',
    'sites-gutter': '12px',
    'sites-head-height': '34px',
    'sites-row-height': '46px',
    'sites-row-pad-y': '9px',
    'sites-panel-pad': '11px 12px 12px',
    'sites-icon-size': '26px',
    'sites-primary-chip-height': '15px',
    'sites-summary-pill-height': '24px',
    'sites-quote-pill-height': '22px',
    'sites-status-pill-height': '21px',
    'sites-stage-bar-height': '3px',
    'sites-action-size': '26px',
    /** The ambient brand glow behind the panel header. */
    'sites-glow-size': '300px',

    // ── Page shell ─────────────────────────────────────────────────────
    'page-pad-x': '24px',
    'page-pad-top': '22px',
    'kpi-min-width': '196px',
    'kpi-height': '102px',
    'table-min-height': '460px',

    // ── Micro type steps ───────────────────────────────────────────────
    /** Page H1 — between the DS `h2` (24px) and `h1` (32px) steps. */
    'text-page-title': '27px',
    'text-page-title-track': '-0.03em',
    /** Row primary (customer name, section headings). */
    'text-row-title': '13.5px',
    /** Row body — phone, city, portfolio counts, quoted cost. */
    'text-row': '12.5px',
    /** Row secondary — pills, discom, dates. */
    'text-row-sm': '11.5px',
    /** Row tertiary — site addresses, stage labels. */
    'text-row-xs': '11px',
    /** Mono sub-labels — pincode, load, quoted total. */
    'text-row-2xs': '10.5px',
    /** Sub-grid overline. */
    'text-overline-sm': '10px',
    /** The `Primary` site badge. */
    'text-overline-xs': '9px',
    'text-overline-sm-track': '0.1em',
    'text-overline-xs-track': '0.06em',
  },
} as const;

export const TOKENS = { theme, root } as const;

/** Convenience aliases so consumers don't reach through `TOKENS`. */
export const color = root.ds;
export const radius = theme.radius;
export const shadow = theme.shadow;
export const ease = theme.ease;
export const font = root.font;
export const duration = root.dur;
export const gradient = root.gradient;
/**
 * CRM grid metrics. Consumers read these as `crm['row-height']` for MUI `sx`
 * values, or as `var(--crm-row-height)` inside a template string — both
 * resolve to the same authored value.
 */
export const crm = root.crm;

export type ColorToken = keyof typeof root.ds;
export type RadiusToken = keyof typeof theme.radius;
export type ShadowToken = keyof typeof theme.shadow;
export type CrmToken = keyof typeof root.crm;
