import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';

describe('HomePage', () => {
  test('mostra estatísticas retornadas pela API', async () => {
    // mocka a API de dashboard
    window.api.getDashboardStats = jest.fn().mockResolvedValue({ unidades: 5, pessoas: 10, veiculos: 2 });

    render(
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </ThemeProvider>
    );

    // espera até que o número de unidades apareça na tela
    const unidades = await screen.findByText('5');
    expect(unidades).toBeInTheDocument();

    // verifica que pelo menos um dos títulos das estatísticas está presente
    const titulos = await screen.findAllByText(/Unidades|Moradores|Ve[ií]culos/i);
    expect(titulos.length).toBeGreaterThan(0);
  });
});
