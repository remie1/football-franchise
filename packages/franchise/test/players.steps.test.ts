import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, DEFAULT_LEAGUE_RULES, POSITION_PROFILES, createRng, isTruthLayerEvent, playerId, positionOverall, stampToString,
  type AttrId, type AttributeMap, type CalendarStamp, type DeadMoneyCharge, type FranchiseEventEnvelope, type GameParticipation,
  type PlayerContract, type PlayerState, type Position, type SaveFile, type Team,
} from "@ff/contracts";
import { buildLeague, buildStaff, makeSave, readSave, runSeason, type GameResolver, type LeaguePeople } from "../src/index.js";
import { STARTERS, WANTED } from "../src/draft/board.js";
import { emergencySignings, playerSteps, playerWeeks, PLAYER_STEP_PREFIX } from "../src/players/steps.js";
import { readBlur } from "../src/players/depthChart.js";
import { minimumContract, signPracticeSquad } from "../src/cap/signings.js";
import { capNumber, liveIn, teamCapTotal } from "../src/cap/money.js";
import { liveContract, release } from "../src/draft/money.js";
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

  it("calls up each team's own practice squad before the street, and keeps who is where straight for a save", () => {
    // Two practice-squad players a team, a quarterback and a receiver; a team wants a quarterback whenever it has fewer fit ones than it started with.
    const start = startingPeople();
    const squads = new Map(start.teams.map((t) => [String(t.id), [player(`${String(t.id)}-PS-QB`, "QB", 48, 23, t.id), player(`${String(t.id)}-PS-WR`, "WR", 55, 23, t.id)]]));
    const people: LeaguePeople = {
      ...start,
      teams: start.teams.map((t) => ({ ...t, practiceSquad: squads.get(String(t.id))!.map((p) => p.bio.id) })),
      players: [...start.players, ...[...squads.values()].flat()],
    };
    const wanted = new Map(start.teams.map((t) => [String(t.id), (t.depthChart.QB ?? []).length]));
    const unfilled = (t: Team, available: ReadonlySet<string>, players: ReadonlyMap<string, PlayerState>): Position | undefined =>
      (t.depthChart.QB ?? []).filter((id) => available.has(String(id)) && players.get(String(id))!.bio.position === "QB").length < wanted.get(String(t.id))! ? "QB" : undefined;
    const run = runSeason({ ...base, people, players: { ...both, unfilled }, stopAfter: week9 });
    // Same seed, same season, call-ups and all (Iron Rule 4).
    expect(JSON.stringify(runSeason({ ...base, people, players: { ...both, unfilled }, stopAfter: week9 }).events)).toBe(JSON.stringify(run.events));
    const squadOf =new Map([...squads].flatMap(([team, ps]) => ps.map((p) => [String(p.bio.id), team] as const)));
    const street = new Set(start.freeAgents.map(String));
    const signings = run.events.filter((e) => e.event.type === "CONTRACT_SIGNED").map((e) => e.event.payload as { player: string; team: string });
    const calledUp = signings.filter((s) => squadOf.get(String(s.player)) === String(s.team));
    expect(calledUp.length).toBeGreaterThan(0);
    expect(calledUp.length + signings.filter((s) => street.has(String(s.player))).length).toBe(signings.length);
    // Read in stream order: a team signs off the street only when everyone left on its squad is out hurt, and calls up
    // its receiver only when its quarterback is out or gone.
    const out = new Map<string, boolean>();
    const left = new Map([...squads].map(([team, ps]) => [team, new Set(ps.map((p) => String(p.bio.id)))]));
    let checked = 0;
    for (const { event } of run.events) {
      if (event.type === "INJURY_OCCURRED") out.set(String(event.payload.player), event.payload.band !== "DAY_TO_DAY");
      else if (event.type === "INJURY_HEALED") out.delete(String(event.payload.player));
      else if (event.type === "CONTRACT_SIGNED") {
        const team = String(event.payload.team), who = String(event.payload.player);
        const squad = left.get(team)!;
        const qb = `${team}-PS-QB`;
        if (street.has(who)) for (const id of squad) expect(out.get(id), `${team} signed ${who} with ${id} fit`).toBe(true);
        else if (who === `${team}-PS-WR` && squad.has(qb)) expect(out.get(qb), `${team} called up its receiver with ${qb} fit`).toBe(true);
        squad.delete(who);
        checked++;
      }
    }
    expect(checked).toBe(signings.length);
    // Nobody is on a roster and a practice squad; everyone on a squad is still the team's; a called-up man is on the roster.
    for (const t of run.people!.teams) {
      const roster = new Set(t.roster.map(String));
      for (const id of t.practiceSquad ?? []) {
        expect(roster.has(String(id)), String(id)).toBe(false);
        expect(run.people!.players.find((p) => p.bio.id === id)!.teamId).toBe(t.id);
      }
    }
    for (const s of calledUp) expect(run.people!.teams.find((t) => String(t.id) === String(s.team))!.roster.map(String)).toContain(String(s.player));
    // The save's checks accept the squads as they stand (ADR-086: on the team, and not also on its roster).
    const save = makeSave({
      league: { ...league, teams: run.people!.teams }, calendar: run.calendar, season: run.state, createdBy: "test", players: run.people!.players,
      development: { events: run.stepEvents!.map((e) => e.envelope), depthMemory: run.people!.playerMemory! },
    });
    const loaded = readSave(JSON.stringify(save, (_k, v: unknown) => (v instanceof Set ? [...v] : v)));
    expect(loaded.league.teams.map((t) => t.practiceSquad)).toEqual(run.people!.teams.map((t) => t.practiceSquad));
    // An empty squad is no squad: the same season as without one.
    const none = runSeason({ ...base, people: { ...start, players: people.players }, players: { ...both, unfilled }, stopAfter: week9 });
    const empty = runSeason({ ...base, people: { ...start, players: people.players, teams: start.teams.map((t) => ({ ...t, practiceSquad: [] })) }, players: { ...both, unfilled }, stopAfter: week9 });
    expect(JSON.stringify(empty.events)).toBe(JSON.stringify(none.events));
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

  // ADR-087 §11: the team's own practice squad first. All rated below the street's quarterbacks (50, 53), so a
  // call-up is the squad's doing, not the ratings': two quarterbacks rated alike (the read decides between them),
  // a receiver whose quarterback overall beats theirs, and a hurt quarterback better than all of them.
  const squadInjury = { kind: "ankle", weeksRemaining: 3, playable: false, setting: "GAME", band: "SHORT", since: week9 } as const;
  const psQbA = player("PS-QB-a", "QB", 45, 23, team.id);
  const psQbB = player("PS-QB-b", "QB", 45, 23, team.id);
  const psWr = player("PS-WR", "WR", 80, 24, team.id);
  const psTe = player("PS-TE", "TE", 70, 24, team.id);
  const psHurtQb: PlayerState = { ...player("PS-QB-hurt", "QB", 60, 23, team.id), condition: { stamina: 100, morale: 0, injury: squadInjury } };
  const squadPlayers = [psQbA, psQbB, psWr, psTe, psHurtQb];
  /** `from` with team 0's practice squad set to `squad` (absent: none). */
  const withSquad = (squad: readonly PlayerState[] | undefined, from: LeaguePeople = hurt): LeaguePeople => ({
    ...from,
    teams: from.teams.map((t, i) => (i === 0 && squad ? { ...t, practiceSquad: squad.map((p) => p.bio.id) } : t)),
    players: [...from.players, ...squadPlayers],
  });
  const everyone = new Map([...people.players, ...squadPlayers].map((p) => [String(p.bio.id), p]));
  const readOf = (id: string) => positionOverall("QB", everyone.get(id)!.attributes.values) + readBlur({ seed, at, team: team.id, seat: "OC", coordinator: oc, player: playerId(id) });
  const bestOf = (ids: readonly string[]) => [...ids].sort((a, b) => readOf(b) - readOf(a) || a.localeCompare(b))[0]!;
  const json = (x: unknown) => JSON.stringify(x, (_k, v: unknown) => (v instanceof Set ? [...v] : v));

  it("calls up the practice-squad quarterback his coordinator reads best before any free agent, onto the roster and the depth chart", () => {
    const before = withSquad(squadPlayers);
    const r = emergencySignings(before, at, noQb, { seed });
    // The two alike are told apart by the read alone; the receiver and the hurt man are passed over.
    expect(readOf("PS-QB-a")).not.toBe(readOf("PS-QB-b"));
    const pick = bestOf(["PS-QB-a", "PS-QB-b"]);
    expect(r.events).toEqual([{ type: "CONTRACT_SIGNED", payload: { player: playerId(pick), team: team.id, kind: "MINIMUM", years: 1 } }]);
    const t = r.people.teams[0]!;
    expect(t.practiceSquad).toEqual(squadPlayers.map((p) => p.bio.id).filter((id) => String(id) !== pick));
    expect(t.roster).toEqual([...before.teams[0]!.roster, playerId(pick)]);
    expect(t.depthChart.QB).toEqual([...(before.teams[0]!.depthChart.QB ?? []), playerId(pick)]);
    const called = r.people.players.find((p) => String(p.bio.id) === pick)!;
    expect(called.teamId).toBe(team.id);
    expect(called.bio.position).toBe("QB");
    expect(r.people.freeAgents).toEqual(before.freeAgents); // nobody came off the street
    expect(r.people.teams.slice(1)).toEqual(before.teams.slice(1));
  });

  it("calls up the squad's best read at the position, listed there from now on, when nobody on the squad plays it", () => {
    const r = emergencySignings(withSquad([psWr, psTe]), at, noQb, { seed });
    const pick = bestOf(["PS-WR", "PS-TE"]);
    expect(r.events).toEqual([{ type: "CONTRACT_SIGNED", payload: { player: playerId(pick), team: team.id, kind: "MINIMUM", years: 1 } }]);
    expect(r.people.players.find((p) => String(p.bio.id) === pick)!.bio.position).toBe("QB");
    expect(r.people.teams[0]!.practiceSquad!.map(String)).toEqual(["PS-WR", "PS-TE"].filter((id) => id !== pick));
    expect(r.people.teams[0]!.depthChart.QB!.at(-1)).toBe(playerId(pick));
  });

  it("signs from the street, exactly as without a squad, when nobody on the squad is fit", () => {
    const street = emergencySignings(hurt, at, noQb, { seed });
    for (const squad of [[psHurtQb], []]) {
      const r = emergencySignings(withSquad(squad), at, noQb, { seed });
      expect(r.events).toEqual(street.events);
      expect(r.people.teams[0]!.practiceSquad).toEqual(squad.map((p) => p.bio.id));
      expect(r.people.freeAgents).toEqual(street.people.freeAgents);
      expect(json({ ...r.people.teams[0], practiceSquad: undefined })).toBe(json({ ...street.people.teams[0], practiceSquad: undefined }));
    }
  });

  it("brings in a kicker for a hurt kicker: one off the squad, else one off the street before a squad man of another trade (§11)", () => {
    const kickers = new Set((team.depthChart.K ?? []).map(String));
    const noK: LeaguePeople = { ...people, players: people.players.map((p) => (kickers.has(String(p.bio.id)) ? { ...p, condition: { ...p.condition, injury: squadInjury } } : p)) };
    const noKicker = (t: Team, available: ReadonlySet<string>, players: ReadonlyMap<string, PlayerState>): Position | undefined =>
      (t.depthChart.K ?? []).some((id) => available.has(String(id)) && players.get(String(id))!.bio.position === "K") ? undefined : "K";
    const stc = people.staff!.find((s) => seatOf(s) === "STC" && currentJob(s)?.team === team.id);
    const kRead = (id: string) => positionOverall("K", everyone.get(id)!.attributes.values) + readBlur({ seed, at, team: team.id, seat: "STC", coordinator: stc, player: playerId(id) });
    const bestK = (ids: readonly string[]) => [...ids].sort((a, b) => kRead(b) - kRead(a) || a.localeCompare(b))[0]!;
    const signedOf = (r: ReturnType<typeof emergencySignings>) => String((r.events[0]!.payload as { player: string }).player);
    const streetKickers = noK.freeAgents.map(String).filter((id) => id.startsWith("FA-K"));
    // The squad's receiver and tight end are rated above the street's kickers even at kicker: the trade decides, not the rating.
    expect(Math.min(kRead("PS-WR"), kRead("PS-TE"))).toBeGreaterThan(Math.max(...streetKickers.map(kRead)));

    const street = emergencySignings(withSquad([psWr, psTe], noK), at, noKicker, { seed });
    expect(street.events).toHaveLength(1);
    expect(signedOf(street)).toBe(bestK(streetKickers));
    expect(street.people.teams[0]!.practiceSquad!.map(String)).toEqual(["PS-WR", "PS-TE"]);
    expect(street.people.freeAgents.map(String)).toEqual(noK.freeAgents.map(String).filter((id) => id !== signedOf(street)));
    expect(street.people.teams[0]!.depthChart.K!.at(-1)).toBe(playerId(signedOf(street)));

    // A kicker on the squad is called up first, rated below the street's or not.
    const psK = player("PS-K", "K", 40, 24, team.id);
    const withK = withSquad([psWr, psK, psTe], noK);
    const own = emergencySignings({ ...withK, players: [...withK.players, psK] }, at, noKicker, { seed });
    expect(own.events).toEqual([{ type: "CONTRACT_SIGNED", payload: { player: psK.bio.id, team: team.id, kind: "MINIMUM", years: 1 } }]);
    expect(own.people.freeAgents).toEqual(noK.freeAgents);

    // No kicker anywhere: the squad's best read at kicker, listed there, before the street's.
    const none = withSquad([psWr, psTe], { ...noK, freeAgents: noK.freeAgents.filter((id) => !String(id).startsWith("FA-K")) });
    const any = emergencySignings(none, at, noKicker, { seed });
    expect(signedOf(any)).toBe(bestK(["PS-WR", "PS-TE"]));
    expect(any.people.players.find((p) => String(p.bio.id) === signedOf(any))!.bio.position).toBe("K");
    expect(any.people.freeAgents).toEqual(none.freeAgents);
  });

  it("keeps the contract book as a street signing does: a one-year minimum for the man called up", () => {
    const r = emergencySignings({ ...withSquad(squadPlayers), contracts: [] }, at, noQb, { seed });
    const pick = bestOf(["PS-QB-a", "PS-QB-b"]);
    expect(r.people.contracts).toHaveLength(1);
    expect(r.people.contracts![0]).toMatchObject({ player: playerId(pick), team: team.id, kind: "MINIMUM", signedAt: at });
    expect(r.people.contracts![0]!.years).toHaveLength(1);
  });

  // ADR-087 §11: a call-up ends his squad deal, so the book holds one live deal for him and the cap counts one.
  const cutDown: CalendarStamp = { season: SEASON, phase: "PRESEASON", week: 4, day: 7 };
  const squadDeal = (p: PlayerState, t: Team["id"] = team.id) =>
    signPracticeSquad({ player: p.bio.id, team: t, season: SEASON, signedAt: cutDown, creditedSeasons: p.bio.creditedSeasons ?? 0 });
  /** Deals for team 0's own quarterbacks, so the book holds more than the squad's. */
  const rosterDeals = (team.depthChart.QB ?? []).map((id) =>
    minimumContract({ player: id, team: team.id, season: SEASON, signedAt: cutDown, creditedSeasons: byId.get(String(id))!.bio.creditedSeasons ?? 0, years: 1 }));

  it("ends the called-up man's practice-squad deal at the call-up (EXPIRED, no event), so his minimum is his one live deal and the cap counts one", () => {
    const book: PlayerContract[] = [...rosterDeals, ...squadPlayers.map((p) => squadDeal(p))];
    const r = emergencySignings({ ...withSquad(squadPlayers), contracts: book }, at, noQb, { seed });
    const pick = bestOf(["PS-QB-a", "PS-QB-b"]);
    expect(r.events).toEqual([{ type: "CONTRACT_SIGNED", payload: { player: playerId(pick), team: team.id, kind: "MINIMUM", years: 1 } }]);
    const after = r.people.contracts!;
    expect(after).toHaveLength(book.length + 1);
    const i = book.findIndex((c) => String(c.player) === pick);
    expect(after[i]).toEqual({ ...book[i], ended: { at, reason: "EXPIRED" } });
    after.forEach((c, j) => { if (j !== i && j < book.length) expect(c).toBe(book[j]); }); // every other deal as it was
    expect(book[i]!.ended).toBeUndefined(); // the book handed in is not changed

    const minimum = after.at(-1)!;
    expect(minimum).toMatchObject({ player: playerId(pick), team: team.id, kind: "MINIMUM", signedAt: at });
    expect(liveContract(after, playerId(pick))).toBe(minimum);
    expect(after.filter((c) => String(c.player) === pick && liveIn(c, SEASON))).toEqual([minimum]);

    // The call-up's season counts the minimum and not the squad deal: one deal for him, the same count as before.
    const cap = teamCapTotal(team.id, SEASON, after, []);
    const others = book.filter((_, j) => j !== i);
    expect(cap).toEqual(teamCapTotal(team.id, SEASON, [...others, minimum], []));
    expect(cap.counted).toBe(teamCapTotal(team.id, SEASON, book, []).counted);
    expect(cap.contracts).toBe(teamCapTotal(team.id, SEASON, book, []).contracts - capNumber(book[i]!.years[0]!) + capNumber(minimum.years[0]!));
    expect(cap.dead).toBe(0);

    // A later release ends the minimum, the deal he is on.
    const cut = [...after];
    const dead: DeadMoneyCharge[] = [];
    release(cut, dead, playerId(pick), team.id, { ...at, week: 10 });
    expect(cut.at(-1)!.ended?.reason).toBe("RELEASED");
    expect(cut[i]).toBe(after[i]);
  });

  it("ends only a live squad deal of his with that team, and does nothing else when there is none", () => {
    const pick = bestOf(["PS-QB-a", "PS-QB-b"]);
    const called = squadPlayers.find((p) => String(p.bio.id) === pick)!;
    const elsewhere = squadDeal(called, people.teams[1]!.id);
    const over: PlayerContract = { ...squadDeal(called), ended: { at: cutDown, reason: "RELEASED" } };
    const book: PlayerContract[] = [...rosterDeals, elsewhere, over];
    const r = emergencySignings({ ...withSquad(squadPlayers), contracts: book }, at, noQb, { seed });
    expect(r.people.contracts!.slice(0, book.length)).toEqual(book);
    expect(r.people.contracts!.slice(0, book.length).every((c, j) => c === book[j])).toBe(true);
    expect(r.people.contracts![book.length]).toMatchObject({ player: playerId(pick), kind: "MINIMUM" });
  });

  it("leaves every other deal alone on a street signing, the squad's included", () => {
    const book: PlayerContract[] = [...rosterDeals, squadDeal(psHurtQb)];
    const r = emergencySignings({ ...withSquad([psHurtQb]), contracts: book }, at, noQb, { seed });
    const street = emergencySignings(hurt, at, noQb, { seed });
    expect(r.events).toEqual(street.events);
    const signed = (r.events[0]!.payload as { player: PlayerState["bio"]["id"] }).player;
    expect(r.people.contracts).toHaveLength(book.length + 1);
    r.people.contracts!.slice(0, book.length).forEach((c, j) => expect(c).toBe(book[j]));
    expect(r.people.contracts!.every((c) => !c.ended)).toBe(true);
    expect(r.people.contracts!.at(-1)).toMatchObject({ player: signed, team: team.id, kind: "MINIMUM", signedAt: at });
  });

  /** The rule before practice squads (d047dcb), kept here word for word but for names: street signings only. */
  function streetOnly(p: LeaguePeople, day: CalendarStamp, short: typeof noQb, opts: { seed: string; playing?: ReadonlySet<string> }) {
    const offence = new Set(["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT"]);
    const seatFor = (pos: Position) => (offence.has(pos) ? "OC" : ["K", "P", "LS"].includes(pos) ? "STC" : "DC") as "OC" | "DC" | "STC";
    const fit = (q: PlayerState) => !q.condition.injury || q.condition.injury.playable;
    const ids = new Map(p.players.map((q) => [String(q.bio.id), q]));
    let freeAgents = [...p.freeAgents];
    const contracts = p.contracts ? [...p.contracts] : undefined;
    const events: unknown[] = [];
    const teams = p.teams.map((tm) => {
      if (opts.playing && !opts.playing.has(String(tm.id))) return tm;
      let t = tm;
      for (;;) {
        const available = new Set(t.roster.map(String).filter((id) => { const q = ids.get(id); return q !== undefined && fit(q); }));
        const position = short(t, available, ids);
        if (position === undefined) return t;
        const pool = freeAgents.map((id) => ids.get(String(id))).filter((q): q is PlayerState => q !== undefined && fit(q) && q.bio.draft !== "PROSPECT");
        const seat = seatFor(position);
        const lens = p.staff?.find((s) => seatOf(s) === seat && currentJob(s)?.team === t.id);
        const read = new Map(pool.map((q) => [String(q.bio.id),
          positionOverall(position, q.attributes.values) + readBlur({ seed: opts.seed, at: day, team: t.id, seat, coordinator: lens, player: q.bio.id })]));
        const best = (list: PlayerState[]) => [...list].sort((a, b) =>
          read.get(String(b.bio.id))! - read.get(String(a.bio.id))! || String(a.bio.id).localeCompare(String(b.bio.id)))[0];
        const pick = best(pool.filter((q) => q.bio.position === position)) ?? best(pool);
        if (!pick) return t;
        ids.set(String(pick.bio.id), { ...pick, teamId: t.id, bio: { ...pick.bio, position } });
        freeAgents = freeAgents.filter((id) => id !== pick.bio.id);
        t = { ...t, roster: [...t.roster, pick.bio.id], depthChart: { ...t.depthChart, [position]: [...(t.depthChart[position] ?? []), pick.bio.id] } };
        events.push({ type: "CONTRACT_SIGNED", payload: { player: pick.bio.id, team: t.id, kind: "MINIMUM", years: 1 } });
        contracts?.push(minimumContract({ player: pick.bio.id, team: t.id, season: day.season, signedAt: day, creditedSeasons: pick.bio.creditedSeasons ?? 0, years: 1 }));
      }
    });
    if (events.length === 0) return { people: p, events };
    return { people: { ...p, teams, players: p.players.map((q) => ids.get(String(q.bio.id))!), freeAgents, ...(contracts ? { contracts } : {}) }, events };
  }

  it("signs for a team without a practice squad exactly as the street-only rule did, byte for byte", () => {
    // Every team's kicker out, and team 0's quarterbacks too; the street then short of quarterbacks; some teams not playing.
    const kickers = new Set(people.teams.flatMap((t) => (t.depthChart.K ?? []).map(String)));
    const noKicker: LeaguePeople = { ...hurt, players: hurt.players.map((p) => (kickers.has(String(p.bio.id)) ? { ...p, condition: { ...p.condition, injury: squadInjury } } : p)) };
    const noQbOrK = (t: Team, available: ReadonlySet<string>, players: ReadonlyMap<string, PlayerState>): Position | undefined =>
      noQb(t, available, players) ?? ((t.depthChart.K ?? []).some((id) => available.has(String(id)) && players.get(String(id))!.bio.position === "K") ? undefined : "K");
    const fewQbs: LeaguePeople = { ...noKicker, freeAgents: noKicker.freeAgents.filter((id) => String(id) !== "FA-QB-1") };
    const cases: [LeaguePeople, typeof noQb, { seed: string; playing?: ReadonlySet<string> }][] = [
      [hurt, noQb, { seed }],
      [{ ...hurt, freeAgents: hurt.freeAgents.filter((id) => !String(id).startsWith("FA-QB")) }, noQb, { seed }],
      [noKicker, noQbOrK, { seed }],
      [{ ...fewQbs, contracts: [] }, noQbOrK, { seed: "other", playing: new Set(people.teams.filter((_, i) => i % 3 !== 1).map((t) => String(t.id))) }],
      [{ ...hurt, contracts: [...rosterDeals] }, noQb, { seed }],
      [people, () => undefined, { seed }],
    ];
    for (const [who, short, opts] of cases) {
      const now = emergencySignings(who, at, short, opts);
      expect(json(now)).toBe(json(streetOnly(who, at, short, opts)));
      if (who !== people) expect(now.events.length).toBeGreaterThan(0);
    }
  });
});
