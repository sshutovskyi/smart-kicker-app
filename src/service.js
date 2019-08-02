const { EventEmitter } = require('events');
const { zipWith, map, keyBy, groupBy, uniq } = require('lodash');
const uuid = require('uuid/v4');

const mapTenant = row => ({
  id: row.id,
  uuid: row.uuid,
});
const mapPlayer = row => ({
  id: row.id,
  name: row.name,
  key: row.key,
  uuid: row.uuid,
});
const mapPlayerShort = row => ({
  id: row.id,
  name: row.name,
});
const mapTeam = (row, players) => ({
  id: row.id,
  players,
});

const PLAYERS_TABLE_NAME = 'players';
const TENANTS_TABLE_NAME = 'tenants';
const MATCHES_TABLE_NAME = 'matches';
const PARTICIPANTS_TABLE_NAME = 'participants';
const TEAMS_TABLE_NAME = 'teams';

class Service extends EventEmitter {
  constructor(knex) {
    super();
    this.knex = knex;
  }

  listTenants() {
    return this.knex(TENANTS_TABLE_NAME)
      .select()
      .then(items => items.map(mapTenant));
  }

  getTenant(tenantId) {
    return this.knex(TENANTS_TABLE_NAME)
      .select()
      .where('id', tenantId)
      .then(row => (row ? mapTenant(row) : row));
  }

  async listMatches(tenantId) {
    const matches = await this.knex(MATCHES_TABLE_NAME)
      .where('tenant_id', tenantId)
      .orderBy('finished_at', 'desc');
    const participants = await this.knex(PARTICIPANTS_TABLE_NAME)
      .whereIn('match_id', map(matches, 'id'));
    const teams = await this.knex(TEAMS_TABLE_NAME)
      .whereIn('id', map(participants, 'team_id'));
    const players = await this.knex(PLAYERS_TABLE_NAME)
      .where('tenant_id', tenantId);

    const playersById = keyBy(players, 'id');
    const teamsById = keyBy(teams, 'id');
    const participantsByMatchId = groupBy(participants, 'match_id');

    return matches.map(match => ({
      id: match.id,
      finishedAt: match.finished_at,
      startedAt: match.started_at,
      participants: participantsByMatchId[match.id].map(participant => {
        const team = teamsById[participant.team_id];
        return {
        score: participant.score,
        players: team.player2_id ? [
          mapPlayerShort(playersById[team.player1_id]),
          mapPlayerShort(playersById[team.player2_id]),
        ] : [
          mapPlayerShort(playersById[team.player1_id]),
        ]
        };
      }),
    }));
  }

  async createPlayer(tenantId, data) {
    const player = await this.knex(PLAYERS_TABLE_NAME).insert({
      id: uuid(),
      tenant_id: tenantId,
      name: data.name,
      key: data.key,
    }).returning('*').then(mapPlayer);
    this.emit('playerAdded', tenantId, player);
    return player;
  }

  listPlayers(tenantId) {
    return this.knex(PLAYERS_TABLE_NAME)
      .select()
      .where('tenant_id', tenantId)
      .map(mapPlayer);
  }

  async getOrCreateTeam(tenantId, playerUUIDs) {
    const players = await this.knex(PLAYERS_TABLE_NAME)
      .select()
      .where('tenant_id', tenantId)
      .whereIn('uuid', playerUUIDs)
      .map(mapPlayer);
    if (players.length !== playerUUIDs.length) {
      throw new Error('encountered unknown players');
    }
    const team = await (
      players[1] ?
      this.knex(TEAMS_TABLE_NAME)
        .select()
        .whereRaw('(player1_id=? AND player2_id=?) OR (player1_id=? AND player2_id=?)', [
          players[0].id,
          players[1].id,
          players[1].id,
          players[0].id,
        ])
        .first() :
      this.knex(TEAMS_TABLE_NAME)
        .select()
        .where('player1_id', players[0].id)
        .whereNull('player2_id')
        .first()
    );
    if (team) return mapTeam(team, players);

    const data = {
      tenant_id: tenantId,
      player1_id: players[0].id,
      player2_id: players[1] ? players[1].id : null,
    };
    const [id] = await this.knex(TEAMS_TABLE_NAME).insert(data);
    const newTeam = { id, ...data };

    return mapTeam(newTeam, players);
  }

  async createMatch(tenantId, data) {
    const teams = await Promise.all(data.participants.map(
      ({ players }) => this.getOrCreateTeam(tenantId, uniq(players)),
    ));

    return this.knex.transaction(async (trx) => {
      const matchData = {
        tenant_id: tenantId,
        started_at: data.startedAt ? new Date(data.startedAt).getTime() : Date.now(),
        finished_at: data.finishedAt ? new Date(data.finishedAt).getTime() : Date.now(),
      };
      const [matchId] = await trx(MATCHES_TABLE_NAME).insert(matchData);
      const match = { id: matchId, ...matchData };
      const participants = await Promise.all(zipWith(
        data.participants,
        teams,
        ({ score }, team) => trx(PARTICIPANTS_TABLE_NAME)
          .insert({
            match_id: match.id,
            team_id: team.id,
            score,
            points: (score === 10 ? 3 : 0),
          })
          .then(([id]) => ({ id, score })),
      ));

      return {
        id: match.id,
        finishedAt: new Date(match.finishedAt),
        participants: zipWith(participants, teams, ({ score }, team) => ({
          players: team.players,
          score,
        })),
      };
    });
  }

  async getStanding(tenantId) {
    const standing = await this.knex(PARTICIPANTS_TABLE_NAME)
      .select('participants.team_id', this.knex.raw('SUM(points) as points'))
      .join(MATCHES_TABLE_NAME, 'id', '=', 'participants.match_id')
      .where('matches.tenant_id', tenantId)
      .groupBy('participants.team_id')
      .orderBy('points', 'DESC');
    const teams = await this.knex(TEAMS_TABLE_NAME)
      .where('tenant_id', tenantId);
    const players = await this.knex(PLAYERS_TABLE_NAME)
      .where('tenant_id', tenantId);

    const playersById = keyBy(players, 'id');
    const teamsById = keyBy(teams, 'id');

    return standing.map(item => {
      const team = teamsById[item.team_id];
      return {
        points: item.points,
        players: team.player2_id ? [
          mapPlayerShort(playersById[team.player1_id]),
          mapPlayerShort(playersById[team.player2_id]),
        ] : [
          mapPlayerShort(playersById[team.player1_id]),
        ],
      };
    });
  }
}

module.exports = Service;
