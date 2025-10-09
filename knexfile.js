module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './db/condominio.db' // Caminho para o nosso arquivo de banco de dados
    },
    useNullAsDefault: true, // Padrão recomendado para SQLite
    migrations: {
      directory: './db/migrations' // Pasta para os scripts de criação de tabelas
    },
    seeds: {
      directory: './db/migrations' // Pasta para os arquivos de seed
    }
  }
};