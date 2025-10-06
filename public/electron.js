const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require('fs');

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

console.log('Caminho do banco:', dbPath);

// Criar diretório se não existir
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

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

// Função para inicializar banco
async function initializeDatabase() {
  try {
    // Verificar se as tabelas existem
    const hasTable = await knex.schema.hasTable('blocos');
    
    if (!hasTable) {
      console.log('Criando estrutura do banco de dados...');
      
      // Criar tabelas
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

        });
      

      
      console.log('✅ Estrutura do banco criada com sucesso!');
    } else {
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
    alwaysOnTop: true,
    transparent: false,
    center: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    alwaysOnTop: true,
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
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }
  
  mainWindow.once('ready-to-show', () => {
    // Aguardar pelo menos 3 segundos antes de mostrar a janela principal
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close();
      }
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
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
ipcMain.handle('clear-all-data', async () => {
  try {
    await knex.transaction(async (trx) => {
      await trx('vinculos').del();
      await trx('veiculos').del();
      await trx('pessoas').del();
    });
    return { success: true, message: 'Todos os dados foram removidos com sucesso!' };
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});

// Handler para backup dos dados
ipcMain.handle('backup-data', async () => {
  try {
    const [pessoas, vinculos, veiculos] = await Promise.all([
      knex('pessoas').select('*'),
      knex('vinculos').select('*'),
      knex('veiculos').select('*')
    ]);
    
    const backup = {
      timestamp: new Date().toISOString(),
      pessoas,
      vinculos,
      veiculos
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
    await knex.transaction(async (trx) => {
      // Limpa dados existentes
      await trx('vinculos').del();
      await trx('veiculos').del();
      await trx('pessoas').del();
      
      // Importa pessoas
      if (backupData.pessoas && backupData.pessoas.length > 0) {
        await trx('pessoas').insert(backupData.pessoas);
      }
      
      // Importa veículos
      if (backupData.veiculos && backupData.veiculos.length > 0) {
        await trx('veiculos').insert(backupData.veiculos);
      }
      
      // Importa vínculos
      if (backupData.vinculos && backupData.vinculos.length > 0) {
        await trx('vinculos').insert(backupData.vinculos);
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
    
    const [movimentacoesHoje] = await knex('movimentacoes_estoque')
      .whereRaw('DATE(data_movimentacao) = DATE("now")')
      .count('id as count');
    
    return {
      totalProdutos: totalProdutos.count,
      produtosBaixoEstoque: produtosBaixoEstoque[0].count,
      valorTotalEstoque: valorTotal.total || 0,
      movimentacoesHoje: movimentacoesHoje.count
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do estoque:', error);
    return { totalProdutos: 0, produtosBaixoEstoque: 0, valorTotalEstoque: 0, movimentacoesHoje: 0 };
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
    await knex('produtos').insert(produtoData);
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
    await knex('movimentacoes_estoque').insert(movimentacaoData);
    return { success: true, message: 'Movimentação registrada com sucesso!' };
  } catch (error) {
    console.error('Erro ao criar movimentação:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});