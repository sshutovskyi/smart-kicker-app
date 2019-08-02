const Router = require('koa-router');
const views = require('koa-views');
const formatDate = require('dateformat');

module.exports = (service) => {
  const app = new Router();

  app.use(views(__dirname + '/views', {
    extension: 'hbs',
    map: { hbs: 'handlebars' },
    options: {
      helpers: {
        formatDate(ts) {
          return formatDate(new Date(ts), 'yyyy-mm-dd HH:MM:ss')
        },
        duration(finishedAt, startedAt) {
          const diff = (finishedAt - startedAt) / 1000;
          const minutes = Math.floor(diff / 60);
          const seconds = diff % 60;
          return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        },
      },
    },
  }));

  app.get('/matches/:tenantId', async ctx => {
    const { tenantId } = ctx.params;
    const matches = await service.listMatches(tenantId);

    return ctx.render('matches', { matches, tenantId });
  });

  app.get('/standing/:tenantId', async ctx => {
    const { tenantId } = ctx.params;
    const standing = await service.getStanding(tenantId);

    return ctx.render('standing', { standing, tenantId });
  });

  return app.routes();
};
