import React, { useState, useEffect } from "react";
import {
  Typography,
  Paper,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import HomeIcon from "@mui/icons-material/Home";

function UnidadeListPage() {
  const navigate = useNavigate();
  const [unidades, setUnidades] = useState([]);
  const [blocos, setBlocos] = useState([]);
  const [blocoSelecionado, setBlocoSelecionado] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBlocos = async () => {
    const blocosData = await window.api.getAllBlocos();
    setBlocos(blocosData);
  };

  const fetchUnidades = async (blocoId = null) => {
    setLoading(true);
    const unidadesData = await window.api.getAllUnidadesDetails(blocoId);
    setUnidades(unidadesData);
    setLoading(false);
  };

  useEffect(() => {
    fetchBlocos();
    fetchUnidades();
  }, []);

  const handleBlocoChange = (event) => {
    const blocoId = event.target.value;
    setBlocoSelecionado(blocoId);
    fetchUnidades(blocoId || null);
  };

  const handleUnidadeClick = (unidadeId) => {
    navigate(`/unidade/${unidadeId}`);
  };

  if (loading && unidades.length === 0) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Lista de Unidades
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
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

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {blocoSelecionado 
            ? `Unidades do ${blocos.find(b => b.id === blocoSelecionado)?.nome || 'Bloco'}`
            : `Total: ${unidades.length} unidades`
          }
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : (
          <Grid container spacing={2}>
            {unidades.map((unidade) => (
              <Grid item xs={12} sm={6} md={4} key={unidade.id}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    cursor: "pointer",
                    "&:hover": { elevation: 4, bgcolor: "action.hover" }
                  }}
                  onClick={() => handleUnidadeClick(unidade.id)}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <HomeIcon sx={{ mr: 1, color: "primary.main" }} />
                    <Typography variant="h6">
                      {unidade.nome_bloco} - Apto {unidade.numero_apartamento}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <PersonIcon sx={{ fontSize: "1rem", color: "text.secondary" }} />
                    <Chip 
                      label={`${unidade.qtd_pessoas} pessoa(s)`}
                      size="small"
                      color={unidade.qtd_pessoas > 0 ? "primary" : "default"}
                    />
                  </Box>

                  {unidade.nome_proprietario && (
                    <Typography variant="body2" color="text.secondary">
                      Proprietário: {unidade.nome_proprietario}
                    </Typography>
                  )}
                  
                  {unidade.qtd_pessoas === 0 && (
                    <Typography variant="body2" color="warning.main" sx={{ fontStyle: "italic" }}>
                      Unidade vazia
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {unidades.length === 0 && !loading && (
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
            Nenhuma unidade encontrada.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}

export default UnidadeListPage;