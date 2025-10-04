const { contextBridge, ipcRenderer } = require("electron");

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
  createVeiculo: (veiculoData) =>
    ipcRenderer.invoke("create-veiculo", veiculoData),
  deleteVeiculo: (veiculoId) => ipcRenderer.invoke("delete-veiculo", veiculoId),
  updateVeiculo: (veiculoId, veiculoData) =>
    ipcRenderer.invoke("update-veiculo", veiculoId, veiculoData),
  getDashboardStats: () => ipcRenderer.invoke("get-dashboard-stats"),
  searchGeral: (termo) => ipcRenderer.invoke("search-geral", termo),
  desvincularPessoa: (vinculoId) =>
    ipcRenderer.invoke("desvincular-pessoa", vinculoId),
  deletePessoa: (pessoaId) => ipcRenderer.invoke("delete-pessoa", pessoaId),
  getFilteredPessoas: (filters) => ipcRenderer.invoke('get-filtered-pessoas', filters),
  getVinculoTypes: () => ipcRenderer.invoke('get-vinculo-types'),
  getAllVeiculos: () => ipcRenderer.invoke('get-all-veiculos'),
});
