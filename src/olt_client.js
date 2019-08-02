const querystring = require('querystring');
const fetch = require('node-fetch');

const DEVICE_TYPE_CATEGORY = 'io:lightelligence:smart-kicker:table';

class OltClient {
  constructor(config) {
    this.config = config;
    this.tokens = new Map();
  }

  async getToken(tenant) {
    if (this.tokens.has(tenant.uuid)) {
      return this.tokens.get(tenant.uuid);
    }

    const res = await fetch('https://id.lightelligence.io/v1/id/auth/realms/olt/protocol/openid-connect/token', {
      method: 'post',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'tenant': tenant.uuid,
      },
      body: querystring.stringify({
        grant_type: 'client_credentials',
        client_id: this.config.id,
        client_secret: this.config.secret,
      }),
    });
    const body = await res.json();
    const token = body.access_token;
    this.tokens.set(tenant.uuid, token);
    return token;
  }

  async getStreamUrl(tenant, filter) {
    const token = await this.getToken(tenant);

    const res = await fetch('https://api.lightelligence.io/v1/devices/streaming-connections', {
      method: 'post',
      body: JSON.stringify({
        type: 'live',
        filter,
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

  async getDevices(tenant) {
    const token = await this.getToken(tenant);

    const res = await fetch('https://api.lightelligence.io/v1/devices', {
      method: 'get',
      query: {
        deviceTypeCategory: DEVICE_TYPE_CATEGORY,
        pageSize: 100,
      },
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
      },
    });
    const body = await res.json();
    return body.data;
  }

  async setPlayers(tenant, players) {
    const devices = await this.getDevices(tenant);

    const token = await this.getToken(tenant);

    await Promise.all(devices.map(
      device => fetch(`https://api.lightelligence.io/v1/devices/${device.id}`, {
        method: 'patch',
        body: JSON.stringify({
          configuration: { players },
        }),
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${token}`,
        },
      }),
    ));
  }
}

module.exports = OltClient;
