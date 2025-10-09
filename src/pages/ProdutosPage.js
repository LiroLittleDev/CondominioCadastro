import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, Box, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, IconButton, Chip, TextField, FormControl,
  InputLabel, Select, MenuItem, Grid, Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
// import { useNavigate } from 'react-router-dom'; // removido (não utilizado)
// Removed unused ArrowBackIcon import
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import InventoryIcon from '@mui/icons-material/Inventory';
import ProdutoModal from '../components/ProdutoModal';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';

function ProdutosPage() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [filtros, setFiltros] = useState({
    busca: '',
    categoria: '',
    status: 'todos'
  });
  const [produtoModal, setProdutoModal] = useState({ open: false, produto: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, produto: null });

  // Parse numérico robusto: aceita number ou string com vírgula (ex.: "1,00")
  const parseNum = (v) => {
    if (v == null) return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'string') {
      const s = v.trim();
      if (!s) return 0;
      // Normaliza: remove separador de milhar ponto e troca vírgula por ponto
      const norm = s.replace(/\./g, '').replace(',', '.');
      const n = Number(norm);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const fetchData = useCallback(async () => {
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
  }, [filtros]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    const estoque = parseNum(produto.estoque_atual);
    const minimo = parseNum(produto.estoque_minimo);
    const lowThreshold = Math.max(1, minimo || 0);
    if (estoque <= 0) {
      return { label: 'Sem Estoque', color: 'error', isSemEstoque: true, isBaixoEstoque: false };
    }
    if (estoque <= lowThreshold) {
      return { label: 'Baixo Estoque', color: 'warning', isSemEstoque: false, isBaixoEstoque: true };
    }
    return { label: 'Normal', color: 'success', isSemEstoque: false, isBaixoEstoque: false };
  };

  return (
    <Box>
      <PageHeader 
        title="Produtos" 
        showBack={true}
        onBack={() => navigate(-1)}
        rightContent={
          <Box sx={{ display:'flex', gap:1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<InventoryIcon />}
              onClick={() => navigate('/estoque/movimentacoes')}
            >
              Ajustar Estoque
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setProdutoModal({ open: true, produto: null })}
            >
              Novo Produto
            </Button>
          </Box>
        }
      />

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
              <TableCell align="center">Nome</TableCell>
              <TableCell align="center">Categoria</TableCell>
              <TableCell align="center">Estoque Atual</TableCell>
              <TableCell align="center">Estoque Mínimo</TableCell>
              <TableCell align="center">Status</TableCell>
              
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {produtos.map((produto) => {
              const status = getEstoqueStatus(produto);
              const estoqueVal = parseNum(produto.estoque_atual);
              return (
                <TableRow key={produto.id}>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="medium" align="center">
                      {produto.nome}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{produto.categoria_nome}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {estoqueVal} {produto.unidade_medida}
                      {status.isBaixoEstoque && (
                        <WarningIcon color="warning" sx={{ ml: 1, fontSize: 16 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">{produto.estoque_minimo} {produto.unidade_medida}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Chip label={status.label} color={status.color} size="small" />
                    </Box>
                  </TableCell>
                  
                  <TableCell align="center">
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
      <ConfirmDialog
        open={deleteModal.open}
        title="Confirmar Exclusão"
        content={(
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>Esta ação não pode ser desfeita!</Alert>
            <Typography>Tem certeza que deseja excluir o produto "{deleteModal.produto?.nome}"?</Typography>
          </>
        )}
        destructive={true}
        onConfirm={async () => {
          await handleDelete();
          setDeleteModal({ open: false, produto: null });
        }}
        onClose={() => setDeleteModal({ open: false, produto: null })}
        confirmLabel="Excluir"
      />
    </Box>
  );
}

export default ProdutosPage;