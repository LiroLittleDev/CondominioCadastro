# SGC Desktop - Sistema de Gestão Condominial

Sistema desktop para gestão de condomínios desenvolvido com React e Electron.

## 📋 Funcionalidades

- **Gestão de Blocos**: Cadastro e gerenciamento de blocos do condomínio
- **Gestão de Unidades**: Controle de apartamentos e entradas
- **Cadastro de Pessoas**: Registro de moradores e proprietários
- **Controle de Veículos**: Cadastro de veículos vinculados aos moradores
- **Sistema de Vínculos**: Relacionamento entre pessoas e unidades

## 🛠️ Tecnologias

- **Frontend**: React 19.2.0
- **UI Framework**: Material-UI (MUI) 7.3.4
- **Desktop**: Electron 38.2.1
- **Banco de Dados**: SQLite3 5.1.7
- **ORM**: Knex.js 3.1.0
- **Roteamento**: React Router DOM 7.9.3
- **Build Tool**: React Scripts 5.0.1

## 📦 Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd sgc-desktop
```

2. Instale as dependências:
```bash
npm install
```

3. Execute as migrações do banco:
```bash
npx knex migrate:latest
```

## 🚀 Execução

### Modo Desenvolvimento Web
```bash
npm start
```

### Modo Electron (Desktop)
```bash
npm run electron:start
```

### Build para Produção
```bash
npm run build
```

## 📁 Estrutura do Projeto

```
sgc-desktop/
├── db/                           # Banco de dados SQLite
│   ├── migrations/               # Migrações do banco
│   │   └── 20251003172029_create_initial_tables.js
│   └── condominio.db            # Arquivo do banco
├── public/                       # Arquivos públicos do Electron
│   ├── electron.js              # Processo principal do Electron
│   ├── preload.js               # Script de preload
│   └── index.html               # Template HTML
├── src/
│   ├── components/              # Componentes React reutilizáveis
│   │   ├── AdicionarVeiculoModal.js
│   │   ├── EditarPessoaModal.js
│   │   ├── EditarVeiculoModal.js
│   │   └── VincularPessoaModal.js
│   ├── pages/                   # Páginas da aplicação
│   │   ├── BlocosPage.js        # Gestão de blocos
│   │   ├── HomePage.js          # Dashboard principal
│   │   ├── PessoaPage.js        # Detalhes de pessoa
│   │   ├── SettingsPage.js      # Configurações
│   │   └── UnidadePage.js       # Detalhes de unidade
│   ├── App.js                   # Componente principal
│   └── index.js                 # Ponto de entrada
├── knexfile.js                  # Configuração do Knex
└── package.json
```

## 🗄️ Estrutura do Banco de Dados

- **blocos**: Blocos do condomínio
- **entradas**: Entradas de cada bloco
- **unidades**: Apartamentos/unidades
- **pessoas**: Cadastro de moradores
- **veiculos**: Veículos dos moradores
- **vinculos**: Relacionamento pessoa-unidade

## 📱 Páginas Disponíveis

- **Início** (`/`): Dashboard principal com visão geral
- **Blocos** (`/blocos`): Gestão de blocos, entradas e unidades
- **Pessoa** (`/pessoa/:pessoaId`): Detalhes e edição de moradores
- **Unidade** (`/unidade/:unidadeId`): Informações específicas da unidade
- **Configurações** (`/configuracoes`): Configurações do sistema

## 🔧 Scripts Disponíveis

- `npm start`: Inicia o servidor de desenvolvimento React (porta 3000)
- `npm run build`: Gera build de produção
- `npm test`: Executa os testes unitários
- `npm run electron:start`: Inicia a aplicação Electron em modo desenvolvimento
- `npx knex migrate:latest`: Executa as migrações do banco de dados

## 🔧 Componentes Principais

### Modais
- **AdicionarVeiculoModal**: Cadastro de novos veículos
- **EditarPessoaModal**: Edição de dados de moradores
- **EditarVeiculoModal**: Edição de informações de veículos
- **VincularPessoaModal**: Criação de vínculos pessoa-unidade

### Navegação
- Interface com drawer lateral fixo
- Roteamento baseado em hash para compatibilidade com Electron
- Ícones Material-UI para navegação intuitiva

## 📄 Licença

Este projeto é privado e de uso interno.
