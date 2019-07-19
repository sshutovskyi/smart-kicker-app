const Router = require('koa-router');

module.exports = (service) => {
  const app = new Router();

  app.get('/players', async ctx => {
    const players = await service.listPlayers('tenantId');

    ctx.body = {
      data: players,
    };
  });

  app.post('/players', async ctx => {
    const body = ctx.body;
    const player = await service.createPlayer('tenantId', body);

    ctx.status = 201;
    ctx.body = {
      data: player,
    };
  });

  app.post('/matches', async ctx => {
    const body = ctx.body;
    const match = await service.createMatch('tenantId', body);

    ctx.status = 201;
    ctx.body = {
      data: match,
    },
  });

  app.get('/matches', async ctx => {
    const matches = await service.listMatches('tenantId');

    ctx.body = {
      data: matches,
    };
  });

  app.get('/standing', async ctx => {
    const standing = await service.getStanding('tenantId');

    ctx.body = {
      data: standing,
    };
  });

  return app.routes();
};
