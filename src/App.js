import React, { useState, useEffect, useRef } from "react";
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
  CssBaseline,
  Divider,
  Avatar,
  Chip,
  Tooltip,
  LinearProgress
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import BusinessIcon from "@mui/icons-material/Business";
import AssessmentIcon from "@mui/icons-material/Assessment";
import SettingsIcon from "@mui/icons-material/Settings";
import PeopleIcon from "@mui/icons-material/People";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import InventoryIcon from "@mui/icons-material/Inventory";
import HandshakeIcon from "@mui/icons-material/Handshake";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import UpdateIcon from '@mui/icons-material/Update';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import BackupIcon from '@mui/icons-material/Backup';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';

// Imports do roteador
import { HashRouter, Routes, Route, Link } from "react-router-dom";

// Importa nossas páginas
import HomePage from "./pages/HomePage";
import UnidadePage from "./pages/UnidadePage";
import ReportsPage from "./pages/ReportsPage";
import PessoasListPage from "./pages/PessoasListPage";
import VeiculosListPage from "./pages/VeiculosListPage";
import UnidadesListPage from "./pages/UnidadesListPage";
import BlocosPage from "./pages/BlocosPage";
import PessoaPage from "./pages/PessoaPage";
import SettingsPage from "./pages/SettingsPage";
import EstoquePage from "./pages/EstoquePage";
import ProdutosPage from "./pages/ProdutosPage";
import MovimentacoesPage from "./pages/MovimentacoesPage";
import AcordosPage from "./pages/AcordosPage";

const drawerWidth = 240;

function App() {
  // Referência de quando a aplicação iniciou (não muda durante o ciclo de vida)
  const appStartRef = useRef(new Date());
  const [accessHistory, setAccessHistory] = useState([]); // histórico completo de acessos
  const [acordosPendentes, setAcordosPendentes] = useState(null); // null => loading
  const [updatingAcordos, setUpdatingAcordos] = useState(false);
  const acordosUpdateTimer = useRef(null);
  const [lastBackup, setLastBackup] = useState(null);
  const backupTimerRef = useRef(null);
  const sessionsCount = accessHistory.length; // total de aberturas registradas

  // Formatação de data/hora compacta
  const formatDateTime = (dt) => {
    try {
      return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '-'; }
  };

  // Formatação enxuta para o chip de backup (dd/MM HH:MM)
  const formatShortDateTime = (dt) => {
    try {
      return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '-'; }
  };

  // Histórico de acessos: mantemos um array único persistido em localStorage
  // - accessHistory: array de ISO strings (ordem cronológica)
  useEffect(() => {
    try {
      const nowIso = new Date().toISOString();
      let history = [];
      try {
        const raw = localStorage.getItem('accessHistory');
        if (raw) history = JSON.parse(raw);
        if (!Array.isArray(history)) history = [];
      } catch(_) { history = []; }

      // (mantido somente o histórico; se for necessário exibir o último acesso futuramente, basta pegar o penúltimo item)

      // Guard para evitar execução duplicada em modo desenvolvimento (React 18 StrictMode)
      if (!sessionStorage.getItem('accessSessionLogged')) {
        history.push(nowIso);
        if (history.length > 200) history = history.slice(history.length - 200);
        localStorage.setItem('accessHistory', JSON.stringify(history));
        sessionStorage.setItem('accessSessionLogged', '1');
      }

      setAccessHistory(history);
    } catch (e) { /* silencioso */ }
  }, []);

  const fetchLastBackup = async () => {
    try {
      // Prioriza API (caso expose schedule.lastRun)
      if (window.api && typeof window.api.getBackupSchedule === 'function') {
        const res = await window.api.getBackupSchedule();
        if (res && res.success && res.schedule && res.schedule.lastRun) {
          setLastBackup(new Date(res.schedule.lastRun));
          localStorage.setItem('lastBackupRun', res.schedule.lastRun);
          return;
        }
      }
      // Fallback localStorage
      const stored = localStorage.getItem('lastBackupRun');
      if (stored) setLastBackup(new Date(stored));
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    fetchLastBackup();
    backupTimerRef.current = setInterval(fetchLastBackup, 120000); // a cada 2 minutos
    const handler = (e) => {
      if (e && e.detail) {
        try { setLastBackup(new Date(e.detail)); } catch(_) {}
      } else {
        fetchLastBackup();
      }
    };
    window.addEventListener('backup:done', handler);
    return () => { 
      if (backupTimerRef.current) clearInterval(backupTimerRef.current); 
      window.removeEventListener('backup:done', handler);
    };
  }, []);

  const fetchAcordosPendentes = async () => {
    if (!window?.electronAPI?.invoke) return;
    try {
      setUpdatingAcordos(true);
      // Consideramos "pendentes" os acordos com status 'Ativo'
      const ativos = await window.electronAPI.invoke('get-acordos', { status: 'Ativo' });
      setAcordosPendentes(Array.isArray(ativos) ? ativos.length : 0);
    } catch (e) {
      console.warn('Falha ao obter acordos pendentes', e);
      setAcordosPendentes(0);
    } finally {
      setUpdatingAcordos(false);
    }
  };

  // Buscar inicialmente e configurar intervalo leve (ex: 60s)
  useEffect(() => {
    fetchAcordosPendentes();
    acordosUpdateTimer.current = setInterval(fetchAcordosPendentes, 60000);
    return () => {
      if (acordosUpdateTimer.current) clearInterval(acordosUpdateTimer.current);
    };
  }, []);

  // Listener central de mudanças globais (se disponível) para atualizar imediatamente
  useEffect(() => {
    if (window.api && typeof window.api.onDataChanged === 'function') {
      const unsub = window.api.onDataChanged(() => {
        fetchAcordosPendentes();
      });
      return () => { try { if (typeof unsub === 'function') unsub(); } catch (_) { /* ignore */ } };
    }
  }, []);
  return (
    // O HashRouter envolve toda a aplicação para controlar a navegação
    <HashRouter>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            width: `calc(100% - ${drawerWidth}px)`,
            ml: `${drawerWidth}px`,
            background: 'rgba(147, 67, 244, 0.9)',
            backdropFilter: 'blur(6px)',
            border: '5px solid rgba(255,255,255,0.15)'
          }}
        >
          <Toolbar sx={{
            minHeight: '82px !important',
            justifyContent: 'space-between',
            px: 3,
            position: 'relative'
          }}>
            {/* Linha decorativa superior */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                <DashboardCustomizeIcon sx={{ color: 'white', opacity: 0.95, fontSize: 30, filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }} />
                <Typography
                  variant="h6"
                  noWrap
                  component="div"
                  sx={{
                    fontWeight: 700,
                    fontSize: '1.35rem',
                    letterSpacing: '.5px',
                    color: '#fff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.35)'
                  }}
                >
                  Sistema de Gestão Condominial
                </Typography>
              </Box>
            </Box>

            {/* Métricas */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Tooltip title="Acordos com status Ativo" arrow>
                <Chip
                  icon={<PendingActionsIcon sx={{ color: 'inherit' }} />}
                  label={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography component="span" sx={{ fontSize: '.70rem', mr: .5, opacity: 0.8 }}>Acordos pendentes</Typography>
                      <Typography component="span" sx={{ fontWeight: 700, fontSize: '.8rem' }}>{acordosPendentes === null ? '...' : acordosPendentes}</Typography>
                    </Box>
                  }
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    '.MuiChip-icon': { color: 'rgba(255,255,255,0.9)' },
                    border: '1px solid rgba(255,255,255,0.25)' }
                }
                />
              </Tooltip>

              <Tooltip title={lastBackup ? `Último backup em ${formatDateTime(lastBackup)}` : 'Nenhum backup registrado'} arrow>
                <Chip
                  icon={<BackupIcon sx={{ color: 'inherit' }} />}
                  label={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography component="span" sx={{ fontSize: '.70rem', mr: .5, opacity: 0.8 }}>Backup</Typography>
                      <Typography component="span" sx={{ fontWeight: 600, fontSize: '.70rem' }}>{
                        lastBackup ? formatShortDateTime(lastBackup) : 'Nunca'
                      }</Typography>
                    </Box>
                  }
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', '.MuiChip-icon': { color: 'rgba(255,255,255,0.9)' }, border: '1px solid rgba(255,255,255,0.25)' }}
                />
              </Tooltip>

              <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, pl: 1, ml: 1, borderLeft: '1px solid rgba(255,255,255,0.25)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccessTimeIcon sx={{ fontSize: 14, opacity: 0.8, color: 'white' }} />
                  <Typography component="span" sx={{ fontSize: '.68rem', opacity: 0.8 }}>Início:</Typography>
                  <Typography component="span" sx={{ fontSize: '.68rem', fontWeight: 600, color: 'white' }}>{formatDateTime(appStartRef.current)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                  <UpdateIcon sx={{ fontSize: 14, opacity: 0.8, color: 'white' }} />
                  <Typography component="span" sx={{ fontSize: '.68rem', opacity: 0.8 }}>Aberturas:</Typography>
                  <Typography component="span" sx={{ fontSize: '.68rem', fontWeight: 600, color: 'white' }}>{sessionsCount > 0 ? sessionsCount : '—'}</Typography>
                </Box>
              </Box>
            </Box>

            {updatingAcordos && (
              <Box sx={{ position: 'absolute', left: 0, bottom: 0, width: '100%' }}>
                <LinearProgress sx={{ height: 2, bgcolor: 'rgba(255,255,255,0.15)', '& .MuiLinearProgress-bar': { backgroundColor: '#ffcc33' } }} />
              </Box>
            )}

            <style>
              {`
                @keyframes float {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-6px); }
                }
              `}
            </style>
          </Toolbar>
        </AppBar>

        <Drawer
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
              borderRight: '1px solid rgba(0,0,0,0.08)'
            },
          }}
          variant="permanent"
          anchor="left"
        >
          <Toolbar sx={{ minHeight: '80px !important', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '10px 0' }}>
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Avatar 
                sx={{
                  marginTop: 2,
                  width: 48, 
                  height: 48, 
                  bgcolor: 'primary.main',
                  mb: 1,
                  mx: 'auto',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                  animation: 'float 3s ease-in-out infinite'
                }}
              >
                <HomeWorkIcon sx={{  color: "white", fontSize: { xs: 30, md: 30 } }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              SGC Desktop
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}>
                Sistema de Gestão Condominial
              </Typography>
            </Box>
            <style>
              {`
                @keyframes float {
                  0%, 100% {
                    transform: translateY(0);
                  }
                  50% {
                    transform: translateY(-10px);
                  }
                }
              `}
            </style>
          </Toolbar>
          <Divider sx={{ mx: 2, mb: 1 }} />
          <List sx={{ px: 1 }}>
            {/* Cada ListItem agora é um Link que aponta para uma rota */}
            <ListItem 
              button 
              component={Link} 
              to="/"
              sx={{
                borderRadius: 2,
                mb: 0.5,
                mx: 0.5,
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  transform: 'translateX(4px)',
                  '& .MuiListItemIcon-root': {
                    color: 'white'
                  }
                },
                transition: 'all 0.3s ease'
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Dashboard" 
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItem>

            <ListItem 
              button 
              component={Link} 
              to="/blocos"
              sx={{
                borderRadius: 2,
                mb: 0.5,
                mx: 0.5,
                '&:hover': {
                  bgcolor: 'secondary.main',
                  color: 'white',
                  transform: 'translateX(4px)',
                  '& .MuiListItemIcon-root': {
                    color: 'white'
                  }
                },
                transition: 'all 0.3s ease'
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <BusinessIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Blocos" 
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItem>

            <ListItem 
              button 
              component={Link} 
              to="/pessoas"
              sx={{
                borderRadius: 2,
                mb: 0.5,
                mx: 0.5,
                '&:hover': {
                  bgcolor: 'success.main',
                  color: 'white',
                  transform: 'translateX(4px)',
                  '& .MuiListItemIcon-root': {
                    color: 'white'
                  }
                },
                transition: 'all 0.3s ease'
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <PeopleIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Moradores" 
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItem>

            <ListItem 
              button 
              component={Link} 
              to="/veiculos"
              sx={{
                borderRadius: 2,
                mb: 0.5,
                mx: 0.5,
                '&:hover': {
                  bgcolor: 'warning.main',
                  color: 'white',
                  transform: 'translateX(4px)',
                  '& .MuiListItemIcon-root': {
                    color: 'white'
                  }
                },
                transition: 'all 0.3s ease'
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <DirectionsCarIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Veículos" 
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItem>

            <ListItem 
              button 
              component={Link} 
              to="/estoque"
              sx={{
                borderRadius: 2,
                mb: 0.5,
                mx: 0.5,
                '&:hover': {
                  bgcolor: 'error.main',
                  color: 'white',
                  transform: 'translateX(4px)',
                  '& .MuiListItemIcon-root': {
                    color: 'white'
                  }
                },
                transition: 'all 0.3s ease'
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <InventoryIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Estoque" 
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItem>

            <ListItem 
              button 
              component={Link} 
              to="/acordos"
              sx={{
                borderRadius: 2,
                mb: 0.5,
                mx: 0.5,
                '&:hover': {
                  bgcolor: 'purple',
                  color: 'white',
                  transform: 'translateX(4px)',
                  '& .MuiListItemIcon-root': {
                    color: 'white'
                  }
                },
                transition: 'all 0.3s ease'
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <HandshakeIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Acordos" 
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItem>

            <Divider sx={{ my: 1, mx: 2 }} />

            <ListItem 
              button 
              component={Link} 
              to="/relatorios"
              sx={{
                borderRadius: 2,
                mb: 0.5,
                mx: 0.5,
                '&:hover': {
                  bgcolor: 'info.main',
                  color: 'white',
                  transform: 'translateX(4px)',
                  '& .MuiListItemIcon-root': {
                    color: 'white'
                  }
                },
                transition: 'all 0.3s ease'
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <AssessmentIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Relatórios" 
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItem>

            <ListItem 
              button 
              component={Link} 
              to="/configuracoes"
              sx={{
                borderRadius: 2,
                mb: 0.5,
                mx: 0.5,
                '&:hover': {
                  bgcolor: 'grey.600',
                  color: 'white',
                  transform: 'translateX(4px)',
                  '& .MuiListItemIcon-root': {
                    color: 'white'
                  }
                },
                transition: 'all 0.3s ease'
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Configurações" 
                primaryTypographyProps={{ fontWeight: 500 }}
              />
            </ListItem>
          </List>

          <Box sx={{ mt: 'auto', mb: 2, px: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              Versão 3.7.0 • SGC Desktop - Desenvolvido por Thiago Almeida
              github.com/lirolittledev
            </Typography>
          </Box>
        </Drawer>

        {/* Área de Conteúdo Principal */}
        <Box
          component="main"
          sx={{ flexGrow: 1, bgcolor: "background.default", p: 3 }}
        >
          <Toolbar sx={{ mb:5 }} />

          {/* O componente Routes decide qual página renderizar com base na URL */}
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
  );
}

export default App;
