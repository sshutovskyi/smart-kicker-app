const Koa = require('koa');
const koaBodyparser = require('koa-bodyparser');
const koaStatic = require('koa-static');
const route = require('koa-route');

const routes = require('./routes');

module.exports = async (service) => {
  const app = new Koa();

  app.keys = ['2e1f5d27-22fc-47e7-a9b8-37f440f7f828'];

  app.use(koaBodyparser());
  app.use(koaStatic(__dirname + '/../public'));

  app.use(routes(service));

  app.listen(8080);
};
