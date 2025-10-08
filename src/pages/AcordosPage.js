import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import { formatDate as utilFormatDate } from '../utils/date';
import AnimatedNumber from '../components/AnimatedNumber';
import {
  Box, Typography, Card, CardContent, Grid, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
  Drawer, Divider, TextField, LinearProgress, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Avatar, Snackbar, Alert, CircularProgress, Tabs, Tab, Badge
} from '@mui/material';
import { Add, Visibility, AttachMoney, Assignment, Schedule, CheckCircle, Payment, Close, Archive, Unarchive, Undo } from '@mui/icons-material';
import CriarAcordoModal from '../components/CriarAcordoModal';

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
                    <AnimatedNumber value={Math.round((stats.valorTotalAcordos || 0) * 100)} format={v => `R$ ${(v/100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
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
                    <AnimatedNumber value={Math.round((stats.valorPendente || 0) * 100)} format={v => `R$ ${(v/100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
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
                      R$ {acordo.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                      <Tooltip title="Visualizar parcelas">
                        <IconButton
                          onClick={() => abrirDetalhes(acordo)}
                          color="primary"
                          aria-label="Visualizar parcelas"
                        >
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
        sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 680 }, height: '100%' } }}
      >
        {acordoSelecionado && (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
            <Box sx={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'background.paper', pb: 1, pt: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {acordoSelecionado.nome_completo ? acordoSelecionado.nome_completo.split(' ').map(n => n[0]).slice(0,2).join('') : 'A'}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{acordoSelecionado.nome_completo}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {acordoSelecionado.nome_bloco && acordoSelecionado.numero_apartamento ? `${acordoSelecionado.nome_bloco} • Apto ${acordoSelecionado.numero_apartamento}` : 'Sem vínculo ativo'} • {formatDate(acordoSelecionado.data_acordo)}
                    </Typography>
                  </Box>
                </Stack>
                <IconButton onClick={() => setDrawerOpen(false)} aria-label="Fechar painel">
                  <Close />
                </IconButton>
              </Box>
              <Divider sx={{ mt: 1 }} />
            </Box>

            <Box sx={{ mt: 2, pb: 2 }}>
              <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2">Descrição</Typography>
                <Typography sx={{ mt: 0.5 }}>{acordoSelecionado.descricao}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">Valor Total</Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 600 }}>R$ {acordoSelecionado.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Typography>
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
                            <TableCell>R$ {parcela.valor_parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
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
      <Dialog open={confirmArquivarOpen} onClose={() => { setConfirmArquivarOpen(false); setPendingActionAcordo(null); }}>
        <DialogTitle>Arquivar acordo</DialogTitle>
        <DialogContent>
          <Typography>Deseja arquivar este acordo como finalizado?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmArquivarOpen(false); setPendingActionAcordo(null); }}>Cancelar</Button>
          <Button variant="contained" onClick={async () => {
            if (!pendingActionAcordo) return;
            const acordo = pendingActionAcordo.acordo;
            try {
              const res = await window.electronAPI.invoke('arquivar-acordo', acordo.id);
              if (res.success) {
                // se main retornou numero de parcelas atualizadas, mostrar
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
          }}>Arquivar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação: Desarquivar */}
      <Dialog open={confirmDesarquivarOpen} onClose={() => { setConfirmDesarquivarOpen(false); setPendingActionAcordo(null); }}>
        <DialogTitle>Desarquivar acordo</DialogTitle>
        <DialogContent>
          <Typography>Deseja desarquivar este acordo?</Typography>
          <Typography variant="caption" color="text.secondary">As parcelas permanecem no estado atual (pagas). Use "Forçar Ativo" para reativar o acordo mesmo que as parcelas estejam pagas.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmDesarquivarOpen(false); setPendingActionAcordo(null); }}>Cancelar</Button>
          <Button variant="contained" onClick={async () => {
            // forçar para Ativo
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
          }}>Forçar Ativo</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação: Desmarcar parcela (marcar como pendente) */}
      <Dialog open={confirmDesmarcarOpen} onClose={() => { setConfirmDesmarcarOpen(false); setPendingActionParcela(null); }}>
        <DialogTitle>Desmarcar pagamento</DialogTitle>
        <DialogContent>
          <Typography>Deseja desmarcar esta parcela como paga?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmDesmarcarOpen(false); setPendingActionParcela(null); }}>Cancelar</Button>
          <Button variant="contained" color="warning" onClick={async () => {
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
          }}>Desmarcar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação: Marcar parcela como paga (hoje) */}
      <Dialog open={confirmMarcarOpen} onClose={() => { setConfirmMarcarOpen(false); setPendingActionParcela(null); }}>
        <DialogTitle>Marcar parcela como paga</DialogTitle>
        <DialogContent>
          <Typography>Deseja marcar esta parcela como paga hoje?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmMarcarOpen(false); setPendingActionParcela(null); }}>Cancelar</Button>
          <Button variant="contained" onClick={async () => {
            if (!pendingActionParcela) return;
            const parcela = pendingActionParcela;
            try {
              setLoadingParcelaId(parcela.id);
              // usar data atual
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
          }}>Marcar</Button>
        </DialogActions>
      </Dialog>

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