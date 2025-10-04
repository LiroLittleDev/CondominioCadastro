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
import EditarPessoaModal from "../components/EditarPessoaModal";
import EditNoteIcon from "@mui/icons-material/EditNote";
import EditarVinculoModal from "../components/EditarVinculoModal";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import TransferirPessoaModal from "../components/TransferirPessoaModal";

function PessoaPage() {
  const { pessoaId } = useParams();
  const navigate = useNavigate();
  const [pessoa, setPessoa] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [veiculoModalOpen, setVeiculoModalOpen] = useState(false);
  const [editarVeiculoModalOpen, setEditarVeiculoModalOpen] = useState(false);
  const [veiculoParaEditar, setVeiculoParaEditar] = useState(null);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [transferirModalOpen, setTransferirModalOpen] = useState(false);

  const handleOpenTransferirModal = () => setTransferirModalOpen(true);
  const handleCloseTransferirModal = () => setTransferirModalOpen(false);

  // Adicione estes estados junto com os outros 'useState'
  const [vinculos, setVinculos] = useState([]);
  const [editarVinculoModalOpen, setEditarVinculoModalOpen] = useState(false);
  const [vinculoParaEditar, setVinculoParaEditar] = useState(null);

  const handleOpenEditarModal = () => setEditarModalOpen(true);
  const handleCloseEditarModal = () => setEditarModalOpen(false);

  const vinculosAtivos = vinculos.filter((v) => v.status === "Ativo");
  const vinculosInativos = vinculos.filter((v) => v.status === "Inativo");

  const handleDeletePessoa = async () => {
    if (!pessoa) return;
    const confirm1 = window.confirm(
      `Tem certeza que deseja EXCLUIR PERMANENTEMENTE '${pessoa.nome_completo}' e todos os seus dados?`
    );
    if (confirm1) {
      const confirm2 = window.confirm(
        "Esta ação não pode ser desfeita. Confirma a exclusão permanente?"
      );
      if (confirm2) {
        const result = await window.api.deletePessoa(pessoa.id);
        if (result.success) {
          alert(result.message);
          navigate(-1); // Volta para a página anterior após a exclusão
        } else {
          alert(`Erro ao excluir: ${result.message}`);
        }
      }
    }
  };

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

  // A sua função handleSuccess deve ficar assim:
  const handleSuccess = () => {
    handleCloseVeiculoModal();
    handleCloseEditarModal();
    handleCloseEditarVinculoModal();
    handleCloseTransferirModal(); // <-- Adicione esta linha
    fetchData();
  };

  const handleOpenVeiculoModal = () => setVeiculoModalOpen(true);
  const handleCloseVeiculoModal = () => setVeiculoModalOpen(false);

  // Substitua sua função fetchData por esta
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pessoaData, veiculosData, vinculosData] = await Promise.all([
      window.api.getPessoaDetails(pessoaId),
      window.api.getVeiculosByPessoa(pessoaId),
      window.api.getVinculosByPessoa(pessoaId), // <-- Nova busca
    ]);
    setPessoa(pessoaData);
    setVeiculos(veiculosData);
    setVinculos(vinculosData); // <-- Salva os vínculos
    setLoading(false);
  }, [pessoaId]);

  // Adicione estas funções dentro do componente
  const handleOpenEditarVinculoModal = (vinculo) => {
    setVinculoParaEditar(vinculo);
    setEditarVinculoModalOpen(true);
  };
  const handleCloseEditarVinculoModal = () => {
    setEditarVinculoModalOpen(false);
    setVinculoParaEditar(null);
  };

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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5" component="h2">
            {pessoa.nome_completo}
          </Typography>
          <Button
            variant="contained"
            startIcon={<SwapHorizIcon />}
            onClick={handleOpenTransferirModal}
          >
            {vinculosAtivos.length > 0
              ? "Transferir"
              : "Vincular Pessoa"}
          </Button>
          <Box>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleOpenEditarModal}
            >
              Editar
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeletePessoa}
              sx={{ ml: 2 }}
            >
              Excluir
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
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

      {/* SEÇÃO DE VÍNCULO ATIVO */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Vínculo(s) Ativo(s)
        </Typography>
        <List disablePadding>
          {vinculosAtivos.length > 0 ? (
            vinculosAtivos.map((vinculo) => (
              <ListItem key={vinculo.id} divider>
                <ListItemText
                  primary={vinculo.tipo_vinculo}
                  secondary={`${vinculo.nome_bloco} - Apto ${vinculo.numero_apartamento}`}
                />
                <Box>
                  <IconButton
                    edge="end"
                    aria-label="edit-vinculo"
                    onClick={() => handleOpenEditarVinculoModal(vinculo)}
                  >
                    <EditNoteIcon />
                  </IconButton>
                </Box>
              </ListItem>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nenhum vínculo ativo no momento.
            </Typography>
          )}
        </List>
      </Paper>

      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Vínculos Anteriores
        </Typography>
        <List disablePadding>
          {vinculosInativos.length > 0 ? (
            vinculosInativos.map((vinculo) => (
              <ListItem key={vinculo.id} divider>
                <ListItemText
                  primary={vinculo.tipo_vinculo}
                  secondary={`${vinculo.nome_bloco} - Apto ${
                    vinculo.numero_apartamento
                  } | Encerrado em: ${new Date(
                    vinculo.data_fim
                  ).toLocaleDateString("pt-BR")}`}
                />
              </ListItem>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nenhum vínculo anterior registrado.
            </Typography>
          )}
        </List>
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

      <EditarPessoaModal
        open={editarModalOpen}
        handleClose={handleCloseEditarModal}
        pessoa={pessoa}
        onSuccess={handleSuccess}
      />

      <EditarVinculoModal
        open={editarVinculoModalOpen}
        handleClose={handleCloseEditarVinculoModal}
        vinculo={vinculoParaEditar}
        onSuccess={handleSuccess}
      />

      <TransferirPessoaModal
  open={transferirModalOpen}
  handleClose={handleCloseTransferirModal}
  pessoa={pessoa}

  vinculoAtivo={vinculosAtivos.length > 0 ? vinculosAtivos[0] : null}
  onSuccess={handleSuccess}
/>
    </Box>
  );
}

export default PessoaPage;
