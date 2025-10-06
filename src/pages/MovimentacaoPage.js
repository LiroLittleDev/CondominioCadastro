import React, { useState, useEffect } from 'react';
import { 
  Typography, Box, Button, TextField, FormControl, InputLabel, Select, 
  MenuItem, Grid, Paper, Alert, Autocomplete
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function MovimentacaoPage() {
  const navigate = useNavigate();
  const { tipo } = useParams(); // 'entrada' ou 'saida'
  const [produtos, setProdutos] = useState([]);
  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade: '',
    motivo: '',
    responsavel: '',
    observacao: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isEntrada = tipo === 'entrada';
  const tipoMovimentacao = isEntrada ? 'ENTRADA' : 'SAIDA';

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      const data = await window.api.getProdutos();
      setProdutos(data);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.produto_id || !formData.quantidade || !formData.responsavel) {
      setError('Produto, quantidade e responsável são obrigatórios');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const movimentacao = {
        ...formData,
        tipo: tipoMovimentacao,
        quantidade: parseInt(formData.quantidade)
      };

      const result = await window.api.createMovimentacao(movimentacao);
      
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          navigate('/estoque/movimentacoes');
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Erro ao registrar movimentação');
    }
    setLoading(false);
  };

  const motivosEntrada = [
    'Compra',
    'Doação',
    'Devolução',
    'Transferência',
    'Ajuste de inventário',
    'Outros'
  ];

  const motivosSaida = [
    'Uso/Consumo',
    'Manutenção',
    'Limpeza',
    'Evento',
    'Transferência',
    'Perda/Avaria',
    'Outros'
  ];

  const motivosDisponiveis = isEntrada ? motivosEntrada : motivosSaida;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/estoque')}
          sx={{ mr: 2 }}
        >
          Voltar
        </Button>
        <Typography variant="h4" component="h1">
          Nova {isEntrada ? 'Entrada' : 'Saída'} de Estoque
        </Typography>
      </Box>

      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Autocomplete
              options={produtos}
              getOptionLabel={(option) => `${option.nome} (${option.codigo || 'S/C'})`}
              value={produtos.find(p => p.id === formData.produto_id) || null}
              onChange={(event, newValue) => {
                setFormData({...formData, produto_id: newValue?.id || ''});
              }}
              renderInput={(params) => (
                <TextField {...params} label="Produto" required />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Quantidade"
              type="number"
              value={formData.quantidade}
              onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Motivo</InputLabel>
              <Select
                value={formData.motivo}
                label="Motivo"
                onChange={(e) => setFormData({...formData, motivo: e.target.value})}
              >
                {motivosDisponiveis.map(motivo => (
                  <MenuItem key={motivo} value={motivo}>{motivo}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Responsável"
              value={formData.responsavel}
              onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Observação"
              multiline
              rows={3}
              value={formData.observacao}
              onChange={(e) => setFormData({...formData, observacao: e.target.value})}
            />
          </Grid>
        </Grid>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            onClick={() => navigate('/estoque')} 
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={loading}
            color={isEntrada ? 'success' : 'error'}
          >
            Registrar {isEntrada ? 'Entrada' : 'Saída'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default MovimentacaoPage;