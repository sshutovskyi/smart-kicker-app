module.exports = {
  client: 'sqlite3',
  connection: {
    filename: process.env.DB_PATH || './smart_kicker.sqlite',
  },
  migration: {
    directory: './src/migrations',
  },
};
