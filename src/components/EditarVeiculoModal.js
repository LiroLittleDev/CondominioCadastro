import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert } from '@mui/material';
import MaskedTextField from './MaskedTextField';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

function EditarVeiculoModal({ open, handleClose, veiculo, onSuccess }) {
  const [formData, setFormData] = useState({ placa: '', marca: '', modelo: '', cor: '', tipo: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [placaError, setPlacaError] = useState('');


  useEffect(() => {
    if (veiculo) {
      setFormData({
        placa: veiculo.placa || '',
        marca: veiculo.marca || '',
        modelo: veiculo.modelo || '',
        cor: veiculo.cor || '',
        tipo: veiculo.tipo || '',
      });
      setError('');
      setPlacaError('');
    }
  }, [veiculo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // ESTA É A FUNÇÃO QUE ESTAVA FALTANDO
  const handleSubmit = async () => {
    if (!formData.placa || !formData.marca || !formData.modelo || !formData.cor || !formData.tipo) {
      setError('Todos os campos são obrigatórios.');
      return;
    }
    

    setLoading(true);
    setError('');
    const result = await window.api.updateVeiculo(veiculo.id, formData);
    setLoading(false);
    if (result.success) {
      onSuccess();
      handleClose();
    } else {
      setError(result.message);
    }
  };

  if (!veiculo) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" gutterBottom>
          Editando Veículo: {veiculo.placa}
        </Typography>
        <MaskedTextField name="placa" label="Placa" mask="AAA0A00" value={formData.placa} onChange={handleChange} fullWidth margin="normal" required error={!!placaError} helperText={placaError} />
        <TextField name="marca" label="Marca" value={formData.marca} onChange={handleChange} fullWidth margin="normal" required />
        <TextField name="modelo" label="Modelo" value={formData.modelo} onChange={handleChange} fullWidth margin="normal" required />
        <TextField name="cor" label="Cor" value={formData.cor} onChange={handleChange} fullWidth margin="normal" required />
        <FormControl fullWidth margin="normal" required>
          <InputLabel id="tipo-veiculo-edit-label">Tipo</InputLabel>
          <Select name="tipo" labelId="tipo-veiculo-edit-label" value={formData.tipo} label="Tipo" onChange={handleChange}>
            <MenuItem value="Carro">Carro</MenuItem>
            <MenuItem value="Moto">Moto</MenuItem>
          </Select>
        </FormControl>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button variant="contained" sx={{ ml: 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Salvar Alterações'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default EditarVeiculoModal;