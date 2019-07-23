const Koa = require('koa');
const koaBodyparser = require('koa-bodyparser');
const koaSession = require('koa-session');
const koaPassport = require('koa-passport');
const route = require('koa-route');

const routes = require('./src/routes');

module.exports = async (service) => {
  const app = new Koa();

  app.keys = ['2e1f5d27-22fc-47e7-a9b8-37f440f7f828'];

  app.use(koaBodyparser());
  app.use(koaSession(app));
  app.use(koaPassport.initialize());
  app.use(koaPassport.session());

  app.use(route.get('/auth', koaPassport.authenticate('oauth2')));
  app.use(route.get('/auth/callback', koaPassport.authenticate('oauth2', {
    successRedirect: '/',
    failureRedirect: '/',
  })));
  app.use(routes(service));

  app.listen(8080);
};
