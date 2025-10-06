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

function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
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
          
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom color="error">
              Limpar Todos os Dados
            </Typography>
            <Typography paragraph color="text.secondary">
              Apagar TODOS vínculos, pessoas e veículos permanentemente.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={() => openConfirmDialog('clear')}
              disabled={loading}
              startIcon={<DeleteForeverIcon />}
              fullWidth
            >
              Limpar Dados
            </Button>
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
          {confirmDialog.action === 'import' ? 'Confirmar Importação' : 'Confirmar Ação Perigosa'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.action === 'import' ? (
              <>
                Você tem certeza que deseja <strong>IMPORTAR OS DADOS</strong> do backup?
                <br /><br />
                Esta ação irá:
                • Substituir todos os dados atuais<br />
                • Restaurar pessoas, veículos e vínculos do backup<br />
                • Perder dados não salvos no backup<br /><br />
                <strong>Recomendamos fazer um backup atual antes de continuar!</strong>
              </>
            ) : (
              <>
                Você tem certeza que deseja <strong>EXCLUIR TODOS OS DADOS</strong> do sistema?
                <br /><br />
                Esta ação irá remover:
                • Todas as pessoas cadastradas<br />
                • Todos os veículos<br />
                • Todos os vínculos<br /><br />
                <strong>Esta ação NÃO PODE SER DESFEITA!</strong>
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null })}>
            Cancelar
          </Button>
          <Button 
            onClick={confirmDialog.action === 'import' ? handleImportBackup : handleClearData} 
            color={confirmDialog.action === 'import' ? 'warning' : 'error'} 
            variant="contained"
          >
            {confirmDialog.action === 'import' ? 'Sim, Importar' : 'Sim, Excluir Tudo'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default SettingsPage;