/**
 * ADR-087 §2.5, step 1: the stand-ins' starting development (`importer/real/development.ts`), on the
 * committed league file (named here, not "the newest") and on hand-written players with made-up ids.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  agilityFromCone, createRng, jumpingFromVertical, playerId, speedFromForty, strengthFrom, teamId,
  type PlayerState, type Position, type Team,
} from "@ff/contracts";
import { drawGrowth, drawPatience, GROWTH } from "../src/fictional/development.js";
import {
  COPIED_REPORT, COPIED_RESERVE, DEVELOPMENT_STREAM, INJURY_WEEKS, REAL_TEAM_SLOTS, SEED_LABEL, STARTING_DEVELOPMENT_VERSION,
  bandOf, buildRealLeague, copiedSince, serializeLeagueFile, standInDevelopment, startingConstants, stripStartingDevelopment,
  withStartingDevelopment, type CareerHistory, type LeagueFileLike, type RosterRow, type RosterStatus, type StartingDevelopment,
} from "../src/importer/real/index.js";

const FILE = join(__dirname, "..", "leagues", "standin-2026-10-23.json");
const text = readFileSync(FILE, "utf8");
const file = JSON.parse(text) as LeagueFileLike & { startingDevelopment: StartingDevelopment };
const players = file.league.players;
const prov = file.league.provenance as LeagueFileLike["league"]["provenance"] & {
  ratings: Record<string, { imputed: string[] }>;
};
const stream = (id: string) => createRng(SEED_LABEL, DEVELOPMENT_STREAM).fork(id);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const json = (x: unknown) => JSON.stringify(x, (_k, v) => (v instanceof Set ? [...v] : v));
/**
 * The committed league file before `standin-development` wrote its records (ADR-088's, commit
 * e23bf69), by its sha256: only a new snapshot of the league may change this.
 */
const FILE_BEFORE_RECORDS_SHA256 = "3a9ae15263af9cb61d8b2f5e327308f2a846e6037d1a46517000e3181fc5d3d3";

/** The file as it was before the step: every record and the extras key taken off. */
function stripped(): LeagueFileLike {
  const { startingDevelopment: _s, ...rest } = JSON.parse(text) as LeagueFileLike;
  return { ...rest, league: { ...rest.league, players: rest.league.players.map(stripStartingDevelopment) } } as LeagueFileLike;
}

describe("the committed league file's growth records", () => {
  it("are what the step makes from the file: re-run standin-development if this fails", () => {
    expect(serializeLeagueFile(withStartingDevelopment(stripped())) === text, "the league file's records are stale: re-run standin-development").toBe(true);
  });

  it("are all the step added: taking them off gives back the file before them, to the byte", () => {
    expect(sha256(serializeLeagueFile(stripped()))).toBe(FILE_BEFORE_RECORDS_SHA256);
  });

  it("were made with today's constants (re-run standin-development if this fails)", () => {
    const sd = file.startingDevelopment;
    const msg = "the league file's growth records were made with other constants: re-run standin-development";
    expect(sd.version, msg).toBe(STARTING_DEVELOPMENT_VERSION);
    expect([sd.seedLabel, sd.stream], msg).toEqual([SEED_LABEL, DEVELOPMENT_STREAM]);
    expect(JSON.parse(JSON.stringify(sd.constants)), msg).toEqual(JSON.parse(JSON.stringify(startingConstants())));
  });

  it("give every player a body that reproduces all four of his body ratings, from the drills he was rated from", () => {
    let mismatches = 0;
    for (const p of players) {
      const id = String(p.bio.id);
      const body = p.attributes.development!.body;
      const v = p.attributes.values;
      if (speedFromForty(body.forty) !== v["speed"] || agilityFromCone(body.cone) !== v["agility"]
        || jumpingFromVertical(body.vertical) !== v["jumping"] || strengthFrom(body.bench, p.bio.weightLb) !== v["strength"]) mismatches++;
      const ran = prov.measurements[id] ?? {};
      for (const drill of ["forty", "bench", "vertical", "cone"] as const) {
        if (ran[drill] !== undefined) expect(body[drill], `${id} ${drill}`).toBe(ran[drill]);
        else expect(prov.ratings[id]!.imputed, `${id} ${drill}`).toContain(drill);
        expect(Number.isFinite(body[drill])).toBe(true);
      }
    }
    expect(players.length).toBe(2528);
    expect(mismatches).toBe(0);
  });

  it("draw growth and patience on each player's own streams, and copy his career snaps", () => {
    const ln = players.map((p) => Math.log(p.attributes.development!.growth));
    const mean = ln.reduce((a, b) => a + b, 0) / ln.length;
    const sd = Math.sqrt(ln.reduce((a, b) => a + (b - mean) ** 2, 0) / ln.length);
    expect(Math.abs(mean - Math.log(GROWTH.median))).toBeLessThan(0.02);
    expect(Math.abs(sd - GROWTH.sdLog)).toBeLessThan(0.02);
    for (const p of players) {
      const id = String(p.bio.id);
      const dev = p.attributes.development!;
      expect(dev.growth).toBe(drawGrowth(stream(id).fork("growth")));
      expect(p.personality.patience).toBe(drawPatience(stream(id).fork("patience")));
      expect(p.personality.patience! >= 0 && p.personality.patience! <= 2).toBe(true);
      expect(Math.round(p.personality.patience! * 100) / 100).toBe(p.personality.patience);
      const h = prov.history[id]!;
      expect(dev.snaps).toBe(h.snaps.offense + h.snaps.defense + h.snaps.specialTeams);
      expect(dev.carry).toEqual({});
      expect(file.startingDevelopment.players[id]!.growth).toBe("draw");
    }
  });

  it("put on the bio only the combine drills he actually ran", () => {
    let withCombine = 0;
    for (const p of players) {
      const ran = prov.measurements[String(p.bio.id)] ?? {};
      const drills = Object.fromEntries((["forty", "cone", "vertical", "bench"] as const).filter((d) => ran[d] !== undefined).map((d) => [d, ran[d]]));
      if (Object.keys(drills).length === 0) expect(p.bio.combine).toBeUndefined();
      else { withCombine++; expect(p.bio.combine).toEqual(drills); }
    }
    expect(withCombine).toBe(1340);
  });

  it("copy today's injuries: the four reserve lists and active players Out or Doubtful on the latest report", () => {
    const counts: Record<string, number> = {};
    const since = copiedSince(file.season);
    for (const p of players) {
      const id = String(p.bio.id);
      const injury = p.condition.injury;
      const flag = file.startingDevelopment.players[id]!.injury;
      expect(injury === undefined).toBe(flag === undefined);
      if (injury === undefined || flag === undefined) continue;
      counts[flag.source] = (counts[flag.source] ?? 0) + 1;
      const { min, max } = INJURY_WEEKS[flag.source];
      expect(injury.weeksRemaining >= min && injury.weeksRemaining <= max, id).toBe(true);
      expect(injury.weeksRemaining).toBe(stream(id).fork("injury").int(min, max));
      expect(injury.band).toBe(bandOf(injury.weeksRemaining));
      expect(injury.playable).toBe(false);
      expect(injury.setting).toBe(flag.source === "R05" ? "AWAY" : "GAME");
      expect(injury.since).toEqual(since);
      expect(injury.kind).toMatch(/^real:[a-z0-9-]+$/);
      const status = prov.status[id];
      if ((COPIED_RESERVE as readonly string[]).includes(flag.source)) {
        expect(status).toBe("reserve");
        expect(prov.history[id]!.reserve!.code).toBe(flag.source);
      } else {
        expect(status).toBe("active");
        expect(prov.history[id]!.injury!.status).toBe(flag.source);
      }
    }
    expect(counts).toEqual({ R01: 227, R48: 52, R04: 21, R05: 5, Out: 20, Doubtful: 2 });
    // Questionable players, the practice squad and the other lists start healthy.
    for (const p of players) {
      const h = prov.history[String(p.bio.id)]!;
      if (h.injury?.status === "Questionable" && prov.status[String(p.bio.id)] === "active") expect(p.condition.injury).toBeUndefined();
      if (prov.status[String(p.bio.id)] === "practice") expect(p.condition.injury).toBeUndefined();
      if (h.reserve !== undefined && !(COPIED_RESERVE as readonly string[]).includes(h.reserve.code)) expect(p.condition.injury).toBeUndefined();
    }
    expect(file.startingDevelopment.teamsWithoutGameStatus.length).toBe(25);
    expect(file.startingDevelopment.snapsThrough).toEqual({ season: 2026, mostGames: 7 });
  });

  it("holds no real-player ids: only stand-in ids and made-up text", () => {
    const added = JSON.stringify({
      extras: file.startingDevelopment,
      records: players.map((p) => [p.attributes.development, p.bio.combine, p.personality.patience, p.condition.injury]),
    });
    expect(added).not.toMatch(/\d{2}-\d{7}/); // gsis-like
    expect(added).not.toMatch(/[A-Z][A-Za-z.']{3}[A-Z][A-Za-z.']\d{2}/); // pfr-like (McCoLe00 too)
    for (const id of Object.keys(file.startingDevelopment.players)) expect(id).toMatch(/^r:\d+$/);
  });
});

describe("the step itself", () => {
  it("gives the same bytes for the same input, and changes nothing run on its own output", () => {
    const once = serializeLeagueFile(withStartingDevelopment(stripped()));
    expect(serializeLeagueFile(withStartingDevelopment(stripped()))).toBe(once);
    expect(serializeLeagueFile(withStartingDevelopment(JSON.parse(once) as LeagueFileLike))).toBe(once);
  });

  it("draws each player's growth, patience and injury length from his own stream: other players never move them", () => {
    const base = stripped();
    const input = (ps: readonly PlayerState[]) => ({
      season: base.season, snapshotDate: base.snapshotDate, players: ps,
      status: base.league.provenance.status, measurements: base.league.provenance.measurements, history: base.league.provenance.history,
    });
    const all = standInDevelopment(input(base.league.players));
    // Nothing but the four records changes on anyone: durability, ratings and the rest as they were.
    expect(all.players.every((p, i) => json(stripStartingDevelopment(p)) === json(base.league.players[i]))).toBe(true);
    const half = standInDevelopment(input(base.league.players.filter((_, i) => i % 2 === 1)));
    const byId = new Map(all.players.map((p) => [String(p.bio.id), p]));
    for (const p of half.players) {
      const q = byId.get(String(p.bio.id))!;
      expect(p.attributes.development!.growth).toBe(q.attributes.development!.growth);
      expect(p.personality.patience).toBe(q.personality.patience);
      const [a, b] = [half.startingDevelopment.players[String(p.bio.id)]!.injury, all.startingDevelopment.players[String(p.bio.id)]!.injury];
      if (a !== undefined && b !== undefined && a.source === b.source) expect(p.condition.injury!.weeksRemaining).toBe(q.condition.injury!.weeksRemaining);
    }
  });

  // Hand-written players, made-up ids: two teams' latest reports.
  const T1 = teamId("T01"), T2 = teamId("T02");
  const made = (id: string, team: typeof T1, position: Position = "WR"): PlayerState => ({
    bio: { id: playerId(id), displayName: `Made Up ${id}`, position, age: 26, heightIn: 72, weightLb: 200, creditedSeasons: 3, draft: "UDFA" },
    attributes: { kind: "true", values: {}, traits: new Set<string>() },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    teamId: team,
  });
  const hist = (over: Partial<CareerHistory> = {}): CareerHistory => ({
    snaps: { offense: 100, defense: 0, specialTeams: 20 }, gamesPlayed: [{ season: 2026, games: 5 }], ...over,
  });
  const cases: [PlayerState, RosterStatus, CareerHistory][] = [
    [made("x:1", T1), "active", hist({ injury: { week: 7, part: "Left Knee", status: "Out" } })],
    [made("x:2", T1), "active", hist({ injury: { week: 7, part: "Ankle", status: "Questionable" } })],
    [made("x:3", T1), "active", hist({ injury: { week: 6, part: "Ankle", status: "Out" } })], // an older report: healed
    [made("x:4", T1), "practice", hist({ injury: { week: 7, part: "Ankle", status: "Doubtful" } })],
    [made("x:5", T1), "reserve", hist({ reserve: { type: "INJURED_RESERVE", code: "R01" } })],
    [made("x:6", T1), "reserve", hist({ reserve: { type: "OTHER", code: "R40" } })],
    [made("x:7", T1), "reserve", hist({ reserve: { type: "NON_FOOTBALL_INJURY", code: "R05" }, injury: { week: 2, part: "Illness", status: null } })],
    [made("x:8", T2), "active", hist({ injury: { week: 7, part: "Hamstring", status: null } })],
    [made("x:9", T2, "K"), "active", hist()],
  ];
  const small = standInDevelopment({
    season: 2026, snapshotDate: "2026-10-23", players: cases.map((c) => c[0]),
    status: Object.fromEntries(cases.map(([p, s]) => [String(p.bio.id), s])),
    measurements: { "x:1": { heightIn: 72, weightLb: 200, forty: 4.5 }, "x:2": { heightIn: 72, weightLb: 200, forty: 4.4, cone: 6.9 } },
    history: Object.fromEntries(cases.map(([p, , h]) => [String(p.bio.id), h])),
  });
  const of = (id: string) => small.players.find((p) => String(p.bio.id) === id)!;

  it("copies Out on the latest report and the injury lists, and leaves out Questionable, older reports, the practice squad and other lists", () => {
    expect(of("x:1").condition.injury).toMatchObject({ kind: "real:left-knee", playable: false, setting: "GAME" });
    expect(of("x:1").condition.injury!.weeksRemaining).toBeGreaterThanOrEqual(1);
    expect(of("x:1").condition.injury!.weeksRemaining).toBeLessThanOrEqual(3);
    for (const id of ["x:2", "x:3", "x:4", "x:6", "x:8", "x:9"]) expect(of(id).condition.injury, id).toBeUndefined();
    expect(of("x:5").condition.injury).toMatchObject({ kind: "real:reserve-injured-reserve", band: "MAJOR", setting: "GAME" });
    expect(of("x:7").condition.injury).toMatchObject({ kind: "real:illness", setting: "AWAY" });
    expect(small.startingDevelopment.players["x:7"]!.injury).toEqual({ source: "R05", reportWeek: 2 });
    expect(small.startingDevelopment.players["x:5"]!.injury).toEqual({ source: "R01" });
  });

  it("draws on the stream named in the file, with no season in its seed: another season gives the same draws", () => {
    expect(SEED_LABEL).toBe("standin");
    expect(DEVELOPMENT_STREAM).toBe("attributes:real:development");
    const later = standInDevelopment({
      season: 2027, snapshotDate: "2027-10-22", players: cases.map((c) => c[0]),
      status: Object.fromEntries(cases.map(([p, s]) => [String(p.bio.id), s])), measurements: {},
      history: Object.fromEntries(cases.map(([p, , h]) => [String(p.bio.id), h])),
    });
    for (const p of later.players) {
      expect(p.attributes.development!.growth).toBe(of(String(p.bio.id)).attributes.development!.growth);
      expect(p.personality.patience).toBe(of(String(p.bio.id)).personality.patience);
    }
  });

  it("records the teams whose latest report has no game statuses", () => {
    expect(small.startingDevelopment.teamsWithoutGameStatus).toEqual([{ team: "T02", reportWeek: 7 }]);
  });

  it("fills a body for everyone (the position average, else the fallback) and a combine record only for drills he ran", () => {
    expect(of("x:1").bio.combine).toEqual({ forty: 4.5 });
    expect(of("x:2").bio.combine).toEqual({ forty: 4.4, cone: 6.9 });
    expect(of("x:3").bio.combine).toBeUndefined();
    expect(of("x:3").attributes.development!.body).toEqual({ forty: 4.45, cone: 6.9, vertical: 31, bench: 18 });
    expect(of("x:9").attributes.development!.body).toEqual({ forty: 4.85, cone: 7.3, vertical: 31, bench: 18 });
    expect(of("x:1").attributes.development!.snaps).toBe(120);
  });

  it("bands lengths as contracts P3 does, and stamps copied injuries before the run's first week", () => {
    expect([0, 1, 3, 4, 8, 9, 15].map(bandOf)).toEqual(["DAY_TO_DAY", "SHORT", "SHORT", "LONG", "LONG", "MAJOR", "MAJOR"]);
    expect(copiedSince(2026)).toEqual({ season: 2025, phase: "OFF_SUMMER", week: 1, day: 1 });
    expect([...COPIED_RESERVE, ...COPIED_REPORT].every((s) => INJURY_WEEKS[s].min >= 1)).toBe(true);
  });
});

describe("import-real's build (buildRealLeague), on hand-written rows with made-up ids", () => {
  const teams: Team[] = REAL_TEAM_SLOTS.map((_, i) => ({
    id: teamId(`T${String(i + 1).padStart(2, "0")}`), displayName: `Team ${i + 1}`, city: `City ${i + 1}`,
    roster: [], staff: [], depthChart: {}, capState: { capLimit: 0, committed: 0, deadMoney: 0 }, staffBudget: { limit: 0, committed: 0 },
  }));
  const row = (over: Partial<RosterRow> & { gsis_id: string }): RosterRow => ({
    pfr_id: null, team: "BAL", week: 7, status: "ACT", status_description_abbr: "A01", position: "QB", depth_chart_position: "QB",
    birth_date: "2000-06-15", height: 75, weight: 220, years_exp: 3, full_name: `Made Up ${over.gsis_id}`, ...over,
  });
  const built = buildRealLeague({
    seed: "made-up", season: 2026, date: "2026-10-23", teams, sealed: {},
    rosters: [row({ gsis_id: "g1", pfr_id: "p1" }), row({ gsis_id: "g2" }), row({ gsis_id: "g3", status: "RES", status_description_abbr: "R04" })],
    players: [], depth: [], contracts: [],
    combine: [{ pfr_id: "p1", ht: "6-3", wt: 222, forty: 4.6, bench: null, vertical: 33, cone: 7.0 }],
    snaps: [{ pfr_player_id: "p1", season: 2026, game_type: "REG", offense_pct: 1, defense_pct: 0, st_pct: 0, offense_snaps: 60, defense_snaps: 0, st_snaps: 2 }],
    injuries: [{ gsis_id: "g2", week: 7, report_primary_injury: "Hamstring", practice_primary_injury: null, report_status: "Out" }],
    tracking: { ngsPass: [], ngsRec: [], ngsRush: [], pfrPass: [], pfrRec: [], pfrRush: [], pfrDef: [] },
  });
  const by = (gsis: string) => built.league.players.find((p) => String(p.bio.id) === built.sealed[gsis]!.id)!;

  it("gives every stand-in his records, so a refresh from raw data writes them too", () => {
    expect(built.league.players.every((p) => p.attributes.development !== undefined && p.personality.patience !== undefined)).toBe(true);
    expect(by("g1").attributes.development!.snaps).toBe(62);
    expect(by("g1").bio.combine).toEqual({ forty: 4.6, cone: 7.0, vertical: 33 });
    expect(by("g2").condition.injury).toMatchObject({ kind: "real:hamstring", playable: false });
    expect(by("g3").condition.injury).toMatchObject({ kind: "real:reserve-pup" });
    expect(built.startingDevelopment.version).toBe(STARTING_DEVELOPMENT_VERSION);
    expect(Object.keys(built.startingDevelopment.players).sort()).toEqual(built.league.players.map((p) => String(p.bio.id)).sort());
  });
});
