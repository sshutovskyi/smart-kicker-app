exports.seed = async (knex) => {
  await knex('tenants')
    .insert({
      id: 1,
      uuid: 'cb4dd015-cb82-415d-af46-78d185056a74',
    });

  await knex('players').insert([
    {
      uuid: 'f39a57bd-c79e-436e-bdb6-f5b249a500ee',
      name: 'Machine',
      tenant_id: 1,
      key: '43317021024298128',
    },
    {
      uuid: 'd0f8bbdd-f7cf-4f1d-8e23-f90c362d01c3',
      name: 'Hatem',
      tenant_id: 1,
      key: '45317121024298128',
    },
    {
      uuid: '8b790d2d-cddf-4597-99f0-2a86e705c1db',
      name: 'Mo',
      tenant_id: 1,
      key: '4724521024298129',
    },
    {
      uuid: 'af7a2389-a0f7-472b-9bee-cd95662049b8',
      name: 'Sergii',
      tenant_id: 1,
      key: '48716221024298129',
    },
  ]);
};
