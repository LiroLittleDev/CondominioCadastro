import React, { useState, useEffect } from 'react';
import { 
  Typography, Box, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, IconButton, Chip, TextField, FormControl,
  InputLabel, Select, MenuItem, Grid, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import ProdutoModal from '../components/ProdutoModal';

function ProdutosPage() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    busca: '',
    categoria: '',
    status: 'todos'
  });
  const [produtoModal, setProdutoModal] = useState({ open: false, produto: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, produto: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [produtosData, categoriasData] = await Promise.all([
        window.api.getProdutos(filtros),
        window.api.getCategoriasProduto()
      ]);
      setProdutos(produtosData);
      setCategorias(categoriasData);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filtros]);

  const handleDelete = async () => {
    try {
      const result = await window.api.deleteProduto(deleteModal.produto.id);
      if (result.success) {
        fetchData();
        setDeleteModal({ open: false, produto: null });
      }
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
    }
  };

  const getEstoqueStatus = (produto) => {
    const estoque = produto.estoque_atual || 0;
    if (estoque === 0) return { label: 'Sem Estoque', color: 'error' };
    if (estoque <= produto.estoque_minimo) return { label: 'Baixo Estoque', color: 'warning' };
    return { label: 'Normal', color: 'success' };
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/estoque')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Produtos
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setProdutoModal({ open: true, produto: null })}
        >
          Novo Produto
        </Button>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Buscar produto"
              placeholder="Digite o nome do produto..."
              value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={filtros.categoria}
                label="Categoria"
                onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
              >
                <MenuItem value="">Todas</MenuItem>
                {categorias.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filtros.status}
                label="Status"
                onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="ativo">Ativos</MenuItem>
                <MenuItem value="baixo-estoque">Baixo Estoque</MenuItem>
                <MenuItem value="sem-estoque">Sem Estoque</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabela de Produtos */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Estoque Atual</TableCell>
              <TableCell>Estoque Mínimo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Valor Unit.</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {produtos.map((produto) => {
              const status = getEstoqueStatus(produto);
              return (
                <TableRow key={produto.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {produto.nome}
                    </Typography>
                  </TableCell>
                  <TableCell>{produto.categoria_nome}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {produto.estoque_atual || 0} {produto.unidade_medida}
                      {status.color === 'warning' && (
                        <WarningIcon color="warning" sx={{ ml: 1, fontSize: 16 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{produto.estoque_minimo} {produto.unidade_medida}</TableCell>
                  <TableCell>
                    <Chip label={status.label} color={status.color} size="small" />
                  </TableCell>
                  <TableCell>
                    R$ {produto.valor_unitario?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => setProdutoModal({ open: true, produto })}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => setDeleteModal({ open: true, produto })}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal de Produto */}
      <ProdutoModal 
        open={produtoModal.open}
        handleClose={() => setProdutoModal({ open: false, produto: null })}
        produto={produtoModal.produto}
        onSuccess={fetchData}
      />

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModal.open} onClose={() => setDeleteModal({ open: false, produto: null })}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta ação não pode ser desfeita!
          </Alert>
          <Typography>
            Tem certeza que deseja excluir o produto "{deleteModal.produto?.nome}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModal({ open: false, produto: null })}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ProdutosPage;