module.exports = {
  client: 'sqlite3',
  connection: {
    filename: './smart_kicker.sqlite',
  },
  migrations: {
    directory: './src/migrations',
  },
  seeds: {
    directory: './src/seeds',
  },
};
