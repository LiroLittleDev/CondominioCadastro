import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, CircularProgress } from '@mui/material';

// Reusable confirmation dialog that supports async onConfirm handlers.
// - If onConfirm returns a Promise, the dialog shows a loading state until it resolves/rejects.
// - While loading, buttons and backdrop closing are disabled to avoid duplicate actions.
export default function ConfirmDialog({ open, title, content, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', destructive = false, confirmDisabled = false, confirmColor, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);

  // Reset loading when dialog is closed externally
  useEffect(() => {
    if (!open) setLoading(false);
  }, [open]);

  const handleConfirm = async () => {
    if (!onConfirm) return;
    try {
      const result = onConfirm();
      if (result && typeof result.then === 'function') {
        setLoading(true);
        await result;
        setLoading(false);
      }
    } catch (err) {
      // ensure we stop loading on error; caller may show error UI
      setLoading(false);
      throw err;
    }
  };

  return (
    <Dialog
      open={!!open}
      onClose={() => { if (!loading) onClose && onClose(); }}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Box>
          {typeof content === 'string' ? <Typography variant="body1">{content}</Typography> : content}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose && onClose()} disabled={loading}>{cancelLabel}</Button>
        <Button color={confirmColor ?? (destructive ? 'error' : 'primary')} variant="contained" onClick={handleConfirm} disabled={loading || confirmDisabled} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
