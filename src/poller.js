const { EventEmitter } = require('events');
const querystring = require('querystring');
const WebSocket = require('ws');

const TENANT_RECONNECTION_TIMEOUT = 1000;
const DEVICE_TYPE_CATEGORY = 'io:lightelligence:smart-kicker:table';
const EVENT_NAME = 'matchCompleted';

class Poller extends EventEmitter {
  constructor(oltClient, service) {
    super();
    this.oltClient = oltClient;
    this.service = service;
  }

  async registerTenant(tenant) {
    try {
      const url = await this.oltClient.getStreamUrl(tenant, {
        type: ['eventUpdate'],
        deviceTypeCategory: [DEVICE_TYPE_CATEGORY],
        event: [EVENT_NAME],
      });
      const token = await this.oltClient.getToken(tenant);
      const socket = new WebSocket(url, {
        headers: {
          'authorization': `Bearer ${token}`,
        },
      });
      socket.on('message', async (msg) => {
        try {
          const { payload: { value } } = JSON.parse(msg);
          this.emit('match', tenant.id, value);
          await this.service.createMatch(tenant.id, value);
        } catch (err) {
          this.emit('error', new Error(`Failed to process message ${msg} for tenant ${tenant.id}.
            Reason: ${err.message}`));
        }
      });
      socket.on('close', () => {
        connect(table);
      });
    } catch (err) {
      this.emit('error', new Error(`Failed to connect to tenant ${tenant.id}.
        Reason: ${err.message}`));
      setTimeout(() => {
        this.registerTenant(tenant);
      }, TENANT_RECONNECTION_TIMEOUT);
    }
  }

  async init() {
    const tenants = await this.service.listTenants();
    tenants.forEach(tenant => this.registerTenant(tenant));
  }
}

module.exports = Poller;
