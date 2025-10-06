import React, { useState, useEffect } from 'react';
import { 
  Typography, Box, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, IconButton, Chip, TextField, FormControl,
  InputLabel, Select, MenuItem, Grid
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

function MovimentacoesPage() {
  const navigate = useNavigate();
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    tipo: '',
    produto: ''
  });

  useEffect(() => {
    fetchMovimentacoes();
  }, [filtros]);

  const fetchMovimentacoes = async () => {
    setLoading(true);
    try {
      const data = await window.api.getMovimentacoes(filtros);
      setMovimentacoes(data);
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
    }
    setLoading(false);
  };

  const getTipoColor = (tipo) => {
    return tipo === 'ENTRADA' ? 'success' : 'error';
  };

  const getTipoIcon = (tipo) => {
    return tipo === 'ENTRADA' ? <AddIcon /> : <RemoveIcon />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/estoque')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Movimentações de Estoque
          </Typography>
        </Box>
        <Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => navigate('/estoque/entrada')}
            sx={{ mr: 1 }}
          >
            Nova Entrada
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<RemoveIcon />}
            onClick={() => navigate('/estoque/saida')}
          >
            Nova Saída
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Data Início"
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Data Fim"
              type="date"
              value={filtros.dataFim}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filtros.tipo}
                label="Tipo"
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="ENTRADA">Entrada</MenuItem>
                <MenuItem value="SAIDA">Saída</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Buscar produto"
              value={filtros.produto}
              onChange={(e) => setFiltros({ ...filtros, produto: e.target.value })}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Tabela de Movimentações */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Produto</TableCell>
              <TableCell>Quantidade</TableCell>
              <TableCell>Responsável</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movimentacoes.map((mov) => (
              <TableRow key={mov.id}>
                <TableCell>
                  {new Date(mov.data_movimentacao).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Chip 
                    icon={getTipoIcon(mov.tipo)}
                    label={mov.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                    color={getTipoColor(mov.tipo)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{mov.produto_nome}</TableCell>
                <TableCell>
                  {mov.quantidade} {mov.unidade_medida}
                </TableCell>
                <TableCell>{mov.responsavel}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default MovimentacoesPage;