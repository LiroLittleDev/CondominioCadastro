Electron IPC - canais expostos pelo preload

Resumo
- O `preload.js` expõe duas interfaces no `window` do renderer:
  - `window.electronAPI.invoke(channel, ...args)` — wrapper seguro para invocar canais IPC do main process. As invocações são validadas por uma whitelist.
  - `window.api` — conjunto de funções de conveniência que chamam canais específicos via `ipcRenderer.invoke`.

Lista de canais permitidos (whitelist)
- get-blocos
- run-setup
- get-entradas
- get-unidades
- get-unidade-details
- getPessoasByUnidade
- create-pessoa-e-vinculo
- desvincular-pessoa
- update-pessoa
- get-pessoa-details
- get-veiculos-by-pessoa
- get-veiculos-by-unidade
- create-veiculo
- delete-veiculo
- update-veiculo
- get-all-veiculos
- get-all-unidades-details
- get-all-blocos
- get-all-veiculos-details
- get-dashboard-stats
- search-geral
- get-detailed-stats
- get-filtered-pessoas
- find-pessoa-by-cpf
- find-pessoa-by-rg
- delete-pessoa
- get-vinculo-types
- update-vinculo
- get-vinculos-by-pessoa
- create-vinculo
- delete-vinculo
- delete-all-inactive-vinculos
- transferir-pessoa
- get-report-data
- save-report
- backup-data
- import-backup
- clear-all-data
- set-backup-schedule
- get-backup-schedule
- run-backup-now
- get-estoque-stats
- get-produtos
- get-categorias-produto
- delete-produto
- create-produto
- update-produto
- get-movimentacoes
- create-movimentacao
- update-movimentacao
- delete-movimentacao
- get-acordos
- create-acordo
- get-acordo-details
- marcar-parcela-paga
- desmarcar-parcela-paga
- get-acordos-stats
- search-pessoas-acordos
- debug-count-pessoas
- delete-acordo
- arquivar-acordo
- desarquivar-acordo-forcar-ativo
- get-app-version

Observações de segurança
- Evitamos expor `ipcRenderer` diretamente; em vez disso, há um wrapper que valida o canal.
- Se você precisar adicionar um novo canal no main, atualize a whitelist em `public/preload.js` e registre a função em `window.api` se desejar uma conveniência no renderer.
- Use `contextBridge.exposeInMainWorld` com cuidado: apenas exponha o mínimo necessário.

Como usar
- Invocação direta via electronAPI:
  window.electronAPI.invoke('get-acordos', { status: 'Ativo' })

- Uso de conveniência via window.api:
  window.api.getAllBlocos().then(...)


Mantido por: equipe SGC
Gerado automaticamente: revisão realizada em 09/10/2025
