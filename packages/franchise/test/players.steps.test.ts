import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, DEFAULT_LEAGUE_RULES, POSITION_PROFILES, createRng, isTruthLayerEvent, playerId, positionOverall, stampToString,
  type AttrId, type AttributeMap, type CalendarStamp, type FranchiseEventEnvelope, type GameParticipation, type PlayerState,
  type Position, type SaveFile, type Team,
} from "@ff/contracts";
import { buildLeague, buildStaff, makeSave, readSave, runSeason, type GameResolver, type LeaguePeople } from "../src/index.js";
import { STARTERS, WANTED } from "../src/draft/board.js";
import { emergencySignings, playerSteps, playerWeeks, PLAYER_STEP_PREFIX } from "../src/players/steps.js";
import { readBlur } from "../src/players/depthChart.js";
import { currentJob, seatOf } from "../src/staff/world.js";

// ADR-087 §10 (D4): the players' steps in the season walk, on a league of hand-made players.

const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
const POSITIONS = Object.keys(WANTED) as Position[];
const SEASON = 2027;

function player(id: string, position: Position, rating: number, age: number, team?: Team["id"]): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, rating]));
  return {
    bio: { id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: 230, draft: { year: SEASON - Math.max(0, age - 22), round: 3, pick: 70 }, creditedSeasons: Math.max(0, age - 22) },
    attributes: { kind: "true", values, traits: new Set<string>(), development: { growth: 1, snaps: 0, carry: {}, body: { forty: 4.7, cone: 7.2, vertical: 32, bench: 18 } } },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet", patience: 1 },
    ...(team !== undefined ? { teamId: team } : {}),
  };
}

const league = buildLeague("steps-world");
function startingPeople(): LeaguePeople {
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

const canPlay = (p: PlayerState) => !p.condition.injury || p.condition.injury.playable;
/** A seeded game whose who-played report puts each team's fit starters on the field, as the real runner would. */
const resolve: GameResolver = (game, seed, people) => {
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

const both = { development: true, injuries: true } as const;
const base = { league, season: SEASON, seed: league.seed, resolve, through: "YEAR" as const };
const straight = runSeason({ ...base, people: startingPeople(), players: both });
const week9: CalendarStamp = { season: SEASON, phase: "REGULAR_SEASON", week: 9, day: 7 };
const types = (events: readonly FranchiseEventEnvelope[]) => {
  const n: Record<string, number> = {};
  for (const e of events) n[e.event.type] = (n[e.event.type] ?? 0) + 1;
  return n;
};

describe("the players' steps in the season walk (ADR-087 §10)", () => {
  it("adds no steps with both switches off, and the season is the same as without them", () => {
    expect(playerSteps({})).toEqual([]);
    expect(playerSteps({ development: false, injuries: false })).toEqual([]);
    const people = startingPeople();
    const off = runSeason({ ...base, people, players: { development: false, injuries: false } });
    const none = runSeason({ ...base, people });
    expect(JSON.stringify(off)).toBe(JSON.stringify(none));
  });

  it("with both on, grows players, injures them, keeps the depth charts and fills holes, all in the stream", () => {
    const n = types(straight.events);
    expect(n.RATINGS_CHANGED).toBeGreaterThan(0);
    expect(n.INJURY_OCCURRED).toBeGreaterThan(0);
    expect(n.INJURY_HEALED).toBeGreaterThan(0);
    expect(n.DEPTH_CHART_CHANGED).toBeGreaterThan(0);
    // Every step event is labelled with its step, and the truth-layer ones are the two kinds ADR-087 §7 names.
    expect(straight.stepEvents!.every((e) => e.step.startsWith(PLAYER_STEP_PREFIX))).toBe(true);
    expect(new Set(straight.events.filter((e) => isTruthLayerEvent(e.event)).map((e) => e.event.type))).toEqual(new Set(["RATINGS_CHANGED", "INJURY_HEALED"]));
    expect(straight.people!.playerMemory!.switches).toEqual(both);
  });

  it("is the same season for the same seed", () => {
    const again = runSeason({ ...base, people: startingPeople(), players: both });
    expect(JSON.stringify(again.events)).toBe(JSON.stringify(straight.events));
  });

  it("signs players in an emergency only for a game next week: never in the offseason, never for a team that is out", () => {
    // A team wants a quarterback whenever it has fewer fit ones than it started with, so hurt quarterbacks bring signings.
    const start = startingPeople();
    const wanted = new Map(start.teams.map((t) => [String(t.id), (t.depthChart.QB ?? []).length]));
    const unfilled = (t: Team, available: ReadonlySet<string>, players: ReadonlyMap<string, PlayerState>): Position | undefined =>
      (t.depthChart.QB ?? []).filter((id) => available.has(String(id)) && players.get(String(id))!.bio.position === "QB").length < wanted.get(String(t.id))! ? "QB" : undefined;
    const run = runSeason({ ...base, people: start, players: { ...both, unfilled } });
    const signings = run.events.filter((e) => e.event.type === "CONTRACT_SIGNED");
    expect(signings.length).toBeGreaterThan(0);
    const field = new Set(run.state.bracket!.seeds.flatMap((s) => s.teams.map(String)));
    for (const e of signings) {
      expect(["PRESEASON", "REGULAR_SEASON", "PLAYOFFS"]).toContain(e.at.phase);
      if (e.at.phase === "PRESEASON") expect(e.at.week).toBe(3);
      const team = String((e.event.payload as { team: string }).team);
      if (e.at.phase === "PLAYOFFS") expect(field.has(team)).toBe(true);
    }
    expect(signings.some((e) => e.at.phase !== "PRESEASON")).toBe(true);
  });

  it("only ever puts fit players on the field: nobody out injured appears in a who-played report", () => {
    const seen: string[] = [];
    const watching: GameResolver = (game, seed, people) => {
      const r = resolve(game, seed, people);
      const out = new Set(people!.players.filter((p) => !canPlay(p)).map((p) => String(p.bio.id)));
      for (const p of ("extras" in r ? (r.extras as { participation: GameParticipation[] }).participation : [])) if (out.has(String(p.player))) seen.push(String(p.player));
      return r;
    };
    runSeason({ ...base, resolve: watching, people: startingPeople(), players: both, stopAfter: week9 });
    expect(seen).toEqual([]);
  });

  it("stopped at week 9 and carried on with the people, the saved events and the day, gives the straight season", () => {
    const first = runSeason({ ...base, people: startingPeople(), players: both, stopAfter: week9 });
    const saved = first.stepEvents!.map((e) => e.envelope);
    const second = runSeason({
      ...base, people: first.people!, players: both, resumeFrom: first.state, stepsDoneThrough: first.calendar, resumeEvents: saved,
    });
    expect(JSON.stringify(second.events)).toBe(JSON.stringify(straight.events));
    expect(JSON.stringify(second.state)).toBe(JSON.stringify(straight.state));
    expect(JSON.stringify(second.people)).toBe(JSON.stringify(straight.people));
  });

  it("does the same through a save file (S1), read back from JSON text", () => {
    const first = runSeason({ ...base, people: startingPeople(), players: both, stopAfter: week9 });
    const people = first.people!;
    const save = makeSave({
      league: { ...league, teams: people.teams }, calendar: first.calendar, season: first.state, createdBy: "test", players: people.players,
      development: { events: first.stepEvents!.filter((e) => e.step.startsWith(PLAYER_STEP_PREFIX)).map((e) => e.envelope), depthMemory: people.playerMemory! },
    });
    const text = JSON.stringify(save, (_k, v: unknown) => (v instanceof Set ? [...v] : v));
    const loaded = readSave(text);
    expect(loaded.development!.people.playerMemory).toEqual(people.playerMemory);
    expect(loaded.development!.events).toHaveLength(save.world.development!.events.length);
    const second = runSeason({
      ...base, people: { ...loaded.development!.people, staff: people.staff! }, players: loaded.development!.people.playerMemory!.switches!,
      resumeFrom: loaded.save.world.season!, stepsDoneThrough: loaded.save.calendar, resumeEvents: loaded.development!.events,
    });
    expect(JSON.stringify(second.events)).toBe(JSON.stringify(straight.events));
  });

  it("refuses a save whose players' record has an event after its date", () => {
    const first = runSeason({ ...base, people: startingPeople(), players: both, stopAfter: week9 });
    const save = makeSave({
      league: { ...league, teams: first.people!.teams }, calendar: first.calendar, season: first.state, createdBy: "test", players: first.people!.players,
      development: { events: first.stepEvents!.map((e) => e.envelope), depthMemory: first.people!.playerMemory! },
    });
    const edited = JSON.parse(JSON.stringify(save, (_k, v: unknown) => (v instanceof Set ? [...v] : v))) as SaveFile;
    edited.world.development!.events.push(straight.stepEvents!.at(-1)!.envelope);
    expect(() => readSave(edited)).toThrow(/event after its date/);
  });
});

describe("playerWeeks", () => {
  it("has a knocked-out team's players away from the team in the playoffs, and the teams still in practising", () => {
    const people = straight.people!;
    const bracket = straight.state.bracket!;
    const day: CalendarStamp = { season: SEASON, phase: "PLAYOFFS", week: 2, day: 7 };
    // The state as it stood after wild-card week: only that week's results.
    const wildCard = new Set(bracket.games.filter((g) => g.at.week === 1).map((g) => String(g.gameId)));
    const state = { ...straight.state, results: straight.state.results.filter((r) => !bracket.games.some((g) => g.gameId === r.gameId) || wildCard.has(String(r.gameId))) };
    const weeks = playerWeeks(people, { day, season: SEASON, seed: "x", rules: DEFAULT_LEAGUE_RULES, state, games: [] }, []);
    const seeded = new Set(bracket.seeds.flatMap((s) => s.teams.map(String)));
    const lost = new Set(state.results.filter((r) => wildCard.has(String(r.gameId))).map((r) => String(r.homeScore > r.awayScore ? r.away : r.home)));
    for (const p of people.players) {
      const w = weeks.get(String(p.bio.id));
      if (!w || p.teamId === undefined) continue;
      expect(w.withTeam, `${String(p.bio.id)} (${stampToString(day)})`).toBe(seeded.has(String(p.teamId)) && !lost.has(String(p.teamId)));
    }
  });
});

describe("emergencySignings (§5.3)", () => {
  const people = startingPeople();
  const team = people.teams[0]!;
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const qbs = new Set((team.depthChart.QB ?? []).map(String));
  const hurt: LeaguePeople = {
    ...people,
    players: people.players.map((p) => (qbs.has(String(p.bio.id))
      ? { ...p, condition: { ...p.condition, injury: { kind: "ankle", weeksRemaining: 3, playable: false, setting: "GAME", band: "SHORT", since: week9 } } } : p)),
  };
  const at = week9;
  const noQb = (t: Team, available: ReadonlySet<string>, players: ReadonlyMap<string, PlayerState>): Position | undefined =>
    (t.depthChart.QB ?? []).some((id) => available.has(String(id)) && players.get(String(id))!.bio.position === "QB") ? undefined : "QB";

  const seed = "signings";
  const oc = people.staff!.find((s) => seatOf(s) === "OC" && currentJob(s)?.team === team.id);
  /** The offensive coordinator's read of a free agent at quarterback: what the team signs on, never the truth (§7). */
  const read = (id: string) => positionOverall("QB", byId.get(id)!.attributes.values) + readBlur({ seed, at, team: team.id, seat: "OC", coordinator: oc, player: playerId(id) });
  const bestRead = (ids: readonly string[]) => [...ids].sort((a, b) => read(b) - read(a) || a.localeCompare(b))[0]!;

  it("signs the free-agent quarterback his coordinator reads best, on a one-year minimum, when every quarterback is out", () => {
    const r = emergencySignings(hurt, at, noQb, { seed });
    const pick = bestRead(hurt.freeAgents.map(String).filter((id) => id.startsWith("FA-QB")));
    expect(r.events).toEqual([{ type: "CONTRACT_SIGNED", payload: { player: playerId(pick), team: team.id, kind: "MINIMUM", years: 1 } }]);
    const signed = r.people.players.find((p) => String(p.bio.id) === pick)!;
    expect(signed.teamId).toBe(team.id);
    expect(r.people.teams[0]!.roster).toContain(signed.bio.id);
    expect(r.people.teams[0]!.depthChart.QB).toContain(signed.bio.id);
    expect(r.people.freeAgents).not.toContain(signed.bio.id);
  });

  it("reads through the coordinator's blur, so the same seed signs the same man and the read is not the true overall", () => {
    expect(emergencySignings(hurt, at, noQb, { seed })).toEqual(emergencySignings(hurt, at, noQb, { seed }));
    const ids = hurt.freeAgents.map(String);
    expect(ids.some((id) => read(id) !== positionOverall("QB", byId.get(id)!.attributes.values))).toBe(true);
  });

  it("signs the best read at the position, listed there, when no free agent plays it", () => {
    const noQbs: LeaguePeople = { ...hurt, freeAgents: hurt.freeAgents.filter((id) => !String(id).startsWith("FA-QB")) };
    const r = emergencySignings(noQbs, at, noQb, { seed });
    const id = (r.events[0]!.payload as { player: string }).player;
    const signed = r.people.players.find((p) => p.bio.id === id)!;
    expect(signed.bio.position).toBe("QB");
    expect(String(id)).toBe(bestRead(noQbs.freeAgents.map(String)));
  });

  it("signs nobody for a team without a game next week", () => {
    const r = emergencySignings(hurt, at, noQb, { seed, playing: new Set(people.teams.slice(1).map((t) => String(t.id))) });
    expect(r.events).toEqual([]);
  });

  it("changes nothing when every team can play", () => {
    const r = emergencySignings(people, at, () => undefined, { seed });
    expect(r.events).toEqual([]);
    expect(r.people).toBe(people);
  });
});
