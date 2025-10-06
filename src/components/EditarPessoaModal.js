import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, Button, TextField, CircularProgress, Alert } from '@mui/material';
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

function EditarPessoaModal({ open, handleClose, pessoa, onSuccess }) {
  const [formData, setFormData] = useState({ nome_completo: '', cpf: '', rg: '', email: '', telefone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [telefoneError, setTelefoneError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [rgError, setRgError] = useState('');

  // Este 'useEffect' popula o formulário com os dados da pessoa
  // sempre que o modal é aberto com uma pessoa diferente.
useEffect(() => {
  if (pessoa) {
    setFormData({
      nome_completo: pessoa.nome_completo || '',
      cpf: pessoa.cpf || '',
      rg: pessoa.rg || '',
      email: pessoa.email || '',
      telefone: pessoa.telefone || '',
    });
  }
}, [pessoa]);

  const validateEmail = (email) => {
    if (!email) return true; // Email é opcional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateTelefone = (telefone) => {
    if (!telefone) return true; // Telefone é opcional
    const telefoneNumeros = telefone.replace(/\D/g, '');
    return telefoneNumeros.length === 11; // Deve ter 11 dígitos
  };

  const validateCpf = (cpf) => {
    if (!cpf) return true; // CPF agora é opcional
    const cpfNumeros = cpf.replace(/\D/g, '');
    return cpfNumeros.length === 11; // Deve ter 11 dígitos
  };

  const validateRg = (rg) => {
    if (!rg) return true; // RG é opcional
    return rg.length <= 27; // RG pode ter até 27 caracteres
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'email') {
      if (value && !validateEmail(value)) {
        setEmailError('Email inválido');
      } else {
        setEmailError('');
      }
    }
    
    if (name === 'telefone') {
      if (value && !validateTelefone(value)) {
        setTelefoneError('Telefone deve ter 11 dígitos ou ficar em branco');
      } else {
        setTelefoneError('');
      }
    }
    
    if (name === 'cpf') {
      if (value && !validateCpf(value)) {
        setCpfError('CPF deve ter 11 dígitos');
      } else {
        setCpfError('');
      }
    }
    
    if (name === 'rg') {
      if (value && !validateRg(value)) {
        setRgError('RG pode ter no máximo 27 caracteres');
      } else {
        setRgError('');
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.nome_completo) {
      setError('Nome Completo é obrigatório.');
      return;
    }
    
    if (!formData.cpf && !formData.rg) {
      setError('CPF ou RG deve ser informado.');
      return;
    }
    
    if (formData.cpf && !validateCpf(formData.cpf)) {
      setError('CPF deve ter 11 dígitos.');
      return;
    }
    
    if (formData.rg && !validateRg(formData.rg)) {
      setError('RG pode ter no máximo 27 caracteres.');
      return;
    }
    
    if (formData.email && !validateEmail(formData.email)) {
      setError('Email inválido.');
      return;
    }
    
    if (formData.telefone && !validateTelefone(formData.telefone)) {
      setError('Telefone deve ter 11 dígitos ou ficar em branco.');
      return;
    }
    
    setLoading(true);
    setError('');

    // Remove formatação do CPF e telefone antes de salvar
    const dataToSave = {
      ...formData,
      cpf: formData.cpf ? formData.cpf.replace(/\D/g, '') : null,
      rg: formData.rg || null,
      telefone: formData.telefone ? formData.telefone.replace(/\D/g, '') : null
    };

    const result = await window.api.updatePessoa(pessoa.id, dataToSave);

    setLoading(false);
    if (result.success) {
      onSuccess(); // Avisa a página principal para recarregar os dados e fechar
    } else {
      setError(result.message); // Mostra o erro retornado pelo backend
    }
  };

  if (!pessoa) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" gutterBottom>
          Editando: {pessoa.nome_completo}
        </Typography>
        
        <TextField name="nome_completo" label="Nome Completo" value={formData.nome_completo} onChange={handleChange} fullWidth margin="normal" required />
        <MaskedTextField name="cpf" label="CPF" mask="000.000.000-00" value={formData.cpf} onChange={handleChange} fullWidth margin="normal" error={!!cpfError} helperText={cpfError} />
        <TextField name="rg" label="RG" value={formData.rg} onChange={handleChange} fullWidth margin="normal" error={!!rgError} helperText={rgError} />
        <TextField name="email" label="Email" type="email" value={formData.email} onChange={handleChange} fullWidth margin="normal" error={!!emailError} helperText={emailError} />
        <MaskedTextField name="telefone" label="Telefone" mask="(00) 00000-0000" value={formData.telefone} onChange={handleChange} fullWidth margin="normal" error={!!telefoneError} helperText={telefoneError} />

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button sx={{ ml: 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Salvar Alterações'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default EditarPessoaModal;