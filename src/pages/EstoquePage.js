import React, { useState, useEffect } from 'react';
import { Typography, Box, Grid, Card, CardContent, Button, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
// import { useNavigate } from 'react-router-dom'; // removido (não utilizado)
import InventoryIcon from '@mui/icons-material/Inventory';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningIcon from '@mui/icons-material/Warning';
// Removed back navigation (only Blocos retains back arrow)
import PageHeader from '../components/PageHeader';

function EstoquePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProdutos: 0,
    produtosBaixoEstoque: 0,
    produtosSemEstoque: 0,
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
    // Novas entradas/saídas foram removidas do menu principal — use Movimentações para ajustar estoque
  ];

  return (
    <Box>
  <PageHeader title="Controle de Estoque" />

  {/* Estatísticas */}
  <Grid container spacing={3} sx={{ mb: 4 }} justifyContent="center">
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Total de Produtos
              </Typography>
              <Typography variant="h4">
                {stats.totalProdutos ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Baixo Estoque
              </Typography>
              <Typography variant="h4" color={(stats.produtosBaixoEstoque ?? 0) > 0 ? 'warning.main' : 'inherit'}>
                {stats.produtosBaixoEstoque ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Sem Estoque
              </Typography>
              <Typography variant="h4" color={(stats.produtosSemEstoque ?? 0) > 0 ? 'error' : 'inherit'}>
                {stats.produtosSemEstoque ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Card de Valor Total removido conforme solicitado */}
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Movimentações Hoje
              </Typography>
              <Typography variant="h4">
                {stats.movimentacoesHoje ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Menu de Opções */}
      <Grid container spacing={3} justifyContent="center">
        {menuItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{
                cursor: 'pointer',
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
      {(stats.produtosBaixoEstoque > 0 || stats.produtosSemEstoque > 0) && (
        <Box sx={{ mt: 4 }}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                { (stats.produtosSemEstoque ?? 0) > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WarningIcon sx={{ mr: 2 }} />
                      <Typography variant="h6">{stats.produtosSemEstoque ?? 0} produto(s) sem estoque</Typography>
                    </Box>
                    <Button variant="contained" color="error" onClick={() => navigate('/estoque/produtos?filtro=sem-estoque')}>Ver Produtos</Button>
                  </Box>
                )}

                { (stats.produtosBaixoEstoque ?? 0) > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WarningIcon sx={{ mr: 2 }} />
                      <Typography variant="h6">{stats.produtosBaixoEstoque ?? 0} produto(s) com estoque baixo</Typography>
                    </Box>
                    <Button variant="contained" color="warning" onClick={() => navigate('/estoque/produtos?filtro=baixo-estoque')}>Ver Produtos</Button>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}

export default EstoquePage;