import { createTheme } from '@mui/material/styles';

export const MUI_INPUT_HEIGHT = 34;
export const MUI_FONT_SIZE = '0.8125rem';
export const MUI_LABEL_FONT_SIZE = '0.875rem';
export const MUI_BORDER_RADIUS = 6;
export const MUI_BORDER_COLOR = '#d4d4d8';
export const MUI_INPUT_PADDING = '6px 10px';
export const MUI_LABEL_GAP = '4px';
export const MUI_LABEL_MB = '6px';

const INPUT_HEIGHT = MUI_INPUT_HEIGHT;
const FONT_SIZE = MUI_FONT_SIZE;

export const muiTheme = createTheme({
  palette: {
    primary: { main: '#76c044', dark: '#5ea031', light: '#8fd35f' },
    secondary: { main: '#0d74b8', dark: '#0a5c92', light: '#2b8fd4' },
    success: { main: '#22c55e' },
    warning: { main: '#eab308' },
    error: { main: '#dc2626' },
    info: { main: '#0ea5e9' },
    text: { primary: '#18181b', secondary: '#52525b' },
    divider: '#e4e4e7',
    background: { default: '#ffffff', paper: '#ffffff' },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: 13,
  },
  spacing: 8,
  components: {
    /* ---- TextField ---- */
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined', fullWidth: true },
    },

    /* ---- OutlinedInput (applies to TextField outlined + Select outlined) ---- */
    MuiOutlinedInput: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          fontSize: FONT_SIZE,
          height: INPUT_HEIGHT,
          borderRadius: 6,
        },
        input: {
          padding: '6px 10px',
          height: 'auto',
          '&:focus-visible': { outline: 'none' },
        },
        notchedOutline: {
          borderColor: '#d4d4d8',
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

    /* ---- InputLabel (floating label — we use external labels, but keep sized) ---- */
    MuiInputLabel: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { fontSize: FONT_SIZE },
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
          borderRadius: 6,
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
            borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
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
        root: { textTransform: 'none', fontWeight: 500, borderRadius: 6 },
        sizeSmall: { height: 30, fontSize: FONT_SIZE, padding: '4px 12px' },
      },
    },

    /* ---- IconButton ---- */
    MuiIconButton: {
      defaultProps: { size: 'small' },
    },

    /* ---- Chip (used in Autocomplete tags) ---- */
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { height: 22, fontSize: '0.75rem', borderRadius: 4 },
      },
    },

    /* ---- Tooltip ---- */
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: '0.75rem', borderRadius: 4 },
      },
    },

    /* ---- Paper (dropdown menus) ---- */
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },

    /* ---- Menu (Select dropdown) ---- */
    MuiMenu: {
      styleOverrides: {
        list: { padding: 4 },
        paper: {
          borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
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

    /* ---- Dialog ---- */
    MuiDialog: {
      defaultProps: { scroll: 'paper' },
      styleOverrides: {
        paper: { borderRadius: 8 },
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
