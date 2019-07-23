const { EventEmitter } = require('events');
const { zipWith, map, keyBy, groupBy } = require('lodash');
const uuid = require('uuid/v4');

const mapTenant = row => ({
  id: row.id,
  uuid: row.uuid,
});
const mapPlayer = row => ({
  id: row.id,
  name: row.name,
  key: row.key,
});
const mapPlayerShort = row => ({
  id: row.id,
  name: row.name,
});
const mapTeam = (row, players) => ({
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
    return knex(TENANTS_TABLE_NAME)
      .select()
      .when(items => items.map(mapTenant));
  }

  listMatches(tenantId) {
    const matches = await knex(MATCHES_TABLE_NAME)
      .where('tenant_id', tenantId)
      .orderBy('finishedAt', 'desc');
    const participants = await knex(PARTICIPANTS_TABLE_NAME)
      .whereIn('match_id', map(matches, 'id'));
    const teams = await knex(TEAMS_TABLE_NAME)
      .whereIn('id', map(participants, 'team_id'));
    const players = await knex(PLAYERS_TABLE_NAME)
      .where('tenant_id', tenantId);

    const playersById = keyBy(players, 'id');
    const teamsById = keyBy(teams, 'id');
    const participantsByMatchId = groupBy(participants, 'match_id');

    return matches.map(match => ({
      id: match.id,
      finishedAt: match.finished_at,
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
    return knex(PLAYERS_TABLE_NAME).insert({
      id: uuid(),
      tenant_id: tenantId,
      name: data.name,
      key: data.key,
    }).returning('*').then(mapPlayer);
  }

  listPlayers(tenantId) {
    return knex(PLAYERS_TABLE_NAME)
      .select()
      .where('tenant_id', tenantId)
      .map(mapPlayer);
  }

  async getOrCreateTeam(tenantId, playerUUIDs) {
    const players = await knex(PLAYERS_TABLE_NAME)
      .select()
      .where('tenant_id', tenantId)
      .whereIn('uuid', playerUUIDs)
      .map(mapPlayer);
    if (players.length !== playerUUIDs.length) {
      throw new Error('encountered unknown players');
    }
    const team = await knex(TEAMS_TABLE_NAME)
      .select()
      .whereRaw(
        '(player1_id=? AND player2_id=?) OR (player1_id=? AND player2_id=?)',
        players[0].id,
        players[1] ? players[1].id || null,
        players[1] ? players[1].id || null,
        players[0].id,
      );
    if (team) return mapTeam(team, players);

    const newTeam = await knex(TEAMS_TABLE_NAME)
      .insert({
        tenant_id: tenantId,
        player1_id: players[0].id,
        player2_id: players[1] ? players[1].id || null,
      })
      .returning('*');

    return mapTeam(newTeam, players);
  }

  async createMatch(tenantId, data) {
    const teams = await Promise.all(data.teams.map(
      ({ players }) => this.getOrCreateTeam(tenantId, players),
    ));

    return knex.transaction((trx) => {
      const match = await trx(MATCHES_TABLE_NAME)
        .insert({
          tenant_id: tenantId,
          finished_at: data.finishedAt ? data.finishedAt.getTime() : Date.now(),
        })
        .returning('*');
      const participants = await Promise.all(zipWith(
        data.teams,
        teams,
        ({ score }, team) => knex(PARTICIPANTS_TABLE_NAME)
          .insert({ match_id: match.id, team_id: team.id, score })
        .returning('*'),
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
    // TODO implement me
  }
}

module.exports = Service;
