import React, { useState, useEffect, useRef } from 'react';
import {
  Typography, Button, Box, CircularProgress, Alert, Paper, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Card, CardContent
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

function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  const [deleteCountdown, setDeleteCountdown] = useState(0);
  const deleteTimerRef = useRef(null);
  const [stats, setStats] = useState(null);

  // Backup / Import states
  const [includeDb, setIncludeDb] = useState(true);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [preBackupBeforeRestore, setPreBackupBeforeRestore] = useState(true);

  // Progress modal
  const [progressMessage, setProgressMessage] = useState('');

  // Schedule
  const [scheduleMode, setScheduleMode] = useState('none');
  const [scheduleIncludeDb, setScheduleIncludeDb] = useState(true);
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [scheduleWeekday, setScheduleWeekday] = useState(1);
  const [scheduleMonthDay, setScheduleMonthDay] = useState(1);
  const [scheduleInfo, setScheduleInfo] = useState(null);

  useEffect(() => {
    (async () => {
      await fetchStats();
      try {
        const res = await window.api.getBackupSchedule();
        if (res && res.success) {
          setScheduleMode(res.schedule.mode || 'none');
          setScheduleIncludeDb(typeof res.schedule.includeDb === 'boolean' ? res.schedule.includeDb : true);
          setScheduleTime(res.schedule.time || '02:00');
          setScheduleWeekday(typeof res.schedule.weekday === 'number' ? res.schedule.weekday : 1);
          setScheduleMonthDay(typeof res.schedule.day === 'number' ? res.schedule.day : 1);
          setScheduleInfo(res.schedule || null);
        }
      } catch (e) { /* ignore */ }
    })();

    return () => { try { if (deleteTimerRef.current) { clearInterval(deleteTimerRef.current); deleteTimerRef.current = null; } } catch (e) {} };
  }, []);

  const fetchStats = async () => {
    try {
      const result = await window.api.getDetailedStats();
      if (result && result.success) setStats(result.stats);
    } catch (e) { /* ignore */ }
  };

  // Confirmation dialog helpers
  const openConfirmDialog = (action) => setConfirmDialog({ open: true, action });

  useEffect(() => {
    const deleteActions = new Set(['clear', 'clear_acordos', 'clear_pessoas', 'clear_veiculos', 'clear_produtos_movimentos', 'clear_all_db']);
    if (confirmDialog.open && deleteActions.has(confirmDialog.action)) {
      setDeleteCountdown(5);
      try { if (deleteTimerRef.current) { clearInterval(deleteTimerRef.current); deleteTimerRef.current = null; } } catch(e){}
      deleteTimerRef.current = setInterval(() => {
        setDeleteCountdown(prev => {
          if (prev <= 1) { try { clearInterval(deleteTimerRef.current); deleteTimerRef.current = null; } catch(e){}; return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      try { if (deleteTimerRef.current) { clearInterval(deleteTimerRef.current); deleteTimerRef.current = null; } } catch(e){}
      setDeleteCountdown(0);
    }
  }, [confirmDialog.open, confirmDialog.action]);

  // --- Backup manual ---
  const handleBackup = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    setProgressMessage('Gerando backup...');
    try {
      const result = await window.api.backupData({ includeDb });
      if (result.success) {
        setProgressMessage('Preparando arquivo para download...');
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        setFeedback({ type: 'success', message: `Backup realizado com sucesso! Incluiu DB: ${includeDb ? 'Sim' : 'Não'}` });
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: `Erro: ${error.message}` });
    }
    setProgressMessage('');
    setLoading(false);
  };

  // --- Import ---
  const handleImportBackup = async () => {
    if (!importFile) { setFeedback({ type: 'error', message: 'Selecione um arquivo de backup primeiro.' }); return; }
    setLoading(true);
    setFeedback({ type: '', message: '' });
    setProgressMessage('Lendo arquivo de backup...');
    try {
      const fileContent = await importFile.text();
      setProgressMessage('Validando formato do backup...');
      const backupData = JSON.parse(fileContent);

      if (!backupData.pessoas && !backupData.veiculos && !backupData.vinculos && !backupData.db_file_base64) {
        throw new Error('Arquivo de backup inválido. Formato não reconhecido.');
      }

      if (backupData.db_file_base64 && preBackupBeforeRestore) {
        try {
          setProgressMessage('Gerando backup atual antes de restaurar...');
          const current = await window.api.backupData({ includeDb: true });
          if (current && current.success) {
            const dataStr = JSON.stringify(current.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `backup_before_restore_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
          }
        } catch (e) { console.warn('Falha ao gerar backup antes da restauração:', e); }
      }

      setProgressMessage('Iniciando restauração dos dados...');
      const result = await window.api.importBackup(backupData);
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        fetchStats();
        setImportFile(null);
        setImportPreview(null);
        const fileInput = document.getElementById('backup-file-input'); if (fileInput) fileInput.value = '';
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: `Erro ao processar arquivo: ${error.message}` });
    }
    setProgressMessage('');
    setLoading(false);
    setConfirmDialog({ open: false, action: null });
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setImportFile(file);
        setFeedback({ type: 'info', message: `Arquivo selecionado: ${file.name}` });
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target.result);
            const preview = {
              temDb: !!parsed.db_file_base64,
              pessoas: Array.isArray(parsed.pessoas) ? parsed.pessoas.length : 0,
              veiculos: Array.isArray(parsed.veiculos) ? parsed.veiculos.length : 0,
              vinculos: Array.isArray(parsed.vinculos) ? parsed.vinculos.length : 0,
            };
            setImportPreview(preview);
          } catch (err) { setImportPreview(null); }
        };
        reader.readAsText(file);
      } else {
        setFeedback({ type: 'error', message: 'Selecione apenas arquivos .json' });
        event.target.value = '';
      }
    }
  };

  // --- Schedule actions ---
  const saveSchedule = async () => {
    setLoading(true);
    const payload = { mode: scheduleMode, includeDb: scheduleIncludeDb, time: scheduleTime, weekday: scheduleWeekday, day: scheduleMonthDay };
    const res = await window.api.setBackupSchedule(payload);
    if (res && res.success) { setScheduleInfo(res.schedule); setFeedback({ type: 'success', message: 'Agendamento salvo.' }); } else { setFeedback({ type: 'error', message: res?.message || 'Erro ao salvar agendamento' }); }
    setLoading(false);
  };

  const runBackupNow = async () => {
    setLoading(true);
    setProgressMessage('Executando backup agora...');
    const res = await window.api.runBackupNow({ includeDb: scheduleIncludeDb });
    setProgressMessage('');
    if (res && res.success) { setFeedback({ type: 'success', message: `Backup salvo em: ${res.path}` }); setScheduleInfo(prev => ({ ...prev, lastRun: new Date().toISOString() })); }
    else setFeedback({ type: 'error', message: res?.message || 'Erro ao executar backup agora' });
    setLoading(false);
  };

  // --- Clear / destructive actions (concise implementations) ---
  const handleClearData = async () => { setLoading(true); setFeedback({ type: '', message: '' }); try { const result = await window.api.clearAllData(); if (result.success) { setFeedback({ type: 'success', message: result.message }); fetchStats(); } else setFeedback({ type: 'error', message: result.message }); } catch (error) { setFeedback({ type: 'error', message: `Erro: ${error.message}` }); } setLoading(false); setConfirmDialog({ open: false, action: null }); };

  const handleClearAcordos = async () => { setLoading(true); setFeedback({ type: '', message: '' }); try { const acordos = await window.electronAPI.invoke('get-acordos', {}); if (Array.isArray(acordos)) for (const a of acordos) try { await window.electronAPI.invoke('delete-acordo', a.id); } catch(e){ console.warn('Erro ao deletar acordo', a.id, e); } setFeedback({ type: 'success', message: 'Todos os acordos foram removidos.' }); fetchStats(); } catch (error) { setFeedback({ type: 'error', message: `Erro: ${error.message}` }); } setLoading(false); setConfirmDialog({ open: false, action: null }); };

  const handleClearPessoas = async () => { setLoading(true); setFeedback({ type: '', message: '' }); try { const pessoas = await window.api.getFilteredPessoas({}); if (Array.isArray(pessoas)) for (const p of pessoas) try { await window.api.deletePessoa(p.id); } catch(e){ console.warn('Erro ao deletar pessoa', p.id, e); } setFeedback({ type: 'success', message: 'Todas as pessoas foram removidas.' }); fetchStats(); } catch (error) { setFeedback({ type: 'error', message: `Erro: ${error.message}` }); } setLoading(false); setConfirmDialog({ open: false, action: null }); };

  const handleClearVeiculos = async () => { setLoading(true); setFeedback({ type: '', message: '' }); try { const veiculos = await window.api.getAllVeiculos(); if (Array.isArray(veiculos)) for (const v of veiculos) try { await window.api.deleteVeiculo(v.id); } catch(e){ console.warn('Erro ao deletar veículo', v.id, e); } setFeedback({ type: 'success', message: 'Todos os veículos foram removidos.' }); fetchStats(); } catch (error) { setFeedback({ type: 'error', message: `Erro: ${error.message}` }); } setLoading(false); setConfirmDialog({ open: false, action: null }); };

  const handleClearEstoque = async () => { setLoading(true); setFeedback({ type: '', message: '' }); try { const produtos = await window.api.getProdutos(); if (Array.isArray(produtos)) for (const p of produtos) try { await window.api.updateProduto(p.id, { estoque_atual: 0 }); } catch(e){ console.warn('Erro ao zerar estoque do produto', p.id, e); } setFeedback({ type: 'success', message: 'Estoque zerado para todos os produtos.' }); fetchStats(); } catch (error) { setFeedback({ type: 'error', message: `Erro: ${error.message}` }); } setLoading(false); setConfirmDialog({ open: false, action: null }); };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Configurações do Sistema</Typography>

      {/* Estatísticas */}
      {stats && (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}><BarChartIcon sx={{ mr: 1 }} /><Typography variant="h6">Estatísticas do Sistema</Typography></Box>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}><Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 2 }}><Typography variant="h4" color="primary">{stats.totalPessoas}</Typography><Typography variant="body2">Pessoas</Typography></CardContent></Card></Grid>
            <Grid item xs={6} sm={3}><Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 2 }}><Typography variant="h4" color="secondary">{stats.totalVeiculos}</Typography><Typography variant="body2">Veículos</Typography></CardContent></Card></Grid>
            <Grid item xs={6} sm={3}><Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 2 }}><Typography variant="h4" color="success.main">{stats.totalVinculos}</Typography><Typography variant="body2">Vínculos Ativos</Typography></CardContent></Card></Grid>
            <Grid item xs={6} sm={3}><Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 2 }}><Typography variant="h4" color="warning.main">{stats.totalUnidades}</Typography><Typography variant="body2">Unidades</Typography></CardContent></Card></Grid>
          </Grid>
        </Paper>
      )}

      {/* Ações Iniciais */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}><BusinessIcon sx={{ mr: 1 }} /><Typography variant="h6">Configuração Inicial</Typography></Box>
        <Typography paragraph color="text.secondary">Cria a estrutura inicial do condomínio com 18 blocos e 240 unidades.</Typography>
        <Button variant="contained" onClick={async () => { setLoading(true); setFeedback({ type: '', message: '' }); const r = await window.api.runSetup(); setLoading(false); if (r && r.success) { setFeedback({ type: 'success', message: r.message }); fetchStats(); } else setFeedback({ type: 'error', message: r?.message || 'Erro' }); }} disabled={loading} startIcon={<BusinessIcon />}>{loading ? <CircularProgress size={20} /> : 'Criar Estrutura do Condomínio'}</Button>
      </Paper>

      {/* Backup + Import/Export Section */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}><BackupIcon sx={{ mr: 1 }} /><Typography variant="h6">Backup e Importação / Exportação</Typography></Box>

        <Grid container spacing={3}>
          {/* Manual Backup Card */}
          <Grid item xs={12} md={5}>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1">Backup Manual</Typography>
              <Typography paragraph color="text.secondary">Exporta todos os dados do sistema em formato JSON.</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                <input id="include-db-manual" type="checkbox" checked={includeDb} onChange={(e) => setIncludeDb(e.target.checked)} />
                <label htmlFor="include-db-manual">Incluir arquivo do banco (condominio.db)</label>
              </Box>
              <Button variant="outlined" onClick={handleBackup} startIcon={<BackupIcon />} fullWidth disabled={loading}>{loading ? <CircularProgress size={20} /> : 'Baixar Backup'}</Button>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>Os backups manuais baixados contêm os dados selecionados.</Typography>
            </Card>
          </Grid>

          {/* Automatic Backup Card */}
          <Grid item xs={12} md={7}>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1">Backup Automático</Typography>
              <Typography paragraph color="text.secondary">Configure backups regulares que serão salvos automaticamente na pasta Documentos/BACKUP-SGC.</Typography>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={scheduleMode} onChange={(e) => setScheduleMode(e.target.value)}>
                  <option value="none">Sem backup automático</option>
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>

                <Box sx={{ ml: 1 }}>
                  <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                </Box>

                {scheduleMode === 'weekly' && (
                  <Box sx={{ ml: 2 }}>
                    <select value={scheduleWeekday} onChange={(e) => setScheduleWeekday(parseInt(e.target.value, 10))}>
                      <option value={0}>Domingo</option>
                      <option value={1}>Segunda-feira</option>
                      <option value={2}>Terça-feira</option>
                      <option value={3}>Quarta-feira</option>
                      <option value={4}>Quinta-feira</option>
                      <option value={5}>Sexta-feira</option>
                      <option value={6}>Sábado</option>
                    </select>
                  </Box>
                )}

                {scheduleMode === 'monthly' && (
                  <Box sx={{ ml: 2 }}>
                    <select value={scheduleMonthDay} onChange={(e) => setScheduleMonthDay(parseInt(e.target.value, 10))}>
                      {Array.from({ length: 31 }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <input id="schedule-include-db" type="checkbox" checked={scheduleIncludeDb} onChange={(e) => setScheduleIncludeDb(e.target.checked)} />
                <label htmlFor="schedule-include-db">Incluir DB no backup automático</label>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button variant="outlined" size="small" onClick={saveSchedule} disabled={loading}>Salvar Agendamento</Button>
                <Button variant="contained" size="small" onClick={runBackupNow} disabled={loading}>Executar Agora</Button>
              </Box>

              {scheduleInfo && scheduleInfo.lastRun && (
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>Último backup automático: {new Date(scheduleInfo.lastRun).toLocaleString()}</Typography>
              )}

              <Typography variant="caption" display="block" color="text.secondary">Os backups automáticos são salvos em: Pasta Documentos/BACKUP-SGC</Typography>
            </Card>
          </Grid>

          {/* Import Card (placed under the backups) */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" color="primary">Importar Backup</Typography>
            <Typography paragraph color="text.secondary">Restaura dados de um arquivo de backup JSON.</Typography>
            <Box sx={{ mb: 1 }}>
              <input id="backup-file-input" type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
              <label htmlFor="backup-file-input">
                <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />} fullWidth sx={{ mb: 1 }}>Selecionar Arquivo</Button>
              </label>
            </Box>
            {importPreview && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2">Preview do backup:</Typography>
                <Typography variant="caption" color="text.secondary">Pessoas: {importPreview.pessoas} — Veículos: {importPreview.veiculos} — Vínculos: {importPreview.vinculos}</Typography>
                {importPreview.temDb && (
                  <Alert severity="warning" sx={{ mt: 1 }}>Este arquivo contém o arquivo binário do banco (DB). A restauração irá sobrescrever o arquivo atual e reiniciar a aplicação.</Alert>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <input type="checkbox" id="pre-backup" checked={preBackupBeforeRestore} onChange={(e) => setPreBackupBeforeRestore(e.target.checked)} />
                  <label htmlFor="pre-backup">Fazer backup atual automaticamente antes de restaurar (recomendado)</label>
                </Box>
              </Box>
            )}
            {importFile && (
              <Button variant="contained" onClick={() => openConfirmDialog('import')} disabled={loading} startIcon={<RestoreIcon />} fullWidth>Importar Dados</Button>
            )}
          </Grid>

        </Grid>
      </Paper>

      {/* Limpezas Específicas - seção separada abaixo de Import/Export */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom color="error">Limpezas Específicas</Typography>
        <Typography paragraph color="text.secondary">Execute ações seletivas para limpar tipos de dados específicos.</Typography>
        <Grid container spacing={2}>
          {[
            { key: 'clear_acordos', icon: <HandshakeIcon />, label: 'Limpar Acordos' },
            { key: 'clear_pessoas', icon: <PersonIcon />, label: 'Limpar Pessoas' },
            { key: 'clear_veiculos', icon: <DirectionsCarIcon />, label: 'Limpar Veículos' },
            { key: 'clear_estoque', icon: <InventoryIcon />, label: 'Limpar Estoque' },
            { key: 'clear_all_db', icon: <DeleteForeverIcon />, label: 'Limpar Banco (tudo)', color: 'error' }
          ].map(btn => (
            <Grid item xs={12} sm={6} md={4} key={btn.key}>
              <Button fullWidth variant="outlined" onClick={() => openConfirmDialog(btn.key)} startIcon={btn.icon} disabled={loading} sx={{ height: 56 }} color={'error'}>{btn.label}</Button>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Sobre / Versão */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>SGC Desktop</Typography>
            <Typography variant="body2" color="text.secondary">Versão 3.4.0</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2">Desenvolvido por Thiago Almeida</Typography>
            <Typography variant="caption" color="text.secondary">© {new Date().getFullYear()}</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Feedback */}
      {feedback.message && (
        <Alert severity={feedback.type} sx={{ mb: 2 }}>{feedback.message}</Alert>
      )}

      {/* Dialog de Confirmação */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null })}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}><WarningIcon color={confirmDialog.action === 'import' ? 'warning' : 'error'} sx={{ mr: 1 }} />
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
          <Button onClick={() => setConfirmDialog({ open: false, action: null })}>Cancelar</Button>
          <Button onClick={() => {
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
          }} color={confirmDialog.action === 'import' ? 'warning' : 'error'} variant="contained" disabled={deleteCountdown > 0}>{confirmDialog.action === 'import' ? 'Sim, Importar' : (deleteCountdown > 0 ? `Confirmar (${deleteCountdown}s)` : 'Confirmar')}</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Progresso */}
      <Dialog open={!!progressMessage} onClose={() => {}}>
        <DialogContent sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 360 }}>
          <CircularProgress />
          <Box>
            <Typography variant="subtitle1">{progressMessage}</Typography>
            <Typography variant="caption" color="text.secondary">Aguarde até a operação ser concluída.</Typography>
          </Box>
        </DialogContent>
      </Dialog>

    </Box>
  );
}

export default SettingsPage;