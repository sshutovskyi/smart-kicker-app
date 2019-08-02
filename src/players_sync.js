const { EventEmitter } = require('events');

class PlayersSynchronizer extends EventEmitter {
  constructor(oltClient, service) {
    super();

    this.service = service;
    this.oltClient = oltClient;

    this.service.on('playerAdded', async (tenantId) => {
      try {
        const tenant = await this.service.getTenant(tenantId);
        await this.syncTenant(tenant);
      } catch (err) {
        console.log(err);
      }
    });
  }

  async sync() {
    const tenants = await this.service.listTenants();

    await Promise.all(tenants.map(tenant => this.syncTenant(tenant)));
  }

  async syncTenant(tenant) {
    const players = await this.service.listPlayers(tenant.id);
    const processedPlayers = players.map(player => ({
      id: player.uuid,
      key: player.key,
      name: player.name,
    }));

    await this.oltClient.setPlayers(tenant, processedPlayers);
  }
}

module.exports = PlayersSynchronizer;
