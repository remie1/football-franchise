/**
 * The stand-in league's starting development in the season runner (ADR-087 §2.5, step 1): the
 * committed league file (named here) carries growth records and copied injuries, and each is read
 * only with the switch that uses it, so switched-off runs are exactly as before; development refuses
 * a file without records; switched-on runs play the file's season; and a copied w-week injury keeps
 * its player out of exactly the run's first w weeks. (The same seed's switched-on stand-in run gives
 * the same events: `realSeasonPlayers.test.ts`.)
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { compareStamps, teamId, type CalendarStamp, type PlayerState } from "@ff/contracts";
import { buildLeague, type SeasonRun } from "@ff/franchise";
import { fieldedStarters } from "../src/season/playerChecks.js";
import { rosterGroups } from "../src/season/playerChecksRun.js";
import { DEFAULT_SEASON, runRealSeason, seasonToPlay } from "../src/season/realSeason.js";
import { buildStandInLeague, forSwitches, readStandInFile, standInPracticeSquads, standInSeason } from "../src/season/standInLeague.js";

const FILE = join(__dirname, "..", "..", "attributes", "leagues", "standin-2026-10-23.json");
const text = readFileSync(FILE, "utf8");
const file = readStandInFile(text);
/** The same league as the file was before `standin-development`: no records on anyone (pinned below). */
const before = { ...file, league: { ...file.league, players: file.league.players.map((p) => forSwitches(p, undefined)) } };
const base = buildLeague("standin-development-test");
const json = (x: unknown) => JSON.stringify(x, (_k, v) => (v instanceof Set ? [...v] : v));
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const has = (ps: readonly PlayerState[], pick: (p: PlayerState) => unknown) => ps.filter((p) => pick(p) !== undefined).length;
/**
 * The players of the league file before `standin-development` wrote its records (commit e23bf69's
 * file, read by `readStandInFile`), by the sha256 of their JSON: only a new snapshot of the league
 * may change this. It makes "as before" independent of `forSwitches`, the function under test.
 */
const PLAYERS_BEFORE_RECORDS_SHA256 = "b080396cca79b579bc1a4e1d0547c046f89d14f4e9256c9095a9dbcd09844450";

describe("the stand-in league file's records, read by switch", () => {
  it("has them: a growth record for everyone and today's injuries", () => {
    expect(file.season).toBe(2026);
    expect(has(file.league.players, (p) => p.attributes.development)).toBe(file.league.players.length);
    expect(has(file.league.players, (p) => p.condition.injury)).toBe(327);
  });

  it("leaves out exactly the records: the players read with both switches off are the file's before them", () => {
    expect(sha256(json(before.league.players))).toBe(PLAYERS_BEFORE_RECORDS_SHA256);
    expect(sha256(json(buildStandInLeague(base, file).rated.league.players))).toBe(PLAYERS_BEFORE_RECORDS_SHA256);
  });

  it("refuses records of a version the loader does not know, which could reach a switched-off run", () => {
    const later = text.replace('"version":"standin-development/1"', '"version":"standin-development/2"');
    expect(later).not.toBe(text);
    expect(() => readStandInFile(later)).toThrow(/forSwitches does not know these records/);
  });

  it("leaves every record out with both switches off: the league is the one before the records, to the byte", () => {
    const now = buildStandInLeague(base, file);
    const then = buildStandInLeague(base, before);
    expect(json(now)).toBe(json(then));
    const ps = now.rated.league.players;
    for (const pick of [(p: PlayerState) => p.attributes.development, (p: PlayerState) => p.personality.patience,
      (p: PlayerState) => p.bio.combine, (p: PlayerState) => p.condition.injury]) expect(has(ps, pick)).toBe(0);
  });

  it("keeps only the copied injuries with --injuries alone, so its development is as before", () => {
    const ps = buildStandInLeague(base, file, { injuries: true }).rated.league.players;
    expect(has(ps, (p) => p.condition.injury)).toBe(327);
    expect(has(ps, (p) => p.attributes.development) + has(ps, (p) => p.personality.patience) + has(ps, (p) => p.bio.combine)).toBe(0);
    expect(json(buildStandInLeague(base, before, { injuries: true }).rated.league.players.map((p) => p.attributes)))
      .toBe(json(ps.map((p) => p.attributes)));
  });

  it("keeps growth records, patience and combine records with --development alone, and no injuries", () => {
    const ps = buildStandInLeague(base, file, { development: true }).rated.league.players;
    expect(has(ps, (p) => p.attributes.development)).toBe(ps.length);
    expect(has(ps, (p) => p.personality.patience)).toBe(ps.length);
    expect(has(ps, (p) => p.bio.combine)).toBeGreaterThan(1000);
    expect(has(ps, (p) => p.condition.injury)).toBe(0);
  });

  it("refuses development on a file without growth records, or with any part of one broken", () => {
    expect(() => buildStandInLeague(base, before, { development: true })).toThrow(/no growth records; run standin-development/);
    type Dev = NonNullable<PlayerState["attributes"]["development"]>;
    const breaks: [string, (d: Dev) => unknown][] = [
      ["growth NaN", (d) => ({ ...d, growth: Number.NaN })],
      ["no snaps", (d) => ({ ...d, snaps: undefined })],
      ["no body", (d) => ({ ...d, body: undefined })],
      ...(["forty", "cone", "vertical", "bench"] as const).map((drill): [string, (d: Dev) => unknown] =>
        [`${drill} NaN`, (d) => ({ ...d, body: { ...d.body, [drill]: Number.NaN } })]),
    ];
    for (const [what, brk] of breaks) {
      const broken = { ...file, league: { ...file.league, players: file.league.players.map((p, i) => (i === 7
        ? { ...p, attributes: { ...p.attributes, development: brk(p.attributes.development!) as Dev } }
        : p)) } };
      expect(() => buildStandInLeague(base, broken, { development: true }), what).toThrow(/no growth records; run standin-development/);
    }
    expect(() => buildStandInLeague(base, before, { injuries: true })).not.toThrow();
  });
});

describe("which season a stand-in run plays", () => {
  it("is the file's with a switch on, refusing another asked by name; with both off, as asked or the default", () => {
    expect(standInSeason(file, { injuries: true }, undefined, DEFAULT_SEASON)).toBe(2026);
    expect(standInSeason(file, { development: true }, 2026, DEFAULT_SEASON)).toBe(2026);
    expect(() => standInSeason(file, { development: true, injuries: true }, 2027, DEFAULT_SEASON)).toThrow(/plays 2026, not 2027/);
    expect(standInSeason(file, undefined, undefined, DEFAULT_SEASON)).toBe(DEFAULT_SEASON);
    expect(standInSeason(file, { development: false, injuries: false }, 2031, DEFAULT_SEASON)).toBe(2031);
  });

  it("is worked out by seasonToPlay, for the season command's coaches and stop day as for the run", () => {
    expect(seasonToPlay({ rosters: "standin", standIn: file, players: { development: false, injuries: true } })).toBe(2026);
    expect(seasonToPlay({ rosters: "standin", standIn: file, players: { development: true, injuries: false } })).toBe(2026);
    expect(seasonToPlay({ rosters: "standin", standIn: file })).toBe(DEFAULT_SEASON);
    expect(seasonToPlay({ rosters: "standin", standIn: file, season: 2030 })).toBe(2030);
    expect(() => seasonToPlay({ rosters: "standin", standIn: file, players: { injuries: true }, season: 2027 })).toThrow(/plays 2026, not 2027/);
    expect(seasonToPlay({ players: { injuries: true } })).toBe(DEFAULT_SEASON);
    expect(seasonToPlay({ rosters: "generated", season: 2029, players: { development: true } })).toBe(2029);
    expect(() => seasonToPlay({ rosters: "standin" })).toThrow(/needs the league file/);
    expect(() => runRealSeason({ seed: "standin-dev-season", rosters: "standin" })).toThrow(/needs the league file/);
  });

  it("is what runRealSeason plays", () => {
    const stop = (season: number): CalendarStamp => ({ season, phase: "TRAINING_CAMP", week: 1, day: 7 });
    const on = runRealSeason({ seed: "standin-dev-season", rosters: "standin", standIn: file, players: { injuries: true }, stopAfter: stop(2026) });
    expect(on.run.state.season).toBe(2026);
    expect(() => runRealSeason({ seed: "standin-dev-season", season: 2027, rosters: "standin", standIn: file, players: { injuries: true } })).toThrow(/plays 2026/);
  });
});

describe("a copied injury in the run", () => {
  // Camp and preseason: six weeks, no games, so it runs in seconds.
  const stopAfter: CalendarStamp = { season: 2026, phase: "PRESEASON", week: 3, day: 7 };
  let run: SeasonRun;
  beforeAll(() => {
    ({ run } = runRealSeason({ seed: "standin-dev-heal", rosters: "standin", standIn: file, players: { injuries: true }, stopAfter }));
  });
  // The run's weeks counted from its first: camp's length read off the run's own stream (franchise's
  // calendar table is not in calibration's permitted surface).
  const runWeek = (at: CalendarStamp) => {
    const camp = Math.max(...run.events.filter((e) => e.at.phase === "TRAINING_CAMP").map((e) => e.at.week));
    return at.phase === "TRAINING_CAMP" ? at.week : at.phase === "PRESEASON" ? camp + at.week : Number.NaN;
  };

  it("keeps a w-week injury's player out of exactly the run's first w weeks", () => {
    const copied = file.league.players.filter((p) => p.condition.injury !== undefined);
    const healedAt = new Map<string, CalendarStamp>();
    for (const e of run.events) {
      if (e.event.type === "INJURY_HEALED" && !healedAt.has(String(e.event.payload.player))) healedAt.set(String(e.event.payload.player), e.at);
    }
    const end = new Map(run.people!.players.map((p) => [String(p.bio.id), p]));
    let healedChecked = 0, stillOut = 0;
    for (const p of copied) {
      const id = String(p.bio.id);
      const w = p.condition.injury!.weeksRemaining;
      if (w <= 6) {
        const at = healedAt.get(id);
        expect(at, id).toBeDefined();
        expect(at!.day).toBe(7);
        expect(runWeek(at!), `${id}, ${w} weeks`).toBe(w);
        healedChecked++;
      } else {
        expect(healedAt.has(id), id).toBe(false);
        const now = end.get(id)!.condition.injury!;
        expect(compareStamps(now.since, p.condition.injury!.since)).toBe(0);
        expect(now.weeksRemaining, id).toBe(w - 6);
        stillOut++;
      }
    }
    expect(healedChecked).toBeGreaterThan(50); // 1-6 weeks: Out, Doubtful, R48 and most of R04/R05
    expect(stillOut).toBeGreaterThan(200); // injured reserve, 11-15 weeks
  });

  it("raises no INJURY_OCCURRED: the run starts with it, and he cannot be hurt again until it heals", () => {
    const healed = new Map<string, CalendarStamp>();
    for (const e of run.events) if (e.event.type === "INJURY_HEALED" && !healed.has(String(e.event.payload.player))) healed.set(String(e.event.payload.player), e.at);
    const copied = new Set(file.league.players.filter((p) => p.condition.injury !== undefined).map((p) => String(p.bio.id)));
    const early = run.events.filter((e) => {
      if (e.event.type !== "INJURY_OCCURRED" || !copied.has(String(e.event.payload.player))) return false;
      const back = healed.get(String(e.event.payload.player));
      return back === undefined || compareStamps(e.at, back) < 0;
    });
    expect(early).toEqual([]);
  });
});

describe("the player checks' starters on the stand-ins (player-checks --league)", () => {
  it("are who the engine fields from each real depth chart: 26 a team, inside linebackers among them", () => {
    const starters = fieldedStarters(file.league.teams);
    expect(starters.size).toBe(26 * file.league.teams.length);
    const position = new Map(file.league.players.map((p) => [String(p.bio.id), p.bio.position]));
    const ilb = [...starters].filter((id) => position.get(id) === "ILB").length;
    expect(ilb).toBeGreaterThan(20);
    const onRosters = new Set(file.league.teams.flatMap((t) => t.roster.map(String)));
    for (const id of starters) expect(onRosters.has(id), id).toBe(true);
  });
});

describe("the player checks' roster groups (player-checks --league)", () => {
  it("are the file's statuses: the 53, the practice squad and the reserve lists", () => {
    const groups = rosterGroups(file);
    const count = (g: string) => [...groups.values()].filter((x) => x === g).length;
    expect([count("53"), count("practice"), count("reserve")]).toEqual([1682, 538, 308]);
    const onRosters = new Set(file.league.teams.flatMap((t) => t.roster.map(String)));
    for (const [id, g] of groups) expect(onRosters.has(id), id).toBe(g === "53");
  });
});

describe("the stand-ins' practice squads (ADR-087 §11)", () => {
  const kept = (file.league.provenance as { practiceSquad: Record<string, string[]> }).practiceSquad;
  const status = (file.league.provenance as { status: Record<string, string> }).status;

  it("go on the teams, in the file's order, only with a switch on: switched off, no team has one", () => {
    for (const t of [...buildStandInLeague(base, file).league.teams, ...buildStandInLeague(base, file).rated.league.teams]) {
      expect("practiceSquad" in t, String(t.id)).toBe(false);
    }
    for (const switches of [{ injuries: true }, { development: true }, { development: true, injuries: true }]) {
      const { league, rated } = buildStandInLeague(base, file, switches);
      for (const teams of [league.teams, rated.league.teams]) {
        expect(teams.map((t) => (t.practiceSquad ?? []).map(String))).toEqual(teams.map((t) => kept[String(t.id)]));
      }
      expect(league.teams.reduce((n, t) => n + t.practiceSquad!.length, 0)).toBe(538);
    }
  });

  it("are the file's practice-squad players, each on his team and off its roster", () => {
    const squads = standInPracticeSquads(file);
    const team = new Map(file.league.players.map((p) => [String(p.bio.id), String(p.teamId)]));
    for (const t of file.league.teams) {
      const roster = new Set(t.roster.map(String));
      for (const id of squads.get(String(t.id))!) {
        expect(status[String(id)]).toBe("practice");
        expect(team.get(String(id))).toBe(String(t.id));
        expect(roster.has(String(id))).toBe(false);
      }
    }
  });

  it("come from the players' statuses, in the players' order, in a file that does not keep them by team", () => {
    const { practiceSquad: _kept, ...rest } = file.league.provenance as Record<string, unknown>;
    const unkept = { ...file, league: { ...file.league, provenance: rest } };
    const fromStatus = standInPracticeSquads(unkept);
    for (const t of file.league.teams) {
      const order = file.league.players.filter((p) => status[String(p.bio.id)] === "practice" && p.teamId === t.id).map((p) => String(p.bio.id));
      expect(fromStatus.get(String(t.id))!.map(String)).toEqual(order);
      expect([...order].sort()).toEqual([...kept[String(t.id)]!].sort());
    }
  });

  it("refuses a practice squad that lists a rostered player, another team's, or one not in the file", () => {
    const listing = (ids: string[]) => ({ ...file, league: { ...file.league, provenance: { ...(file.league.provenance as object), practiceSquad: { ...kept, T01: ids } } } });
    const t01 = file.league.teams.find((t) => String(t.id) === "T01")!;
    expect(() => standInPracticeSquads(listing([String(t01.roster[0])]))).toThrow(/T01 practice squad lists .* on its roster/);
    expect(() => standInPracticeSquads(listing([kept.T02![0]!]))).toThrow(/T01 practice squad lists .* on T02/);
    expect(() => standInPracticeSquads(listing(["r:nobody"]))).toThrow(/not in the file/);
  });

  it("refuses a player listed twice, or one whose status in the file is not practice (player-checks counts him by it)", () => {
    const prov = file.league.provenance as Record<string, unknown>;
    const first = kept.T01![0]!;
    const twice = { ...file, league: { ...file.league, provenance: { ...prov, practiceSquad: { ...kept, T01: [...kept.T01!, first] } } } };
    expect(() => standInPracticeSquads(twice)).toThrow(/T01 practice squad lists .* on a practice squad already/);
    const reserve = { ...file, league: { ...file.league, provenance: { ...prov, status: { ...status, [first]: "reserve" } } } };
    expect(() => standInPracticeSquads(reserve)).toThrow(/T01 practice squad lists .* of status "reserve", not "practice"/);
  });

  it("refuses, in a file that does not keep them by team, a practice-squad player on a team it does not have", () => {
    const { practiceSquad: _kept, ...rest } = file.league.provenance as Record<string, unknown>;
    const first = kept.T01![0]!;
    const players = file.league.players.map((p) => (String(p.bio.id) === first ? { ...p, teamId: teamId("T99") } : p));
    expect(() => standInPracticeSquads({ ...file, league: { ...file.league, players, provenance: rest } })).toThrow(/on a practice squad of T99, a team it does not have/);
    const { teamId: _t, ...free } = file.league.players.find((p) => String(p.bio.id) === first)!;
    const teamless = file.league.players.map((p) => (String(p.bio.id) === first ? free : p));
    expect(() => standInPracticeSquads({ ...file, league: { ...file.league, players: teamless, provenance: rest } })).toThrow(/on a practice squad of no team/);
  });

  it("are called up, by the team short of a player, before anyone off the street but a specialist the squad lacks", () => {
    const stopAfter: CalendarStamp = { season: 2026, phase: "REGULAR_SEASON", week: 1, day: 7 };
    const { league, run } = runRealSeason({ seed: "spread-17", rosters: "standin", standIn: file, players: { injuries: true }, stopAfter });
    const squadOf = new Map(league.teams.flatMap((t) => (t.practiceSquad ?? []).map((id) => [String(id), String(t.id)] as const)));
    const filePosition = new Map(file.league.players.map((p) => [String(p.bio.id), p.bio.position]));
    const endPosition = new Map(run.people!.players.map((p) => [String(p.bio.id), p.bio.position]));
    const signed = run.events.flatMap((e) => (e.event.type === "CONTRACT_SIGNED" ? [e.event.payload] : []));
    const calledUp = signed.filter((s) => squadOf.get(String(s.player)) === String(s.team));
    const street = signed.filter((s) => !squadOf.has(String(s.player)));
    expect(calledUp.length).toBeGreaterThan(0);
    expect(calledUp.length + street.length).toBe(signed.length);
    // Off the street only a kicker, punter or long snapper, listed there, for a team whose squad (in the file) has none.
    for (const s of street) {
      const position = endPosition.get(String(s.player))!;
      expect(["K", "P", "LS"], String(s.player)).toContain(position);
      expect(String(s.player).startsWith("p:FA"), String(s.player)).toBe(true);
      const squad = league.teams.find((t) => String(t.id) === String(s.team))!.practiceSquad!;
      expect(squad.filter((id) => filePosition.get(String(id)) === position), `${String(s.team)} ${position}`).toEqual([]);
    }
    const end = new Map(run.people!.teams.map((t) => [String(t.id), t]));
    for (const s of signed) {
      const t = end.get(String(s.team))!;
      expect(t.roster.map(String)).toContain(String(s.player));
      expect((t.practiceSquad ?? []).map(String)).not.toContain(String(s.player));
    }
    // The street pool (114 men, ADR-087 §11) gave only those specialists; the rest left it unsigned, retired.
    const retired = run.events.flatMap((e) => (e.event.type === "PLAYER_RETIRED" && String(e.event.payload.player).startsWith("p:FA") ? [e.event.payload.player] : []));
    expect(run.people!.freeAgents.length).toBe(114 - street.length - retired.length);
    for (const s of street) expect(run.people!.freeAgents).not.toContain(s.player);
    for (const id of run.people!.freeAgents) expect(String(id).startsWith("p:FA"), String(id)).toBe(true);
    // Each team's squad and roster together are what they were: players moved, none lost or counted twice.
    for (const t of league.teams) {
      const now = end.get(String(t.id))!;
      const was = [...t.roster, ...t.practiceSquad!, ...street.filter((s) => s.team === t.id).map((s) => s.player)].map(String).sort();
      expect([...now.roster, ...(now.practiceSquad ?? [])].map(String).sort()).toEqual(was);
    }
  });
});
