import React from "react";
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
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import BusinessIcon from "@mui/icons-material/Business";

import SettingsIcon from "@mui/icons-material/Settings";

// Imports do roteador
import { HashRouter, Routes, Route, Link } from "react-router-dom";

// Importa nossas páginas
import HomePage from "./pages/HomePage";
import UnidadePage from "./pages/UnidadePage";
import BlocosPage from "./pages/BlocosPage";import PessoaPage from './pages/PessoaPage';
import SettingsPage from "./pages/SettingsPage";

const drawerWidth = 240;

function App() {
  return (
    // O HashRouter envolve toda a aplicação para controlar a navegação
    <HashRouter>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{
            width: `calc(100% - ${drawerWidth}px)`,
            ml: `${drawerWidth}px`,
          }}
        >
          <Toolbar>
            <Typography variant="h6" noWrap component="div">
              Sistema de Gestão Condominial
            </Typography>
          </Toolbar>
        </AppBar>

        <Drawer
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
          variant="permanent"
          anchor="left"
        >
          <Toolbar />
          <List>
            {/* Cada ListItem agora é um Link que aponta para uma rota */}
            <ListItem button component={Link} to="/">
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText primary="Início" />
            </ListItem>

            <ListItem button component={Link} to="/blocos">
              <ListItemIcon>
                <BusinessIcon />
              </ListItemIcon>
              <ListItemText primary="Blocos" />
            </ListItem>

            <ListItem button component={Link} to="/configuracoes">
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Configurações" />
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
            <Route path="/unidade/:unidadeId" element={<UnidadePage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Routes>
        </Box>
      </Box>
    </HashRouter>
  );
}

export default App;
