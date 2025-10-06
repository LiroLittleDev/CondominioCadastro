import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Grid,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import MaskedTextField from './MaskedTextField';

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
  maxHeight: '90vh',
  overflow: 'auto'
};

function CadastroRapidoModal({ open, handleClose, onSuccess }) {
  const [activeStep, setActiveStep] = useState(0);
  const [blocos, setBlocos] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Dados do formulário
  const [formData, setFormData] = useState({
    // Localização
    blocoId: '',
    entradaId: '',
    unidadeId: '',
    // Pessoa
    nome_completo: '',
    cpf: '',
    rg: '',
    email: '',
    telefone: '',
    tipoVinculo: ''
  });

  const [errors, setErrors] = useState({});

  const steps = ['Selecionar Unidade', 'Dados da Pessoa', 'Confirmar'];

  useEffect(() => {
    if (open) {
      fetchBlocos();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      blocoId: '',
      entradaId: '',
      unidadeId: '',
      nome_completo: '',
      cpf: '',
      rg: '',
      email: '',
      telefone: '',
      tipoVinculo: ''
    });
    setActiveStep(0);
    setErrors({});
    setFeedback({ type: '', message: '' });
  };

  const fetchBlocos = async () => {
    const data = await window.api.getBlocos();
    setBlocos(data);
  };

  const fetchEntradas = async (blocoId) => {
    const data = await window.api.getEntradas(blocoId);
    setEntradas(data);
    setUnidades([]);
    setFormData(prev => ({ ...prev, entradaId: '', unidadeId: '' }));
  };

  const fetchUnidades = async (entradaId) => {
    const data = await window.api.getUnidades(entradaId);
    setUnidades(data);
    setFormData(prev => ({ ...prev, unidadeId: '' }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 0) {
      if (!formData.blocoId) newErrors.blocoId = 'Selecione um bloco';
      if (!formData.entradaId) newErrors.entradaId = 'Selecione uma entrada';
      if (!formData.unidadeId) newErrors.unidadeId = 'Selecione uma unidade';
    }

    if (step === 1) {
      if (!formData.nome_completo) newErrors.nome_completo = 'Nome é obrigatório';
      if (!formData.cpf && !formData.rg) newErrors.identificacao = 'CPF ou RG deve ser informado';
      if (!formData.tipoVinculo) newErrors.tipoVinculo = 'Selecione o tipo de vínculo';
      
      if (formData.cpf) {
        const cpfNumeros = formData.cpf.replace(/\D/g, '');
        if (cpfNumeros.length !== 11) newErrors.cpf = 'CPF deve ter 11 dígitos';
      }
      
      if (formData.rg) {
        if (formData.rg.length > 27) newErrors.rg = 'RG pode ter no máximo 27 caracteres';
        if (formData.rg.trim() === '') newErrors.rg = 'RG não pode estar vazio';
      }
      
      if (formData.email && formData.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) newErrors.email = 'Email inválido';
      }
      
      if (formData.telefone && formData.telefone.trim() !== '') {
        const telefoneNumeros = formData.telefone.replace(/\D/g, '');
        if (telefoneNumeros.length !== 11) newErrors.telefone = 'Telefone deve ter 11 dígitos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'blocoId' && value) {
      fetchEntradas(value);
    }
    if (field === 'entradaId' && value) {
      fetchUnidades(value);
    }
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) return;

    setLoading(true);
    setFeedback({ type: '', message: '' });

    // Limpar campos vazios
    const pessoaData = {
      nome_completo: formData.nome_completo.trim(),
      cpf: formData.cpf && formData.cpf.trim() !== '' ? formData.cpf.replace(/\D/g, '') : null,
      rg: formData.rg && formData.rg.trim() !== '' ? formData.rg.trim() : null,
      email: formData.email && formData.email.trim() !== '' ? formData.email.trim() : null,
      telefone: formData.telefone && formData.telefone.trim() !== '' ? formData.telefone.replace(/\D/g, '') : null
    };

    const vinculoData = {
      unidadeId: formData.unidadeId,
      tipoVinculo: formData.tipoVinculo
    };

    const result = await window.api.createPessoaEVinculo(pessoaData, vinculoData);
    setLoading(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const getSelectedBlocoNome = () => {
    const bloco = blocos.find(b => b.id === formData.blocoId);
    return bloco ? bloco.nome : '';
  };

  const getSelectedEntradaLetra = () => {
    const entrada = entradas.find(e => e.id === formData.entradaId);
    return entrada ? entrada.letra : '';
  };

  const getSelectedUnidadeNumero = () => {
    const unidade = unidades.find(u => u.id === formData.unidadeId);
    return unidade ? unidade.numero_apartamento : '';
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.blocoId}>
                <InputLabel>Bloco</InputLabel>
                <Select
                  value={formData.blocoId}
                  label="Bloco"
                  onChange={(e) => handleChange('blocoId', e.target.value)}
                >
                  {blocos.map(bloco => (
                    <MenuItem key={bloco.id} value={bloco.id}>
                      {bloco.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.entradaId} disabled={!formData.blocoId}>
                <InputLabel>Entrada</InputLabel>
                <Select
                  value={formData.entradaId}
                  label="Entrada"
                  onChange={(e) => handleChange('entradaId', e.target.value)}
                >
                  {entradas.map(entrada => (
                    <MenuItem key={entrada.id} value={entrada.id}>
                      Entrada {entrada.letra}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.unidadeId} disabled={!formData.entradaId}>
                <InputLabel>Unidade</InputLabel>
                <Select
                  value={formData.unidadeId}
                  label="Unidade"
                  onChange={(e) => handleChange('unidadeId', e.target.value)}
                >
                  {unidades.map(unidade => (
                    <MenuItem key={unidade.id} value={unidade.id}>
                      Apartamento {unidade.numero_apartamento}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome Completo"
                value={formData.nome_completo}
                onChange={(e) => handleChange('nome_completo', e.target.value)}
                error={!!errors.nome_completo}
                helperText={errors.nome_completo}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <MaskedTextField
                fullWidth
                label="CPF"
                mask="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => handleChange('cpf', e.target.value)}
                error={!!errors.cpf}
                helperText={errors.cpf}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="RG"
                value={formData.rg}
                onChange={(e) => handleChange('rg', e.target.value)}
                error={!!errors.rg}
                helperText={errors.rg}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
              />
            </Grid>
            
            <Grid item xs={12}>
              <MaskedTextField
                fullWidth
                label="Telefone"
                mask="(00) 00000-0000"
                value={formData.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                error={!!errors.telefone}
                helperText={errors.telefone}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.tipoVinculo} required>
                <InputLabel>Tipo de Vínculo</InputLabel>
                <Select
                  value={formData.tipoVinculo}
                  label="Tipo de Vínculo"
                  onChange={(e) => handleChange('tipoVinculo', e.target.value)}
                >
                  <MenuItem value="Proprietário">Proprietário</MenuItem>
                  <MenuItem value="Proprietário Morador">Proprietário Morador</MenuItem>
                  <MenuItem value="Inquilino">Inquilino</MenuItem>
                  <MenuItem value="Morador">Morador</MenuItem>
                  <MenuItem value="Morador Temporário">Morador Temporário</MenuItem>
                  <MenuItem value="Responsável">Responsável</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {(errors.identificacao) && (
              <Grid item xs={12}>
                <Alert severity="error">{errors.identificacao}</Alert>
              </Grid>
            )}
          </Grid>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Confirme os dados:
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="primary">Unidade:</Typography>
              <Typography>{getSelectedBlocoNome()} - Entrada {getSelectedEntradaLetra()} - Apto {getSelectedUnidadeNumero()}</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="primary">Pessoa:</Typography>
              <Typography>{formData.nome_completo}</Typography>
              {formData.cpf && <Typography variant="body2">CPF: {formData.cpf}</Typography>}
              {formData.rg && <Typography variant="body2">RG: {formData.rg}</Typography>}
              {formData.email && <Typography variant="body2">Email: {formData.email}</Typography>}
              {formData.telefone && <Typography variant="body2">Telefone: {formData.telefone}</Typography>}
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="primary">Vínculo:</Typography>
              <Typography>{formData.tipoVinculo}</Typography>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h5" component="h2" gutterBottom>
          Cadastro Rápido
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent(activeStep)}

        {feedback.message && (
          <Alert severity={feedback.type} sx={{ mt: 2 }}>
            {feedback.message}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            onClick={activeStep === 0 ? handleClose : handleBack}
            disabled={loading}
          >
            {activeStep === 0 ? 'Cancelar' : 'Voltar'}
          </Button>
          
          <Button
            variant="contained"
            onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : activeStep === steps.length - 1 ? (
              'Cadastrar'
            ) : (
              'Próximo'
            )}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default CadastroRapidoModal;