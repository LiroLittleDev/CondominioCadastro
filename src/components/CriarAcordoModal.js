import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, Autocomplete, Typography, Box, Alert
} from '@mui/material';

const CriarAcordoModal = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    pessoa_id: '',
    descricao: '',
    valor_total: '',
    valor_entrada: '',
    quantidade_parcelas: '',
    data_acordo: new Date().toISOString().split('T')[0]
  });
  const [pessoas, setPessoas] = useState([]);
  const [pessoaSelecionada, setPessoaSelecionada] = useState(null);
  const [unidadeInfo, setUnidadeInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    if (open) {
      carregarPessoas();
      resetForm();
    }
  }, [open]);

  const carregarPessoas = async (termo = '') => {
    try {
      if (!window.electronAPI) {
        console.warn('ElectronAPI não disponível. Execute no modo desktop.');
        setPessoas([]);
        return;
      }
      
      const pessoas = await window.electronAPI.invoke('get-filtered-pessoas', {});
      
      if (!pessoas || pessoas.length === 0) {
        setPessoas([]);
        return;
      }
      
      // Filtrar por termo se fornecido
      let pessoasFiltradas = pessoas;
      if (termo && termo.length >= 2) {
        const termoLower = termo.toLowerCase();
        pessoasFiltradas = pessoas.filter(p => 
          p.nome_completo.toLowerCase().includes(termoLower) ||
          (p.cpf && p.cpf.includes(termo.replace(/\D/g, '')))
        );
      }
      
      setPessoas(pessoasFiltradas.slice(0, 20));
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error);
      setPessoas([]);
    }
  };

  const resetForm = () => {
    setFormData({
      pessoa_id: '',
      descricao: '',
      valor_total: '',
      valor_entrada: '',
      quantidade_parcelas: '',
      data_acordo: new Date().toISOString().split('T')[0]
    });
    setPessoaSelecionada(null);
    setUnidadeInfo('');
    setError('');
  };

  const handlePessoaChange = (event, newValue) => {
    console.log('Pessoa selecionada:', newValue);
    setPessoaSelecionada(newValue);
    if (newValue) {
      setFormData(prev => ({ ...prev, pessoa_id: newValue.id }));
      let unidade = 'Sem vínculo ativo';
      // Verificar se tem vínculo ativo usando os campos corretos
      if (newValue.status === 'Ativo' && newValue.nome_bloco && newValue.numero_apartamento) {
        unidade = `${newValue.nome_bloco} - Apto ${newValue.numero_apartamento}`;
      } else if (newValue.vinculos && newValue.nome_bloco && newValue.numero_apartamento) {
        // Fallback para estrutura alternativa
        unidade = `${newValue.nome_bloco} - Apto ${newValue.numero_apartamento}`;
      }
      setUnidadeInfo(unidade);
    } else {
      setFormData(prev => ({ ...prev, pessoa_id: '' }));
      setUnidadeInfo('');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  const calcularValorParcela = () => {
    const valorTotal = parseFloat(formData.valor_total) || 0;
    const valorEntrada = parseFloat(formData.valor_entrada) || 0;
    const quantidadeParcelas = parseInt(formData.quantidade_parcelas) || 1;
    
    const valorParcelado = valorTotal - valorEntrada;
    return valorParcelado / quantidadeParcelas;
  };

  const handleSubmit = async () => {
    setError('');
    
    if (!window.electronAPI) {
      setError('Execute no modo desktop para criar acordos');
      return;
    }
    
    if (!formData.pessoa_id || !formData.descricao || !formData.valor_total || !formData.quantidade_parcelas) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    const valorTotal = parseFloat(formData.valor_total);
    const valorEntrada = parseFloat(formData.valor_entrada) || 0;
    
    if (valorEntrada >= valorTotal) {
      setError('O valor da entrada deve ser menor que o valor total');
      return;
    }

    setLoading(true);
    try {
      const acordoData = {
        ...formData,
        valor_total: valorTotal,
        valor_entrada: valorEntrada,
        quantidade_parcelas: parseInt(formData.quantidade_parcelas)
      };

      const result = await window.electronAPI.invoke('create-acordo', acordoData);
      
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Erro ao criar acordo');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Criar Novo Acordo</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* debug removido */}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Autocomplete
              options={pessoas}
              getOptionLabel={(option) => `${option.nome_completo} ${option.cpf ? `(CPF: ${option.cpf})` : ''}`}
              value={pessoaSelecionada}
              onChange={handlePessoaChange}
              onInputChange={(event, newInputValue) => {
                carregarPessoas(newInputValue);
              }}
              noOptionsText="Nenhuma pessoa encontrada. Digite pelo menos 2 caracteres para buscar."
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box>
                    <Typography variant="body1">{option.nome_completo}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {option.cpf && `CPF: ${option.cpf}`}
                      {/* Verificar vínculo ativo de forma mais flexível */}
                      {(option.status === 'Ativo' || option.vinculos) && option.nome_bloco && option.numero_apartamento 
                        ? ` • ${option.nome_bloco} - Apto ${option.numero_apartamento}`
                        : ' • Sem vínculo ativo'
                      }
                    </Typography>
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Pessoa *"
                  fullWidth
                  placeholder="Digite o nome ou CPF da pessoa"
                  helperText={pessoas.length > 0 ? `${pessoas.length} pessoas encontradas` : 'Digite nome ou CPF para buscar'}
                />
              )}
            />
          </Grid>

          {unidadeInfo && (
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Unidade: {unidadeInfo}
                </Typography>
              </Box>
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              label="Descrição do Acordo *"
              fullWidth
              multiline
              rows={2}
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Valor Total *"
              fullWidth
              type="number"
              inputProps={{ step: "0.01", min: "0" }}
              value={formData.valor_total}
              onChange={(e) => handleInputChange('valor_total', e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Valor da Entrada"
              fullWidth
              type="number"
              inputProps={{ step: "0.01", min: "0" }}
              value={formData.valor_entrada}
              onChange={(e) => handleInputChange('valor_entrada', e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Quantidade de Parcelas *"
              fullWidth
              type="number"
              inputProps={{ min: "1" }}
              value={formData.quantidade_parcelas}
              onChange={(e) => handleInputChange('quantidade_parcelas', e.target.value)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Data do Acordo"
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formData.data_acordo}
              onChange={(e) => handleInputChange('data_acordo', e.target.value)}
            />
          </Grid>

          {formData.valor_total && formData.quantidade_parcelas && (
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Resumo:</strong>
                </Typography>
                <Typography variant="body2">
                  Valor Total: R$ {parseFloat(formData.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body2">
                  Entrada: R$ {parseFloat(formData.valor_entrada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body2">
                  Valor por Parcela: R$ {calcularValorParcela().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Criando...' : 'Criar Acordo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CriarAcordoModal;