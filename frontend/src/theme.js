import { createTheme, alpha } from '@mui/material/styles'

// Material palette this app is built on.
export const brand = {
  primary: '#009688',
  primaryDark: '#00796B',
  primaryLight: '#B2DFDB',
  accent: '#FFC107',
  textPrimary: '#212121',
  textSecondary: '#757575',
  divider: '#BDBDBD',
  onPrimary: '#FFFFFF',
}

export const MODE_STORAGE_KEY = 'oppskrifter:mode'

function palette(mode) {
  if (mode === 'dark') {
    return {
      mode,
      primary: {
        main: brand.primaryLight,
        light: '#E0F2F1',
        dark: brand.primary,
        contrastText: 'rgba(0, 0, 0, 0.87)',
      },
      secondary: { main: brand.accent, contrastText: 'rgba(0, 0, 0, 0.87)' },
      background: { default: '#12191A', paper: '#1B2426' },
      divider: alpha(brand.primaryLight, 0.18),
      text: { primary: '#E6EDED', secondary: alpha('#E6EDED', 0.66) },
    }
  }
  return {
    mode,
    primary: {
      main: brand.primary,
      light: brand.primaryLight,
      dark: brand.primaryDark,
      contrastText: brand.onPrimary,
    },
    secondary: { main: brand.accent, contrastText: 'rgba(0, 0, 0, 0.87)' },
    background: { default: '#F4F7F7', paper: brand.onPrimary },
    divider: alpha(brand.divider, 0.7),
    text: { primary: brand.textPrimary, secondary: brand.textSecondary },
  }
}

export function buildTheme(mode) {
  const base = createTheme({ palette: palette(mode) })

  return createTheme(base, {
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: ['Roboto', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'].join(','),
      h4: { fontWeight: 500, letterSpacing: '-0.5px' },
      h5: { fontWeight: 500, letterSpacing: '-0.25px' },
      h6: { fontWeight: 500 },
      subtitle2: { fontWeight: 500, letterSpacing: '0.6px', textTransform: 'uppercase' },
      button: { textTransform: 'none', fontWeight: 500 },
    },
    components: {
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'primary' },
        styleOverrides: {
          root:
            mode === 'dark'
              ? {
                  // A teal-tinted dark surface reads better than a pale gradient.
                  backgroundImage: 'none',
                  backgroundColor: '#16211F',
                  color: base.palette.primary.main,
                  borderBottom: `1px solid ${base.palette.divider}`,
                }
              : {
                  backgroundImage: `linear-gradient(90deg, ${brand.primaryDark}, ${brand.primary})`,
                  color: brand.onPrimary,
                  borderBottom: '1px solid transparent',
                },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: { root: { borderColor: base.palette.divider } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 999, paddingInline: 20 } },
      },
      MuiChip: { styleOverrides: { root: { borderRadius: 8 } } },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            marginBottom: 4,
            '&.Mui-selected': {
              backgroundColor: alpha(base.palette.primary.main, mode === 'dark' ? 0.22 : 0.16),
              '&:hover': {
                backgroundColor: alpha(base.palette.primary.main, mode === 'dark' ? 0.3 : 0.24),
              },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 20 },
          paperFullScreen: { borderRadius: 0 },
        },
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12 } } },
    },
  })
}
