const Koa = require('koa');
const koaBodyparser = require('koa-bodyparser');

const routes = require('./src/routes');

module.exports = async (service) => {
  const app = new Koa();
  app.use(koaBodyparser());

  app.use(routes(service));

  app.listen(8080);
};
