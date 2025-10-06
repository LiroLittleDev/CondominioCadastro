import React, { useState, useEffect, useCallback } from 'react';
import { Typography, CircularProgress, Paper, Breadcrumbs, Link, Box, IconButton, Grid } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const location = useLocation();

  // Inicializa o estado com os valores salvos ou os padrões
  const [state, setState] = useState(loadState);
  const { view, selectedBloco, selectedEntrada } = state;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detecta parâmetro de bloco na URL e navega para entradas
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const blocoId = params.get('bloco');
    
    if (blocoId) {
      const fetchBlocoAndNavigate = async () => {
        try {
          const blocos = await window.api.getBlocos();
          const bloco = blocos.find(b => b.id === parseInt(blocoId));
          if (bloco) {
            setState({ view: 'entradas', selectedBloco: bloco, selectedEntrada: null });
          }
        } catch (error) {
          console.error('Erro ao buscar bloco:', error);
        }
      };
      fetchBlocoAndNavigate();
    }
  }, [location.search]);

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

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center' }}><CircularProgress /></div>
      ) : (
        <Grid container spacing={3}>
          {items.map(item => {
            // Define o conteúdo do card baseado na view atual
            let cardContent = null;
            if (view === 'blocos') {
              cardContent = {
                icon: <HomeWorkIcon sx={{ fontSize: 40, mb: 1 }} color="primary" />,
                text: item.nome,
                onClick: () => handleBlocoClick(item),
              };
            } else if (view === 'entradas') {
              cardContent = {
                icon: <FolderIcon sx={{ fontSize: 40, mb: 1 }} color="secondary" />,
                text: `Entrada ${item.letra}`,
                onClick: () => handleEntradaClick(item),
              };
            } else if (view === 'unidades') {
              cardContent = {
                icon: <MeetingRoomIcon sx={{ fontSize: 40, mb: 1 }} />,
                text: `Apto ${item.numero_apartamento}`,
                onClick: () => handleUnidadeClick(item),
              };
            }

            return (
              <Grid item xs={6} sm={4} md={3} key={item.id}>
                <Paper 
                  elevation={3}
                  onClick={cardContent.onClick}
                  sx={{ 
                    p: 2, 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    '&:hover': { backgroundColor: 'action.hover', transform: 'scale(1.02)' },
                    transition: 'transform 0.15s ease-in-out',
                  }}
                >
                  {cardContent.icon}
                  <Typography variant="subtitle1">{cardContent.text}</Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </div>
  );
}

export default BlocosPage;