import React, { useState, useEffect } from 'react';
import { Typography, Box, Grid, Card, CardContent, Button, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddBoxIcon from '@mui/icons-material/AddBox';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningIcon from '@mui/icons-material/Warning';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function EstoquePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProdutos: 0,
    produtosBaixoEstoque: 0,
    valorTotalEstoque: 0,
    movimentacoesHoje: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await window.api.getEstoqueStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const menuItems = [
    {
      title: 'Produtos',
      description: 'Gerenciar produtos do estoque',
      icon: <InventoryIcon sx={{ fontSize: 40 }} />,
      path: '/estoque/produtos',
      color: 'primary'
    },
    {
      title: 'Movimentações',
      description: 'Histórico de entradas e saídas',
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      path: '/estoque/movimentacoes',
      color: 'secondary'
    },
    {
      title: 'Nova Entrada',
      description: 'Adicionar produtos ao estoque',
      icon: <AddBoxIcon sx={{ fontSize: 40 }} />,
      path: '/estoque/entrada',
      color: 'success'
    },
    {
      title: 'Nova Saída',
      description: 'Retirar produtos do estoque',
      icon: <RemoveCircleIcon sx={{ fontSize: 40 }} />,
      path: '/estoque/saida',
      color: 'error'
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Controle de Estoque
        </Typography>
      </Box>

      {/* Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total de Produtos
              </Typography>
              <Typography variant="h4">
                {stats.totalProdutos}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography color="textSecondary" gutterBottom>
                    Baixo Estoque
                  </Typography>
                  <Typography variant="h4" color={stats.produtosBaixoEstoque > 0 ? 'error' : 'inherit'}>
                    {stats.produtosBaixoEstoque}
                  </Typography>
                </Box>
                {stats.produtosBaixoEstoque > 0 && (
                  <WarningIcon color="error" />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Valor Total
              </Typography>
              <Typography variant="h4">
                R$ {stats.valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Movimentações Hoje
              </Typography>
              <Typography variant="h4">
                {stats.movimentacoesHoje}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Menu de Opções */}
      <Grid container spacing={3}>
        {menuItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'scale(1.02)',
                  boxShadow: 6
                },
                transition: 'all 0.2s'
              }}
              onClick={() => navigate(item.path)}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box sx={{ color: `${item.color}.main`, mb: 2 }}>
                  {item.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {item.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Alertas de Baixo Estoque */}
      {stats.produtosBaixoEstoque > 0 && (
        <Box sx={{ mt: 4 }}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <WarningIcon sx={{ mr: 2 }} />
                  <Typography variant="h6">
                    {stats.produtosBaixoEstoque} produto(s) com estoque baixo
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  color="warning"
                  onClick={() => navigate('/estoque/produtos?filtro=baixo-estoque')}
                >
                  Ver Produtos
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}

export default EstoquePage;