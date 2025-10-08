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
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('vinculos')
    .dropTableIfExists('veiculos')
    .dropTableIfExists('pessoas')
    .dropTableIfExists('unidades')
    .dropTableIfExists('entradas')
    .dropTableIfExists('blocos');
};