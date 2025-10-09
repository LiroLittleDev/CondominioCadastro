import React, { useState, useEffect, useCallback } from 'react';
import { formatDate } from '../utils/date';
import { 
  Typography, Box, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, IconButton, Chip, TextField, FormControl,
  InputLabel, Select, MenuItem, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Alert,
  Stack, InputAdornment, CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CalculateIcon from '@mui/icons-material/Calculate';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';

function MovimentacoesPage() {
  const navigate = useNavigate();
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [editModal, setEditModal] = useState({ open: false, movimentacao: null });
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, movimentacao: null });
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newModalTipo, setNewModalTipo] = useState('ENTRADA');
  const [modalProdutos, setModalProdutos] = useState([]);
  const [modalForm, setModalForm] = useState({ produto_id: '', quantidade: '', responsavel: '' });
  const [modalCurrentStock, setModalCurrentStock] = useState(null);
  const [modalUnidade, setModalUnidade] = useState('');
  // estoque mínimo removido da exibição conforme solicitado
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const quantidadeRef = React.useRef(null);
  const modalSubmittingRef = React.useRef(false);
  const modalRequestIdRef = React.useRef(null);
  const inflightRequestsRef = React.useRef(new Set());
  const completedRequestsRef = React.useRef(new Set());
  const createdSignaturesRef = React.useRef(new Set());
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    tipo: '',
    produto: ''
  });

  const fetchMovimentacoes = useCallback(async () => {
    try {
      const data = await window.api.getMovimentacoes(filtros);
      setMovimentacoes(data);
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
    }
  }, [filtros]);

  useEffect(() => {
    fetchMovimentacoes();
  }, [fetchMovimentacoes]);

  const getTipoColor = (tipo) => {
    return tipo === 'ENTRADA' ? 'success' : 'error';
  };

  const getTipoIcon = (tipo) => {
    return tipo === 'ENTRADA' ? <AddIcon /> : <RemoveIcon />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/estoque')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Movimentações de Estoque
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={async () => {
              setNewModalTipo('ENTRADA');
              setModalError('');
              setModalSuccess('');
              setModalForm({ produto_id: '', quantidade: '', responsavel: '' });
              setModalCurrentStock(null);
              // gerar idempotency token para este modal
              modalRequestIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
              try {
                const data = await window.api.getProdutos();
                setModalProdutos(data);
              } catch (err) {
                console.error('Erro ao carregar produtos para modal:', err);
                setModalProdutos([]);
              }
              setNewModalOpen(true);
            }}
            sx={{ mr: 1 }}
          >
            Nova Entrada
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<RemoveIcon />}
            onClick={async () => {
              setNewModalTipo('SAIDA');
              setModalError('');
              setModalSuccess('');
              setModalForm({ produto_id: '', quantidade: '', responsavel: '' });
              setModalCurrentStock(null);
              // gerar idempotency token para este modal
              modalRequestIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
              try {
                const data = await window.api.getProdutos();
                setModalProdutos(data);
              } catch (err) {
                console.error('Erro ao carregar produtos para modal:', err);
                setModalProdutos([]);
              }
              setNewModalOpen(true);
            }}
          >
            Nova Saída
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Data Início"
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Data Fim"
              type="date"
              value={filtros.dataFim}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filtros.tipo}
                label="Tipo"
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="ENTRADA">Entrada</MenuItem>
                <MenuItem value="SAIDA">Saída</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabela de Movimentações */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Data</TableCell>
              <TableCell align="center">Tipo</TableCell>
              <TableCell align="center">Produto</TableCell>
              <TableCell align="center">Quantidade</TableCell>
              <TableCell align="center">Responsável</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movimentacoes.map((mov) => (
              <TableRow key={mov.id}>
                <TableCell align="center">
                  {formatDate(mov.data_movimentacao)}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Chip 
                      icon={getTipoIcon(mov.tipo)}
                      label={mov.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                      color={getTipoColor(mov.tipo)}
                      size="small"
                    />
                  </Box>
                </TableCell>
                <TableCell align="center">{mov.produto_nome}</TableCell>
                <TableCell align="center">
                  {mov.quantidade} {mov.unidade_medida}
                </TableCell>
                <TableCell align="center">{mov.responsavel}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => { setEditModal({ open: true, movimentacao: mov }); setError(''); }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteModal({ open: true, movimentacao: mov })}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteModal.open} onClose={() => setDeleteModal({ open: false, movimentacao: null })}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>Esta ação não pode ser desfeita!</Alert>
          <Typography>Tem certeza que deseja excluir a movimentação de {deleteModal.movimentacao?.quantidade} {deleteModal.movimentacao?.unidade_medida} ({deleteModal.movimentacao?.tipo})?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModal({ open: false, movimentacao: null })}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={async () => {
            try {
              const res = await window.api.deleteMovimentacao(deleteModal.movimentacao.id);
              if (res.success) {
                setDeleteModal({ open: false, movimentacao: null });
                fetchMovimentacoes();
              } else {
                setError(res.message);
              }
            } catch (err) {
              console.error(err);
              setError('Erro ao excluir movimentação');
            }
          }}>Excluir</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de edição */}
      <Dialog open={editModal.open} onClose={() => setEditModal({ open: false, movimentacao: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Movimentação</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {editModal.movimentacao && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      value={editModal.movimentacao.tipo}
                      label="Tipo"
                      onChange={(e) => setEditModal({ ...editModal, movimentacao: { ...editModal.movimentacao, tipo: e.target.value } })}
                    >
                      <MenuItem value="ENTRADA">Entrada</MenuItem>
                      <MenuItem value="SAIDA">Saída</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Quantidade"
                    type="number"
                    value={editModal.movimentacao.quantidade}
                    onChange={(e) => setEditModal({ ...editModal, movimentacao: { ...editModal.movimentacao, quantidade: parseInt(e.target.value, 10) || 0 } })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalculateIcon color={editModal.movimentacao.tipo === 'ENTRADA' ? 'success' : 'error'} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Responsável"
                    value={editModal.movimentacao.responsavel || ''}
                    onChange={(e) => setEditModal({ ...editModal, movimentacao: { ...editModal.movimentacao, responsavel: e.target.value } })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color={editModal.movimentacao.tipo === 'ENTRADA' ? 'success' : 'error'} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                {/* campo 'motivo' removido conforme solicitado */}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModal({ open: false, movimentacao: null })}>Cancelar</Button>
          <Button variant="contained" onClick={async () => {
            try {
              const mov = editModal.movimentacao;
              const toUpdate = {
                tipo: mov.tipo,
                quantidade: mov.quantidade,
                responsavel: mov.responsavel,
                data_movimentacao: mov.data_movimentacao
              };
              const res = await window.api.updateMovimentacao(mov.id, toUpdate);
              if (res.success) {
                setEditModal({ open: false, movimentacao: null });
                fetchMovimentacoes();
              } else {
                setError(res.message);
              }
            } catch (err) {
              console.error(err);
              setError('Erro ao atualizar movimentação');
            }
          }}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de nova entrada/saída */}
  <Dialog open={newModalOpen} onClose={() => { if (!modalLoading && !modalSubmittingRef.current) setNewModalOpen(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {newModalTipo === 'ENTRADA' ? <AddIcon color="success" /> : <RemoveIcon color="error" />}
            <span>{newModalTipo === 'ENTRADA' ? 'Nova Entrada' : 'Nova Saída'}</span>
          </Box>
        </DialogTitle>
        <DialogContent>
          {modalError && <Alert severity="error" sx={{ mb: 2 }}>{modalError}</Alert>}
          {modalSuccess && <Alert severity="success" sx={{ mb: 2 }}>{modalSuccess}</Alert>}

          <Box sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Autocomplete
                  options={modalProdutos}
                  getOptionLabel={(option) => option.nome || option.codigo || ''}
                  value={modalProdutos.find(p => p.id === modalForm.produto_id) || null}
                  onChange={(e, newVal) => {
                    if (newVal) {
                      setModalForm({ ...modalForm, produto_id: newVal.id });
                      setModalCurrentStock(newVal.estoque_atual ?? null);
                      setModalUnidade(newVal.unidade_medida || '');
                    } else {
                      setModalForm({ ...modalForm, produto_id: '' });
                      setModalCurrentStock(null);
                      setModalUnidade('');
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Produto"
                      fullWidth
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon color={newModalTipo === 'ENTRADA' ? 'success' : 'error'} />
                          </InputAdornment>
                        )
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quantidade"
                  type="number"
                  inputRef={quantidadeRef}
                  value={modalForm.quantidade}
                  onChange={(e) => setModalForm({ ...modalForm, quantidade: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalculateIcon color={newModalTipo === 'ENTRADA' ? 'success' : 'error'} />
                      </InputAdornment>
                    ),
                    endAdornment: modalUnidade ? (<InputAdornment position="end">{modalUnidade}</InputAdornment>) : null
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Responsável"
                  value={modalForm.responsavel}
                  onChange={(e) => setModalForm({ ...modalForm, responsavel: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color={newModalTipo === 'ENTRADA' ? 'success' : 'error'} />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              {modalCurrentStock != null && (
                <Grid item xs={12}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Chip
                      icon={newModalTipo === 'ENTRADA' ? <AddIcon /> : <RemoveIcon />}
                      label={`Estoque atual: ${modalCurrentStock}`}
                      color={newModalTipo === 'ENTRADA' ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </Stack>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { if (!modalLoading && !modalSubmittingRef.current) setNewModalOpen(false); }} disabled={modalLoading || modalSubmittingRef.current}>Cancelar</Button>
          {!modalSubmittingRef.current && !modalLoading ? (
            <Button
              variant="contained"
              color={newModalTipo === 'ENTRADA' ? 'success' : 'error'}
              startIcon={newModalTipo === 'ENTRADA' ? <AddIcon /> : <RemoveIcon />}
              onClick={async (e) => {
                // tenta evitar múltiplos handlers/propagações
                try {
                  if (e && e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
                    e.nativeEvent.stopImmediatePropagation();
                  }
                } catch (err) {
                  // ignore
                }

                if (modalSubmittingRef.current) return;
                modalSubmittingRef.current = true;
                setModalLoading(true);

                try {
                  setModalError('');
                  setModalSuccess('');

                  if (!modalForm.produto_id || !modalForm.quantidade || !modalForm.responsavel) {
                    setModalError('Produto, quantidade e responsável são obrigatórios');
                    return;
                  }

                  const quantidadeInt = parseInt(modalForm.quantidade, 10);
                  if (newModalTipo === 'SAIDA' && modalCurrentStock != null && quantidadeInt > modalCurrentStock) {
                    setModalError('Quantidade solicitada maior que o estoque atual');
                    return;
                  }

                  const requestId = modalRequestIdRef.current || `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;

                  // assinatura do payload para evitar duplicações (cliente)
                  const signature = `${requestId}:${modalForm.produto_id}:${newModalTipo}:${quantidadeInt}:${modalForm.responsavel}`;

                  // se já completamos essa assinatura, não enviar novamente
                  if (createdSignaturesRef.current.has(signature) || completedRequestsRef.current.has(requestId)) {
                    return;
                  }

                  // se já está em andamento, ignora
                  if (inflightRequestsRef.current.has(requestId)) {
                    return;
                  }

                  // marca como in-flight e registra assinatura imediatamente para evitar reenvios
                  inflightRequestsRef.current.add(requestId);
                  createdSignaturesRef.current.add(signature);

                  // não enviar client_token no payload (banco não tem essa coluna)
                  const mov = { produto_id: modalForm.produto_id, tipo: newModalTipo, quantidade: quantidadeInt, responsavel: modalForm.responsavel };
                  const res = await window.api.createMovimentacao(mov);
                  // marca como completado só depois da resposta
                  completedRequestsRef.current.add(requestId);
                  inflightRequestsRef.current.delete(requestId);
                  if (res.success) {
                    // fechar modal imediatamente para feedback rápido
                    setNewModalOpen(false);
                    fetchMovimentacoes();
                  } else {
                    setModalError(res.message);
                  }
                } catch (err) {
                  console.error(err);
                  setModalError('Erro ao registrar movimentação');
                } finally {
                  modalSubmittingRef.current = false;
                  setModalLoading(false);
                }
              }}
            >
              Registrar
            </Button>
          ) : (
            <Button variant="contained" disabled startIcon={<CircularProgress size={20} color="inherit" />}>Registrando...</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MovimentacoesPage;