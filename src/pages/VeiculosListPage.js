import React, { useState, useEffect } from 'react';
import { Typography, Box, Paper, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function VeiculosListPage() {
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await window.api.getAllVeiculos();
      setVeiculos(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Lista Completa de Veículos
        </Typography>
      </Box>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Placa</TableCell>
                <TableCell>Marca</TableCell>
                <TableCell>Modelo</TableCell>
                <TableCell>Cor</TableCell>
                <TableCell>Proprietário</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {veiculos.map((veiculo) => (
                <TableRow 
                  key={veiculo.id}
                  hover
                  onClick={() => navigate(`/pessoa/${veiculo.pessoa_id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{veiculo.placa}</TableCell>
                  <TableCell>{veiculo.marca}</TableCell>
                  <TableCell>{veiculo.modelo}</TableCell>
                  <TableCell>{veiculo.cor}</TableCell>
                  <TableCell>{veiculo.proprietario_nome}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default VeiculosListPage;