import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, Button, FormControl, InputLabel, Select, MenuItem, Grid, CircularProgress, Alert } from '@mui/material';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

function TransferirPessoaModal({ open, handleClose, pessoa, vinculoAtivo, onSuccess }) {
  const isTransferencia = !!vinculoAtivo;

  const [blocos, setBlocos] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [unidades, setUnidades] = useState([]);

  const [selectedBloco, setSelectedBloco] = useState('');
  const [selectedEntrada, setSelectedEntrada] = useState('');
  const [selectedUnidade, setSelectedUnidade] = useState('');
  const [newTipoVinculo, setNewTipoVinculo] = useState('');

  const [loading, setLoading] = useState(false); // Este é o estado do aviso
  const [loadingEntradas, setLoadingEntradas] = useState(false);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedBloco('');
      setEntradas([]);
      setUnidades([]);
      setSelectedEntrada('');
      setSelectedUnidade('');
      setNewTipoVinculo('');
      setError('');
      window.api.getBlocos().then(setBlocos);
    }
  }, [open]);

  useEffect(() => {
    if (selectedBloco) {
      setLoadingEntradas(true);
      setSelectedEntrada('');
      setUnidades([]);
      window.api.getEntradas(selectedBloco).then(data => {
        setEntradas(data);
        setLoadingEntradas(false);
      });
    }
  }, [selectedBloco]);

  useEffect(() => {
    if (selectedEntrada) {
      setLoadingUnidades(true);
      setSelectedUnidade('');
      window.api.getUnidades(selectedEntrada).then(data => {
        setUnidades(data);
        setLoadingUnidades(false);
      });
    }
  }, [selectedEntrada]);

  const handleSubmit = async () => {
    if (!selectedUnidade || !newTipoVinculo) {
      setError('Todos os campos de destino são obrigatórios.');
      return;
    }
    setLoading(true); // <-- AQUI USAMOS O setLoading
    setError('');

    let result;
    if (isTransferencia) {
      const transferData = {
        pessoaId: pessoa.id,
        oldVinculoId: vinculoAtivo.id,
        newUnitId: selectedUnidade,
        newTipoVinculo: newTipoVinculo
      };
      result = await window.api.transferirPessoa(transferData);
    } else {
      const vinculoData = {
        pessoaId: pessoa.id,
        unidadeId: selectedUnidade,
        tipoVinculo: newTipoVinculo
      };
      result = await window.api.createVinculo(vinculoData);
    }
    
    setLoading(false); // <-- E AQUI TAMBÉM
    if (result.success) {
      onSuccess();
    } else {
      setError(result.message);
    }
  };

  if (!pessoa) return null;

  const LoadingMenuItem = () => (
    <MenuItem disabled>
      <CircularProgress size={20} sx={{ margin: 'auto' }} />
    </MenuItem>
  );

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" gutterBottom>
          {isTransferencia ? `Transferir ${pessoa.nome_completo}` : `Vincular ${pessoa.nome_completo} a uma Unidade`}
        </Typography>
        
        {isTransferencia && (
          <Typography sx={{ mt: 2 }} color="text.secondary">
            **De:** {vinculoAtivo.nome_bloco} - Apto {vinculoAtivo.numero_apartamento}
          </Typography>
        )}

        <Typography sx={{ mt: 2, mb: 2 }} variant="subtitle1" fontWeight="bold">Para:</Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>1. Selecione o Bloco</InputLabel>
              <Select value={selectedBloco} label="1. Selecione o Bloco" onChange={e => setSelectedBloco(e.target.value)}>
                {blocos.map(bloco => <MenuItem key={bloco.id} value={bloco.id}>{bloco.nome}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth disabled={!selectedBloco || loadingEntradas}>
              <InputLabel>2. Selecione a Entrada</InputLabel>
              <Select value={selectedEntrada} label="2. Selecione a Entrada" onChange={e => setSelectedEntrada(e.target.value)}>
                {/* --- MELHORIA 3: Exibição condicional do loading --- */}
                {loadingEntradas ? <LoadingMenuItem /> : entradas.map(entrada => <MenuItem key={entrada.id} value={entrada.id}>Entrada {entrada.letra}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth disabled={!selectedEntrada || loadingUnidades}>
              <InputLabel>3. Selecione o Apartamento</InputLabel>
              <Select value={selectedUnidade} label="3. Selecione o Apartamento" onChange={e => setSelectedUnidade(e.target.value)}>
                {loadingUnidades ? <LoadingMenuItem /> : unidades.map(unidade => <MenuItem key={unidade.id} value={unidade.id}>Apto {unidade.numero_apartamento}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
             <FormControl fullWidth margin="large" required>
              <InputLabel>4. Nova Categoria</InputLabel>
              <Select value={newTipoVinculo} label="4. Nova Categoria" onChange={e => setNewTipoVinculo(e.target.value)}>
                <MenuItem value="Proprietário">Proprietário</MenuItem>
                <MenuItem value="Proprietário Morador">Proprietário Morador</MenuItem>
                <MenuItem value="Inquilino">Inquilino</MenuItem>
                <MenuItem value="Morador">Morador</MenuItem>
                <MenuItem value="Morador Temporário">Morador Temporário</MenuItem>
                <MenuItem value="Responsável">Responsável</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button variant="contained" sx={{ ml: 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (isTransferencia ? 'Confirmar Transferência' : 'Vincular')}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default TransferirPessoaModal;