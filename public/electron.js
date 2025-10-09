const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require('fs');
const os = require('os');

function notifyDataChanged() {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('data-changed');
  });
}

// Determinar caminho do banco baseado no ambiente
let dbPath;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

if (isDev) {
  // Desenvolvimento: usar pasta do projeto
  dbPath = path.join(__dirname, "../db/condominio.db");
} else {
  // Produção: usar pasta do usuário para permitir escrita
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'condominio.db');
}

// Caminho do banco de dados (para debug/diagnóstico). Em produção isto pode apontar para userData.
console.info('Caminho do banco:', dbPath);

// Criar diretório se não existir
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Pasta para backups automáticos: Documents/BACKUP-SGC
const documentsPath = app.getPath ? app.getPath('documents') : path.join(os.homedir(), 'Documents');
const backupsDir = path.join(documentsPath, 'BACKUP-SGC');
if (!fs.existsSync(backupsDir)) {
  try { fs.mkdirSync(backupsDir, { recursive: true }); } catch(e) { console.warn('Não foi possível criar pasta de backups:', e.message); }
}

// Arquivo de configuração do agendamento de backup (persistência simples em userData)
const scheduleConfigPath = path.join(app.getPath('userData'), 'backup-schedule.json');
let backupSchedule = { mode: 'none', lastRun: null, time: '02:00', includeDb: true, weekday: 1 }; // modes: none, daily, weekly, monthly; weekday: 0=Sun..6=Sat
try {
  if (fs.existsSync(scheduleConfigPath)) {
    const raw = fs.readFileSync(scheduleConfigPath, 'utf8');
    const parsed = JSON.parse(raw);
    // garantir campos
    backupSchedule = Object.assign(backupSchedule, parsed);
    if (!backupSchedule.time) backupSchedule.time = '02:00';
    if (typeof backupSchedule.includeDb !== 'boolean') backupSchedule.includeDb = true;
    if (typeof backupSchedule.weekday !== 'number') backupSchedule.weekday = 1;
  }
} catch (e) {
  console.warn('Falha ao ler configuração de agendamento de backup:', e.message);
}

let backupTimer = null;

function persistSchedule() {
  try { fs.writeFileSync(scheduleConfigPath, JSON.stringify(backupSchedule, null, 2)); } catch (e) { console.warn('Falha ao salvar configuração de agendamento:', e.message); }
}

async function performBackupToFolder(opts = { includeDb: true }) {
  try {
    // Reuse existing backup-data handler to collect data
    const backupResult = await (async () => {
      // Manually run the same logic as backup-data but avoid circular ipc
      const tables = {
        pessoas: await knex('pessoas').select('*'),
        vinculos: await knex('vinculos').select('*'),
        veiculos: await knex('veiculos').select('*'),
        unidades: await knex('unidades').select('*'),
        blocos: await knex('blocos').select('*'),
        acordos_parcelas: await knex('acordos_parcelas').select('*'),
        produtos: await knex('produtos').select('*'),
        movimentacoes_estoque: await knex('movimentacoes_estoque').select('*'),
        categorias_produto: await knex('categorias_produto').select('*')
      };
      const backupData = {};
      Object.keys(tables).forEach(k => { backupData[k] = tables[k]; });

      let dbFileBase64 = null;
      if (opts.includeDb) {
        try {
          if (fs.existsSync(dbPath)) {
            const buf = fs.readFileSync(dbPath);
            dbFileBase64 = buf.toString('base64');
          }
        } catch (err) { console.warn('Erro ao ler DB para backup automático:', err.message); }
      }

      return { success: true, data: { timestamp: new Date().toISOString(), ...backupData, db_file_base64: dbFileBase64 } };
    })();

    if (backupResult && backupResult.success) {
      const fileName = `backup_sgc_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
      const filePath = path.join(backupsDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(backupResult.data, null, 2), 'utf8');
      backupSchedule.lastRun = new Date().toISOString();
      persistSchedule();
      return { success: true, path: filePath };
    }
    return { success: false, message: 'Falha ao gerar backup automático' };
  } catch (e) {
    console.error('Erro em performBackupToFolder:', e);
    return { success: false, message: e.message };
  }
}

function scheduleNextRun() {
  // Limpar timer anterior
  try { if (backupTimer) { clearTimeout(backupTimer); backupTimer = null; } } catch(e){}

  if (!backupSchedule || !backupSchedule.mode || backupSchedule.mode === 'none') return;

  const now = new Date();
  let next = null;
  // parse time HH:MM
  let hh = 2, mm = 0;
  try {
    const parts = (backupSchedule.time || '02:00').split(':');
    hh = parseInt(parts[0], 10) || 2;
    mm = parseInt(parts[1], 10) || 0;
  } catch (e) { /* fallback */ }

  if (backupSchedule.mode === 'daily') {
    next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
    if (next.getTime() <= now.getTime()) {
      // já passou hoje -> agendar para amanhã
      next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hh, mm, 0);
    }
  } else if (backupSchedule.mode === 'weekly') {
    // próxima ocorrência do weekday configurado (0=Dom .. 6=Sáb) às hh:mm
    const targetWeekday = typeof backupSchedule.weekday === 'number' ? backupSchedule.weekday : 1;
    const today = now.getDay();
    let daysUntil = (targetWeekday - today + 7) % 7; // 0..6
    next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil, hh, mm, 0);
    if (next.getTime() <= now.getTime()) {
      // já passou hoje -> agendar para a próxima semana
      next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (daysUntil || 7), hh, mm, 0);
    }
  } else if (backupSchedule.mode === 'monthly') {
    // primeiro dia do mês às hh:mm
    const month = now.getMonth();
    const year = now.getFullYear();
    let candidate = new Date(year, month, 1, hh, mm, 0);
    if (candidate.getTime() <= now.getTime()) {
      candidate = new Date(year, month + 1, 1, hh, mm, 0);
    }
    next = candidate;
  }

  if (!next) return;

  const delay = Math.max(1000, next.getTime() - now.getTime());
  backupTimer = setTimeout(async () => {
    try {
      await performBackupToFolder({ includeDb: !!backupSchedule.includeDb });
    } catch(e) { console.warn('Erro ao executar backup agendado:', e.message); }
    // re-agendar
    scheduleNextRun();
  }, delay);
}

// iniciar agendamento se necessário
scheduleNextRun();

// Configuração do Knex
const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn, cb) => {
      conn.run('PRAGMA foreign_keys = ON', cb);
    }
  }
});

// Utilitário de migração leve: garante colunas ausentes em bases já existentes
async function ensureColumn(tableName, columnName, builderFn) {
  try {
    const exists = await knex.schema.hasColumn(tableName, columnName);
    if (!exists) {
      console.info(`Atualizando schema: adicionando coluna ${columnName} em ${tableName}...`);
      await knex.schema.alterTable(tableName, builderFn);
      console.info(`✅ Coluna ${columnName} adicionada em ${tableName}`);
    }
  } catch (e) {
    console.warn(`Falha ao garantir coluna ${columnName} em ${tableName}:`, e.message);
  }
}

// Expor versão do app
ipcMain.handle('get-app-version', async () => {
  try { return { success: true, version: app.getVersion ? app.getVersion() : '4.0.0' }; }
  catch (e) { return { success: true, version: '4.0.0' }; }
});

// Função para inicializar banco
async function initializeDatabase() {
  try {
    // Verificar se as tabelas existem
    const hasTable = await knex.schema.hasTable('blocos');
    
    if (!hasTable) {
  // Criando estrutura do banco de dados (apenas quando o DB não existe)
  console.info('Criando estrutura do banco de dados...');
      
      // Criar tabelas principais em cadeia
      await knex.schema
        .createTable('blocos', function (table) {
          table.increments('id');
          table.string('nome', 255).notNullable();
        })
        .createTable('entradas', function (table) {
          table.increments('id');
          table.string('letra', 1).notNullable();
          table.integer('bloco_id').unsigned().references('id').inTable('blocos');
        })
        .createTable('unidades', function (table) {
          table.increments('id');
          table.string('numero_apartamento', 10).notNullable();
          table.integer('entrada_id').unsigned().references('id').inTable('entradas');
        })
        .createTable('pessoas', function (table) {
          table.increments('id');
          table.string('nome_completo', 255).notNullable();
          table.string('cpf', 14).unique();
          table.string('rg', 27);
          table.string('email', 255);
          table.string('telefone', 20);
        })
        .createTable('veiculos', function (table) {
          table.increments('id');
          table.string('placa', 10).unique().notNullable();
          table.string('marca', 255);
          table.string('modelo', 255);
          table.string('cor', 50);
          table.string('tipo', 50);
          table.integer('pessoa_id').unsigned().references('id').inTable('pessoas');
          table.text('observacao');
        })
        .createTable('vinculos', function (table) {
          table.increments('id');
          table.integer('pessoa_id').unsigned().references('id').inTable('pessoas');
          table.integer('unidade_id').unsigned().references('id').inTable('unidades');
          table.string('tipo_vinculo', 255).notNullable();
          table.date('data_inicio');
          table.date('data_fim');
          table.string('status', 50).notNullable().defaultTo('Ativo');
          table.text('observacao');
        })
        .createTable('acordos_parcelas', function(table) {
          table.increments('id').primary();
          table.integer('pessoa_id').unsigned().notNullable();
          table.string('descricao').notNullable();
          table.decimal('valor_total', 10, 2).notNullable();
          table.decimal('valor_entrada', 10, 2).defaultTo(0);
          table.integer('numero_parcela').notNullable();
          table.integer('total_parcelas').notNullable();
          table.decimal('valor_parcela', 10, 2).notNullable();
          table.date('data_acordo').notNullable();
          table.date('data_vencimento').notNullable();
          table.date('data_pagamento').nullable();
          table.string('status_parcela').defaultTo('Pendente');
          table.string('status_acordo').defaultTo('Ativo');
          table.timestamps(true, true);
          table.foreign('pessoa_id').references('id').inTable('pessoas');
          table.index(['pessoa_id', 'status_acordo']);
        });

      // Criar tabelas de estoque na criação inicial
      await knex.schema
        .createTable('categorias_produto', function (table) {
          table.increments('id');
          table.string('nome', 100).notNullable();
          table.text('descricao');
        })
        .createTable('produtos', function (table) {
          table.increments('id');
          table.string('codigo', 50).unique();
          table.string('nome', 255).notNullable();
          table.integer('categoria_id').unsigned().references('id').inTable('categorias_produto');
          table.string('unidade_medida', 20);
          table.integer('estoque_minimo').defaultTo(0);
          table.decimal('valor_unitario', 10, 2);
          table.boolean('ativo').defaultTo(true);
        })
        .createTable('movimentacoes_estoque', function (table) {
          table.increments('id');
          table.integer('produto_id').unsigned().references('id').inTable('produtos');
          table.string('tipo', 20).notNullable();
          table.integer('quantidade').notNullable();
          table.string('motivo', 255);
          table.date('data_movimentacao').defaultTo(knex.fn.now());
          table.string('responsavel', 255);
          table.text('observacao');
        });

      // Inserir categorias padrão
      try {
        await knex('categorias_produto').insert([
          { nome: 'Limpeza', descricao: 'Produtos de limpeza e higiene' },
          { nome: 'Manutenção', descricao: 'Materiais para manutenção predial' },
          { nome: 'Escritório', descricao: 'Material de escritório e papelaria' },
          { nome: 'Segurança', descricao: 'Equipamentos de segurança' },
          { nome: 'Jardinagem', descricao: 'Produtos para jardinagem' }
        ]);
      } catch (e) { /* pode já existir */ }

      
      

      
  console.info('✅ Estrutura do banco criada com sucesso!');
    } else {
      // Verificar se tabela de acordos existe e criar se necessário
      const hasAcordosTable = await knex.schema.hasTable('acordos_parcelas');
      if (!hasAcordosTable) {
        console.log('Criando tabela de acordos...');
        await knex.schema.createTable('acordos_parcelas', function(table) {
          table.increments('id').primary();
          table.integer('pessoa_id').unsigned().notNullable();
          table.string('descricao').notNullable();
          table.decimal('valor_total', 10, 2).notNullable();
          table.decimal('valor_entrada', 10, 2).defaultTo(0);
          table.integer('numero_parcela').notNullable();
          table.integer('total_parcelas').notNullable();
          table.decimal('valor_parcela', 10, 2).notNullable();
          table.date('data_acordo').notNullable();
          table.date('data_vencimento').notNullable();
          table.date('data_pagamento').nullable();
          table.string('status_parcela').defaultTo('Pendente');
          table.string('status_acordo').defaultTo('Ativo');
          table.timestamps(true, true);
          
          table.foreign('pessoa_id').references('id').inTable('pessoas');
          table.index(['pessoa_id', 'status_acordo']);
        });
        console.log('✅ Tabela de acordos criada!');
      }
      
      // Verificar se tabelas de estoque existem e criar se necessário
      const hasEstoqueTable = await knex.schema.hasTable('produtos');
      if (!hasEstoqueTable) {
        console.log('Criando tabelas de estoque...');
        await knex.schema
          .createTable('categorias_produto', function (table) {
            table.increments('id');
            table.string('nome', 100).notNullable();
            table.text('descricao');
          })
          .createTable('produtos', function (table) {
            table.increments('id');
            table.string('codigo', 50).unique();
            table.string('nome', 255).notNullable();
            table.integer('categoria_id').unsigned().references('id').inTable('categorias_produto');
            table.string('unidade_medida', 20);
            table.integer('estoque_minimo').defaultTo(0);
            table.decimal('valor_unitario', 10, 2);
            table.boolean('ativo').defaultTo(true);
          })
          .createTable('movimentacoes_estoque', function (table) {
            table.increments('id');
            table.integer('produto_id').unsigned().references('id').inTable('produtos');
            table.string('tipo', 20).notNullable();
            table.integer('quantidade').notNullable();
            table.string('motivo', 255);
            table.date('data_movimentacao').defaultTo(knex.fn.now());
            table.string('responsavel', 255);
            table.text('observacao');
          });
        
        // Inserir categorias padrão
        await knex('categorias_produto').insert([
          { nome: 'Limpeza', descricao: 'Produtos de limpeza e higiene' },
          { nome: 'Manutenção', descricao: 'Materiais para manutenção predial' },
          { nome: 'Escritório', descricao: 'Material de escritório e papelaria' },
          { nome: 'Segurança', descricao: 'Equipamentos de segurança' },
          { nome: 'Jardinagem', descricao: 'Produtos para jardinagem' }
        ]);
        
        console.log('✅ Tabelas de estoque criadas!');
      }

      // Migrações leves: garantir colunas ausentes em DBs antigos
      // pessoas.rg é usada em cadastros; alguns bancos antigos podem não ter esta coluna
      await ensureColumn('pessoas', 'rg', (table) => table.string('rg', 27));

      console.log('✅ Banco de dados já existe e está pronto!');
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
  }
}



let splashWindow;
let mainWindow;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: false,
    alwaysOnTop: false,
    transparent: false,
    center: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  // Carregar splash com versão dinâmica via querystring
  let currentVersion = '4.0.0';
  try { currentVersion = app.getVersion ? app.getVersion() : '4.0.0'; } catch(_) {}
  splashWindow.loadFile(path.join(__dirname, 'splash.html'), { search: `?v=${encodeURIComponent(currentVersion)}`});
  
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    alwaysOnTop: false,
    resizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'favicon.ico'),
    title: 'SGC Desktop - Sistema de Gestão Condominial',
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Remove completamente a barra de menu
  mainWindow.setMenuBarVisibility(false);

  // Carrega a aplicação
  const isDev = process.env.NODE_ENV === 'development';

  // Filtrar mensagens ruidosas do DevTools (por exemplo, Autofill protocol) para não poluir o log
  // Usar a assinatura moderna: receber um único objeto de evento com as propriedades de mensagem
  mainWindow.webContents.on('console-message', (event) => {
    try {
      // Alguns lançamentos do Electron usam um objeto com { level, message, sourceId, line }
      // Em outros casos, pode haver um campo `args` com os argumentos do console.
      const level = event?.level ?? 0;

      let message = '';
      if (typeof event?.message === 'string' && event.message.length > 0) {
        message = event.message;
      } else if (Array.isArray(event?.args) && event.args.length > 0) {
        message = event.args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      }

      // Se não conseguimos extrair mensagem, não poluir o log
      if (!message) return;

      // Ignorar mensagens ruidosas/esperadas do DevTools e bibliotecas:
      const ignorePatterns = [
        'Autofill.enable',
        'Autofill.setAddresses',
        'Download the React DevTools',
        'React DevTools',
        'Electron Security Warning (Insecure Content-Security-Policy)',
        'React Router Future Flag Warning'
      ];

      for (const pat of ignorePatterns) {
        if (message.includes(pat)) return;
      }

      // Encaminhar mensagens relevantes para o terminal principal (mantendo o nível)
      if (level === 2) console.error(`[renderer] ${message}`);
      else if (level === 1) console.warn(`[renderer] ${message}`);
      else console.log(`[renderer] ${message}`);
    } catch (err) {
      // Se houver problema ao inspecionar a mensagem, apenas seguir adiante
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }
  // Em desenvolvimento, abrir DevTools para inspecionar erros do renderer
  try {
    if (isDev) {
      // Não abrir DevTools automaticamente em desenvolvimento para evitar sobreposição
      // mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } catch (e) {
    console.error('Não foi possível abrir DevTools:', e);
  }


  // Listeners úteis para diagnosticar tela branca / falhas do renderer
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('did-fail-load', { errorCode, errorDescription, validatedURL, isMainFrame });
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('mainWindow: did-finish-load - conteúdo carregado com sucesso');
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('render-process-gone', details);
  });

  mainWindow.on('unresponsive', () => {
    console.error('janela principal está sem resposta (unresponsive)');
  });

  mainWindow.webContents.on('crashed', () => {
    console.error('Renderer crash detectado');
  });
  
  mainWindow.once('ready-to-show', () => {
    // Aguardar pelo menos 3 segundos antes de mostrar a janela principal
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close();
      }
  mainWindow.show();
  mainWindow.focus();
    }, 3000);
  });
}

function createWindow() {
  createSplashWindow();
  createMainWindow();
}

// Handler para salvar relatórios
ipcMain.handle('save-report', async (event, options) => {
  const { dialog } = require('electron');
  
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const dateTime = `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
    
    const result = await dialog.showSaveDialog({
      filters: options.filters,
      defaultPath: `relatorio_${dateTime}.${options.format}`
    });
    
    if (!result.canceled) {
      fs.writeFileSync(result.filePath, Buffer.from(options.data));
      return { success: true, path: result.filePath };
    }
    return { success: false };
  } catch (error) {
    console.error('Erro ao salvar relatório:', error);
    return { success: false, error: error.message };
  }
});

// Handler para buscar dados do relatório com filtros
ipcMain.handle('get-report-data', async (event, filtros = {}) => {
  try {
    let query = knex('vinculos')
      .join('pessoas', 'vinculos.pessoa_id', 'pessoas.id')
      .join('unidades', 'vinculos.unidade_id', 'unidades.id')
      .join('entradas', 'unidades.entrada_id', 'entradas.id')
      .join('blocos', 'entradas.bloco_id', 'blocos.id')
      .where('vinculos.status', 'Ativo')
      .select(
        'vinculos.id as vinculo_id',
        'pessoas.id as pessoa_id',
        'pessoas.nome_completo',
        'pessoas.cpf',
        'pessoas.telefone',
        'pessoas.email',
        'blocos.nome as nome_bloco',
        'unidades.numero_apartamento',
        'vinculos.tipo_vinculo'
      );

    // Aplicar filtros
    if (filtros.blocoId) {
      query = query.where('blocos.id', filtros.blocoId);
    }
    if (filtros.tipoVinculo) {
      if (filtros.tipoVinculo === 'Proprietários') {
        query = query.whereIn('vinculos.tipo_vinculo', ['Proprietário', 'Proprietário Morador']);
      } else {
        query = query.where('vinculos.tipo_vinculo', filtros.tipoVinculo);
      }
    }
    if (filtros.entrada) {
      query = query.where('entradas.letra', filtros.entrada);
    }
    if (filtros.busca) {
      const termoBusca = filtros.busca.trim();
      if (termoBusca.length >= 2) {
        const termoBuscaLimpo = termoBusca.replace(/\D/g, ''); // Para CPF
        query = query.where(function() {
          // Busca exata por CPF se for número
          if (termoBuscaLimpo.length >= 3) {
            this.where('pessoas.cpf', 'like', `%${termoBuscaLimpo}%`);
          }
          // Busca por nome (palavras completas)
          const palavras = termoBusca.toLowerCase().split(' ').filter(p => p.length >= 2);
          palavras.forEach(palavra => {
            this.orWhereRaw('LOWER(pessoas.nome_completo) LIKE ?', [`%${palavra}%`]);
          });
          // Busca por email
          if (termoBusca.includes('@') || termoBusca.includes('.')) {
            this.orWhereRaw('LOWER(pessoas.email) LIKE ?', [`%${termoBusca.toLowerCase()}%`]);
          }
        });
      }
    }

    // Aplicar ordenação
    let orderBy = 'pessoas.nome_completo';
    if (filtros.ordenacao === 'unidade') {
      orderBy = ['blocos.nome', 'unidades.numero_apartamento'];
    } else if (filtros.ordenacao === 'categoria') {
      orderBy = 'vinculos.tipo_vinculo';
    }
    
    const vinculosAtivos = Array.isArray(orderBy) 
      ? await query.orderBy(orderBy[0], 'asc').orderBy(orderBy[1], 'asc')
      : await query.orderBy(orderBy, 'asc');
    
    // Buscar veículos sempre para poder aplicar filtros
    const todosVeiculos = await knex('veiculos').select('*');
    
    let reportData = vinculosAtivos.map(vinculo => {
      const veiculosDaPessoa = todosVeiculos.filter(v => v.pessoa_id === vinculo.pessoa_id);
      return {
        ...vinculo,
        veiculos: filtros.incluirVeiculos ? veiculosDaPessoa : [],
        temVeiculos: veiculosDaPessoa.length > 0
      };
    });
    
    // Aplicar filtros de veículos
    if (filtros.apenasComVeiculos) {
      reportData = reportData.filter(item => item.temVeiculos);
    }
    if (filtros.apenasSemVeiculos) {
      reportData = reportData.filter(item => !item.temVeiculos);
    }
    
    // Calcular estatísticas baseadas nos dados filtrados
    const pessoasUnicas = new Set(reportData.map(item => item.pessoa_id)).size;
    const totalVinculos = reportData.length;
    
    // Contar por categoria
    const estatisticasPorCategoria = reportData.reduce((acc, item) => {
      const categoria = item.tipo_vinculo;
      const existing = acc.find(cat => cat.tipo_vinculo === categoria);
      if (existing) {
        existing.quantidade++;
      } else {
        acc.push({ tipo_vinculo: categoria, quantidade: 1 });
      }
      return acc;
    }, []);
    
    // Contar veículos únicos
    const veiculosUnicos = new Set();
    reportData.forEach(item => {
      item.veiculos.forEach(veiculo => {
        veiculosUnicos.add(veiculo.id);
      });
    });
    const totalVeiculos = veiculosUnicos.size;
    


    return {
      dados: reportData,
      estatisticas: {
        totalPessoas: pessoasUnicas,
        totalVinculos: totalVinculos,
        totalVeiculos: totalVeiculos,
        porCategoria: estatisticasPorCategoria
      }
    };
  } catch (error) {
    console.error('Erro ao gerar dados do relatório:', error);
    return { dados: [], estatisticas: { totalPessoas: 0, totalVinculos: 0, totalVeiculos: 0, porCategoria: [] } };
  }
});

// Handler para criar vínculo
ipcMain.handle('create-vinculo', async (event, vinculoData) => {
  try {
    const vinculoExistente = await knex('vinculos')
      .where({
        pessoa_id: vinculoData.pessoaId,
        unidade_id: vinculoData.unidadeId,
        tipo_vinculo: vinculoData.tipoVinculo,
      })
      .first();

    if (vinculoExistente) {
      throw new Error('Esta pessoa já possui exatamente este mesmo vínculo nesta unidade.');
    }

    await knex('vinculos').insert({
      pessoa_id: vinculoData.pessoaId,
      unidade_id: vinculoData.unidadeId,
      tipo_vinculo: vinculoData.tipoVinculo,
      data_inicio: new Date().toISOString().split('T')[0],
      status: 'Ativo'
    });
    return { success: true, message: 'Pessoa vinculada com sucesso!' };
  } catch (error) {
    console.error('Erro ao criar vínculo:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handler para buscar todos os blocos
ipcMain.handle('get-all-blocos', async () => {
  try {
    const blocos = await knex('blocos')
      .select('id', 'nome')
      .orderBy('id', 'asc');
    return blocos;
  } catch (error) {
    console.error('Erro ao buscar blocos:', error);
    return [];
  }
});

// Handler para buscar todos os veículos com detalhes
ipcMain.handle('get-all-veiculos-details', async (event, filtros = {}) => {
  try {
    let query = knex('veiculos')
      .join('pessoas', 'veiculos.pessoa_id', 'pessoas.id')
      .leftJoin('vinculos', function() {
        this.on('pessoas.id', '=', 'vinculos.pessoa_id')
            .andOn('vinculos.status', '=', knex.raw('?', ['Ativo']));
      })
      .leftJoin('unidades', 'vinculos.unidade_id', 'unidades.id')
      .leftJoin('entradas', 'unidades.entrada_id', 'entradas.id')
      .leftJoin('blocos', 'entradas.bloco_id', 'blocos.id')
      .select(
        'veiculos.*',
        'pessoas.nome_completo as nome_proprietario',
        'pessoas.telefone as telefone_proprietario',
        'blocos.nome as nome_bloco',
        'unidades.numero_apartamento',
        'vinculos.tipo_vinculo'
      );

    if (filtros.tipo) {
      query = query.where('veiculos.tipo', filtros.tipo);
    }
    if (filtros.blocoId) {
      query = query.where('blocos.id', filtros.blocoId);
    }
    if (filtros.busca) {
      query = query.where(function() {
        this.where('veiculos.placa', 'like', `%${filtros.busca}%`)
            .orWhere('veiculos.marca', 'like', `%${filtros.busca}%`)
            .orWhere('veiculos.modelo', 'like', `%${filtros.busca}%`)
            .orWhere('pessoas.nome_completo', 'like', `%${filtros.busca}%`);
      });
    }

    const veiculos = await query
      .orderBy('blocos.nome', 'asc')
      .orderBy('unidades.numero_apartamento', 'asc')
      .orderBy('veiculos.placa', 'asc');
    
    return veiculos;
  } catch (error) {
    console.error('Erro ao buscar veículos detalhados:', error);
    return [];
  }
});

// Handler para buscar todas as unidades com detalhes
ipcMain.handle('get-all-unidades-details', async (event, blocoId = null) => {
  try {
    const proprietariosSubquery = knex('vinculos')
      .join('pessoas', 'vinculos.pessoa_id', 'pessoas.id')
      .where('vinculos.tipo_vinculo', 'Proprietário')
      .where('vinculos.status', 'Ativo')
      .select('vinculos.unidade_id', 'pessoas.nome_completo as nome_proprietario')
      .as('proprietarios');

    let query = knex('unidades')
      .join('entradas', 'unidades.entrada_id', '=', 'entradas.id')
      .join('blocos', 'entradas.bloco_id', '=', 'blocos.id')
      .leftJoin('vinculos', function() {
        this.on('unidades.id', '=', 'vinculos.unidade_id')
            .andOn('vinculos.status', '=', knex.raw('?', ['Ativo']));
      })
      .leftJoin(proprietariosSubquery, 'unidades.id', 'proprietarios.unidade_id')
      .select(
        'unidades.id',
        'blocos.id as bloco_id',
        'blocos.nome as nome_bloco',
        'entradas.letra as letra_entrada',
        'unidades.numero_apartamento',
        'proprietarios.nome_proprietario'
      )
      .count('vinculos.id as qtd_pessoas')
      .groupBy('unidades.id');

    if (blocoId) {
      query = query.where('blocos.id', blocoId);
    }

    const unidades = await query
      .orderBy('blocos.id', 'asc')
      .orderBy('entradas.letra', 'asc')
      .orderBy('unidades.id', 'asc');
    
    return unidades;
  } catch (error) {
    console.error('Erro ao buscar detalhes de todas as unidades:', error);
    return [];
  }
});

// Handler para deletar vínculo
ipcMain.handle('delete-vinculo', async (event, vinculoId) => {
  try {
    await knex('vinculos').where({ id: vinculoId }).del();
    return { success: true, message: 'Vínculo removido com sucesso!' };
  } catch (error) {
    console.error('Erro ao deletar vínculo:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handler para buscar pessoa por CPF
ipcMain.handle("find-pessoa-by-cpf", async (event, cpf) => {
  try {
    const pessoa = await knex("pessoas").where({ cpf }).first();
    return pessoa || null;
  } catch (error) {
    console.error("Erro ao buscar pessoa por CPF:", error);
    return null;
  }
});

// Handler para buscar pessoa por RG
ipcMain.handle("find-pessoa-by-rg", async (event, rg) => {
  try {
    const pessoa = await knex("pessoas").where({ rg }).first();
    return pessoa || null;
  } catch (error) {
    console.error("Erro ao buscar pessoa por RG:", error);
    return null;
  }
});

// Handler para transferir pessoa
ipcMain.handle('transferir-pessoa', async (event, transferData) => {
  try {
    await knex.transaction(async (trx) => {
      const today = new Date().toISOString().split('T')[0];

      // Aplicar regras de negócio antes da transferência
      // Regra: Apenas um proprietário por unidade
      if (['Proprietário', 'Proprietário Morador'].includes(transferData.newTipoVinculo)) {
        const proprietarioExistente = await trx('vinculos')
          .where({
            unidade_id: transferData.newUnitId,
            status: 'Ativo'
          })
          .whereIn('tipo_vinculo', ['Proprietário', 'Proprietário Morador'])
          .first();
        
        if (proprietarioExistente) {
          throw new Error('A unidade de destino já possui um proprietário vinculado.');
        }
      }

      // Regra: Proprietário Morador só pode ter um vínculo residencial
      if (transferData.newTipoVinculo === 'Proprietário Morador') {
        const outroVinculoResidencial = await trx('vinculos')
          .where({ pessoa_id: transferData.pessoaId, status: 'Ativo' })
          .whereNot('id', transferData.oldVinculoId)
          .whereIn('tipo_vinculo', ['Proprietário Morador', 'Inquilino', 'Morador'])
          .first();
        
        if (outroVinculoResidencial) {
          throw new Error('Esta pessoa já possui outro vínculo residencial ativo. Uma pessoa só pode ser "Proprietário Morador" de um local.');
        }
      }

      // Regra: Vínculos residenciais únicos
      if (['Morador', 'Inquilino'].includes(transferData.newTipoVinculo)) {
        const outroVinculoResidencial = await trx('vinculos')
          .where({ pessoa_id: transferData.pessoaId, status: 'Ativo' })
          .whereNot('id', transferData.oldVinculoId)
          .whereIn('tipo_vinculo', ['Proprietário Morador', 'Morador', 'Inquilino'])
          .first();
        
        if (outroVinculoResidencial) {
          throw new Error('Esta pessoa já possui outro vínculo residencial ativo.');
        }
      }

      await trx('vinculos')
        .where({ id: transferData.oldVinculoId })
        .update({
          status: 'Inativo',
          data_fim: today
        });

      await trx('vinculos').insert({
        pessoa_id: transferData.pessoaId,
        unidade_id: transferData.newUnitId,
        tipo_vinculo: transferData.newTipoVinculo,
        data_inicio: today,
        status: 'Ativo'
      });
    });
    notifyDataChanged();
    return { success: true, message: 'Transferência realizada com sucesso!' };
  } catch (error) {
    console.error('Erro ao transferir pessoa:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handler para criar pessoa e vínculo
ipcMain.handle('create-pessoa-e-vinculo', async (event, pessoa, vinculo) => {
  if ((!pessoa.cpf || pessoa.cpf.trim() === '') && (!pessoa.rg || pessoa.rg.trim() === '')) {
    return { success: false, message: 'CPF ou RG deve ser informado para criar um vínculo.' };
  }

  try {
    let message = '';
    await knex.transaction(async (trx) => {
      let pessoaExistente = null;
      
      // Busca por CPF se informado
      if (pessoa.cpf && pessoa.cpf.trim() !== '') {
        pessoaExistente = await trx('pessoas').where('cpf', pessoa.cpf).first();
      }
      
      // Se não encontrou por CPF, busca por RG
      if (!pessoaExistente && pessoa.rg && pessoa.rg.trim() !== '') {
        pessoaExistente = await trx('pessoas').where('rg', pessoa.rg).first();
      }
      
      let pessoaId;

      if (pessoaExistente) {
        pessoaId = pessoaExistente.id;
        message = 'Pessoa já existente vinculada com sucesso!';
      } else {
        const [novaPessoaIdObj] = await trx('pessoas').insert(pessoa).returning('id');
        pessoaId = typeof novaPessoaIdObj === 'object' ? novaPessoaIdObj.id : novaPessoaIdObj;
        message = 'Nova pessoa cadastrada e vinculada com sucesso!';
      }

      // Regra: Apenas um proprietário por unidade (qualquer tipo)
      if (['Proprietário', 'Proprietário Morador'].includes(vinculo.tipoVinculo)) {
        const proprietarioExistente = await trx('vinculos')
          .where({
            unidade_id: vinculo.unidadeId,
            status: 'Ativo'
          })
          .whereIn('tipo_vinculo', ['Proprietário', 'Proprietário Morador'])
          .first();
        
        if (proprietarioExistente) {
          throw new Error('Esta unidade já possui um proprietário vinculado.');
        }
      }

      // Regra: Proprietário Morador só pode ter um vínculo residencial ativo
      if (vinculo.tipoVinculo === 'Proprietário Morador') {
        const proprietarioMoradorExistente = await trx('vinculos')
          .where({ pessoa_id: pessoaId, status: 'Ativo' })
          .whereIn('tipo_vinculo', ['Proprietário Morador', 'Inquilino', 'Morador'])
          .first();
        
        if (proprietarioMoradorExistente) {
          throw new Error('Esta pessoa já possui um vínculo residencial ativo. Uma pessoa só pode ser "Proprietário Morador" de um local.');
        }
      }

      // Regra: Inquilinos e Moradores só podem ter um vínculo residencial ativo
      if (['Morador', 'Inquilino'].includes(vinculo.tipoVinculo)) {
        const vinculoResidencialAtivo = await trx('vinculos')
          .where({ pessoa_id: pessoaId, status: 'Ativo' })
          .whereIn('tipo_vinculo', ['Proprietário Morador', 'Morador', 'Inquilino'])
          .first();
        
        if (vinculoResidencialAtivo) {
          throw new Error('Esta pessoa já possui um vínculo residencial ativo. Use a função "Transferir" no perfil da pessoa.');
        }
      }

      const vinculoExistente = await trx('vinculos').where({
        pessoa_id: pessoaId,
        unidade_id: vinculo.unidadeId,
        tipo_vinculo: vinculo.tipoVinculo
      }).first();

      if (vinculoExistente) {
        throw new Error('Esta pessoa já possui exatamente este mesmo vínculo nesta unidade.');
      }

      await trx('vinculos').insert({
        pessoa_id: pessoaId,
        unidade_id: vinculo.unidadeId,
        tipo_vinculo: vinculo.tipoVinculo,
        data_inicio: new Date().toISOString().split('T')[0],
        status: 'Ativo'
      });
    });
    return { success: true, message: message };
  } catch (error) {
    console.error('Erro no processo de vínculo:', error);
    return { success: false, message: error.message };
  }
});

// Outros handlers necessários (mantendo apenas os essenciais)
ipcMain.handle("get-vinculos-by-pessoa", async (event, pessoaId) => {
  try {
    const vinculos = await knex("vinculos")
      .where("pessoa_id", pessoaId)
      .join("unidades", "vinculos.unidade_id", "unidades.id")
      .join("entradas", "unidades.entrada_id", "entradas.id")
      .join("blocos", "entradas.bloco_id", "blocos.id")
      .select(
        "vinculos.*",
        "blocos.nome as nome_bloco",
        "unidades.numero_apartamento"
      )
      .orderBy("vinculos.status", "asc")
      .orderBy("vinculos.id", "desc");
    return vinculos;
  } catch (error) {
    console.error("Erro ao buscar vínculos da pessoa:", error);
    return [];
  }
});

ipcMain.handle('update-vinculo', async (event, vinculoId, novoTipo) => {
  try {
    const vinculoAtual = await knex('vinculos').where({ id: vinculoId }).first();
    if (!vinculoAtual) {
      throw new Error('Vínculo não encontrado.');
    }

    // Regra: Proprietário Morador só pode ter um vínculo residencial
    if (novoTipo === 'Proprietário Morador') {
      const outroVinculoResidencial = await knex('vinculos')
        .where('pessoa_id', vinculoAtual.pessoa_id)
        .where('status', 'Ativo')
        .whereNot('id', vinculoId)
        .whereIn('tipo_vinculo', ['Proprietário Morador', 'Morador', 'Inquilino'])
        .first();

      if (outroVinculoResidencial) {
        throw new Error('Não é possível alterar para "Proprietário Morador", pois a pessoa já possui outro vínculo residencial ativo.');
      }
    }

    // Regra: Apenas um proprietário por unidade
    if (['Proprietário', 'Proprietário Morador'].includes(novoTipo)) {
      const outroProprietario = await knex('vinculos')
        .where('unidade_id', vinculoAtual.unidade_id)
        .where('status', 'Ativo')
        .whereNot('id', vinculoId)
        .whereIn('tipo_vinculo', ['Proprietário', 'Proprietário Morador'])
        .first();

      if (outroProprietario) {
        throw new Error('Não é possível alterar para este tipo, pois a unidade já possui um proprietário.');
      }
    }

    // Regra: Vínculos residenciais únicos
    if (['Morador', 'Inquilino'].includes(novoTipo)) {
      const outroVinculoResidencial = await knex('vinculos')
        .where('pessoa_id', vinculoAtual.pessoa_id)
        .where('status', 'Ativo')
        .whereNot('id', vinculoId)
        .whereIn('tipo_vinculo', ['Proprietário Morador', 'Morador', 'Inquilino'])
        .first();

      if (outroVinculoResidencial) {
        throw new Error('Não é possível alterar para esta categoria, pois a pessoa já possui outro vínculo residencial ativo.');
      }
    }

    await knex('vinculos').where({ id: vinculoId }).update({
      tipo_vinculo: novoTipo
    });
    return { success: true, message: 'Vínculo atualizado com sucesso!' };
  } catch (error) {
    console.error('Erro ao atualizar vínculo:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handlers básicos necessários para o funcionamento
ipcMain.handle("get-blocos", async () => {
  try {
    const blocos = await knex("blocos").select("*");
    return blocos;
  } catch (error) {
    console.error("Erro ao buscar blocos:", error);
    return [];
  }
});

ipcMain.handle("get-entradas", async (event, blocoId) => {
  try {
    const entradas = await knex("entradas")
      .where("bloco_id", blocoId)
      .select("*");
    return entradas;
  } catch (error) {
    console.error("Erro ao buscar entradas:", error);
    return [];
  }
});

ipcMain.handle("get-unidades", async (event, entradaId) => {
  try {
    const unidades = await knex("unidades")
      .where("entrada_id", entradaId)
      .select("*");
    return unidades;
  } catch (error) {
    console.error("Erro ao buscar unidades:", error);
    return [];
  }
});

ipcMain.handle("get-unidade-details", async (event, unidadeId) => {
  try {
    const unidade = await knex("unidades")
      .join("entradas", "unidades.entrada_id", "=", "entradas.id")
      .join("blocos", "entradas.bloco_id", "=", "blocos.id")
      .where("unidades.id", unidadeId)
      .select(
        "unidades.id as unidade_id",
        "unidades.numero_apartamento",
        "entradas.letra as letra_entrada",
        "blocos.nome as nome_bloco"
      )
      .first();
    return unidade;
  } catch (error) {
    console.error("Erro ao buscar detalhes da unidade:", error);
    return null;
  }
});

ipcMain.handle("getPessoasByUnidade", async (event, unidadeId) => {
  try {
    const pessoas = await knex("vinculos")
      .join("pessoas", "vinculos.pessoa_id", "=", "pessoas.id")
      .where("vinculos.unidade_id", unidadeId)
      .where("vinculos.status", "Ativo")
      .select(
        "pessoas.*",
        "vinculos.tipo_vinculo",
        "vinculos.id as vinculo_id"
      );
    return pessoas;
  } catch (error) {
    console.error("Erro ao buscar pessoas da unidade:", error);
    return [];
  }
});

ipcMain.handle("update-pessoa", async (event, pessoaId, pessoaData) => {
  try {
    // Verifica duplicação de CPF se informado
    if (pessoaData.cpf) {
      const cpfExistente = await knex("pessoas")
        .where("cpf", pessoaData.cpf)
        .whereNot("id", pessoaId)
        .first();

      if (cpfExistente) {
        return {
          success: false,
          message: "Este CPF já está cadastrado para outra pessoa.",
        };
      }
    }
    
    // Verifica duplicação de RG se informado
    if (pessoaData.rg) {
      const rgExistente = await knex("pessoas")
        .where("rg", pessoaData.rg)
        .whereNot("id", pessoaId)
        .first();

      if (rgExistente) {
        return {
          success: false,
          message: "Este RG já está cadastrado para outra pessoa.",
        };
      }
    }

    await knex("pessoas").where({ id: pessoaId }).update({
      nome_completo: pessoaData.nome_completo,
      cpf: pessoaData.cpf,
      rg: pessoaData.rg,
      email: pessoaData.email,
      telefone: pessoaData.telefone,
    });
    return {
      success: true,
      message: "Dados da pessoa atualizados com sucesso!",
    };
  } catch (error) {
    console.error("Erro ao atualizar pessoa:", error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle("get-pessoa-details", async (event, pessoaId) => {
  try {
    const pessoa = await knex("pessoas").where("id", pessoaId).first();
    return pessoa;
  } catch (error) {
    console.error("Erro ao buscar detalhes da pessoa:", error);
    return null;
  }
});

ipcMain.handle("get-veiculos-by-pessoa", async (event, pessoaId) => {
  try {
    const veiculos = await knex("veiculos")
      .where("pessoa_id", pessoaId)
      .select("*");
    return veiculos;
  } catch (error) {
    console.error("Erro ao buscar veículos da pessoa:", error);
    return [];
  }
});

ipcMain.handle("create-veiculo", async (event, veiculoData) => {
  try {
    const veiculoExistente = await knex("veiculos")
      .where("placa", veiculoData.placa)
      .first();
    if (veiculoExistente) {
      return {
        success: false,
        message: "Esta placa já está cadastrada no sistema.",
      };
    }

    await knex("veiculos").insert(veiculoData);
    return { success: true, message: "Veículo cadastrado com sucesso!" };
  } catch (error) {
    console.error("Erro ao criar veículo:", error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle("delete-veiculo", async (event, veiculoId) => {
  try {
    await knex("veiculos").where({ id: veiculoId }).del();
    return { success: true, message: "Veículo excluído com sucesso." };
  } catch (error) {
    console.error("Erro ao excluir veículo:", error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle("update-veiculo", async (event, veiculoId, veiculoData) => {
  try {
    const veiculoExistente = await knex("veiculos")
      .where("placa", veiculoData.placa)
      .whereNot("id", veiculoId)
      .first();
    if (veiculoExistente) {
      return {
        success: false,
        message: "Esta placa já está cadastrada para outro veículo.",
      };
    }

    await knex("veiculos").where({ id: veiculoId }).update(veiculoData);
    return { success: true, message: "Veículo atualizado com sucesso!" };
  } catch (error) {
    console.error("Erro ao atualizar veículo:", error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle("desvincular-pessoa", async (event, vinculoId) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    await knex("vinculos").where({ id: vinculoId }).update({
      status: "Inativo",
      data_fim: today,
    });
    return { success: true, message: "Pessoa desvinculada com sucesso." };
  } catch (error) {
    console.error("Erro ao desvincular pessoa:", error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handler para criar pessoa sem vínculo obrigatório
ipcMain.handle('create-pessoa-simples', async (event, pessoaData) => {
  try {
    // Verifica se CPF já existe
    const pessoaExistente = await knex('pessoas').where('cpf', pessoaData.cpf).first();
    if (pessoaExistente) {
      return { success: false, message: 'Este CPF já está cadastrado no sistema.' };
    }

    const [pessoaId] = await knex('pessoas').insert(pessoaData).returning('id');
    const finalId = typeof pessoaId === 'object' ? pessoaId.id : pessoaId;
    
    return { 
      success: true, 
      message: 'Pessoa cadastrada com sucesso!',
      pessoaId: finalId
    };
  } catch (error) {
    console.error('Erro ao criar pessoa:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handler para limpar todos os dados
ipcMain.handle('clear-all-data', async (event, opts = {}) => {
  try {
    // Se solicitado, apagar o arquivo físico do DB (fluxo destrutivo)
    if (opts && opts.eraseDbFile) {
      // opcional: criar backup do arquivo DB antes
      let backupPath = null;
      try {
        if (opts.backup) {
          try {
            // Preferir gerar um backup JSON (inclui os dados e opcionalmente o arquivo DB em base64)
            // usando a função performBackupToFolder que já escreve JSON em Documents/BACKUP-SGC.
            try {
              const res = await performBackupToFolder({ includeDb: true });
              if (res && res.success && res.path) {
                backupPath = res.path;
                console.info('clear-all-data: backup JSON salvo em', backupPath);
              } else {
                // fallback: tentar cópia binária do arquivo .db se a geração JSON falhar
                console.warn('clear-all-data: falha ao gerar backup JSON, tentando fallback para cópia do arquivo DB');
                const docs = app.getPath('documents');
                const backupDir = path.join(docs, 'BACKUP-SGC');
                if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
                const stamp = new Date().toISOString().replace(/[:.]/g, '-');
                const target = path.join(backupDir, `condominio_db_backup_${stamp}.db`);
                if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, target);
                backupPath = target;
                console.info('clear-all-data: backup do DB (fallback) salvo em', target);
              }
            } catch (e) {
              console.warn('clear-all-data: falha ao criar backup JSON, tentando fallback para cópia do arquivo DB:', e && e.message ? e.message : e);
              try {
                const docs = app.getPath('documents');
                const backupDir = path.join(docs, 'BACKUP-SGC');
                if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
                const stamp = new Date().toISOString().replace(/[:.]/g, '-');
                const target = path.join(backupDir, `condominio_db_backup_${stamp}.db`);
                if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, target);
                backupPath = target;
                console.info('clear-all-data: backup do DB (fallback) salvo em', target);
              } catch (e2) {
                console.warn('clear-all-data: falha ao criar backup do DB (fallback):', e2 && e2.message ? e2.message : e2);
              }
            }
          } catch (e) {
            console.warn('clear-all-data: falha ao criar backup antes de apagar DB:', e && e.message ? e.message : e);
          }
        }

        // destruir conexões do knex para liberar o arquivo
        try { await knex.destroy(); } catch (e) { console.warn('clear-all-data: erro ao destruir knex:', e && e.message ? e.message : e); }

        // apagar arquivo do DB
        try {
          if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            console.info('clear-all-data: arquivo DB removido:', dbPath);
          } else {
            console.info('clear-all-data: arquivo DB não encontrado, nada a apagar');
          }
        } catch (e) {
          console.warn('clear-all-data: falha ao apagar arquivo DB:', e && e.message ? e.message : e);
        }

        // relançar a aplicação para que ela re-crie o DB via migrations ou setup
        setTimeout(() => {
          try {
            app.relaunch();
            app.exit(0);
          } catch (err) {
            console.error('clear-all-data: erro ao relançar app:', err);
          }
        }, 500);

        return { success: true, message: 'Arquivo DB apagado. A aplicação será reiniciada.', backupPath };
      } catch (err) {
        console.error('clear-all-data: falha durante rotina de apagar arquivo DB:', err);
        return { success: false, message: `Erro ao apagar arquivo DB: ${err.message}` };
      }
    }
    const perTableResults = [];
    await knex.transaction(async (trx) => {
      // tentativa explícita em ordem segura (filhos -> pais)
      const explicitOrder = [
        'movimentacoes_estoque',
        'acordos_parcelas',
        'vinculos',
        'veiculos',
        'produtos',
        'pessoas'
      ];

      for (const t of explicitOrder) {
        try {
          const exists = await trx.schema.hasTable(t);
          if (!exists) { perTableResults.push({ table: t, ok: false, message: 'not exists' }); continue; }
          await trx(t).del();
          perTableResults.push({ table: t, ok: true });
          console.info(`clear-all-data: tabela ${t} limpa (explícita)`);
        } catch (e) {
          perTableResults.push({ table: t, ok: false, message: e && e.message ? e.message : String(e) });
          console.warn(`clear-all-data: falha ao limpar tabela ${t} (explícita):`, e && e.message ? e.message : e);
        }
      }

      // agora executar limpeza dinâmica para quaisquer outras tabelas que possam existir
      const tablesRes = await trx.raw("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
      const tableRows = (tablesRes && tablesRes[0]) ? tablesRes[0] : tablesRes;
      const tableNames = Array.isArray(tableRows) ? tableRows.map(r => r.name).filter(Boolean) : [];

      // construir grafo de dependências: edge child -> parent (A depende de B)
      const depGraph = {};
      for (const t of tableNames) depGraph[t] = new Set();

      for (const t of tableNames) {
        try {
          const fkRes = await trx.raw(`PRAGMA foreign_key_list(${t});`);
          const fkRows = fkRes && fkRes[0] ? fkRes[0] : fkRes;
          if (Array.isArray(fkRows)) {
            for (const fk of fkRows) {
              if (fk && fk.table) {
                depGraph[t].add(fk.table);
              }
            }
          }
        } catch (e) {
          console.warn('clear-all-data: não foi possível ler foreign keys de', t, e && e.message ? e.message : e);
        }
      }

      // topological sort on depGraph (child -> parent). Kahn produces parents-first; we reverse for deletion.
      const inDegree = {};
      for (const t of Object.keys(depGraph)) inDegree[t] = depGraph[t].size;
      const parentToChildren = {};
      for (const t of Object.keys(depGraph)) parentToChildren[t] = new Set();
      for (const [child, parents] of Object.entries(depGraph)) {
        for (const parent of parents) {
          if (!parentToChildren[parent]) parentToChildren[parent] = new Set();
          parentToChildren[parent].add(child);
        }
      }

      const queue = [];
      for (const t of Object.keys(inDegree)) if (inDegree[t] === 0) queue.push(t);
      const topoOrder = [];
      while (queue.length) {
        const n = queue.shift();
        topoOrder.push(n);
        const children = parentToChildren[n] || new Set();
        for (const c of children) {
          inDegree[c] = (inDegree[c] || 0) - 1;
          if (inDegree[c] === 0) queue.push(c);
        }
      }

      const deleteOrder = topoOrder.length ? topoOrder.reverse() : tableNames;

      // excluir em deleteOrder, pulando tabelas já tentadas explicitamente
      const tried = new Set(explicitOrder);
      for (const t of deleteOrder) {
        if (tried.has(t)) continue;
        try {
          const exists = await trx.schema.hasTable(t);
          if (!exists) { perTableResults.push({ table: t, ok: false, message: 'not exists' }); continue; }
          await trx(t).del();
          perTableResults.push({ table: t, ok: true });
          console.info(`clear-all-data: tabela ${t} limpa (dinâmica)`);
        } catch (e) {
          perTableResults.push({ table: t, ok: false, message: e && e.message ? e.message : String(e) });
          console.warn(`clear-all-data: falha ao limpar tabela ${t} (dinâmica):`, e && e.message ? e.message : e);
        }
      }
    });

    const success = perTableResults.every(r => r.ok || r.message === 'not exists');
    const message = success ? 'Todos os dados foram removidos com sucesso!' : 'Limpeza executada com alguns erros. Verifique detalhes.';
    return { success, message, details: perTableResults };
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    return { success: false, message: `Erro: ${error.message}`, details: [{ table: 'transaction', ok: false, message: error.message }] };
  }
});

// Handler para backup dos dados
ipcMain.handle('backup-data', async (event, opts = {}) => {
  try {
    // tabelas principais a incluir no backup, com verificação de existência
    const tableNames = ['pessoas','vinculos','veiculos','unidades','blocos','acordos_parcelas','produtos','movimentacoes_estoque','categorias_produto'];
    const backupData = {};
    for (const t of tableNames) {
      try {
        const exists = await knex.schema.hasTable(t);
        backupData[t] = exists ? await knex(t).select('*') : [];
      } catch (e) {
        backupData[t] = [];
      }
    }

    // tentar incluir o arquivo sqlite do banco (opcional — controlado por opts.includeDb)
    let dbFileBase64 = null;
    if (opts.includeDb) {
      try {
        // usar o dbPath que já é calculado no topo do arquivo
        const dbFilePath = dbPath; // variável global configurada acima
        const exists = fs.existsSync(dbFilePath);
        if (exists) {
          const buf = fs.readFileSync(dbFilePath);
          dbFileBase64 = buf.toString('base64');
        }
      } catch (err) {
        console.warn('Não foi possível ler o arquivo DB para incluir no backup:', err.message);
        dbFileBase64 = null;
      }
    }

    const backup = {
      timestamp: new Date().toISOString(),
      ...backupData,
      db_file_base64: dbFileBase64 // pode ser null se não existir ou se não solicitado
    };
    
    return { success: true, data: backup };
  } catch (error) {
    console.error('Erro ao fazer backup:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handler para estatísticas detalhadas
ipcMain.handle('get-detailed-stats', async () => {
  try {
    const [totalPessoas] = await knex('pessoas').count('id as count');
    const [totalVeiculos] = await knex('veiculos').count('id as count');
    const [totalVinculos] = await knex('vinculos').where('status', 'Ativo').count('id as count');
    const [totalUnidades] = await knex('unidades').count('id as count');
    
    const vinculosPorTipo = await knex('vinculos')
      .where('status', 'Ativo')
      .select('tipo_vinculo')
      .count('id as count')
      .groupBy('tipo_vinculo');
    
    const veiculosPorTipo = await knex('veiculos')
      .select('tipo')
      .count('id as count')
      .groupBy('tipo');
    
    return {
      success: true,
      stats: {
        totalPessoas: totalPessoas.count,
        totalVeiculos: totalVeiculos.count,
        totalVinculos: totalVinculos.count,
        totalUnidades: totalUnidades.count,
        vinculosPorTipo,
        veiculosPorTipo
      }
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handler para buscar veículos por unidade
ipcMain.handle('get-veiculos-by-unidade', async (event, unidadeId) => {
  try {
    const veiculos = await knex('veiculos')
      .join('pessoas', 'veiculos.pessoa_id', 'pessoas.id')
      .join('vinculos', 'pessoas.id', 'vinculos.pessoa_id')
      .where('vinculos.unidade_id', unidadeId)
      .where('vinculos.status', 'Ativo')
      .select(
        'veiculos.*',
        'pessoas.nome_completo as proprietario_nome',
        'vinculos.tipo_vinculo'
      )
      .orderBy('veiculos.marca', 'asc');
    
    return veiculos;
  } catch (error) {
    console.error('Erro ao buscar veículos da unidade:', error);
    return [];
  }
});

// Handler para importar dados de backup
ipcMain.handle('import-backup', async (event, backupData) => {
  try {
    // Se o backup contém o arquivo binário do DB, vamos sobrescrever o arquivo físico
    if (backupData.db_file_base64) {
      try {
        // fechar conexões do knex para evitar lock
        try { await knex.destroy(); } catch(e) { console.warn('Erro ao destruir knex antes de restaurar DB:', e.message); }

        const buf = Buffer.from(backupData.db_file_base64, 'base64');
        // escrever no caminho do DB (dbPath definido no topo)
        fs.writeFileSync(dbPath, buf);

        // relançar a aplicação para recarregar o DB recém-escrito
        setTimeout(() => {
          try {
            app.relaunch();
            app.exit(0);
          } catch (err) {
            console.error('Erro ao relançar app após restaurar DB:', err);
          }
        }, 500);

        return { success: true, message: 'Arquivo DB restaurado com sucesso. A aplicação será reiniciada para aplicar as alterações.' };
      } catch (err) {
        console.error('Erro ao restaurar arquivo DB do backup:', err);
        return { success: false, message: `Erro ao restaurar DB: ${err.message}` };
      }
    }

    // Caso não tenha o arquivo DB, restauramos por tabelas via transaction (mais seguro para merges parciais)
    await knex.transaction(async (trx) => {
      // Limpar e restaurar em ordem segura (tabelas dependentes primeiro)
      // ordem sugerida:
      // 1) movimentacoes_estoque (depende de produtos)
      // 2) acordos_parcelas (depende de pessoas)
      // 3) vinculos (depende de pessoas/unidades)
      // 4) veiculos (depende de pessoas)
      // 5) produtos
      // 6) pessoas
      const tablesToClear = [
        'movimentacoes_estoque',
        'acordos_parcelas',
        'vinculos',
        'veiculos',
        'produtos',
        'pessoas'
      ];

      for (const t of tablesToClear) {
        try {
          await trx(t).del();
          console.info(`clear-all-data: tabela ${t} limpa`);
        } catch (e) {
          console.warn(`clear-all-data: falha ao limpar tabela ${t}:`, e && e.message ? e.message : e);
        }
      }

      // Importa outras tabelas se presentes
      if (backupData.blocos && backupData.blocos.length > 0) {
        try { await trx('blocos').del(); await trx('blocos').insert(backupData.blocos); } catch(e) { /* ignore */ }
      }
      if (backupData.unidades && backupData.unidades.length > 0) {
        try { await trx('unidades').del(); await trx('unidades').insert(backupData.unidades); } catch(e) { /* ignore */ }
      }

      if (backupData.pessoas && backupData.pessoas.length > 0) {
        await trx('pessoas').insert(backupData.pessoas);
      }

      if (backupData.veiculos && backupData.veiculos.length > 0) {
        await trx('veiculos').insert(backupData.veiculos);
      }

      if (backupData.vinculos && backupData.vinculos.length > 0) {
        await trx('vinculos').insert(backupData.vinculos);
      }

      if (backupData.produtos && backupData.produtos.length > 0) {
        try { await trx('produtos').insert(backupData.produtos); } catch(e) { /* ignore */ }
      }

      if (backupData.movimentacoes_estoque && backupData.movimentacoes_estoque.length > 0) {
        try { await trx('movimentacoes_estoque').insert(backupData.movimentacoes_estoque); } catch(e) { /* ignore */ }
      }

      if (backupData.acordos_parcelas && backupData.acordos_parcelas.length > 0) {
        try { await trx('acordos_parcelas').insert(backupData.acordos_parcelas); } catch(e) { /* ignore */ }
      }
    });

    return { 
      success: true, 
      message: `Backup importado com sucesso! ${backupData.pessoas?.length || 0} pessoas, ${backupData.veiculos?.length || 0} veículos e ${backupData.vinculos?.length || 0} vínculos restaurados.`
    };
  } catch (error) {
    console.error('Erro ao importar backup:', error);
    return { success: false, message: `Erro ao importar backup: ${error.message}` };
  }
});

ipcMain.handle("get-dashboard-stats", async () => {
  try {
    const [totalUnidades] = await knex("unidades").count("id as count");
    const [totalPessoas] = await knex("pessoas").count("id as count");
    const [totalVeiculos] = await knex("veiculos").count("id as count");

    return {
      unidades: totalUnidades.count,
      pessoas: totalPessoas.count,
      veiculos: totalVeiculos.count,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return { unidades: 0, pessoas: 0, veiculos: 0 };
  }
});

ipcMain.handle('search-geral', async (event, termo) => {
  if (!termo || termo.length < 2) {
    return [];
  }
  const termoBusca = `%${termo.toLowerCase()}%`;

  try {
    const [vinculosPessoa, veiculos, unidades, blocos] = await Promise.all([
      knex('vinculos')
        .join('pessoas', 'vinculos.pessoa_id', 'pessoas.id')
        .join('unidades', 'vinculos.unidade_id', 'unidades.id')
        .join('entradas', 'unidades.entrada_id', 'entradas.id')
        .join('blocos', 'entradas.bloco_id', 'blocos.id')
        .where('vinculos.status', 'Ativo')
        .andWhere(function() {
          this.whereRaw('LOWER(pessoas.nome_completo) LIKE ?', [termoBusca])
              .orWhere('pessoas.cpf', 'like', termoBusca)
        })
        .select(
          'pessoas.id as pessoa_id',
          'pessoas.nome_completo',
          'vinculos.tipo_vinculo',
          'blocos.nome as nome_bloco',
          'unidades.numero_apartamento'
        ),

      knex('veiculos')
        .join('pessoas', 'veiculos.pessoa_id', '=', 'pessoas.id')
        .where(function() {
          this.whereRaw('LOWER(placa) LIKE ?', [termoBusca])
              .orWhereRaw('LOWER(veiculos.marca) LIKE ?', [termoBusca])
              .orWhereRaw('LOWER(veiculos.modelo) LIKE ?', [termoBusca])
        })
        .select('veiculos.id as veiculo_id', 'veiculos.placa', 'veiculos.modelo', 'pessoas.id as pessoa_id'),

      knex('unidades')
        .join('entradas', 'unidades.entrada_id', 'entradas.id')
        .join('blocos', 'entradas.bloco_id', 'blocos.id')
        .where('numero_apartamento', 'like', termoBusca)
        .select('unidades.id', 'numero_apartamento', 'blocos.nome as nome_bloco'),

      knex('blocos')
        .whereRaw('LOWER(nome) LIKE ?', [termoBusca])
        .select('id', 'nome')
    ]);

    const resultadosFormatados = [
      ...vinculosPessoa.map(v => ({
        tipo: 'Pessoa',
        label: `${v.nome_completo} (${v.nome_bloco} - Apto ${v.numero_apartamento})`,
        path: `/pessoa/${v.pessoa_id}`
      })),
      ...veiculos.map(v => ({
        tipo: 'Veículo',
        label: `Veículo Placa: ${v.placa} (${v.modelo})`,
        path: `/pessoa/${v.pessoa_id}`
      })),
      ...unidades.map(u => ({
        tipo: 'Unidade',
        label: `Unidade: ${u.nome_bloco} / Apto ${u.numero_apartamento}`,
        path: `/unidade/${u.id}`
      })),
      ...blocos.map(b => ({
        tipo: 'Bloco',
        label: `${b.nome}`,
        path: `/blocos?bloco=${b.id}`
      }))
    ];

    return resultadosFormatados;

  } catch (error) {
    console.error('Erro na busca geral:', error);
    return [];
  }
});

ipcMain.handle("delete-pessoa", async (event, pessoaId) => {
  try {
    await knex.transaction(async (trx) => {
      await trx("vinculos").where("pessoa_id", pessoaId).del();
      await trx("veiculos").where("pessoa_id", pessoaId).del();
      await trx("pessoas").where("id", pessoaId).del();
    });
    return {
      success: true,
      message: "Pessoa e todos os seus dados foram excluídos permanentemente.",
    };
  } catch (error) {
    console.error("Erro ao excluir pessoa:", error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle("get-filtered-pessoas", async (event, filters) => {
  try {
    let pessoas;
    
    if (filters.showInactive) {
      // Buscar pessoas com vínculos ativos
      const pessoasAtivas = await knex("vinculos")
        .join("pessoas", "vinculos.pessoa_id", "=", "pessoas.id")
        .join("unidades", "vinculos.unidade_id", "=", "unidades.id")
        .join("entradas", "unidades.entrada_id", "=", "entradas.id")
        .join("blocos", "entradas.bloco_id", "=", "blocos.id")
        .where("vinculos.status", "Ativo")
        .select(
          "pessoas.*",
          "vinculos.tipo_vinculo as vinculos",
          "vinculos.status",
          "blocos.nome as nome_bloco",
          "unidades.numero_apartamento"
        );
      
      // Buscar pessoas sem vínculos ativos (inativas)
      const pessoasInativas = await knex("pessoas")
        .leftJoin("vinculos", function() {
          this.on("pessoas.id", "=", "vinculos.pessoa_id")
              .andOn("vinculos.status", "=", knex.raw("'Ativo'"));
        })
        .whereNull("vinculos.id")
        .select(
          "pessoas.*",
          knex.raw("'' as vinculos"),
          knex.raw("'Inativo' as status"),
          knex.raw("'' as nome_bloco"),
          knex.raw("'' as numero_apartamento")
        );
      
      pessoas = [...pessoasAtivas, ...pessoasInativas];
    } else {
      // Apenas pessoas com vínculos ativos
      const query = knex("vinculos")
        .join("pessoas", "vinculos.pessoa_id", "=", "pessoas.id")
        .join("unidades", "vinculos.unidade_id", "=", "unidades.id")
        .join("entradas", "unidades.entrada_id", "=", "entradas.id")
        .join("blocos", "entradas.bloco_id", "=", "blocos.id")
        .where("vinculos.status", "Ativo")
        .select(
          "pessoas.*",
          "vinculos.tipo_vinculo as vinculos",
          "vinculos.status",
          "blocos.nome as nome_bloco",
          "unidades.numero_apartamento"
        );

      if (filters.tipoVinculo) {
        query.where("vinculos.tipo_vinculo", filters.tipoVinculo);
      }

      if (filters.bloco) {
        query.where("blocos.nome", filters.bloco);
      }

      if (filters.apartamento) {
        query.where("unidades.numero_apartamento", filters.apartamento);
      }

      pessoas = await query;
    }

    // Aplicar filtros nas pessoas inativas também
    if (filters.showInactive && (filters.tipoVinculo || filters.bloco || filters.apartamento)) {
      pessoas = pessoas.filter(pessoa => {
        if (pessoa.status === 'Inativo') return true; // Sempre mostrar inativas quando solicitado
        
        let match = true;
        if (filters.tipoVinculo && pessoa.vinculos !== filters.tipoVinculo) match = false;
        if (filters.bloco && pessoa.nome_bloco !== filters.bloco) match = false;
        if (filters.apartamento && pessoa.numero_apartamento !== filters.apartamento) match = false;
        
        return match;
      });
    }

    // Ordenar
    pessoas.sort((a, b) => {
      const comparison = a.nome_completo.localeCompare(b.nome_completo);
      return filters.sortBy === 'desc' ? -comparison : comparison;
    });

    return pessoas;
  } catch (error) {
    console.error("Erro ao buscar pessoas filtradas:", error);
    return [];
  }
});

ipcMain.handle("get-vinculo-types", async () => {
  try {
    const tipos = await knex("vinculos")
      .distinct("tipo_vinculo")
      .orderBy("tipo_vinculo", "asc");
    return tipos.map((t) => t.tipo_vinculo);
  } catch (error) {
    console.error("Erro ao buscar tipos de vínculo:", error);
    return [];
  }
});

ipcMain.handle("get-all-veiculos", async () => {
  try {
    const veiculos = await knex("veiculos")
      .join("pessoas", "veiculos.pessoa_id", "=", "pessoas.id")
      .select("veiculos.*", "pessoas.nome_completo as proprietario_nome")
      .orderBy("veiculos.marca", "asc");
    return veiculos;
  } catch (error) {
    console.error("Erro ao buscar todos os veículos:", error);
    return [];
  }
});

ipcMain.handle("delete-all-inactive-vinculos", async (event, pessoaId) => {
  try {
    await knex("vinculos")
      .where("pessoa_id", pessoaId)
      .where("status", "Inativo")
      .del();
    return { success: true, message: "Histórico de vínculos limpo com sucesso!" };
  } catch (error) {
    console.error("Erro ao limpar histórico:", error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle("run-setup", async () => {
  try {
    const blocosExistentes = await knex("blocos").select("id").first();
    if (blocosExistentes) {
      return {
        success: false,
        message: "A estrutura já foi criada anteriormente.",
      };
    }

    const estrutura = {
      "1-6,9,12-15,18": ["A", "B"],
      "7-8,11,16-17": ["A", "B", "C"],
      10: ["A"],
    };

    const aptsPorEntrada = {
      A: ["101", "102", "201", "202", "301", "302"],
      B: ["103", "104", "203", "204", "303", "304"],
      C: ["105", "106", "205", "206", "305", "306"],
    };

    await knex.transaction(async (trx) => {
      for (let i = 1; i <= 18; i++) {
        const blocoNome = `Bloco ${i}`;
        const [blocoIdObj] = await trx("blocos")
          .insert({ nome: blocoNome })
          .returning("id");
        const blocoId =
          typeof blocoIdObj === "object" ? blocoIdObj.id : blocoIdObj;

        let entradasParaCriar = [];
        for (const range in estrutura) {
          const numeros = range.split(",").flatMap((r) => {
            if (r.includes("-")) {
              const [start, end] = r.split("-").map(Number);
              return Array.from(
                { length: end - start + 1 },
                (_, k) => start + k
              );
            }
            return Number(r);
          });
          if (numeros.includes(i)) {
            entradasParaCriar = estrutura[range];
            break;
          }
        }

        for (const letraEntrada of entradasParaCriar) {
          const [entradaIdObj] = await trx("entradas")
            .insert({ letra: letraEntrada, bloco_id: blocoId })
            .returning("id");
          const entradaId =
            typeof entradaIdObj === "object" ? entradaIdObj.id : entradaIdObj;
          const apartamentos = aptsPorEntrada[letraEntrada];

          const apartamentosParaInserir = apartamentos.map((numApt) => ({
            numero_apartamento: numApt,
            entrada_id: entradaId,
          }));
          await trx("unidades").insert(apartamentosParaInserir);
        }
      }
    });

    return {
      success: true,
      message:
        "Estrutura do condomínio criada com sucesso! 18 blocos, entradas e 240 unidades cadastradas.",
    };
  } catch (error) {
    console.error("Erro ao criar estrutura:", error);
    return {
      success: false,
      message: `Erro ao criar estrutura: ${error.message}`,
    };
  }
});

app.whenReady().then(async () => {
  await initializeDatabase();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Handlers do Sistema de Estoque
ipcMain.handle('get-estoque-stats', async () => {
  try {
    const [totalProdutos] = await knex('produtos').where('ativo', true).count('id as count');
    const [valorTotal] = await knex('produtos')
      .leftJoin('movimentacoes_estoque', 'produtos.id', 'movimentacoes_estoque.produto_id')
      .where('produtos.ativo', true)
      .sum('produtos.valor_unitario as total');
    
    const produtosBaixoEstoque = await knex('produtos')
      .leftJoin(knex.raw(`(
        SELECT produto_id, 
               SUM(CASE WHEN tipo = 'ENTRADA' THEN quantidade ELSE -quantidade END) as estoque_atual
        FROM movimentacoes_estoque 
        GROUP BY produto_id
      ) as estoque`), 'produtos.id', 'estoque.produto_id')
      .where('produtos.ativo', true)
      .whereRaw('COALESCE(estoque.estoque_atual, 0) <= produtos.estoque_minimo')
      .count('produtos.id as count');
    
    const produtosSemEstoque = await knex('produtos')
      .leftJoin(knex.raw(`(
        SELECT produto_id, 
               SUM(CASE WHEN tipo = 'ENTRADA' THEN quantidade ELSE -quantidade END) as estoque_atual
        FROM movimentacoes_estoque 
        GROUP BY produto_id
      ) as estoque`), 'produtos.id', 'estoque.produto_id')
      .where('produtos.ativo', true)
      .whereRaw('COALESCE(estoque.estoque_atual, 0) = 0')
      .count('produtos.id as count');
    
    const [movimentacoesHoje] = await knex('movimentacoes_estoque')
      .whereRaw('DATE(data_movimentacao) = DATE("now")')
      .count('id as count');
    
    return {
      totalProdutos: totalProdutos.count,
      produtosBaixoEstoque: produtosBaixoEstoque[0].count,
      produtosSemEstoque: produtosSemEstoque[0].count,
      valorTotalEstoque: valorTotal.total || 0,
      movimentacoesHoje: movimentacoesHoje.count
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do estoque:', error);
    return { totalProdutos: 0, produtosBaixoEstoque: 0, produtosSemEstoque: 0, valorTotalEstoque: 0, movimentacoesHoje: 0 };
  }
});

ipcMain.handle('get-produtos', async (event, filtros = {}) => {
  try {
    let query = knex('produtos')
      .leftJoin('categorias_produto', 'produtos.categoria_id', 'categorias_produto.id')
      .leftJoin(knex.raw(`(
        SELECT produto_id, 
               SUM(CASE WHEN tipo = 'ENTRADA' THEN quantidade ELSE -quantidade END) as estoque_atual
        FROM movimentacoes_estoque 
        GROUP BY produto_id
      ) as estoque`), 'produtos.id', 'estoque.produto_id')
      .select(
        'produtos.*',
        'categorias_produto.nome as categoria_nome',
        knex.raw('COALESCE(estoque.estoque_atual, 0) as estoque_atual')
      )
      .where('produtos.ativo', true);
    
    if (filtros.busca) {
      query = query.where('produtos.nome', 'like', `%${filtros.busca}%`);
    }
    
    if (filtros.categoria) {
      query = query.where('produtos.categoria_id', filtros.categoria);
    }
    
    if (filtros.status === 'baixo-estoque') {
      query = query.whereRaw('COALESCE(estoque.estoque_atual, 0) <= produtos.estoque_minimo');
    } else if (filtros.status === 'sem-estoque') {
      query = query.whereRaw('COALESCE(estoque.estoque_atual, 0) = 0');
    }
    
    const produtos = await query.orderBy('produtos.nome', 'asc');
    return produtos;
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }
});

ipcMain.handle('get-categorias-produto', async () => {
  try {
    const categorias = await knex('categorias_produto')
      .select('*')
      .orderBy('nome', 'asc');
    return categorias;
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return [];
  }
});

ipcMain.handle('delete-produto', async (event, produtoId) => {
  try {
    await knex('produtos').where('id', produtoId).update({ ativo: false });
    return { success: true, message: 'Produto excluído com sucesso!' };
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle('create-produto', async (event, produtoData) => {
  try {
    // produtoData pode conter `quantidade_inicial` que não é coluna da tabela produtos
    const quantidadeInicial = produtoData.quantidade_inicial ? parseInt(produtoData.quantidade_inicial, 10) : 0;
    // Remover campo não existente antes de inserir
    const toInsert = { ...produtoData };
    delete toInsert.quantidade_inicial;

    // Inserir o produto e obter o id
    const inserted = await knex('produtos').insert(toInsert).returning('id');
    const produtoId = Array.isArray(inserted) ? (inserted[0].id || inserted[0]) : inserted;

    // Se foi enviada uma quantidade inicial, criar movimentação do tipo ENTRADA
    if (quantidadeInicial && quantidadeInicial > 0) {
      await knex('movimentacoes_estoque').insert({
        produto_id: produtoId,
        tipo: 'ENTRADA',
        quantidade: quantidadeInicial,
        motivo: 'Quantidade inicial ao criar produto'
      });
    }

    return { success: true, message: 'Produto criado com sucesso!' };
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle('update-produto', async (event, produtoId, produtoData) => {
  try {
    await knex('produtos').where('id', produtoId).update(produtoData);
    return { success: true, message: 'Produto atualizado com sucesso!' };
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle('get-movimentacoes', async (event, filtros = {}) => {
  try {
    let query = knex('movimentacoes_estoque')
      .join('produtos', 'movimentacoes_estoque.produto_id', 'produtos.id')
      .select(
        'movimentacoes_estoque.*',
        'produtos.nome as produto_nome',
        'produtos.unidade_medida'
      );
    
    if (filtros.dataInicio) {
      query = query.where('data_movimentacao', '>=', filtros.dataInicio);
    }
    if (filtros.dataFim) {
      query = query.where('data_movimentacao', '<=', filtros.dataFim);
    }
    if (filtros.tipo) {
      query = query.where('tipo', filtros.tipo);
    }
    if (filtros.produto) {
      query = query.where('produtos.nome', 'like', `%${filtros.produto}%`);
    }
    
    const movimentacoes = await query.orderBy('data_movimentacao', 'desc');
    return movimentacoes;
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error);
    return [];
  }
});

ipcMain.handle('create-movimentacao', async (event, movimentacaoData) => {
  try {
    // validar quantidade e produto
    const quantidade = parseInt(movimentacaoData.quantidade, 10) || 0;
    if (!movimentacaoData.produto_id) return { success: false, message: 'Produto obrigatório' };
    if (quantidade <= 0) return { success: false, message: 'Quantidade deve ser maior que zero' };

    // calcular estoque atual do produto
    const [{ estoque_atual = 0 }] = await knex('movimentacoes_estoque')
      .where('produto_id', movimentacaoData.produto_id)
      .select(knex.raw('COALESCE(SUM(CASE WHEN tipo = "ENTRADA" THEN quantidade ELSE -quantidade END), 0) as estoque_atual'));

    const tipo = String(movimentacaoData.tipo || '').toUpperCase();
    const novoEstoque = tipo === 'ENTRADA' ? (estoque_atual + quantidade) : (estoque_atual - quantidade);
    if (novoEstoque < 0) {
      return { success: false, message: 'Operação inválida: estoque não pode ficar negativo' };
    }

    await knex('movimentacoes_estoque').insert(movimentacaoData);
    return { success: true, message: 'Movimentação registrada com sucesso!' };
  } catch (error) {
    console.error('Erro ao criar movimentação:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle('update-movimentacao', async (event, movimentacaoId, movimentacaoData) => {
  try {
    // recuperar movimentação existente
    const existing = await knex('movimentacoes_estoque').where('id', movimentacaoId).first();
    if (!existing) return { success: false, message: 'Movimentação não encontrada' };

    const quantidadeNova = parseInt(movimentacaoData.quantidade, 10) || 0;
    if (quantidadeNova <= 0) return { success: false, message: 'Quantidade deve ser maior que zero' };

    // calcular estoque atual
    const [{ estoque_atual = 0 }] = await knex('movimentacoes_estoque')
      .where('produto_id', existing.produto_id)
      .select(knex.raw('COALESCE(SUM(CASE WHEN tipo = "ENTRADA" THEN quantidade ELSE -quantidade END), 0) as estoque_atual'));

    // remover efeito da movimentação existente
    const efeitoExistente = (String(existing.tipo).toUpperCase() === 'ENTRADA') ? existing.quantidade : -existing.quantidade;
    const estoqueSemExistente = estoque_atual - efeitoExistente;

    const tipoNovo = String(movimentacaoData.tipo || existing.tipo).toUpperCase();
    const efeitoNovo = (tipoNovo === 'ENTRADA') ? quantidadeNova : -quantidadeNova;
    const novoEstoque = estoqueSemExistente + efeitoNovo;
    if (novoEstoque < 0) {
      return { success: false, message: 'Operação inválida: atualização deixaria estoque negativo' };
    }

    await knex('movimentacoes_estoque').where('id', movimentacaoId).update(movimentacaoData);
    return { success: true, message: 'Movimentação atualizada com sucesso!' };
  } catch (error) {
    console.error('Erro ao atualizar movimentação:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle('delete-movimentacao', async (event, movimentacaoId) => {
  try {
    const existing = await knex('movimentacoes_estoque').where('id', movimentacaoId).first();
    if (!existing) return { success: false, message: 'Movimentação não encontrada' };

    // calcular estoque atual
    const [{ estoque_atual = 0 }] = await knex('movimentacoes_estoque')
      .where('produto_id', existing.produto_id)
      .select(knex.raw('COALESCE(SUM(CASE WHEN tipo = "ENTRADA" THEN quantidade ELSE -quantidade END), 0) as estoque_atual'));

    const efeitoExistente = (String(existing.tipo).toUpperCase() === 'ENTRADA') ? existing.quantidade : -existing.quantidade;
    const novoEstoque = estoque_atual - efeitoExistente; // estoque sem esta movimentação
    if (novoEstoque < 0) {
      return { success: false, message: 'Operação inválida: exclusão deixaria estoque negativo' };
    }

    await knex('movimentacoes_estoque').where('id', movimentacaoId).del();
    return { success: true, message: 'Movimentação excluída com sucesso!' };
  } catch (error) {
    console.error('Erro ao excluir movimentação:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handlers do Sistema de Acordos
ipcMain.handle('get-acordos', async (event, filtros = {}) => {
  try {
    // Subquery agregada para contar parcelas pendentes/pagas por acordo
    const agg = knex('acordos_parcelas')
      .select('pessoa_id', 'descricao', 'data_acordo')
      .select(knex.raw("SUM(CASE WHEN status_parcela = 'Pendente' THEN 1 ELSE 0 END) as pending_count"))
      .select(knex.raw("SUM(CASE WHEN status_parcela = 'Pago' THEN 1 ELSE 0 END) as paid_count"))
      .groupBy('pessoa_id', 'descricao', 'data_acordo')
      .as('agg');

    let query = knex('acordos_parcelas')
      .join('pessoas', 'acordos_parcelas.pessoa_id', 'pessoas.id')
      .leftJoin('vinculos', function() {
        this.on('pessoas.id', '=', 'vinculos.pessoa_id')
            .andOn('vinculos.status', '=', knex.raw('?', ['Ativo']));
      })
      .leftJoin('unidades', 'vinculos.unidade_id', 'unidades.id')
      .leftJoin('entradas', 'unidades.entrada_id', 'entradas.id')
      .leftJoin('blocos', 'entradas.bloco_id', 'blocos.id')
      // fazer leftJoin com a agregação para trazer contagens de parcelas
      .leftJoin(agg, function() {
        this.on('acordos_parcelas.pessoa_id', '=', knex.raw('agg.pessoa_id'))
            .andOn('acordos_parcelas.descricao', '=', knex.raw('agg.descricao'))
            .andOn('acordos_parcelas.data_acordo', '=', knex.raw('agg.data_acordo'));
      })
      .select(
        'acordos_parcelas.id',
        'acordos_parcelas.pessoa_id',
        'acordos_parcelas.descricao',
        'acordos_parcelas.valor_total',
        'acordos_parcelas.total_parcelas as quantidade_parcelas',
        'acordos_parcelas.data_acordo',
        'acordos_parcelas.status_acordo as status',
        'pessoas.nome_completo',
        'blocos.nome as nome_bloco',
        'unidades.numero_apartamento',
        knex.raw('COALESCE(agg.pending_count, 0) as pending_count'),
        knex.raw('COALESCE(agg.paid_count, 0) as paid_count')
      )
      .where('acordos_parcelas.numero_parcela', 1);

    if (filtros.status) {
      query = query.where('acordos_parcelas.status_acordo', filtros.status);
    }
    if (filtros.busca) {
      query = query.where('pessoas.nome_completo', 'like', `%${filtros.busca}%`);
    }

    const acordos = await query.orderBy('acordos_parcelas.data_acordo', 'desc');
    return acordos;
  } catch (error) {
    console.error('Erro ao buscar acordos:', error);
    return [];
  }
});

ipcMain.handle('create-acordo', async (event, acordoData) => {
  try {
    // Se foram enviadas parcelas customizadas, insere-as diretamente
    if (acordoData.parcelas && Array.isArray(acordoData.parcelas) && acordoData.parcelas.length > 0) {
      // validar soma
      const somaParcelas = acordoData.parcelas.reduce((s, p) => s + (parseFloat(p.valor_parcela) || 0), 0);
      const esperado = parseFloat(acordoData.valor_total) - (parseFloat(acordoData.valor_entrada) || 0);
      if (Math.abs(somaParcelas - esperado) > 0.01) {
        return { success: false, message: 'Soma das parcelas diferente do valor restante (valor_total - valor_entrada)' };
      }

      const toInsert = acordoData.parcelas.map(p => ({
        pessoa_id: acordoData.pessoa_id,
        descricao: acordoData.descricao,
        valor_total: acordoData.valor_total,
        valor_entrada: acordoData.valor_entrada,
        numero_parcela: p.numero_parcela,
        total_parcelas: acordoData.quantidade_parcelas,
        valor_parcela: p.valor_parcela,
        data_acordo: acordoData.data_acordo,
        data_vencimento: p.data_vencimento,
        status_parcela: 'Pendente',
        status_acordo: 'Ativo'
      }));

      await knex('acordos_parcelas').insert(toInsert);
    } else {
      const valorParcela = (acordoData.valor_total - acordoData.valor_entrada) / acordoData.quantidade_parcelas;
      
      const parcelas = [];
      for (let i = 1; i <= acordoData.quantidade_parcelas; i++) {
        const dataVencimento = new Date(acordoData.data_acordo);
        dataVencimento.setMonth(dataVencimento.getMonth() + i);
        
        parcelas.push({
          pessoa_id: acordoData.pessoa_id,
          descricao: acordoData.descricao,
          valor_total: acordoData.valor_total,
          valor_entrada: acordoData.valor_entrada,
          numero_parcela: i,
          total_parcelas: acordoData.quantidade_parcelas,
          valor_parcela: valorParcela,
          data_acordo: acordoData.data_acordo,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          status_parcela: 'Pendente',
          status_acordo: 'Ativo'
        });
      }
      
      await knex('acordos_parcelas').insert(parcelas);
    }
    return { success: true, message: 'Acordo criado com sucesso!' };
  } catch (error) {
    console.error('Erro ao criar acordo:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle('get-acordo-details', async (event, acordoId) => {
  try {
    const acordo = await knex('acordos_parcelas')
      .join('pessoas', 'acordos_parcelas.pessoa_id', 'pessoas.id')
      .leftJoin('vinculos', function() {
        this.on('pessoas.id', '=', 'vinculos.pessoa_id')
            .andOn('vinculos.status', '=', knex.raw('?', ['Ativo']));
      })
      .leftJoin('unidades', 'vinculos.unidade_id', 'unidades.id')
      .leftJoin('entradas', 'unidades.entrada_id', 'entradas.id')
      .leftJoin('blocos', 'entradas.bloco_id', 'blocos.id')
      .where('acordos_parcelas.id', acordoId)
      .select(
        'acordos_parcelas.*',
        'pessoas.nome_completo',
        'pessoas.telefone',
        'blocos.nome as nome_bloco',
        'unidades.numero_apartamento'
      )
      .first();

    const parcelas = await knex('acordos_parcelas')
      .where('pessoa_id', acordo.pessoa_id)
      .where('descricao', acordo.descricao)
      .where('data_acordo', acordo.data_acordo)
      .orderBy('numero_parcela', 'asc');

    return { acordo, parcelas };
  } catch (error) {
    console.error('Erro ao buscar detalhes do acordo:', error);
    return null;
  }
});

ipcMain.handle('marcar-parcela-paga', async (event, parcelaId, dataPagamento) => {
  try {
    await knex('acordos_parcelas')
      .where('id', parcelaId)
      .update({
        status_parcela: 'Pago',
        data_pagamento: dataPagamento
      });
    // Após marcar, verificar se todas as parcelas do mesmo acordo foram pagas
    const parcela = await knex('acordos_parcelas').where('id', parcelaId).first();
    if (parcela) {
      const restantes = await knex('acordos_parcelas')
        .where({ pessoa_id: parcela.pessoa_id, descricao: parcela.descricao, data_acordo: parcela.data_acordo })
        .whereNot('status_parcela', 'Pago')
        .count('id as count');
      const restantesCount = Array.isArray(restantes) ? (restantes[0] && restantes[0].count ? parseInt(restantes[0].count) : 0) : (restantes.count || 0);
      if (restantesCount === 0) {
        // Todas pagas: marcar acordo como Quitado
        await knex('acordos_parcelas')
          .where({ pessoa_id: parcela.pessoa_id, descricao: parcela.descricao, data_acordo: parcela.data_acordo })
          .update({ status_acordo: 'Quitado' });
        return { success: true, message: 'Parcela marcada como paga!', acordoQuitado: true };
      }
    }

    return { success: true, message: 'Parcela marcada como paga!', acordoQuitado: false };
  } catch (error) {
    console.error('Erro ao marcar parcela como paga:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

ipcMain.handle('get-acordos-stats', async () => {
  try {
    const [totalAcordos] = await knex('acordos_parcelas')
      .where('status_acordo', 'Ativo')
      .where('numero_parcela', 1)
      .count('id as count');
    const [valorTotal] = await knex('acordos_parcelas')
      .where('status_acordo', 'Ativo')
      .where('numero_parcela', 1)
      .sum('valor_total as total');
    const [parcelasPendentes] = await knex('acordos_parcelas')
      .where('status_parcela', 'Pendente')
      .count('id as count');
    const [valorPendente] = await knex('acordos_parcelas')
      .where('status_parcela', 'Pendente')
      .sum('valor_parcela as total');
    
    return {
      totalAcordos: totalAcordos.count,
      valorTotalAcordos: valorTotal.total || 0,
      parcelasPendentes: parcelasPendentes.count,
      valorPendente: valorPendente.total || 0
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas dos acordos:', error);
    return { totalAcordos: 0, valorTotalAcordos: 0, parcelasPendentes: 0, valorPendente: 0 };
  }
});

// Handler para buscar pessoas para acordos (baseado na busca universal)
ipcMain.handle('search-pessoas-acordos', async (event, termo = '') => {
  try {
    if (!termo || termo.length < 2) {
      // Retornar as últimas 10 pessoas se não houver termo
      const pessoas = await knex('pessoas')
        .leftJoin('vinculos', function() {
          this.on('pessoas.id', '=', 'vinculos.pessoa_id')
              .andOn('vinculos.status', '=', knex.raw('?', ['Ativo']));
        })
        .leftJoin('unidades', 'vinculos.unidade_id', 'unidades.id')
        .leftJoin('entradas', 'unidades.entrada_id', 'entradas.id')
        .leftJoin('blocos', 'entradas.bloco_id', 'blocos.id')
        .select(
          'pessoas.id',
          'pessoas.nome_completo',
          'pessoas.cpf',
          'pessoas.telefone',
          'blocos.nome as nome_bloco',
          'unidades.numero_apartamento'
        )
        .orderBy('pessoas.nome_completo', 'asc')
        .limit(10);
      
      return pessoas.map(p => ({
        ...p,
        status: p.nome_bloco ? 'Ativo' : 'Inativo'
      }));
    }

    const termoBusca = termo.trim();
    const termoBuscaLimpo = termoBusca.replace(/\D/g, '');
    
    let query = knex('pessoas')
      .leftJoin('vinculos', function() {
        this.on('pessoas.id', '=', 'vinculos.pessoa_id')
            .andOn('vinculos.status', '=', knex.raw('?', ['Ativo']));
      })
      .leftJoin('unidades', 'vinculos.unidade_id', 'unidades.id')
      .leftJoin('entradas', 'unidades.entrada_id', 'entradas.id')
      .leftJoin('blocos', 'entradas.bloco_id', 'blocos.id')
      .select(
        'pessoas.id',
        'pessoas.nome_completo', 
        'pessoas.cpf',
        'pessoas.telefone',
        'blocos.nome as nome_bloco',
        'unidades.numero_apartamento'
      );

    query = query.where(function() {
      // Busca por nome
      const palavras = termoBusca.toLowerCase().split(' ').filter(p => p.length >= 2);
      palavras.forEach(palavra => {
        this.orWhereRaw('LOWER(pessoas.nome_completo) LIKE ?', [`%${palavra}%`]);
      });
      
      // Busca por CPF se for número
      if (termoBuscaLimpo.length >= 3) {
        this.orWhere('pessoas.cpf', 'like', `%${termoBuscaLimpo}%`);
      }
    });

    const pessoas = await query
      .orderBy('pessoas.nome_completo', 'asc')
      .limit(20);
    
    return pessoas.map(p => ({
      ...p,
      status: p.nome_bloco ? 'Ativo' : 'Inativo'
    }));
  } catch (error) {
    console.error('Erro ao buscar pessoas para acordos:', error);
    return [];
  }
});

// Handler para debug - contar pessoas
ipcMain.handle('debug-count-pessoas', async () => {
  try {
    const [count] = await knex('pessoas').count('id as total');
    const pessoas = await knex('pessoas').select('id', 'nome_completo', 'cpf').limit(5);
    return { total: count.total, exemplos: pessoas };
  } catch (error) {
    console.error('Erro no debug:', error);
    return { total: 0, exemplos: [] };
  }
});



// Handler para desmarcar parcela como paga (reverter)
ipcMain.handle('desmarcar-parcela-paga', async (event, parcelaId) => {
  try {
    await knex('acordos_parcelas')
      .where('id', parcelaId)
      .update({
        status_parcela: 'Pendente',
        data_pagamento: null
      });
    // Após desmarcar, garantir que o acordo esteja como 'Ativo' (se houver alguma pendente)
    const parcela = await knex('acordos_parcelas').where('id', parcelaId).first();
    if (parcela) {
      await knex('acordos_parcelas')
        .where({ pessoa_id: parcela.pessoa_id, descricao: parcela.descricao, data_acordo: parcela.data_acordo })
        .update({ status_acordo: 'Ativo' });
    }

    return { success: true, message: 'Parcela desmarcada como paga.' };
  } catch (error) {
    console.error('Erro ao desmarcar parcela como paga:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handler para arquivar (marcar como Quitado) um acordo manualmente
ipcMain.handle('arquivar-acordo', async (event, acordoId) => {
  try {
    const acordo = await knex('acordos_parcelas').where('id', acordoId).first();
    if (!acordo) return { success: false, message: 'Acordo não encontrado' };
    // Data local do arquivamento (YYYY-MM-DD)
    const hoje = (() => {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    })();

    // Marcar acordo como Quitado
    await knex('acordos_parcelas')
      .where({ pessoa_id: acordo.pessoa_id, descricao: acordo.descricao, data_acordo: acordo.data_acordo })
      .update({ status_acordo: 'Quitado' });

    // Marcar todas as parcelas pendentes como pagas na data do arquivamento
    const parcelasAtualizadas = await knex('acordos_parcelas')
      .where({ pessoa_id: acordo.pessoa_id, descricao: acordo.descricao, data_acordo: acordo.data_acordo })
      .whereNot('status_parcela', 'Pago')
      .update({ status_parcela: 'Pago', data_pagamento: hoje });

    // Notificar renderers sobre alteração de dados
    try { notifyDataChanged(); } catch (e) { /* noop */ }

    return { success: true, message: 'Acordo arquivado (Quitado) com sucesso', parcelasAtualizadas };
  } catch (error) {
    console.error('Erro ao arquivar acordo:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handler para desarquivar (marcar como Ativo) um acordo manualmente
// Nota: handler 'desarquivar-acordo' removido — frontend usa apenas 'desarquivar-acordo-forcar-ativo' quando necessário.

// Handler para forçar desarquivamento e marcar acordo como Ativo
ipcMain.handle('desarquivar-acordo-forcar-ativo', async (event, acordoId) => {
  try {
    const acordo = await knex('acordos_parcelas').where('id', acordoId).first();
    if (!acordo) return { success: false, message: 'Acordo não encontrado' };

    await knex('acordos_parcelas')
      .where({ pessoa_id: acordo.pessoa_id, descricao: acordo.descricao, data_acordo: acordo.data_acordo })
      .update({ status_acordo: 'Ativo' });

    try { notifyDataChanged(); } catch (e) { /* noop */ }

    return { success: true, message: 'Acordo desarquivado e marcado como Ativo' };
  } catch (error) {
    console.error('Erro ao forçar desarquivar acordo:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handler para excluir um acordo (remove todas as parcelas relacionadas)
ipcMain.handle('delete-acordo', async (event, acordoId) => {
  try {
    const acordo = await knex('acordos_parcelas').where('id', acordoId).first();
    if (!acordo) return { success: false, message: 'Acordo não encontrado' };

    await knex('acordos_parcelas')
      .where({ pessoa_id: acordo.pessoa_id, descricao: acordo.descricao, data_acordo: acordo.data_acordo })
      .del();

    try { notifyDataChanged(); } catch (e) { /* noop */ }

    return { success: true, message: 'Acordo excluído com sucesso' };
  } catch (error) {
    console.error('Erro ao excluir acordo:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handlers para agendamento de backups
ipcMain.handle('get-backup-schedule', async () => {
  return { success: true, schedule: backupSchedule };
});

ipcMain.handle('set-backup-schedule', async (event, schedule) => {
  try {
    // expected schedule: { mode: 'none'|'daily'|'weekly'|'monthly', includeDb: boolean }
    backupSchedule = { ...backupSchedule, ...schedule };
    persistSchedule();
    scheduleNextRun();
    return { success: true, schedule: backupSchedule };
  } catch (e) {
    console.error('Erro ao setar schedule:', e);
    return { success: false, message: e.message };
  }
});

ipcMain.handle('run-backup-now', async (event, opts = {}) => {
  try {
    const res = await performBackupToFolder({ includeDb: !!opts.includeDb });
    if (res.success) return { success: true, path: res.path };
    return { success: false, message: res.message };
  } catch (e) {
    return { success: false, message: e.message };
  }
});