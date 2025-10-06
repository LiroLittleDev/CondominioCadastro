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
  Divider,
  Card,
  CardActionArea,
  Button,
  useTheme,
  useMediaQuery
} from "@mui/material";
import { Link } from "react-router-dom";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import PeopleIcon from "@mui/icons-material/People";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BusinessIcon from "@mui/icons-material/Business";
import AssessmentIcon from "@mui/icons-material/Assessment";

const StatCard = ({ title, value, icon, to }) => (
  <Card elevation={3}>
    <CardActionArea component={Link} to={to} disabled={!to} sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        {icon}
        <Box sx={{ ml: 2 }}>
          <Typography variant="h5" component="div">
            {value}
          </Typography>
          <Typography color="text.secondary">{title}</Typography>
        </Box>
      </Box>
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
      default:
        return null;
    }
  };

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 2 : 0,
        mb: 3
      }}>
        <Typography variant={isMobile ? "h5" : "h4"} gutterBottom={!isMobile}>
          Dashboard
        </Typography>
        
        {/* Botões de Ação Rápida */}
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          flexDirection: isMobile ? 'column' : 'row',
          width: isMobile ? '100%' : 'auto'
        }}>
          <Button
            variant="outlined"
            startIcon={<BusinessIcon />}
            component={Link}
            to="/blocos"
            size={isMobile ? "medium" : "small"}
            fullWidth={isMobile}
          >
            Gerenciar Blocos
          </Button>
          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            component={Link}
            to="/relatorios"
            size={isMobile ? "medium" : "small"}
            fullWidth={isMobile}
          >
            Relatórios
          </Button>
        </Box>
      </Box>
      {loadingStats ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              to="/unidades"
              title="Total de Unidades"
              value={stats.unidades}
              icon={
                <HomeWorkIcon sx={{ fontSize: isMobile ? 32 : 40, color: "primary.main" }} />
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              to="/pessoas"
              title="Total de Pessoas"
              value={stats.pessoas}
              icon={
                <PeopleIcon sx={{ fontSize: isMobile ? 32 : 40, color: "secondary.main" }} />
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              to="/veiculos"
              title="Total de Veículos"
              value={stats.veiculos}
              icon={
                <DirectionsCarIcon
                  sx={{ fontSize: isMobile ? 32 : 40, color: "success.main" }}
                />
              }
            />
          </Grid>
        </Grid>
      )}

      <Divider sx={{ my: 4 }} />

      <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
        Busca Universal
      </Typography>
      <TextField
        fullWidth
        label="Digite um nome, CPF, placa ou unidade..."
        variant="outlined"
        value={termoBusca}
        onChange={(e) => setTermoBusca(e.target.value)}
      />
      {buscando && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {termoBusca.length >= 2 && !buscando && (
        <Paper elevation={3} sx={{ mt: 2 }}>
          <List>
            {resultados.length > 0 ? (
              resultados.map((resultado, index) => (
                <ListItem
                  button
                  key={index}
                  component={Link}
                  to={resultado.path}
                >
                  <ListItemIcon>{getIconPorTipo(resultado.tipo)}</ListItemIcon>
                  <ListItemText
                    primary={resultado.label}
                    secondary={resultado.tipo}
                  />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="Nenhum resultado encontrado." />
              </ListItem>
            )}
          </List>
        </Paper>
      )}
    </Box>
  );
}

export default HomePage;
