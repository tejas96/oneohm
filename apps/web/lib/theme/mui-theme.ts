import { createTheme } from '@mui/material/styles';

import { color, duration, ease, radius, shadow } from './tokens';

/**
 * MUI is fed resolved hex from `tokens.ts`, never `var()` strings: MUI runs
 * lighten/darken/getContrastRatio over palette entries and throws
 * `Unsupported var(--x) color` at createPalette.js. (`cssVariables:
 * { nativeColor: true }` would allow it, at the cost of `oklch(from …)`
 * browser support and permanent console warnings — revisit only if dark mode
 * becomes real.)
 *
 * Colour now comes entirely from tokens — no hex literals below. Neutrals
 * are warm stone, mapped step-for-step from the zinc values they replaced
 * (max contrast delta 0.27), so no text/background pair changed its WCAG
 * standing in the swap.
 *
 * Still outstanding: the shadow values here predate the DS elevation ladder
 * (`e1`…`e5`) and the 1px card border contradicts the DS "no structural
 * borders" rule. Both are handled in the elevation pass.
 */

export const MUI_INPUT_HEIGHT = 34;
export const MUI_FONT_SIZE = '0.8125rem'; // 13px — base body / inputs / buttons
export const MUI_LABEL_FONT_SIZE = '0.8125rem'; // 13px — body copy in tables & cards (same as base)
export const MUI_CAPTION_FONT_SIZE = '0.75rem'; // 12px — secondary / timestamps
export const MUI_FINE_PRINT_FONT_SIZE = '0.6875rem'; // 11px — meta labels / fine print
export const MUI_DRAWER_TITLE_FONT_SIZE = '1.25rem';
export const MUI_BORDER_RADIUS = 6;
export const MUI_BORDER_COLOR = color['neutral-300'];
export const MUI_INPUT_PADDING = '6px 10px';
export const MUI_LABEL_GAP = '4px';
export const MUI_LABEL_MB = '6px';

/**
 * Reads the next/font CSS variable rather than naming the family directly.
 * The previous hardcoded `'Inter, system-ui, …'` meant every MUI component
 * resolved the face by name and bypassed the next/font-optimised, preloaded
 * file that the rest of the app was using.
 */
const FONT_FAMILY = 'var(--font-geist-sans)';

const INPUT_HEIGHT = MUI_INPUT_HEIGHT;
const FONT_SIZE = MUI_FONT_SIZE;
const FINE_PRINT_FONT_SIZE = MUI_FINE_PRINT_FONT_SIZE;

export const muiTheme = createTheme({
  palette: {
    primary: {
      main: color.primary,
      dark: color['primary-dark'],
      light: color['primary-light'],
      contrastText: color['primary-contrast'],
    },
    secondary: {
      main: color.secondary,
      dark: color['secondary-dark'],
      light: color['secondary-light'],
      contrastText: color['primary-contrast'],
    },
    // DS convention: bare name = readable foreground, `-main` = vivid fill.
    success: { main: color['success-main'], dark: color.success, contrastText: '#ffffff' },
    warning: { main: color['warning-main'], dark: color.warning, contrastText: 'rgba(0,0,0,0.87)' },
    error: { main: color.danger, dark: color['danger-hover'], contrastText: '#ffffff' },
    info: { main: color['info-main'], dark: color.info, contrastText: '#ffffff' },
    text: { primary: color['text-primary'], secondary: color['text-secondary'] },
    divider: color.hairline,
    background: { default: color.surface, paper: color.surface },
  },
  typography: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    // Explicit scale so every raw MUI <Typography> and any component that
    // inherits from the type scale (Table, Pagination, List, etc.) uses the
    // compact SaaS sizes by default — no per-component patches needed.
    body1: { fontSize: '0.8125rem' }, // 13px — primary content / table cells
    body2: { fontSize: '0.75rem' }, // 12px — secondary content
    caption: { fontSize: '0.6875rem' }, // 11px — captions / meta labels
    subtitle1: { fontSize: '0.8125rem', fontWeight: 500 },
    subtitle2: { fontSize: '0.75rem', fontWeight: 500 },
  },
  spacing: 8,
  components: {
    /* ---- TextField ---- */
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined', fullWidth: true },
    },

    /**
     * ---- OutlinedInput (TextField outlined + Select outlined) ----
     *
     * Borderless, matching `components/ui/input.tsx`. MUI's notched outline is
     * switched off entirely — the field reads as a tinted surface on `e1`,
     * with a 2px accent ring (held off by a white gap) on focus and an inset
     * 1.5px ring for error.
     *
     * This has to mirror the shadcn `Input` exactly: MUI fields appear in ~56
     * files and shadcn ones in ~21, and forms routinely mix them. Leaving MUI
     * outlined would have produced two different field styles side by side.
     */
    MuiOutlinedInput: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          fontSize: FONT_SIZE,
          height: INPUT_HEIGHT,
          borderRadius: radius['input-functional'],
          backgroundColor: color['surface-alt'],
          boxShadow: shadow.e1,
          transition: `box-shadow ${duration.standard} ${ease.standard}`,
          '&:hover': { boxShadow: shadow.e2 },
          '&.Mui-focused': {
            boxShadow: `${shadow.e2}, 0 0 0 2px ${color.surface}, 0 0 0 4px ${color.accent}`,
          },
          '&.Mui-error': {
            boxShadow: `inset 0 0 0 1.5px ${color.danger}, ${shadow.e1}`,
          },
          /**
           * Focused-and-invalid shows the outer ring ONLY. Keeping the inset
           * ring as well renders as two concentric red borders with a white
           * gap between them, which reads as a rendering fault. The DS treats
           * these states as alternatives (`disabled → focus → error →
           * default`), not additive — the ring simply takes the danger colour
           * so the error is still signalled.
           */
          '&.Mui-error.Mui-focused': {
            boxShadow: `${shadow.e2}, 0 0 0 2px ${color.surface}, 0 0 0 4px ${color.danger}`,
          },
          '&.Mui-disabled': {
            backgroundColor: color['canvas-sunken'],
            boxShadow: 'none',
          },
        },
        input: {
          padding: '6px 10px',
          height: 'auto',
          '&:focus-visible': { outline: 'none' },
          '&[type=number]': {
            MozAppearance: 'textfield',
          },
          '&[type=number]::-webkit-outer-spin-button, &[type=number]::-webkit-inner-spin-button': {
            WebkitAppearance: 'none',
            margin: 0,
          },
          /**
           * Chrome paints its own yellow background on autofilled inputs and
           * ignores `background-color`; the only way to mask it is a thick
           * inset box-shadow.
           *
           * That shadow must be `surface-alt` — the field's own fill — not
           * `surface`. Using white made every autofilled field render a white
           * block that did not match its neighbours, and because the shadow is
           * 30px and `!important` it also painted over the inner edge of the
           * error ring.
           *
           * `border-radius: inherit` keeps the mask inside the field's 10px
           * corners instead of squaring them off.
           */
          '&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active':
            {
              WebkitBoxShadow: `0 0 0 30px ${color['surface-alt']} inset !important`,
              WebkitTextFillColor: `${color['text-primary']} !important`,
              caretColor: color['text-primary'],
              borderRadius: 'inherit',
              transition: 'background-color 5000s ease-in-out 0s',
            },
        },
        /**
         * The outline is the thing the DS removes; elevation replaces it.
         * The `legend` goes with it: it exists solely to cut a gap in the
         * border for the floating label. With no border there is no gap to
         * cut, so leaving it only reserved dead horizontal space.
         */
        notchedOutline: {
          border: 'none',
          '& legend': { display: 'none' },
        },
        multiline: {
          height: 'auto',
        },
      },
    },

    /* ---- InputBase ---- */
    MuiInputBase: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        input: {
          fontSize: FONT_SIZE,
          '&:focus-visible': { outline: 'none' },
        },
      },
    },

    /**
     * ---- InputLabel ----
     *
     * MUI's outlined variant parks the shrunk label *on* the field's top
     * border, sitting in a notch cut out of it. This app's fields are
     * borderless (see MuiOutlinedInput), so there is no notch — the label
     * simply overlapped the field's tinted fill and read as a collision.
     *
     * The shrunk label therefore sits fully above the field, matching the DS
     * pattern of an external label over a borderless input. The resting
     * (placeholder) position is untouched.
     */
    MuiInputLabel: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          fontSize: FONT_SIZE,
          color: color['text-secondary'],
          '&.Mui-focused': { color: color['text-secondary'] },
          '&.MuiInputLabel-shrink': {
            /**
             * Notched-inline look on a borderless field.
             *
             * MUI normally achieves this by cutting a gap in the field's
             * border. There is no border here, so the label instead carries a
             * chip of the surface behind it and sits on the field's top edge —
             * visually cutting the same notch.
             *
             * The chip colour must match whatever is *behind* the field.
             * `--field-label-bg` is an inheritable custom property defaulting
             * to white; any container on a tinted or sunken background sets it
             * once and every nested field label picks it up. Without that hook
             * this treatment breaks silently wherever a form is not on a card.
             */
            transform: 'translate(8px, -8px) scale(1)',
            fontSize: FINE_PRINT_FONT_SIZE,
            fontWeight: 500,
            padding: '0 5px',
            backgroundColor: `var(--field-label-bg, ${color.surface})`,
            borderRadius: 4,
          },
        },
      },
    },

    /* ---- Select ---- */
    MuiSelect: {
      defaultProps: { size: 'small', variant: 'outlined' },
      styleOverrides: {
        select: {
          fontSize: FONT_SIZE,
          padding: '6px 10px',
          minHeight: 'unset',
          '&:focus-visible': { outline: 'none' },
        },
        icon: { fontSize: 18, right: 6 },
      },
    },

    /* ---- FormControl ---- */
    MuiFormControl: {
      defaultProps: { size: 'small', fullWidth: true },
      styleOverrides: {
        root: {
          // Only fields that actually render a floating label need the room,
          // so this must not apply to the many label-less fields.
          // The label straddles the field's top edge, so only a few px of
          // headroom are needed to keep it from clipping.
          '&:has(> .MuiInputLabel-root)': { marginTop: 6 },
        },
      },
    },

    /* ---- FormHelperText ---- */
    MuiFormHelperText: {
      styleOverrides: {
        root: { fontSize: '0.7rem', marginTop: 3, marginLeft: 2 },
      },
    },

    /* ---- Autocomplete ---- */
    MuiAutocomplete: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        input: {
          fontSize: FONT_SIZE,
          padding: '4px 8px !important',
          '&:focus-visible': { outline: 'none' },
        },
        inputRoot: {
          height: INPUT_HEIGHT,
          padding: '2px 8px',
          // Match the DS functional input radius — an Autocomplete is a
          // field and must not be the one odd shape in a form.
          borderRadius: radius['input-functional'],
        },
        listbox: {
          fontSize: FONT_SIZE,
          padding: 4,
          '& .MuiAutocomplete-option': {
            padding: '4px 8px',
            minHeight: 30,
            borderRadius: 4,
          },
        },
        popper: {
          '& .MuiPaper-root': {
            fontSize: FONT_SIZE,
            borderRadius: radius['rf-md'],
            boxShadow: shadow.e3,
          },
        },
      },
    },

    /* ---- MenuItem ---- */
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: FONT_SIZE,
          minHeight: 32,
          padding: '4px 10px',
          borderRadius: 4,
        },
      },
    },

    /* ---- Button ---- */
    MuiButton: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          // DS: all buttons are fully pill. Non-negotiable brand signal.
          borderRadius: radius.pill,
          letterSpacing: '-0.01em',
          // DS press affordance. Also the reason the pressed state does NOT
          // darken the fill — see the contained-variant note below.
          transition: `background ${duration.standard} ${ease.standard}, box-shadow ${duration.standard} ${ease.standard}, transform ${duration.micro} ${ease.standard}`,
          '&:active': { transform: 'scale(0.97)' },
        },
        sizeSmall: { height: 30, fontSize: FONT_SIZE, padding: '4px 14px' },
        /**
         * The DS has no outlined button. Its secondary action is a **white
         * surface carrying `e1`** — hierarchy from luminance, not lines. MUI
         * draws a 1px `rgba(0,0,0,0.12)` border on this variant by default,
         * which `variant="outlined"` (~30 files) was still showing.
         */
        outlined: {
          border: 'none',
          backgroundColor: color.surface,
          color: color['text-secondary'],
          boxShadow: shadow.e1,
          '&:hover': {
            border: 'none',
            backgroundColor: color.surface,
            boxShadow: shadow.e2,
          },
          '&.Mui-disabled': { border: 'none', boxShadow: 'none' },
        },
        // Colour-specific outlined variants keep their hue as the label.
        outlinedPrimary: { color: color['accent-ink'] },
        outlinedError: { color: color.danger },
        outlinedSecondary: { color: color['secondary-dark'] },
        // Ghost/text buttons: fill on hover, never an outline.
        text: {
          '&:hover': { backgroundColor: color['neutral-bg'] },
        },
        /**
         * Dark label on brand green, rather than the white the DS ships.
         *
         * White on #76C044 is 2.24:1 and on the hover tone #6AAE3B it is
         * 2.72:1 — both fail WCAG AA, and this app is used outdoors on
         * rooftops where low contrast bites hardest. Dark ink gives 7.82:1
         * at rest and 6.44:1 on hover while keeping the DS's exact green.
         *
         * Darkening the fill to #4D7C0F was the alternative, but that breaks
         * the DS action ramp: hover (#6AAE3B) would then be *lighter* than
         * rest. Changing the label is the smaller, safer deviation.
         */
        containedPrimary: {
          // White label on brand green — matches `components/ui/button.tsx`.
          // See the contrast note there before changing either one.
          color: color['primary-contrast'],
          boxShadow: 'none',
          '&:hover': { backgroundColor: color['action-primary-hover'], boxShadow: shadow.e2 },
          // No colour change on press — `scale(0.97)` above is the DS
          // affordance, and #4D7C0F under dark ink would drop to 3.50:1.
          '&:active': { backgroundColor: color['action-primary'] },
        },
      },
    },

    /* ---- IconButton ---- */
    MuiIconButton: {
      defaultProps: { size: 'small' },
    },

    /**
     * ---- Table ----
     *
     * The DS data table has **no rules of any kind**: rows separate by
     * alternating luminance (`surface` / `surface-alt`), never a grey line.
     * MUI draws a `borderBottom` on every cell by default, so it is switched
     * off here rather than per-table.
     *
     * Cells are 10×12px (DS functional density). Numerals are `tabular-nums`
     * everywhere so columns of figures align — this app renders ₹ amounts,
     * kWp capacities and quantities in nearly every table.
     */
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem', // 12px for better data density
          lineHeight: 1.4,
          padding: '10px 12px',
          verticalAlign: 'middle',
          border: 'none',
          fontVariantNumeric: 'tabular-nums',
        },
        head: {
          /**
           * The DS overline: 11px / 700 / 0.12em, uppercase. A signature
           * device — noticeably wider-tracked than the 0.04em it replaces.
           */
          fontSize: FINE_PRINT_FONT_SIZE,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          lineHeight: 1.4,
          // Header sits on the plain surface; the sticky header stays legible
          // because the body rows beneath it alternate *below* white.
          backgroundColor: color.surface,
          /**
           * `text-secondary` (7.63:1), NOT the DS `text-tertiary` (2.52:1).
           * Column headers are 11px — well under the large-text threshold —
           * so the tertiary tone would fail WCAG AA on real, load-bearing UI
           * text. Same trap the `foreground.tertiary` mapping avoids.
           */
          color: color['text-secondary'],
          padding: '10px 12px',
          whiteSpace: 'nowrap',
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: `background ${duration.micro} ${ease.standard}`,
          // Zebra striping replaces row dividers. `:nth-of-type` rather than
          // `:nth-child` so it still alternates correctly when a table body
          // contains non-row elements.
          '&:nth-of-type(even)': {
            backgroundColor: color['surface-alt'],
          },
          '&:hover': {
            backgroundColor: `${color['canvas-sunken']} !important`,
          },
          '&.Mui-selected': {
            backgroundColor: `${color['accent-subtle']} !important`,
            '&:hover': {
              backgroundColor: `${color['accent-subtle']} !important`,
            },
          },
          // The header row is not part of the zebra rhythm.
          '&.MuiTableRow-head, thead &': {
            backgroundColor: 'transparent',
          },
        },
      },
    },

    MuiTablePagination: {
      styleOverrides: {
        selectLabel: { fontSize: FONT_SIZE },
        displayedRows: { fontSize: FONT_SIZE },
        menuItem: { fontSize: FONT_SIZE },
      },
    },

    /**
     * ---- Backdrop (Dialog, Drawer, Modal) ----
     *
     * MUI defaults to `rgba(0,0,0,0.5)` — a dark scrim, which the DS rules
     * out in as many words: "depth is blur + desaturation, never dimming —
     * overlays blur the layer behind and fade it toward white; never a dark
     * scrim." So: white at 0.35 with an 8px blur, matching the motion spec
     * and `components/ui/dialog.tsx`.
     *
     * Media lightboxes are deliberately exempt — see the note in
     * `document-preview-carousel.tsx`.
     */
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.35)',
          backdropFilter: 'blur(8px)',
          // MUI adds `.MuiBackdrop-invisible` for menus/popovers that must not
          // paint anything; keep it truly invisible.
          '&.MuiBackdrop-invisible': {
            backgroundColor: 'transparent',
            backdropFilter: 'none',
          },
        },
      },
    },

    /**
     * ---- Chip (Autocomplete tags + MUIStatusChip, ~38 files) ----
     *
     * The DS chip is a **flat tint**: a muted background paired with a
     * readable foreground of the same hue. Never an outline (hierarchy comes
     * from luminance, not lines) and never a vivid fill (semantic colours are
     * "muted, never neon").
     *
     * Both MUI variants are normalised to that treatment, because
     * `MUIStatusChip` defaults to `outlined` while status pills elsewhere
     * render `filled` — previously giving two different looks for the same
     * concept, plus solid #22C55E "Active" pills that shouted louder than
     * the data around them.
     *
     * Foregrounds are the DS's readable tones (`success` #15803D, not
     * `success-main` #22C55E), so every chip clears AA on its own tint.
     */
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          height: 22,
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: radius.pill,
          border: 'none',
        },
        // Neutral / no `color` prop.
        colorDefault: { backgroundColor: color['neutral-bg'], color: color.neutral },
        ...Object.fromEntries(
          (
            [
              ['Primary', color['accent-subtle'], color['accent-ink']],
              ['Secondary', color['info-bg'], color['secondary-dark']],
              ['Success', color['success-bg'], color.success],
              ['Warning', color['warning-bg'], color.warning],
              ['Error', color['danger-bg'], color.danger],
              ['Info', color['info-bg'], color.info],
            ] as const
          ).flatMap(([name, bg, fg]) => {
            const tint = { backgroundColor: bg, color: fg, border: 'none' };
            // Same tint for both variants — `outlined` loses its border and
            // gains the fill rather than staying transparent.
            return [
              [`filled${name}`, tint],
              [`outlined${name}`, tint],
            ];
          }),
        ),
      },
    },

    /* ---- Tooltip ---- */
    /**
     * ---- Tooltip ----
     *
     * The tooltip surface lives here rather than in class names on the content
     * element, because `lib/tooltip.tsx` adapts a compound Radix-shaped API
     * onto MUI and the DS classes computed by the wrapper never reach MUI's
     * slot. Styling centrally makes the look independent of that plumbing.
     *
     * Inverted surface: near-black on light canvas, which is the one place the
     * DS uses a dark fill — a tooltip is transient and must read instantly.
     */
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.75rem',
          borderRadius: radius['rf-md'],
          backgroundColor: color['text-primary'],
          color: color.surface,
          fontWeight: 500,
          padding: '6px 10px',
          boxShadow: shadow.e3,
          maxWidth: 280,
        },
        arrow: {
          color: color['text-primary'],
        },
      },
    },

    /* ---- Paper (dropdown menus) ---- */
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: radius['rf-md'],
        },
      },
    },

    /* ---- Menu (Select dropdown) ---- */
    MuiMenu: {
      styleOverrides: {
        list: { padding: 4 },
        paper: {
          borderRadius: radius['rf-md'],
          boxShadow: shadow.e3,
          marginTop: 2,
        },
      },
    },

    /* ---- Switch ---- */
    MuiSwitch: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { padding: 4, width: 38, height: 24 },
        switchBase: {
          padding: 4,
          '&.Mui-checked': { transform: 'translateX(14px)' },
        },
        thumb: { width: 16, height: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' },
        track: { borderRadius: 12, opacity: 0.38 },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: { marginLeft: 0, marginRight: 0 },
        label: { fontSize: FONT_SIZE },
      },
    },

    /* ---- Avatar ---- */
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontFamily: FONT_FAMILY,
          fontWeight: 600,
          // Neutral fallback when neither src nor deterministic color is set.
          // Individual MUIAvatar instances override bgcolor/color via sx.
          backgroundColor: color.hairline, // theme divider — subtle and on-brand
          color: color['text-secondary'], // theme text.secondary
        },
      },
    },

    /* ---- Link ---- */
    MuiLink: {
      styleOverrides: {
        root: {
          color: color.primary,
          '&:hover': {
            color: color['primary-dark'],
          },
        },
      },
    },

    /* ---- Card ---- */
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          // DS: no structural borders anywhere. A card separates from the
          // canvas by being brighter and carrying a soft, wide, low-opacity
          // shadow — never by a 1px grey rule.
          border: 'none',
          boxShadow: shadow.e2,
          borderRadius: radius['rf-lg'],
        },
      },
    },

    /* ---- Dialog ---- */
    MuiDialog: {
      defaultProps: { scroll: 'paper' },
      styleOverrides: {
        paper: { borderRadius: radius['rf-lg'], boxShadow: shadow.e5 },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontSize: '1.125rem', fontWeight: 600, padding: 0 },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: { padding: '24px', overflowY: 'auto' },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: { padding: '16px 24px' },
      },
    },
  },
});
