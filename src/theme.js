import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4f8ef7',
    },
    secondary: {
      main: '#a78bfa',
    },
    error: {
      main: '#f87171',
    },
    success: {
      main: '#34d399',
    },
    background: {
      default: '#0d0f14',
      paper: '#161a23',
    },
    text: {
      primary: '#e8ecf4',
      secondary: '#6b7280',
    },
    divider: '#252b38',
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #252b38',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#0d0f14',
          borderBottom: '1px solid #252b38',
          boxShadow: 'none',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: '#252b38',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '999px',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
  },
})

export default theme
