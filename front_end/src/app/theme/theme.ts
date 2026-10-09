import { createTheme, alpha } from '@mui/material/styles';

/**
 * Databricks Web UI Design System (Aug 2025 Unity Catalog & Data Governance)
 * Crisp, clean, enterprise data platform aesthetics.
 */
export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1B51A4', // Databricks Brand Navy / Blue
      light: '#EBF3FB', // Databricks active item background
      dark: '#123A75',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0E7490', // Databricks teal / cyan
      light: '#E0F2FE',
      dark: '#155E75',
      contrastText: '#ffffff',
    },
    error: {
      main: '#DC2626', // Databricks coral / red for sensitive L3 PII
      light: '#FEF2F2',
      dark: '#991B1B',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#D97706', // Amber for L2 PII / Needs review
      light: '#FFFBEB',
      dark: '#92400E',
      contrastText: '#1E293B',
    },
    success: {
      main: '#16A34A', // Green for zero leak verified / ready
      light: '#ECFDF5',
      dark: '#15803D',
      contrastText: '#ffffff',
    },
    info: {
      main: '#2563EB', // Blue for info & AI tags
      light: '#EFF6FF',
      dark: '#1D4ED8',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F8F9FA', // Databricks clean off-white canvas
      paper: '#FFFFFF', // Pure white cards & tables
    },
    text: {
      primary: '#111827', // Razor-sharp deep dark text
      secondary: '#4B5563', // Muted slate secondary text
    },
    divider: '#E5E7EB', // 1px clean border
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 960,
      lg: 1280,
      xl: 1600,
    },
  },
  shape: {
    borderRadius: 6, // Crisp 6px radius throughout Databricks UI
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
    h3: { fontSize: '1.35rem', lineHeight: 1.3, fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontSize: '1.15rem', lineHeight: 1.35, fontWeight: 600 },
    h5: { fontSize: '1rem', lineHeight: 1.4, fontWeight: 600 },
    h6: { fontSize: '0.875rem', lineHeight: 1.4, fontWeight: 600 },
    subtitle1: { fontSize: '0.875rem', lineHeight: 1.5, fontWeight: 500 },
    subtitle2: { fontSize: '0.8125rem', lineHeight: 1.5, fontWeight: 600 },
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', lineHeight: 1.4, color: '#6B7280' },
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
        containedPrimary: {
          backgroundColor: '#1B51A4',
          '&:hover': {
            backgroundColor: '#154185',
          },
        },
        outlined: {
          borderColor: '#D1D5DB',
          color: '#374151',
          '&:hover': {
            borderColor: '#9CA3AF',
            backgroundColor: '#F3F4F6',
          },
        },
        sizeSmall: {
          minHeight: 28,
          padding: '3px 10px',
          fontSize: '0.75rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          border: '1px solid #E5E7EB',
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
          borderColor: '#E5E7EB',
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
          borderColor: '#F1F5F9',
          fontSize: '0.8125rem',
        },
        head: {
          backgroundColor: '#F9FAFB',
          color: '#4B5563',
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          borderBottom: '1px solid #E5E7EB',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#F9FAFB',
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
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 42,
          borderBottom: '1px solid #E5E7EB',
        },
        indicator: {
          backgroundColor: '#1B51A4',
          height: 2.5,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.84rem',
          minHeight: 42,
          padding: '8px 16px',
          color: '#4B5563',
          '&.Mui-selected': {
            color: '#1B51A4',
            fontWeight: 600,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontSize: '0.84rem',
          '& fieldset': {
            borderColor: '#D1D5DB',
          },
          '&:hover fieldset': {
            borderColor: '#9CA3AF',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#1B51A4',
            borderWidth: 1.5,
          },
        },
        input: {
          padding: '7px 12px',
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
          color: '#111827',
        },
        '*, *::before, *::after': {
          boxSizing: 'border-box',
        },
      },
    },
  },
});
