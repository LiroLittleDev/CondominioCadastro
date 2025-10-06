/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('pessoas', function (table) {
    // Adiciona campo RG
    table.string('rg', 27);
    
    // Remove a restrição de NOT NULL do CPF
    table.string('cpf_temp', 14);
  }).then(() => {
    // Copia dados do CPF para o campo temporário
    return knex.raw('UPDATE pessoas SET cpf_temp = cpf');
  }).then(() => {
    // Remove a coluna CPF original
    return knex.schema.alterTable('pessoas', function (table) {
      table.dropColumn('cpf');
    });
  }).then(() => {
    // Recria a coluna CPF sem NOT NULL
    return knex.schema.alterTable('pessoas', function (table) {
      table.string('cpf', 14);
    });
  }).then(() => {
    // Copia os dados de volta
    return knex.raw('UPDATE pessoas SET cpf = cpf_temp');
  }).then(() => {
    // Remove a coluna temporária
    return knex.schema.alterTable('pessoas', function (table) {
      table.dropColumn('cpf_temp');
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('pessoas', function (table) {
    table.dropColumn('rg');
    // Nota: Não é possível reverter completamente a remoção do NOT NULL do CPF
    // sem perder dados que podem não ter CPF
  });
};