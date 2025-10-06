import React, { useState, useEffect, useCallback } from 'react';
import { Typography, CircularProgress, Paper, Breadcrumbs, Link, Box, IconButton, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
  const { isAdmin } = useAuth();

  // Inicializa o estado com os valores salvos ou os padrões
  const [state, setState] = useState(loadState);
  const { view, selectedBloco, selectedEntrada } = state;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'create-bloco', 'edit-bloco', 'create-entrada', 'create-unidade'
  const [dialogValue, setDialogValue] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

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

  const handleCreate = () => {
    if (view === 'blocos') {
      setDialogType('create-bloco');
    } else if (view === 'entradas') {
      setDialogType('create-entrada');
    } else if (view === 'unidades') {
      setDialogType('create-unidade');
    }
    setDialogValue('');
    setOpenDialog(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setDialogValue(item.nome || item.letra || item.numero_apartamento);
    setDialogType('edit-bloco');
    setOpenDialog(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    
    let result;
    if (view === 'blocos') {
      result = await window.api.deleteBloco(item.id);
    } else if (view === 'entradas') {
      result = await window.api.deleteEntrada(item.id);
    } else if (view === 'unidades') {
      result = await window.api.deleteUnidade(item.id);
    }
    
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
    if (result.success) fetchData();
  };

  const handleDialogSubmit = async () => {
    if (!dialogValue.trim()) return;
    
    let result;
    if (dialogType === 'create-bloco') {
      result = await window.api.createBloco(dialogValue);
    } else if (dialogType === 'edit-bloco') {
      result = await window.api.updateBloco(editingItem.id, dialogValue);
    } else if (dialogType === 'create-entrada') {
      result = await window.api.createEntrada(selectedBloco.id, dialogValue.toUpperCase());
    } else if (dialogType === 'create-unidade') {
      result = await window.api.createUnidade(selectedEntrada.id, dialogValue);
    }
    
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
    if (result.success) {
      fetchData();
      setOpenDialog(false);
      setDialogValue('');
      setEditingItem(null);
    }
  };


 return (
    <div>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {view !== 'blocos' && (
            <IconButton onClick={handleBackClick} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography variant="h4" component="h1">Gestão de Estrutura</Typography>
        </Box>
        {isAdmin() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            {view === 'blocos' ? 'Novo Bloco' : view === 'entradas' ? 'Nova Entrada' : 'Nova Unidade'}
          </Button>
        )}
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

      {feedback.message && (
        <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback({ type: '', message: '' })}>
          {feedback.message}
        </Alert>
      )}
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
                  sx={{ 
                    p: 2, 
                    textAlign: 'center', 
                    position: 'relative',
                    '&:hover .action-buttons': { opacity: 1 },
                    transition: 'transform 0.15s ease-in-out',
                  }}
                >
                  <Box onClick={cardContent.onClick} sx={{ cursor: 'pointer' }}>
                    {cardContent.icon}
                    <Typography variant="subtitle1">{cardContent.text}</Typography>
                  </Box>
                  
                  {isAdmin() && view === 'blocos' && (
                    <Box className="action-buttons" sx={{ position: 'absolute', top: 8, right: 8, opacity: 0, transition: 'opacity 0.2s' }}>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(item); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  
                  {isAdmin() && (view === 'entradas' || view === 'unidades') && (
                    <Box className="action-buttons" sx={{ position: 'absolute', top: 8, right: 8, opacity: 0, transition: 'opacity 0.2s' }}>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(item); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
      
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {dialogType === 'create-bloco' ? 'Novo Bloco' :
           dialogType === 'edit-bloco' ? 'Editar Bloco' :
           dialogType === 'create-entrada' ? 'Nova Entrada' :
           'Nova Unidade'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={dialogType.includes('bloco') ? 'Nome do Bloco' :
                   dialogType === 'create-entrada' ? 'Letra da Entrada' :
                   'Número do Apartamento'}
            fullWidth
            variant="outlined"
            value={dialogValue}
            onChange={(e) => setDialogValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleDialogSubmit} variant="contained">
            {dialogType.includes('edit') ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default BlocosPage;