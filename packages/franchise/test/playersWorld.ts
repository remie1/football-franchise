/**
 * The players' steps' test league (ADR-087 §10), shared by `players.steps.test.ts` and
 * `players.draft.test.ts`: hand-made players rated alike in every active attribute, a 53 a team in
 * the draft's roster shape (`WANTED`), two street free agents a position, a coaching staff with
 * depth-chart leanings, and a seeded fake game whose who-played report fields each team's fit
 * starters. Franchise never imports attributes, so this stands in for its players.
 */
import {
  ATTRIBUTE_REGISTRY_V1, POSITION_PROFILES, createRng, playerId, positionOverall,
  type AttrId, type AttributeMap, type DraftClass, type GameParticipation, type PlayerState, type Position, type Team,
} from "@ff/contracts";
import { buildLeague, buildStaff, type GameResolver, type LeaguePeople } from "../src/index.js";
import { STARTERS, WANTED, type Rate } from "../src/draft/board.js";

const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
export const POSITIONS = Object.keys(WANTED) as Position[];
export const SEASON = 2027;

export function player(id: string, position: Position, rating: number, age: number, team?: Team["id"]): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, rating]));
  return {
    bio: { id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: 230, draft: { year: SEASON - Math.max(0, age - 22), round: 3, pick: 70 }, creditedSeasons: Math.max(0, age - 22) },
    attributes: { kind: "true", values, traits: new Set<string>(), development: { growth: 1, snaps: 0, carry: {}, body: { forty: 4.7, cone: 7.2, vertical: 32, bench: 18 } } },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet", patience: 1 },
    ...(team !== undefined ? { teamId: team } : {}),
  };
}

export const league = buildLeague("steps-world");
export function startingPeople(): LeaguePeople {
  const players: PlayerState[] = [];
  const teams = league.teams.map((t) => {
    const rng = createRng("roster", String(t.id));
    const roster: PlayerState["bio"]["id"][] = [];
    const depthChart: Partial<Record<Position, PlayerState["bio"]["id"][]>> = {};
    for (const pos of POSITIONS) for (let i = 0; i < WANTED[pos]; i++) {
      const p = player(`${String(t.id)}-${pos}-${i}`, pos, 70 - 5 * i + rng.int(-3, 3), 22 + rng.int(0, 11), t.id);
      players.push(p); roster.push(p.bio.id); (depthChart[pos] ??= []).push(p.bio.id);
    }
    return { ...t, roster, depthChart };
  });
  const pool = POSITIONS.flatMap((pos) => [0, 1].map((i) => player(`FA-${pos}-${i}`, pos, 50 + 3 * i, 27)));
  const staff = buildStaff(league, { firstSeason: SEASON, historySeasons: 0, lineups: true }).world.staff;
  return { teams, players: [...players, ...pool], picks: [], classes: [], freeAgents: pool.map((p) => p.bio.id), staff };
}

export const canPlay = (p: PlayerState) => !p.condition.injury || p.condition.injury.playable;
/** A seeded game whose who-played report puts each team's fit starters on the field, as the real runner would. */
export const resolve: GameResolver = (game, seed, people) => {
  const rng = createRng(seed, "fake-game");
  const homeScore = rng.int(0, 5) * 7, awayScore = rng.int(0, 5) * 7;
  const result = { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" as const : "REGULATION" as const, seed };
  if (!people) return result;
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const participation: GameParticipation[] = [];
  for (const id of [game.home, game.away]) {
    const team = people.teams.find((t) => t.id === id)!;
    for (const pos of POSITIONS) {
      const fit = (team.depthChart[pos] ?? []).filter((pid) => canPlay(byId.get(String(pid))!));
      fit.slice(0, Math.max(1, STARTERS[pos])).forEach((pid) => {
        const side = ["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"].includes(pos) ? "offense" : ["K", "P", "LS"].includes(pos) ? "special" : "defense";
        const attr = POSITION_PROFILES[pos].core[0] as AttrId;
        participation.push({ player: pid, team: id, snaps: { offense: side === "offense" ? 60 : 0, defense: side === "defense" ? 60 : 0, special: side === "special" ? 8 : 0 }, contests: [{ attr, won: rng.int(0, 10), lost: rng.int(0, 10) }] });
      });
    }
  }
  return { result, extras: { participation } };
};

/** The draft's read of a player for these tests: his true overall at his position. */
export const rate: Rate = (p) => positionOverall(p.bio.position, p.attributes.values);

/**
 * Draft `draft`'s class, as `draft.season.test.ts` makes one (600 prospects at random positions),
 * but rated like this league's players, so the players' steps read them as they read everyone else.
 */
export function makeClass(draft: number): { draftClass: DraftClass; players: PlayerState[] } {
  const rng = createRng("class", String(draft));
  const players = Array.from({ length: 600 }, (_, i): PlayerState => {
    const { bio: { creditedSeasons: _seasons, ...bio }, ...rest } = player(`d${draft}-${i}`, rng.pick(POSITIONS), 40 + rng.int(0, 40), 22);
    return { ...rest, bio: { ...bio, draft: "PROSPECT" } };
  });
  return { draftClass: { draft, prospects: players.map((p) => p.bio.id) }, players };
}
