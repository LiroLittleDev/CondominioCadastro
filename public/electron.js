const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// Configuração do Knex para conectar ao banco de dados
const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: path.join(__dirname, "../db/condominio.db"), // Corrigido para o caminho correto
  },
  useNullAsDefault: true,
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // --- ESTA É A CONFIGURAÇÃO CORRETA E SEGURA ---
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, // Protege contra vulnerabilidades
      nodeIntegration: false, // Impede que o frontend acesse o Node.js diretamente
    },
  });

  mainWindow.loadURL("http://localhost:3000");
}



// Adicione este novo handler em public/electron.js
ipcMain.handle("find-pessoa-by-cpf", async (event, cpf) => {
  try {
    const pessoa = await knex("pessoas").where({ cpf }).first();
    return pessoa || null; // Retorna a pessoa ou nulo se não encontrar
  } catch (error) {
    console.error("Erro ao buscar pessoa por CPF:", error);
    return null;
  }
});

// Handler para a operação de transferência
ipcMain.handle('transferir-pessoa', async (event, transferData) => {
  try {
    await knex.transaction(async (trx) => {
      const today = new Date().toISOString().split('T')[0];

      // 1. Inativa o vínculo antigo
      await trx('vinculos')
        .where({ id: transferData.oldVinculoId })
        .update({
          status: 'Inativo',
          data_fim: today
        });

      // 2. Cria o novo vínculo
      await trx('vinculos').insert({
        pessoa_id: transferData.pessoaId,
        unidade_id: transferData.newUnitId,
        tipo_vinculo: transferData.newTipoVinculo,
        data_inicio: today,
        status: 'Ativo'
      });
    });
    return { success: true, message: 'Transferência realizada com sucesso!' };
  } catch (error) {
    console.error('Erro ao transferir pessoa:', error);
    return { success: false, message: `Erro: ${error.message}` };
  }
});


// Substitua o handler 'create-pessoa-e-vinculo' por este em public/electron.js

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

      // Se o novo vínculo for 'Morador' ou 'Inquilino'...
      if (['Morador', 'Inquilino'].includes(vinculo.tipoVinculo)) {
        // ...verifica se a pessoa já tem um desses vínculos ativos em QUALQUER unidade.
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
      .orderBy("vinculos.status", "asc") // Ativos primeiro
      .orderBy("vinculos.id", "desc"); // Mais recentes primeiro
    return vinculos;
  } catch (error) {
    console.error("Erro ao buscar vínculos da pessoa:", error);
    return [];
  }
});

// Adicione este novo handler em public/electron.js
ipcMain.handle("update-vinculo", async (event, vinculoId, novoTipo) => {
  try {
    await knex("vinculos").where({ id: vinculoId }).update({
      tipo_vinculo: novoTipo,
    });
    return { success: true, message: "Vínculo atualizado com sucesso!" };
  } catch (error) {
    console.error("Erro ao atualizar vínculo:", error);
    return { success: false, message: `Erro: ${error.message}` };
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

ipcMain.handle("get-filtered-pessoas", async (event, filters) => {
  try {
    // 1. A sub-consulta encontra o ID do último vínculo de cada pessoa (seja ativo ou inativo)
    const subquery = knex("vinculos")
      .select("pessoa_id", knex.raw("MAX(id) as max_id"))
      .groupBy("pessoa_id");

    // 2. A consulta principal junta tudo
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
        // --- A LÓGICA DA CORREÇÃO ESTÁ AQUI ---
        // Usa um 'CASE' do SQL para mostrar o endereço SOMENTE SE o status for 'Ativo'
        knex.raw(
          "CASE WHEN vinculos.status = 'Ativo' THEN blocos.nome ELSE '' END as nome_bloco"
        ),
        knex.raw(
          "CASE WHEN vinculos.status = 'Ativo' THEN unidades.numero_apartamento ELSE '' END as numero_apartamento"
        )
      );

    // 3. O filtro para mostrar inativos é aplicado na consulta principal
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
    return tipos.map((t) => t.tipo_vinculo); // Retorna um array de strings
  } catch (error) {
    console.error("Erro ao buscar tipos de vínculo:", error);
    return [];
  }
});

// Handler para buscar blocos
ipcMain.handle("get-blocos", async () => {
  try {
    const blocos = await knex("blocos").select("*");
    return blocos;
  } catch (error) {
    console.error("Erro ao buscar blocos:", error);
    return [];
  }
});
// --- NOVOS HANDLERS PARA ENTRADAS E UNIDADES ---

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

ipcMain.handle("create-veiculo", async (event, veiculoData) => {
  try {
    // Verifica se a placa já existe
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

ipcMain.handle("get-unidade-details", async (event, unidadeId) => {
  try {
    // Esta consulta busca a unidade e junta os nomes do bloco e da entrada
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
      .first(); // .first() para pegar apenas um resultado
    return unidade;
  } catch (error) {
    console.error("Erro ao buscar detalhes da unidade:", error);
    return null;
  }
});

// Em public/electron.js, substitua o handler getPessoasByUnidade por este:
ipcMain.handle("getPessoasByUnidade", async (event, unidadeId) => {
  try {
    const pessoas = await knex("vinculos")
      .join("pessoas", "vinculos.pessoa_id", "=", "pessoas.id")
      .where("vinculos.unidade_id", unidadeId)
      .where("vinculos.status", "Ativo")
      .select(
        "pessoas.*", // Seleciona todos os campos da tabela pessoas (id, nome, cpf, etc)
        "vinculos.tipo_vinculo",
        "vinculos.id as vinculo_id"
      );
    return pessoas;
  } catch (error) {
    console.error("Erro ao buscar pessoas da unidade:", error);
    return [];
  }
});

// Adicione este novo handler em public/electron.js
ipcMain.handle("update-pessoa", async (event, pessoaId, pessoaData) => {
  try {
    // Procura por CPF duplicado, excluindo a pessoa atual da busca
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

    // Atualiza os dados da pessoa no banco de dados
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

// Substitua o handler 'search-geral' por este em public/electron.js

ipcMain.handle('search-geral', async (event, termo) => {
  if (!termo || termo.length < 2) {
    return [];
  }
  const termoBusca = `%${termo}%`;

  try {
    const [vinculosPessoa, veiculos, unidades] = await Promise.all([
      // NOVA LÓGICA DE BUSCA: Busca por vínculos de pessoas que correspondem ao termo
      knex('vinculos')
        .join('pessoas', 'vinculos.pessoa_id', 'pessoas.id')
        .join('unidades', 'vinculos.unidade_id', 'unidades.id')
        .join('entradas', 'unidades.entrada_id', 'entradas.id')
        .join('blocos', 'entradas.bloco_id', 'blocos.id')
        .where('vinculos.status', 'Ativo')
        .andWhere(function() {
          this.where('pessoas.nome_completo', 'like', termoBusca)
              .orWhere('pessoas.cpf', 'like', termoBusca)
        })
        .select(
          'pessoas.id as pessoa_id',
          'pessoas.nome_completo',
          'vinculos.tipo_vinculo',
          'blocos.nome as nome_bloco',
          'unidades.numero_apartamento'
        ),

      // A busca por veículos continua a mesma
      knex('veiculos')
        .join('pessoas', 'veiculos.pessoa_id', '=', 'pessoas.id')
        .where('placa', 'like', termoBusca)
        .orWhere('veiculos.marca', 'like', termoBusca)
        .orWhere('veiculos.modelo', 'like', termoBusca)
        .select('veiculos.id as veiculo_id', 'veiculos.placa', 'veiculos.modelo', 'pessoas.id as pessoa_id'),

      // A busca por unidades continua a mesma
      knex('unidades')
        .join('entradas', 'unidades.entrada_id', 'entradas.id')
        .join('blocos', 'entradas.bloco_id', 'blocos.id')
        .where('numero_apartamento', 'like', termoBusca)
        .select('unidades.id', 'numero_apartamento', 'blocos.nome as nome_bloco')
    ]);

    const resultadosFormatados = [
      // Formata os resultados da nova busca de vínculos
      ...vinculosPessoa.map(v => ({
        tipo: v.tipo_vinculo, // O tipo agora é dinâmico (Proprietário, Morador...)
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
      // 1. Apaga todos os vínculos associados à pessoa
      await trx("vinculos").where("pessoa_id", pessoaId).del();
      // 2. Apaga todos os veículos associados à pessoa
      await trx("veiculos").where("pessoa_id", pessoaId).del();
      // 3. Finalmente, apaga a pessoa
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

// Handler para criar a estrutura inicial
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
