import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel, Grid, Alert } from '@mui/material';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

function ProdutoModal({ open, handleClose, produto, onSuccess }) {
  const [formData, setFormData] = useState({
    nome: '',
    categoria_id: '',
    estoque_minimo: 0
  });
  const [categorias, setCategorias] = useState([]);
  const [estoqueMinimoOption, setEstoqueMinimoOption] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchCategorias();
      if (produto) {
        setFormData({
          nome: produto.nome || '',
          categoria_id: produto.categoria_id || '',
          estoque_minimo: produto.estoque_minimo || 0
        });
        // inicializar opção do select para estoque mínimo
        const presets = ['0','1','2','5','10','20','50','100'];
        const s = String(produto.estoque_minimo || 0);
        setEstoqueMinimoOption(presets.includes(s) ? s : 'other');
      } else {
        setFormData({
          nome: '',
          categoria_id: '',
          estoque_minimo: 0
        });
        setEstoqueMinimoOption('0');
      }
      setError('');
    }
  }, [open, produto]);

  const fetchCategorias = async () => {
    try {
      const data = await window.api.getCategoriasProduto();
      setCategorias(data);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    if (!formData.categoria_id) {
      setError('Categoria é obrigatória');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (produto) {
        // Ao editar, também permitimos alterar o estoque mínimo
        const updateData = {
          nome: formData.nome,
          categoria_id: formData.categoria_id,
          estoque_minimo: parseInt(formData.estoque_minimo, 10) || 0
        };
        result = await window.api.updateProduto(produto.id, updateData);
      } else {
        // Ao criar, enviamos apenas os campos necessários: nome, categoria e estoque_minimo
        const createData = {
          nome: formData.nome,
          categoria_id: formData.categoria_id,
          estoque_minimo: parseInt(formData.estoque_minimo, 10) || 0
        };
        result = await window.api.createProduto(createData);
      }

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Erro ao salvar produto');
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" gutterBottom>
          {produto ? 'Editar Produto' : 'Novo Produto'}
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nome do Produto"
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              required
              placeholder="Ex: Detergente neutro, Lâmpada LED 9W..."
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Categoria *</InputLabel>
              <Select
                value={formData.categoria_id}
                label="Categoria *"
                onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
              >
                {categorias.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.nome}
                    {cat.descricao && ` - ${cat.descricao}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* sem campo de status: o sistema determina sem/baixo/normal pelo estoque */}
          {/* Estoque mínimo: selecionar entre presets ou 'Outro' para valor customizado */}
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Estoque Mínimo</InputLabel>
              <Select
                value={estoqueMinimoOption}
                label="Estoque Mínimo"
                onChange={(e) => {
                  const val = e.target.value;
                  setEstoqueMinimoOption(val);
                  if (val === 'other') {
                    // mantém o valor atual numérico em formData
                    setFormData({...formData});
                  } else {
                    setFormData({...formData, estoque_minimo: parseInt(val, 10) || 0});
                  }
                }}
              >
                <MenuItem value="0">0</MenuItem>
                <MenuItem value="1">1</MenuItem>
                <MenuItem value="2">2</MenuItem>
                <MenuItem value="5">5</MenuItem>
                <MenuItem value="10">10</MenuItem>
                <MenuItem value="20">20</MenuItem>
                <MenuItem value="50">50</MenuItem>
                <MenuItem value="100">100</MenuItem>
                <MenuItem value="other">Outro...</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {estoqueMinimoOption === 'other' && (
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Estoque Mínimo (outro)"
                type="number"
                value={formData.estoque_minimo}
                onChange={(e) => setFormData({...formData, estoque_minimo: parseInt(e.target.value, 10) || 0})}
                inputProps={{ min: 0, inputMode: 'numeric', pattern: '[0-9]*', style: { appearance: 'textfield' } }}
              />
            </Grid>
          )}
        </Grid>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button variant="contained" sx={{ ml: 1 }} onClick={handleSubmit} disabled={loading}>
            {produto ? 'Atualizar' : 'Criar'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default ProdutoModal;