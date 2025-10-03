import React, { useState, useEffect, useCallback } from 'react';
import { Typography, List, ListItem, ListItemIcon, ListItemText, CircularProgress, Paper, Breadcrumbs, Link, Box, IconButton } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

// Função para carregar o estado salvo da sessão
const loadState = () => {
  try {
    const serializedState = sessionStorage.getItem('blocosPageState');
    if (serializedState === null) {
      return { view: 'blocos', selectedBloco: null, selectedEntrada: null };
    }
    return JSON.parse(serializedState);
  } catch (err) {
    return { view: 'blocos', selectedBloco: null, selectedEntrada: null };
  }
};

function BlocosPage() {
  const navigate = useNavigate();

  // Inicializa o estado com os valores salvos ou os padrões
  const [state, setState] = useState(loadState);
  const { view, selectedBloco, selectedEntrada } = state;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Salva o estado na sessionStorage sempre que ele mudar
  useEffect(() => {
    try {
      const serializedState = JSON.stringify(state);
      sessionStorage.setItem('blocosPageState', serializedState);
    } catch (err) {
      // Ignora erros de escrita
    }
  }, [state]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (view === 'blocos') {
      const data = await window.api.getBlocos();
      setItems(data);
    } else if (view === 'entradas' && selectedBloco) {
      const data = await window.api.getEntradas(selectedBloco.id);
      setItems(data);
    } else if (view === 'unidades' && selectedEntrada) {
      const data = await window.api.getUnidades(selectedEntrada.id);
      setItems(data);
    }
    setLoading(false);
  }, [view, selectedBloco, selectedEntrada]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBlocoClick = (bloco) => {
    setState({ view: 'entradas', selectedBloco: bloco, selectedEntrada: null });
  };

  const handleEntradaClick = (entrada) => {
    setState({ view: 'unidades', selectedBloco: state.selectedBloco, selectedEntrada: entrada });
  };

  const handleUnidadeClick = (unidade) => {
    navigate(`/unidade/${unidade.id}`);
  };

  const navigateToBlocos = () => {
    setState({ view: 'blocos', selectedBloco: null, selectedEntrada: null });
  };

  const navigateToEntradas = () => {
    setState({ view: 'entradas', selectedBloco: state.selectedBloco, selectedEntrada: null });
  };

  const handleBackClick = () => {
    if (view === 'unidades') {
      navigateToEntradas();
    } else if (view === 'entradas') {
      navigateToBlocos();
    }
  };
  
  const renderListItem = (item) => {
    // ... (o código da função renderListItem continua o mesmo)
    if (view === 'blocos') {
        return (
          <ListItem button key={item.id} onClick={() => handleBlocoClick(item)}>
            <ListItemIcon><HomeWorkIcon /></ListItemIcon>
            <ListItemText primary={item.nome} />
          </ListItem>
        );
      }
      if (view === 'entradas') {
        return (
          <ListItem button key={item.id} onClick={() => handleEntradaClick(item)}>
            <ListItemIcon><FolderIcon /></ListItemIcon>
            <ListItemText primary={`Entrada ${item.letra}`} />
          </ListItem>
        );
      }
      if (view === 'unidades') {
        return (
          <ListItem button key={item.id} onClick={() => handleUnidadeClick(item)}>
            <ListItemIcon><MeetingRoomIcon /></ListItemIcon>
            <ListItemText primary={`Apartamento ${item.numero_apartamento}`} />
          </ListItem>
        );
      }
      return null;
  };


  return (
    <div>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {view !== 'blocos' && (
          <IconButton onClick={handleBackClick} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography variant="h4" component="h1">Navegar por Estrutura</Typography>
      </Box>
      
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component="button" underline="hover" color="inherit" onClick={navigateToBlocos}>
          Blocos
        </Link>
        {selectedBloco && (
          <Link component="button" underline="hover" color="inherit" onClick={navigateToEntradas}>
            {selectedBloco.nome}
          </Link>
        )}
        {selectedEntrada && (
          <Typography color="text.primary">Entrada {selectedEntrada.letra}</Typography>
        )}
      </Breadcrumbs>

      <Paper elevation={2}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}><CircularProgress /></div>
        ) : (
          <List component="nav">
            {items.map(item => renderListItem(item))}
          </List>
        )}
      </Paper>
    </div>
  );
}

export default BlocosPage;