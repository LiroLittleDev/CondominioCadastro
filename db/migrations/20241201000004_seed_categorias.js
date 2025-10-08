exports.up = function(knex) {
  return knex('categorias_produto').insert([
    { nome: 'Limpeza', descricao: 'Produtos de limpeza e higiene' },
    { nome: 'Manutenção', descricao: 'Materiais para manutenção predial' },
    { nome: 'Escritório', descricao: 'Material de escritório e papelaria' },
    { nome: 'Segurança', descricao: 'Equipamentos de segurança' },
    { nome: 'Jardinagem', descricao: 'Produtos para jardinagem' }
  ]);
};

exports.down = function(knex) {
  return knex('categorias_produto').del();
};