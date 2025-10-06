import React from 'react';
import { Box, Typography, CircularProgress, LinearProgress } from '@mui/material';

function SplashScreen() {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <Box sx={{ textAlign: 'center', color: 'white' }}>
        <Box
          component="img"
          src="https://cdn-icons-png.flaticon.com/512/2830/2830284.png"
          alt="SGC Logo"
          sx={{
            width: 120,
            height: 120,
            filter: 'brightness(0) invert(1)',
            mb: 3,
            animation: 'pulse 2s infinite'
          }}
        />
        
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 700,
            mb: 1,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          SGC Desktop
        </Typography>
        
        <Typography 
          variant="h6" 
          sx={{ 
            opacity: 0.9,
            mb: 4,
            fontWeight: 300
          }}
        >
          Sistema de Gestão Condominial
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <CircularProgress 
            size={24} 
            sx={{ color: 'white' }} 
          />
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Carregando sistema...
          </Typography>
        </Box>
        
        <Box sx={{ width: 300 }}>
          <LinearProgress 
            sx={{ 
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'white'
              }
            }} 
          />
        </Box>
      </Box>
      
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}
      </style>
    </Box>
  );
}

export default SplashScreen;