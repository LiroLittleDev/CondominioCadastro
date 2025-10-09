const isRenderer = typeof window !== 'undefined' && window;

const devLogger = {
  debug: (message) => {
    try {
      const safeMessage = (typeof message === 'string') ? message : (message === undefined ? '' : JSON.stringify(message));
      if (isRenderer && window.electronAPI && typeof window.electronAPI.sendDebug === 'function') {
        window.electronAPI.sendDebug(safeMessage);
      } else if (isRenderer && window.api && typeof window.api.sendDebug === 'function') {
        window.api.sendDebug(safeMessage);
      } else {
        // Fallback para console (útil também em web)
        console.log('[dev-debug]', safeMessage);
      }
    } catch (err) {
      console.error('devLogger error:', err);
    }
  }
};

export default devLogger;
