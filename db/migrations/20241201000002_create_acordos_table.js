exports.up = function(knex) {
  return knex.schema.createTable('acordos_parcelas', function(table) {
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
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('acordos_parcelas');
};