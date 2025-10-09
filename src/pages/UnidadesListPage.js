// import { useNavigate } from "react-router-dom"; // removido (não utilizado)
import React, { useState, useEffect } from 'react';
import { Box, Paper, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
// import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PageHeader from '../components/PageHeader';
import { useCallback } from 'react';

function UnidadesListPage() {
  const navigate = useNavigate();
  const [unidades, setUnidades] = useState([]);
  const [blocos, setBlocos] = useState([]);
  const [blocoSelecionado, setBlocoSelecionado] = useState("");
  const [loading, setLoading] = useState(true);

const fetchBlocos = useCallback(async () => {
  const blocosData = await window.api.getAllBlocos();
  setBlocos(blocosData);
}, []);

const fetchData = useCallback(async (blocoId = null) => {
  setLoading(true);
  const data = await window.api.getAllUnidadesDetails(blocoId);
  setUnidades(data);
  setLoading(false);
}, []);

const handleBlocoChange = (event) => {
  const blocoId = event.target.value;
  setBlocoSelecionado(blocoId);
  fetchData(blocoId || null);
};

useEffect(() => {
  const handleFocus = () => {
    // Ao voltar ao foco, atualizar dados da lista. Removido log de debug.
    fetchData(blocoSelecionado || null);
  };

  window.addEventListener('focus', handleFocus);
  return () => {
    window.removeEventListener('focus', handleFocus);
  };
}, [fetchData, blocoSelecionado]);

useEffect(() => {
  fetchBlocos();
  fetchData();
}, [fetchBlocos, fetchData]);

  return (
    <Box>
      <PageHeader title="Lista Completa de Unidades" />

      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Filtrar por Bloco</InputLabel>
          <Select
            value={blocoSelecionado}
            label="Filtrar por Bloco"
            onChange={handleBlocoChange}
          >
            <MenuItem value="">
              <em>Todos os Blocos</em>
            </MenuItem>
            {blocos.map((bloco) => (
              <MenuItem key={bloco.id} value={bloco.id}>
                {bloco.nome}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                 <TableCell>Proprietário</TableCell>
                <TableCell>Bloco</TableCell>
                <TableCell>Entrada</TableCell>
                <TableCell>Apartamento</TableCell>
                <TableCell align="center">Pessoas Vinculadas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {unidades.map((unidade) => (
                <TableRow 
                  key={unidade.id}
                  hover
                  onClick={() => navigate(`/unidade/${unidade.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                   <TableCell>{unidade.nome_proprietario || 'Sem proprietário'}</TableCell>
                  <TableCell>{unidade.nome_bloco}</TableCell>
                  <TableCell>{unidade.letra_entrada}</TableCell>
                  <TableCell>{unidade.numero_apartamento}</TableCell>
                  <TableCell align="center">{unidade.qtd_pessoas}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default UnidadesListPage;