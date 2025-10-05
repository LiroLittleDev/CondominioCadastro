import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Box,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import SearchIcon from '@mui/icons-material/Search';

function VeiculosListPage() {
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState([]);
  const [blocos, setBlocos] = useState([]);
  const [filtros, setFiltros] = useState({
    tipo: '',
    blocoId: '',
    busca: ''
  });
  const [loading, setLoading] = useState(true);

  const fetchBlocos = useCallback(async () => {
    const blocosData = await window.api.getAllBlocos();
    setBlocos(blocosData);
  }, []);

  const fetchVeiculos = useCallback(async () => {
    setLoading(true);
    const filtrosLimpos = Object.fromEntries(
      Object.entries(filtros).filter(([_, value]) => value !== '')
    );
    const data = await window.api.getAllVeiculosDetails(filtrosLimpos);
    setVeiculos(data);
    setLoading(false);
  }, [filtros]);

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const handlePessoaClick = (pessoaId) => {
    if (pessoaId) {
      navigate(`/pessoa/${pessoaId}`);
    }
  };

  useEffect(() => {
    fetchBlocos();
  }, [fetchBlocos]);

  useEffect(() => {
    fetchVeiculos();
  }, [fetchVeiculos]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Lista de Veículos
        </Typography>
      </Box>

      {/* Filtros */}
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Buscar"
              placeholder="Placa, marca, modelo ou proprietário"
              value={filtros.busca}
              onChange={(e) => handleFiltroChange('busca', e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Veículo</InputLabel>
              <Select
                value={filtros.tipo}
                label="Tipo de Veículo"
                onChange={(e) => handleFiltroChange('tipo', e.target.value)}
              >
                <MenuItem value="">
                  <em>Todos os Tipos</em>
                </MenuItem>
                <MenuItem value="Carro">Carro</MenuItem>
                <MenuItem value="Moto">Moto</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Bloco</InputLabel>
              <Select
                value={filtros.blocoId}
                label="Bloco"
                onChange={(e) => handleFiltroChange('blocoId', e.target.value)}
              >
                <MenuItem value="">
                  <em>Todos os Blocos</em>
                </MenuItem>
                {blocos.map((bloco) => (
                  <MenuItem key={bloco.id} value={bloco.id}>
                    {bloco.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabela */}
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Placa</TableCell>
                <TableCell>Veículo</TableCell>
                <TableCell>Proprietário</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell>Unidade</TableCell>
                <TableCell>Vínculo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {veiculos.map((veiculo) => (
                <TableRow 
                  key={veiculo.id}
                  hover
                  onClick={() => handlePessoaClick(veiculo.pessoa_id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {veiculo.tipo === 'Carro' ? (
                        <DirectionsCarIcon sx={{ color: 'primary.main' }} />
                      ) : (
                        <TwoWheelerIcon sx={{ color: 'secondary.main' }} />
                      )}
                      {veiculo.tipo}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {veiculo.placa}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1">
                      {veiculo.marca} {veiculo.modelo}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {veiculo.cor}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: '500' }}>
                      {veiculo.nome_proprietario}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {veiculo.telefone_proprietario || '-'}
                  </TableCell>
                  <TableCell>
                    {veiculo.nome_bloco && veiculo.numero_apartamento ? (
                      <Typography variant="body1">
                        {veiculo.nome_bloco} - Apto {veiculo.numero_apartamento}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Sem vínculo ativo
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {veiculo.tipo_vinculo ? (
                      <Chip
                        label={veiculo.tipo_vinculo}
                        size="small"
                        color={
                          veiculo.tipo_vinculo === 'Proprietário' ? 'primary' :
                          veiculo.tipo_vinculo === 'Inquilino' ? 'secondary' :
                          veiculo.tipo_vinculo === 'Morador' ? 'success' :
                          veiculo.tipo_vinculo === 'Morador Temporário' ? 'warning' : 'default'
                        }
                        variant="outlined"
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {veiculos.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Nenhum veículo encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tente ajustar os filtros de busca
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

export default VeiculosListPage;