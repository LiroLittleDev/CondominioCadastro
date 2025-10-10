import { createTheme } from '@mui/material/styles';

// Quatro temas de exemplo: Default, Blue, Green, Orange
export const themes = {
  default: () => createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#8655b7ff' },
      secondary: { main: '#8554feff' },
      background: { default: '#fafafa' }
    }
  }),
  blue: () => createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#1565c0' },
      secondary: { main: '#29b6f6' },
      background: { default: '#e3f2fd' }
    }
  }),
  green: () => createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#2e7d32' },
      secondary: { main: '#66bb6a' },
      background: { default: '#e8f5e9' }
    }
  }),
  orange: () => createTheme({
    palette: {
      mode: 'light',
      // Use 6-digit hex and set contrastText to white so labels on primary are legible
      primary: { main: '#fa760a', contrastText: '#fff' },
      secondary: { main: '#f5ac40ff' },
      background: { default: '#fff3e0' }
    }
  })
};

export const themeKeys = ['default', 'blue', 'green', 'orange'];
