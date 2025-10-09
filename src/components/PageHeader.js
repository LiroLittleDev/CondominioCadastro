import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

/**
 * Cabeçalho padronizado com seta de navegação opcional.
 * Props:
 * - title: string (obrigatório)
 * - subtitle?: string (opcional - abaixo do título em menor tamanho)
 * - showBack?: boolean (default false)
 * - onBack?: function (default navigate(-1))
 * - rightContent?: nodo (renderiza à direita)
 * - mb?: number (margin-bottom, default 2)
 */
export default function PageHeader({ title, subtitle, showBack = false, onBack, rightContent, mb = 2 }) {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) onBack(); else navigate(-1);
  };
  return (
    <Box sx={{ display: 'flex', alignItems: subtitle ? 'flex-start' : 'center', mb, gap: 1, flexWrap: 'wrap' }}>
      <Box sx={{ display:'flex', alignItems: subtitle ? 'flex-start' : 'center', flexGrow:1 }}>
        {showBack && (
          <Tooltip title="Voltar" arrow>
            <IconButton onClick={handleBack} size="small" sx={{ mr: 1, mt: subtitle ? '2px' : 0, bgcolor:'background.paper', border:'1px solid', borderColor:'divider', '&:hover':{ bgcolor:'action.hover' } }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>{title}</Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          )}
        </Box>
      </Box>
      {rightContent && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {rightContent}
        </Box>
      )}
    </Box>
  );
}
