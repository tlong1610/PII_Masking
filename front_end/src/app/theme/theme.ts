import { createTheme, alpha } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a73e8',
      light: '#d3e3fd',
      dark: '#0b57d0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00796b',
      light: '#c2e7e2',
      dark: '#00574b',
      contrastText: '#ffffff',
    },
    error: {
      main: '#b3261e',
      light: '#f9dedc',
      dark: '#8c1d18',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#b06000',
      light: '#fde293',
      dark: '#8a4b00',
      contrastText: '#202124',
    },
    success: {
      main: '#188038',
      light: '#ceead6',
      dark: '#137333',
      contrastText: '#ffffff',
    },
    info: {
      main: '#1967d2',
      light: '#d3e3fd',
      dark: '#174ea6',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#202124',
      secondary: '#5f6368',
    },
    divider: '#dfe3ea',
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  typography: {
    fontFamily: '"Roboto", sans-serif',
    h1: { fontSize: '2.5rem', lineHeight: 1.12, fontWeight: 700 },
    h2: { fontSize: '2rem', lineHeight: 1.18, fontWeight: 700 },
    h3: { fontSize: '1.5rem', lineHeight: 1.24, fontWeight: 700 },
    h4: { fontSize: '1.25rem', lineHeight: 1.32, fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: theme.spacing(6),
          borderRadius: theme.spacing(3),
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.08)}`,
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.spacing(2),
          fontWeight: 700,
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: ({ theme }) => ({
          borderColor: theme.palette.divider,
          boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.primary.light, 0.42),
          color: theme.palette.text.primary,
          fontWeight: 800,
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${alpha(theme.palette.common.black, 0.05)}`,
        }),
        standardInfo: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.info.light, 0.54),
          color: theme.palette.text.primary,
        }),
        standardWarning: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.warning.light, 0.6),
          color: theme.palette.text.primary,
        }),
        standardSuccess: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.success.light, 0.68),
          color: theme.palette.text.primary,
        }),
        standardError: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.error.light, 0.68),
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        ':root': {
          colorScheme: 'light',
        },
        body: {
          minWidth: 320,
          background: `radial-gradient(circle at 18% 0%, ${alpha(
            theme.palette.primary.light,
            0.72,
          )} 0, transparent 28%), linear-gradient(180deg, #ffffff 0%, ${
            theme.palette.background.default
          } 44%, #eef3f8 100%)`,
        },
        '*, *::before, *::after': {
          boxSizing: 'border-box',
        },
        ':focus-visible': {
          outline: `3px solid ${alpha(theme.palette.primary.main, 0.42)}`,
          outlineOffset: 2,
        },
      }),
    },
  },
});
