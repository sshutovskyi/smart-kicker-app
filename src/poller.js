const { EventEmitter } = require('events');
const querystring = require('querystring');
const fetch = require('node-fetch');
const WebSocket = require('ws');

const TENANT_RECONNECTION_TIMEOUT = 1000;
const DEVICE_TYPE_CATEGORY = 'io.lightelligence.smart-kicker.table';
const EVENT_NAME = 'matchCompleted';

class Poller extends EventEmitter {
  constructor(config, service) {
    super();
    this.config = config;
    this.service = service;
  }

  async getToken(tenant) {
    const res = await fetch('https://id.lightelligence.io/v1/id/auth/realms/olt/protocol/openid-connect/token', {
      method: 'post',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'tenant': tenant.uuid,
      },
      body: querystring.stringify({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });
    const body = await res.json();
    return body.access_token;
  }

  async getStreamUrl(tenant) {
    const token = await this.getToken(tenant);

    const res = await fetch('https://api.lightelligence.io/v1/devices/streaming-connections', {
      method: 'post',
      body: JSON.stringify({
        type: 'live',
        filter: {
          type: 'eventUpdate',
          deviceTypeCategory: DEVICE_TYPE_CATEGORY,
          event: [EVENT_NAME],
        },
      }),
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
      },
    });
    const body = await res.json();

    const { data: { url } } = body;

    return url;
  }

  async registerTenant(tenant) {
    try {
      const url = await this.getStreamUrl(token);
      const socket = new WebSocket(url, {
        headers: {
          'authorization': `Bearer ${token}`,
        },
      });
      socket.on('message', await (msg) => {
        try {
          console.log(msg);
          const { payload } = JSON.parse(msg);
          this.service.createMatch(tenant.id, payload);

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
