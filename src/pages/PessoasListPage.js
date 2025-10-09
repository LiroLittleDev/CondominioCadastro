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
// import { useNavigate } from "react-router-dom"; // removido (não utilizado)
// import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PageHeader from '../components/PageHeader';

function PessoasListPage() {
  const navigate = useNavigate();
  const [pessoas, setPessoas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vinculoTypes, setVinculoTypes] = useState([]);
  const [filtroVinculo, setFiltroVinculo] = useState("");
  const [sortBy, setSortBy] = useState("asc");
  const [showInactive, setShowInactive] = useState(false);
  const [blocos, setBlocos] = useState([]);
  const [filtroBloco, setFiltroBloco] = useState("");
  const [filtroApartamento, setFiltroApartamento] = useState("");

  // Substitua sua função fetchData por esta
  const fetchData = useCallback(async () => {
    setLoading(true);
    const filters = {
      tipoVinculo: filtroVinculo,
      sortBy: sortBy,
      showInactive: showInactive,
      bloco: filtroBloco,
      apartamento: filtroApartamento,
    };
    const data = await window.api.getFilteredPessoas(filters);
    setPessoas(data);
    setLoading(false);
  }, [filtroVinculo, sortBy, showInactive, filtroBloco, filtroApartamento]);

  // Busca os tipos de vínculo e blocos uma vez para popular os menus
  useEffect(() => {
    const fetchVinculoTypes = async () => {
      const data = await window.api.getVinculoTypes();
      setVinculoTypes(data);
    };
    const fetchBlocos = async () => {
      const data = await window.api.getBlocos();
      setBlocos(data);
    };
    fetchVinculoTypes();
    fetchBlocos();
  }, []);

  // Efeito principal que chama a busca de dados
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Box>
      <PageHeader title="Lista Completa de Pessoas" />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
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
                <MenuItem value="Proprietário">Proprietário</MenuItem>
                <MenuItem value="Inquilino">Inquilino</MenuItem>
                <MenuItem value="Morador">Morador</MenuItem>
                <MenuItem value="Morador Temporário">Morador Temporário</MenuItem>
                <MenuItem value="Responsável">Responsável</MenuItem>
                {vinculoTypes.filter(tipo => !['Proprietário', 'Inquilino', 'Morador', 'Morador Temporário', 'Responsável'].includes(tipo)).map((tipo) => (
                  <MenuItem key={tipo} value={tipo}>
                    {tipo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Filtrar por Bloco</InputLabel>
              <Select
                value={filtroBloco}
                label="Filtrar por Bloco"
                onChange={(e) => setFiltroBloco(e.target.value)}
              >
                <MenuItem value="">
                  <em>Todos</em>
                </MenuItem>
                {blocos.map((bloco) => (
                  <MenuItem key={bloco.id} value={bloco.nome}>
                    {bloco.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Apartamento</InputLabel>
              <Select
                value={filtroApartamento}
                label="Apartamento"
                onChange={(e) => setFiltroApartamento(e.target.value)}
              >
                <MenuItem value="">
                  <em>Todos</em>
                </MenuItem>
                {Array.from(new Set(pessoas.map(p => p.numero_apartamento).filter(Boolean))).sort().map((apto) => (
                  <MenuItem key={apto} value={apto}>
                    {apto}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
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
          <Grid item xs={12} sm={6} md={3}>
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
