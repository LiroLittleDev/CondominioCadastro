import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import PessoasListPage from '../pages/PessoasListPage';

describe('PessoasListPage', () => {
  test('renderiza tabela com pessoas retornadas pela API', async () => {
    const mockPessoas = [
      { id: 1, nome_completo: 'João Silva', status: 'Ativo', vinculos: 'Morador', nome_bloco: 'A', numero_apartamento: '101', cpf: '12345678901', telefone: '11999990000' }
    ];

    window.api.getFilteredPessoas = jest.fn().mockResolvedValue(mockPessoas);
    window.api.getVinculoTypes = jest.fn().mockResolvedValue(['Proprietário', 'Inquilino']);
    window.api.getBlocos = jest.fn().mockResolvedValue([{ id: 1, nome: 'A' }]);

    render(
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter>
          <PessoasListPage />
        </MemoryRouter>
      </ThemeProvider>
    );

    // aguarda até que o nome da pessoa esteja na tabela
    const nome = await screen.findByText(/João Silva/i);
    expect(nome).toBeInTheDocument();

    // verifica que a API de filtros foi chamada
    await waitFor(() => expect(window.api.getFilteredPessoas).toHaveBeenCalled());
  });
});
