import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from "@mui/material";
import MaskedTextField from "./MaskedTextField";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 500,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};



function VincularPessoaModal({ open, handleClose, unidade, onSuccess }) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipoVinculo, setTipoVinculo] = useState("");

  const [isPessoaExistente, setIsPessoaExistente] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [telefoneError, setTelefoneError] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [rgError, setRgError] = useState("");

  const clearForm = () => {
    setNome("");
    // Não limpa o CPF para o usuário ver o que digitou
    setRg("");
    setEmail("");
    setTelefone("");
    setTipoVinculo("");
    setIsPessoaExistente(false);
    setFeedback({ type: "", message: "" });
    setLoading(false);
    setEmailError("");
    setTelefoneError("");
    setCpfError("");
    setRgError("");
  };

  useEffect(() => {
    if (open) {
      clearForm();
      setCpf(""); // Limpa o CPF apenas quando o modal abre
      setRg(""); // Limpa o RG também
    }
  }, [open]);

  const handleCpfChange = (e) => {
    const newCpf = e.target.value;
    setCpf(newCpf);

    if (newCpf.trim() === "") {
      clearForm();
    } else {
      if (!validateCpf(newCpf)) {
        setCpfError("CPF deve ter 11 dígitos");
      } else {
        setCpfError("");
      }
    }
  };

  const handleCpfComplete = async (cpfCompleto) => {
    try {
      // Remove pontos e traços do CPF
      const cpfNumeros = cpfCompleto.replace(/\D/g, "");
      const pessoa = await window.api.findPessoaByCpf(cpfNumeros);
      if (pessoa) {
        setNome(pessoa.nome_completo);
        setRg(pessoa.rg || "");
        setEmail(pessoa.email || "");
        setTelefone(pessoa.telefone || "");
        setIsPessoaExistente(true);
        setFeedback({
          type: "success",
          message:
            "Pessoa localizada! Basta selecionar a categoria para continuar.",
        });
      } else {
        setIsPessoaExistente(false);
        setFeedback({ type: "", message: "" });
      }
    } catch (err) {
      console.error("Erro ao buscar CPF", err);
      setIsPessoaExistente(false);
    }
  };

  const validateEmail = (email) => {
    if (!email) return true; // Email é opcional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateTelefone = (telefone) => {
    if (!telefone) return true; // Telefone é opcional
    const telefoneNumeros = telefone.replace(/\D/g, '');
    return telefoneNumeros.length === 11; // Deve ter 11 dígitos
  };

  const validateCpf = (cpf) => {
    if (!cpf) return true; // CPF agora é opcional
    const cpfNumeros = cpf.replace(/\D/g, '');
    return cpfNumeros.length === 11; // Deve ter 11 dígitos
  };

  const validateRg = (rg) => {
    if (!rg) return true; // RG é opcional
    return rg.length <= 27; // RG pode ter até 27 caracteres
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    if (newEmail && !validateEmail(newEmail)) {
      setEmailError("Email inválido");
    } else {
      setEmailError("");
    }
  };

  const handleTelefoneChange = (e) => {
    const newTelefone = e.target.value;
    setTelefone(newTelefone);
    
    if (newTelefone && !validateTelefone(newTelefone)) {
      setTelefoneError("Número Inválido");
    } else {
      setTelefoneError("");
    }
  };

  const handleRgChange = (e) => {
    const newRg = e.target.value;
    setRg(newRg);
    
    if (newRg && !validateRg(newRg)) {
      setRgError("RG pode ter no máximo 27 caracteres");
    } else {
      setRgError("");
    }
  };

  const handleSubmit = async () => {
    if (!nome || !tipoVinculo) {
      setFeedback({
        type: "error",
        message: "Nome e Categoria são obrigatórios.",
      });
      return;
    }
    
    if (!cpf && !rg) {
      setFeedback({
        type: "error",
        message: "CPF ou RG deve ser informado.",
      });
      return;
    }
    
    if (email && !validateEmail(email)) {
      setFeedback({
        type: "error",
        message: "Email inválido.",
      });
      return;
    }
    
    if (telefone && !validateTelefone(telefone)) {
      setFeedback({
        type: "error",
        message: "Telefone deve ter 11 dígitos ou ficar em branco.",
      });
      return;
    }
    
    if (cpf && !validateCpf(cpf)) {
      setFeedback({
        type: "error",
        message: "CPF deve ter 11 dígitos.",
      });
      return;
    }
    
    if (rg && !validateRg(rg)) {
      setFeedback({
        type: "error",
        message: "RG pode ter no máximo 27 caracteres.",
      });
      return;
    }
    
    setLoading(true);
    setFeedback({ type: "", message: "" });

    // Remove formatação do CPF, RG e telefone antes de salvar
    const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : null;
    const rgLimpo = rg || null;
    const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;

    const pessoaData = { 
      nome_completo: nome, 
      cpf: cpfLimpo, 
      rg: rgLimpo,
      email, 
      telefone: telefoneLimpo 
    };
    const vinculoData = {
      unidadeId: unidade.unidade_id,
      tipoVinculo: tipoVinculo,
    };

    const result = await window.api.createPessoaEVinculo(
      pessoaData,
      vinculoData
    );
    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setFeedback({ type: "error", message: result.message });
    }
  };

  if (!unidade) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" gutterBottom>
          Vincular Pessoa à Unidade {unidade.numero_apartamento}
        </Typography>

        <MaskedTextField
          label="CPF"
          name="cpf"
          mask="000.000.000-00"
          value={cpf}
          onChange={handleCpfChange}
          onComplete={handleCpfComplete}
          fullWidth
          margin="normal"
          error={!!cpfError}
          helperText={cpfError}
        />
        
        <TextField
          label="RG"
          fullWidth
          margin="normal"
          value={rg}
          onChange={handleRgChange}
          disabled={isPessoaExistente}
          error={!!rgError}
          helperText={rgError}
        />

        {feedback.message && !feedback.type.includes("error") && (
          <Alert severity={feedback.type} sx={{ mb: 2 }}>
            {feedback.message}
          </Alert>
        )}

        <TextField
          label="Nome Completo"
          fullWidth
          margin="normal"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          disabled={isPessoaExistente}
        />
        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={handleEmailChange}
          disabled={isPessoaExistente}
          error={!!emailError}
          helperText={emailError}
        />
        <MaskedTextField
          label="Telefone"
          name="telefone"
          mask="(00) 00000-0000"
          value={telefone}
          onChange={handleTelefoneChange}
          disabled={isPessoaExistente}
          fullWidth
          margin="normal"
          error={!!telefoneError}
          helperText={telefoneError}
        />

        <FormControl fullWidth margin="normal" required>
          <InputLabel>Tipo de Vínculo</InputLabel>
          <Select
            value={tipoVinculo}
            label="Tipo de Vínculo"
            onChange={(e) => setTipoVinculo(e.target.value)}
          >
            <MenuItem value="Proprietário">Proprietário</MenuItem>
            <MenuItem value="Inquilino">Inquilino</MenuItem>
            <MenuItem value="Morador">Morador</MenuItem>
            <MenuItem value="Morador Temporário">Morador Temporário</MenuItem>
            <MenuItem value="Responsável">Responsável</MenuItem>
          </Select>
        </FormControl>

        {feedback.message && feedback.type.includes("error") && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {feedback.message}
          </Alert>
        )}

        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            sx={{ ml: 1 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Salvar"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default VincularPessoaModal;
