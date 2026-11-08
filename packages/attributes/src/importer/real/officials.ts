/**
 * THE STAND-IN LEAGUE'S CREWS (ADR-093 step 1b; §15 Q3, §16 A11): the league's 17 officiating crews,
 * each a copy of one real NFL crew under a made-up referee name, kept in the league file as its
 * `officiating` block (`withOfficiating`, `leagueFile.ts`). A bare § is a section of ADR-093.
 *
 * A copy's lean on a family is its crew's called rate over the league's, per scrimmage snap, over last
 * season and this one, pulled toward the league as far as the records are thin (the pull is set by the
 * real crews' own spread beyond chance in the three seasons before this one), on the contract's scale
 * (lean = 50 x ratio, §16 A3), then settled as franchise settles its drawn crews (§16 A4). No draw
 * touches a lean: the leans are a pure function of the counts. The referees' names are drawn on
 * attributes' own lists, each from a seed of its own.
 *
 * Pure, no I/O: `readOfficialsSnapshot` (`officialsSnapshot.ts`) reads the snapshot for both commands,
 * `standin-officials` (`officialsMain.ts`) and `import-real` (`main.ts`). Real names (the schedules'
 * referees and coaches, every official in the officials table, every real player, and the players
 * named in the plays' descriptions) enter here only through those rows, to count flags and to keep
 * made-up names off real ones, and never leave: the block holds stand-in ids, made-up names, kinds,
 * counts and leans only, as `deadMoney.ts` keeps its real names to itself. The referees' sealed table
 * (real key to stand-in) is the one join back, and it stays in the local cache, as the players' does.
 */
import { createHash } from "node:crypto";
import {
  createRng, officiatingCrewId,
  type CrewLeanFamily, type FoulKind, type OfficiatingCrew,
} from "@ff/contracts";
import { drawName } from "../../fictional/names.js";
import { nameKey } from "./deadMoney.js";
import type { OfficialRow, PlayRow, ScheduleRow } from "./rows.js";
import type { SealedTable } from "./standins.js";

/** The block's version. A new one needs a matching change to calibration's reader, which copies this list. */
export const STANDIN_OFFICIALS_VERSION = "standin-officials/1";

/** How widely the copies spread: as measured, or widened to the real crews' own one-season spread. */
export type CopySpread = "measured" | "widened";

/**
 * The owner's answer at step 1b (§15, §16 A11): the spread both commands write. Until the owner
 * answers, the recommended one. Both spreads are computed and recorded on every run.
 */
export const STANDIN_SPREAD: CopySpread = "measured";

/** REAL: the NFL's 17 crews, one to a referee; franchise's `CREW_RULES.count`, which attributes may not import. */
export const CREW_COUNT = 17;

/** The five families a crew leans on, in the order franchise draws them (`CREW_RULES.families`). */
export const CREW_FAMILIES = Object.freeze(
  ["LINE_HOLDING", "COVERAGE", "PLAYER_SAFETY", "TECHNICAL", "SNAP"] as const satisfies readonly CrewLeanFamily[],
);
/** Compile-time only: a family that contracts adds and CREW_FAMILIES leaves out stops the compile here. */
type EveryFamilyListed = [Exclude<CrewLeanFamily, (typeof CREW_FAMILIES)[number]>] extends [never] ? true : never;
const everyFamilyListed: EveryFamilyListed = true;
void everyFamilyListed;

/** A scrimmage snap (ADR-093's real-numbers scripts): a kick, which no lean touches, never counts. */
export const SCRIMMAGE_PLAYS = Object.freeze(["pass", "run", "no_play", "qb_kneel", "qb_spike"] as const);

/** The lean window (CHOSEN): last season and this one, as offsets from the league file's season. */
export const LEAN_WINDOW = Object.freeze([-1, 0] as const);

/** The spread window (CHOSEN): the three complete seasons before this one. */
export const SPREAD_WINDOW = Object.freeze([-3, -2, -1] as const);

/** A referee's season enters the spread with this many games or more (ADR-093's real-numbers threshold). */
export const MIN_SPREAD_GAMES = 10;

/** The league's lean, the middle of the contract's 0 to 100. */
export const LEAGUE_LEAN = 50;

/**
 * §16 A1's table: each kind's family on a scrimmage snap, the engine's `SCRIMMAGE_FAMILY` written
 * again, since attributes may not import the engine. Exhaustive: a new kind does not compile here
 * until it is placed. Pinned to A1 in this package's test, as the engine's is in the engine's.
 */
export const KIND_FAMILY = Object.freeze({
  // SNAP: the count battle at the line.
  FALSE_START: "SNAP",
  DEFENSIVE_OFFSIDE: "SNAP",
  NEUTRAL_ZONE_INFRACTION: "SNAP",
  ENCROACHMENT: "SNAP",
  OFFENSIVE_OFFSIDE: "SNAP",
  DEFENSIVE_DELAY_OF_GAME: "SNAP",
  // TECHNICAL: the offense's lineup and the pass's form.
  DELAY_OF_GAME: "TECHNICAL",
  ILLEGAL_FORMATION: "TECHNICAL",
  ILLEGAL_SHIFT: "TECHNICAL",
  ILLEGAL_MOTION: "TECHNICAL",
  INELIGIBLE_DOWNFIELD_PASS: "TECHNICAL",
  OFFENSIVE_TOO_MANY_MEN_ON_FIELD: "TECHNICAL",
  DEFENSIVE_TOO_MANY_MEN_ON_FIELD: "TECHNICAL",
  INTENTIONAL_GROUNDING: "TECHNICAL",
  ILLEGAL_FORWARD_PASS: "TECHNICAL",
  // LINE_HOLDING: holds and illegal blocks.
  OFFENSIVE_HOLDING: "LINE_HOLDING",
  ILLEGAL_USE_OF_HANDS: "LINE_HOLDING",
  CHOP_BLOCK: "LINE_HOLDING",
  CLIPPING: "LINE_HOLDING",
  ILLEGAL_BLOCK_ABOVE_THE_WAIST: "LINE_HOLDING",
  // COVERAGE: the pass in the air.
  DEFENSIVE_PASS_INTERFERENCE: "COVERAGE",
  OFFENSIVE_PASS_INTERFERENCE: "COVERAGE",
  DEFENSIVE_HOLDING: "COVERAGE",
  ILLEGAL_CONTACT: "COVERAGE",
  // PLAYER_SAFETY: personal fouls and conduct.
  ROUGHING_THE_PASSER: "PLAYER_SAFETY",
  UNNECESSARY_ROUGHNESS: "PLAYER_SAFETY",
  FACE_MASK: "PLAYER_SAFETY",
  HORSE_COLLAR_TACKLE: "PLAYER_SAFETY",
  UNSPORTSMANLIKE_CONDUCT: "PLAYER_SAFETY",
  TAUNTING: "PLAYER_SAFETY",
  TRIPPING: "PLAYER_SAFETY",
} as const satisfies Record<FoulKind, CrewLeanFamily>);

/** A crew's five leans, keys in CREW_FAMILIES order. */
export type Leans = Record<CrewLeanFamily, number>;

/** The league file's `officiating` key (§16 A11): the stand-in league's 17 crews, copies of the real ones. */
export interface StandInOfficiating {
  readonly version: typeof STANDIN_OFFICIALS_VERSION;
  /** The season the crews stand in: the league file's `season`. */
  readonly season: number;
  /** The officials snapshot's date (its manifest's `date`), never the day the command ran. */
  readonly asOf: string;
  /** This season's regular-season games played so far, and how many have a referee in the schedules. */
  readonly coverage: { readonly played: number; readonly withReferee: number };
  /** How the leans were made; a change here means the block is stale (as `startingDevelopment.constants`). */
  readonly method: {
    readonly referee: "schedules";
    readonly unit: "scrimmage snap";
    readonly plays: readonly string[];
    readonly windows: { readonly leans: readonly number[]; readonly spread: readonly number[] };
    readonly minSpreadGames: number;
    /** §16 A1's placements, as counted. */
    readonly families: Readonly<Record<CrewLeanFamily, readonly FoulKind[]>>;
    readonly scale: string;
    readonly settle: string;
    /** The spread written. */
    readonly spread: CopySpread;
  };
  /** Per family: the spread beyond chance by season of the spread window and its RMS (ratio units), the mean pull, both spreads in points, the widening factor. */
  readonly measured: Readonly<Record<CrewLeanFamily, {
    readonly tau: readonly number[];
    readonly tauRms: number;
    readonly shrink: number;
    readonly sd: { readonly measured: number; readonly widened: number };
    readonly factor: number | null;
  }>>;
  /** Games behind each copy (crew id), by season of the lean window. */
  readonly games: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /** Exactly 17 contracts `OfficiatingCrew`s, in id order. */
  readonly crews: readonly OfficiatingCrew[];
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
const mean = (xs: readonly number[]): number => (xs.length === 0 ? 0 : sum(xs) / xs.length);
const popSd = (xs: readonly number[]): number => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
/** Every float the block records, to 3 places, so its bytes never hang on summation order. */
const round3 = (x: number): number => Math.round(x * 1000) / 1000;
/** One value a family, keys in CREW_FAMILIES order. */
const byFamily = <T>(value: (f: CrewLeanFamily) => T): Record<CrewLeanFamily, T> =>
  Object.fromEntries(CREW_FAMILIES.map((f) => [f, value(f)])) as Record<CrewLeanFamily, T>;
const leansOf = (lean: (f: CrewLeanFamily) => number): Leans => byFamily(lean);
const noFlags = (): Leans => leansOf(() => 0);
const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const seasonsOf = (season: number, window: readonly number[]): number[] => window.map((d) => season + d);

// --- Flags and kinds ----------------------------------------------------------------------------

/** What became of a flag: ADR-093's real-numbers scripts count every one, whatever its outcome. */
export type FlagOutcome = "enforced" | "declined" | "offsetting";

/** One flag in a play's description: the foul as written, the flagged team's code where it gives one, and the outcome. Never the player. */
export interface DescFlag {
  readonly foul: string;
  readonly team: string | null;
  readonly outcome: FlagOutcome;
}

/** The real-numbers scripts' pattern: the flagged player (group 1), the foul (2) and the rest up to the period (3). */
const FLAG = /(?:PENALTY|Penalty) on ([^,]+), ([^,]+), ([^.]*)/g;
const TEAM_CODE = /^[A-Z]{2,3}$/;

/** Every flag in a play's description. Group 1's player is read for the team code before "-" and dropped. */
export function flagsInDesc(desc: string | null): DescFlag[] {
  const out: DescFlag[] = [];
  for (const m of (desc ?? "").matchAll(FLAG)) {
    const team = m[1]!.trim().split("-")[0]!.trim();
    const rest = m[3]!;
    out.push({
      foul: m[2]!.trim(),
      team: TEAM_CODE.test(team) ? team : null,
      outcome: rest.startsWith("declined") ? "declined" : rest.includes("ffsetting") ? "offsetting" : "enforced",
    });
  }
  return out;
}

/**
 * A flag's kind from its name as the game books write it, by the contract's own rule (capitals, "_"
 * between the words, contracts `penalties.ts`), or undefined for a name that is none of the 31 kinds.
 */
export function kindOfFlag(name: string): FoulKind | undefined {
  const kind = name.trim().toUpperCase().replace(/[ -]+/g, "_");
  return Object.hasOwn(KIND_FAMILY, kind) ? (kind as FoulKind) : undefined;
}

/** Each family's kinds, in §16 A1's order: the block's `method.families`. */
export function familyKinds(): Record<CrewLeanFamily, FoulKind[]> {
  const out = byFamily((): FoulKind[] => []);
  for (const [kind, family] of Object.entries(KIND_FAMILY) as [FoulKind, CrewLeanFamily][]) out[family].push(kind);
  return out;
}

// --- Games and counts ---------------------------------------------------------------------------

/** The played regular-season games of the seasons read, and who refereed each, by the schedules alone. */
export interface ScheduledGames {
  /** game_id to season, for every played regular-season game of the seasons read. */
  readonly seasonOf: ReadonlyMap<string, number>;
  /** game_id to the referee's key (`nameKey` of the schedules' spelling), for the games with one. */
  readonly refereeOf: ReadonlyMap<string, string>;
}

/**
 * The schedules' games of `seasons`: regular season, played (a home score), and each one's referee by
 * key. Refuses, with counts only, when two spellings give one key: that would merge two people.
 */
export function scheduledGames(schedules: readonly ScheduleRow[], seasons: readonly number[]): ScheduledGames {
  const seasonOf = new Map<string, number>();
  const refereeOf = new Map<string, string>();
  const spellings = new Map<string, Set<string>>();
  for (const g of schedules) {
    if (!seasons.includes(g.season) || g.game_type !== "REG" || g.home_score == null) continue;
    const id = String(g.game_id);
    seasonOf.set(id, g.season);
    const spelled = g.referee?.trim() ?? "";
    const key = nameKey(spelled);
    if (key === "") continue;
    refereeOf.set(id, key);
    const set = spellings.get(key) ?? new Set<string>();
    set.add(spelled);
    spellings.set(key, set);
  }
  const twice = [...spellings.values()].filter((s) => s.size > 1).length;
  if (twice > 0) {
    throw new Error(`the schedules spell ${twice} referee key(s) two ways in ${seasons.join(", ")}: two spellings give one key, ` +
      `which could merge two people, so the run stops`);
  }
  return { seasonOf, refereeOf };
}

/** The officials table's referee for each game (its old-style id to their key), for the port check alone. */
export function bookReferees(officials: readonly OfficialRow[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of officials) {
    if (r.position !== "Referee" || r.official_name == null) continue;
    const key = nameKey(r.official_name);
    if (key === "") continue;
    const id = String(r.game_id);
    const had = out.get(id);
    // No game has two Referee rows today; should one ever, the smallest key, whatever the rows' order.
    if (had === undefined || key < had) out.set(id, key);
  }
  return out;
}

/** One referee's season: games refereed, the scrimmage snaps in them, and their flags by family. */
export interface RefereeSeason {
  readonly games: number;
  readonly snaps: number;
  readonly flags: Readonly<Leans>;
}

/** One season's counts, as the copies read them. */
export interface SeasonCounts {
  readonly season: number;
  /** Regular-season games played, and how many have a referee in the schedules. */
  readonly played: number;
  readonly withReferee: number;
  /** By referee key, over the games they refereed; a game with no referee counts for no one. */
  readonly referees: Readonly<Record<string, RefereeSeason>>;
  /** Every flag on a scrimmage snap of a played regular-season game, refereed or not, and how many have a kind. */
  readonly flagged: { readonly all: number; readonly withKind: number };
  /** Flags with no kind, by the foul's name as written (counted in no family). */
  readonly kindless: Readonly<Record<string, number>>;
  /** The port check's counts, by the officials table's referee for the game: games, and offensive holds on scrimmage snaps. */
  readonly book: Readonly<Record<string, { readonly games: number; readonly holds: number }>>;
}

const SCRIMMAGE = new Set<string>(SCRIMMAGE_PLAYS);

/**
 * One season's counts from its plays: regular-season scrimmage snaps of played games only, every flag
 * whatever its outcome, each counted for the game's referee in the schedules. `book` (old-style game
 * id to the officials table's referee, `bookReferees`) feeds the port check.
 */
export function countSeason(
  season: number,
  plays: readonly PlayRow[],
  games: ScheduledGames,
  book: ReadonlyMap<string, string> = new Map(),
): SeasonCounts {
  let played = 0;
  let withReferee = 0;
  const referees = new Map<string, { games: number; snaps: number; flags: Leans }>();
  for (const [id, s] of games.seasonOf) {
    if (s !== season) continue;
    played++;
    const key = games.refereeOf.get(id);
    if (key === undefined) continue;
    withReferee++;
    const r = referees.get(key) ?? { games: 0, snaps: 0, flags: noFlags() };
    r.games++;
    referees.set(key, r);
  }
  let all = 0;
  let withKind = 0;
  const kindless = new Map<string, number>();
  const bookGames = new Map<string, Set<string>>();
  const holds = new Map<string, number>();
  for (const p of plays) {
    const id = String(p.game_id);
    if (p.season_type !== "REG" || games.seasonOf.get(id) !== season) continue;
    const bookKey = p.old_game_id == null ? undefined : book.get(String(p.old_game_id));
    if (bookKey !== undefined) bookGames.set(bookKey, (bookGames.get(bookKey) ?? new Set<string>()).add(id));
    if (p.play_type == null || !SCRIMMAGE.has(p.play_type)) continue;
    const key = games.refereeOf.get(id);
    const r = key === undefined ? undefined : referees.get(key);
    if (r !== undefined) r.snaps++;
    for (const flag of flagsInDesc(p.desc)) {
      all++;
      const kind = kindOfFlag(flag.foul);
      if (kind === undefined) {
        kindless.set(flag.foul, (kindless.get(flag.foul) ?? 0) + 1);
        continue;
      }
      withKind++;
      if (r !== undefined) r.flags[KIND_FAMILY[kind]]++;
      if (bookKey !== undefined && kind === "OFFENSIVE_HOLDING") holds.set(bookKey, (holds.get(bookKey) ?? 0) + 1);
    }
  }
  const sorted = <T>(m: ReadonlyMap<string, T>): Record<string, T> => Object.fromEntries([...m].sort(([a], [b]) => byText(a, b)));
  return {
    season, played, withReferee,
    referees: sorted(referees),
    flagged: { all, withKind },
    kindless: sorted(kindless),
    book: sorted(new Map([...bookGames].map(([k, g]) => [k, { games: g.size, holds: holds.get(k) ?? 0 }]))),
  };
}

/** The flags no kind takes, as the printout shows them. */
export interface KindlessShown {
  /** Each name shown, with its flags: most flags first, then by name. */
  readonly shown: readonly (readonly [string, number])[];
  /** The names not shown, and their flags. */
  readonly hidden: { readonly names: number; readonly flags: number };
}

/** A captured name reads as a foul's: from a letter, then letters, spaces, apostrophes, parentheses and hyphens. */
const FOUL_NAME = /^[A-Za-z][A-Za-z' ()-]*$/;

/**
 * The kindless foul names the officials snapshot of 2026-11-07 shows (A3's printout; plan-v2 §5.3): the rule
 * book's names for flags no kind takes. With the 31 kinds' names they give every word a shown name may hold.
 */
const KINDLESS_FOULS = Object.freeze([
  "Illegal Blindside Block", "Low Block", "Disqualification", "Running Into the Kicker", "Illegal Touch Pass", "Roughing the Kicker",
  "Player Out of Bounds on Kick", "Lowering the Head to Make Forcible Contact", "Leverage", "Ineligible Downfield Kick",
  "Illegal Substitution", "Hip Drop Tackle", "Illegal Bat", "Illegal Crackback", "Illegal Touch Kick", "Leaping",
  "Illegal Forward Handoff", "Illegal Peelback", "Kick Catch Interference",
]);

/**
 * A name's words: its runs of letters, lowercased (a parenthesis or an apostrophe is no word). Unlike
 * `nameKey`, it keeps Jr, Sr and II to V, so a suffix is a word no foul's name holds.
 */
const wordsOf = (name: string): string[] => name.toLowerCase().match(/[a-z]+/g) ?? [];

/** The words a shown foul name may hold: those of the 31 kinds' names and of KINDLESS_FOULS. A new foul name needs its words here. */
const FOUL_WORDS: ReadonlySet<string> = new Set(
  [...Object.keys(KIND_FAMILY).map((k) => k.replace(/_/g, " ")), ...KINDLESS_FOULS].flatMap(wordsOf),
);

/**
 * The flags no kind takes, summed over the seasons read, for the printout. Their names are free text
 * captured from the plays' descriptions, so a name is shown only when it reads as a foul's name, every
 * word of it (`wordsOf`, so a Jr or a II counts) is a foul's word (FOUL_WORDS), and it neither holds a
 * taken name as whole words nor is part of one (a bare surname or first name, say). Every other flag
 * is counted under names not shown. So a captured name with any word that no foul's name holds, such
 * as part of a person's name or a name suffix, never reaches the printout, whatever the taken set
 * holds; a foul's name not on the list is counted there too, until its words are added.
 */
export function kindlessShown(counts: readonly SeasonCounts[], taken: Iterable<string>): KindlessShown {
  const all = new Map<string, number>();
  for (const c of counts) for (const [name, n] of Object.entries(c.kindless)) all.set(name, (all.get(name) ?? 0) + n);
  const keys = [...new Set([...taken].map(nameKey))].filter((k) => k !== "").map((k) => ` ${k} `);
  const touchesAName = (name: string): boolean => {
    const key = nameKey(name);
    if (key === "") return true;
    const k = ` ${key} `;
    return keys.some((t) => k.includes(t) || t.includes(k));
  };
  const foulsWordsOnly = (name: string): boolean => {
    const words = wordsOf(name);
    return words.length > 0 && words.every((w) => FOUL_WORDS.has(w));
  };
  const shown: [string, number][] = [];
  let names = 0;
  let flags = 0;
  for (const [name, n] of [...all].sort(([a, x], [b, y]) => y - x || byText(a, b))) {
    if (FOUL_NAME.test(name) && foulsWordsOnly(name) && !touchesAName(name)) shown.push([name, n]);
    else {
      names++;
      flags += n;
    }
  }
  return { shown, hidden: { names, flags } };
}

// --- From counts to leans -----------------------------------------------------------------------

/** One referee's season in a spread: games, flags of one family and the flags the league's rate expects. */
export interface SpreadRow {
  readonly games: number;
  readonly flags: number;
  readonly expected: number;
}

function beyondChance(rows: readonly SpreadRow[]): { observed: number; chance: number; beyond: number; referees: number } {
  const used = rows.filter((r) => r.games >= MIN_SPREAD_GAMES && r.expected > 0);
  const n = used.length;
  if (n < 2) return { observed: 0, chance: 0, beyond: 0, referees: n };
  const x = used.map((r) => r.flags / r.expected);
  const center = mean(x);
  const observed = sum(x.map((v) => (v - center) ** 2)) / (n - 1);
  const chance = mean(used.map((r) => 1 / r.expected));
  return { observed, chance, beyond: Math.max(observed - chance, 0), referees: n };
}

/**
 * τ² of one season and family (in ratio units): over the referees with MIN_SPREAD_GAMES games or more,
 * the sample variance (n − 1) of their ratios N ÷ E about the ratios' plain mean, less the mean chance
 * variance 1 ÷ E, floored at 0. Give the rows in a fixed order (by key) for the same bits every run.
 */
export function spreadBeyondChance(rows: readonly SpreadRow[]): number {
  return beyondChance(rows).beyond;
}

/** The pull's weight on a crew's own record: B = τ² ÷ (τ² + 1 ÷ E); 0 with no spread or no expected flags. */
export function shrinkFactor(tau2: number, expected: number): number {
  if (!(tau2 > 0) || !(expected > 0)) return 0;
  return tau2 / (tau2 + 1 / expected);
}

/** A ratio to the league's rate on the contract's scale (§16 A3): lean ÷ 50 is the crew's rate over the league's. */
export function leanOf(ratio: number): number {
  return LEAGUE_LEAN * ratio;
}

/** Franchise's settle (§16 A4): each family's leans re-centered on 50, clamped to 0 to 100 and rounded to whole points. */
export function settleLeans(raw: readonly Readonly<Leans>[]): Leans[] {
  if (raw.length === 0) return [];
  const shift = leansOf((f) => LEAGUE_LEAN - mean(raw.map((l) => l[f])));
  return raw.map((l) => leansOf((f) => Math.round(clamp(l[f] + shift[f], 0, 100))));
}

/**
 * Each family's leans widened to the real crews' own one-season spread: the re-centered unrounded
 * leans scaled about 50 by k = 50 × τRms ÷ their population SD, then settled, so every crew keeps its
 * rank. A family with nothing to widen (τRms 0, or every lean alike) keeps its settled leans, factor null.
 */
export function widenLeans(
  raw: readonly Readonly<Leans>[],
  tauRms: Readonly<Leans>,
): { leans: Leans[]; factor: Record<CrewLeanFamily, number | null> } {
  const factor = {} as Record<CrewLeanFamily, number | null>;
  const scaled: Leans[] = raw.map(() => noFlags());
  for (const f of CREW_FAMILIES) {
    const center = mean(raw.map((l) => l[f]));
    const dev = raw.map((l) => l[f] - center);
    const sd = Math.sqrt(mean(dev.map((d) => d * d)));
    const k = tauRms[f] > 0 && sd > 0 ? (LEAGUE_LEAN * tauRms[f]) / sd : null;
    factor[f] = k;
    dev.forEach((d, i) => { scaled[i]![f] = k === null ? raw[i]![f] : LEAGUE_LEAN + k * d; });
  }
  return { leans: settleLeans(scaled), factor };
}

// --- Names --------------------------------------------------------------------------------------

/** How many distinct names each of the officials snapshot's four sources gives (`snapshotNames`), as the printout shows them. */
export interface NamesBySource {
  /** Every official in the officials table, any position and season. */
  readonly officials: number;
  /** The schedules' referees, any season. */
  readonly referees: number;
  /** The schedules' coaches, home and away, any season. */
  readonly coaches: number;
  /** Every real player in the players list. */
  readonly players: number;
}

/**
 * Every name in the officials snapshot a made-up referee must not take: every official's (any position,
 * any season), every referee's and coach's in the schedules (any season), and every real player's; with
 * how many distinct names each source gives. Refuses, with counts only, a snapshot whose officials,
 * referees, coaches or players give none: a column read wrong or left out would let a made-up referee
 * take a real person's name, and no test or re-run of the block would show it.
 */
export function snapshotNames(input: {
  readonly schedules: readonly ScheduleRow[];
  readonly officials: readonly OfficialRow[];
  readonly players: readonly string[];
}): { names: string[]; bySource: NamesBySource } {
  const names = new Set<string>();
  const by = { officials: new Set<string>(), referees: new Set<string>(), coaches: new Set<string>(), players: new Set<string>() };
  const add = (source: Set<string>, n: string | null | undefined) => {
    if (typeof n === "string" && n.trim() !== "") { names.add(n); source.add(n); }
  };
  for (const o of input.officials) add(by.officials, o.official_name);
  for (const g of input.schedules) { add(by.referees, g.referee); add(by.coaches, g.home_coach); add(by.coaches, g.away_coach); }
  for (const n of input.players) add(by.players, n);
  const none = (Object.keys(by) as (keyof typeof by)[]).filter((k) => by[k].size === 0);
  if (none.length > 0) {
    throw new Error(`the officials snapshot gives no names for its ${none.join(", ")}: a source read on the wrong column, or left out, ` +
      `would let a made-up referee take a real name, so the run stops`);
  }
  return {
    names: [...names],
    bySource: { officials: by.officials.size, referees: by.referees.size, coaches: by.coaches.size, players: by.players.size },
  };
}

/**
 * The referees' taken set, one rule for both commands: the snapshot's names (`snapshotNames`), every
 * stand-in player's name in the league file, every name in the players' sealed table (it keeps every
 * stand-in ever minted, on today's file or not) and every name in the referees' own.
 */
export function officialsTaken(input: {
  readonly snapshotNames: Iterable<string>;
  readonly standInNames: Iterable<string>;
  readonly playersSealed: SealedTable;
  readonly officialsSealed: SealedTable;
}): Set<string> {
  return new Set<string>([
    ...input.snapshotNames,
    ...input.standInNames,
    ...Object.values(input.playersSealed).map((s) => s.name),
    ...Object.values(input.officialsSealed).map((s) => s.name),
  ]);
}

/**
 * The taken set as `drawName` sees it: a drawn name is refused when it is taken as spelled, or when its
 * `nameKey` is (case, punctuation and Jr./Sr./II-V ignored), so no copy's referee is a real name
 * written another way.
 */
class TakenNames extends Set<string> {
  readonly #byKey = new Set<string>();
  constructor(names: Iterable<string>) {
    super();
    for (const n of names) this.add(n);
  }
  override add(name: string): this {
    super.add(name);
    this.#byKey.add(nameKey(name));
    return this;
  }
  override has(name: string): boolean {
    return super.has(name) || this.#byKey.has(nameKey(name));
  }
}

/** The labels a referee's name is drawn on, one seed a referee (after the players' `standin:<gsis>`). */
export const OFFICIAL_NAME_SEED = "standin-official";
export const OFFICIAL_NAME_STREAM = "attributes:real:official-name";
/** New referees take ids in the order of this hash of their key, so an id says nothing about a name's spelling. */
export const OFFICIAL_ORDER_SEED = "standin-official-order:";

/** `o:01` to `o:99`, zero-padded so the ids read in their natural order as strings. */
export const officialId = (n: number): string => `o:${String(n).padStart(2, "0")}`;

const orderOf = (key: string): string => createHash("sha256").update(OFFICIAL_ORDER_SEED + key).digest("hex");

// --- The 17 -------------------------------------------------------------------------------------

/** The block's `method` for a league file's season: what a committed block is checked against. */
export function officiatingMethod(season: number, spread: CopySpread): StandInOfficiating["method"] {
  return {
    referee: "schedules",
    unit: "scrimmage snap",
    plays: [...SCRIMMAGE_PLAYS],
    windows: { leans: seasonsOf(season, LEAN_WINDOW), spread: seasonsOf(season, SPREAD_WINDOW) },
    minSpreadGames: MIN_SPREAD_GAMES,
    families: familyKinds(),
    scale: "lean = 50 x pulled ratio (ADR-093 §16 A3)",
    settle: "re-centered on 50 per family, clamped 0 to 100, whole points (§16 A4)",
    spread,
  };
}

export interface StandInCrewsInput {
  /** The league file's season: the crews stand in it. */
  readonly season: number;
  /** The officials snapshot's date (its manifest's `date`). */
  readonly asOf: string;
  /** Each season's counts, `season - 3` to `season`, once each. */
  readonly counts: readonly SeasonCounts[];
  /** Every name a made-up referee must not take (`officialsTaken`). */
  readonly taken: ReadonlySet<string>;
  /** The referees' sealed table, key to `{ id, name }`: a returning referee keeps their entry. */
  readonly sealed: SealedTable;
  readonly spread: CopySpread;
  /** The league file's block before this run, if any: the report counts the crews that kept their id and referee. */
  readonly before?: StandInOfficiating | undefined;
}

/** One family in the report: what the printout shows, unrounded. */
export interface FamilyReport {
  /** Flags a refereed game, both teams, by season of both windows. */
  readonly perGame: Readonly<Record<string, number>>;
  readonly tau: readonly number[];
  readonly tauRms: number;
  readonly shrink: number;
  readonly measured: { readonly sd: number; readonly min: number; readonly max: number; readonly mean: number };
  readonly widened: { readonly factor: number | null; readonly sd: number; readonly min: number; readonly max: number; readonly mean: number };
}

/** What a run did, in counts only: no name, no key. */
export interface CrewsReport {
  readonly referees: number;
  /** Referees new to the sealed table this run. */
  readonly minted: number;
  /** Sealed referees with no game this season: they keep their entry and get no crew. */
  readonly missing: number;
  /** Crews whose id and referee equal the block's before this run; null when the file had none. */
  readonly kept: number | null;
  readonly games: {
    readonly total: { readonly min: number; readonly max: number };
    readonly bySeason: Readonly<Record<string, { readonly min: number; readonly max: number }>>;
  };
  readonly families: Readonly<Record<CrewLeanFamily, FamilyReport>>;
  readonly spread: CopySpread;
  /** The referees' sealed table after the run. */
  readonly sealedSize: number;
}

/**
 * The stand-in league's 17 crews from the counts: one crew for each referee with a refereed game in
 * `season` (exactly 17, or the run stops with counts only), leans as measured or widened, names and
 * ids from the sealed table, new ones minted. Pure and deterministic: the same counts, taken set and
 * sealed table give the same bytes.
 */
export function standInCrews(input: StandInCrewsInput): { officiating: StandInOfficiating; sealed: SealedTable; report: CrewsReport } {
  const { season } = input;
  const leanSeasons = seasonsOf(season, LEAN_WINDOW);
  const spreadSeasons = seasonsOf(season, SPREAD_WINDOW);
  const wanted = [...new Set([...spreadSeasons, ...leanSeasons])].sort((a, b) => a - b);
  const got = input.counts.map((c) => c.season).sort((a, b) => a - b);
  if (got.join() !== wanted.join()) {
    throw new Error(`standInCrews: the counts are for ${got.join(", ") || "no season"}, not ${wanted.join(", ")}: a snapshot of another season?`);
  }
  const counts = new Map(input.counts.map((c) => [c.season, c]));
  const of = (s: number): SeasonCounts => counts.get(s)!;
  // A season's plays read for another season would leave its refereed games with no snap, and every lean at 50.
  for (const s of wanted) {
    const refs = Object.values(of(s).referees);
    const games = sum(refs.map((r) => r.games));
    if (games > 0 && sum(refs.map((r) => r.snaps)) === 0) {
      throw new Error(`standInCrews: ${s} has ${games} refereed games and no scrimmage snap in them: were its plays read for another season? The run stops`);
    }
  }
  const here = of(season);
  const keys = Object.keys(here.referees).filter((k) => here.referees[k]!.games > 0).sort(byText);
  if (keys.length !== CREW_COUNT) {
    throw new Error(`standInCrews: the schedules name ${keys.length} referees with a game in ${season}, not ${CREW_COUNT}: ` +
      `the run stops (a rule for a fill-in or for a season with no refereed game yet is not built)`);
  }

  // λ by season and family, over each season's refereed games (all its referees, in key order).
  const refsOf = (s: number): RefereeSeason[] => Object.keys(of(s).referees).sort(byText).map((k) => of(s).referees[k]!);
  const lambda = new Map(wanted.map((s) => {
    const refs = refsOf(s);
    const snaps = sum(refs.map((r) => r.snaps));
    return [s, leansOf((f) => (snaps > 0 ? sum(refs.map((r) => r.flags[f])) / snaps : 0))] as const;
  }));
  const lam = (s: number): Leans => lambda.get(s)!;

  // τ² by season of the spread window, then its mean over the window.
  const tau2BySeason = byFamily((f) => spreadSeasons.map((s) => spreadBeyondChance(
    refsOf(s).map((r) => ({ games: r.games, flags: r.flags[f], expected: lam(s)[f] * r.snaps })))));
  const tau2 = leansOf((f) => mean(tau2BySeason[f]));
  const tauRms = leansOf((f) => Math.sqrt(tau2[f]));

  // Each copy: y = ΣN ÷ ΣE over the lean window, pulled by B toward 1, on the contract's scale.
  const pull: Leans[] = [];
  const raw: Leans[] = [];
  for (const key of keys) {
    const b = noFlags();
    const lean = noFlags();
    for (const f of CREW_FAMILIES) {
      let n = 0;
      let e = 0;
      for (const s of leanSeasons) {
        const r = of(s).referees[key];
        if (r === undefined) continue;
        n += r.flags[f];
        e += lam(s)[f] * r.snaps;
      }
      b[f] = shrinkFactor(tau2[f], e);
      lean[f] = leanOf(1 + b[f] * ((e > 0 ? n / e : 1) - 1));
    }
    pull.push(b);
    raw.push(lean);
  }
  const measured = settleLeans(raw);
  const widened = widenLeans(raw, tauRms);
  const written = input.spread === "widened" ? widened.leans : measured;

  // Names and ids: a returning referee keeps their entry; new ones in hash order, after the highest id.
  const sealed: Record<string, { id: string; name: string }> = { ...input.sealed };
  const fresh = keys.filter((k) => sealed[k] === undefined).sort((a, b) => byText(orderOf(a), orderOf(b)));
  let next = Math.max(0, ...Object.values(sealed).map((s) => Number(s.id.slice(2)) || 0)) + 1;
  const taken = new TakenNames(input.taken);
  for (const key of fresh) {
    sealed[key] = { id: officialId(next++), name: drawName(createRng(`${OFFICIAL_NAME_SEED}:${key}`, OFFICIAL_NAME_STREAM), taken) };
  }
  const index = keys.map((key, i) => ({ key, i, id: sealed[key]!.id })).sort((a, b) => byText(a.id, b.id));
  const crews: OfficiatingCrew[] = index.map(({ key, i }) => ({
    id: officiatingCrewId(sealed[key]!.id), referee: sealed[key]!.name, leans: written[i]!,
  }));
  const column = (leans: readonly Leans[], f: CrewLeanFamily) => leans.map((l) => l[f]);

  const officiating: StandInOfficiating = {
    version: STANDIN_OFFICIALS_VERSION,
    season,
    asOf: input.asOf,
    coverage: { played: here.played, withReferee: here.withReferee },
    method: officiatingMethod(season, input.spread),
    measured: byFamily((f) => {
      const k = widened.factor[f];
      return {
        tau: tau2BySeason[f].map((t) => round3(Math.sqrt(t))),
        tauRms: round3(tauRms[f]),
        shrink: round3(mean(column(pull, f))),
        sd: { measured: round3(popSd(column(measured, f))), widened: round3(popSd(column(widened.leans, f))) },
        factor: k === null ? null : round3(k),
      };
    }),
    games: Object.fromEntries(index.map(({ key, id }) => [id, Object.fromEntries(
      leanSeasons.map((s) => [String(s), of(s).referees[key]?.games ?? 0]))])),
    crews,
  };

  const totals = keys.map((key) => sum(leanSeasons.map((s) => of(s).referees[key]?.games ?? 0)));
  const range = (xs: readonly number[]) => ({ min: Math.min(...xs), max: Math.max(...xs) });
  const before = input.before;
  const report: CrewsReport = {
    referees: keys.length,
    minted: fresh.length,
    missing: Object.keys(input.sealed).filter((k) => !keys.includes(k)).length,
    kept: before === undefined ? null
      : crews.filter((c) => before.crews.some((b) => b.id === c.id && b.referee === c.referee)).length,
    games: {
      total: range(totals),
      bySeason: Object.fromEntries(leanSeasons.map((s) => [String(s), range(keys.map((key) => of(s).referees[key]?.games ?? 0))])),
    },
    families: byFamily((f): FamilyReport => {
      const perGame = Object.fromEntries(wanted.map((s) => {
        const refs = refsOf(s);
        const g = sum(refs.map((r) => r.games));
        return [String(s), g > 0 ? sum(refs.map((r) => r.flags[f])) / g : 0];
      }));
      const m = column(measured, f);
      const w = column(widened.leans, f);
      return {
        perGame,
        tau: tau2BySeason[f].map((t) => Math.sqrt(t)),
        tauRms: tauRms[f],
        shrink: mean(column(pull, f)),
        measured: { sd: popSd(m), ...range(m), mean: mean(m) },
        widened: { factor: widened.factor[f], sd: popSd(w), ...range(w), mean: mean(w) },
      };
    }),
    spread: input.spread,
    sealedSize: Object.keys(sealed).length,
  };
  return { officiating, sealed, report };
}

// --- Checks -------------------------------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const shown = (v: unknown): string => (typeof v === "string" ? JSON.stringify(v) : String(v));

/**
 * Why a list cannot be the stand-in league's crews, or undefined. Franchise's rule, mirrored since
 * attributes may not import franchise (`crewsProblem` there): exactly 17 objects, each with a non-empty
 * id and a non-empty referee, both unique, and leans on exactly the five families, each a whole number
 * from 0 to 100. Then the block's own rules: each family's leans average 50 within 0.5, and, given
 * `seasons`, the block stands in the league file's season.
 */
export function crewsProblem(crews: unknown, seasons?: { readonly block: number; readonly file: number }): string | undefined {
  if (!Array.isArray(crews)) return "the crews are not a list";
  if (crews.length !== CREW_COUNT) return `there are ${crews.length} crews, not ${CREW_COUNT}`;
  const ids = new Set<string>();
  const referees = new Set<string>();
  for (const [i, c] of (crews as unknown[]).entries()) {
    if (!isObject(c)) return `crew ${i + 1} on the list is not a crew`;
    if (typeof c.id !== "string" || c.id === "") return `crew ${i + 1} on the list has no id`;
    if (ids.has(c.id)) return `crew ${c.id} appears twice`;
    ids.add(c.id);
    if (typeof c.referee !== "string" || c.referee === "") return `crew ${c.id} has no referee`;
    if (referees.has(c.referee)) return `two crews have the referee ${c.referee}`;
    referees.add(c.referee);
    const leans = c.leans;
    if (!isObject(leans)) return `crew ${c.id} has no leans`;
    for (const f of CREW_FAMILIES) {
      if (!Object.hasOwn(leans, f)) return `crew ${c.id} has no ${f} lean`;
      const v = leans[f];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 100) {
        return `crew ${c.id}'s ${f} lean is not a whole number from 0 to 100 (${shown(v)})`;
      }
    }
    const extra = Object.keys(leans).filter((k) => !(CREW_FAMILIES as readonly string[]).includes(k));
    if (extra.length > 0) return `crew ${c.id} leans on ${extra.join(", ")}, not one of the five families`;
  }
  for (const f of CREW_FAMILIES) {
    const m = mean((crews as OfficiatingCrew[]).map((c) => c.leans[f]));
    if (Math.abs(m - LEAGUE_LEAN) > 0.5) return `the ${f} leans average ${m.toFixed(2)}, not 50 within 0.5`;
  }
  if (seasons !== undefined && seasons.block !== seasons.file) {
    return `the crews stand in ${seasons.block}, not the league file's season ${seasons.file}`;
  }
  return undefined;
}

/** For the port check: each played regular-season game of `seasons` that both sources name a referee for, as [the schedules' spelling, the officials table's]. */
export function refereePairs(
  schedules: readonly ScheduleRow[],
  officials: readonly OfficialRow[],
  seasons: readonly number[],
): [string, string][] {
  const book = new Map<string, string>();
  for (const r of officials) {
    if (r.position !== "Referee" || r.official_name == null || r.official_name.trim() === "") continue;
    const id = String(r.game_id);
    const had = book.get(id);
    if (had === undefined || r.official_name < had) book.set(id, r.official_name);
  }
  const out: [string, string][] = [];
  for (const g of schedules) {
    if (!seasons.includes(g.season) || g.game_type !== "REG" || g.home_score == null) continue;
    const s = g.referee?.trim() ?? "";
    const b = g.old_game_id == null ? undefined : book.get(String(g.old_game_id));
    if (s !== "" && b !== undefined) out.push([s, b]);
  }
  return out;
}

export interface Table6Input {
  /** Per season of the spread window: the officials table's referees (by key), their games and offensive holds. */
  readonly seasons: readonly { readonly season: number; readonly book: SeasonCounts["book"] }[];
  /** `refereePairs` of the spread window. */
  readonly pairs: readonly (readonly [string, string])[];
}

export interface Table6Report {
  /** Per season: the referees with MIN_SPREAD_GAMES games, offensive holding's crew SD per game beyond chance (ratio units), and its share of the observed spread. */
  readonly seasons: readonly { readonly season: number; readonly referees: number; readonly sd: number; readonly share: number }[];
  /** The two sources on who refereed each game: equal keys agree; one person spelled two ways is set aside; the rest differ. */
  readonly agreement: {
    readonly compared: number;
    readonly agree: number;
    readonly differ: number;
    readonly setAside: number;
    readonly spellingPairs: number;
  };
}

/**
 * The port check against ADR-093's Table 6: offensive holding's single-season crew SD and the share of
 * the referees' spread that is beyond chance, per game, from the officials table's referee, and the
 * two sources' agreement on who refereed each game. A game is set aside as one person spelled two ways
 * when the keys' last words are equal and one first word is a prefix of the other.
 */
export function table6Check(input: Table6Input): Table6Report {
  const seasons = [...input.seasons].sort((a, b) => a.season - b.season).map(({ season, book }) => {
    const refs = Object.keys(book).sort(byText).map((k) => book[k]!).filter((r) => r.games >= MIN_SPREAD_GAMES);
    const games = sum(refs.map((r) => r.games));
    const rate = games > 0 ? sum(refs.map((r) => r.holds)) / games : 0;
    const v = beyondChance(refs.map((r) => ({ games: r.games, flags: r.holds, expected: rate * r.games })));
    return { season, referees: v.referees, sd: Math.sqrt(v.beyond), share: v.observed > 0 ? v.beyond / v.observed : 0 };
  });
  let agree = 0;
  let differ = 0;
  let setAside = 0;
  const pairs = new Set<string>();
  for (const [s, b] of input.pairs) {
    const ks = nameKey(s);
    const kb = nameKey(b);
    if (ks === kb) { agree++; continue; }
    const ws = ks.split(" ");
    const wb = kb.split(" ");
    const first = (w: string[]) => w[0] ?? "";
    if (ws[ws.length - 1] === wb[wb.length - 1] && (first(ws).startsWith(first(wb)) || first(wb).startsWith(first(ws)))) {
      setAside++;
      pairs.add(`${ks}\u0000${kb}`);
    } else differ++;
  }
  return { seasons, agreement: { compared: input.pairs.length, agree, differ, setAside, spellingPairs: pairs.size } };
}
