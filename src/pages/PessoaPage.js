import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Paper,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import AdicionarVeiculoModal from "../components/AdicionarVeiculoModal";
import EditIcon from "@mui/icons-material/Edit";
import EditarVeiculoModal from "../components/EditarVeiculoModal";

function PessoaPage() {
  const { pessoaId } = useParams();
  const navigate = useNavigate();
  const [pessoa, setPessoa] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [veiculoModalOpen, setVeiculoModalOpen] = useState(false);
  const [editarVeiculoModalOpen, setEditarVeiculoModalOpen] = useState(false);
  const [veiculoParaEditar, setVeiculoParaEditar] = useState(null);

  const handleDeleteVeiculo = async (veiculoId, veiculoNome) => {
    if (
      window.confirm(`Tem certeza que deseja excluir o veículo ${veiculoNome}?`)
    ) {
      const result = await window.api.deleteVeiculo(veiculoId);
      if (result.success) {
        fetchData(); // Atualiza a lista
      } else {
        alert(`Erro ao excluir veículo: ${result.message}`);
      }
    }
  };

  const handleOpenEditarVeiculoModal = (veiculo) => {
    setVeiculoParaEditar(veiculo);
    setEditarVeiculoModalOpen(true);
  };
  const handleCloseEditarVeiculoModal = () => {
    setEditarVeiculoModalOpen(false);
    setVeiculoParaEditar(null);
  };

  const handleSuccess = () => {
    handleCloseVeiculoModal();
    handleCloseEditarVeiculoModal();
    fetchData();
  };
  const handleOpenVeiculoModal = () => setVeiculoModalOpen(true);
  const handleCloseVeiculoModal = () => setVeiculoModalOpen(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pessoaData, veiculosData] = await Promise.all([
      window.api.getPessoaDetails(pessoaId),
      window.api.getVeiculosByPessoa(pessoaId),
    ]);
    setPessoa(pessoaData);
    setVeiculos(veiculosData);
    setLoading(false);
  }, [pessoaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <CircularProgress />;
  if (!pessoa)
    return <Typography color="error">Pessoa não encontrada.</Typography>;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Perfil de Morador
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {pessoa.nome_completo}
        </Typography>
        <Typography>
          <strong>CPF:</strong> {pessoa.cpf}
        </Typography>
        <Typography>
          <strong>Email:</strong> {pessoa.email || "Não informado"}
        </Typography>
        <Typography>
          <strong>Telefone:</strong> {pessoa.telefone || "Não informado"}
        </Typography>
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">Veículos Cadastrados</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenVeiculoModal}
          >
            Adicionar Veículo
          </Button>
        </Box>
        <Divider />
        <List>
          {veiculos.length > 0 ? (
            veiculos.map((veiculo) => (
              <ListItem
                key={veiculo.id}
                divider
                secondaryAction={
                  <>
                    <IconButton
                      edge="end"
                      aria-label="edit"
                      onClick={() => handleOpenEditarVeiculoModal(veiculo)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() =>
                        handleDeleteVeiculo(
                          veiculo.id,
                          `${veiculo.marca} ${veiculo.modelo}`
                        )
                      }
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                }
              >
                <ListItemText
                  primary={`${veiculo.marca} ${veiculo.modelo} (${veiculo.cor})`}
                  secondary={`Placa: ${veiculo.placa}`}
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText primary="Nenhum veículo cadastrado para esta pessoa." />
            </ListItem>
          )}
        </List>
      </Paper>
      <EditarVeiculoModal
        open={editarVeiculoModalOpen}
        handleClose={handleCloseEditarVeiculoModal}
        veiculo={veiculoParaEditar}
        onSuccess={handleSuccess}
      />

      <AdicionarVeiculoModal
        open={veiculoModalOpen}
        handleClose={handleCloseVeiculoModal}
        pessoa={pessoa}
        onSuccess={handleSuccess}
      />

    </Box>
  );
}

export default PessoaPage;
