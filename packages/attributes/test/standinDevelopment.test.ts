/**
 * ADR-087 §2.5, step 1: the stand-ins' starting development (`importer/real/development.ts`), on the
 * committed league file (named here, not "the newest") and on hand-written players with made-up ids.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ABILITY_GROUPS, agilityFromCone, createRng, jumpingFromVertical, playerId, speedFromForty, strengthFrom, teamId,
  type PlayerState, type Position, type Team,
} from "@ff/contracts";
import { drawFadeShift, drawGrowth, drawPatience, FADE_SHIFT, GROWTH } from "../src/fictional/development.js";
import {
  COPIED_REPORT, COPIED_RESERVE, DEVELOPMENT_STREAM, INJURY_WEEKS, NO_PAST_INJURIES_VERSION, REAL_INJURY_KINDS, REAL_TEAM_SLOTS, SEED_LABEL,
  STANDIN_INJURIES_VERSION, STARTING_DEVELOPMENT_VERSION, bandOf, buildRealLeague, copiedSince, pastInjuriesMethod, pastInjuriesProblem,
  serializeLeagueFile, standInDevelopment, startingConstants, startingDevelopmentVersion, stripStartingDevelopment, withPastInjuries,
  withoutPastInjuries, withStartingDevelopment, type CareerHistory, type LeagueFileLike, type PastInjuriesBlock, type RosterRow, type RosterStatus,
  type StartingDevelopment,
} from "../src/importer/real/index.js";
import { leakCount, LEAK_PATTERNS, madeUpBlock } from "./helpers.js";

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
 * The committed league file before `standin-development` wrote its records and `standin-officials`
 * its officials block (ADR-088's, commit e23bf69, with its estimated deals rebuilt by
 * `standin-contracts` on 2026-11-07: 301 deals, nothing else), by its sha256: only a new snapshot
 * of the league, or a refresh of its contracts, may change this.
 */
const FILE_BEFORE_RECORDS_SHA256 = "ffdd05762bae1b197794cb0099c8c0dd8f37a1767bd93034549bf001f7a4ea96";
/**
 * The committed league file at `standin-development/1`, before ADR-087 AB2 added the fade shifts, by
 * its sha256: AB2's data diff is the shifts alone. Rebased onto 2241964 (main at 24a79aa), the /1
 * file is main's: a7a6a66's growth records unchanged, the 2026 rookies' real deal lengths (#86) and
 * the officiating block (#78). So the pin moved from a7a6a66's bb55709a… to main's c58c68ba…, and
 * the file was regenerated from main's with `standin-development`, not merged.
 */
const FILE_AT_V1_SHA256 = "c58c68ba3b4859a4060cfd5819343189758b87928bc4c436d2a768ef27a910f3";
/**
 * The committed league file at `standin-development/2`, before ADR-087 AB7's custody run puts in its
 * `pastInjuries` block (MEASURED at aging-m7, 9b13f88): taking AB7's additions off (`withoutPastInjuries`)
 * gives these bytes back, before and after that run.
 */
const FILE_AT_V2_SHA256 = "e9852a70facb1c20cfdb951fc09f9706cd515ebde2eda1dde588aef5387c0608";
/** The file without AB7's additions (`withoutPastInjuries`): the `/2` file, before and after the custody run. */
const atV2 = (): LeagueFileLike => withoutPastInjuries(JSON.parse(text) as LeagueFileLike);

/** The file as it was before the step: AB7's block, every record and the extras key taken off. */
function stripped(): LeagueFileLike {
  const { startingDevelopment: _s, pastInjuries: _p, ...rest } = atV2();
  return { ...rest, league: { ...rest.league, players: rest.league.players.map(stripStartingDevelopment) } } as LeagueFileLike;
}

describe("the committed league file's growth records", () => {
  it("are what the step makes from the file: re-run standin-development if this fails", () => {
    const f = JSON.parse(text) as LeagueFileLike;
    const remade = withStartingDevelopment(f.pastInjuries === undefined ? stripped() : withPastInjuries(stripped(), f.pastInjuries));
    expect(serializeLeagueFile(remade) === text, "the league file's records are stale: re-run standin-development").toBe(true);
  });

  it("are the /2 file's with AB7's additions alone: taking them off gives back the /2 file, to the byte (ADR-087 AB7)", () => {
    expect(sha256(serializeLeagueFile(atV2()))).toBe(FILE_AT_V2_SHA256);
  });

  it("are all the step added: taking them off gives back the file before them, to the byte", () => {
    const { officiating: _o, ...before } = stripped();
    expect(sha256(serializeLeagueFile(before))).toBe(FILE_BEFORE_RECORDS_SHA256);
  });

  it("were made with today's constants (re-run standin-development if this fails)", () => {
    const sd = file.startingDevelopment;
    const msg = "the league file's growth records were made with other constants: re-run standin-development";
    expect(sd.version, msg).toBe(startingDevelopmentVersion(file.pastInjuries !== undefined));
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

  it("draw every player's 12 fade shifts on his own \"aging\" fork, at standin-development/2 or /3 (ADR-087 §12.2.3, AB2; AB7)", () => {
    expect(STARTING_DEVELOPMENT_VERSION).toBe("standin-development/3");
    expect(NO_PAST_INJURIES_VERSION).toBe("standin-development/2");
    expect(file.startingDevelopment.version).toBe(file.pastInjuries === undefined ? "standin-development/2" : "standin-development/3");
    for (const p of players) {
      const shift = p.attributes.development!.fadeShift!;
      expect(Object.keys(shift)).toEqual([...ABILITY_GROUPS]);
      expect(shift).toEqual(drawFadeShift(stream(String(p.bio.id)).fork("aging")));
      for (const g of ABILITY_GROUPS) expect(Math.abs(shift[g]!)).toBeLessThanOrEqual(FADE_SHIFT.zClamp * FADE_SHIFT.sd[g]);
    }
    // The file's basis line names the draw (the fork layout itself is checked above: each man's shifts are
    // drawFadeShift on his own stream's "aging" fork; growth and patience on theirs; injuries in the tests below).
    expect(file.startingDevelopment.basis.fadeShift).toMatch(/drawFadeShift/);
  });

  it("are the /1 file's records with the fade shifts added and nothing else: taking them off gives back the /1 file, to the byte (ADR-087 AB2)", () => {
    // AB2's data diff, pinned: the version set back to /1, `basis.fadeShift`, `constants.fadeShift` and every
    // man's `development.fadeShift` taken off. A regeneration that moved any growth, patience, snaps, body or
    // injury record (or anything else in the file) fails here.
    const f = atV2() as LeagueFileLike & { startingDevelopment: StartingDevelopment };
    const { fadeShift: _b, ...basis } = f.startingDevelopment.basis;
    const { fadeShift: _c, ...constants } = f.startingDevelopment.constants;
    const one = {
      ...f,
      startingDevelopment: { ...f.startingDevelopment, version: "standin-development/1", basis, constants },
      league: {
        ...f.league,
        players: f.league.players.map((p) => {
          const { fadeShift: _f, ...development } = p.attributes.development!;
          return { ...p, attributes: { ...p.attributes, development } };
        }),
      },
    };
    expect(sha256(serializeLeagueFile(one))).toBe(FILE_AT_V1_SHA256);
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
    // Counted, never matched: a failing check prints a number, not the text it found (critic 1).
    const added = JSON.stringify({
      extras: file.startingDevelopment,
      block: file.pastInjuries ?? null,
      records: players.map((p) => [p.attributes.development, p.bio.combine, p.personality.patience, p.condition.injury, p.condition.injuryHistory]),
    });
    for (const [name, re] of Object.entries(LEAK_PATTERNS)) expect(leakCount(added, re), `${name} in the added records`).toBe(0);
    const ids = [...Object.keys(file.startingDevelopment.players), ...Object.keys(file.pastInjuries?.players ?? {})];
    expect(ids.filter((id) => !/^r:\d+$/.test(id)).length, "ids that are not stand-in ids").toBe(0);
  });

  it("copy each man's past injuries from the file's pastInjuries block when it has one (ADR-087 AB7, P8)", () => {
    const block = file.pastInjuries;
    if (block === undefined) {
      // At /2: no man has a history, and nothing names one.
      expect(players.filter((p) => p.condition.injuryHistory !== undefined).length).toBe(0);
      expect(file.startingDevelopment.basis.injuryHistory).toBeUndefined();
      return;
    }
    expect(block.version).toBe(STANDIN_INJURIES_VERSION);
    expect(block.method).toEqual(JSON.parse(JSON.stringify(pastInjuriesMethod(file.season))));
    expect(pastInjuriesProblem(block, {
      season: file.season, snapshotDate: file.snapshotDate, ids: new Set(players.map((p) => String(p.bio.id))), copiedSince: copiedSince(file.season),
    })).toBeNull();
    for (const p of players) expect(p.condition.injuryHistory).toEqual(block.players[String(p.bio.id)]);
    expect(file.startingDevelopment.basis.injuryHistory).toMatch(/pastInjuries block/);
  });
});

describe("the step itself", () => {
  it("gives the same bytes for the same input, and changes nothing run on its own output", () => {
    const once = serializeLeagueFile(withStartingDevelopment(stripped()));
    expect(serializeLeagueFile(withStartingDevelopment(stripped()))).toBe(once);
    expect(serializeLeagueFile(withStartingDevelopment(JSON.parse(once) as LeagueFileLike))).toBe(once);
    // At /2 (AB2), or /3 with its block (AB7), too: the committed file, run again, is the same bytes.
    expect(serializeLeagueFile(withStartingDevelopment(JSON.parse(text) as LeagueFileLike))).toBe(text);
  });

  it("takes the fade shifts off with the rest of the record (stripStartingDevelopment)", () => {
    for (const p of players.slice(0, 50)) {
      expect(p.attributes.development!.fadeShift).toBeDefined();
      const bare = stripStartingDevelopment(p as PlayerState);
      expect(bare.attributes.development).toBeUndefined();
      expect(json(bare)).not.toMatch(/fadeShift/);
    }
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
    // The same players backwards: drawn per player, so the order they come in moves nothing either.
    const backwards = new Map(standInDevelopment(input([...base.league.players].reverse())).players.map((p) => [String(p.bio.id), p]));
    const draws = (p: PlayerState) => json([p.attributes.development!.growth, p.attributes.development!.fadeShift, p.personality.patience, p.condition.injury]);
    for (const p of all.players) expect(draws(backwards.get(String(p.bio.id))!)).toBe(draws(p));
    for (const p of half.players) {
      const q = byId.get(String(p.bio.id))!;
      expect(p.attributes.development!.growth).toBe(q.attributes.development!.growth);
      expect(p.attributes.development!.fadeShift).toEqual(q.attributes.development!.fadeShift);
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
      expect(p.attributes.development!.fadeShift).toEqual(of(String(p.bio.id)).attributes.development!.fadeShift);
    }
  });

  it("draws the fade shifts by id alone: the same man listed at another position gets the same shifts", () => {
    const one = (position: Position) => standInDevelopment({
      season: 2026, snapshotDate: "2026-10-23", players: [made("x:1", T1, position)],
      status: { "x:1": "active" }, measurements: {}, history: { "x:1": hist() },
    }).players[0]!;
    const [wr, k] = [one("WR"), one("K")];
    expect(wr.attributes.development!.fadeShift).toEqual(drawFadeShift(stream("x:1").fork("aging")));
    expect(k.attributes.development!.fadeShift).toEqual(wr.attributes.development!.fadeShift);
    expect(of("x:9").attributes.development!.fadeShift).toEqual(drawFadeShift(stream("x:9").fork("aging")));
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
    // No pastInjuries block in buildRealLeague's output: `/2`'s records, at `/2` (import-real adds the block after, `importRealWrites`).
    expect(built.startingDevelopment.version).toBe(NO_PAST_INJURIES_VERSION);
    expect(Object.keys(built.startingDevelopment.players).sort()).toEqual(built.league.players.map((p) => String(p.bio.id)).sort());
  });
});

describe("standin-development/3 (ADR-087 AB7): P8 copied from the pastInjuries block, on the committed file with a made-up block", () => {
  const base = atV2();
  const ids = base.league.players.map((p) => String(p.bio.id));
  const block: PastInjuriesBlock = madeUpBlock(ids, base.season, base.snapshotDate, 30);
  const three = withStartingDevelopment(withPastInjuries(base, block));

  it("writes /2 with no block (the /2 file's bytes) and /3 with one; taking AB7's additions off gives the /2 bytes back (test 19)", () => {
    expect(serializeLeagueFile(withStartingDevelopment(base))).toBe(serializeLeagueFile(base));
    expect(sha256(serializeLeagueFile(withStartingDevelopment(base)))).toBe(FILE_AT_V2_SHA256);
    expect(three.startingDevelopment!.version).toBe(STARTING_DEVELOPMENT_VERSION);
    expect(three.startingDevelopment!.basis.injuryHistory).toMatch(/standin-injuries\/1/);
    expect(sha256(serializeLeagueFile(withoutPastInjuries(three)))).toBe(FILE_AT_V2_SHA256);
    expect(withoutPastInjuries(base)).toBe(base);
  });

  it("copies each man's records with exactly P8's four keys, after `injury`, and nobody else gets one", () => {
    let withHistory = 0;
    for (const p of three.league.players) {
      const want = block.players[String(p.bio.id)];
      expect(p.condition.injuryHistory).toEqual(want);
      if (want === undefined) continue;
      withHistory++;
      const keys = Object.keys(p.condition);
      expect(keys[keys.length - 1]).toBe("injuryHistory");
      for (const r of p.condition.injuryHistory!) expect(Object.keys(r)).toEqual(["kind", "weeks", "since", "healed"]);
    }
    expect(withHistory).toBe(Object.keys(block.players).length);
    expect(Object.keys(block.players).every((id) => REAL_INJURY_KINDS.length === 17 && id.startsWith("r:"))).toBe(true);
  });

  it("changes nothing run on its own output, and strips the history with the rest (test 2)", () => {
    expect(serializeLeagueFile(withStartingDevelopment(three))).toBe(serializeLeagueFile(three));
    // The block taken off, the step run again: no man keeps a history.
    const { pastInjuries: _p, ...noBlock } = three;
    const again = withStartingDevelopment(noBlock as LeagueFileLike);
    expect(again.league.players.filter((p) => p.condition.injuryHistory !== undefined).length).toBe(0);
    expect(again.startingDevelopment!.version).toBe(NO_PAST_INJURIES_VERSION);
    for (const p of three.league.players.slice(0, 40)) expect(stripStartingDevelopment(p).condition.injuryHistory).toBeUndefined();
  });

  it("refuses a block of another version, season or cut, one naming a man not in the file, and a bad record, by the check and a stand-in id alone", () => {
    const input = (b: PastInjuriesBlock) => ({
      season: base.season, snapshotDate: base.snapshotDate, players: base.league.players, status: base.league.provenance.status,
      measurements: base.league.provenance.measurements, history: base.league.provenance.history, pastInjuries: b,
    });
    const first = Object.keys(block.players)[0]!;
    const bad = (records: unknown) => ({ ...block, players: { ...block.players, [first]: records } }) as PastInjuriesBlock;
    const r0 = block.players[first]![0]!;
    const cases: [PastInjuriesBlock, RegExp][] = [
      [{ ...block, version: "standin-injuries/0" }, /is not standin-injuries\/1/],
      [{ ...block, season: base.season + 1 }, /another season/],
      [{ ...block, through: "2026-10-24" }, /cut is not the file's snapshotDate/],
      [{ ...block, players: { ...block.players, "r:999999": block.players[first]! } }, /stand-in r:999999, who is not in the file/],
      [bad([]), /records not a non-empty list/],
      [bad([{ ...r0, team: "T1" }]), /exactly kind, weeks, since and healed/],
      [bad([{ ...r0, kind: "real:left-knee" }]), /kind is not one of the 17 classes/],
      [bad([{ ...r0, weeks: 0 }]), /weeks is not a whole number/],
      [bad([{ ...r0, since: { ...r0.since, week: 19 } }]), /invalid stamp/],
      [bad([{ ...r0, since: r0.healed, healed: r0.since }]), /healed before it began|invalid stamp/],
      [bad([{ ...r0, healed: { season: base.season, phase: "PLAYOFFS", week: 1, day: 1 } }]), /on or after the league's first day/],
      [bad([{ ...r0, healed: { season: base.season - 1, phase: "OFF_SUMMER", week: 1, day: 1 } }]), /invalid stamp|copied injury/],
      [bad([{ ...r0, since: { ...r0.since, season: r0.since.season + 1 }, healed: { ...r0.healed, season: r0.healed.season + 1 } }, r0]), /oldest first|first day/],
    ];
    for (const [b, re] of cases) {
      let message = "";
      try { standInDevelopment(input(b)); } catch (e) { message = (e as Error).message; }
      expect(message, String(re)).toMatch(re);
      // Never a value: the kind text, a team code or a stamp's phase never shows.
      expect(leakCount(message, /left-knee|T1\b|OFF_SUMMER|PLAYOFFS/), "values in a refusal").toBe(0);
    }
  });
});
