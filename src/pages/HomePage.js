import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Paper,
  Grid,
  CircularProgress,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  CardActionArea,
  Button,
  useTheme,
  useMediaQuery,
  Chip,
  Avatar
} from "@mui/material";
import { alpha } from '@mui/material/styles';
import { Drawer, Divider, IconButton, Alert } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SettingsIcon from "@mui/icons-material/Settings";
import { Link } from "react-router-dom";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import PeopleIcon from "@mui/icons-material/People";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BusinessIcon from "@mui/icons-material/Business";
import AssessmentIcon from "@mui/icons-material/Assessment";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CadastroRapidoModal from "../components/CadastroRapidoModal";

const StatCard = ({ title, value, icon, to, color, subtitle }) => (
  <Card 
    elevation={2} 
    sx={{ 
      height: '100%',
      transition: 'all 0.3s ease',
      '&:hover': {
        elevation: 4,
        transform: 'translateY(-2px)'
      }
    }}
  >
    <CardActionArea component={Link} to={to} disabled={!to} sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar sx={{ bgcolor: color, mr: 2, width: 48, height: 48 }}>
            {icon}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: color }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          {title}
        </Typography>
      </CardContent>
    </CardActionArea>
  </Card>
);

function HomePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // --- ESTADOS PARA A BUSCA ---
  const [termoBusca, setTermoBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [cadastroRapidoOpen, setCadastroRapidoOpen] = useState(false);
  // Prompt de primeira execução para criação da estrutura
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupFeedback, setSetupFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      const data = await window.api.getDashboardStats();
      setStats(data);
      setLoadingStats(false);
    };
    fetchStats();
  }, []);

  // Checagem inicial: se não há blocos ainda e o usuário não dispensou o aviso, sugere criar estrutura
  useEffect(() => {
    const checkFirstRun = async () => {
      try {
        const dismissed = localStorage.getItem("setupPromptDismissed");
        if (dismissed === "true") return;
        const blocos = await window.api.getAllBlocos?.();
        if (Array.isArray(blocos) && blocos.length === 0) {
          setSetupOpen(true);
        }
      } catch (e) {
        // Se a API específica não existir, tenta a versão básica
        try {
          const blocosBasic = await window.api.getBlocos();
          if (Array.isArray(blocosBasic) && blocosBasic.length === 0) {
            setSetupOpen(true);
          }
        } catch (_) { /* ignora */ }
      }
    };
    checkFirstRun();
  }, []);

  useEffect(() => {
    if (termoBusca.length < 2) {
      setResultados([]);
      return;
    }

    setBuscando(true);
    const search = async () => {
      const data = await window.api.searchGeral(termoBusca);
      setResultados(data);
      setBuscando(false);
    };

    const delayDebounceFn = setTimeout(() => {
      search();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [termoBusca]);

  const getIconPorTipo = (tipo) => {
    switch (tipo) {
      case "Pessoa":
        return <PeopleIcon />;
      case "Veículo":
        return <DirectionsCarIcon />;
      case "Unidade":
        return <ApartmentIcon />;
      case "Bloco":
        return <BusinessIcon />;
      default:
        return <SearchIcon />;
    }
  };

  const highlightMatch = (text = "") => {
    return text;
  };

  const handleRunSetup = async () => {
    setSetupBusy(true);
    setSetupFeedback({ type: "", message: "" });
    try {
      const result = await window.api.runSetup();
      if (result?.success) {
        setSetupFeedback({ type: "success", message: result.message || "Estrutura criada com sucesso!" });
        // Atualiza stats e fecha o drawer após curto delay
        setTimeout(async () => {
          const data = await window.api.getDashboardStats();
          setStats(data);
          setSetupOpen(false);
        }, 1200);
      } else {
        setSetupFeedback({ type: "error", message: result?.message || "Não foi possível criar a estrutura." });
      }
    } catch (e) {
      setSetupFeedback({ type: "error", message: e.message || "Erro ao criar estrutura." });
    } finally {
      setSetupBusy(false);
    }
  };

  const handleDismissSetup = () => {
    localStorage.setItem("setupPromptDismissed", "true");
    setSetupOpen(false);
  };

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          mb: 4,
          borderRadius: 3,
          position: "relative",
          overflow: "hidden",
          background: (theme) => `radial-gradient(1200px 400px at 10% 10%, ${alpha(theme.palette.primary.contrastText, 0.06)}, transparent), linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: 'primary.contrastText'
        }}
      >

          <Box
            component="svg"
            viewBox="0 0 800 200"
            preserveAspectRatio="none"
            sx={{
              position: "absolute",
              bottom: -10,
              right: -20,
              width: { xs: 300, md: 600 },
              opacity: 0.06,
              transform: "rotate(8deg)",
              zIndex: 0,
              pointerEvents: "none"
            }}
          >
            <path d="M0 100 C150 200 350 0 500 80 C650 160 800 40 800 40 L800 200 L0 200 Z" fill={theme.palette.primary.contrastText} />
          </Box>

          <Grid container spacing={3} alignItems="center" sx={{ position: "relative", zIndex: 1 }}>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 2, justifyContent: { xs: "center", md: "flex-start" } }}>
                <Box
            sx={{
              width: { xs: 72, md: 96 },
              height: { xs: 72, md: 96 },
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.contrastText, 0.12),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mr: 2,
              boxShadow: (theme) => `0 6px 18px ${alpha(theme.palette.primary.main, 0.12)}`
            }}
            aria-hidden="true"
                >
            <HomeWorkIcon sx={{ color: 'primary.contrastText', fontSize: { xs: 40, md: 56 } }} />
                </Box>
                <Box sx={{ textAlign: { xs: "center", md: "left" } }}>
            <Typography variant={isMobile ? 'h3' : 'h2'} sx={{ fontWeight: 'bold', color: 'primary.contrastText', mb: 0.5 }}>
              SGC Desktop
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.95, fontWeight: 400, mb: 1, color: 'primary.contrastText' }}>
              Sistema de Gestão Condominial
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: '560px', color: 'primary.contrastText' }}>
              Gerencie moradores, veículos e unidades de forma simples e eficiente
            </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box
                sx={{
            display: "flex",
            gap: 2,
            flexDirection: { xs: "column", sm: "row", md: "column" },
            justifyContent: "center"
                }}
              >
                <Button
            variant="contained"
            startIcon={<BusinessIcon />}
            component={Link}
            to="/blocos"
            size="large"
            sx={{
              bgcolor: (theme) => alpha(theme.palette.primary.contrastText, 0.12),
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.primary.contrastText, 0.18),
                transform: 'translateY(-3px)'
              },
              backdropFilter: 'blur(6px)',
              border: (theme) => `1px solid ${alpha(theme.palette.primary.contrastText, 0.12)}`,
              borderRadius: 2,
              px: 3,
              py: 1.25,
              transition: 'all 0.25s ease',
              fontWeight: 700
            }}
            fullWidth
                >
            Gerenciar blocos
                </Button>

                <Button
            variant="outlined"
            startIcon={<PersonAddIcon />}
            onClick={() => setCadastroRapidoOpen(true)}
            size="large"
            sx={{
              borderColor: (theme) => alpha(theme.palette.primary.contrastText, 0.22),
              color: 'primary.contrastText',
              '&:hover': {
                borderColor: (theme) => alpha(theme.palette.primary.contrastText, 0.4),
                bgcolor: (theme) => alpha(theme.palette.primary.contrastText, 0.06),
                transform: 'translateY(-3px)'
              },
              borderRadius: 2,
              px: 3,
              py: 1.25,
              transition: 'all 0.25s ease',
              fontWeight: 700
            }}
            fullWidth
                >
            Cadastro rápido
                </Button>

                <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            component={Link}
            to="/relatorios"
            size="large"
            sx={{
              borderColor: (theme) => alpha(theme.palette.primary.contrastText, 0.22),
              color: 'primary.contrastText',
              '&:hover': {
                borderColor: (theme) => alpha(theme.palette.primary.contrastText, 0.4),
                bgcolor: (theme) => alpha(theme.palette.primary.contrastText, 0.06),
                transform: 'translateY(-3px)'
              },
              borderRadius: 2,
              px: 3,
              py: 1.25,
              transition: 'all 0.25s ease',
              fontWeight: 700
            }}
            fullWidth
                >
            Relatórios
                </Button>
              </Box>
            </Grid>
          </Grid>
              </Paper>

              {loadingStats ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
              ) : (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard to="/unidades" title="Unidades" subtitle="Apartamentos" value={stats.unidades} color="primary.main" icon={<HomeWorkIcon />} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard to="/pessoas" title="Moradores" subtitle="Cadastros ativos" value={stats.pessoas} color="secondary.main" icon={<PeopleIcon />} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard to="/veiculos" title="Veículos" subtitle="Registrados" value={stats.veiculos} color="success.main" icon={<DirectionsCarIcon />} />
            </Grid>
          </Grid>
              )}

              <Paper
          elevation={2}
          sx={{
            p: { xs: 3, md: 4 },
            mb: 4,
            borderRadius: 3,
            background: "linear-gradient(180deg, #ffffff 0%, #fbfdfe 100%)",
            border: "1px solid rgba(0,0,0,0.04)"
          }}
              >
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "primary.main",
                color: "white",
                mr: 2,
                display: "flex",
                alignItems: "center",
                boxShadow: "0 6px 18px rgba(102,126,234,0.12)"
              }}
            >
              <SearchIcon />
            </Box>

            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                Busca Global
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Encontre moradores, veículos, unidades e blocos em instantes.
              </Typography>
            </Box>

            <Chip
              label="⚡ Instantânea"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, borderRadius: 1.5, ml: 2 }}
            />
          </Box>

          <TextField
            fullWidth
            placeholder="Busque por nome, CPF, placa, unidade ou bloco..."
            variant="outlined"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, color: "text.secondary", display: "flex", alignItems: "center" }}>
            <SearchIcon />
                </Box>
              )
            }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: "white",
                transition: "all 0.25s ease",
                '&:hover': { boxShadow: "0 6px 20px rgba(0,0,0,0.06)" },
                '&.Mui-focused': { boxShadow: "0 8px 28px rgba(102,126,234,0.18)" }
              },
              '& .MuiOutlinedInput-input': { py: 1.5, fontSize: "1.05rem" }
            }}
          />

          {buscando && (
            <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {termoBusca.length >= 2 && !buscando && (
            <Paper elevation={0} sx={{ overflow: "hidden", borderRadius: 2 }}>
              <List disablePadding>
                {resultados.length > 0 ? (
            resultados.map((resultado, index) => (
              <ListItem
                button
                key={index}
                component={Link}
                to={resultado.path}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  px: { xs: 2, md: 3 },
                  py: 1.5,
                  '&:hover': { bgcolor: "action.hover", transform: "translateX(6px)", transition: "all 0.18s ease" },
                  borderBottom: index < resultados.length - 1 ? "1px solid" : "none",
                  borderColor: "divider"
                }}
              >
                <ListItemIcon sx={{ minWidth: 44 }}>
                  <Avatar
              sx={{
                bgcolor:
                  resultado.tipo === "Pessoa"
                    ? "secondary.main"
                    : resultado.tipo === "Veículo"
                    ? "success.main"
                    : resultado.tipo === "Bloco"
                    ? "warning.main"
                    : "primary.main",
                width: 36,
                height: 36
              }}
                  >
              {getIconPorTipo(resultado.tipo)}
                  </Avatar>
                </ListItemIcon>

                <ListItemText
                  primary={<Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>{highlightMatch(resultado.label)}</Box>}
                  secondary={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Chip
                  label={resultado.tipo}
                  size="small"
                  variant="outlined"
                  color={resultado.tipo === "Pessoa" ? "secondary" : resultado.tipo === "Veículo" ? "success" : "primary"}
                  sx={{ height: 26, fontWeight: 600 }}
                />
                {resultado.sub && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {resultado.sub}
                  </Typography>
                )}
              </Box>
                  }
                />
              </ListItem>
            ))
                ) : (
            <ListItem sx={{ textAlign: "center", py: 4 }}>
              <ListItemText primary="Nenhum resultado encontrado." secondary="Tente outro termo ou verifique os filtros." />
            </ListItem>
                )}
              </List>
            </Paper>
          )}
              </Paper>

              <CadastroRapidoModal
          open={cadastroRapidoOpen}
          handleClose={() => setCadastroRapidoOpen(false)}
          onSuccess={() => {
          const fetchStats = async () => {
            const data = await window.api.getDashboardStats();
            setStats(data);
          };
          fetchStats();
        }}
      />

              {/* Drawer lateral para configuração inicial */}
              <Drawer anchor="right" open={setupOpen} onClose={handleDismissSetup} PaperProps={{ sx: { width: { xs: 340, sm: 420 } } }}>
                <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <SettingsIcon color="primary" />
                    <Typography variant="h6">Configuração inicial</Typography>
                  </Box>
                  <IconButton onClick={handleDismissSetup} aria-label="Fechar">
                    <CloseIcon />
                  </IconButton>
                </Box>
                <Divider />
                <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
                  <Typography variant="body1">
                    Não encontramos a estrutura do condomínio. Você pode criar automaticamente agora ou acessar as configurações para personalizar depois. Esta ação serve para criar o banco de dados de armazenamento de todo o sistema.
                  </Typography>
                  {setupFeedback.message && (
                    <Alert severity={setupFeedback.type}>
                      {setupFeedback.message}
                    </Alert>
                  )}
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
                    <Button variant="contained" onClick={handleRunSetup} disabled={setupBusy} startIcon={<SettingsIcon />}> 
                      {setupBusy ? <CircularProgress size={22} sx={{ color: "white" }} /> : "Criar estrutura agora"}
                    </Button>
                    <Button variant="outlined" component={Link} to="/settings">
                      Abrir configurações
                    </Button>
                    <Button variant="text" onClick={handleDismissSetup} color="inherit">
                      Lembrar mais tarde
                    </Button>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Esta ação criará blocos, entradas e unidades padrão. Você poderá editar depois.
                    </Typography>
                  </Box>
                </Box>
              </Drawer>
    </Box>
  );
}

export default HomePage;
