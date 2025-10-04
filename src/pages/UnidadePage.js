import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import Chip from "@mui/material/Chip";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VincularPessoaModal from "../components/VincularPessoaModal";
import EditarPessoaModal from "../components/EditarPessoaModal";

function UnidadePage() {
  const { unidadeId } = useParams();
  const navigate = useNavigate();
  const [unidade, setUnidade] = useState(null);
  const [pessoas, setPessoas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vincularModalOpen, setVincularModalOpen] = useState(false);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [pessoaParaEditar, setPessoaParaEditar] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [unidadeData, pessoasData] = await Promise.all([
      window.api.getUnidadeDetails(unidadeId),
      window.api.getPessoasByUnidade(unidadeId),
    ]);
    setUnidade(unidadeData);
    setPessoas(pessoasData);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDesvincular = async (vinculoId, nomePessoa) => {
    if (
      window.confirm(
        `Tem certeza que deseja desvincular ${nomePessoa} desta unidade?`
      )
    ) {
      const result = await window.api.desvincularPessoa(vinculoId);
      if (result.success) {
        fetchData();
      } else {
        alert(`Erro ao desvincular: ${result.message}`);
      }
    }
  };

  const handleDeletePessoa = async (pessoaId, nomePessoa) => {
    const confirm1 = window.confirm(
      `Tem certeza que deseja EXCLUIR PERMANENTEMENTE '${nomePessoa}' e todos os seus dados (vínculos, veículos)?`
    );
    if (confirm1) {
      const confirm2 = window.confirm(
        "Esta ação não pode ser desfeita. Confirma a exclusão permanente?"
      );
      if (confirm2) {
        const result = await window.api.deletePessoa(pessoaId);
        if (result.success) {
          alert(result.message);
          fetchData();
        } else {
          alert(`Erro ao excluir: ${result.message}`);
        }
      }
    }
  };

  const handleOpenVincularModal = () => setVincularModalOpen(true);
  const handleCloseVincularModal = () => setVincularModalOpen(false);

  const handleOpenEditarModal = (pessoa) => {
    console.log("DADOS ENVIADOS PARA O MODAL:", pessoa); // Pista de Debug 1
    setPessoaParaEditar(pessoa);
    setEditarModalOpen(true);
  };
  const handleCloseEditarModal = () => {
    setEditarModalOpen(false);
    setPessoaParaEditar(null);
  };

  const handleSuccess = () => {
    handleCloseVincularModal();
    handleCloseEditarModal();
    fetchData();
  };

  if (loading && !unidade) {
    return <CircularProgress />;
  }
  if (!unidade) {
    return <Typography color="error">Unidade não encontrada.</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Gerenciar Unidade: {unidade.nome_bloco} / Apto{" "}
          {unidade.numero_apartamento}
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">Moradores e Vínculos</Typography>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleOpenVincularModal}
          >
            Vincular Pessoa
          </Button>
        </Box>
        <Divider />
        <List>
          {pessoas.length > 0 ? (
            // Em src/pages/UnidadePage.js
            pessoas.map((pessoa) => (
              <ListItem
                key={pessoa.vinculo_id}
                divider
                secondaryAction={
                  <>
                    <IconButton
                      edge="end"
                      aria-label="edit"
                      onClick={() => handleOpenEditarModal(pessoa)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="desvincular"
                      onClick={() =>
                        handleDesvincular(
                          pessoa.vinculo_id,
                          pessoa.nome_completo
                        )
                      }
                    >
                      <LinkOffIcon />
                    </IconButton>
                    {/* Botão para Deletar Permanente */}
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() =>
                        handleDeletePessoa(pessoa.id, pessoa.nome_completo)
                      }
                      sx={{ ml: 1, color: "error.main" }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                }
              >
                <ListItemText
                  primary={
                    <Link
                      to={`/pessoa/${pessoa.id}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        fontWeight: "bold",
                      }}
                    >
                      {pessoa.nome_completo}
                    </Link>
                  }
                  secondary={
                    <React.Fragment>
                      <Chip
                        label={pessoa.tipo_vinculo}
                        size="small"
                        color={
                          pessoa.tipo_vinculo === "Morador"
                            ? "primary"
                            : "default"
                        }
                        sx={{ mt: 1, mb: 1.5 }} // Mais espaçamento
                      />

                      {pessoa.cpf && (
                        <Box
                          sx={{ display: "flex", alignItems: "center", mb: 1 }}
                        >
                          <FingerprintIcon
                            sx={{
                              mr: 1.5,
                              fontSize: "1.2rem",
                              color: "text.secondary",
                            }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {" "}
                            {/* Texto maior */}
                            {pessoa.cpf}
                          </Typography>
                        </Box>
                      )}

                      {pessoa.telefone && (
                        <Box
                          sx={{ display: "flex", alignItems: "center", mb: 1 }}
                        >
                          <PhoneIcon
                            sx={{
                              mr: 1.5,
                              fontSize: "1.2rem",
                              color: "text.secondary",
                            }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {" "}
                            {/* Texto maior */}
                            {pessoa.telefone}
                          </Typography>
                        </Box>
                      )}

                      {pessoa.email && (
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <EmailIcon
                            sx={{
                              mr: 1.5,
                              fontSize: "1.2rem",
                              color: "text.secondary",
                            }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {" "}
                            {/* Texto maior */}
                            {pessoa.email}
                          </Typography>
                        </Box>
                      )}
                    </React.Fragment>
                  }
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText primary="Nenhuma pessoa vinculada a esta unidade." />
            </ListItem>
          )}
        </List>
      </Paper>

      <VincularPessoaModal
        open={vincularModalOpen}
        handleClose={handleCloseVincularModal}
        unidade={unidade}
        onSuccess={handleSuccess}
      />

      <EditarPessoaModal
        open={editarModalOpen}
        handleClose={handleCloseEditarModal}
        pessoa={pessoaParaEditar}
        onSuccess={handleSuccess}
      />
    </Box>
  );
}

export default UnidadePage;
