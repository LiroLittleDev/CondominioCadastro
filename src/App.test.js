import { render, screen } from '@testing-library/react';
import App from './App';

test('renders application header', () => {
  render(<App />);
  // the header contains the app title (one or more occurrences)
  const headers = screen.getAllByText(/Sistema de Gestão Condominial/i);
  expect(headers.length).toBeGreaterThan(0);
});
