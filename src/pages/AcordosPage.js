import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import { formatDate as utilFormatDate } from '../utils/date';
import AnimatedNumber from '../components/AnimatedNumber';
import {
  Box, Typography, Card, CardContent, Grid, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
  Drawer, TextField, LinearProgress, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Avatar, Snackbar, Alert, CircularProgress, Tabs, Tab, Badge
} from '@mui/material';
import { Add, Visibility, AttachMoney, Assignment, Schedule, CheckCircle, Payment, Close, Archive, Unarchive, Undo, Delete } from '@mui/icons-material';
import CriarAcordoModal from '../components/CriarAcordoModal';
import ConfirmDialog from '../components/ConfirmDialog';

const AcordosPage = () => {
  const [acordos, setAcordos] = useState([]);
  const [acordosAtivos, setAcordosAtivos] = useState([]);
  const [acordosFinalizados, setAcordosFinalizados] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('ativos');
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [acordoSelecionado, setAcordoSelecionado] = useState(null);
  const [parcelas, setParcelas] = useState([]);
  const drawerScrollRef = useRef(null);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [dateDialogParcela, setDateDialogParcela] = useState(null);
  const [dateDialogValue, setDateDialogValue] = useState(new Date().toISOString().split('T')[0]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [loadingParcelaId, setLoadingParcelaId] = useState(null);
  // Dialog states para confirmações customizadas
  const [confirmArquivarOpen, setConfirmArquivarOpen] = useState(false);
  const [confirmDesarquivarOpen, setConfirmDesarquivarOpen] = useState(false);
  const [confirmDesmarcarOpen, setConfirmDesmarcarOpen] = useState(false);
  const [confirmMarcarOpen, setConfirmMarcarOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteAcordo, setPendingDeleteAcordo] = useState(null);
  const [deleteCountdowns, setDeleteCountdowns] = useState({});
  const deleteTimersRef = useRef({});
  const [pendingActionAcordo, setPendingActionAcordo] = useState(null);
  const [pendingActionParcela, setPendingActionParcela] = useState(null);
  const theme = useTheme();

  // usar util centralizada de datas
  const formatDate = utilFormatDate;

  // Estado para suportar Undo (rollback) de marcação de parcela
  const [undoMeta, setUndoMeta] = useState(null); // { parcelaId, prevParcela }

  const carregarDados = useCallback(async () => {
    try {
      const [ativos, finalizados, statsData] = await Promise.all([
        // Solicitar explicitamente apenas acordos ativos
        window.electronAPI.invoke('get-acordos', { status: 'Ativo' }),
        window.electronAPI.invoke('get-acordos', { status: 'Quitado' }),
        window.electronAPI.invoke('get-acordos-stats')
      ]);
      setAcordosAtivos(ativos || []);
      setAcordosFinalizados(finalizados || []);
      setStats(statsData);
      setAcordos(activeTab === 'ativos' ? (ativos || []) : (finalizados || []));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }, [activeTab]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    // Registrar listener enviado pelo main quando dados mudam
    if (window.api && typeof window.api.onDataChanged === 'function') {
      const unsubscribe = window.api.onDataChanged(async () => {
        try {
          await carregarDados();
          // Se o drawer estiver aberto e um acordo selecionado, recarregar detalhes
          if (drawerOpen && acordoSelecionado && acordoSelecionado.id) {
            const detalhes = await window.electronAPI.invoke('get-acordo-details', acordoSelecionado.id);
            setAcordoSelecionado(detalhes.acordo);
            setParcelas(detalhes.parcelas);
          }
        } catch (e) {
          console.error('Erro ao processar data-changed:', e);
        }
      });

      return () => {
        try { if (typeof unsubscribe === 'function') unsubscribe(); } catch (e) { /* ignore */ }
      };
    }
  }, [carregarDados, drawerOpen, acordoSelecionado]);

  useEffect(() => {
    // Atualizar view quando trocar de aba
    setAcordos(activeTab === 'ativos' ? acordosAtivos : acordosFinalizados);
  }, [activeTab, acordosAtivos, acordosFinalizados]);

  useEffect(() => {
    if (drawerOpen && drawerScrollRef.current) {
      // Garantir que o scroll interno comece no topo ao abrir o drawer
      setTimeout(() => {
        try { drawerScrollRef.current.scrollTop = 0; } catch (e) { /* ignore */ }
      }, 0);
    }
  }, [drawerOpen]);

  // Estatísticas rápidas das parcelas (para o resumo)
  const totalParcelas = parcelas.length;
  const pagasCount = parcelas.filter(p => p.status_parcela === 'Pago').length;
  const pendentesCount = parcelas.filter(p => p.status_parcela === 'Pendente').length;
  const atrasadasCount = parcelas.filter(p => p.status_parcela === 'Pendente' && new Date(p.data_vencimento) < new Date()).length;
  const percentPago = totalParcelas ? Math.round((pagasCount / totalParcelas) * 100) : 0;
  // const somaParcelas = parcelas.reduce((s, p) => s + (parseFloat(p.valor_parcela) || 0), 0);
  const entradaValor = acordoSelecionado ? (parseFloat(acordoSelecionado.valor_entrada || 0)) : 0;
  const esperadoValor = acordoSelecionado ? (parseFloat(acordoSelecionado.valor_total || 0) - entradaValor) : 0;

  // carregarDados é definido acima usando useCallback

  const abrirDetalhes = async (acordo) => {
    try {
      const detalhes = await window.electronAPI.invoke('get-acordo-details', acordo.id);
      setAcordoSelecionado(detalhes.acordo);
      setParcelas(detalhes.parcelas);
      setDrawerOpen(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    }
  };

  const closeDeleteDialog = () => {
    // limpar timer do acordo selecionado (se houver)
    try {
      const id = pendingDeleteAcordo?.id;
      if (id && deleteTimersRef.current[id]) {
        clearInterval(deleteTimersRef.current[id]);
        deleteTimersRef.current[id] = null;
      }
      if (id) {
        setDeleteCountdowns(prev => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      }
    } catch (e) { /* ignore */ }
    setConfirmDeleteOpen(false);
    setPendingDeleteAcordo(null);
  };

  const marcarParcela = async (parcelaId, dataPagamento) => {
    try {
      setLoadingParcelaId(parcelaId);
      // guardar estado anterior para possível rollback
      const prevParcela = parcelas.find(p => p.id === parcelaId);
      setUndoMeta({ parcelaId, prevParcela });

      const result = await window.electronAPI.invoke('marcar-parcela-paga', parcelaId, dataPagamento);
      if (result.success) {
        const detalhes = await window.electronAPI.invoke('get-acordo-details', acordoSelecionado.id);
        setParcelas(detalhes.parcelas);
        carregarDados();
        if (result.acordoQuitado) {
          setSnackbarSeverity('success');
          setSnackbarMsg('Parcela marcada como paga. Acordo quitado!');
        } else {
          setSnackbarSeverity('success');
          setSnackbarMsg('Parcela marcada como paga com sucesso.');
        }
        setSnackbarOpen(true);
      } else {
        setSnackbarSeverity('error');
        setSnackbarMsg(result.message || 'Erro ao marcar parcela');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Erro ao marcar parcela:', error);
      setSnackbarSeverity('error');
      setSnackbarMsg(error && error.message ? error.message : 'Erro ao marcar parcela');
      setSnackbarOpen(true);
    }
    finally {
      setLoadingParcelaId(null);
    }
  };

  const handleUndoSnackbar = async () => {
    if (!undoMeta || !undoMeta.parcelaId) return;
    const parcelaId = undoMeta.parcelaId;
    try {
      setLoadingParcelaId(parcelaId);
      const res = await window.electronAPI.invoke('desmarcar-parcela-paga', parcelaId);
      if (res.success) {
        // recarregar detalhes do acordo
        const detalhes = await window.electronAPI.invoke('get-acordo-details', acordoSelecionado.id);
        setParcelas(detalhes.parcelas);
        carregarDados();
        setSnackbarSeverity('info');
        setSnackbarMsg('Marcação desfeita');
        setSnackbarOpen(true);
      } else {
        setSnackbarSeverity('error');
        setSnackbarMsg(res.message || 'Erro ao desfazer marcação');
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.error('Erro ao desfazer marcação:', err);
      setSnackbarSeverity('error');
      setSnackbarMsg('Erro ao desfazer marcação');
      setSnackbarOpen(true);
    } finally {
      setLoadingParcelaId(null);
      setUndoMeta(null);
    }
  };

  const confirmarMarcarParcela = async (parcela) => {
    // Confirmar ação e usar data atual como padrão
    // abrir dialog customizado
    setPendingActionParcela(parcela);
    setConfirmMarcarOpen(true);
  };

  const openDateDialog = (parcela) => {
    setDateDialogParcela(parcela);
    // sugerir hoje por padrão
    setDateDialogValue(new Date().toISOString().split('T')[0]);
    setDateDialogOpen(true);
  };

  const closeDateDialog = () => {
    setDateDialogOpen(false);
    setDateDialogParcela(null);
  };

  const confirmDateDialog = async () => {
    if (!dateDialogParcela || !dateDialogValue) return;
    await marcarParcela(dateDialogParcela.id, dateDialogValue);
    closeDateDialog();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ativo': return 'primary';
      case 'Quitado': return 'success';
      case 'Cancelado': return 'error';
      default: return 'default';
    }
  };

  const getParcelaColor = (status) => {
    switch (status) {
      case 'Pago': return 'success';
      case 'Pendente': return 'warning';
      case 'Atrasado': return 'error';
      default: return 'default';
    }
  };

  // inicia contagem regressiva de 5s para habilitar exclusão
  const startDeleteCountdown = (acordoId) => {
    if (deleteTimersRef.current[acordoId]) return; // já rodando
    setDeleteCountdowns(prev => ({ ...prev, [acordoId]: 5 }));
    deleteTimersRef.current[acordoId] = setInterval(() => {
      setDeleteCountdowns(prev => {
        const current = prev[acordoId] ?? 0;
        if (current <= 1) {
          // finalizar contagem
          try { clearInterval(deleteTimersRef.current[acordoId]); } catch (e) {}
          deleteTimersRef.current[acordoId] = null;
          return { ...prev, [acordoId]: 0 };
        }
        return { ...prev, [acordoId]: current - 1 };
      });
    }, 1000);
  };

  // limpar timers ao desmontar
  useEffect(() => {
    return () => {
      Object.values(deleteTimersRef.current).forEach(t => { try { if (t) clearInterval(t); } catch (e) {} });
      deleteTimersRef.current = {};
    };
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Acordos de Pagamento
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setModalOpen(true)}
        >
          Novo Acordo
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', transition: 'box-shadow 0.18s', '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' } }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 56, height: 56, mr: 2 }}>
                  <Assignment sx={{ color: 'white' }} />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" variant="caption" gutterBottom>
                    Total de Acordos
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    <AnimatedNumber value={stats.totalAcordos || 0} format={v => v} />
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Atualizado agora</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', transition: 'box-shadow 0.18s', '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' } }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Avatar sx={{ bgcolor: theme.palette.success.main, width: 56, height: 56, mr: 2 }}>
                  <AttachMoney sx={{ color: 'white' }} />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" variant="caption" gutterBottom>
                    Valor Total
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    <AnimatedNumber value={Math.round((stats.valorTotalAcordos || 0) * 100)} format={v => `R$ ${(v/100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Inclui entradas e parcelas</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', transition: 'box-shadow 0.18s', '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' } }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Avatar sx={{ bgcolor: theme.palette.warning.main, width: 56, height: 56, mr: 2 }}>
                  <Schedule sx={{ color: 'white' }} />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" variant="caption" gutterBottom>
                    Parcelas Pendentes
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    <AnimatedNumber value={stats.parcelasPendentes || 0} />
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Vencimentos em aberto</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', transition: 'box-shadow 0.18s', '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' } }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Avatar sx={{ bgcolor: theme.palette.error.main, width: 56, height: 56, mr: 2 }}>
                  <AttachMoney sx={{ color: 'white' }} />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" variant="caption" gutterBottom>
                    Valor Pendente
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    <AnimatedNumber value={Math.round((stats.valorPendente || 0) * 100)} format={v => `R$ ${(v/100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Valores ainda não pagos</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Lista de Acordos
          </Typography>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
            <Tab label={<Badge color="primary" badgeContent={acordosAtivos.length}>Ativos</Badge>} value="ativos" />
            <Tab label={<Badge color="success" badgeContent={acordosFinalizados.length}>Finalizados</Badge>} value="finalizados" />
          </Tabs>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Pessoa</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Unidade</TableCell>
                  <TableCell>Valor Total</TableCell>
                  <TableCell>Parcelas</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Status</TableCell>
                      <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {acordos.map((acordo) => (
                  <TableRow key={acordo.id}>
                    <TableCell>{acordo.nome_completo}</TableCell>
                    <TableCell>{acordo.descricao}</TableCell>
                    <TableCell>
                      {acordo.nome_bloco && acordo.numero_apartamento 
                        ? `${acordo.nome_bloco} - Apto ${acordo.numero_apartamento}`
                        : 'Sem vínculo ativo'
                      }
                    </TableCell>
                    <TableCell>
                      R$ {acordo.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{acordo.quantidade_parcelas}x</TableCell>
                    <TableCell>
                      {formatDate(acordo.data_acordo)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Chip 
                          label={acordo.status} 
                          color={getStatusColor(acordo.status)}
                          size="small"
                        />
                        {activeTab === 'ativos' && (
                          (() => {
                            const parcelaLabel = acordo.pending_count > 0 ? 'Pendente' : (acordo.paid_count >= acordo.quantidade_parcelas ? 'Quitado' : null);
                            if (!parcelaLabel) return null;
                            const parcelaColor = parcelaLabel === 'Pendente' ? 'warning' : 'success';
                            const tooltipText = `${acordo.paid_count} pagas • ${acordo.pending_count} pendentes`;
                            return (
                              <Tooltip title={tooltipText}>
                                <Chip
                                  label={parcelaLabel}
                                  color={parcelaColor}
                                  size="small"
                                  sx={{ mt: 0.5 }}
                                />
                              </Tooltip>
                            );
                          })()
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title="Visualizar parcelas">
                          <IconButton onClick={() => abrirDetalhes(acordo)} color="primary" aria-label="Visualizar parcelas">
                            <Visibility />
                          </IconButton>
                        </Tooltip>

                        {activeTab === 'ativos' && (
                          <Tooltip title="Arquivar acordo">
                            <IconButton size="small" onClick={() => { setPendingActionAcordo({ tipo: 'arquivar', acordo }); setConfirmArquivarOpen(true); }} aria-label="Arquivar acordo">
                              <Archive />
                            </IconButton>
                          </Tooltip>
                        )}

                        {activeTab === 'finalizados' && (
                          <Tooltip title="Desarquivar acordo">
                            <IconButton size="small" color="inherit" onClick={() => { setPendingActionAcordo({ tipo: 'desarquivar', acordo }); setConfirmDesarquivarOpen(true); }} aria-label="Desarquivar acordo">
                              <Unarchive />
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Botão de excluir fica abaixo com comportamento de countdown */}
                        <Tooltip title={'Excluir acordo'}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                // abrir diálogo imediatamente e iniciar countdown dentro do diálogo
                                setPendingDeleteAcordo(acordo);
                                setConfirmDeleteOpen(true);
                                // iniciar contagem caso não esteja rodando
                                if (!Object.prototype.hasOwnProperty.call(deleteCountdowns, acordo.id) || (deleteCountdowns[acordo.id] === undefined)) {
                                  startDeleteCountdown(acordo.id);
                                }
                              }}
                              aria-label="Excluir acordo"
                            >
                              <Delete />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 680 }, height: '100%', px: { xs: 2, sm: 3 }, pt: 0, pb: { xs: 2, sm: 3 } } }}
      >
        
        {acordoSelecionado && (
          <Box sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
            {/* Header hero encostado no topo e nas laterais */}
            <Box sx={{ position: 'sticky', top: 0, zIndex: 11, pb: 1, mt: { xs: -2, sm: -3 }, ml: { xs: -2, sm: -3 }, mr: { xs: -2, sm: -3 }, mb: 5 }}>
              <Box sx={{ background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: '#fff', p: 3, pt: 4, pb: 3, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ position: 'relative', mr: 1 }}>
                      <Avatar sx={{ bgcolor: theme.palette.success.main, color: '#fff', width: 86, height: 86, fontSize: 28, boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}>
                        {acordoSelecionado.nome_completo ? acordoSelecionado.nome_completo.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : 'A'}
                      </Avatar>
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{acordoSelecionado.nome_completo}</Typography>
                      <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 600 }}>{acordoSelecionado.nome_bloco && acordoSelecionado.numero_apartamento ? `${acordoSelecionado.nome_bloco} • Apto ${acordoSelecionado.numero_apartamento}` : 'Sem vínculo ativo'}</Typography>
                      <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 500 }}>{formatDate(acordoSelecionado.data_acordo)}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                 
                    <IconButton onClick={() => setDrawerOpen(false)} aria-label="Fechar painel" sx={{ bgcolor: 'error.main', color: '#fff', '&:hover': { bgcolor: 'error.dark' }, width: 40, height: 40 }}>
                      <Close />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Card resumo com valores e progresso */}
            <Box sx={{ mt: 2, px: 2, pb: 2 }}>
              <Paper elevation={3} sx={{ p: 2, borderRadius: 3, display: 'flex', gap: 2, alignItems: 'center', background: 'linear-gradient(90deg, rgba(255,255,255,0.98), rgba(250,250,250,0.92))' }}>
                <Box sx={{ width: 92, height: 92, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress variant="determinate" value={percentPago} size={92} thickness={6} sx={{ color: percentPago === 100 ? theme.palette.success.main : theme.palette.primary.main }} />
                    <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{percentPago}%</Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Resumo do Acordo</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>R$ {(Number(acordoSelecionado.valor_total || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                  <Grid container spacing={1} sx={{ mt: 1 }}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Entrada</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>R$ {Number(entradaValor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Parcelas</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{totalParcelas}x</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Restante</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>R$ {Number(esperadoValor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <Chip label={`Pagas ${pagasCount}`} color="success" size="small" />
                  <Chip label={`Pendentes ${pendentesCount}`} color="warning" size="small" />
                  {atrasadasCount > 0 && <Chip label={`Atrasadas ${atrasadasCount}`} color="error" size="small" />}
                </Box>
              </Paper>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Parcelas</Typography>

              <Box sx={{ mb: 2 }}>
                {totalParcelas > 0 ? (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Total: {totalParcelas}</Typography>
                      <Typography variant="body2">Pagas: {pagasCount}</Typography>
                      <Typography variant="body2">Pendentes: {pendentesCount}</Typography>
                      <Typography variant="body2" color={atrasadasCount > 0 ? 'error.main' : 'textPrimary'}>Atrasadas: {atrasadasCount}</Typography>
                    </Box>
                    <Tooltip title={`${percentPago}% pago`}>
                      <LinearProgress variant="determinate" value={percentPago} sx={{ height: 10, borderRadius: 2 }} />
                    </Tooltip>
                  </Box>
                ) : (
                  <Typography variant="body2">Nenhuma parcela encontrada.</Typography>
                )}
              </Box>

              <Box ref={drawerScrollRef} sx={{ flex: '1 1 auto', overflowY: 'auto', pb: 3 }}>
                <TableContainer component={Paper} variant="outlined" sx={{ minWidth: 0 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nº</TableCell>
                        <TableCell>Valor</TableCell>
                        <TableCell>Vencimento</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Pago em</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parcelas.map((parcela) => {
                        const isOverdue = parcela.status_parcela === 'Pendente' && new Date(parcela.data_vencimento) < new Date();
                        return (
                          <TableRow key={parcela.id} sx={{ backgroundColor: isOverdue ? 'rgba(255,0,0,0.03)' : 'inherit' }}>
                            <TableCell>{parcela.numero_parcela}</TableCell>
                            <TableCell>R$ {parcela.valor_parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>{formatDate(parcela.data_vencimento)}</TableCell>
                            <TableCell>
                              <Chip label={parcela.status_parcela} color={getParcelaColor(parcela.status_parcela)} size="small" />
                            </TableCell>
                            <TableCell>{parcela.data_pagamento ? formatDate(parcela.data_pagamento) : '-'}</TableCell>
                            <TableCell align="right">
                              {parcela.status_parcela === 'Pendente' && (
                                  <>
                                    <Tooltip title="Marcar como paga (hoje)">
                                      <span>
                                        <IconButton disabled={loadingParcelaId === parcela.id} color="success" size="small" onClick={() => confirmarMarcarParcela(parcela)}>
                                          {loadingParcelaId === parcela.id ? <CircularProgress size={18} /> : <CheckCircle />}
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                    <Tooltip title="Marcar com data específica">
                                      <span>
                                        <IconButton disabled={loadingParcelaId === parcela.id} size="small" onClick={() => openDateDialog(parcela)}>
                                          <Payment />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </>
                                )}

                              {parcela.status_parcela === 'Pago' && (
                                <Tooltip title="Desmarcar pagamento">
                                  <span>
                                    <IconButton disabled={loadingParcelaId === parcela.id} size="small" color="warning" onClick={() => { setPendingActionParcela(parcela); setConfirmDesmarcarOpen(true); }}>
                                      <Undo fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Dialog de confirmação: Arquivar */}
      <ConfirmDialog
        open={confirmArquivarOpen}
        title={(<><Archive color="primary" sx={{ fontSize: 28, mr: 1 }} /> Arquivar acordo</>)}
        content={(
          <>
            <Alert severity="info" icon={false} sx={{ mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText', fontWeight: 500 }}>
              Tem certeza que deseja arquivar este acordo como finalizado?
            </Alert>
            <Typography variant="body2" color="text.secondary">Todas as parcelas serão marcadas como pagas e o acordo será movido para finalizados.</Typography>
          </>
        )}
        onConfirm={async () => {
          if (!pendingActionAcordo) return;
          const acordo = pendingActionAcordo.acordo;
          try {
            const res = await window.electronAPI.invoke('arquivar-acordo', acordo.id);
            if (res.success) {
              if (res.parcelasAtualizadas) setSnackbarMsg(`${res.parcelasAtualizadas} parcelas marcadas como pagas e acordo arquivado.`);
              else setSnackbarMsg('Acordo arquivado com sucesso');
              setSnackbarSeverity('success'); setSnackbarOpen(true);
              carregarDados();
            } else {
              setSnackbarSeverity('error'); setSnackbarMsg(res.message || 'Erro ao arquivar'); setSnackbarOpen(true);
            }
          } catch (e) {
            console.error(e);
            setSnackbarSeverity('error'); setSnackbarMsg('Erro ao arquivar'); setSnackbarOpen(true);
          } finally {
            setConfirmArquivarOpen(false); setPendingActionAcordo(null);
          }
        }}
        onClose={() => { setConfirmArquivarOpen(false); setPendingActionAcordo(null); }}
      />

      {/* Dialog de confirmação: Desarquivar */}
      <ConfirmDialog
        open={confirmDesarquivarOpen}
        title={(<><Unarchive color="success" sx={{ fontSize: 28, mr: 1 }} /> Desarquivar acordo</>)}
        content={(
          <>
            <Alert severity="success" icon={false} sx={{ mb: 2, bgcolor: 'success.light', color: 'success.contrastText', fontWeight: 500 }}>
              Deseja desarquivar este acordo?
            </Alert>
            <Typography variant="body2" color="text.secondary">As parcelas permanecem no estado atual (pagas). Use <b>Forçar Ativo</b> para reativar o acordo mesmo que as parcelas estejam pagas.</Typography>
          </>
        )}
        onConfirm={async () => {
          if (!pendingActionAcordo) return;
          const acordo = pendingActionAcordo.acordo;
          try {
            const res = await window.electronAPI.invoke('desarquivar-acordo-forcar-ativo', acordo.id);
            if (res.success) {
              setSnackbarSeverity('success'); setSnackbarMsg(res.message || 'Acordo forçado para Ativo'); setSnackbarOpen(true);
              carregarDados();
            } else {
              setSnackbarSeverity('error'); setSnackbarMsg(res.message || 'Erro ao desarquivar'); setSnackbarOpen(true);
            }
          } catch (e) {
            console.error(e);
            setSnackbarSeverity('error'); setSnackbarMsg('Erro ao desarquivar'); setSnackbarOpen(true);
          } finally {
            setConfirmDesarquivarOpen(false); setPendingActionAcordo(null);
          }
        }}
        onClose={() => { setConfirmDesarquivarOpen(false); setPendingActionAcordo(null); }}
        confirmLabel="Forçar Ativo"
      />

      {/* Dialog de confirmação: Desmarcar parcela (marcar como pendente) */}
      <ConfirmDialog
        open={confirmDesmarcarOpen}
        title={(<><Undo color="warning" sx={{ fontSize: 28, mr: 1 }} /> Desmarcar pagamento</>)}
        content={(
          <>
            <Alert severity="warning" icon={false} sx={{ mb: 2, bgcolor: 'warning.light', color: 'warning.contrastText', fontWeight: 500 }}>
              Deseja desmarcar esta parcela como paga?
            </Alert>
            <Typography variant="body2" color="text.secondary">A parcela voltará para o estado pendente e poderá ser marcada novamente.</Typography>
          </>
        )}
        confirmLabel="Desmarcar"
        onConfirm={async () => {
          if (!pendingActionParcela) return;
          const parcela = pendingActionParcela;
          try {
            setLoadingParcelaId(parcela.id);
            const res = await window.electronAPI.invoke('desmarcar-parcela-paga', parcela.id);
            if (res.success) {
              const detalhes = await window.electronAPI.invoke('get-acordo-details', acordoSelecionado.id);
              setParcelas(detalhes.parcelas);
              carregarDados();
              setSnackbarSeverity('success'); setSnackbarMsg('Parcela desmarcada com sucesso'); setSnackbarOpen(true);
            } else {
              setSnackbarSeverity('error'); setSnackbarMsg(res.message || 'Erro ao desmarcar parcela'); setSnackbarOpen(true);
            }
          } catch (err) {
            console.error(err);
            setSnackbarSeverity('error'); setSnackbarMsg(err && err.message ? err.message : 'Erro ao desmarcar parcela'); setSnackbarOpen(true);
          } finally {
            setLoadingParcelaId(null);
            setConfirmDesmarcarOpen(false); setPendingActionParcela(null);
          }
        }}
        onClose={() => { setConfirmDesmarcarOpen(false); setPendingActionParcela(null); }}
      />

      {/* Dialog de confirmação: Excluir acordo (conta regressiva) */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={(<><Delete color="error" sx={{ fontSize: 28, mr: 1 }} /> Excluir acordo</>)}
        content={(
          <>
            <Alert severity="error" icon={false} sx={{ mb: 2, bgcolor: 'error.light', color: 'error.contrastText', fontWeight: 500 }}>
              Esta ação é <b>irreversível</b> e removerá todas as parcelas relacionadas.
            </Alert>
            <Typography variant="body1">Tem certeza que deseja excluir o acordo de "{pendingDeleteAcordo?.nome_completo}"?</Typography>
            {pendingDeleteAcordo && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {deleteCountdowns[pendingDeleteAcordo.id] > 0 ? `Aguarde ${deleteCountdowns[pendingDeleteAcordo.id]}s para habilitar a exclusão.` : 'Pronto para excluir.'}
              </Typography>
            )}
          </>
        )}
        destructive={true}
        confirmDisabled={!(pendingDeleteAcordo && (deleteCountdowns[pendingDeleteAcordo.id] === 0))}
        confirmLabel={pendingDeleteAcordo && (deleteCountdowns[pendingDeleteAcordo.id] > 0) ? String(deleteCountdowns[pendingDeleteAcordo.id]) : 'Excluir'}
        onConfirm={async () => {
          if (!pendingDeleteAcordo) return;
          try {
            const res = await window.electronAPI.invoke('delete-acordo', pendingDeleteAcordo.id);
            if (res && res.success) {
              setSnackbarSeverity('success'); setSnackbarMsg('Acordo excluído com sucesso'); setSnackbarOpen(true);
              carregarDados();
              closeDeleteDialog();
            } else {
              setSnackbarSeverity('error'); setSnackbarMsg(res.message || 'Erro ao excluir acordo'); setSnackbarOpen(true);
            }
          } catch (err) {
            console.error('Erro ao excluir acordo:', err);
            setSnackbarSeverity('error'); setSnackbarMsg('Erro ao excluir acordo'); setSnackbarOpen(true);
          }
        }}
        onClose={closeDeleteDialog}
      />

      {/* Dialog de confirmação: Marcar parcela como paga (hoje) */}
      <ConfirmDialog
        open={confirmMarcarOpen}
        title={(<><CheckCircle color="success" sx={{ fontSize: 28, mr: 1 }} /> Marcar como paga</>)}
        content={(
          <>
            <Alert severity="success" icon={false} sx={{ mb: 2, bgcolor: 'success.light', color: 'success.contrastText', fontWeight: 500 }}>
              Deseja marcar esta parcela como paga hoje?
            </Alert>
            <Typography variant="body2" color="text.secondary">A data de pagamento será registrada como hoje.</Typography>
          </>
        )}
        confirmLabel="Marcar"
        onConfirm={async () => {
          if (!pendingActionParcela) return;
          const parcela = pendingActionParcela;
          try {
            setLoadingParcelaId(parcela.id);
            const hoje = new Date().toISOString().split('T')[0];
            const res = await window.electronAPI.invoke('marcar-parcela-paga', parcela.id, hoje);
            if (res.success) {
              const detalhes = await window.electronAPI.invoke('get-acordo-details', acordoSelecionado.id);
              setParcelas(detalhes.parcelas);
              carregarDados();
              if (res.acordoQuitado) {
                setSnackbarSeverity('success'); setSnackbarMsg('Parcela marcada como paga. Acordo quitado!');
              } else {
                setSnackbarSeverity('success'); setSnackbarMsg('Parcela marcada como paga com sucesso.');
              }
              setSnackbarOpen(true);
            } else {
              setSnackbarSeverity('error'); setSnackbarMsg(res.message || 'Erro ao marcar parcela'); setSnackbarOpen(true);
            }
          } catch (err) {
            console.error(err);
            setSnackbarSeverity('error'); setSnackbarMsg(err && err.message ? err.message : 'Erro ao marcar parcela'); setSnackbarOpen(true);
          } finally {
            setLoadingParcelaId(null);
            setConfirmMarcarOpen(false); setPendingActionParcela(null);
          }
        }}
        onClose={() => { setConfirmMarcarOpen(false); setPendingActionParcela(null); }}
      />

      <CriarAcordoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={carregarDados}
      />

      {/* Dialog para escolher data de pagamento */}
      <Dialog open={dateDialogOpen} onClose={closeDateDialog}>
        <DialogTitle>Escolher data de pagamento</DialogTitle>
        <DialogContent>
          <TextField
            label="Data de Pagamento"
            type="date"
            value={dateDialogValue}
            onChange={(e) => setDateDialogValue(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDateDialog}>Cancelar</Button>
          <Button onClick={confirmDateDialog} variant="contained">Confirmar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={undoMeta ? 6000 : 4000}
        onClose={() => { setSnackbarOpen(false); setUndoMeta(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        action={undoMeta ? (
          <Button color="inherit" size="small" onClick={handleUndoSnackbar}>
            Desfazer
          </Button>
        ) : null}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};
export default AcordosPage;