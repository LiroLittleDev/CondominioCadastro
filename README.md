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
- **UI Framework**: Material-UI (MUI)
- **Desktop**: Electron 38.2.1
- **Banco de Dados**: SQLite3
- **ORM**: Knex.js
- **Roteamento**: React Router DOM

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
├── db/                     # Banco de dados SQLite
│   ├── migrations/         # Migrações do banco
│   └── condominio.db      # Arquivo do banco
├── public/                 # Arquivos públicos do Electron
│   ├── electron.js        # Processo principal do Electron
│   └── preload.js         # Script de preload
├── src/
│   ├── components/        # Componentes React
│   ├── pages/            # Páginas da aplicação
│   └── App.js            # Componente principal
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

- **Início**: Dashboard principal
- **Blocos**: Gestão de blocos e unidades
- **Veículos**: Cadastro e controle de veículos
- **Configurações**: Configurações do sistema

## 🔧 Scripts Disponíveis

- `npm start`: Inicia o servidor de desenvolvimento
- `npm run build`: Gera build de produção
- `npm test`: Executa os testes
- `npm run electron:start`: Inicia a aplicação Electron

## 📄 Licença

Este projeto é privado e de uso interno.
=======
