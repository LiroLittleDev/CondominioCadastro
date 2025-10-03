import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, Button, TextField, CircularProgress, Alert } from '@mui/material';

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
  const [formData, setFormData] = useState({ nome_completo: '', cpf: '', email: '', telefone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Este 'useEffect' popula o formulário com os dados da pessoa
  // sempre que o modal é aberto com uma pessoa diferente.
useEffect(() => {
  if (pessoa) {
    setFormData({
      nome_completo: pessoa.nome_completo || '',
      cpf: pessoa.cpf || '',
      email: pessoa.email || '',
      telefone: pessoa.telefone || '',
    });
  }
}, [pessoa]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.nome_completo || !formData.cpf) {
      setError('Nome Completo e CPF são obrigatórios.');
      return;
    }
    setLoading(true);
    setError('');

    const result = await window.api.updatePessoa(pessoa.id, formData);

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
        <TextField name="cpf" label="CPF" value={formData.cpf} onChange={handleChange} fullWidth margin="normal" required />
        <TextField name="email" label="Email" type="email" value={formData.email} onChange={handleChange} fullWidth margin="normal" />
        <TextField name="telefone" label="Telefone" value={formData.telefone} onChange={handleChange} fullWidth margin="normal" />

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

export default EditarPessoaModal;