import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import VeiculosListPage from '../pages/VeiculosListPage';

describe('VeiculosListPage', () => {
  test('renderiza lista de veículos com dados da API', async () => {
    const mockVeiculos = [
      { id: 1, tipo: 'Carro', placa: 'ABC1D23', marca: 'Fiat', modelo: 'Uno', cor: 'Preto', nome_proprietario: 'Maria', telefone_proprietario: '11988887777', pessoa_id: 2 }
    ];

    window.api.getAllBlocos = jest.fn().mockResolvedValue([{ id: 1, nome: 'A' }]);
    window.api.getAllVeiculosDetails = jest.fn().mockResolvedValue(mockVeiculos);

    render(
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter>
          <VeiculosListPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    const placa = await screen.findByText(/ABC1D23/);
    expect(placa).toBeInTheDocument();

    await waitFor(() => expect(window.api.getAllVeiculosDetails).toHaveBeenCalled());
  });
});
