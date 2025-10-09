const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
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
  clearAllData: () => ipcRenderer.invoke("clear-all-data"),
  backupData: () => ipcRenderer.invoke("backup-data"),
  importBackup: (backupData) => ipcRenderer.invoke("import-backup", backupData),
  getDetailedStats: () => ipcRenderer.invoke("get-detailed-stats"),
  
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
  // Registrar um listener para mudanças de dados disparadas pelo main
  onDataChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('data-changed', listener);
    return () => ipcRenderer.removeListener('data-changed', listener);
  },
});
