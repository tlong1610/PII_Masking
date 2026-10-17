import { alpha, createTheme } from '@mui/material/styles';

/**
 * Design tokens. Components read colours through the palette (`text.secondary`, `info.light`,
 * `accent.main`...), never through these constants or raw hex values.
 */
const grey = {
  50: '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
} as const;

const primary = { main: '#1B51A4', light: '#EBF3FB', dark: '#123A75', contrastText: '#FFFFFF' };

declare module '@mui/material/styles' {
  interface Palette {
    /** Violet accent for HMAC pseudonyms and AI detections. */
    accent: Palette['primary'];
  }
  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    accent: true;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    accent: true;
  }
}

/**
 * Databricks-style enterprise data platform look: crisp borders, 6px radius, dense tables.
 */
export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary,
    secondary: { main: '#0E7490', light: '#E0F2FE', dark: '#155E75', contrastText: '#FFFFFF' },
    error: { main: '#DC2626', light: '#FEF2F2', dark: '#991B1B', contrastText: '#FFFFFF' },
    warning: { main: '#D97706', light: '#FFFBEB', dark: '#92400E', contrastText: '#1E293B' },
    success: { main: '#16A34A', light: '#ECFDF5', dark: '#15803D', contrastText: '#FFFFFF' },
    info: { main: '#2563EB', light: '#EFF6FF', dark: '#1D4ED8', contrastText: '#FFFFFF' },
    accent: { main: '#7C3AED', light: '#F5F3FF', dark: '#6D28D9', contrastText: '#FFFFFF' },
    grey,
    background: { default: '#F8F9FA', paper: '#FFFFFF' },
    text: { primary: grey[900], secondary: grey[600], disabled: grey[400] },
    divider: grey[200],
    action: { hover: grey[50], selected: primary.light },
  },
  breakpoints: {
    values: { xs: 0, sm: 640, md: 960, lg: 1280, xl: 1600 },
  },
  shape: {
    borderRadius: 6,
  },
  spacing: 8,
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Inter"',
      'Helvetica',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontSize: '2rem', lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.6rem', lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.015em' },
    h3: { fontSize: '1.35rem', lineHeight: 1.3, fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontSize: '1.15rem', lineHeight: 1.35, fontWeight: 600 },
    h5: { fontSize: '1rem', lineHeight: 1.4, fontWeight: 600 },
    h6: { fontSize: '0.875rem', lineHeight: 1.4, fontWeight: 600 },
    subtitle1: { fontSize: '0.875rem', lineHeight: 1.5, fontWeight: 500 },
    subtitle2: { fontSize: '0.8125rem', lineHeight: 1.5, fontWeight: 600 },
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', lineHeight: 1.4, color: grey[500] },
    overline: { fontSize: '0.6875rem', lineHeight: 1.6, fontWeight: 700, letterSpacing: '0.06em' },
    button: { textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: 'none',
          minHeight: 34,
          padding: '6px 14px',
          fontWeight: 600,
          '&:hover': {
            boxShadow: 'none',
          },
        },
        // Neutral secondary button. Only the default (primary) colour is greyed, so
        // color="error" / "info" outlined buttons keep their palette colour.
        outlinedPrimary: {
          borderColor: grey[300],
          color: grey[700],
          '&:hover': {
            borderColor: grey[400],
            backgroundColor: grey[100],
          },
        },
        sizeSmall: {
          minHeight: 28,
          padding: '3px 10px',
          fontSize: '0.75rem',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          border: `1px solid ${grey[200]}`,
          boxShadow: 'none',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: grey[200],
          boxShadow: 'none',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          fontVariantNumeric: 'tabular-nums',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '8px 14px',
          borderColor: grey[100],
          fontSize: '0.8125rem',
        },
        head: {
          backgroundColor: grey[50],
          color: grey[600],
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          borderBottom: `1px solid ${grey[200]}`,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: grey[50],
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 24,
          fontSize: '0.75rem',
          fontWeight: 600,
        },
        sizeSmall: {
          height: 22,
          fontSize: '0.72rem',
        },
        labelSmall: {
          paddingLeft: 8,
          paddingRight: 8,
        },
        iconSmall: {
          fontSize: 14,
          marginLeft: 6,
          marginRight: -2,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 42,
          borderBottom: `1px solid ${grey[200]}`,
        },
        indicator: {
          backgroundColor: primary.main,
          height: 2.5,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.8125rem',
          minHeight: 42,
          padding: '8px 16px',
          color: grey[600],
          '&.Mui-selected': {
            color: primary.main,
            fontWeight: 600,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontSize: '0.8125rem',
          backgroundColor: '#FFFFFF',
          '& fieldset': {
            borderColor: grey[300],
          },
          '&:hover fieldset': {
            borderColor: grey[400],
          },
          '&.Mui-focused fieldset': {
            borderColor: primary.main,
            borderWidth: 1.5,
          },
        },
        input: {
          padding: '7px 12px',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        // Select shares the input padding above; centre its value so custom renderValue content
        // (icons, dots) sits on the same baseline as plain text fields.
        select: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 'auto',
          lineHeight: 1.5,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
        },
        sizeSmall: {
          transform: 'translate(12px, 8px) scale(1)',
          '&.MuiInputLabel-shrink': {
            transform: 'translate(14px, -8px) scale(0.85)',
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          marginTop: 4,
          border: `1px solid ${grey[200]}`,
          borderRadius: 6,
          boxShadow: `0 8px 24px ${alpha(grey[900], 0.12)}`,
        },
        list: {
          padding: 4,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          minHeight: 36,
          borderRadius: 4,
          gap: 8,
          '&.Mui-selected': {
            backgroundColor: primary.light,
          },
          '&.Mui-selected:hover': {
            backgroundColor: primary.light,
          },
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: 6,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          boxShadow: `0 16px 48px ${alpha(grey[900], 0.18)}`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          fontWeight: 700,
          padding: '20px 24px 8px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '8px 24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 20px',
          gap: 8,
          '& > :not(style) ~ :not(style)': {
            marginLeft: 0,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderLeft: `1px solid ${grey[200]}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.75rem',
          backgroundColor: grey[800],
          borderRadius: 4,
        },
        arrow: {
          color: grey[800],
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 3,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          border: '1px solid transparent',
          fontSize: '0.8125rem',
        },
        standardInfo: {
          backgroundColor: '#EFF6FF',
          borderColor: '#BFDBFE',
          color: '#1E3A8A',
        },
        standardWarning: {
          backgroundColor: '#FFFBEB',
          borderColor: '#FDE68A',
          color: '#78350F',
        },
        standardSuccess: {
          backgroundColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          color: '#064E3B',
        },
        standardError: {
          backgroundColor: '#FEF2F2',
          borderColor: '#FECACA',
          color: '#7F1D1D',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          colorScheme: 'light',
        },
        body: {
          minWidth: 320,
          backgroundColor: '#F8F9FA',
          color: grey[900],
        },
        '*, *::before, *::after': {
          boxSizing: 'border-box',
        },
      },
    },
  },
});
