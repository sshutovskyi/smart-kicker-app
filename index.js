const knex = require('knex')(require('./knexfile'));
const oltConfig = require('./client');

const Service = require('./src/service');
const Poller = require('./src/poller');
const OltClient = require('./src/olt_client');
const PlayersSynchronizer = require('./src/players_sync');

const startApi = require('./src/api');

(async () => {
  await knex.migrate.latest();
  await knex.seed.run();
  const service = new Service(knex);
  const oltClient = new OltClient(oltConfig);
  const poller = new Poller(oltClient, service);
  const playersSync = new PlayersSynchronizer(oltClient, service);

  poller.on('error', (err) => {
    console.error(err.message, err.stack);
  });

  await playersSync.sync();
  await poller.init();

  await startApi(service);
  console.log('STARTED');
})();

