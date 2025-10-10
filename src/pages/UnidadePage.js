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
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
} from "@mui/material";
import Chip from "@mui/material/Chip";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import LinkOffIcon from "@mui/icons-material/LinkOff";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PageHeader from '../components/PageHeader';
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import VincularPessoaModal from "../components/VincularPessoaModal";
import EditarPessoaModal from "../components/EditarPessoaModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { Snackbar, Alert } from '@mui/material';

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

function UnidadePage() {
  const { unidadeId } = useParams();
  const navigate = useNavigate();
  const [unidade, setUnidade] = useState(null);
  const [pessoas, setPessoas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vincularModalOpen, setVincularModalOpen] = useState(false);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [pessoaParaEditar, setPessoaParaEditar] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, title: '', content: '', onConfirm: null, destructive: false });
  const [snack, setSnack] = useState({ open: false, severity: 'info', message: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [unidadeData, pessoasData, veiculosData] = await Promise.all([
      window.api.getUnidadeDetails(unidadeId),
      window.api.getPessoasByUnidade(unidadeId),
      window.api.getVeiculosByUnidade(unidadeId),
    ]);
    setUnidade(unidadeData);
    setPessoas(pessoasData);
    setVeiculos(veiculosData);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDesvincular = async (vinculoId, nomePessoa) => {
    setConfirmState({
      open: true,
      title: 'Desvincular Pessoa',
      content: `Tem certeza que deseja desvincular ${nomePessoa} desta unidade?`,
      destructive: false,
      onConfirm: async () => {
        setConfirmState(s => ({ ...s, open: false }));
        const result = await window.api.desvincularPessoa(vinculoId);
        if (result.success) {
          setSnack({ open: true, severity: 'success', message: 'Pessoa desvinculada com sucesso.' });
          fetchData();
        } else {
          setSnack({ open: true, severity: 'error', message: `Erro ao desvincular: ${result.message}` });
        }
      }
    });
  };

  const handleDeletePessoa = async (pessoaId, nomePessoa) => {
    setConfirmState({
      open: true,
      title: 'Excluir Pessoa',
      content: `Tem certeza que deseja EXCLUIR PERMANENTEMENTE '${nomePessoa}' e todos os seus dados (vínculos, veículos)? Esta ação é irreversível.`,
      destructive: true,
      onConfirm: async () => {
        setConfirmState(s => ({ ...s, open: false }));
        const result = await window.api.deletePessoa(pessoaId);
        if (result.success) {
          setSnack({ open: true, severity: 'success', message: result.message || 'Pessoa excluída.' });
          fetchData();
        } else {
          setSnack({ open: true, severity: 'error', message: `Erro ao excluir: ${result.message}` });
        }
      }
    });
  };

  const handleOpenVincularModal = () => setVincularModalOpen(true);
  const handleCloseVincularModal = () => setVincularModalOpen(false);

  const handleOpenEditarModal = (pessoa) => {
    // Envia dados para o modal de edição. Log de debug removido.
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
      <PageHeader 
        title={`Gerenciar Unidade: ${unidade.nome_bloco} / Apto ${unidade.numero_apartamento}`}
        showBack={true}
        onBack={() => navigate(-1)}
        mb={3}
      />

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
        <Divider sx={{ mb: 3 }} />
        {pessoas.length > 0 ? (
          <Grid container spacing={2}>
            {pessoas.map((pessoa) => (
              <Grid item xs={12} sm={6} md={4} key={pessoa.vinculo_id}>
                <Card 
                  elevation={2} 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s',
                    '&:hover': {
                      elevation: 4,
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* Header do Card */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: pessoa.tipo_vinculo === "Proprietário" ? "primary.main" :
                                  pessoa.tipo_vinculo === "Inquilino" ? "secondary.main" :
                                  pessoa.tipo_vinculo === "Morador" ? "success.main" :
                                  pessoa.tipo_vinculo === "Morador Temporário" ? "warning.main" : "grey.500",
                          mr: 2
                        }}
                      >
                        {pessoa.nome_completo.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Link
                          to={`/pessoa/${pessoa.id}`}
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: "bold", 
                              fontSize: '1rem',
                              cursor: 'pointer',
                              color: 'primary.main',
                              '&:hover': {
                                textDecoration: 'underline',
                                color: 'primary.dark'
                              },
                              transition: 'all 0.2s'
                            }}
                          >
                            {pessoa.nome_completo} 👤
                          </Typography>
                        </Link>
                        <Chip
                          label={pessoa.tipo_vinculo}
                          size="small"
                          color={
                            pessoa.tipo_vinculo === "Proprietário" ? "primary" :
                            pessoa.tipo_vinculo === "Inquilino" ? "secondary" :
                            pessoa.tipo_vinculo === "Morador" ? "success" :
                            pessoa.tipo_vinculo === "Morador Temporário" ? "warning" : "default"
                          }
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </Box>

                    {/* Informações de Contato */}
                    <Box sx={{ mb: 2 }}>
                      {pessoa.cpf && (
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <FingerprintIcon sx={{ mr: 1, fontSize: "1rem", color: "primary.main" }} />
                          <Typography variant="body2" sx={{ fontWeight: "500" }}>
                            {formatCPF(pessoa.cpf)}
                          </Typography>
                        </Box>
                      )}
                      {pessoa.rg && (
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <AssignmentIndIcon sx={{ mr: 1, fontSize: "1rem", color: "primary.main" }} />
                          <Typography variant="body2" sx={{ fontWeight: "500" }}>
                            {pessoa.rg}
                          </Typography>
                        </Box>
                      )}

                      {pessoa.telefone && (
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <PhoneIcon sx={{ mr: 1, fontSize: "1rem", color: "success.main" }} />
                          <Typography variant="body2">
                            {formatPhone(pessoa.telefone)}
                          </Typography>
                        </Box>
                      )}

                      {pessoa.email && (
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <EmailIcon sx={{ mr: 1, fontSize: "1rem", color: "info.main" }} />
                          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                            {pessoa.email}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>

                  {/* Ações do Card */}
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEditarModal(pessoa)}
                        sx={{ color: 'primary.main' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDesvincular(pessoa.vinculo_id, pessoa.nome_completo)}
                        sx={{ color: 'warning.main' }}
                      >
                        <LinkOffIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleDeletePessoa(pessoa.id, pessoa.nome_completo)}
                      sx={{ color: "error.main" }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              Nenhuma pessoa vinculada a esta unidade
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Clique em "Vincular Pessoa" para adicionar moradores
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Seção de Veículos */}
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <DirectionsCarIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Veículos da Unidade</Typography>
          <Chip 
            label={veiculos.length} 
            size="small" 
            color={veiculos.length > 0 ? "success" : "default"}
            sx={{ ml: 2 }}
          />
        </Box>
        <Divider />
        <List>
          {veiculos.length > 0 ? (
            veiculos.map((veiculo) => (
              <ListItem key={veiculo.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                      <Typography variant="h6" component="span" sx={{ fontWeight: "bold" }}>
                        {veiculo.marca} {veiculo.modelo}
                      </Typography>
                      <Chip
                        label={veiculo.placa}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={veiculo.tipo}
                        size="small"
                        color="secondary"
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Proprietário: 
                        <Link
                          to={`/pessoa/${veiculo.pessoa_id}`}
                          style={{ textDecoration: "none", color: "inherit", marginLeft: 4 }}
                        >
                          <strong>{veiculo.proprietario_nome}</strong>
                        </Link>
                      </Typography>
                      {veiculo.tipo_vinculo && (
                        <Typography variant="body2" color="text.secondary">
                          Vínculo: {veiculo.tipo_vinculo}
                        </Typography>
                      )}
                      {veiculo.cor && (
                        <Typography variant="body2" color="text.secondary">
                          Cor: {veiculo.cor}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText 
                primary="Nenhum veículo cadastrado" 
                secondary="Os moradores desta unidade ainda não cadastraram veículos."
              />
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
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        content={confirmState.content}
        destructive={confirmState.destructive}
        loading={false}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={() => { if (confirmState.onConfirm) confirmState.onConfirm(); }}
        onClose={() => setConfirmState(s => ({ ...s, open: false }))}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert onClose={() => setSnack(s => ({ ...s, open: false }))} severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default UnidadePage;
