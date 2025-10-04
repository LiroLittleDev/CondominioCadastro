import React, { useState, useEffect } from 'react';
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

  const [isPessoaExistente, setIsPessoaExistente] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
  const [loading, setLoading] = useState(false);

  const clearForm = () => {
    setNome('');
    // Não limpa o CPF para o usuário ver o que digitou
    setEmail('');
    setTelefone('');
    setTipoVinculo('');
    setIsPessoaExistente(false);
    setFeedback({ type: '', message: '' });
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      clearForm();
      setCpf(''); // Limpa o CPF apenas quando o modal abre
    }
  }, [open]);

  const handleCpfChange = (e) => {
    const newCpf = e.target.value;
    setCpf(newCpf);
    if (newCpf.trim() === '') {
      clearForm(); // Reseta tudo se o CPF for apagado
    }
  };

  const handleCpfBlur = async () => {
    if (cpf.trim() === '') return;
    try {
      const pessoa = await window.api.findPessoaByCpf(cpf);
      if (pessoa) {
        setNome(pessoa.nome_completo);
        setEmail(pessoa.email || '');
        setTelefone(pessoa.telefone || '');
        setIsPessoaExistente(true);
        setFeedback({ type: 'success', message: 'Pessoa localizada! Basta selecionar a categoria para continuar.' });
      } else {
        clearForm(); // Garante que se o CPF digitado não existe, o form está limpo
        setIsPessoaExistente(false);
        setFeedback({ type: '', message: '' });
      }
    } catch (err) {
      console.error("Erro ao buscar CPF", err);
      setIsPessoaExistente(false);
    }
  };

  const handleSubmit = async () => {
    if (!nome || !cpf || !tipoVinculo) {
        setFeedback({ type: 'error', message: 'Nome, CPF e Categoria são obrigatórios.' });
        return;
    }
    setLoading(true);
    setFeedback({ type: '', message: '' });
    
    const pessoaData = { nome_completo: nome, cpf, email, telefone };
    const vinculoData = { unidadeId: unidade.unidade_id, tipoVinculo: tipoVinculo };

    const result = await window.api.createPessoaEVinculo(pessoaData, vinculoData);
    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  if (!unidade) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" gutterBottom>Vincular Pessoa à Unidade {unidade.numero_apartamento}</Typography>
        
        <TextField label="CPF" fullWidth margin="normal" value={cpf} onChange={handleCpfChange} onBlur={handleCpfBlur} required />
        
        {feedback.message && !feedback.type.includes('error') && <Alert severity={feedback.type} sx={{ mb: 2 }}>{feedback.message}</Alert>}
        
        <TextField label="Nome Completo" fullWidth margin="normal" value={nome} onChange={e => setNome(e.target.value)} required disabled={isPessoaExistente} />
        <TextField label="Email" type="email" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} disabled={isPessoaExistente} />
        <TextField label="Telefone" fullWidth margin="normal" value={telefone} onChange={e => setTelefone(e.target.value)} disabled={isPessoaExistente} />
        
        <FormControl fullWidth margin="normal" required>
          <InputLabel>Tipo de Vínculo</InputLabel>
          <Select value={tipoVinculo} label="Tipo de Vínculo" onChange={e => setTipoVinculo(e.target.value)}>
            <MenuItem value="Proprietário">Proprietário</MenuItem>
            <MenuItem value="Inquilino">Inquilino</MenuItem>
            <MenuItem value="Morador">Morador</MenuItem>
            <MenuItem value="Responsável">Responsável</MenuItem>
          </Select>
        </FormControl>

        {feedback.message && feedback.type.includes('error') && <Alert severity="error" sx={{ mt: 2 }}>{feedback.message}</Alert>}

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