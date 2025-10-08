const isRenderer = typeof window !== 'undefined' && window;

const devLogger = {
  debug: (message) => {
    try {
      if (isRenderer && window.electronAPI && typeof window.electronAPI.sendDebug === 'function') {
        window.electronAPI.sendDebug(typeof message === 'string' ? message : JSON.stringify(message));
      } else if (isRenderer && window.api && typeof window.api.sendDebug === 'function') {
        window.api.sendDebug(typeof message === 'string' ? message : JSON.stringify(message));
      } else {
        // Fallback para console (útil também em web)
        console.log('[dev-debug]', message);
      }
    } catch (err) {
      console.error('devLogger error:', err);
    }
  }
};

export default devLogger;
