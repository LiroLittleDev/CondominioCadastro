import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, Autocomplete, Typography, Box, Alert, Switch, FormControlLabel, Stack,
  Avatar, Chip
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
  const [customParcelas, setCustomParcelas] = useState(false);
  const [parcelasDetail, setParcelasDetail] = useState([]); // [{ numero_parcela, valor_parcela, data_vencimento }]
  const [pessoas, setPessoas] = useState([]);
  const [pessoaSelecionada, setPessoaSelecionada] = useState(null);
  const [unidadeInfo, setUnidadeInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  const contentRef = useRef(null);
  const parcelAreaRef = useRef(null);

  useEffect(() => {
    if (open) {
      carregarPessoas();
      resetForm();
    }
  }, [open]);

  // quando error é setado, rola o modal para cima para mostrar o Alert
  useEffect(() => {
    if (error && contentRef.current) {
      // scroll to top of DialogContent
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error]);

  const calcularValorParcela = useCallback(() => {
    const valorTotal = parseFloat(formData.valor_total) || 0;
    const valorEntrada = parseFloat(formData.valor_entrada) || 0;
    const quantidadeParcelas = parseInt(formData.quantidade_parcelas) || 1;

    const valorParcelado = valorTotal - valorEntrada;
    return quantidadeParcelas ? (valorParcelado / quantidadeParcelas) : 0;
  }, [formData.valor_total, formData.valor_entrada, formData.quantidade_parcelas]);

  useEffect(() => {
    // rebuild parcelasDetail when quantidade_parcelas or data_acordo change and customParcelas is off
    const qty = parseInt(formData.quantidade_parcelas) || 0;
    if (!customParcelas && qty > 0) {
      const vals = [];
      const base = formData.data_acordo || new Date().toISOString().split('T')[0];
      for (let i = 1; i <= qty; i++) {
        const dataV = new Date(base);
        dataV.setMonth(dataV.getMonth() + i);
        const yyyy = dataV.getFullYear();
        const mm = String(dataV.getMonth() + 1).padStart(2, '0');
        const dd = String(dataV.getDate()).padStart(2, '0');
  vals.push({ numero_parcela: i, valor_parcela: calcularValorParcela().toFixed(2), data_vencimento: `${yyyy}-${mm}-${dd}` });
      }
      setParcelasDetail(vals);
    }
  }, [formData.quantidade_parcelas, formData.data_acordo, customParcelas, calcularValorParcela]);

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
    setCustomParcelas(false);
    setParcelasDetail([]);
  };

  const handleClose = () => {
    // reset custom parcels when closing
    resetForm();
    onClose();
  };

  const handlePessoaChange = (event, newValue) => {
    // Pessoa selecionada no Autocomplete. Log de debug removido.
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


  const handleCustomToggle = (value) => {
    setCustomParcelas(value);
    // if turning on, ensure parcelasDetail has entries
    const qty = parseInt(formData.quantidade_parcelas) || 0;
    if (value && qty > 0 && parcelasDetail.length !== qty) {
      const vals = [];
      const base = formData.data_acordo || new Date().toISOString().split('T')[0];
      for (let i = 1; i <= qty; i++) {
        const dataV = new Date(base);
        dataV.setMonth(dataV.getMonth() + i);
        const yyyy = dataV.getFullYear();
        const mm = String(dataV.getMonth() + 1).padStart(2, '0');
        const dd = String(dataV.getDate()).padStart(2, '0');
  vals.push({ numero_parcela: i, valor_parcela: calcularValorParcela().toFixed(2), data_vencimento: `${yyyy}-${mm}-${dd}` });
      }
      setParcelasDetail(vals);
    }
    // se abriu a área de parcelas, rola para ela para ser visível
    if (value && parcelAreaRef.current) {
      setTimeout(() => {
        try {
          parcelAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {
          // fallback: scroll DialogContent to top
          if (contentRef.current) contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 120);
    }
  };

  const updateParcelaDetail = (index, field, value) => {
    setParcelasDetail(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const somaParcelas = () => parcelasDetail.reduce((s, p) => s + (parseFloat(p.valor_parcela) || 0), 0);
  const esperado = () => (parseFloat(formData.valor_total || 0) - (parseFloat(formData.valor_entrada) || 0));

  const distribuirDiferenca = () => {
    const total = somaParcelas();
    const diff = esperado() - total;
    if (Math.abs(diff) < 0.005) return; // nada a fazer
    const qtd = parcelasDetail.length;
    const per = diff / qtd;
    setParcelasDetail(prev => prev.map(p => ({ ...p, valor_parcela: ((parseFloat(p.valor_parcela) || 0) + per).toFixed(2) })));
  };

  const ajustarUltima = () => {
    const total = somaParcelas();
    const diff = esperado() - total;
    if (Math.abs(diff) < 0.005) return;
    setParcelasDetail(prev => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      copy[copy.length - 1] = { ...last, valor_parcela: ((parseFloat(last.valor_parcela) || 0) + diff).toFixed(2) };
      return copy;
    });
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
      if (customParcelas && parcelasDetail && parcelasDetail.length > 0) {
        // validate sum
        const somaParcelas = parcelasDetail.reduce((s, p) => s + (parseFloat(p.valor_parcela) || 0), 0);
        const esperado = valorTotal - valorEntrada;
        if (Math.abs(somaParcelas - esperado) > 0.01) {
          setError('Soma das parcelas diferentes do valor restante (valor total - entrada). Ajuste os valores.');
          setLoading(false);
          return;
        }
        acordoData.parcelas = parcelasDetail.map(p => ({ numero_parcela: p.numero_parcela, valor_parcela: parseFloat(p.valor_parcela || 0), data_vencimento: p.data_vencimento }));
      }

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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Criar Novo Acordo</DialogTitle>
      <DialogContent ref={contentRef} dividers>
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

          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={customParcelas} onChange={(e) => handleCustomToggle(e.target.checked)} />}
              label="Valores por parcela personalizados"
            />
          </Grid>

          {/* Mostrar área de parcelas personalizadas logo abaixo do switch para maior visibilidade */}
          {customParcelas && (
            <Grid item xs={12} ref={parcelAreaRef}>
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'grey.100', border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Box>
                      <Typography variant="subtitle2">Parcelas personalizadas</Typography>
                      {/* pessoa destacada com Chip + Avatar */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          avatar={<Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}>{pessoaSelecionada ? (pessoaSelecionada.nome_completo || '').split(' ').map(n=>n[0]).slice(0,2).join('') : '?'}</Avatar>}
                          label={<Typography variant="body2" sx={{ fontWeight: 700 }}>{pessoaSelecionada ? pessoaSelecionada.nome_completo : 'Pessoa não selecionada'}</Typography>}
                          variant="outlined"
                        />
                      </Box>
                      {unidadeInfo && <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>{unidadeInfo}</Typography>}
                      {pessoaSelecionada?.cpf && <Typography variant="caption" color="textSecondary">CPF: {pessoaSelecionada.cpf}</Typography>}
                    </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" display="block">Entrada: <strong>R$ {parseFloat(formData.valor_entrada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography>
                    <Typography variant="caption">Soma: R$ {somaParcelas().toFixed(2)}</Typography>
                    <Typography variant="caption" display="block">Esperado: <Typography component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>R$ {esperado().toFixed(2)}</Typography></Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: Math.abs(somaParcelas() - esperado()) > 0.01 ? 'error.main' : 'text.secondary' }}>Diferença: R$ {(somaParcelas() - esperado()).toFixed(2)}</Typography>
                  </Box>
                </Stack>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Button size="small" onClick={distribuirDiferenca}>Distribuir diferença</Button>
                  <Button size="small" onClick={ajustarUltima}>Ajustar última</Button>
                </Box>
                {parcelasDetail && parcelasDetail.length > 0 ? (
                  <Grid container spacing={1}>
                    {parcelasDetail.map((p, idx) => (
                      <React.Fragment key={idx}>
                        <Grid item xs={2}>
                          <TextField label="#" value={p.numero_parcela} InputProps={{ readOnly: true }} fullWidth />
                        </Grid>
                        <Grid item xs={5}>
                          <TextField label="Valor da Parcela" type="number" inputProps={{ step: '0.01' }} value={p.valor_parcela} onChange={(e) => updateParcelaDetail(idx, 'valor_parcela', e.target.value)} fullWidth />
                        </Grid>
                        <Grid item xs={5}>
                          <TextField label="Vencimento" type="date" value={p.data_vencimento} onChange={(e) => updateParcelaDetail(idx, 'data_vencimento', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                        </Grid>
                      </React.Fragment>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="textSecondary">Nenhuma parcela gerada ainda. Preencha quantidade de parcelas e/ou verifique os valores para gerar parcelas automaticamente.</Typography>
                )}
              </Box>
            </Grid>
          )}

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

          {formData.valor_total && (
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Resumo:</strong>
                </Typography>
                <Typography variant="body2">
                  Valor Total: R$ {parseFloat(formData.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body2">
                  Entrada: R$ {parseFloat(formData.valor_entrada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body2">
                  Valor por Parcela: R$ {calcularValorParcela().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Grid>
          )}

          
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
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