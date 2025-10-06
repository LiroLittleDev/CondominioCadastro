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
      {/* Hero Section */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 4, 
          mb: 4, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          color: 'white',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Particles Background */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          '&::before': {
            content: '""',
            position: 'absolute',
            width: '100px',
            height: '100px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            top: '10%',
            right: '10%',
            animation: 'float 6s ease-in-out infinite'
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            width: '60px',
            height: '60px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '50%',
            bottom: '20%',
            left: '15%',
            animation: 'float 8s ease-in-out infinite reverse'
          },
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-20px)' }
          },
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.05)' }
          }
        }} />
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 3 : 0,
          position: 'relative',
          zIndex: 1
        }}>
          <Box sx={{ textAlign: isMobile ? 'center' : 'left' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <Box
                component="img"
                src="https://cdn-icons-png.flaticon.com/512/2830/2830284.png"
                alt="SGC Logo"
                sx={{
                  width: { xs: 48, sm: 64 },
                  height: { xs: 48, sm: 64 },
                  filter: 'brightness(0) invert(1)',
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              />
              <Typography 
                variant={isMobile ? "h3" : "h2"} 
                sx={{ 
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #fff 30%, #f0f0f0 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
              >
                SGC Desktop
              </Typography>
            </Box>
            <Typography 
              variant="h6" 
              sx={{ 
                opacity: 0.9,
                fontWeight: 300,
                mb: 1
              }}
            >
              Sistema de Gestão Condominial
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                opacity: 0.8,
                maxWidth: '400px'
              }}
            >
              Gerencie moradores, veículos e unidades de forma simples e eficiente
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            flexDirection: isMobile ? 'column' : 'row',
            width: isMobile ? '100%' : 'auto'
          }}>
            <Button
              variant="contained"
              startIcon={<BusinessIcon />}
              component={Link}
              to="/blocos"
              size="large"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.15)', 
                '&:hover': { 
                  bgcolor: 'rgba(255,255,255,0.25)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
                },
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 2,
                px: 3,
                py: 1.5,
                transition: 'all 0.3s ease',
                fontWeight: 600
              }}
              fullWidth={isMobile}
            >
              Gerenciar Blocos
            </Button>
            <Button
              variant="outlined"
              startIcon={<AssessmentIcon />}
              component={Link}
              to="/relatorios"
              size="large"
              sx={{ 
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'white',
                '&:hover': { 
                  borderColor: 'rgba(255,255,255,0.5)',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  transform: 'translateY(-2px)'
                },
                borderRadius: 2,
                px: 3,
                py: 1.5,
                transition: 'all 0.3s ease',
                fontWeight: 600
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
      <Paper 
        elevation={2} 
        sx={{ 
          p: 4, 
          mb: 4,
          borderRadius: 3,
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'white',
            mr: 2,
            display: 'flex',
            alignItems: 'center'
          }}>
            <SearchIcon />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
              Busca Universal
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Encontre rapidamente moradores, veículos, unidades e blocos
            </Typography>
          </Box>
          <Chip 
            label="⚡ Rápida" 
            size="small" 
            color="primary" 
            variant="outlined"
            sx={{ 
              fontWeight: 600,
              '& .MuiChip-label': {
                px: 1
              }
            }}
          />
        </Box>
        <TextField
          fullWidth
          placeholder="Digite um nome, CPF, placa, unidade ou bloco..."
          variant="outlined"
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          InputProps={{
            startAdornment: (
              <Box sx={{ mr: 1, color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                <SearchIcon />
              </Box>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: 'white',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                '& fieldset': {
                  borderColor: 'primary.main',
                }
              },
              '&.Mui-focused': {
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.25)',
                '& fieldset': {
                  borderWidth: '2px'
                }
              }
            },
            '& .MuiOutlinedInput-input': {
              py: 1.5,
              fontSize: '1.1rem'
            }
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
