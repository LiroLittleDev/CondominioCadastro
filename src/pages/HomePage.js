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
import { Link } from "react-router-dom";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import PeopleIcon from "@mui/icons-material/People";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BusinessIcon from "@mui/icons-material/Business";
import AssessmentIcon from "@mui/icons-material/Assessment";
import SearchIcon from "@mui/icons-material/Search";

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

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      const data = await window.api.getDashboardStats();
      setStats(data);
      setLoadingStats(false);
    };
    fetchStats();
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

  return (
    <Box>
      {/* Header do Dashboard */}
      <Paper elevation={1} sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 2 : 0
        }}>
          <Box>
            <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: 'bold', mb: 1 }}>
              SGC Dashboard
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Sistema de Gestão Condominial - Visão Geral
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            flexDirection: isMobile ? 'column' : 'row',
            width: isMobile ? '100%' : 'auto'
          }}>
            <Button
              variant="contained"
              startIcon={<BusinessIcon />}
              component={Link}
              to="/blocos"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                backdropFilter: 'blur(10px)'
              }}
              fullWidth={isMobile}
            >
              Gerenciar Blocos
            </Button>
            <Button
              variant="contained"
              startIcon={<AssessmentIcon />}
              component={Link}
              to="/relatorios"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                backdropFilter: 'blur(10px)'
              }}
              fullWidth={isMobile}
            >
              Relatórios
            </Button>
          </Box>
        </Box>
      </Paper>
      {loadingStats ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              to="/unidades"
              title="Unidades Cadastradas"
              subtitle="Apartamentos no condomínio"
              value={stats.unidades}
              color="primary.main"
              icon={<HomeWorkIcon />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              to="/pessoas"
              title="Moradores Ativos"
              subtitle="Pessoas cadastradas"
              value={stats.pessoas}
              color="secondary.main"
              icon={<PeopleIcon />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              to="/veiculos"
              title="Veículos Registrados"
              subtitle="Carros e motos"
              value={stats.veiculos}
              color="success.main"
              icon={<DirectionsCarIcon />}
            />
          </Grid>
        </Grid>
      )}

      {/* Seção de Busca */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SearchIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 500 }}>
            Busca Universal
          </Typography>
          <Chip 
            label="Rápida" 
            size="small" 
            color="primary" 
            sx={{ ml: 2 }}
          />
        </Box>
        <TextField
          fullWidth
          label="Digite um nome, CPF, placa, unidade ou bloco..."
          variant="outlined"
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        />
      </Paper>
      {buscando && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {termoBusca.length >= 2 && !buscando && (
        <Paper elevation={2} sx={{ overflow: 'hidden' }}>
          <List disablePadding>
            {resultados.length > 0 ? (
              resultados.map((resultado, index) => (
                <ListItem
                  button
                  key={index}
                  component={Link}
                  to={resultado.path}
                  sx={{
                    '&:hover': {
                      bgcolor: 'action.hover',
                      transform: 'translateX(4px)',
                      transition: 'all 0.2s ease'
                    },
                    borderBottom: index < resultados.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider'
                  }}
                >
                  <ListItemIcon>
                    <Avatar sx={{ 
                      bgcolor: resultado.tipo === 'Pessoa' ? 'secondary.main' : 
                               resultado.tipo === 'Veículo' ? 'success.main' : 
                               resultado.tipo === 'Bloco' ? 'warning.main' : 'primary.main',
                      width: 32,
                      height: 32
                    }}>
                      {getIconPorTipo(resultado.tipo)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={resultado.label}
                    secondary={
                      <Chip 
                        label={resultado.tipo} 
                        size="small" 
                        variant="outlined"
                        color={resultado.tipo === 'Pessoa' ? 'secondary' : 
                               resultado.tipo === 'Veículo' ? 'success' : 'primary'}
                      />
                    }
                  />
                </ListItem>
              ))
            ) : (
              <ListItem sx={{ textAlign: 'center', py: 3 }}>
                <ListItemText 
                  primary="Nenhum resultado encontrado" 
                  secondary="Tente buscar por nome, CPF, placa ou número da unidade"
                />
              </ListItem>
            )}
          </List>
        </Paper>
      )}
    </Box>
  );
}

export default HomePage;
