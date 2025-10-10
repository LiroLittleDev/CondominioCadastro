import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { themes, themeKeys } from './themes';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Chip,
  Tooltip
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BusinessIcon from '@mui/icons-material/Business';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import InventoryIcon from '@mui/icons-material/Inventory';
import HandshakeIcon from '@mui/icons-material/Handshake';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import UpdateIcon from '@mui/icons-material/Update';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import BackupIcon from '@mui/icons-material/Backup';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';

import { HashRouter, Routes, Route, Link } from 'react-router-dom';

import HomePage from './pages/HomePage';
import UnidadePage from './pages/UnidadePage';
import ReportsPage from './pages/ReportsPage';
import PessoasListPage from './pages/PessoasListPage';
import VeiculosListPage from './pages/VeiculosListPage';
import UnidadesListPage from './pages/UnidadesListPage';
import BlocosPage from './pages/BlocosPage';
import PessoaPage from './pages/PessoaPage';
import SettingsPage from './pages/SettingsPage';
import EstoquePage from './pages/EstoquePage';
import ProdutosPage from './pages/ProdutosPage';
import MovimentacoesPage from './pages/MovimentacoesPage';
import AcordosPage from './pages/AcordosPage';

const drawerWidth = 240;

export default function App() {
  const appStartRef = useRef(new Date());
  const [appVersion, setAppVersion] = useState('4.0.0');
  const [accessHistory, setAccessHistory] = useState([]);
  const [acordosPendentes, setAcordosPendentes] = useState(null);
  const acordosUpdateTimer = useRef(null);
  const [lastBackup, setLastBackup] = useState(null);
  const backupTimerRef = useRef(null);

  // Theme state (persisted) - dark mode removed, always use 'light'
  const [themeKey, setThemeKey] = useState(() => {
    try { return localStorage.getItem('appTheme') || 'default'; } catch (e) { return 'default'; }
  });

  useEffect(() => { try { localStorage.setItem('appTheme', themeKey); } catch (e) {} }, [themeKey]);

  useEffect(() => {
    const handler = (e) => {
      try {
        const { key } = e.detail || {};
        if (key && themeKeys.includes(key)) setThemeKey(key);
      } catch (err) { /* ignore */ }
    };
    window.addEventListener('app:themeChange', handler);
    return () => window.removeEventListener('app:themeChange', handler);
  }, []);

  // Always create theme in light mode only
  const muiTheme = themes[themeKey] ? themes[themeKey]('light') : themes.default('light');

  const sessionsCount = accessHistory.length;

  const formatDateTime = (dt) => { try { return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return '-'; } };
  const formatShortDateTime = (dt) => { try { return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return '-'; } };

  useEffect(() => {
    try {
      const nowIso = new Date().toISOString();
      let history = [];
      try { const raw = localStorage.getItem('accessHistory'); if (raw) history = JSON.parse(raw); if (!Array.isArray(history)) history = []; } catch(_) { history = []; }
      if (!sessionStorage.getItem('accessSessionLogged')) { history.push(nowIso); if (history.length > 200) history = history.slice(history.length - 200); localStorage.setItem('accessHistory', JSON.stringify(history)); sessionStorage.setItem('accessSessionLogged', '1'); }
      setAccessHistory(history);
    } catch (e) { /* ignore */ }
  }, []);

  const fetchLastBackup = async () => {
    try {
      if (window.api && typeof window.api.getBackupSchedule === 'function') {
        const res = await window.api.getBackupSchedule();
        if (res && res.success && res.schedule && res.schedule.lastRun) {
          setLastBackup(new Date(res.schedule.lastRun));
          localStorage.setItem('lastBackupRun', res.schedule.lastRun);
          return;
        }
      }
      const stored = localStorage.getItem('lastBackupRun'); if (stored) setLastBackup(new Date(stored));
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    fetchLastBackup();
    backupTimerRef.current = setInterval(fetchLastBackup, 120000);
    const handler = (e) => { if (e && e.detail) { try { setLastBackup(new Date(e.detail)); } catch(_) {} } else { fetchLastBackup(); } };
    window.addEventListener('backup:done', handler);
    return () => { if (backupTimerRef.current) clearInterval(backupTimerRef.current); window.removeEventListener('backup:done', handler); };
  }, []);

  useEffect(() => { (async () => { try { if (window.api && typeof window.api.getAppVersion === 'function') { const v = await window.api.getAppVersion(); if (v) setAppVersion(v); } } catch (_) { /* ignore */ } })(); }, []);

  const fetchAcordosPendentes = async () => {
    if (!window?.electronAPI?.invoke) return;
    try {
      const ativos = await window.electronAPI.invoke('get-acordos', { status: 'Ativo' });
      setAcordosPendentes(Array.isArray(ativos) ? ativos.length : 0);
    } catch (e) {
      console.warn('Falha ao obter acordos pendentes', e);
      setAcordosPendentes(0);
    } finally { /* noop */ }
  };

  useEffect(() => { fetchAcordosPendentes(); acordosUpdateTimer.current = setInterval(fetchAcordosPendentes, 60000); return () => { if (acordosUpdateTimer.current) clearInterval(acordosUpdateTimer.current); }; }, []);

  useEffect(() => { if (window.api && typeof window.api.onDataChanged === 'function') { const unsub = window.api.onDataChanged(() => { fetchAcordosPendentes(); }); return () => { try { if (typeof unsub === 'function') unsub(); } catch (_) {} }; } }, []);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <HashRouter>
        <Box sx={{ display: 'flex' }}>
          <AppBar
            position="fixed"
            elevation={0}
            sx={{
              width: `calc(100% - ${drawerWidth}px)`,
              ml: `${drawerWidth}px`,
              background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backdropFilter: 'blur(6px)',
              border: (theme) => `5px solid rgba(0,0,0,0.06)`
            }}
          >
            <Toolbar sx={{ minHeight: '82px !important', justifyContent: 'space-between', px: 3, position: 'relative' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DashboardCustomizeIcon sx={{ color: 'primary.contrastText', opacity: 0.95, fontSize: 30 }} />
                <Box sx={{ display:'flex', flexDirection:'column', lineHeight: 1 }}>
                  <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, fontSize: '1.35rem', color: 'primary.contrastText' }}>Sistema de Gestão Condominial</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', mt: 0.3 }}>Versão {appVersion}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Tooltip title="Acordos com status Ativo" arrow>
                  <Chip icon={<PendingActionsIcon sx={{ color: 'inherit' }} />} label={<Box component="span" sx={{ display: 'flex', alignItems: 'center' }}><Typography component="span" sx={{ fontSize: '.70rem', mr: .5, opacity: 0.8 }}>Acordos pendentes</Typography><Typography component="span" sx={{ fontWeight: 700, fontSize: '.8rem' }}>{acordosPendentes === null ? '...' : acordosPendentes}</Typography></Box>} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', '.MuiChip-icon': { color: 'rgba(255,255,255,0.9)' }, border: '1px solid rgba(255,255,255,0.25)' }} />
                </Tooltip>

                <Tooltip title={lastBackup ? `Último backup em ${formatDateTime(lastBackup)}` : 'Nenhum backup registrado'} arrow>
                  <Chip icon={<BackupIcon sx={{ color: 'inherit' }} />} label={<Box component="span" sx={{ display: 'flex', alignItems: 'center' }}><Typography component="span" sx={{ fontSize: '.70rem', mr: .5, opacity: 0.8 }}>Backup</Typography><Typography component="span" sx={{ fontWeight: 600, fontSize: '.70rem' }}>{ lastBackup ? formatShortDateTime(lastBackup) : 'Nunca' }</Typography></Box>} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', '.MuiChip-icon': { color: 'rgba(255,255,255,0.9)' }, border: '1px solid rgba(255,255,255,0.25)' }} />
                </Tooltip>

                <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, pl: 1, ml: 1, borderLeft: '1px solid rgba(255,255,255,0.25)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccessTimeIcon sx={{ fontSize: 14, opacity: 0.95, color: 'primary.contrastText' }} />
                    <Typography component="span" sx={{ fontSize: '.68rem', opacity: 0.9, color: 'primary.contrastText' }}>Início:</Typography>
                    <Typography component="span" sx={{ fontSize: '.68rem', fontWeight: 600, color: 'primary.contrastText' }}>{formatDateTime(appStartRef.current)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                    <UpdateIcon sx={{ fontSize: 14, opacity: 0.95, color: 'primary.contrastText' }} />
                    <Typography component="span" sx={{ fontSize: '.68rem', opacity: 0.9, color: 'primary.contrastText' }}>Aberturas:</Typography>
                    <Typography component="span" sx={{ fontSize: '.68rem', fontWeight: 600, color: 'primary.contrastText' }}>{sessionsCount > 0 ? sessionsCount : '—'}</Typography>
                  </Box>
                </Box>
              </Box>
            </Toolbar>
          </AppBar>

          <Drawer sx={{ width: drawerWidth, flexShrink: 0, "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: (theme) => theme.palette.background.paper, borderRight: '1px solid rgba(0,0,0,0.08)' } }} variant="permanent" anchor="left">
            <Toolbar sx={{ minHeight: '80px !important', justifyContent: 'center', background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '10px 0' }}>
              <Box sx={{ textAlign: 'center', width: '100%' }}>
                <Avatar
                  sx={{
                    marginTop: 2,
                    width: 48,
                    height: 48,
                    bgcolor: 'primary.main',
                    mb: 1,
                    mx: 'auto',
                    // gentle vertical bobbing animation
                    '@keyframes bob': {
                      '0%': { transform: 'translateY(0px)' },
                      '50%': { transform: 'translateY(-6px)' },
                      '100%': { transform: 'translateY(0px)' }
                    },
                    animation: 'bob 3s ease-in-out infinite'
                  }}
                >
                  <HomeWorkIcon sx={{ color: 'white', fontSize: { xs: 30, md: 30 } }} />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.contrastText' }}>SGC Desktop</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}>Sistema de Gestão Condominial</Typography>
              </Box>
            </Toolbar>
            <Divider sx={{ mx: 2, mb: 1 }} />
            <List sx={{ px: 1 }}>
              <ListItem button component={Link} to="/" sx={{ borderRadius: 2, mb: 0.5, mx: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 40 }}><HomeIcon /></ListItemIcon>
                <ListItemText primary="Dashboard" primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItem>
              <ListItem button component={Link} to="/blocos" sx={{ borderRadius: 2, mb: 0.5, mx: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 40 }}><BusinessIcon /></ListItemIcon>
                <ListItemText primary="Blocos" primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItem>
              <ListItem button component={Link} to="/pessoas" sx={{ borderRadius: 2, mb: 0.5, mx: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 40 }}><PeopleIcon /></ListItemIcon>
                <ListItemText primary="Moradores" primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItem>
              <ListItem button component={Link} to="/veiculos" sx={{ borderRadius: 2, mb: 0.5, mx: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 40 }}><DirectionsCarIcon /></ListItemIcon>
                <ListItemText primary="Veículos" primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItem>
              <ListItem button component={Link} to="/estoque" sx={{ borderRadius: 2, mb: 0.5, mx: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 40 }}><InventoryIcon /></ListItemIcon>
                <ListItemText primary="Estoque" primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItem>
              <ListItem button component={Link} to="/acordos" sx={{ borderRadius: 2, mb: 0.5, mx: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 40 }}><HandshakeIcon /></ListItemIcon>
                <ListItemText primary="Acordos" primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItem>
              <Divider sx={{ my: 1, mx: 2 }} />
              <ListItem button component={Link} to="/relatorios" sx={{ borderRadius: 2, mb: 0.5, mx: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 40 }}><AssessmentIcon /></ListItemIcon>
                <ListItemText primary="Relatórios" primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItem>
              <ListItem button component={Link} to="/configuracoes" sx={{ borderRadius: 2, mb: 0.5, mx: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 40 }}><SettingsIcon /></ListItemIcon>
                <ListItemText primary="Configurações" primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItem>
            </List>

            <Box sx={{ mt: 'auto', mb: 2, px: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>Versão {appVersion} • SGC Desktop - Desenvolvido por Thiago Almeida
              github.com/LiroLittleDev
              </Typography>
            </Box>
          </Drawer>

          <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
            <Toolbar sx={{ mb: 5 }} />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/blocos" element={<BlocosPage />} />
              <Route path="/pessoa/:pessoaId" element={<PessoaPage />} />
              <Route path="/unidades" element={<UnidadesListPage />} />
              <Route path="/pessoas" element={<PessoasListPage />} />
              <Route path="/veiculos" element={<VeiculosListPage />} />
              <Route path="/unidade/:unidadeId" element={<UnidadePage />} />
              <Route path="/relatorios" element={<ReportsPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
              <Route path="/estoque" element={<EstoquePage />} />
              <Route path="/estoque/produtos" element={<ProdutosPage />} />
              <Route path="/estoque/movimentacoes" element={<MovimentacoesPage />} />
              <Route path="/acordos" element={<AcordosPage />} />
            </Routes>
          </Box>
        </Box>
      </HashRouter>
    </ThemeProvider>
  );
}
