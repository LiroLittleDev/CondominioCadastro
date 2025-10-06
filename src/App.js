import React, { useState } from "react";
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
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Button,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeIcon from "@mui/icons-material/Home";
import BusinessIcon from "@mui/icons-material/Business";
import AssessmentIcon from "@mui/icons-material/Assessment";
import SettingsIcon from "@mui/icons-material/Settings";
import PeopleIcon from "@mui/icons-material/People";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";

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

// Importa contexto e componentes de auth
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginModal from "./components/LoginModal";
import SplashScreen from "./components/SplashScreen";

const drawerWidth = 240;

function AppContent() {
  const { user, logout, isLoggedIn, loading, showSplash } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // Mostrar tela de splash durante carregamento
  if (showSplash || loading) {
    return <SplashScreen />;
  }

  // Exigir login se não estiver logado
  if (!isLoggedIn()) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <Paper elevation={8} sx={{ p: 4, maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <Box
            component="img"
            src="https://cdn-icons-png.flaticon.com/512/2830/2830284.png"
            alt="SGC Logo"
            sx={{ width: 80, height: 80, mb: 2, opacity: 0.8 }}
          />
          <Typography variant="h4" gutterBottom color="primary">
            SGC Desktop
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Sistema de Gestão Condominial
          </Typography>
          <Button 
            variant="contained" 
            size="large" 
            fullWidth
            onClick={() => setLoginOpen(true)}
            startIcon={<LoginIcon />}
          >
            Fazer Login
          </Button>
        </Paper>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </Box>
    );
  }

  const handleUserMenuClick = (event) => {
    if (isLoggedIn()) {
      setAnchorEl(event.currentTarget);
    } else {
      setLoginOpen(true);
    }
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleUserMenuClose();
  };

  return (
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            width: `calc(100% - ${drawerWidth}px)`,
            ml: `${drawerWidth}px`,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <Toolbar sx={{ minHeight: '70px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
              <Box
                component="img"
                src="https://cdn-icons-png.flaticon.com/512/2830/2830284.png"
                alt="SGC Logo"
                sx={{
                  width: 32,
                  height: 32,
                  filter: 'brightness(0) invert(1)'
                }}
              />
              <Box>
                <Typography 
                  variant="h6" 
                  noWrap 
                  component="div"
                  sx={{ 
                    fontWeight: 600,
                    fontSize: '1.3rem',
                    textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                  }}
                >
                  Sistema de Gestão Condominial
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    opacity: 0.8,
                    fontSize: '0.75rem'
                  }}
                >
                  Versão 2.3.0 • SGC Desktop
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isLoggedIn() && (
                <Chip 
                  label={user?.role === 'admin' ? 'Administrador' : 'Usuário'} 
                  size="small" 
                  sx={{
                    bgcolor: user?.role === 'admin' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(33, 150, 243, 0.2)',
                    color: user?.role === 'admin' ? '#4CAF50' : '#2196F3',
                    border: user?.role === 'admin' ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(33, 150, 243, 0.3)',
                    fontWeight: 600
                  }}
                />
              )}
              <IconButton 
                color="inherit" 
                onClick={handleUserMenuClick}
                sx={{ color: 'white' }}
              >
                {isLoggedIn() ? <AccountCircleIcon /> : <LoginIcon />}
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Drawer
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
              borderRight: '1px solid rgba(0,0,0,0.08)'
            },
          }}
          variant="permanent"
          anchor="left"
        >
          <Toolbar sx={{ minHeight: '70px !important', justifyContent: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Avatar 
                sx={{ 
                  width: 48, 
                  height: 48, 
                  bgcolor: 'primary.main',
                  mb: 1,
                  mx: 'auto'
                }}
              >
                🏢
              </Avatar>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                SGC Desktop
              </Typography>
            </Box>
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
        </Drawer>

        {/* Área de Conteúdo Principal */}
        <Box
          component="main"
          sx={{ flexGrow: 1, bgcolor: "background.default", p: 3 }}
        >
          <Toolbar />

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
          </Routes>
        </Box>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleUserMenuClose}
        >
          <MenuItem onClick={handleUserMenuClose}>
            <AccountCircleIcon sx={{ mr: 1 }} />
            {user?.name}
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1 }} />
            Sair
          </MenuItem>
        </Menu>
        
        <LoginModal 
          open={loginOpen} 
          onClose={() => setLoginOpen(false)} 
        />
      </Box>
  );
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
