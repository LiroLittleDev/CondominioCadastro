const { contextBridge, ipcRenderer } = require("electron");

// WHITELIST de canais IPC que o renderer pode invocar diretamente.
// Mantemos um wrapper seguro para evitar invocações arbitrárias de canais IPC.
const allowedChannels = new Set([
  // APIs gerais / setup
  'get-blocos', 'run-setup', 'get-entradas', 'get-unidades',
  // Unidade / Pessoas / Vinculos / Veiculos
  'get-unidade-details', 'getPessoasByUnidade', 'create-pessoa-e-vinculo', 'desvincular-pessoa', 'update-pessoa', 'get-pessoa-details',
  'get-veiculos-by-pessoa', 'get-veiculos-by-unidade', 'create-veiculo', 'delete-veiculo', 'update-veiculo', 'get-all-veiculos',
  'get-all-unidades-details', 'get-all-blocos', 'get-all-veiculos-details',
  // Dashboard / pesquisa
  'get-dashboard-stats', 'search-geral', 'get-detailed-stats',
  // Pessoas utilitários
  'get-filtered-pessoas', 'find-pessoa-by-cpf', 'find-pessoa-by-rg', 'delete-pessoa',
  // Vinculos
  'get-vinculo-types', 'update-vinculo', 'get-vinculos-by-pessoa', 'create-vinculo', 'delete-vinculo', 'delete-all-inactive-vinculos',
  'transferir-pessoa',
  // Relatórios
  'get-report-data', 'save-report',
  // Backup / Import
  'backup-data', 'import-backup', 'clear-all-data',
  // Agendamento de backup
  'set-backup-schedule', 'get-backup-schedule', 'run-backup-now',
  // Estoque
  'get-estoque-stats', 'get-produtos', 'get-categorias-produto', 'delete-produto', 'create-produto', 'update-produto',
  'get-movimentacoes', 'create-movimentacao', 'update-movimentacao', 'delete-movimentacao',
  // Acordos
  'get-acordos', 'create-acordo', 'get-acordo-details', 'marcar-parcela-paga', 'desmarcar-parcela-paga', 'get-acordos-stats',
  'search-pessoas-acordos', 'debug-count-pessoas', 'delete-acordo', 'arquivar-acordo', 'desarquivar-acordo-forcar-ativo',
  // Sistema
  'get-app-version', 'set-app-icon', 'clear-app-icon'
]);

contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (channel, ...args) => {
    if (allowedChannels.has(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    console.warn(`[preload] blocked invoke to channel: ${channel}`);
    return Promise.reject(new Error(`IPC channel "${channel}" is not allowed.`));
  }
});

contextBridge.exposeInMainWorld("api", {
  // ... (funções existentes)
  getBlocos: () => ipcRenderer.invoke("get-blocos"),
  runSetup: () => ipcRenderer.invoke("run-setup"),
  getEntradas: (blocoId) => ipcRenderer.invoke("get-entradas", blocoId),
  getUnidades: (entradaId) => ipcRenderer.invoke("get-unidades", entradaId),
  // --- NOVAS FUNÇÕES ---
  getUnidadeDetails: (unidadeId) =>
    ipcRenderer.invoke("get-unidade-details", unidadeId),
  getPessoasByUnidade: (unidadeId) =>
    ipcRenderer.invoke("getPessoasByUnidade", unidadeId),
  createPessoaEVinculo: (pessoa, vinculo) =>
    ipcRenderer.invoke("create-pessoa-e-vinculo", pessoa, vinculo),
  desvincularPessoa: (vinculoId) =>
    ipcRenderer.invoke("desvincular-pessoa", vinculoId),
  updatePessoa: (pessoaId, pessoaData) =>
    ipcRenderer.invoke("update-pessoa", pessoaId, pessoaData),
  getPessoaDetails: (pessoaId) =>
    ipcRenderer.invoke("get-pessoa-details", pessoaId),
  getVeiculosByPessoa: (pessoaId) =>
    ipcRenderer.invoke("get-veiculos-by-pessoa", pessoaId),
  getVeiculosByUnidade: (unidadeId) =>
    ipcRenderer.invoke("get-veiculos-by-unidade", unidadeId),
  createVeiculo: (veiculoData) =>
    ipcRenderer.invoke("create-veiculo", veiculoData),
  deleteVeiculo: (veiculoId) => ipcRenderer.invoke("delete-veiculo", veiculoId),
  updateVeiculo: (veiculoId, veiculoData) =>
    ipcRenderer.invoke("update-veiculo", veiculoId, veiculoData),
  getDashboardStats: () => ipcRenderer.invoke("get-dashboard-stats"),
  searchGeral: (termo) => ipcRenderer.invoke("search-geral", termo),
  deletePessoa: (pessoaId) => ipcRenderer.invoke("delete-pessoa", pessoaId),
  getFilteredPessoas: (filters) =>
    ipcRenderer.invoke("get-filtered-pessoas", filters),
  getVinculoTypes: () => ipcRenderer.invoke("get-vinculo-types"),
  getAllVeiculos: () => ipcRenderer.invoke("get-all-veiculos"),
  updateVinculo: (vinculoId, novoTipo) =>
    ipcRenderer.invoke("update-vinculo", vinculoId, novoTipo),
  getVinculosByPessoa: (pessoaId) =>
    ipcRenderer.invoke("get-vinculos-by-pessoa", pessoaId),
  createVinculo: (vinculoData) =>
    ipcRenderer.invoke("create-vinculo", vinculoData),
  transferirPessoa: (transferData) =>
    ipcRenderer.invoke("transferir-pessoa", transferData),
  findPessoaByCpf: (cpf) => ipcRenderer.invoke("find-pessoa-by-cpf", cpf),
  findPessoaByRg: (rg) => ipcRenderer.invoke("find-pessoa-by-rg", rg),
  deleteVinculo: (vinculoId) => ipcRenderer.invoke("delete-vinculo", vinculoId),
  deleteAllInactiveVinculos: (pessoaId) =>
    ipcRenderer.invoke("delete-all-inactive-vinculos", pessoaId),
  getAllUnidadesDetails: (blocoId) =>
    ipcRenderer.invoke("get-all-unidades-details", blocoId),
  getAllBlocos: () => ipcRenderer.invoke("get-all-blocos"),
  getAllVeiculosDetails: (filtros) =>
    ipcRenderer.invoke("get-all-veiculos-details", filtros),
  getReportData: (filtros) => ipcRenderer.invoke("get-report-data", filtros),
  saveReport: (options) => ipcRenderer.invoke("save-report", options),
  createPessoaSimples: (pessoaData) => ipcRenderer.invoke("create-pessoa-simples", pessoaData),
  clearAllData: (opts) => ipcRenderer.invoke("clear-all-data", opts || {}),
  backupData: (opts) => ipcRenderer.invoke("backup-data", opts || {}),
  importBackup: (backupData) => ipcRenderer.invoke("import-backup", backupData),
  getDetailedStats: () => ipcRenderer.invoke("get-detailed-stats"),
  // Versão do aplicativo
  getAppVersion: async () => {
    try {
      const res = await ipcRenderer.invoke('get-app-version');
      if (res && res.success && res.version) return res.version;
    } catch (_) {}
    return '4.0.0';
  },
  // Atualizações
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  onUpdateStatus: (cb) => {
    const listener = (_e, payload) => { try { cb(payload); } catch(_) {} };
    ipcRenderer.on('update-status', listener);
    return () => ipcRenderer.removeListener('update-status', listener);
  },
  onUpdateProgress: (cb) => {
    const listener = (_e, payload) => { try { cb(payload); } catch(_) {} };
    ipcRenderer.on('update-progress', listener);
    return () => ipcRenderer.removeListener('update-progress', listener);
  },
  // Agendamento de backups automáticos
  setBackupSchedule: (schedule) => ipcRenderer.invoke('set-backup-schedule', schedule),
  getBackupSchedule: () => ipcRenderer.invoke('get-backup-schedule'),
  runBackupNow: () => ipcRenderer.invoke('run-backup-now'),
  
  // APIs do Sistema de Estoque
  getEstoqueStats: () => ipcRenderer.invoke('get-estoque-stats'),
  getProdutos: (filtros) => ipcRenderer.invoke('get-produtos', filtros),
  getCategoriasProduto: () => ipcRenderer.invoke('get-categorias-produto'),
  deleteProduto: (produtoId) => ipcRenderer.invoke('delete-produto', produtoId),
  createProduto: (produtoData) => ipcRenderer.invoke('create-produto', produtoData),
  updateProduto: (produtoId, produtoData) => ipcRenderer.invoke('update-produto', produtoId, produtoData),
  getMovimentacoes: (filtros) => ipcRenderer.invoke('get-movimentacoes', filtros),
  createMovimentacao: (movimentacaoData) => ipcRenderer.invoke('create-movimentacao', movimentacaoData),
  updateMovimentacao: (movimentacaoId, movimentacaoData) => ipcRenderer.invoke('update-movimentacao', movimentacaoId, movimentacaoData),
  deleteMovimentacao: (movimentacaoId) => ipcRenderer.invoke('delete-movimentacao', movimentacaoId),
  
  // APIs do Sistema de Acordos
  getAcordos: (filtros) => ipcRenderer.invoke('get-acordos', filtros),
  createAcordo: (acordoData) => ipcRenderer.invoke('create-acordo', acordoData),
  getAcordoDetails: (acordoId) => ipcRenderer.invoke('get-acordo-details', acordoId),
  marcarParcelaPaga: (parcelaId, dataPagamento) => ipcRenderer.invoke('marcar-parcela-paga', parcelaId, dataPagamento),
  getAcordosStats: () => ipcRenderer.invoke('get-acordos-stats'),
  searchPessoasAcordos: (termo) => ipcRenderer.invoke('search-pessoas-acordos', termo),
  debugCountPessoas: () => ipcRenderer.invoke('debug-count-pessoas'),
  // (dev) sendDebug removido — não expor função de debug do renderer no preload
  // Ícone do aplicativo
  setAppIcon: (filePath) => ipcRenderer.invoke('set-app-icon', filePath),
  clearAppIcon: () => ipcRenderer.invoke('clear-app-icon'),
  // Registrar um listener para mudanças de dados disparadas pelo main
  onDataChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('data-changed', listener);
    return () => ipcRenderer.removeListener('data-changed', listener);
  },
});
