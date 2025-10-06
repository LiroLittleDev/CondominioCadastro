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
    codigo: '',
    nome: '',
    categoria_id: '',
    unidade_medida: 'un',
    estoque_minimo: 0,
    valor_unitario: 0
  });
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchCategorias();
      if (produto) {
        setFormData({
          codigo: produto.codigo || '',
          nome: produto.nome || '',
          categoria_id: produto.categoria_id || '',
          unidade_medida: produto.unidade_medida || 'un',
          estoque_minimo: produto.estoque_minimo || 0,
          valor_unitario: produto.valor_unitario || 0
        });
      } else {
        setFormData({
          codigo: '',
          nome: '',
          categoria_id: '',
          unidade_medida: 'un',
          estoque_minimo: 0,
          valor_unitario: 0
        });
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

    setLoading(true);
    try {
      const result = produto 
        ? await window.api.updateProduto(produto.id, formData)
        : await window.api.createProduto(formData);
      
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
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Código"
              value={formData.codigo}
              onChange={(e) => setFormData({...formData, codigo: e.target.value})}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Unidade</InputLabel>
              <Select
                value={formData.unidade_medida}
                label="Unidade"
                onChange={(e) => setFormData({...formData, unidade_medida: e.target.value})}
              >
                <MenuItem value="un">Unidade</MenuItem>
                <MenuItem value="kg">Quilograma</MenuItem>
                <MenuItem value="l">Litro</MenuItem>
                <MenuItem value="m">Metro</MenuItem>
                <MenuItem value="cx">Caixa</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nome"
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={formData.categoria_id}
                label="Categoria"
                onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
              >
                {categorias.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Estoque Mínimo"
              type="number"
              value={formData.estoque_minimo}
              onChange={(e) => setFormData({...formData, estoque_minimo: parseInt(e.target.value) || 0})}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Valor Unitário"
              type="number"
              step="0.01"
              value={formData.valor_unitario}
              onChange={(e) => setFormData({...formData, valor_unitario: parseFloat(e.target.value) || 0})}
            />
          </Grid>
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