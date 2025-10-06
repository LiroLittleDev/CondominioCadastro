const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function notifyDataChanged() {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('data-changed');
  });
}

// Configuração do Knex para conectar ao banco de dados
const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: path.join(__dirname, "../db/condominio.db"),
  },
  useNullAsDefault: true,
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("http://localhost:3000");
}

// Handler para salvar relatórios
ipcMain.handle('save-report', async (event, options) => {
  const { dialog } = require('electron');
  const fs = require('fs');
  
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
      query = query.where('vinculos.tipo_vinculo', filtros.tipoVinculo);
    }
    if (filtros.incluirVeiculos === false) {
      // Se não incluir veículos, retorna só os dados básicos
      const vinculosAtivos = await query.orderBy('pessoas.nome_completo', 'asc');
      return vinculosAtivos.map(pessoa => ({ ...pessoa, veiculos: [] }));
    }

    const vinculosAtivos = await query.orderBy('pessoas.nome_completo', 'asc');
    const todosVeiculos = await knex('veiculos').select('*');

    const reportData = vinculosAtivos.map(pessoa => {
      const veiculosDaPessoa = todosVeiculos.filter(v => v.pessoa_id === pessoa.pessoa_id);
      return {
        ...pessoa,
        veiculos: veiculosDaPessoa,
      };
    });

    return reportData;
  } catch (error) {
    console.error('Erro ao gerar dados do relatório:', error);
    return [];
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

// Handler para transferir pessoa
ipcMain.handle('transferir-pessoa', async (event, transferData) => {
  try {
    await knex.transaction(async (trx) => {
      const today = new Date().toISOString().split('T')[0];

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
  if (!pessoa.cpf || pessoa.cpf.trim() === '') {
    return { success: false, message: 'O CPF é obrigatório para criar um vínculo.' };
  }

  try {
    let message = '';
    await knex.transaction(async (trx) => {
      let pessoaExistente = await trx('pessoas').where('cpf', pessoa.cpf).first();
      let pessoaId;

      if (pessoaExistente) {
        pessoaId = pessoaExistente.id;
        message = 'Pessoa já existente vinculada com sucesso!';
      } else {
        const [novaPessoaIdObj] = await trx('pessoas').insert(pessoa).returning('id');
        pessoaId = typeof novaPessoaIdObj === 'object' ? novaPessoaIdObj.id : novaPessoaIdObj;
        message = 'Nova pessoa cadastrada e vinculada com sucesso!';
      }

      if (vinculo.tipoVinculo === 'Proprietário') {
        const proprietarioExistente = await trx('vinculos')
          .where({
            unidade_id: vinculo.unidadeId,
            tipo_vinculo: 'Proprietário'
          })
          .first();
        
        if (proprietarioExistente) {
          throw new Error('Esta unidade já possui um proprietário vinculado.');
        }
      }

      if (['Morador', 'Inquilino'].includes(vinculo.tipoVinculo)) {
        const vinculoResidencialAtivo = await trx('vinculos')
          .where({ pessoa_id: pessoaId, status: 'Ativo' })
          .whereIn('tipo_vinculo', ['Morador', 'Inquilino'])
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
    if (['Morador', 'Inquilino', 'Moradia Temporária'].includes(novoTipo)) {
      const vinculoAtual = await knex('vinculos').where({ id: vinculoId }).first();
      if (vinculoAtual) {
        const outroVinculoResidencial = await knex('vinculos')
          .where('pessoa_id', vinculoAtual.pessoa_id)
          .where('status', 'Ativo')
          .whereNot('id', vinculoId)
          .whereIn('tipo_vinculo', ['Morador', 'Inquilino', 'Moradia Temporária'])
          .first();

        if (outroVinculoResidencial) {
          throw new Error('Não é possível alterar para esta categoria, pois a pessoa já possui outro vínculo residencial ativo.');
        }
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
    const pessoaExistente = await knex("pessoas")
      .where("cpf", pessoaData.cpf)
      .whereNot("id", pessoaId)
      .first();

    if (pessoaExistente) {
      return {
        success: false,
        message: "Este CPF já está cadastrado para outra pessoa.",
      };
    }

    await knex("pessoas").where({ id: pessoaId }).update({
      nome_completo: pessoaData.nome_completo,
      cpf: pessoaData.cpf,
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
    const subquery = knex("vinculos")
      .select("pessoa_id", knex.raw("MAX(id) as max_id"))
      .groupBy("pessoa_id");

    const query = knex("pessoas")
      .join(subquery.as("recentes"), "pessoas.id", "=", "recentes.pessoa_id")
      .join("vinculos", "recentes.max_id", "=", "vinculos.id")
      .join("unidades", "vinculos.unidade_id", "=", "unidades.id")
      .join("entradas", "unidades.entrada_id", "=", "entradas.id")
      .join("blocos", "entradas.bloco_id", "=", "blocos.id")
      .select(
        "pessoas.*",
        "vinculos.tipo_vinculo as vinculos",
        "vinculos.status",
        knex.raw(
          "CASE WHEN vinculos.status = 'Ativo' THEN blocos.nome ELSE '' END as nome_bloco"
        ),
        knex.raw(
          "CASE WHEN vinculos.status = 'Ativo' THEN unidades.numero_apartamento ELSE '' END as numero_apartamento"
        )
      );

    if (!filters.showInactive) {
      query.where("vinculos.status", "Ativo");
    }

    if (filters.tipoVinculo) {
      query.where("vinculos.tipo_vinculo", filters.tipoVinculo);
    }

    query.orderBy("pessoas.nome_completo", filters.sortBy || "asc");

    const pessoas = await query;
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

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});