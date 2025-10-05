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

function AdicionarVeiculoModal({ open, handleClose, pessoa, onSuccess }) {
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [cor, setCor] = useState('');
  const [tipo, setTipo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [placaError, setPlacaError] = useState('');

  const validatePlaca = (placa) => {
    if (!placa) return false; // Placa é obrigatória
    const placaLimpa = placa.replace(/\W/g, '');
    return placaLimpa.length === 7; // Deve ter 7 caracteres
  };

  const handlePlacaChange = (e) => {
    const newPlaca = e.target.value;
    setPlaca(newPlaca);
    
    if (!validatePlaca(newPlaca)) {
      setPlacaError('Placa deve seguir o padrão Mercosul (AAA0A00)');
    } else {
      setPlacaError('');
    }
  };

  useEffect(() => {
    if (open) {
      setPlaca('');
      setMarca('');
      setModelo('');
      setCor('');
      setTipo('');
      setError('');
      setLoading(false);
      setPlacaError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!placa || !marca || !modelo || !cor || !tipo) {
      setError('Todos os campos são obrigatórios.');
      return;
    }
    
    if (!validatePlaca(placa)) {
      setError('Placa deve seguir o padrão Mercosul (AAA0A00).');
      return;
    }
    setLoading(true);
    setError('');

    const veiculoData = { placa, marca, modelo, cor, tipo, pessoa_id: pessoa.id };
    const result = await window.api.createVeiculo(veiculoData);
    setLoading(false);

    if (result.success) {
      onSuccess();
      handleClose();
    } else {
      setError(result.message);
    }
  };

  if (!pessoa) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" gutterBottom>
          Adicionar Veículo para: {pessoa.nome_completo}
        </Typography>
        
        <MaskedTextField label="Placa" name="placa" mask="AAA0A00" fullWidth margin="normal" value={placa} onChange={handlePlacaChange} required error={!!placaError} helperText={placaError} />
        <TextField label="Marca" fullWidth margin="normal" value={marca} onChange={e => setMarca(e.target.value)} required />
        <TextField label="Modelo" fullWidth margin="normal" value={modelo} onChange={e => setModelo(e.target.value)} required />
        <TextField label="Cor" fullWidth margin="normal" value={cor} onChange={e => setCor(e.target.value)} required />
        
        <FormControl fullWidth margin="normal" required>
          <InputLabel id="tipo-veiculo-label">Tipo</InputLabel>
          <Select labelId="tipo-veiculo-label" value={tipo} label="Tipo" onChange={e => setTipo(e.target.value)}>
            <MenuItem value="Carro">Carro</MenuItem>
            <MenuItem value="Moto">Moto</MenuItem>
          </Select>
        </FormControl>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button variant="contained" sx={{ ml: 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Salvar Veículo'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default AdicionarVeiculoModal;