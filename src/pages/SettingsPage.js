import React, { useState, useEffect } from 'react';
import { 
  Typography, Button, Box, CircularProgress, Alert, Paper, Grid, 
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Card, CardContent, Chip
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import BarChartIcon from '@mui/icons-material/BarChart';
import BusinessIcon from '@mui/icons-material/Business';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PersonIcon from '@mui/icons-material/Person';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import HandshakeIcon from '@mui/icons-material/Handshake';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useRef } from 'react';

function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  const [deleteCountdown, setDeleteCountdown] = useState(0);
  const deleteTimerRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [importFile, setImportFile] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const result = await window.api.getDetailedStats();
    if (result.success) {
      setStats(result.stats);
    }
  };

  const handleSetupClick = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const result = await window.api.runSetup();
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        fetchStats();
      } else {
        setFeedback({ type: 'warning', message: result.message });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: `Ocorreu um erro: ${error.message}` });
    }
    setLoading(false);
  };

  const handleClearData = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const result = await window.api.clearAllData();
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        fetchStats();
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: `Erro: ${error.message}` });
    }
    setLoading(false);
    setConfirmDialog({ open: false, action: null });
  };

  const handleClearAcordos = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      // buscar acordos e deletar um por um usando electronAPI.invoke
      const acordos = await window.electronAPI.invoke('get-acordos', {});
      if (Array.isArray(acordos)) {
        for (const a of acordos) {
          try {
            await window.electronAPI.invoke('delete-acordo', a.id);
          } catch (e) {
            console.warn('Erro ao deletar acordo', a.id, e);
          }
        }
      }
      setFeedback({ type: 'success', message: 'Todos os acordos foram removidos.' });
      fetchStats();
    } catch (error) {
      setFeedback({ type: 'error', message: `Erro: ${error.message}` });
    }
    setLoading(false);
    setConfirmDialog({ open: false, action: null });
  };

  const handleClearPessoas = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      // getFilteredPessoas returns people; do a safe list-and-delete since
      // there is no clearPessoas helper exposed in preload
      const pessoas = await window.api.getFilteredPessoas({});
      if (Array.isArray(pessoas)) {
        for (const p of pessoas) {
          try {
            await window.api.deletePessoa(p.id);
          } catch (e) {
            console.warn('Erro ao deletar pessoa', p.id, e);
          }
        }
      }
      setFeedback({ type: 'success', message: 'Todas as pessoas foram removidas.' });
      fetchStats();
    } catch (error) {
      setFeedback({ type: 'error', message: `Erro: ${error.message}` });
    }
    setLoading(false);
    setConfirmDialog({ open: false, action: null });
  };

  const handleClearVeiculos = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      // buscar todos os veículos e deletar um por um usando APIs expostas
      const veiculos = await window.api.getAllVeiculos();
      if (Array.isArray(veiculos)) {
        for (const v of veiculos) {
          try {
            await window.api.deleteVeiculo(v.id);
          } catch (e) {
            console.warn('Erro ao deletar veículo', v.id, e);
          }
        }
      }
      setFeedback({ type: 'success', message: 'Todos os veículos foram removidos.' });
      fetchStats();
    } catch (error) {
      setFeedback({ type: 'error', message: `Erro: ${error.message}` });
    }
    setLoading(false);
    setConfirmDialog({ open: false, action: null });
  };

  const handleClearProdutosMovimentos = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      // primeiro, deletar todas as movimentações
      const movs = await window.api.getMovimentacoes({});
      if (Array.isArray(movs)) {
        for (const m of movs) {
          try {
            await window.api.deleteMovimentacao(m.id);
          } catch (e) {
            console.warn('Erro ao deletar movimentação', m.id, e);
          }
        }
      }

      // depois, deletar todos os produtos
      const produtos = await window.api.getProdutos();
      if (Array.isArray(produtos)) {
        for (const p of produtos) {
          try {
            await window.api.deleteProduto(p.id);
          } catch (e) {
            console.warn('Erro ao deletar produto', p.id, e);
          }
        }
      }

      setFeedback({ type: 'success', message: 'Produtos e movimentações removidos.' });
      fetchStats();
    } catch (error) {
      setFeedback({ type: 'error', message: `Erro: ${error.message}` });
    }
    setLoading(false);
    setConfirmDialog({ open: false, action: null });
  };

  const handleClearEstoque = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const produtos = await window.api.getProdutos();
      if (Array.isArray(produtos)) {
        for (const p of produtos) {
          try {
            await window.api.updateProduto(p.id, { estoque_atual: 0 });
          } catch (e) {
            console.warn('Erro ao zerar estoque do produto', p.id, e);
          }
        }
      }
      setFeedback({ type: 'success', message: 'Estoque zerado para todos os produtos.' });
      fetchStats();
    } catch (error) {
      setFeedback({ type: 'error', message: `Erro: ${error.message}` });
    }
    setLoading(false);
    setConfirmDialog({ open: false, action: null });
  };

  const handleBackup = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const result = await window.api.backupData();
      if (result.success) {
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        setFeedback({ type: 'success', message: 'Backup realizado com sucesso!' });
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: `Erro: ${error.message}` });
    }
    setLoading(false);
  };

  const handleImportBackup = async () => {
    if (!importFile) {
      setFeedback({ type: 'error', message: 'Selecione um arquivo de backup primeiro.' });
      return;
    }
    
    setLoading(true);
    setFeedback({ type: '', message: '' });
    
    try {
      const fileContent = await importFile.text();
      const backupData = JSON.parse(fileContent);
      
      // Validação básica do formato
      if (!backupData.pessoas && !backupData.veiculos && !backupData.vinculos) {
        throw new Error('Arquivo de backup inválido. Formato não reconhecido.');
      }
      
      const result = await window.api.importBackup(backupData);
      
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        fetchStats();
        setImportFile(null);
        // Limpa o input file
        const fileInput = document.getElementById('backup-file-input');
        if (fileInput) fileInput.value = '';
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: `Erro ao processar arquivo: ${error.message}` });
    }
    
    setLoading(false);
    setConfirmDialog({ open: false, action: null });
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setImportFile(file);
        setFeedback({ type: 'info', message: `Arquivo selecionado: ${file.name}` });
      } else {
        setFeedback({ type: 'error', message: 'Selecione apenas arquivos .json' });
        event.target.value = '';
      }
    }
  };

  const openConfirmDialog = (action) => {
    setConfirmDialog({ open: true, action });
  };

  // iniciar countdown de 5s para ações de exclusão quando o diálogo abrir
  React.useEffect(() => {
    // ações que devem ter o timer
    const deleteActions = new Set(['clear', 'clear_acordos', 'clear_pessoas', 'clear_veiculos', 'clear_produtos_movimentos', 'clear_all_db']);
    if (confirmDialog.open && deleteActions.has(confirmDialog.action)) {
      // iniciar contagem regressiva de 5s
      setDeleteCountdown(5);
      try { if (deleteTimerRef.current) { clearInterval(deleteTimerRef.current); deleteTimerRef.current = null; } } catch(e){}
      deleteTimerRef.current = setInterval(() => {
        setDeleteCountdown(prev => {
          if (prev <= 1) {
            try { clearInterval(deleteTimerRef.current); deleteTimerRef.current = null; } catch(e){}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // fechar diálogo ou ação não é de delete -> limpar timer
      try { if (deleteTimerRef.current) { clearInterval(deleteTimerRef.current); deleteTimerRef.current = null; } } catch(e){}
      setDeleteCountdown(0);
    }

    return () => {
      try { if (deleteTimerRef.current) { clearInterval(deleteTimerRef.current); deleteTimerRef.current = null; } } catch(e){}
    };
  }, [confirmDialog.open, confirmDialog.action]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Configurações do Sistema
      </Typography>
      
      {/* Estatísticas do Sistema */}
      {stats && (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BarChartIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Estatísticas do Sistema</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="primary">{stats.totalPessoas}</Typography>
                  <Typography variant="body2">Pessoas</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="secondary">{stats.totalVeiculos}</Typography>
                  <Typography variant="body2">Veículos</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="success.main">{stats.totalVinculos}</Typography>
                  <Typography variant="body2">Vínculos Ativos</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="warning.main">{stats.totalUnidades}</Typography>
                  <Typography variant="body2">Unidades</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {stats.vinculosPorTipo.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Vínculos por Tipo:</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {stats.vinculosPorTipo.map(item => (
                  <Chip key={item.tipo_vinculo} label={`${item.tipo_vinculo}: ${item.count}`} size="small" />
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      )}
      
      {/* Ações do Sistema */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <BusinessIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Configuração Inicial</Typography>
        </Box>
        <Typography paragraph color="text.secondary">
          Cria a estrutura inicial do condomínio com 18 blocos e 240 unidades.
        </Typography>
        <Button
          variant="contained"
          onClick={handleSetupClick}
          disabled={loading}
          startIcon={<BusinessIcon />}
        >
          {loading ? <CircularProgress size={20} /> : 'Criar Estrutura do Condomínio'}
        </Button>
      </Paper>
      
      {/* Backup e Manutenção */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <BackupIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Backup e Manutenção</Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>Fazer Backup</Typography>
            <Typography paragraph color="text.secondary">
              Exporta todos os dados do sistema em formato JSON.
            </Typography>
            <Button
              variant="outlined"
              onClick={handleBackup}
              disabled={loading}
              startIcon={<BackupIcon />}
              fullWidth
            >
              {loading ? <CircularProgress size={20} /> : 'Baixar Backup'}
            </Button>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom color="primary">
              Importar Backup
            </Typography>
            <Typography paragraph color="text.secondary">
              Restaura dados de um arquivo de backup JSON.
            </Typography>
            <Box sx={{ mb: 1 }}>
              <input
                id="backup-file-input"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="backup-file-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  Selecionar Arquivo
                </Button>
              </label>
            </Box>
            {importFile && (
              <Button
                variant="contained"
                onClick={() => openConfirmDialog('import')}
                disabled={loading}
                startIcon={<RestoreIcon />}
                fullWidth
              >
                Importar Dados
              </Button>
            )}
          </Grid>
          
          {/* botão 'Limpar Tudo' removido — apenas limpezas específicas permanecem */}
          
          <Grid item xs={12} md={8}>
            <Typography variant="subtitle1" gutterBottom color="error">
              Limpezas Específicas
            </Typography>
            <Typography paragraph color="text.secondary">
              Execute ações seletivas para limpar tipos de dados específicos.
            </Typography>
            <Grid container spacing={2}>
              {[
                { key: 'clear_acordos', icon: <HandshakeIcon />, label: 'Limpar Acordos' },
                { key: 'clear_pessoas', icon: <PersonIcon />, label: 'Limpar Pessoas' },
                { key: 'clear_veiculos', icon: <DirectionsCarIcon />, label: 'Limpar Veículos' },
                { key: 'clear_estoque', icon: <InventoryIcon />, label: 'Limpar Estoque' },
                { key: 'clear_all_db', icon: <DeleteForeverIcon />, label: 'Limpar Banco (tudo)', color: 'error' }
              ].map(btn => (
                <Grid item xs={12} sm={6} md={4} key={btn.key}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => openConfirmDialog(btn.key)}
                    startIcon={btn.icon}
                    disabled={loading}
                    sx={{ height: 56 }}
                    color={'error'}
                  >
                    {btn.label}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Feedback */}
      {feedback.message && (
        <Alert severity={feedback.type} sx={{ mb: 2 }}>
          {feedback.message}
        </Alert>
      )}
      
      {/* Dialog de Confirmação */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null })}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon color={confirmDialog.action === 'import' ? 'warning' : 'error'} sx={{ mr: 1 }} />
          {(() => {
            switch (confirmDialog.action) {
              case 'import': return 'Confirmar Importação';
              case 'clear': return 'Confirmar Limpeza Geral';
              case 'clear_acordos': return 'Confirmar Limpeza de Acordos';
              case 'clear_pessoas': return 'Confirmar Limpeza de Pessoas';
              case 'clear_veiculos': return 'Confirmar Limpeza de Veículos';
              case 'clear_produtos_movimentos': return 'Confirmar Limpeza de Produtos e Movimentos';
              case 'clear_all_db': return 'Confirmar Limpeza do Banco de Dados';
              default: return 'Confirmar Ação';
            }
          })()}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {(() => {
              switch (confirmDialog.action) {
                case 'import':
                  return (
                    <>
                      Você tem certeza que deseja <strong>IMPORTAR OS DADOS</strong> do backup?
                      <br /><br />
                      Esta ação irá:
                      • Substituir todos os dados atuais<br />
                      • Restaurar pessoas, veículos e vínculos do backup<br />
                      • Perder dados não salvos no backup<br /><br />
                      <strong>Recomendamos fazer um backup atual antes de continuar!</strong>
                    </>
                  );
                case 'clear':
                  return (
                    <>
                      Você tem certeza que deseja <strong>EXCLUIR TODOS OS DADOS</strong> do sistema?
                      <br /><br />
                      Esta ação irá remover:
                      • Todas as pessoas cadastradas<br />
                      • Todos os veículos<br />
                      • Todos os vínculos<br /><br />
                      <strong>Esta ação NÃO PODE SER DESFEITA!</strong>
                    </>
                  );
                case 'clear_acordos':
                  return (
                    <>
                      Você tem certeza que deseja <strong>EXCLUIR TODOS OS ACORDOS</strong>?
                      <br /><br />
                      Esta ação irá remover permanentemente todos os acordos registrados.
                    </>
                  );
                case 'clear_pessoas':
                  return (
                    <>
                      Você tem certeza que deseja <strong>EXCLUIR TODAS AS PESSOAS</strong>?
                      <br /><br />
                      Esta ação irá remover permanentemente todos os cadastros de pessoas.
                    </>
                  );
                case 'clear_veiculos':
                  return (
                    <>
                      Você tem certeza que deseja <strong>EXCLUIR TODOS OS VEÍCULOS</strong>?
                      <br /><br />
                      Esta ação irá remover permanentemente todos os veículos cadastrados.
                    </>
                  );
                case 'clear_produtos_movimentos':
                  return (
                    <>
                      Você tem certeza que deseja <strong>EXCLUIR TODOS OS PRODUTOS E MOVIMENTOS</strong>?
                      <br /><br />
                      Esta ação irá remover produtos, estoques e todas as movimentações.
                    </>
                  );
                case 'clear_all_db':
                  return (
                    <>
                      Você tem certeza que deseja <strong>APAGAR TODO O BANCO DE DADOS</strong>?
                      <br /><br />
                      Esta ação é irreversível e removerá todas as tabelas e dados do sistema.
                      <br /><br />
                      <strong>Faça um backup antes de continuar!</strong>
                    </>
                  );
                default:
                  return 'Confirma a ação?';
              }
            })()}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null })}>
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              switch (confirmDialog.action) {
                case 'import': return handleImportBackup();
                case 'clear': return handleClearData();
                case 'clear_acordos': return handleClearAcordos();
                case 'clear_pessoas': return handleClearPessoas();
                case 'clear_veiculos': return handleClearVeiculos();
                case 'clear_estoque': return handleClearEstoque();
                case 'clear_all_db': return handleClearData();
                default: return null;
              }
            }}
            color={confirmDialog.action === 'import' ? 'warning' : 'error'} 
            variant="contained"
            disabled={deleteCountdown > 0}
          >
            {confirmDialog.action === 'import' ? 'Sim, Importar' : (deleteCountdown > 0 ? `Confirmar (${deleteCountdown}s)` : 'Confirmar')}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default SettingsPage;