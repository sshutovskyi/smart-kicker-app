const knex = require('knex')('./src/knexfile');

const startApi = require('./src/api');
const Service = require('./src/service');
const Poller = require('./src/poller');

(async () => {
  const service = new Service(knex);
  const poller = new Poller(service);

  await poller.init();
  await startApi(service);
})();
