exports.up = function(knex) {
  return knex.schema
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
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('movimentacoes_estoque')
    .dropTableIfExists('produtos')
    .dropTableIfExists('categorias_produto');
};