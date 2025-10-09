
exports.seed = async function(knex) {
  // Remove todas as categorias existentes
  await knex('categorias_produto').del();
  // Insere as categorias
  await knex('categorias_produto').insert([
    { nome: 'Limpeza', descricao: 'Produtos de limpeza e higiene' },
    { nome: 'Manutenção', descricao: 'Materiais para manutenção predial' },
    { nome: 'Escritório', descricao: 'Material de escritório e papelaria' },
    { nome: 'Segurança', descricao: 'Equipamentos de segurança' },
    { nome: 'Jardinagem', descricao: 'Produtos para jardinagem' },
    { nome: 'Consumo', descricao: 'Produtos de consumo como café, açúcar, etc.' }
  ]);
};