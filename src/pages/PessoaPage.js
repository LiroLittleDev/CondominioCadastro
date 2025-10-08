import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Alert } from "@mui/material";
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
  Avatar,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import Chip from "@mui/material/Chip";
import AdicionarVeiculoModal from "../components/AdicionarVeiculoModal";
import EditIcon from "@mui/icons-material/Edit";
import EditarVeiculoModal from "../components/EditarVeiculoModal";
import EditarPessoaModal from "../components/EditarPessoaModal";
import EditNoteIcon from "@mui/icons-material/EditNote";
import EditarVinculoModal from "../components/EditarVinculoModal";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import TransferirPessoaModal from "../components/TransferirPessoaModal";
import LinkOffIcon from "@mui/icons-material/LinkOff";

// Funções de formatação
const formatCPF = (cpf) => {
  if (!cpf) return '';
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatPhone = (phone) => {
  if (!phone) return '';
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

function PessoaPage() {
  // Estados para dialogs de confirmação e erro
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', content: '', onConfirm: null });
  const [errorDialog, setErrorDialog] = useState({ open: false, message: '' });
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

  // Adicione estas duas funções dentro de PessoaPage
  const handleDesvincular = async (vinculo) => {
    setConfirmDialog({
      open: true,
      title: 'Desvincular pessoa',
      content: `Tem certeza que deseja desvincular '${pessoa.nome_completo}' da unidade ${vinculo.nome_bloco}/${vinculo.numero_apartamento}?`,
      onConfirm: async () => {
        const result = await window.api.desvincularPessoa(vinculo.id);
        if (result.success) {
          fetchData();
        } else {
          setErrorDialog({ open: true, message: `Erro ao desvincular: ${result.message}` });
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  };

  // Adicione esta função dentro de PessoaPage
  const handleDeleteAllInactive = async () => {
    setConfirmDialog({
      open: true,
      title: 'Excluir histórico de vínculos',
      content: `Tem certeza que deseja apagar PERMANENTEMENTE TODOS os ${vinculosInativos.length} vínculos anteriores desta pessoa?`,
      onConfirm: async () => {
        const result = await window.api.deleteAllInactiveVinculos(pessoa.id);
        if (result.success) {
          fetchData();
        } else {
          setErrorDialog({ open: true, message: `Erro: ${result.message}` });
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  };

  const handleDeleteVinculo = async (vinculo) => {
    setConfirmDialog({
      open: true,
      title: 'Excluir vínculo histórico',
      content: `ATENÇÃO: Tem certeza que deseja apagar PERMANENTEMENTE o registro histórico de que '${pessoa.nome_completo}' esteve na unidade ${vinculo.nome_bloco}/${vinculo.numero_apartamento}?`,
      onConfirm: async () => {
        const result = await window.api.deleteVinculo(vinculo.id);
        if (result.success) {
          fetchData();
        } else {
          setErrorDialog({ open: true, message: `Erro ao excluir: ${result.message}` });
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  };

  const handleDeletePessoa = async () => {
    if (!pessoa) return;
    setConfirmDialog({
      open: true,
      title: 'Excluir pessoa',
      content: `Tem certeza que deseja EXCLUIR PERMANENTEMENTE '${pessoa.nome_completo}' e todos os seus dados?`,
      onConfirm: async () => {
        setConfirmDialog({
          open: true,
          title: 'Confirmação final',
          content: 'Esta ação não pode ser desfeita. Confirma a exclusão permanente?',
          onConfirm: async () => {
            const result = await window.api.deletePessoa(pessoa.id);
            if (result.success) {
              setErrorDialog({ open: true, message: result.message });
              navigate(-1);
            } else {
              setErrorDialog({ open: true, message: `Erro ao excluir: ${result.message}` });
            }
            setConfirmDialog({ ...confirmDialog, open: false });
          }
        });
      }
    });
  };

  const handleDeleteVeiculo = async (veiculoId, veiculoNome) => {
    setConfirmDialog({
      open: true,
      title: 'Excluir veículo',
      content: `Tem certeza que deseja excluir o veículo ${veiculoNome}?`,
      onConfirm: async () => {
        const result = await window.api.deleteVeiculo(veiculoId);
        if (result.success) {
          fetchData();
        } else {
          setErrorDialog({ open: true, message: `Erro ao excluir veículo: ${result.message}` });
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
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
    <>
      {/* Dialog de confirmação genérico com ícones e cores */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {confirmDialog.title.includes('Excluir pessoa') && <DeleteIcon color="error" sx={{ fontSize: 32 }} />}
          {confirmDialog.title.includes('Excluir veículo') && <DirectionsCarIcon color="error" sx={{ fontSize: 32 }} />}
          {confirmDialog.title.includes('Excluir vínculo') && <LinkOffIcon color="warning" sx={{ fontSize: 32 }} />}
          {confirmDialog.title.includes('Excluir histórico') && <DeleteIcon color="error" sx={{ fontSize: 32 }} />}
          {confirmDialog.title.includes('Desvincular') && <LinkOffIcon color="warning" sx={{ fontSize: 32 }} />}
          {confirmDialog.title.includes('Confirmação final') && <DeleteIcon color="error" sx={{ fontSize: 32 }} />}
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Alert severity={confirmDialog.title.includes('Excluir') ? 'error' : confirmDialog.title.includes('Desvincular') ? 'warning' : 'info'} icon={false} sx={{ flex: 1, bgcolor: confirmDialog.title.includes('Excluir') ? 'error.light' : confirmDialog.title.includes('Desvincular') ? 'warning.light' : 'info.light', color: confirmDialog.title.includes('Excluir') ? 'error.contrastText' : confirmDialog.title.includes('Desvincular') ? 'warning.contrastText' : 'info.contrastText', fontWeight: 500 }}>
              {confirmDialog.content}
            </Alert>
          </Box>
          {confirmDialog.title.includes('Excluir pessoa') && (
            <Typography variant="body2" color="text.secondary">Esta ação é <b>irreversível</b> e removerá todos os dados da pessoa.</Typography>
          )}
          {confirmDialog.title.includes('Excluir veículo') && (
            <Typography variant="body2" color="text.secondary">Esta ação irá remover o veículo permanentemente.</Typography>
          )}
          {confirmDialog.title.includes('Excluir vínculo') && (
            <Typography variant="body2" color="text.secondary">O registro histórico será apagado e não poderá ser recuperado.</Typography>
          )}
          {confirmDialog.title.includes('Excluir histórico') && (
            <Typography variant="body2" color="text.secondary">Todos os vínculos anteriores serão apagados permanentemente.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>Cancelar</Button>
          <Button variant="contained" color={confirmDialog.title.includes('Excluir') ? 'error' : confirmDialog.title.includes('Desvincular') ? 'warning' : 'primary'} onClick={() => { if (confirmDialog.onConfirm) confirmDialog.onConfirm(); }}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de erro genérico com ícone e cor */}
      <Dialog open={errorDialog.open} onClose={() => setErrorDialog({ open: false, message: '' })}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" sx={{ fontSize: 32 }} /> Erro
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" icon={false} sx={{ mb: 2, bgcolor: 'error.light', color: 'error.contrastText', fontWeight: 500 }}>{errorDialog.message}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialog({ open: false, message: '' })}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Box>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Perfil de Morador
          </Typography>
        </Box>
        {/* ...restante do código... */}
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ 
          display: "flex", 
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between", 
          alignItems: { xs: "stretch", sm: "flex-start" },
          gap: { xs: 2, sm: 0 },
          mb: 2 
        }}>
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 2, 
            flexGrow: 1,
            justifyContent: { xs: "center", sm: "flex-start" }
          }}>
            <Avatar 
              sx={{ 
                bgcolor: "primary.main",
                width: { xs: 40, sm: 48 },
                height: { xs: 40, sm: 48 },
                fontSize: { xs: "1.2rem", sm: "1.5rem" }
              }}
            >
              {pessoa.nome_completo.charAt(0).toUpperCase()}
            </Avatar>
            <Typography 
              variant="h5" 
              component="h2" 
              sx={{ 
                fontSize: { xs: "1.5rem", sm: "2rem" }
              }}
            >
              {pessoa.nome_completo}
            </Typography>
          </Box>
          
          {/* Grupo de Ações Principais */}
          <Box sx={{ 
            display: "flex", 
            gap: 1, 
            flexWrap: "wrap",
            justifyContent: { xs: "center", sm: "flex-end" }
          }}>
            <Button
              variant="contained"
              startIcon={<SwapHorizIcon />}
              onClick={handleOpenTransferirModal}
              color="primary"
              sx={{ 
                minWidth: { xs: "auto", sm: "120px" },
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                px: { xs: 1, sm: 2 }
              }}
            >
              {vinculosAtivos.length > 0 ? "Transferir" : "Vincular"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleOpenEditarModal}
              color="primary"
              sx={{ 
                minWidth: { xs: "auto", sm: "100px" },
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                px: { xs: 1, sm: 2 }
              }}
            >
              Editar
            </Button>
            <Button
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={handleDeletePessoa}
              color="error"
              sx={{ 
                minWidth: { xs: "auto", sm: "100px" },
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                px: { xs: 1, sm: 2 }
              }}
            >
              Excluir
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ 
          display: "flex", 
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 1, sm: 2 },
          flexWrap: "wrap"
        }}>
          {pessoa.cpf && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FingerprintIcon sx={{ color: "primary.main", fontSize: "1rem" }} />
              <Typography variant="body1" sx={{ fontWeight: "500" }}>
                CPF: {formatCPF(pessoa.cpf)}
              </Typography>
            </Box>
          )}
          
          {pessoa.rg && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FingerprintIcon sx={{ color: "secondary.main", fontSize: "1rem" }} />
              <Typography variant="body1" sx={{ fontWeight: "500" }}>
                RG: {pessoa.rg}
              </Typography>
            </Box>
          )}

          {pessoa.telefone && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PhoneIcon sx={{ color: "success.main", fontSize: "1rem" }} />
              <Typography variant="body1">
                {formatPhone(pessoa.telefone)}
              </Typography>
            </Box>
          )}

          {pessoa.email && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <EmailIcon sx={{ color: "info.main", fontSize: "1rem" }} />
              <Typography variant="body1" sx={{ wordBreak: "break-word" }}>
                {pessoa.email}
              </Typography>
            </Box>
          )}

          {!pessoa.cpf && !pessoa.rg && !pessoa.telefone && !pessoa.email && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontStyle: "italic" }}
            >
              Nenhuma informação adicional cadastrada.
            </Typography>
          )}
        </Box>
      </Paper>

      {/* SEÇÃO DE VÍNCULO ATIVO */}
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Vínculo(s) Ativo(s)
        </Typography>
        <List disablePadding>
          {vinculosAtivos.length > 0 ? (
            vinculosAtivos.map((vinculo) => (
              <ListItem key={vinculo.id} divider>
                <ListItemText
                  primary={
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        {vinculo.nome_bloco} - Apto {vinculo.numero_apartamento}
                      </Typography>
                      <Chip
                        label={vinculo.tipo_vinculo}
                        size="small"
                        color={
                          vinculo.tipo_vinculo === "Proprietário"
                            ? "primary"
                            : vinculo.tipo_vinculo === "Proprietário Morador"
                            ? "info"
                            : vinculo.tipo_vinculo === "Inquilino"
                            ? "secondary"
                            : vinculo.tipo_vinculo === "Morador"
                            ? "success"
                            : vinculo.tipo_vinculo === "Morador Temporário"
                            ? "warning"
                            : "default"
                        }
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      Vínculo ativo desde{" "}
                      {new Date(vinculo.data_inicio).toLocaleDateString(
                        "pt-BR"
                      )}
                    </Typography>
                  }
                />
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenEditarVinculoModal(vinculo)}
                    sx={{ color: "primary.main" }}
                    title="Editar vínculo"
                  >
                    <EditNoteIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDesvincular(vinculo)}
                    sx={{ color: "warning.main" }}
                    title="Desvincular"
                  >
                    <LinkOffIcon fontSize="small" />
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

      <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="h6">Vínculos Anteriores</Typography>
          {/* O botão só aparece se houver vínculos para apagar */}
          {vinculosInativos.length > 0 && (
            <Button
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteAllInactive}
            >
              Excluir Histórico
            </Button>
          )}
        </Box>
        <List disablePadding>
          {vinculosInativos.length > 0 ? (
            vinculosInativos.map(
              (
                vinculo // <-- APENAS UM MAP
              ) => (
                <ListItem
                  key={vinculo.id}
                  divider
                  secondaryAction={
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteVinculo(vinculo)}
                      sx={{ color: "error.main" }}
                      title="Excluir registro histórico"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={vinculo.tipo_vinculo}
                    secondary={`${vinculo.nome_bloco} - Apto ${
                      vinculo.numero_apartamento
                    } | Encerrado em: ${new Date(
                      vinculo.data_fim
                    ).toLocaleDateString("pt-BR")}`}
                  />
                </ListItem>
              )
            )
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nenhum vínculo anterior registrado.
            </Typography>
          )}
        </List>
      </Paper>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: { xs: 1, sm: 0 },
          mb: 2,
        }}>
          <Typography 
            variant="h6"
            sx={{ textAlign: { xs: "center", sm: "left" } }}
          >
            Veículos Cadastrados
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenVeiculoModal}
            sx={{
              fontSize: { xs: "0.8rem", sm: "0.875rem" },
              px: { xs: 1, sm: 2 },
              width: { xs: "100%", sm: "auto" }
            }}
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
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEditarVeiculoModal(veiculo)}
                      sx={{ color: "primary.main" }}
                      title="Editar veículo"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() =>
                        handleDeleteVeiculo(
                          veiculo.id,
                          `${veiculo.marca} ${veiculo.modelo}`
                        )
                      }
                      sx={{ color: "error.main" }}
                      title="Excluir veículo"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 1,
                      flexWrap: "wrap"
                    }}>
                      {veiculo.tipo === "Carro" ? (
                        <DirectionsCarIcon sx={{ color: "primary.main" }} />
                      ) : (
                        <TwoWheelerIcon sx={{ color: "secondary.main" }} />
                      )}
                      <Typography 
                        variant="h6" 
                        component="span"
                        sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
                      >
                        {veiculo.marca} {veiculo.modelo}
                      </Typography>
                      <Chip
                        label={veiculo.tipo}
                        size="small"
                        color={
                          veiculo.tipo === "Carro" ? "primary" : "secondary"
                        }
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: "bold", mb: 0.5 }}
                      >
                        Placa: {veiculo.placa}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Cor: {veiculo.cor}
                      </Typography>
                    </Box>
                  }
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
    </>
  );
}

export default PessoaPage;
