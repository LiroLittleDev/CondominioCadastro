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
});
