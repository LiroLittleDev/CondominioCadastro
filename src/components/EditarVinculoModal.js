import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, Button, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert } from '@mui/material';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400, // Estilo padrão
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

function EditarVinculoModal({ open, handleClose, vinculo, onSuccess }) {
  const [tipoVinculo, setTipoVinculo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (vinculo) {
      setTipoVinculo(vinculo.tipo_vinculo || '');
      setError('');
    }
  }, [vinculo]);

  const handleSubmit = async () => {
    if (!tipoVinculo) {
      setError('Você precisa selecionar uma categoria.');
      return;
    }
    setLoading(true);
    setError('');
    // A CORREÇÃO ESTÁ AQUI: Usando 'vinculo.id' em vez de 'vinculo.vinculo_id'
    const result = await window.api.updateVinculo(vinculo.id, tipoVinculo);
    setLoading(false);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.message);
    }
  };

  if (!vinculo) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" gutterBottom>
          Alterar Categoria de Vínculo
        </Typography>
        
        <FormControl fullWidth margin="normal" required>
          <InputLabel id="tipo-vinculo-edit-label">Nova Categoria</InputLabel>
          <Select
            labelId="tipo-vinculo-edit-label"
            value={tipoVinculo}
            label="Nova Categoria"
            onChange={e => setTipoVinculo(e.target.value)}
          >
            <MenuItem value="Proprietário">Proprietário</MenuItem>
            <MenuItem value="Proprietário Morador">Proprietário Morador</MenuItem>
            <MenuItem value="Inquilino">Inquilino</MenuItem>
            <MenuItem value="Morador">Morador</MenuItem>
            <MenuItem value="Morador Temporário">Morador Temporário</MenuItem>
            <MenuItem value="Responsável">Responsável</MenuItem>
          </Select>
        </FormControl>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button variant="contained" sx={{ ml: 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Salvar Categoria'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
export default EditarVinculoModal;