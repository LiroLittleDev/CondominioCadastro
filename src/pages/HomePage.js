import React, { useState, useEffect } from 'react';
import { Typography, Box, Paper, Grid, CircularProgress, TextField, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PeopleIcon from '@mui/icons-material/People';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ApartmentIcon from '@mui/icons-material/Apartment';

// --- (O componente StatCard continua o mesmo) ---
const StatCard = ({ title, value, icon }) => (
  <Paper elevation={3} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
    {icon}
    <Box sx={{ ml: 2 }}>
      <Typography variant="h5" component="div">{value}</Typography>
      <Typography color="text.secondary">{title}</Typography>
    </Box>
  </Paper>
);

function HomePage() {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // --- NOVOS ESTADOS PARA A BUSCA ---
  const [termoBusca, setTermoBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  // Efeito para buscar as estatísticas iniciais
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      const data = await window.api.getDashboardStats();
      setStats(data);
      setLoadingStats(false);
    };
    fetchStats();
  }, []);

  // --- NOVO EFEITO PARA REALIZAR A BUSCA ---
  useEffect(() => {
    // Não busca se o termo for muito curto
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

    // Um pequeno atraso (debounce) para não buscar a cada letra digitada
    const delayDebounceFn = setTimeout(() => {
      search();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [termoBusca]);
  
  const getIconPorTipo = (tipo) => {
    switch (tipo) {
      case 'Pessoa': return <PeopleIcon />;
      case 'Veículo': return <DirectionsCarIcon />;
      case 'Unidade': return <ApartmentIcon />;
      default: return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      {loadingStats ? <CircularProgress /> : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* ... (Os Grid items dos StatCards continuam os mesmos) ... */}
          <Grid item xs={12} md={4}><StatCard title="Total de Unidades" value={stats.unidades} icon={<HomeWorkIcon sx={{ fontSize: 40, color: 'primary.main' }} />} /></Grid>
          <Grid item xs={12} md={4}><StatCard title="Total de Pessoas" value={stats.pessoas} icon={<PeopleIcon sx={{ fontSize: 40, color: 'secondary.main' }} />} /></Grid>
          <Grid item xs={12} md={4}><StatCard title="Total de Veículos" value={stats.veiculos} icon={<DirectionsCarIcon sx={{ fontSize: 40, color: 'success.main' }} />} /></Grid>
        </Grid>
      )}

      <Divider sx={{ my: 4 }} />

      {/* --- NOVA SEÇÃO DE BUSCA --- */}
      <Typography variant="h5" gutterBottom>Busca Universal</Typography>
      <TextField
        fullWidth
        label="Digite um nome, CPF, placa ou unidade..."
        variant="outlined"
        value={termoBusca}
        onChange={(e) => setTermoBusca(e.target.value)}
      />
      {buscando && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress /></Box>}
      
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
                  <ListItemText primary={resultado.label} secondary={resultado.tipo} />
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