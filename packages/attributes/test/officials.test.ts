/**
 * ADR-093 step 1b: the stand-in league's copied crews (`importer/real/officials.ts`), on hand-written
 * rows and counts with made-up names only: referees "Made Up Referee 01" to "18", other officials
 * "Made Up Umpire 01", coaches "Made Up Coach 01", teams AAA and BBB, games g2025-001 and so on.
 */
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createRng, playerId, teamId,
  type CrewLeanFamily, type FoulKind, type PlayerState,
} from "@ff/contracts";
import { drawName, FIRST_NAMES, LAST_NAMES } from "../src/fictional/names.js";
import {
  CREW_COUNT, CREW_FAMILIES, KIND_FAMILY, LEAGUE_FILE_FORMAT, LEAN_WINDOW, MIN_SPREAD_GAMES, OFFICIAL_NAME_SEED, OFFICIAL_NAME_STREAM,
  OFFICIAL_ORDER_SEED, SCRIMMAGE_PLAYS, SPREAD_WINDOW, STANDIN_OFFICIALS_VERSION, STANDIN_SPREAD,
  bookReferees, copiedCrews, countSeason, crewsOfSnapshot, crewsProblem, familyKinds, fetchOfficialsSnapshot, fetchSnapshot, flagsInDesc,
  importRealWrites, kindlessShown, kindOfFlag, latestSnapshot, leanOf, nameKey, officiatingWrites, officialsFiles, officialsSnapshotDir,
  officialsTaken, readLeagueText, readOfficialsSnapshot, refereePairs, scheduledGames, serializeLeagueFile, settleLeans, shrinkFactor,
  snapshotFiles, snapshotNames, snapshotTaken, spreadBeyondChance, standInCrews, table6Check, verifySnapshot, widenLeans, withOfficiating,
  withStartingDevelopment,
  type CareerHistory, type CopySpread, type Download, type LeagueFileLike, type Leans, type OfficialRow, type PlayRow,
  type RefereeSeason, type ScheduleRow, type SealedTable, type SealedTables, type SeasonCounts, type StandInOfficiating,
} from "../src/importer/real/index.js";
import type { ReadRows } from "../src/importer/real/rows.js";

const REFEREE = (i: number) => `Made Up Referee ${String(i).padStart(2, "0")}`;
const KEY = (i: number) => nameKey(REFEREE(i));
const SEASONS = [2023, 2024, 2025, 2026];
const byFamily = (v: (f: CrewLeanFamily) => number): Leans => Object.fromEntries(CREW_FAMILIES.map((f) => [f, v(f)])) as Leans;
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const popSd = (xs: readonly number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
const round3 = (x: number) => Math.round(x * 1000) / 1000;
/** The order new referees take their ids in: a hash of their key (§5.7). */
const orderKey = (key: string) => createHash("sha256").update(OFFICIAL_ORDER_SEED + key).digest("hex");

// --- Counts by hand ------------------------------------------------------------------------------

/**
 * The league's rate per 1,000 scrimmage snaps, by season and family (made up, near the real ones). It
 * moves between seasons, and 2026's runs higher, as the real one does, so a count that took one
 * season's rate for another's would show.
 */
const PER_1000: Readonly<Record<number, Leans>> = {
  2023: { LINE_HOLDING: 18, COVERAGE: 20, PLAYER_SAFETY: 11, TECHNICAL: 15, SNAP: 27 },
  2024: { LINE_HOLDING: 20, COVERAGE: 19, PLAYER_SAFETY: 12, TECHNICAL: 17, SNAP: 28 },
  2025: { LINE_HOLDING: 17, COVERAGE: 21, PLAYER_SAFETY: 11, TECHNICAL: 16, SNAP: 26 },
  2026: { LINE_HOLDING: 24, COVERAGE: 22, PLAYER_SAFETY: 13, TECHNICAL: 18, SNAP: 31 },
};
/** A referee's made-up strictness on a family, 1 ± `amplitude` (0.6 to 1.4 by default); TECHNICAL is the same for every one. */
const strictness = (i: number, f: CrewLeanFamily, amplitude = 0.4) =>
  (f === "TECHNICAL" ? 1 : 1 + amplitude * Math.sin(1.7 * i + 0.9 * CREW_FAMILIES.indexOf(f)));

function refSeason(season: number, games: number, snaps: number, mult: (f: CrewLeanFamily) => number): RefereeSeason {
  return { games, snaps, flags: byFamily((f) => Math.round((PER_1000[season]![f] * snaps * mult(f)) / 1000)) };
}

function seasonCounts(season: number, refs: Readonly<Record<string, RefereeSeason>>): SeasonCounts {
  const games = Object.values(refs).reduce((a, r) => a + r.games, 0);
  const flags = Object.values(refs).reduce((a, r) => a + CREW_FAMILIES.reduce((b, f) => b + r.flags[f], 0), 0);
  return { season, played: games + 2, withReferee: games, referees: refs, flagged: { all: flags, withKind: flags }, kindless: {}, book: {} };
}

/**
 * A made-up league's counts for 2023 to 2026: referees 1 to 17 (or `referees`) each season, 16 games and
 * 2,400 snaps a season in the spread window, strict as `strictness` says (with `amplitude[season]`, if
 * given); `lean(i, s)` overrides a referee's season in the lean window.
 */
function madeUpCounts(opts: {
  readonly referees?: readonly number[];
  readonly referees2026?: readonly number[];
  readonly lean?: (i: number, season: number) => RefereeSeason | undefined;
  readonly amplitude?: Readonly<Record<number, number>>;
} = {}): SeasonCounts[] {
  const refs = opts.referees ?? Array.from({ length: 17 }, (_, i) => i + 1);
  return SEASONS.map((season) => {
    const here = season === 2026 ? (opts.referees2026 ?? refs) : refs;
    return seasonCounts(season, Object.fromEntries(here.map((i) => {
      const own = season >= 2025 ? opts.lean?.(i, season) : undefined;
      const games = season === 2026 ? 3 + (i % 3) : 16;
      return [KEY(i), own ?? refSeason(season, games, games * 150, (f) => strictness(i, f, opts.amplitude?.[season]))];
    })));
  });
}

const build = (over: Partial<Parameters<typeof standInCrews>[0]> = {}) => standInCrews({
  season: 2026, asOf: "2026-11-07", counts: madeUpCounts(), taken: new Set(), sealed: {}, spread: "measured", ...over,
});

/**
 * One family worked by hand: flags a refereed game by season, τ by season of the spread window, its RMS, each copy's
 * pull and unrounded lean, the factor, both settled spreads.
 */
interface HandFamily {
  readonly perGame: Readonly<Record<number, number>>;
  readonly tau: readonly number[];
  readonly tauRms: number;
  readonly pulls: readonly number[];
  readonly raw: readonly number[];
  readonly factor: number | null;
  readonly measured: readonly number[];
  readonly widened: readonly number[];
}

/**
 * §5.4 and §5.5 written out apart from `standInCrews`, on a 2026 file's counts, each copy in referee-key
 * order. Only `spreadBeyondChance` is shared, and its own hand-worked case pins it.
 */
function byHand(counts: readonly SeasonCounts[]): { keys: string[]; families: Record<CrewLeanFamily, HandFamily> } {
  const of = (s: number) => counts.find((c) => c.season === s)!;
  // λ: the season's flags of the family over its scrimmage snaps, in its refereed games.
  const lambda = (s: number, f: CrewLeanFamily) => {
    const refs = Object.values(of(s).referees);
    return refs.reduce((a, r) => a + r.flags[f], 0) / refs.reduce((a, r) => a + r.snaps, 0);
  };
  const settle = (xs: readonly number[]) => xs.map((x) => Math.round(Math.min(100, Math.max(0, x + 50 - mean(xs)))));
  const keys = Object.keys(of(2026).referees).sort();
  const families = Object.fromEntries(CREW_FAMILIES.map((f): [CrewLeanFamily, HandFamily] => {
    // Flags a refereed game: the season's flags of the family over its refereed games, both teams.
    const perGame = Object.fromEntries(SEASONS.map((s) => {
      const refs = Object.values(of(s).referees);
      return [s, refs.reduce((a, r) => a + r.flags[f], 0) / refs.reduce((a, r) => a + r.games, 0)];
    }));
    const tau2 = [2023, 2024, 2025].map((s) => spreadBeyondChance(
      Object.values(of(s).referees).map((r) => ({ games: r.games, flags: r.flags[f], expected: lambda(s, f) * r.snaps }))));
    const t2 = mean(tau2);
    // Each copy over 2025 and 2026: its flags over the flags each season's own rate expects, pulled by B = τ² ÷ (τ² + 1 ÷ E).
    const copies = keys.map((k) => {
      let n = 0;
      let e = 0;
      for (const s of [2025, 2026]) {
        const r = of(s).referees[k];
        if (r !== undefined) {
          n += r.flags[f];
          e += lambda(s, f) * r.snaps;
        }
      }
      const pull = t2 > 0 && e > 0 ? t2 / (t2 + 1 / e) : 0;
      return { pull, raw: 50 * (1 + pull * ((e > 0 ? n / e : 1) - 1)) };
    });
    const raw = copies.map((c) => c.raw);
    const factor = t2 > 0 && popSd(raw) > 0 ? (50 * Math.sqrt(t2)) / popSd(raw) : null;
    const measured = settle(raw);
    const widened = factor === null ? measured : settle(raw.map((x) => 50 + factor * (x - mean(raw))));
    return [f, { perGame, tau: tau2.map(Math.sqrt), tauRms: Math.sqrt(t2), pulls: copies.map((c) => c.pull), raw, factor, measured, widened }];
  })) as Record<CrewLeanFamily, HandFamily>;
  return { keys, families };
}

// --- Rows by hand ---------------------------------------------------------------------------------

const FOUL: Readonly<Record<CrewLeanFamily, string>> = {
  LINE_HOLDING: "Offensive Holding", COVERAGE: "Defensive Pass Interference", PLAYER_SAFETY: "Unnecessary Roughness",
  TECHNICAL: "Illegal Formation", SNAP: "False Start",
};
const flagText = (foul: string, team = "AAA") => `PENALTY on ${team}-Y.Pretend, ${foul}, 10 yards, enforced at ${team} 30 - No Play.`;
const play = (game: string, season: number, play_type: string | null, desc: string, season_type = "REG", old: string | null = `old-${game}`): PlayRow =>
  ({ game_id: game, old_game_id: old, season, season_type, play_type, desc: `(9:12) X.Madeup ${play_type ?? "timeout"} short left. ${desc}` });
const game = (id: string, season: number, referee: string | null, over: Partial<ScheduleRow> = {}): ScheduleRow => ({
  game_id: id, old_game_id: `old-${id}`, season, game_type: "REG", week: 1, home_score: 20, referee,
  home_coach: "Made Up Coach 01", away_coach: "Made Up Coach 02", ...over,
});

/**
 * A made-up league's rows, 2023 to 2026: referees 1 to 17 with 10 games a season (3 in 2026), 40
 * scrimmage plays and a punt a game, each family flagged on the contracts' seeded PRNG at its rate
 * times the referee's strictness; and one 2026 game with no referee.
 */
function madeUpRows(): { schedules: ScheduleRow[]; officials: OfficialRow[]; plays: Record<number, PlayRow[]> } {
  const rng = createRng("made-up officials", "attributes:test");
  const schedules: ScheduleRow[] = [];
  const officials: OfficialRow[] = [];
  const plays: Record<number, PlayRow[]> = {};
  for (const season of SEASONS) {
    const rows: PlayRow[] = [];
    let n = 0;
    const add = (referee: number | null) => {
      const id = `g${season}-${String(++n).padStart(3, "0")}`;
      schedules.push(game(id, season, referee === null ? null : REFEREE(referee), { week: 1 + (n % 17) }));
      if (referee !== null) {
        officials.push({ game_id: `old-${id}`, official_name: REFEREE(referee), position: "Referee", season });
        officials.push({ game_id: `old-${id}`, official_name: "Made Up Umpire 01", position: "Umpire", season });
      }
      for (let p = 0; p < 40; p++) {
        const flags = CREW_FAMILIES.filter((f) => rng.next() < (2.5 * PER_1000[season]![f] * (referee === null ? 1 : strictness(referee, f))) / 1000);
        rows.push(play(id, season, p % 2 === 0 ? "pass" : "run", flags.map((f) => flagText(FOUL[f], p % 4 < 2 ? "AAA" : "BBB")).join(" ")));
      }
      rows.push(play(id, season, "punt", flagText("Unnecessary Roughness")));
    };
    for (let i = 1; i <= 17; i++) for (let g = 0; g < (season === 2026 ? 3 : 10); g++) add(i);
    if (season === 2026) add(null);
    plays[season] = rows;
  }
  return { schedules, officials, plays };
}

const countRows = (r: ReturnType<typeof madeUpRows>) => {
  const games = scheduledGames(r.schedules, SEASONS);
  const book = bookReferees(r.officials);
  return SEASONS.map((s) => countSeason(s, r.plays[s]!, games, book));
};

/**
 * A stand-in for the parquet reader over made-up files, key to rows: it keeps only the columns asked for,
 * and throws on one a file lacks, as `readRows` does, so a column a loader leaves out shows.
 */
const projecting = (files: Readonly<Record<string, readonly object[]>>): ReadRows => async <T>(_dir: string, key: string, columns: readonly string[]) => {
  const rows = files[key];
  if (rows === undefined) throw new Error(`no made-up file ${key}`);
  return rows.map((row) => Object.fromEntries(columns.map((c) => {
    if (!Object.hasOwn(row, c)) throw new Error(`${key} has no column ${c}`);
    return [c, (row as Record<string, unknown>)[c]];
  }))) as unknown as T[];
};

/** The rows in another order, on a seeded shuffle. */
function shuffled<T>(xs: readonly T[], label: string): T[] {
  const rng = createRng("made-up shuffle", label);
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// --- A league file by hand ------------------------------------------------------------------------

const player = (id: string): PlayerState => ({
  bio: { id: playerId(id), displayName: `Made Up Player ${id}`, position: "WR", age: 26, heightIn: 72, weightLb: 200, creditedSeasons: 3, draft: "UDFA" },
  attributes: { kind: "true", values: {}, traits: new Set<string>() },
  condition: { stamina: 100, morale: 0 },
  personality: { needs: {}, type: "quiet" },
  teamId: teamId("T01"),
});
const history: CareerHistory = { snaps: { offense: 100, defense: 0, specialTeams: 20 }, gamesPlayed: [{ season: 2026, games: 5 }] };
/** A made-up league file of two stand-ins. */
const small = (): LeagueFileLike => ({
  format: LEAGUE_FILE_FORMAT, season: 2026, snapshotDate: "2026-10-23",
  league: {
    teams: [], players: [player("x:1"), player("x:2")], coverage: {},
    provenance: { status: { "x:1": "active", "x:2": "practice" }, measurements: {}, history: { "x:1": history, "x:2": history } },
  },
  picks: [], picksSource: { published: "2026-10-01" },
});

// --- The tests ------------------------------------------------------------------------------------

describe("flags and kinds (ADR-093 step 1b)", () => {
  it("flagsInDesc finds every flag with its team and outcome, and returns no player's name", () => {
    const desc = "(9:12) X.Madeup pass short left to W.Madeup. PENALTY on AAA-Y.Pretend, Offensive Holding, 10 yards, enforced at AAA 30 - No Play. " +
      "Penalty on BBB-Z.Pretend, Defensive Offside, declined. PENALTY on AAA-Q.Madeup, Unnecessary Roughness, 15 yards, offsetting. " +
      "PENALTY on BBB, Delay of Game, 5 yards, enforced at BBB 25. PENALTY on Y.Pretend, Taunting, 15 yards, enforced at AAA 40.";
    const flags = flagsInDesc(desc);
    expect(flags).toEqual([
      { foul: "Offensive Holding", team: "AAA", outcome: "enforced" },
      { foul: "Defensive Offside", team: "BBB", outcome: "declined" },
      { foul: "Unnecessary Roughness", team: "AAA", outcome: "offsetting" },
      { foul: "Delay of Game", team: "BBB", outcome: "enforced" },
      { foul: "Taunting", team: null, outcome: "enforced" },
    ]);
    expect(JSON.stringify(flags)).not.toMatch(/Madeup|Pretend/);
    expect(flagsInDesc("(9:12) X.Madeup pass short left. No flag.")).toEqual([]);
    expect(flagsInDesc(null)).toEqual([]);
  });

  it("kindOfFlag maps a foul's name to its kind mechanically, and gives none for a name that is no kind", () => {
    expect(kindOfFlag("Defensive Too Many Men on Field")).toBe("DEFENSIVE_TOO_MANY_MEN_ON_FIELD");
    expect(kindOfFlag("Offensive Holding")).toBe("OFFENSIVE_HOLDING");
    expect(kindOfFlag(" Illegal Block Above the Waist ")).toBe("ILLEGAL_BLOCK_ABOVE_THE_WAIST");
    expect(kindOfFlag("Horse Collar Tackle")).toBe("HORSE_COLLAR_TACKLE");
    expect(kindOfFlag("Delay of Game")).toBe("DELAY_OF_GAME");
    for (const none of ["Low Block", "Disqualification", "Illegal Blindside Block", "Made Up Foul", ""]) expect(kindOfFlag(none), none).toBeUndefined();
    // Every kind from its words as the game books write them.
    for (const kind of Object.keys(KIND_FAMILY) as FoulKind[]) {
      const words = kind.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
      expect(kindOfFlag(words), words).toBe(kind);
    }
  });

  it("KIND_FAMILY is §16 A1's table exactly, 31 kinds, and the block's families list them", () => {
    const A1: Record<CrewLeanFamily, readonly FoulKind[]> = {
      SNAP: ["FALSE_START", "DEFENSIVE_OFFSIDE", "NEUTRAL_ZONE_INFRACTION", "ENCROACHMENT", "OFFENSIVE_OFFSIDE", "DEFENSIVE_DELAY_OF_GAME"],
      TECHNICAL: ["DELAY_OF_GAME", "ILLEGAL_FORMATION", "ILLEGAL_SHIFT", "ILLEGAL_MOTION", "OFFENSIVE_TOO_MANY_MEN_ON_FIELD",
        "DEFENSIVE_TOO_MANY_MEN_ON_FIELD", "INTENTIONAL_GROUNDING", "INELIGIBLE_DOWNFIELD_PASS", "ILLEGAL_FORWARD_PASS"],
      LINE_HOLDING: ["OFFENSIVE_HOLDING", "ILLEGAL_USE_OF_HANDS", "CHOP_BLOCK", "CLIPPING", "ILLEGAL_BLOCK_ABOVE_THE_WAIST"],
      COVERAGE: ["DEFENSIVE_PASS_INTERFERENCE", "OFFENSIVE_PASS_INTERFERENCE", "DEFENSIVE_HOLDING", "ILLEGAL_CONTACT"],
      PLAYER_SAFETY: ["ROUGHING_THE_PASSER", "UNNECESSARY_ROUGHNESS", "FACE_MASK", "HORSE_COLLAR_TACKLE", "UNSPORTSMANLIKE_CONDUCT", "TAUNTING", "TRIPPING"],
    };
    const fromA1 = Object.fromEntries(Object.entries(A1).flatMap(([f, kinds]) => kinds.map((k) => [k, f])));
    expect(Object.keys(KIND_FAMILY)).toHaveLength(31);
    expect({ ...KIND_FAMILY }).toEqual(fromA1);
    const listed = familyKinds();
    expect(Object.keys(listed)).toEqual([...CREW_FAMILIES]);
    for (const f of CREW_FAMILIES) expect([...listed[f]].sort()).toEqual([...A1[f]].sort());
    expect(CREW_FAMILIES).toEqual(["LINE_HOLDING", "COVERAGE", "PLAYER_SAFETY", "TECHNICAL", "SNAP"]);
    expect(SCRIMMAGE_PLAYS).toEqual(["pass", "run", "no_play", "qb_kneel", "qb_spike"]);
  });
});

describe("counts (ADR-093 step 1b)", () => {
  it("countSeason counts regular-season scrimmage snaps of played games, every outcome, and nothing else", () => {
    const schedules: ScheduleRow[] = [
      game("g2025-001", 2025, REFEREE(1)),
      game("g2025-002", 2025, REFEREE(2)),
      game("g2025-003", 2025, null), // played, no referee
      game("g2025-004", 2025, REFEREE(1), { home_score: null }), // not played yet
      game("g2025-005", 2025, REFEREE(1), { game_type: "POST" }),
      game("g2025-006", 2025, REFEREE(2), { game_type: "PRE" }),
      game("g2024-001", 2024, REFEREE(1)),
    ];
    const offsetting = "PENALTY on AAA-Y.Pretend, Unnecessary Roughness, 15 yards, offsetting. PENALTY on BBB-Z.Madeup, Face Mask, 15 yards, offsetting.";
    const plays: PlayRow[] = [
      play("g2025-001", 2025, "pass", flagText("Offensive Holding")),
      play("g2025-001", 2025, "run", "Penalty on BBB-Z.Pretend, Defensive Pass Interference, declined."),
      play("g2025-001", 2025, "no_play", flagText("False Start")),
      play("g2025-001", 2025, "qb_kneel", ""),
      play("g2025-001", 2025, "qb_spike", ""),
      play("g2025-001", 2025, "pass", offsetting),
      play("g2025-001", 2025, "pass", flagText("Low Block")),
      play("g2025-001", 2025, "punt", flagText("Unnecessary Roughness")),
      play("g2025-001", 2025, "kickoff", flagText("Offensive Holding")),
      play("g2025-001", 2025, null, flagText("Unsportsmanlike Conduct")),
      play("g2025-002", 2025, "pass", flagText("Illegal Formation", "BBB")),
      play("g2025-002", 2025, "run", ""),
      play("g2025-003", 2025, "pass", flagText("Offensive Holding")),
      play("g2025-005", 2025, "pass", flagText("Offensive Holding"), "POST"),
      play("g2025-006", 2025, "pass", flagText("Offensive Holding"), "PRE"),
      play("g2024-001", 2024, "pass", flagText("Offensive Holding")),
    ];
    const officials: OfficialRow[] = [
      { game_id: "old-g2025-001", official_name: REFEREE(1), position: "Referee", season: 2025 },
      { game_id: "old-g2025-001", official_name: "Made Up Umpire 01", position: "Umpire", season: 2025 },
      // A game whose only row in the officials table is an umpire's: the port check has no referee for it.
      { game_id: "old-g2025-002", official_name: "Made Up Umpire 01", position: "Umpire", season: 2025 },
    ];
    expect([...bookReferees(officials)]).toEqual([["old-g2025-001", KEY(1)]]);
    const games = scheduledGames(schedules, [2024, 2025]);
    const c = countSeason(2025, plays, games, bookReferees(officials));
    expect([c.season, c.played, c.withReferee]).toEqual([2025, 3, 2]);
    expect(c.referees).toEqual({
      [KEY(1)]: { games: 1, snaps: 7, flags: { LINE_HOLDING: 1, COVERAGE: 1, PLAYER_SAFETY: 2, TECHNICAL: 0, SNAP: 1 } },
      [KEY(2)]: { games: 1, snaps: 2, flags: { LINE_HOLDING: 0, COVERAGE: 0, PLAYER_SAFETY: 0, TECHNICAL: 1, SNAP: 0 } },
    });
    // The no-referee game's hold counts among the season's flags but for no crew; the kindless flag apart, by name.
    expect(c.flagged).toEqual({ all: 8, withKind: 7 });
    expect(c.kindless).toEqual({ "Low Block": 1 });
    expect(c.book).toEqual({ [KEY(1)]: { games: 1, holds: 1 } });
    expect(countSeason(2024, plays, games).referees[KEY(1)]).toEqual({ games: 1, snaps: 1, flags: { LINE_HOLDING: 1, COVERAGE: 0, PLAYER_SAFETY: 0, TECHNICAL: 0, SNAP: 0 } });
  });

  it("a crew at the league's rate every season has ratio 1, whatever its games or snaps, though that rate moves between seasons", () => {
    // A real spread in the spread window, and every copy at its season's league rate in the lean window, on unequal games and
    // snaps, with this season's share of a copy's snaps unequal too: a count that took one season's rate for both would move them.
    const atRate = (i: number, season: number) => (season === 2026
      ? refSeason(2026, 1 + (i % 5), 1000 * (1 + (i % 3)), () => 1)
      : refSeason(2025, 10 + (i % 7), 1000 * (2 + (i % 4)), () => 1));
    for (const f of CREW_FAMILIES) expect(PER_1000[2026]![f] / PER_1000[2025]![f], f).toBeGreaterThan(1.04);
    const { officiating } = build({ counts: madeUpCounts({ lean: atRate }) });
    expect(officiating.measured.LINE_HOLDING.tauRms).toBeGreaterThan(0.1);
    for (const c of officiating.crews) expect(c.leans).toEqual(byFamily(() => 50));
  });

  it("kindlessShown shows a foul's name only: every word a foul's, none that is or holds a taken name, no period, slash or digit", () => {
    const taken = new Set(["Sam Madeup", "Made Up Coach 01"]);
    const at = (season: number, kindless: Record<string, number>): SeasonCounts => ({ ...seasonCounts(season, {}), kindless });
    const counts = [
      at(2025, {
        "Low Block": 3, "Illegal Peelback": 2,
        "Sam Madeup Holding": 1, "SAM MADEUP": 1, // a taken name, in any case
        "Madeup": 2, "Sam": 1, "Jr": 1, // part of one (a surname, a first name), or nothing a key keeps
        "Y.Pretend": 2, "Low/High Block": 1, "Block 2": 1, // not a foul's name's letters
      }),
      at(2026, { "Low Block": 1, "Illegal Peelback": 3, "Disqualification": 4 }),
    ];
    // Summed over the seasons, most flags first, then by name.
    expect(kindlessShown(counts, taken)).toEqual({
      shown: [["Illegal Peelback", 5], ["Disqualification", 4], ["Low Block", 4]],
      hidden: { names: 8, flags: 10 },
    });
    // With nothing taken, the same: a word that is no foul's hides a name whatever the taken set holds.
    expect(kindlessShown(counts, new Set()).shown.map(([name]) => name)).toEqual(["Illegal Peelback", "Disqualification", "Low Block"]);
    expect(kindlessShown([], taken)).toEqual({ shown: [], hidden: { names: 0, flags: 0 } });
  });

  it("kindlessShown hides a capture that mixes part of a name with a foul's words, and shows the 19 names the officials snapshot of 2026-11-07 shows", () => {
    const taken = ["Sam Madeup", "Tom Pretend"];
    const shows = (name: string, names: readonly string[] = taken) =>
      kindlessShown([{ ...seasonCounts(2025, {}), kindless: { [name]: 1 } }], names).shown.length === 1;
    // Each holds part of a made-up person's name, or a word no foul's name holds (a name suffix among them, though
    // nameKey drops one), with the taken set or without it.
    for (const mixed of [
      "Holding (Madeup)", "Illegal Block Madeup", "Madeup Holding", "Pretend Low Block", "S Madeup", "Sammy", "Sam Madeup's Block",
      "Low Block Jr", "Holding II",
    ]) {
      expect(shows(mixed), mixed).toBe(false);
      expect(shows(mixed, []), `${mixed}, nothing taken`).toBe(false);
    }
    const today = [
      "Illegal Blindside Block", "Low Block", "Disqualification", "Running Into the Kicker", "Illegal Touch Pass", "Roughing the Kicker",
      "Player Out of Bounds on Kick", "Lowering the Head to Make Forcible Contact", "Leverage", "Ineligible Downfield Kick",
      "Illegal Substitution", "Hip Drop Tackle", "Illegal Bat", "Illegal Crackback", "Illegal Touch Kick", "Leaping",
      "Illegal Forward Handoff", "Illegal Peelback", "Kick Catch Interference",
    ];
    expect(today).toHaveLength(19);
    // Those 19, and a kind's name with a word in parentheses, are shown.
    for (const name of [...today, "Unnecessary Roughness (Taunting)"]) expect(shows(name), name).toBe(true);
    // A foul's name in words the list does not hold is counted, not shown, until its words are added.
    expect(shows("Illegal Peel Back")).toBe(false);
    // And a foul's words that are part of a taken name are hidden still.
    expect(shows("Leaping", ["Leaping Madeup"])).toBe(false);
    expect(shows("Illegal Low Block", ["Low Block"])).toBe(false); // a foul's words holding a whole taken name
  });
});

describe("from counts to leans (ADR-093 step 1b)", () => {
  it("spreadBeyondChance is §5.4's formula: n − 1, the plain-mean center, less the mean chance, floored at 0", () => {
    const rows = [
      { games: 12, flags: 30, expected: 20 },
      { games: 15, flags: 18, expected: 24 },
      { games: MIN_SPREAD_GAMES, flags: 40, expected: 40 }, // exactly the minimum: kept
      { games: MIN_SPREAD_GAMES - 1, flags: 100, expected: 10 }, // too few games: left out
    ];
    // By hand: ratios 1.5, 0.75 and 1; about their mean the squares sum to 7/24; the chance variances 1/20, 1/24, 1/40 average 7/180.
    const tau2 = 7 / 48 - 7 / 180;
    expect(spreadBeyondChance(rows)).toBeCloseTo(tau2, 12);
    expect(Math.abs(tau2 - (7 / 72 - 7 / 180))).toBeGreaterThan(0.04); // an n divisor gives another number
    const pooled = 88 / 84;
    const aboutPooled = ((1.5 - pooled) ** 2 + (0.75 - pooled) ** 2 + (1 - pooled) ** 2) / 2 - 7 / 180;
    expect(Math.abs(tau2 - aboutPooled)).toBeGreaterThan(0.001); // so does the pooled center
    // Crews apart by less than chance: 0, never below.
    expect(spreadBeyondChance([{ games: 12, flags: 11, expected: 10 }, { games: 12, flags: 9, expected: 10 }, { games: 12, flags: 10, expected: 10 }])).toBe(0);
    expect(spreadBeyondChance([{ games: 12, flags: 10, expected: 10 }, { games: 12, flags: 10, expected: 10 }])).toBe(0);
    expect(spreadBeyondChance([])).toBe(0);
  });

  it("shrinkFactor: Table 2's offensive-holding case gives 0.690; 0 with no expected flags or no spread; toward 1 with many", () => {
    expect(shrinkFactor(0.13 ** 2, 2.75 * 47.94)).toBeCloseTo(0.69, 3);
    expect(shrinkFactor(0.13 ** 2, 0)).toBe(0);
    expect(shrinkFactor(0, 500)).toBe(0);
    expect(shrinkFactor(0.13 ** 2, 1e6)).toBeGreaterThan(0.999);
    expect(shrinkFactor(0.13 ** 2, 50)).toBeLessThan(shrinkFactor(0.13 ** 2, 100));
  });

  it("leanOf is §16 A3's scale; settleLeans re-centers each family on 50, clamps to 0 to 100 and rounds to whole points", () => {
    expect(leanOf(1)).toBe(50);
    expect(leanOf(1.158)).toBeCloseTo(57.9, 10);
    expect(leanOf(0)).toBe(0);
    const raw = [
      byFamily((f) => (f === "SNAP" ? 160 : 61.4)),
      byFamily((f) => (f === "SNAP" ? 50 : 58.6)),
      byFamily((f) => (f === "SNAP" ? 40 : 70.2)),
    ];
    const settled = settleLeans(raw);
    expect(settled[0]!.LINE_HOLDING).toBe(48); // 61.4 − 13.4
    expect(settled.map((l) => l.SNAP)).toEqual([100, 17, 7]); // 160 − 33.3 = 126.7, clamped; 16.7 and 6.7 rounded
    for (const l of settled) {
      expect(Object.keys(l)).toEqual([...CREW_FAMILIES]);
      for (const f of CREW_FAMILIES) expect(Number.isInteger(l[f]) && l[f] >= 0 && l[f] <= 100).toBe(true);
    }
    for (const f of CREW_FAMILIES.filter((x) => x !== "SNAP")) expect(Math.abs(mean(settled.map((l) => l[f])) - 50)).toBeLessThanOrEqual(0.5);
  });

  it("standInCrews gives 17 crews o:01 to o:17 in id order, each { id, referee, leans } in the families' order, on the local crewsProblem's terms", () => {
    const { officiating, sealed } = build();
    expect(officiating.crews.map((c) => String(c.id))).toEqual(Array.from({ length: CREW_COUNT }, (_, i) => `o:${String(i + 1).padStart(2, "0")}`));
    for (const c of officiating.crews) {
      expect(Object.keys(c)).toEqual(["id", "referee", "leans"]);
      expect(Object.keys(c.leans)).toEqual([...CREW_FAMILIES]);
      const [first, last] = c.referee.split(" ");
      expect(FIRST_NAMES).toContain(first);
      expect(LAST_NAMES).toContain(last);
    }
    expect(crewsProblem(officiating.crews, { block: officiating.season, file: 2026 })).toBeUndefined();
    expect(Object.keys(sealed).sort()).toEqual(Array.from({ length: 17 }, (_, i) => KEY(i + 1)).sort());
    // The local rule refuses what franchise's refuses, and the block's own rules too.
    const crews = officiating.crews;
    expect(crewsProblem(crews.slice(1))).toMatch(/16 crews, not 17/);
    expect(crewsProblem([...crews, { ...crews[16]!, id: "o:18" }])).toMatch(/18 crews, not 17/);
    // The 17th crew changed one way at a time.
    const last = (c: object) => crewsProblem([...crews.slice(0, 16), c]);
    const leaned = (over: Record<string, unknown>) => last({ ...crews[16]!, leans: { ...crews[16]!.leans, ...over } });
    expect(last({ ...crews[16]!, id: crews[0]!.id })).toMatch(/appears twice/);
    expect(last({ ...crews[16]!, id: "" })).toMatch(/has no id/);
    expect(last({ ...crews[16]!, referee: crews[0]!.referee })).toMatch(/two crews have the referee/);
    expect(last({ ...crews[16]!, referee: "" })).toMatch(/has no referee/);
    const { leans: _l, ...noLeans } = crews[16]!;
    expect(last(noLeans)).toMatch(/has no leans/);
    const { SNAP: _s, ...fourLeans } = crews[16]!.leans;
    expect(last({ ...crews[16]!, leans: fourLeans })).toMatch(/has no SNAP lean/);
    for (const v of [101, -1, 50.5, "50"]) expect(leaned({ SNAP: v }), String(v)).toMatch(/SNAP lean is not a whole number/);
    expect(leaned({ KICKS: 50 })).toMatch(/not one of the five families/);
    expect(crewsProblem(crews.map((c) => ({ ...c, leans: { ...c.leans, COVERAGE: 51 } })))).toMatch(/COVERAGE leans average 51\.00/);
    expect(crewsProblem(crews, { block: 2026, file: 2027 })).toMatch(/stand in 2026, not the league file's season 2027/);
    expect(crewsProblem("crews")).toBe("the crews are not a list");
  });

  it("pulls a referee with few games almost to 50, and keeps more of a real lean behind many games", () => {
    // Referees 1 and 2 call holding at half again the league's rate in the lean window: 1 behind one game, 2 behind 21.
    const lean = (i: number, season: number) => {
      const strict = (f: CrewLeanFamily) => (f === "LINE_HOLDING" ? 1.5 : 1);
      if (i === 1) return season === 2026 ? refSeason(2026, 1, 150, strict) : undefined;
      if (i === 2) return season === 2026 ? refSeason(2026, 5, 750, strict) : refSeason(season, 16, 2400, strict);
      return refSeason(season, season === 2026 ? 4 : 16, season === 2026 ? 600 : 2400, () => 1);
    };
    const counts = madeUpCounts({ lean, referees2026: Array.from({ length: 17 }, (_, i) => i + 1) });
    counts[2] = seasonCounts(2025, Object.fromEntries(Object.entries(counts[2]!.referees).filter(([k]) => k !== KEY(1))));
    const { officiating, sealed } = build({ counts });
    const holding = (i: number) => officiating.crews.find((c) => c.id === sealed[KEY(i)]!.id)!.leans.LINE_HOLDING;
    // Unpulled, both would lean about 50 × 1.4 = 70 on holding: behind one game the pull takes 1 to within 3 of 50,
    // behind 21 games 2 keeps most of it, and the crews at the league's rate stay by 50.
    expect(Math.abs(holding(1) - 50)).toBeLessThanOrEqual(3);
    expect(holding(2)).toBeGreaterThanOrEqual(60);
    expect(holding(2) - holding(1)).toBeGreaterThanOrEqual(10);
    for (let i = 3; i <= 17; i++) expect(Math.abs(holding(i) - 50)).toBeLessThanOrEqual(1);
    expect(officiating.games[sealed[KEY(1)]!.id]).toEqual({ 2025: 0, 2026: 1 });
    expect(officiating.games[sealed[KEY(2)]!.id]).toEqual({ 2025: 16, 2026: 5 });
  });

  it("the report and the block hold §5.4 and §5.5 worked by hand, on counts whose spread and league rate move by season", () => {
    // The real crews' spread moves by season (Table 6: 11%, 25%, 15%); here the strictness swings 0.15, 0.5 and 0.3.
    const counts = madeUpCounts({ amplitude: { 2023: 0.15, 2024: 0.5, 2025: 0.3 } });
    const hand = byHand(counts);
    const measured = build({ counts });
    const widened = build({ counts, spread: "widened" });
    const crewOf = (run: ReturnType<typeof build>, key: string) => run.officiating.crews.find((c) => c.id === run.sealed[key]!.id)!;
    for (const f of CREW_FAMILIES) {
      const h = hand.families[f];
      const r = measured.report.families[f];
      // Unrounded in the report: τ by season, τ's RMS, the mean pull and the factor.
      expect(r.tau, f).toHaveLength(3);
      r.tau.forEach((t, s) => expect(t, `${f} τ ${2023 + s}`).toBeCloseTo(h.tau[s]!, 12));
      expect(r.tauRms, f).toBeCloseTo(h.tauRms, 12);
      expect(r.shrink, f).toBeCloseTo(mean(h.pulls), 12);
      if (h.factor === null) expect(r.widened.factor, f).toBeNull();
      else expect(r.widened.factor!, f).toBeCloseTo(h.factor, 9);
      // The printout's flags a refereed game by season, and each spread's SD, range and mean over the leans settled.
      expect(Object.keys(r.perGame), f).toEqual(SEASONS.map(String));
      for (const s of SEASONS) expect(r.perGame[String(s)], `${f} per game ${s}`).toBeCloseTo(h.perGame[s]!, 12);
      for (const [spread, leans] of [["measured", h.measured], ["widened", h.widened]] as const) {
        const got = r[spread];
        expect(got.sd, `${f} ${spread} SD`).toBeCloseTo(popSd(leans), 12);
        expect([got.min, got.max], `${f} ${spread} range`).toEqual([Math.min(...leans), Math.max(...leans)]);
        expect(got.mean, `${f} ${spread} mean`).toBeCloseTo(mean(leans), 12);
      }
      // To 3 places in the block, the same whichever spread is written.
      for (const run of [measured, widened]) {
        expect(run.officiating.measured[f], f).toEqual({
          tau: h.tau.map(round3), tauRms: round3(h.tauRms), shrink: round3(mean(h.pulls)),
          sd: { measured: round3(popSd(h.measured)), widened: round3(popSd(h.widened)) },
          factor: h.factor === null ? null : round3(h.factor),
        });
      }
      // And the leans written, copy by copy.
      hand.keys.forEach((key, i) => {
        expect(crewOf(measured, key).leans[f], `${f} measured ${key}`).toBe(h.measured[i]);
        expect(crewOf(widened, key).leans[f], `${f} widened ${key}`).toBe(h.widened[i]);
      });
    }
    expect(hand.families.TECHNICAL.factor).toBeNull();
    // Games behind each copy: 16 in 2025 and 3 to 5 in 2026 (madeUpCounts), so 19 to 21 in all.
    expect(measured.report.games).toEqual({ total: { min: 19, max: 21 }, bySeason: { 2025: { min: 16, max: 16 }, 2026: { min: 3, max: 5 } } });
    // The case tells the near misses apart, each by more than the block's rounding: τ's RMS against τ's mean, the mean
    // pull against the largest, and the factor on the unrounded leans' population SD against their sample SD or the settled leans'.
    const hold = hand.families.LINE_HOLDING;
    expect(Math.abs(hold.tauRms - mean(hold.tau))).toBeGreaterThan(0.02);
    expect(Math.max(...hold.pulls) - mean(hold.pulls)).toBeGreaterThan(0.005);
    const dev = hold.raw.map((x) => x - mean(hold.raw));
    const sampleSd = Math.sqrt(dev.reduce((a, d) => a + d * d, 0) / (dev.length - 1));
    expect(Math.abs((50 * hold.tauRms) / sampleSd - hold.factor!)).toBeGreaterThan(0.02);
    expect(Math.abs((50 * hold.tauRms) / popSd(hold.measured) - hold.factor!)).toBeGreaterThan(0.005);
    // Every float the block records is rounded to 3 places.
    for (const m of Object.values(measured.officiating.measured)) {
      for (const x of [...m.tau, m.tauRms, m.shrink, m.sd.measured, m.sd.widened, ...(m.factor === null ? [] : [m.factor])]) expect(round3(x)).toBe(x);
    }
  });

  it("widenLeans scales each family's unrounded leans about their mean by 50 × τ over their population SD, then settles them", () => {
    // Four copies' unrounded leans, fractional and averaging 47.325, not 50; SNAP's all alike.
    const column = [41.3, 46.9, 49.15, 51.95];
    const raw = column.map((x) => byFamily((f) => (f === "SNAP" ? 47.325 : x)));
    const tauRms: Leans = { LINE_HOLDING: 0.12, COVERAGE: 0, PLAYER_SAFETY: 0.2, TECHNICAL: 0.12, SNAP: 0.1 };
    const { leans, factor } = widenLeans(raw, tauRms);
    const dev = column.map((x) => x - mean(column));
    const k = (tau: number) => (50 * tau) / popSd(dev);
    expect(factor.LINE_HOLDING!).toBeCloseTo(k(0.12), 9);
    expect(factor.LINE_HOLDING!).toBeCloseTo(1.5339, 4);
    expect(factor.PLAYER_SAFETY!).toBeCloseTo(k(0.2), 9);
    expect(factor.TECHNICAL!).toBeCloseTo(k(0.12), 9);
    expect(factor.COVERAGE).toBeNull(); // no spread to widen to
    expect(factor.SNAP).toBeNull(); // no spread to widen
    const scaled = raw.map((l) => byFamily((f) => (factor[f] === null ? l[f] : 50 + factor[f]! * (l[f] - mean(raw.map((x) => x[f]))))));
    expect(leans).toEqual(settleLeans(scaled));
    expect(leans.map((l) => l.LINE_HOLDING)).toEqual([41, 49, 53, 57]);
    expect(leans.map((l) => l.PLAYER_SAFETY)).toEqual([35, 49, 55, 62]);
    expect(leans.map((l) => l.COVERAGE)).toEqual([44, 50, 52, 55]); // settled as they were
    expect(leans.map((l) => l.SNAP)).toEqual([50, 50, 50, 50]);
    // The sample SD, or the settled leans' SD, would give another factor.
    const sampleSd = Math.sqrt(dev.reduce((a, d) => a + d * d, 0) / (dev.length - 1));
    expect(Math.abs((50 * 0.12) / sampleSd - factor.LINE_HOLDING!)).toBeGreaterThan(0.1);
    expect(Math.abs((50 * 0.12) / popSd(settleLeans(raw).map((l) => l.LINE_HOLDING)) - factor.LINE_HOLDING!)).toBeGreaterThan(0.02);
  });
});

describe("names and ids (ADR-093 step 1b)", () => {
  const learned = build().sealed;
  const nameOf = (i: number) => learned[KEY(i)]!.name;

  it("never draws a taken name: an official's, a schedules referee's or coach's, a real player's, a stand-in's or a sealed one", () => {
    const { names } = snapshotNames({
      schedules: [game("g2015-001", 2015, nameOf(1), { home_coach: nameOf(2), away_coach: nameOf(3) })],
      officials: [{ game_id: "old-g2016-001", official_name: nameOf(4), position: "Umpire", season: 2016 }],
      players: [nameOf(5)],
    });
    const taken = officialsTaken({
      snapshotNames: names, standInNames: [nameOf(6)],
      playersSealed: { g1: { id: "r:1", name: nameOf(7) } }, officialsSealed: { someone: { id: "o:30", name: nameOf(8) } },
    });
    // A name taken in another spelling is taken too (case, punctuation, Jr.).
    taken.add(nameOf(9).toUpperCase());
    taken.add(`${nameOf(10)} Jr.`);
    const again = build({ taken });
    const drawn = again.officiating.crews.map((c) => c.referee);
    for (let i = 1; i <= 10; i++) expect(drawn, `referee ${i}`).not.toContain(nameOf(i));
    for (let i = 11; i <= 17; i++) expect(again.sealed[KEY(i)]!.name).toBe(nameOf(i));
    for (const n of drawn) expect(taken.has(n)).toBe(false);
    expect(new Set(drawn).size).toBe(17);
  });

  it("snapshotNames counts each source's distinct names, and refuses a snapshot where one gives none, naming the source only", () => {
    const schedules = [game("g2015-001", 2015, REFEREE(1)), game("g2015-002", 2015, REFEREE(1), { away_coach: "Made Up Coach 03" })];
    const officials: OfficialRow[] = [
      { game_id: "old-g2015-001", official_name: REFEREE(1), position: "Referee", season: 2015 },
      { game_id: "old-g2015-001", official_name: "Made Up Umpire 01", position: "Umpire", season: 2015 },
    ];
    const players = ["Made Up Player 01", "Made Up Player 01", "Made Up Player 02"];
    const all = snapshotNames({ schedules, officials, players });
    expect(all.bySource).toEqual({ officials: 2, referees: 1, coaches: 3, players: 2 });
    expect([...all.names].sort()).toEqual([
      "Made Up Coach 01", "Made Up Coach 02", "Made Up Coach 03", "Made Up Player 01", "Made Up Player 02", REFEREE(1), "Made Up Umpire 01",
    ].sort());
    const refusal = (input: Parameters<typeof snapshotNames>[0]): string => {
      try {
        snapshotNames(input);
      } catch (e) {
        return (e as Error).message;
      }
      return "not refused";
    };
    // A source left out, or read on another column so that every value of it is missing: refused, naming the source alone.
    const cases: [Parameters<typeof snapshotNames>[0], RegExp][] = [
      [{ schedules, officials: [], players }, /gives no names for its officials:/],
      [{ schedules: schedules.map((g) => ({ ...g, referee: null })), officials, players }, /gives no names for its referees:/],
      [{ schedules: schedules.map((g) => ({ ...g, home_coach: null, away_coach: null })), officials, players }, /gives no names for its coaches:/],
      [{ schedules, officials, players: [] }, /gives no names for its players:/],
      [{ schedules: [], officials, players }, /gives no names for its referees, coaches:/],
    ];
    for (const [input, message] of cases) {
      const m = refusal(input);
      expect(m).toMatch(message);
      expect(m).not.toMatch(/Made Up/);
    }
  });

  it("keeps each referee's id and name across refreshes, gives a new referee the next id, and keeps a referee with no game", () => {
    const first = build();
    // New referees take their ids in the order of a hash of their key.
    const order = Array.from({ length: 17 }, (_, i) => KEY(i + 1))
      .sort((a, b) => (createHash("sha256").update(OFFICIAL_ORDER_SEED + a).digest("hex") < createHash("sha256").update(OFFICIAL_ORDER_SEED + b).digest("hex") ? -1 : 1));
    expect(order.map((k) => first.sealed[k]!.id)).toEqual(Array.from({ length: 17 }, (_, i) => `o:${String(i + 1).padStart(2, "0")}`));
    // A refresh on the sealed table: the same crews, every one kept.
    const taken = officialsTaken({ snapshotNames: [], standInNames: [], playersSealed: {}, officialsSealed: first.sealed });
    const second = build({ sealed: first.sealed, taken, before: first.officiating });
    expect(second.officiating).toEqual(first.officiating);
    expect(second.report).toMatchObject({ minted: 0, missing: 0, kept: 17 });
    // Referee 17 has no game in 2026 and referee 18 does: 18 takes o:18, and 17 keeps their entry but gets no crew.
    const counts = madeUpCounts({ referees: Array.from({ length: 18 }, (_, i) => i + 1), referees2026: [...Array.from({ length: 16 }, (_, i) => i + 1), 18] });
    const third = build({ counts, sealed: first.sealed, taken, before: first.officiating });
    expect(third.sealed[KEY(18)]!.id).toBe("o:18");
    expect(third.sealed[KEY(17)]).toEqual(first.sealed[KEY(17)]);
    expect(third.officiating.crews.map((c) => c.referee)).not.toContain(first.sealed[KEY(17)]!.name);
    expect(third.officiating.crews.map((c) => c.referee)).toContain(third.sealed[KEY(18)]!.name);
    expect(third.report).toMatchObject({ referees: 17, minted: 1, missing: 1, kept: 16, sealedSize: 18 });
  });

  it("counts a crew as kept only when its id and its referee are both the block's before: one renamed under its id, or two swapped, is not", () => {
    const first = build();
    const taken = officialsTaken({ snapshotNames: [], standInNames: [], playersSealed: {}, officialsSealed: first.sealed });
    const keptAgainst = (before: StandInOfficiating) => build({ sealed: first.sealed, taken, before }).report.kept;
    expect(keptAgainst(first.officiating)).toBe(17);
    const crews = first.officiating.crews;
    const withReferees = (referee: (i: number) => string): StandInOfficiating => ({ ...first.officiating, crews: crews.map((c, i) => ({ ...c, referee: referee(i) })) });
    // The block before named one crew's referee otherwise, under the same id: that crew is renamed, 16 kept.
    expect(keptAgainst(withReferees((i) => (i === 4 ? "Made Up Referee Renamed" : crews[i]!.referee)))).toBe(16);
    // The block before had two referees each under the other's id: every id and every referee is there, but not together.
    expect(keptAgainst(withReferees((i) => crews[i === 2 ? 3 : i === 3 ? 2 : i]!.referee))).toBe(15);
    // The sealed table lost, and one drawn name taken since: the same ids are minted again, and one crew's referee moves.
    const lost = build({ taken: new Set([crews[4]!.referee]), before: first.officiating });
    expect(lost.officiating.crews.map((c) => String(c.id))).toEqual(crews.map((c) => String(c.id)));
    expect(lost.report).toMatchObject({ minted: 17, kept: 16 });
  });

  it("draws a new referee's name on their own key, whatever id they get, and numbers new ids after the highest sealed one, past a gap", () => {
    // A sealed table whose ids leave a gap, o:01 and o:05: referees 1 and 2 return, and the other 15 are new.
    const sealed: SealedTable = { [KEY(1)]: { id: "o:01", name: nameOf(1) }, [KEY(2)]: { id: "o:05", name: nameOf(2) } };
    const taken = officialsTaken({ snapshotNames: [], standInNames: [], playersSealed: {}, officialsSealed: sealed });
    const run = build({ sealed, taken });
    expect(run.sealed[KEY(1)]).toEqual(sealed[KEY(1)]);
    expect(run.sealed[KEY(2)]).toEqual(sealed[KEY(2)]);
    const fresh = Array.from({ length: 15 }, (_, i) => KEY(i + 3)).sort((a, b) => (orderKey(a) < orderKey(b) ? -1 : 1));
    expect(fresh.map((k) => run.sealed[k]!.id)).toEqual(Array.from({ length: 15 }, (_, i) => `o:${String(i + 6).padStart(2, "0")}`));
    expect(run.officiating.crews.map((c) => String(c.id))).toEqual(["o:01", "o:05", ...fresh.map((k) => run.sealed[k]!.id)]);
    // Each new name is the draw on the referee's own key, in id order, against the taken set as the draws before it left it.
    const used = new Set(taken);
    for (const k of fresh) {
      expect(run.sealed[k]!.name, k).toBe(drawName(createRng(`${OFFICIAL_NAME_SEED}:${k}`, OFFICIAL_NAME_STREAM), used));
      // The same name as with no sealed table, though under another id.
      expect(run.sealed[k]!.name, k).toBe(learned[k]!.name);
      expect(run.sealed[k]!.id, k).not.toBe(learned[k]!.id);
    }
  });

  it("refuses 16 or 18 referees with a game this season, two spellings of one key, a season's games with no snap, and a snapshot of another season", async () => {
    const seventeen = Array.from({ length: 17 }, (_, i) => i + 1);
    expect(() => build({ counts: madeUpCounts({ referees2026: seventeen.slice(1) }) })).toThrow(/16 referees with a game in 2026, not 17/);
    expect(() => build({ counts: madeUpCounts({ referees: [...seventeen, 18] }) })).toThrow(/18 referees with a game in 2026, not 17/);
    const spelled = [game("g2025-001", 2025, REFEREE(1)), game("g2025-002", 2025, REFEREE(1).toLowerCase())];
    expect(() => scheduledGames(spelled, [2025])).toThrow(/two ways/);
    expect(() => scheduledGames(spelled, [2024])).not.toThrow();
    // A season whose refereed games have no scrimmage snap (its plays read for another season, say): refused, with counts only.
    const noSnaps = madeUpCounts().map((c) => (c.season !== 2024 ? c
      : seasonCounts(2024, Object.fromEntries(Object.entries(c.referees).map(([k, r]) => [k, { ...r, snaps: 0 }])))));
    expect(() => build({ counts: noSnaps })).toThrow(/2024 has 272 refereed games and no scrimmage snap in them/);
    const noSnaps2026 = madeUpCounts().map((c) => (c.season !== 2026 ? c
      : { ...c, referees: Object.fromEntries(Object.entries(c.referees).map(([k, r]) => [k, { ...r, snaps: 0 }])) }));
    expect(() => build({ counts: noSnaps2026 })).toThrow(/2026 has \d+ refereed games and no scrimmage snap in them/);
    // Counts of another season's snapshot (2022 to 2025) for a 2026 file.
    const older = madeUpCounts().map((c) => ({ ...c, season: c.season - 1 }));
    expect(() => build({ counts: older })).toThrow(/another season/);
    // And a snapshot folder of another season, refused before any row is read.
    const root = join(await mkdtemp(join(tmpdir(), "ff-officials-")), "officials");
    const { dir } = await fetchSnapshot({
      root, season: 2025, now: new Date("2026-11-07T01:30:00Z"), files: officialsFiles(2025),
      download: async (url) => new TextEncoder().encode(`made-up bytes of ${url}`),
    });
    await expect(readOfficialsSnapshot(dir, 2026)).rejects.toThrow(/is of 2025, not the league file's season 2026/);
  });

  it("widened: each family spreads at 50 × its τ within rounding, every crew keeps its rank, a family with no spread stays at 50", () => {
    const measured = build();
    const widened = build({ spread: "widened" });
    for (const f of CREW_FAMILIES) {
      const m = measured.officiating.measured[f];
      expect(widened.officiating.measured[f]).toEqual(m); // both spreads recorded whichever is written
      const w = widened.officiating.crews.map((c) => c.leans[f]);
      const kept = measured.officiating.crews.map((c) => c.leans[f]);
      expect(m.sd.measured).toBeCloseTo(popSd(kept), 3);
      expect(m.sd.widened).toBeCloseTo(popSd(w), 3);
      if (f === "TECHNICAL") {
        expect(m.tauRms).toBe(0);
        expect(m.factor).toBeNull();
        expect(w.every((l) => l === 50) && kept.every((l) => l === 50)).toBe(true);
        continue;
      }
      expect(m.factor!).toBeGreaterThan(1);
      expect(Math.abs(popSd(w) - 50 * m.tauRms)).toBeLessThan(0.5);
      for (let i = 0; i < 17; i++) for (let j = 0; j < 17; j++) if (kept[i]! < kept[j]!) expect(w[i]!).toBeLessThanOrEqual(w[j]!);
    }
    expect(measured.officiating.method.spread).toBe("measured");
    expect(widened.officiating.method.spread).toBe("widened");
    // Measured writes the measured leans: the settled copies, which widening moves.
    expect(widened.officiating.crews.map((c) => c.leans)).not.toEqual(measured.officiating.crews.map((c) => c.leans));
    // widenLeans on its own: a family with no spread keeps its leans, factor null.
    const flat = widenLeans([byFamily(() => 50), byFamily(() => 50)], byFamily(() => 0.1));
    expect(flat.factor).toEqual(Object.fromEntries(CREW_FAMILIES.map((f) => [f, null])));
    expect(flat.leans).toEqual([byFamily(() => 50), byFamily(() => 50)]);
  });
});

describe("the block and the league file (ADR-093 step 1b)", () => {
  const rows = madeUpRows();

  it("is deterministic: the same rows give the same bytes, shuffled rows too, and asOf comes from the input", () => {
    const run = (r: ReturnType<typeof madeUpRows>, asOf = "2026-11-07", spread: CopySpread = "measured") =>
      JSON.stringify(standInCrews({ season: 2026, asOf, counts: countRows(r), taken: new Set(), sealed: {}, spread }).officiating);
    const once = run(rows);
    expect(run(rows)).toBe(once);
    const mixed = {
      schedules: shuffled(rows.schedules, "schedules"),
      officials: shuffled(rows.officials, "officials"),
      plays: Object.fromEntries(SEASONS.map((s) => [s, shuffled(rows.plays[s]!, `plays ${s}`)])),
    };
    expect(run(mixed)).toBe(once);
    expect(JSON.parse(run(rows, "2030-01-01")).asOf).toBe("2030-01-01");
    expect(run(rows, "2030-01-01").replace("2030-01-01", "2026-11-07")).toBe(once);
    expect(run(mixed, "2026-11-07", "widened")).toBe(run(rows, "2026-11-07", "widened"));
    const block = JSON.parse(once) as StandInOfficiating;
    expect(block).toMatchObject({ version: STANDIN_OFFICIALS_VERSION, season: 2026, coverage: { played: 52, withReferee: 51 } });
    expect(block.method.windows).toEqual({ leans: LEAN_WINDOW.map((d) => 2026 + d), spread: SPREAD_WINDOW.map((d) => 2026 + d) });
    expect(Object.values(block.games)).toEqual(Array.from({ length: 17 }, () => ({ 2025: 10, 2026: 3 })));
  });

  it("holds none of the input's names, game ids or team codes", () => {
    const { officiating } = standInCrews({ season: 2026, asOf: "2026-11-07", counts: countRows(rows), taken: new Set(), sealed: {}, spread: "measured" });
    const text = JSON.stringify(officiating);
    // "Made Up" covers every made-up person's name; the block's own keys (withReferee, referee) are no one's.
    for (const real of ["Made Up", "Umpire", "Coach", "Madeup", "Pretend", "g2025-", "old-g", "AAA", "BBB"]) expect(text).not.toContain(real);
    for (const k of Object.keys(countRows(rows)[3]!.referees)) expect(text).not.toContain(k);
  });

  const blockA = build().officiating;
  const blockB = build({ spread: "widened" }).officiating;

  it("withOfficiating puts in or replaces only the block, just before startingDevelopment; runs twice the same, commutes, and refuses another format", () => {
    const plain = small();
    const put = withOfficiating(plain, blockA);
    expect(Object.keys(put)).toEqual(["format", "season", "snapshotDate", "league", "picks", "picksSource", "officiating"]);
    const { officiating: _a, ...rest } = put;
    expect(serializeLeagueFile(rest)).toBe(serializeLeagueFile(plain));
    const both = serializeLeagueFile(withStartingDevelopment(withOfficiating(plain, blockA)));
    expect(serializeLeagueFile(withOfficiating(withStartingDevelopment(plain), blockA))).toBe(both);
    const parsed = JSON.parse(both) as LeagueFileLike;
    expect(Object.keys(parsed)).toEqual(["format", "season", "snapshotDate", "league", "picks", "picksSource", "officiating", "startingDevelopment"]);
    expect(serializeLeagueFile(withOfficiating(parsed, blockA))).toBe(both);
    expect(serializeLeagueFile(withStartingDevelopment(parsed))).toBe(both);
    // Replaced in place.
    const replaced = withOfficiating(parsed, blockB);
    expect(Object.keys(replaced)).toEqual(Object.keys(parsed));
    expect(replaced.officiating).toEqual(blockB);
    const { officiating: _b, ...left } = replaced;
    const { officiating: _c, ...was } = parsed;
    expect(serializeLeagueFile(left)).toBe(serializeLeagueFile(was));
    expect(() => withOfficiating({ ...plain, format: "made-up/1" }, blockA)).toThrow(/not a stand-in league file/);
  });

  it("officiatingWrites, standin-officials' writes: each file only when it changes, no byte outside the block; refuses a file its serializer would not write, another format, and a key a rewrite would move", () => {
    const path = "/made/up/leagues/standin.json";
    const text = serializeLeagueFile(withStartingDevelopment(small()));
    const sealed = build().sealed;
    const sealedText = JSON.stringify(sealed, null, 1) + "\n";
    const outside = (t: string) => {
      const { officiating: _o, ...rest } = JSON.parse(t) as LeagueFileLike;
      return serializeLeagueFile(rest);
    };
    // A first run: the block put in just before startingDevelopment, and the referees' sealed table written.
    const first = officiatingWrites({ path, text, officiating: blockA, sealed, sealedText: undefined });
    expect(first).toEqual({ league: serializeLeagueFile(withOfficiating(readLeagueText(text, path), blockA)), sealed: sealedText });
    expect(Object.keys(JSON.parse(first.league!) as object).slice(-2)).toEqual(["officiating", "startingDevelopment"]);
    expect(outside(first.league!)).toBe(text);
    // A second run on what the first wrote: nothing to write.
    expect(officiatingWrites({ path, text: first.league!, officiating: blockA, sealed, sealedText })).toEqual({ league: null, sealed: null });
    // The block replaced: it alone moves, and the sealed table, as it was, is not written.
    const replaced = officiatingWrites({ path, text: first.league!, officiating: blockB, sealed, sealedText });
    expect(replaced.sealed).toBeNull();
    expect((JSON.parse(replaced.league!) as LeagueFileLike).officiating).toEqual(blockB);
    expect(outside(replaced.league!)).toBe(text);
    // The sealed table changed and the block not: the table alone is written.
    const more: SealedTable = { ...sealed, [nameKey("Sam Madeup")]: { id: "o:18", name: "Tom Pretend" } };
    expect(officiatingWrites({ path, text: first.league!, officiating: blockA, sealed: more, sealedText }))
      .toEqual({ league: null, sealed: JSON.stringify(more, null, 1) + "\n" });
    // Refused before anything is written: the file printed another way, or with no newline at the end, and another format.
    const refused = (t: string) => () => officiatingWrites({ path, text: t, officiating: blockA, sealed, sealedText: undefined });
    const notAsWritten = `${path} is not as the league file's serializer writes it, so a rewrite would move other bytes: nothing written`;
    expect(refused(JSON.stringify(JSON.parse(text), null, 1) + "\n")).toThrow(notAsWritten);
    expect(refused(text.slice(0, -1))).toThrow(notAsWritten);
    expect(() => readLeagueText(JSON.stringify(JSON.parse(text), null, 1) + "\n", path)).toThrow(notAsWritten);
    const other = serializeLeagueFile({ ...(JSON.parse(text) as object), format: "made-up/1" });
    expect(refused(other)).toThrow(/^not a stand-in league file \(format "made-up\/1"/);
    expect(() => readLeagueText(other, path)).toThrow(/^not a stand-in league file/);
    // A key after startingDevelopment reads back as written, but withOfficiating would put the block after it
    // and the key before startingDevelopment: the input the guard on the bytes outside the block refuses.
    const later = serializeLeagueFile({ ...(JSON.parse(text) as object), laterKey: "made up" });
    expect(readLeagueText(later, path).laterKey).toBe("made up");
    expect(refused(later)).toThrow(`${path} would change outside its officiating block; nothing written`);
  });

  it("importRealWrites, import-real's writes: the file with the copied crews' block just before startingDevelopment, or with none; the referees' sealed table only when it changes", () => {
    const file = withStartingDevelopment(small());
    const sealed = build().sealed;
    const sealedText = JSON.stringify(sealed, null, 1) + "\n";
    const withCrews = serializeLeagueFile(withOfficiating(file, blockA));
    expect(Object.keys(JSON.parse(withCrews) as object).slice(-2)).toEqual(["officiating", "startingDevelopment"]);
    expect(importRealWrites(file, { officiating: blockA, sealed }, undefined)).toEqual({ league: withCrews, referees: sealedText });
    expect(importRealWrites(file, { officiating: blockA, sealed }, sealedText)).toEqual({ league: withCrews, referees: null });
    const more: SealedTable = { ...sealed, [nameKey("Sam Madeup")]: { id: "o:18", name: "Tom Pretend" } };
    expect(importRealWrites(file, { officiating: blockA, sealed: more }, sealedText)).toEqual({ league: withCrews, referees: JSON.stringify(more, null, 1) + "\n" });
    // No crews: the file as built, with no block, and the referees' table left as it is, or not there.
    for (const before of [sealedText, undefined]) expect(importRealWrites(file, null, before)).toEqual({ league: serializeLeagueFile(file), referees: null });
    // standin-officials on the file import-real wrote, with the same crews, writes nothing.
    expect(officiatingWrites({ path: "/made/up/leagues/standin.json", text: withCrews, officiating: blockA, sealed, sealedText }))
      .toEqual({ league: null, sealed: null });
  });

  it("officialsTaken holds every name of its four inputs, and a name only in the players' sealed table is never drawn for a referee", () => {
    const taken = officialsTaken({
      snapshotNames: ["Made Up Umpire 01", "Made Up Coach 01"], standInNames: ["Made Up Player 01"],
      playersSealed: { g1: { id: "r:1", name: "Made Up Player 02" } }, officialsSealed: { k: { id: "o:01", name: "Made Up Referee 99" } },
    });
    expect([...taken].sort()).toEqual(["Made Up Coach 01", "Made Up Player 01", "Made Up Player 02", "Made Up Referee 99", "Made Up Umpire 01"]);
    const alone = build().sealed[KEY(1)]!.name;
    const playersSealed: SealedTable = { g7: { id: "r:7", name: alone } };
    const avoided = build({ taken: officialsTaken({ snapshotNames: [], standInNames: [], playersSealed, officialsSealed: {} }) });
    expect(avoided.sealed[KEY(1)]!.name).not.toBe(alone);
    expect(avoided.officiating.crews.map((c) => c.referee)).not.toContain(alone);
  });

  it("crewsOfSnapshot, both commands' one build: standInCrews over the taken set of the snapshot's names, the file's stand-ins and both sealed tables", () => {
    // A made-up snapshot, read: madeUpRows' counts (countRows) and names (snapshotNames).
    const snap = {
      manifest: { season: 2026, date: "2026-11-07", fetchedAt: "2026-11-07T01:30:00.000Z", files: {} },
      counts: countRows(rows),
      names: snapshotNames({ schedules: rows.schedules, officials: rows.officials, players: ["Made Up Player 90"] }).names,
    };
    const expected = (file: LeagueFileLike, sealed: SealedTables) => standInCrews({
      season: 2026, asOf: "2026-11-07", counts: snap.counts, spread: STANDIN_SPREAD, sealed: sealed.referees, before: file.officiating,
      taken: officialsTaken({
        snapshotNames: snap.names, standInNames: file.league.players.map((p) => p.bio.displayName),
        playersSealed: sealed.players, officialsSealed: sealed.referees,
      }),
    });
    const plain = small();
    const none: SealedTables = { players: {}, referees: {} };
    const first = crewsOfSnapshot(snap, plain, none);
    expect(first).toEqual(expected(plain, none));
    expect([...snapshotTaken(snap, plain, none)].sort()).toEqual([...snap.names, "Made Up Player x:1", "Made Up Player x:2"].sort());
    // A name only on the file and one only in the players' sealed table, each one the first run drew: neither is drawn.
    const onFile = first.sealed[KEY(1)]!.name;
    const inPlayers = first.sealed[KEY(2)]!.name;
    const file: LeagueFileLike = {
      ...plain,
      league: { ...plain.league, players: plain.league.players.map((p, i) => (i === 1 ? { ...p, bio: { ...p.bio, displayName: onFile } } : p)) },
    };
    const sealed: SealedTables = { players: { g9: { id: "r:9", name: inPlayers } }, referees: {} };
    const avoided = crewsOfSnapshot(snap, file, sealed);
    expect(avoided).toEqual(expected(file, sealed));
    expect(avoided.officiating.crews.map((c) => c.referee)).not.toContain(onFile);
    expect(avoided.officiating.crews.map((c) => c.referee)).not.toContain(inPlayers);
    // A name only in the referees' sealed table: referee 5 is new again, and a sealed referee with no game this season holds
    // the name referee 5 drew first. Referee 5 draws another, so the table never holds one name twice.
    const inReferees = first.sealed[KEY(5)]!.name;
    const others = Object.fromEntries(Object.entries(first.sealed).filter(([k]) => k !== KEY(5)));
    const idle: SealedTables = { players: {}, referees: { ...others, [nameKey("Made Up Referee 99")]: { id: "o:18", name: inReferees } } };
    const drawnAgain = crewsOfSnapshot(snap, plain, idle);
    expect(drawnAgain).toEqual(expected(plain, idle));
    expect(drawnAgain.report).toMatchObject({ minted: 1, missing: 1 });
    expect(drawnAgain.sealed[KEY(5)]!.name).not.toBe(inReferees);
    expect(new Set(Object.values(drawnAgain.sealed).map((s) => s.name)).size).toBe(Object.keys(drawnAgain.sealed).length);
    // A refresh: the referees' sealed table keeps every id and name, and the file's block before gives the kept count.
    const refresh: SealedTables = { players: {}, referees: first.sealed };
    const withBlock = withOfficiating(plain, first.officiating);
    const again = crewsOfSnapshot(snap, withBlock, refresh);
    expect(again).toEqual(expected(withBlock, refresh));
    expect(again.officiating).toEqual(first.officiating);
    expect(again.report).toMatchObject({ minted: 0, kept: 17 });
    // A name only in the snapshot (a real person's, say) that referee 3 drew first: a fresh build draws another.
    const inSnapshot = first.sealed[KEY(3)]!.name;
    const named = { ...snap, names: [...snap.names, inSnapshot] };
    expect(crewsOfSnapshot(named, plain, none).sealed[KEY(3)]!.name).not.toBe(inSnapshot);
    // A damaged referees' table, two referees under one id: the build stops before anything is written.
    const twice: SealedTables = { players: {}, referees: { ...first.sealed, [KEY(2)]: { ...first.sealed[KEY(2)]!, id: first.sealed[KEY(1)]!.id } } };
    expect(() => crewsOfSnapshot(snap, plain, twice)).toThrow(/not a league's \(crew o:\d\d appears twice\); nothing written/);
    // The block is the same with the block before or without it: only the kept count reads it.
    const without = crewsOfSnapshot(snap, plain, refresh);
    expect(without.officiating).toEqual(again.officiating);
    expect(without.report.kept).toBeNull();
  });

  it("table6Check: Table 6's crew SD and share on a hand-worked case, and the two sources' agreement rule", () => {
    const book = {
      a: { games: 12, holds: 30 },
      b: { games: 16, holds: 24 },
      c: { games: 12, holds: 36 },
      d: { games: MIN_SPREAD_GAMES - 1, holds: 90 }, // too few games: left out
    };
    // By hand: 90 holds in 40 games, 2.25 a game, so 27, 36 and 27 expected; ratios 10/9, 2/3 and 4/3 about their
    // mean 28/27 give squares summing to 168/729, so 84/729 over n − 1; the chance variances 1/27, 1/36, 1/27 average 11/324.
    const observed = 84 / 729;
    const chance = 11 / 324;
    expect(((10 / 9 - 28 / 27) ** 2 + (2 / 3 - 28 / 27) ** 2 + (4 / 3 - 28 / 27) ** 2) / 2).toBeCloseTo(observed, 12);
    const pairs: [string, string][] = [
      ["Sam Madeup", "sam madeup"], ["Sam Madeup", "Samuel Madeup"], ["Samuel Madeup", "Sam Madeup"],
      ["Sam Madeup", "Tom Madeup"], ["Sam Madeup", "Sam Madeup"],
    ];
    const check = table6Check({ seasons: [{ season: 2024, book }, { season: 2023, book: {} }], pairs });
    expect(check.seasons.map((s) => s.season)).toEqual([2023, 2024]);
    expect(check.seasons[1]!.referees).toBe(3);
    expect(check.seasons[1]!.sd).toBeCloseTo(Math.sqrt(observed - chance), 12);
    expect(check.seasons[1]!.share).toBeCloseTo((observed - chance) / observed, 12);
    expect(check.seasons[0]).toEqual({ season: 2023, referees: 0, sd: 0, share: 0 });
    // A referee with exactly the minimum of games is kept.
    const atMinimum = { e: { games: MIN_SPREAD_GAMES, holds: 20 }, f: { games: MIN_SPREAD_GAMES, holds: 30 } };
    expect(table6Check({ seasons: [{ season: 2025, book: atMinimum }], pairs: [] }).seasons[0]!.referees).toBe(2);
    expect(check.agreement).toEqual({ compared: 5, agree: 2, differ: 1, setAside: 2, spellingPairs: 2 });
    const a = check.agreement;
    expect(a.agree + a.differ + a.setAside).toBe(a.compared);
    // The pairs come from both sources, played regular-season games only.
    const schedules = [game("g2025-001", 2025, "Sam Madeup"), game("g2025-002", 2025, "Tom Madeup"), game("g2025-003", 2025, null),
      game("g2025-004", 2025, "Sam Madeup", { game_type: "POST" })];
    const officials: OfficialRow[] = [
      { game_id: "old-g2025-001", official_name: "Samuel Madeup", position: "Referee", season: 2025 },
      { game_id: "old-g2025-001", official_name: "Made Up Umpire 01", position: "Umpire", season: 2025 },
      { game_id: "old-g2025-003", official_name: "Sam Madeup", position: "Referee", season: 2025 },
      { game_id: "old-g2025-004", official_name: "Sam Madeup", position: "Referee", season: 2025 },
    ];
    expect(refereePairs(schedules, officials, [2025])).toEqual([["Sam Madeup", "Samuel Madeup"]]);
  });
});

describe("the officials snapshot folder (ADR-093 step 1b)", () => {
  // Made-up bytes stand in for the downloads: the manifest's checks run on them, and no parquet reader can read them.
  const download = async (url: string) => new TextEncoder().encode(`made-up bytes of ${url}`);
  const day = (d: number) => new Date(`2026-11-${String(d).padStart(2, "0")}T01:30:00Z`);

  /** Each file in a folder, name to bytes (base64), to see that a folder is left as it was. */
  const bytesOf = async (dir: string) =>
    Object.fromEntries(await Promise.all((await readdir(dir)).sort().map(async (f) => [f, (await readFile(join(dir, f))).toString("base64")])));
  const counting = () => {
    const seen = { calls: 0 };
    const fn: Download = async (url) => { seen.calls++; return download(url); };
    return { seen, fn };
  };

  it("fetchOfficialsSnapshot refuses a day whose folder is kept, downloading nothing and leaving it byte for byte; a failed fetch leaves no dated folder, and one that ends moves into place whole", async () => {
    const root = join(await mkdtemp(join(tmpdir(), "ff-officials-")), "officials");
    const kept = await fetchOfficialsSnapshot({ root, season: 2026, now: day(7), download });
    expect(kept.dir).toBe(join(root, "2026-11-07"));
    expect(await readdir(root)).toEqual(["2026-11-07"]);
    expect(await verifySnapshot(kept.dir)).toEqual(kept.manifest);
    expect(Object.keys(kept.manifest.files)).toEqual(Object.keys(officialsFiles(2026)));
    const before = await bytesOf(kept.dir);
    // A second fetch the same day, hours later: refused before any download, naming the folder and --snapshot.
    const again = counting();
    await expect(fetchOfficialsSnapshot({ root, season: 2026, now: new Date("2026-11-07T21:00:00Z"), download: again.fn })).rejects.toThrow(
      `the officials snapshot ${kept.dir} is there already, and a fetch today would write over it: to read it again, run with --snapshot ${kept.dir}`);
    expect(again.seen.calls).toBe(0);
    expect(await bytesOf(kept.dir)).toEqual(before);
    expect(await readdir(root)).toEqual(["2026-11-07"]);
    // The next day, a download that fails at its third file: no dated folder and no staging folder left, and the newest is the kept one.
    let n = 0;
    const failing: Download = async (url) => {
      if (++n === 3) throw new Error("download made-up: HTTP 503");
      return download(url);
    };
    await expect(fetchOfficialsSnapshot({ root, season: 2026, now: day(8), download: failing })).rejects.toThrow("HTTP 503");
    expect(n).toBe(3);
    expect(await readdir(root)).toEqual(["2026-11-07"]);
    expect(await latestSnapshot(root)).toBe(kept.dir);
    expect(await bytesOf(kept.dir)).toEqual(before);
    // A staging folder a stopped run left is cleared first; then the fetch ends and the folder moves into place whole.
    await mkdir(join(root, ".fetching", "2026-11-08"), { recursive: true });
    await writeFile(join(root, ".fetching", "2026-11-08", "left-over.parquet"), "made-up bytes left over");
    const next = await fetchOfficialsSnapshot({ root, season: 2026, now: day(8), download });
    expect((await readdir(root)).sort()).toEqual(["2026-11-07", "2026-11-08"]);
    expect(await latestSnapshot(root)).toBe(next.dir);
    expect(await verifySnapshot(next.dir)).toEqual(next.manifest);
    expect((await readdir(next.dir)).sort()).toEqual([...Object.keys(officialsFiles(2026)).map((k) => `${k}.parquet`), "manifest.json"].sort());
    expect(await bytesOf(kept.dir)).toEqual(before);
  });

  it("officialsSnapshotDir: --snapshot's folder whatever else is asked, else today's fetched with --fetch, else the newest kept, or none", async () => {
    const root = join(await mkdtemp(join(tmpdir(), "ff-officials-")), "officials");
    const net = counting();
    const ask = (given: string | undefined, fetch: boolean, d = 7) =>
      officialsSnapshotDir({ root, given, fetch, season: 2026, now: day(d), download: net.fn });
    expect(await ask(undefined, false)).toBeNull();
    expect(await ask("/made/up/officials/2026-11-01", true)).toBe("/made/up/officials/2026-11-01");
    expect(await ask("/made/up/officials/2026-11-01", false)).toBe("/made/up/officials/2026-11-01");
    expect(net.seen.calls).toBe(0);
    expect(await ask(undefined, true)).toBe(join(root, "2026-11-07"));
    expect(net.seen.calls).toBe(Object.keys(officialsFiles(2026)).length);
    expect(await ask(undefined, false, 9)).toBe(join(root, "2026-11-07"));
    await expect(ask(undefined, true)).rejects.toThrow(/is there already/);
    expect(net.seen.calls).toBe(Object.keys(officialsFiles(2026)).length);
  });

  it("readOfficialsSnapshot refuses a folder with a changed file, and one that is not an officials snapshot, before any row is read", async () => {
    const root = join(await mkdtemp(join(tmpdir(), "ff-officials-")), "officials");
    const { dir } = await fetchSnapshot({ root, season: 2026, now: day(7), files: officialsFiles(2026), download });
    const path = join(dir, "schedules.parquet");
    const changed = Buffer.from(await readFile(path));
    changed[0] = changed[0]! ^ 1;
    await writeFile(path, changed);
    await expect(readOfficialsSnapshot(dir, 2026)).rejects.toThrow(/schedules\.parquet is not the file that was fetched/);
    // import-real's own kind of snapshot: it has a players file, but no schedules, officials table or play-by-play.
    const other = await fetchSnapshot({ root: await mkdtemp(join(tmpdir(), "ff-real-")), season: 2025, now: day(7), files: snapshotFiles(2025), download });
    await expect(readOfficialsSnapshot(other.dir, 2025)).rejects.toThrow(/has no schedules file: is it an officials snapshot\?/);
  });

  it("readOfficialsSnapshot counts each season from its own plays, through the loaders' own columns, and takes every source's names", async () => {
    const rows = madeUpRows();
    const root = join(await mkdtemp(join(tmpdir(), "ff-officials-")), "officials");
    const { dir } = await fetchSnapshot({ root, season: 2026, now: day(7), files: officialsFiles(2026), download });
    const players = ["Made Up Player 01", "Made Up Player 02"].map((display_name, i) => ({ display_name, gsis_id: `made-up-${i}` }));
    const files = {
      schedules: rows.schedules, officials: rows.officials, players, ...Object.fromEntries(SEASONS.map((s) => [`pbp${s}`, rows.plays[s]!])),
    };
    const snap = await readOfficialsSnapshot(dir, 2026, projecting(files));
    // Each season counted from that season's plays alone, as countSeason counts the whole rows.
    const games = scheduledGames(rows.schedules, SEASONS);
    const book = bookReferees(rows.officials);
    expect(snap.counts.map((c) => c.season)).toEqual(SEASONS);
    for (const c of snap.counts) expect(c, String(c.season)).toEqual(countSeason(c.season, rows.plays[c.season]!, games, book));
    expect(Object.keys(snap.counts[0]!.book)).toHaveLength(17); // the port check's counts, by the plays' old-style ids
    // Every source's names: an official's, a referee's, a coach's and a player's.
    for (const name of ["Made Up Umpire 01", REFEREE(1), "Made Up Coach 02", "Made Up Player 02"]) expect(snap.names, name).toContain(name);
    expect(snap.namesBySource).toEqual({ officials: 18, referees: 17, coaches: 2, players: 2 });
    expect(snap.check).toEqual({
      seasons: snap.counts.slice(0, 3).map((c) => ({ season: c.season, book: c.book })),
      pairs: refereePairs(rows.schedules, rows.officials, [2023, 2024, 2025]),
    });
  });

  it("copiedCrews, import-real's block: none, and why, without an officials snapshot or when the newest is of another season; else the newest, built as standin-officials builds it", async () => {
    const cache = await mkdtemp(join(tmpdir(), "ff-cache-"));
    const root = join(cache, "officials");
    const sealed: SealedTables = { players: {}, referees: {} };
    expect(await copiedCrews(cache, small(), sealed)).toEqual({
      kind: "none", why: "no officials snapshot for 2026: this file has no officiating block; run standin-officials -- --fetch",
    });
    // A 2026 snapshot, then a newer one of 2025: the newest decides, and it is of another season.
    await fetchSnapshot({ root, season: 2026, now: day(6), files: officialsFiles(2026), download });
    await fetchSnapshot({ root, season: 2025, now: day(7), files: officialsFiles(2025), download });
    expect(await copiedCrews(cache, small(), sealed)).toEqual({
      kind: "none",
      why: "the newest officials snapshot (2026-11-07) is of 2025, not 2026: this file has no officiating block; " +
        "run standin-officials -- --snapshot <a folder of 2026> or --fetch",
    });
    // A newer one of 2026 is read: past its manifest's check, its made-up bytes are no parquet file.
    await fetchSnapshot({ root, season: 2026, now: day(8), files: officialsFiles(2026), download });
    await expect(copiedCrews(cache, small(), sealed)).rejects.toThrow(/parquet/);
    // Through a stand-in reader of made-up rows: the crews standin-officials builds from that folder.
    const rows = madeUpRows();
    const read = projecting({
      schedules: rows.schedules, officials: rows.officials, players: [{ display_name: "Made Up Player 90" }],
      ...Object.fromEntries(SEASONS.map((s) => [`pbp${s}`, rows.plays[s]!])),
    });
    const copied = await copiedCrews(cache, small(), sealed, read);
    expect(copied.kind).toBe("copied");
    expect(copied).toEqual({ kind: "copied", crews: crewsOfSnapshot(await readOfficialsSnapshot(join(root, "2026-11-08"), 2026, read), small(), sealed) });
    // Both sealed tables reach the build: referee 1 is new again, and the name it drew first is a player's now, so it moves.
    if (copied.kind !== "copied") throw new Error("no crews");
    const drawn = copied.crews.sealed[KEY(1)]!.name;
    const inUse: SealedTables = {
      players: { g9: { id: "r:9", name: drawn } },
      referees: Object.fromEntries(Object.entries(copied.crews.sealed).filter(([k]) => k !== KEY(1))),
    };
    const again = await copiedCrews(cache, small(), inUse, read);
    expect(again).toEqual({ kind: "copied", crews: crewsOfSnapshot(await readOfficialsSnapshot(join(root, "2026-11-08"), 2026, read), small(), inUse) });
    if (again.kind !== "copied") throw new Error("no crews");
    expect(again.crews.report.minted).toBe(1);
    expect(again.crews.sealed[KEY(1)]!.name).not.toBe(drawn);
    // The snapshot's own names reach the build: the players list names the first draw, so it moves.
    const readNamed = projecting({
      schedules: rows.schedules, officials: rows.officials, players: [{ display_name: "Made Up Player 90" }, { display_name: drawn }],
      ...Object.fromEntries(SEASONS.map((s) => [`pbp${s}`, rows.plays[s]!])),
    });
    const named = await copiedCrews(cache, small(), sealed, readNamed);
    if (named.kind !== "copied") throw new Error("no crews");
    expect(named.crews.sealed[KEY(1)]!.name).not.toBe(drawn);
  });
});
