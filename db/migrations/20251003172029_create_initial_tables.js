/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
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
    .createTable('categorias_produto', function (table) {
      table.increments('id');
      table.string('nome', 255).notNullable();
      table.text('descricao');
      table.boolean('ativo').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('produtos', function (table) {
      table.increments('id');
      table.string('nome', 255).notNullable();
      table.integer('categoria_id').unsigned().references('id').inTable('categorias_produto');
      table.string('unidade_medida', 10).defaultTo('un');
      table.integer('estoque_minimo').defaultTo(0);
      table.decimal('valor_unitario', 10, 2).defaultTo(0);
      table.boolean('ativo').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('movimentacoes_estoque', function (table) {
      table.increments('id');
      table.integer('produto_id').unsigned().references('id').inTable('produtos');
      table.enum('tipo', ['ENTRADA', 'SAIDA']).notNullable();
      table.integer('quantidade').notNullable();
      table.string('responsavel', 255);
      table.text('observacao');
      table.datetime('data_movimentacao').defaultTo(knex.fn.now());
      table.timestamps(true, true);
    })
    .then(() => {
      return knex('categorias_produto').insert([
        { nome: 'Limpeza', descricao: 'Produtos de limpeza e higiene' },
        { nome: 'Manutenção', descricao: 'Materiais para manutenção predial' },
        { nome: 'Jardinagem', descricao: 'Produtos para cuidado de jardins e áreas verdes' },
        { nome: 'Escritório', descricao: 'Material de escritório e papelaria' },
        { nome: 'Segurança', descricao: 'Equipamentos e materiais de segurança' },
        { nome: 'Elétrica', descricao: 'Materiais elétricos' },
        { nome: 'Hidráulica', descricao: 'Materiais hidráulicos' },
        { nome: 'Pintura', descricao: 'Tintas e materiais para pintura' }
      ]);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTable('movimentacoes_estoque')
    .dropTable('produtos')
    .dropTable('categorias_produto')
    .dropTable('vinculos')
    .dropTable('veiculos')
    .dropTable('pessoas')
    .dropTable('unidades')
    .dropTable('entradas')
    .dropTable('blocos');
};