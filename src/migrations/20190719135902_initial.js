exports.up = (knex) => knex.schema
  .createTable('tenants', (t) => {
    t.increments('id');
    t.uuid('uuid').notNullable();
  })
  .createTable('players', (t) => {
    t.increments('id');
    t.integer('tenant_id').notNullable();
    t.uuid('uuid').notNullable().unique();
    t.string('key').notNullable();
    t.string('name').notNullable();
    t.index()
  })
  .createTable('teams', (t) => {
    t.increments('id');
    t.integer('tenant_id').notNullable();
    t.integer('player1_id').notNullable();
    t.integer('player2_id');
  })
  .createTable('matches', (t) => {
    t.increments('id');
    t.uuid('device_id');
    t.integer('started_at');
    t.integer('finished_at');
  })
  .createTable('participants', (t) => {
    t.integer('match_id').notNullable();
    t.integer('team_id').notNullable();
    t.integer('score');
    t.integer('points');
    t.primary(['match_id', 'team_id']);
  });

exports.down = (knex) => knex.schema
  .dropTable('participants')
  .dropTable('matches')
  .dropTable('teams')
  .dropTable('players')
  .dropTable('tenants');
