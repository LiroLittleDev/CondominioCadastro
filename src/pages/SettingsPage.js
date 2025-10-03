import React, { useState } from 'react';
import { Typography, Button, Box, CircularProgress, Alert } from '@mui/material';

function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const handleSetupClick = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const result = await window.api.runSetup();
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
      } else {
        setFeedback({ type: 'warning', message: result.message });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: `Ocorreu um erro: ${error.message}` });
    }
    setLoading(false);
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>Configurações do Sistema</Typography>
      <Typography paragraph>
        Ações de inicialização do sistema. Use com cuidado.
      </Typography>
      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSetupClick}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Criar Estrutura Inicial do Condomínio'}
        </Button>
        {feedback.message && (
          <Alert severity={feedback.type} sx={{ mt: 2, width: '100%', maxWidth: '600px' }}>
            {feedback.message}
          </Alert>
        )}
      </Box>
    </div>
  );
}

export default SettingsPage;