import React from 'react';
import { Modal, Box, Typography, Button } from '@mui/material';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

function AdicionarVeiculoModal({ open, handleClose, pessoa }) {
  if (!pessoa) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2">
          Adicionar Veículo para: {pessoa.nome_completo}
        </Typography>
        
        <Typography sx={{ mt: 2 }}>
          Formulário de cadastro de veículo (Placa, Modelo, Cor...) virá aqui.
        </Typography>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" sx={{ ml: 1 }}>Salvar Veículo</Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default AdicionarVeiculoModal;