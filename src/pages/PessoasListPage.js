import React, { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Box,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

function PessoasListPage() {
  const navigate = useNavigate();
  const [pessoas, setPessoas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vinculoTypes, setVinculoTypes] = useState([]);
  const [filtroVinculo, setFiltroVinculo] = useState("");
  const [sortBy, setSortBy] = useState("asc");
  const [showInactive, setShowInactive] = useState(false);

  // Substitua sua função fetchData por esta
  const fetchData = useCallback(async () => {
    setLoading(true);
    const filters = {
      tipoVinculo: filtroVinculo,
      sortBy: sortBy,
      showInactive: showInactive, // <-- Nova parte
    };
    const data = await window.api.getFilteredPessoas(filters);
    setPessoas(data);
    setLoading(false);
  }, [filtroVinculo, sortBy, showInactive]); // <-- Nova dependência

  // Busca os tipos de vínculo uma vez para popular o menu
  useEffect(() => {
    const fetchVinculoTypes = async () => {
      const data = await window.api.getVinculoTypes();
      setVinculoTypes(data);
    };
    fetchVinculoTypes();
  }, []);

  // Efeito principal que chama a busca de dados
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Lista Completa de Pessoas
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Filtrar por Categoria</InputLabel>
              <Select
                value={filtroVinculo}
                label="Filtrar por Categoria"
                onChange={(e) => setFiltroVinculo(e.target.value)}
              >
                <MenuItem value="">
                  <em>Todos</em>
                </MenuItem>
                {vinculoTypes.map((tipo) => (
                  <MenuItem key={tipo} value={tipo}>
                    {tipo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Ordenar por Nome</InputLabel>
              <Select
                value={sortBy}
                label="Ordenar por Nome"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="asc">A-Z</MenuItem>
                <MenuItem value="desc">Z-A</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
              }
              label="Mostrar inativos"
            />
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome Completo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Categorias</TableCell>
                <TableCell>Bloco</TableCell>
                <TableCell>Apto</TableCell>
                <TableCell>CPF</TableCell>
                <TableCell>Telefone</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pessoas.map((pessoa) => (
                <TableRow
                  key={pessoa.id}
                  hover
                  onClick={() => navigate(`/pessoa/${pessoa.id}`)}
                  sx={{
                    cursor: "pointer",
                    backgroundColor:
                      pessoa.status === "Inativo" ? "#f5f5f5" : "inherit",
                  }}
                >
                  <TableCell>{pessoa.nome_completo}</TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          pessoa.status === "Inativo"
                            ? "error.main"
                            : "success.main",
                        fontWeight: "bold",
                      }}
                    >
                      {pessoa.status}
                    </Typography>
                  </TableCell>
                  <TableCell>{pessoa.vinculos}</TableCell>
                  <TableCell>{pessoa.nome_bloco}</TableCell>
                  <TableCell>{pessoa.numero_apartamento}</TableCell>
                  {/* Adicionado uma verificação para a máscara de CPF não quebrar se o campo for nulo */}
                  <TableCell>
                    {pessoa.cpf
                      ? pessoa.cpf.replace(
                          /(\d{3})(\d{3})(\d{3})(\d{2})/,
                          "$1.$2.$3-$4"
                        )
                      : "-"}
                  </TableCell>
                  <TableCell>{pessoa.telefone || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default PessoasListPage;
