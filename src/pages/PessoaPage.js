import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Paper, Box, CircularProgress, List, ListItem, ListItemText, Divider, Button, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';

function PessoaPage() {
  const { pessoaId } = useParams();
  const navigate = useNavigate();
  const [pessoa, setPessoa] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pessoaData, veiculosData] = await Promise.all([
      window.api.getPessoaDetails(pessoaId),
      window.api.getVeiculosByPessoa(pessoaId),
    ]);
    setPessoa(pessoaData);
    setVeiculos(veiculosData);
    setLoading(false);
  }, [pessoaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <CircularProgress />;
  if (!pessoa) return <Typography color="error">Pessoa não encontrada.</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Perfil de Morador
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>{pessoa.nome_completo}</Typography>
        <Typography><strong>CPF:</strong> {pessoa.cpf}</Typography>
        <Typography><strong>Email:</strong> {pessoa.email || 'Não informado'}</Typography>
        <Typography><strong>Telefone:</strong> {pessoa.telefone || 'Não informado'}</Typography>
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Veículos Cadastrados</Typography>
          <Button variant="contained" startIcon={<AddIcon />}>
            Adicionar Veículo
          </Button>
        </Box>
        <Divider />
        <List>
          {veiculos.length > 0 ? (
            veiculos.map((veiculo) => (
              <ListItem key={veiculo.id} divider>
                <ListItemText
                  primary={`${veiculo.marca} ${veiculo.modelo} (${veiculo.cor})`}
                  secondary={`Placa: ${veiculo.placa}`}
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText primary="Nenhum veículo cadastrado para esta pessoa." />
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  );
}

export default PessoaPage;