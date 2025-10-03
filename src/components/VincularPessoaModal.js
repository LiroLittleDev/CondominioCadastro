import React, { useState, useEffect, useRef } from 'react';
import { Modal, Box, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert } from '@mui/material';

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

function VincularPessoaModal({ open, handleClose, unidade, onSuccess }) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipoVinculo, setTipoVinculo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nomeInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setNome('');
      setCpf('');
      setEmail('');
      setTelefone('');
      setTipoVinculo('');
      setError('');
      setLoading(false);

      setTimeout(() => {
        if (nomeInputRef.current) {
          nomeInputRef.current.focus();
        }
      }, 100);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!nome || !cpf || !tipoVinculo) {
      setError('Nome Completo, CPF e Tipo de Vínculo são obrigatórios.');
      return;
    }
    setLoading(true);
    setError('');
    const pessoaData = { nome_completo: nome, cpf, email, telefone };
    const vinculoData = { unidadeId: unidade.unidade_id, tipoVinculo: tipoVinculo };
    const result = await window.api.createPessoaEVinculo(pessoaData, vinculoData);
    setLoading(false);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.message);
    }
  };

  if (!unidade) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" gutterBottom>
          Vincular Pessoa à Unidade {unidade.numero_apartamento}
        </Typography>
        
        <TextField 
          inputRef={nomeInputRef}
          label="Nome Completo" 
          fullWidth 
          margin="normal" 
          value={nome} 
          onChange={e => setNome(e.target.value)} 
          required 
        />
        <TextField label="CPF" fullWidth margin="normal" value={cpf} onChange={e => setCpf(e.target.value)} required />
        <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} />
        <TextField label="Telefone" fullWidth margin="normal" value={telefone} onChange={e => setTelefone(e.target.value)} />
        
        {/* ESTA É A PARTE QUE ESTAVA FALTANDO */}
        <FormControl fullWidth margin="normal" required>
          <InputLabel id="tipo-vinculo-label">Tipo de Vínculo</InputLabel>
          <Select
            labelId="tipo-vinculo-label"
            value={tipoVinculo}
            label="Tipo de Vínculo"
            onChange={e => setTipoVinculo(e.target.value)}
          >
            <MenuItem value="Proprietário">Proprietário</MenuItem>
            <MenuItem value="Inquilino">Inquilino</MenuItem>
            <MenuItem value="Morador">Morador</MenuItem>
            <MenuItem value="Responsável">Responsável</MenuItem>
            <MenuItem value="Moradia Temporária">Moradia Temporária</MenuItem>
          </Select>
        </FormControl>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button variant="contained" sx={{ ml: 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Salvar'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default VincularPessoaModal;