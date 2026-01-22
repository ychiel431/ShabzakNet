import { createTheme } from '@mui/material/styles';

export const shabzakTheme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#1b5e20', // ירוק זית מבצעי (מהקוד המקורי)
      dark: '#144316',
      light: '#4caf50',
    },
    secondary: {
      main: '#1565c0', // כחול (לשימוש בניהול כלים/כוח אדם)
    },
    background: {
      default: '#f4f6f8', // רקע אפור בהיר (מהקוד המקורי)
    },
  },
  typography: {
    fontFamily: 'Assistant, Arial, sans-serif',
    h1: { fontWeight: 900 },
    h3: { fontWeight: 'bold' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 20, // ה-BorderRadius הגבוה שאהבת
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
});