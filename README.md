# SGC Desktop - Sistema de Gestão Condominial

> Sistema desktop completo para gestão de condomínios com interface moderna e funcionalidades avançadas

## 🎯 O que é o SGC Desktop?

O SGC Desktop é um sistema completo para administração de condomínios que permite:
- Gerenciar blocos, unidades e moradores
- Controlar veículos
- Criar vínculos entre pessoas e unidades
- Buscar e filtrar informações rapidamente
- Transferir moradores entre unidades

## 🚀 Começando - Guia Completo

### Passo 1: Preparar o Ambiente

#### 1.1 Instalar Node.js
1. Acesse [nodejs.org](https://nodejs.org)
2. Baixe a versão LTS (recomendada)
3. Execute o instalador e siga as instruções
4. Verifique a instalação:
```bash
node --version
npm --version
```

#### 1.2 Instalar Python (necessário para SQLite3)

**Windows:**
1. Acesse [python.org](https://python.org)
2. Baixe Python 3.x
3. **IMPORTANTE**: Marque "Add Python to PATH" durante a instalação
4. Instale as ferramentas de build:
```bash
npm install --global windows-build-tools
```

# Instalar Python
brew install python3
```

#### 2 Instalar Dependências
```bash
# Instalar todas as dependências principais
npm install
```

#### 2.1 Configurar o Banco de Dados
```bash
# Criar as tabelas do banco de dados
npx knex migrate:latest
```

### Passo 3: Executar o Sistema

#### 3.1 Modo Web (Desenvolvimento)
```bash
npm start
```
- Abre automaticamente no navegador em `http://localhost:3000`
- Ideal para desenvolvimento e testes

#### 3.2 Modo Desktop (Electron)
```bash
npm run electron:start
```
- Abre como aplicativo desktop
- Experiência completa do usuário final

## 🛠️ Tecnologias Utilizadas

| Categoria | Tecnologia | Versão | Função |
|-----------|------------|--------|--------|
| Frontend | React | 19.2.0 | Interface do usuário |
| UI | Material-UI | 7.3.4 | Componentes visuais |
| Desktop | Electron | 38.2.1 | Aplicativo desktop |
| Banco | SQLite3 | 5.1.7 | Armazenamento local |
| ORM | Knex.js | 3.1.0 | Consultas ao banco |
| Roteamento | React Router | 7.9.3 | Navegação entre páginas |
| Máscaras | React IMask | 7.6.1 | Formatação de campos |

## 📋 Funcionalidades Principais

### ✅ Gestão de Blocos e Unidades
- Cadastro de blocos do condomínio
- Criação de entradas por bloco
- Gerenciamento de apartamentos/unidades
- Filtros por bloco em todas as listas

### ✅ Cadastro de Pessoas
- Identificação por CPF ou RG (pelo menos um obrigatório)
- Validação automática de CPF e RG
- Máscara para telefone brasileiro
- Validação de email em tempo real
- Busca automática por CPF

### ✅ Controle de Veículos
- Placas no padrão Mercosul (AAA0A00)
- Compatibilidade com placas antigas
- Filtros por tipo de veículo
- Associação com moradores

### ✅ Sistema de Vínculos
- 5 tipos: Proprietário, Inquilino, Morador, Morador Temporário, Responsável
- Histórico completo de mudanças
- Transferências entre unidades
- Validação de vínculos únicos

### ✅ Busca e Filtros Avançados
- Busca por texto em tempo real
- Filtros combinados (bloco + tipo + texto)
- Localização automática por CPF
- Interface responsiva

## 🗂️ Como Usar o Sistema

### Navegação Principal

| Página | Acesso | Função |
|--------|--------|--------|
| **Início** | `/` | Dashboard com visão geral |
| **Blocos** | `/blocos` | Gerenciar blocos e unidades |
| **Pessoas** | `/pessoas` | Lista completa de moradores |
| **Unidades** | `/unidades` | Lista de apartamentos |
| **Veículos** | `/veiculos` | Controle de veículos |
| **Configurações** | `/configuracoes` | Ajustes do sistema |

### Fluxo de Trabalho Recomendado

#### 1️⃣ Configuração Inicial
1. **Criar Blocos**: Acesse "Blocos" → Adicionar novo bloco
2. **Definir Entradas**: Para cada bloco, criar as entradas necessárias
3. **Cadastrar Unidades**: Adicionar apartamentos em cada entrada

#### 2️⃣ Cadastro de Moradores
1. **Adicionar Pessoa**: Ir em "Pessoas" → Novo cadastro
2. **Preencher Dados**: CPF, nome, email, telefone (com validação automática)
3. **Criar Vínculo**: Associar pessoa à unidade com tipo de relacionamento

#### 3️⃣ Controle de Veículos
1. **Cadastrar Veículo**: Na página da pessoa → Adicionar veículo
2. **Informar Placa**: Sistema aceita formato Mercosul (AAA0A00)
3. **Definir Tipo**: Carro, moto, caminhão, etc.

### Tipos de Vínculo e Cores

| Tipo | Cor | Descrição |
|------|-----|-----------|
| 🔵 **Proprietário** | Azul | Dono da unidade que NÃO mora |
| 🔵 **Proprietário Morador** | Azul Claro | Dono da unidade que MORA nela (único por pessoa) |
| 🟣 **Inquilino** | Roxo | Pessoa que aluga a unidade |
| 🟢 **Morador** | Verde | Residente permanente |
| 🟠 **Morador Temporário** | Laranja | Residente por período limitado |
| ⚫ **Responsável** | Cinza | Responsável legal pela unidade |

## 🔍 Recursos de Busca

### Busca por CPF
- Digite o CPF em qualquer campo
- Sistema localiza automaticamente ao completar 11 dígitos
- Funciona em modais de vinculação
- RG como identificação alternativa quando CPF não disponível

### Filtros Combinados
- **Por Bloco**: Filtra por bloco específico
- **Por Tipo**: Filtra por tipo de vínculo
- **Por Texto**: Busca em nome, CPF, email
- **Combinação**: Use múltiplos filtros simultaneamente

## 📁 Estrutura do Projeto

```
CondominioCadastro/
├── 📂 db/                        # Banco de dados
│   ├── migrations/               # Scripts de criação de tabelas
│   └── condominio.db            # Arquivo SQLite
├── 📂 public/                    # Arquivos do Electron
│   ├── electron.js              # Processo principal
│   ├── preload.js               # Bridge React-Electron
│   └── index.html               # Template HTML
├── 📂 src/
│   ├── 📂 components/           # Componentes reutilizáveis
│   │   ├── MaskedTextField.js   # Campos com máscara
│   │   ├── VincularPessoaModal.js
│   │   ├── EditarPessoaModal.js
│   │   ├── AdicionarVeiculoModal.js
│   │   └── EditarVeiculoModal.js
│   ├── 📂 pages/                # Páginas da aplicação
│   │   ├── HomePage.js          # Dashboard
│   │   ├── BlocosPage.js        # Gestão de blocos
│   │   ├── PessoasListPage.js   # Lista de pessoas
│   │   ├── UnidadesListPage.js  # Lista de unidades
│   │   ├── VeiculosListPage.js  # Lista de veículos
│   │   ├── PessoaPage.js        # Detalhes da pessoa
│   │   ├── UnidadePage.js       # Detalhes da unidade
│   │   └── SettingsPage.js      # Configurações
│   ├── App.js                   # Componente raiz
│   └── index.js                 # Ponto de entrada
├── knexfile.js                  # Configuração do banco
└── package.json                 # Dependências
```

## 🗄️ Banco de Dados

| Tabela | Função |
|--------|--------|
| `blocos` | Blocos do condomínio |
| `entradas` | Entradas de cada bloco |
| `unidades` | Apartamentos/unidades |
| `pessoas` | Cadastro de moradores |
| `veiculos` | Veículos dos moradores |
| `vinculos` | Relacionamento pessoa-unidade |

## ⚙️ Comandos Úteis

```bash
# Desenvolvimento
npm start                    # Modo web (localhost:3000)
npm run electron:start       # Modo desktop

# Banco de dados
npx knex migrate:latest      # Executar migrações
npx knex migrate:rollback    # Desfazer última migração

# Produção
npm run build               # Gerar build otimizado
npm test                    # Executar testes
```

## 🔧 Solução de Problem

#### ❌ Erro: "Python not found"
- Certifique-se que Python está no PATH
- Reinstale Python marcando "Add to PATH"
- Reinicie o terminal/prompt

### Problemas Durante Execução

#### ❌ Banco de dados não encontrado
```bash
# Executar migrações
npx knex migrate:latest
```

#### ❌ Porta 3000 já em uso
```bash
# Matar processo na porta 3000
npx kill-port 3000
# ou usar outra porta
set PORT=3001 && npm start
```

#### ❌ Electron não abre
```bash
# Limpar cache e reinstalar
npm cache clean --force
rm -rf node_modules
npm install
```

## 🎨 Personalização

### Modificar Cores dos Vínculos
Edite o arquivo `src/components/` para alterar as cores dos chips:

```javascript
// Cores atuais
Proprietário: 'primary'    // Azul
Inquilino: 'secondary'     // Roxo  
Morador: 'success'         // Verde
'Morador Temporário': 'warning'  // Laranja
Responsável: 'default'     // Cinza
```

### Adicionar Novos Tipos de Vínculo
1. Editar modal `VincularPessoaModal.js`
2. Adicionar opção no select
3. Definir cor no sistema de chips

### Modificar Validações
Edite `MaskedTextField.js` para alterar:
- Máscaras de CPF, telefone, placa
- Regras de validação
- Mensagens de erro

## 📊 Recursos Técnicos

### Validações Implementadas
- ✅ **CPF**: Formato 000.000.000-00 (11 dígitos) - Opcional
- ✅ **RG**: Até 27 caracteres - Opcional (CPF ou RG obrigatório)
- ✅ **Telefone**: Formato (00) 00000-0000 (11 dígitos)
- ✅ **Email**: Validação de formato em tempo real
- ✅ **Placa**: Aceita formatos antigo e Mercosul
- ✅ **Campos obrigatórios**: Validação antes do salvamento

### Funcionalidades Avançadas
- 🔍 **Busca inteligente**: CPF, nome, email em tempo real
- 🔄 **Transferências**: Histórico completo de mudanças
- 🚫 **Validação de duplicatas**: Previne vínculos duplicados
- 🧹 **Limpeza automática**: Remove formatação antes de salvar
- 📱 **Interface responsiva**: Funciona em diferentes resoluções

### Arquitetura
- **Frontend**: React com Material-UI
- **Backend**: Electron com SQLite
- **Comunicação**: IPC (Inter-Process Communication)
- **Roteamento**: Hash-based para compatibilidade
- **Estado**: React Hooks (useState, useEffect)

## 🚀 Próximos Passos

Após instalar e executar o sistema:

1. **Configure os blocos** do seu condomínio
2. **Cadastre as unidades** em cada bloco
3. **Registre os moradores** com seus dados
4. **Crie os vínculos** entre pessoas e unidades
5. **Adicione veículos** aos moradores
6. **Use os filtros** para encontrar informações rapidamente

## 📞 Suporte

Se encontrar problemas:
1. Verifique a seção "Solução de Problemas"
2. Confirme se todas as dependências estão instaladas
3. Teste primeiro no modo web (`npm start`)
4. Depois teste no modo desktop (`npm run electron:start`)

## 📄 Informações do Projeto

- **Versão**: 1.0.0
- **Licença**: Uso interno
- **Desenvolvido com**: ❤️ para gestão condominial
- **Compatibilidade**: Windows

---

**🎉 Parabéns! Você está pronto para usar o SGC Desktop!**

Siga os passos de instalação e comece a gerenciar seu condomínio de forma eficiente.
