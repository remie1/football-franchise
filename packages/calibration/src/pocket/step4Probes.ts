/**
 * `pnpm --filter @ff/calibration pocket -- --step 4 --probes [--shard i/n] [--cache <dir>] [--report <file.md>] [--out <file.json>]`
 *
 * ADR-089 STEP 4'S PROBES (step-4 plan §4 "Release probe", AM-7 items 13 and 14; review F9 and F10):
 * the runs that read the two falsifiers, `s4.falsifier.release` and `s4.falsifier.ratingProbes`,
 * each a step-4 arm's bundle played with one attribute set or raised (`ratingOverride.ts`).
 *
 *  - **The release probe** (AM-7 item 13): D6's bundle (the motion alone on the pricing build) on
 *    the flat league, release SET to 40 and to 80 on every player (only a quarterback reads it),
 *    both seed sets. The reading is THROWING hits per 100 aimed throws, both sets summed, as AM-7
 *    item 5 sums a direction reading; "measurable" is the difference (80 less 40) beyond 2 SE in its
 *    direction, more release fewer hits, on the independent binomial SE (AM-1's `se`), the paired SE
 *    printed beside. Each set is printed beside. The clause is structural: falsified (FAIL) when the
 *    difference is not measurable. The paired gen probe, printed beside and never graded: D6 on the
 *    generated league with the home quarterback's release raised 40 points (one team's quarterback in
 *    every game, the home side's), read on the home side's dropbacks against the same games unraised.
 *  - **The rating probes** (AM-7 item 14), on D3's bundle (contact alone, today's line: the arm the
 *    contact clauses read, AM-7 item 1):
 *     - *exact at the contest*: the engine's unit proof (`engine/test/contact.test.ts`, monotone in
 *       each of the four ratings at every b and tilt), named, not re-run here;
 *     - *the play-level probe*: on the golden 50 a league, the game's first rated `:contest`
 *       replayed with one named man raised 30 points (the quarterback's strength, his agility; the
 *       rusher's tackling, his speed). A pair is compared only when every event before the contest is
 *       the same in both games (the same die then lies under it); otherwise it is counted as diverged.
 *       A compared pair where the quarterback's raise moves the margin up, or a shed to a sack, is a
 *       failure of the clause; a rusher's raise moving the margin down is a build fault named beside;
 *     - *the game-level paired probes*, printed with their paired SE, never graded: the flat league,
 *       both sets, every quarterback's strength or agility raised 30, or every defense's four
 *       rushers' tackling or speed raised 30, each against the same games unraised. Sacks per 100
 *       dropbacks and the raised men's contests are printed; speed's arrival effect (the raised
 *       rushers' rated contests per 100 dropbacks) is printed apart from their sacks per contest.
 *       Strength and agility enter the contest the same way (each rating/5 on the quarterback's side),
 *       so their figures can match to the last count: that is the design, not a copied wiring.
 *  - **The refusals** are step 4's: nothing plays, and no cache is made, unless `preflightStep4`
 *    passes (AM-6, AM-7, the pin, P6, P7 and P8). Under a withheld petition (a test's set) every probe
 *    is refused before its first die, as every D arm is.
 *  - **Their own run ids and cache.** The probes' run ids (`STEP4_PROBE_RUN_IDS`, each `PR-...`) are
 *    no arm's, and their records live in `data-cache/pocket-step4-probes/<fingerprint>/`, stamped
 *    with the overrides; no arm, cache entry or digest of any step moves. Same seed, same games.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { MatchEventEnvelope } from "@ff/contracts";
import type { GameSnapshot, Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../caller/frozenTendencies.js";
import { canonicalise } from "../harness/digest.js";
import { runOneGame } from "../harness/runGame.js";
import { buildFixture } from "../harness/schedule.js";
import type { SimGameObservation } from "../metrics/collect.js";
import { armById, buildArm, step4ArmDef, type Arm, type Step4ArmId } from "./arms.js";
import { flatBaseline, genSeason, goldenFixtures, SEED_SETS, type CorpusVisitor, type SeedSet } from "./corpus.js";
import { STEP0_FILED_DIGEST } from "./filed.js";
import type { GoldenLeague } from "./golden.js";
import { ratingOverridesKey, ratingOverridesReach, type RatingOverride } from "./ratingOverride.js";
import type { League, Step2ClauseResult } from "./report.js";
import type { Step4Petitions } from "./rules.js";
import { ARRIVAL_CONTEST, s4PlaysOf } from "./s4Stream.js";
import { FULL_CORPUS, jsonText, STEP1_CALLER, stampProblems, writeAtomic, type Step1Corpus, type Step1Env } from "./step1.js";

export const STEP4_PROBE_FORMAT = "adr-089-step4-probe/v1";
export const STEP4_PLAY_PROBE_FORMAT = "adr-089-step4-play-probe/v1";

/** How far a rating probe raises its man (points on the 0 to 99 scale; the flat league's 60 becomes 90). */
export const PROBE_RAISE = 30;
/** How far the paired gen probe raises the home quarterback's release. */
export const GEN_RELEASE_RAISE = 40;
/** The release probe's two values (AM-7 item 13). */
export const RELEASE_LO = 40;
export const RELEASE_HI = 80;

export type ProbeKind = "RELEASE" | "RELEASE_GEN" | "RATING";

export interface ProbeRunDef {
  readonly id: string;
  readonly kind: ProbeKind;
  readonly arm: Step4ArmId;
  readonly league: League;
  readonly ratings: readonly RatingOverride[];
  /** The unraised run this one is read against, game by game (the paired probes). */
  readonly pairedWith?: string;
  readonly what: string;
}

const everyPlayer = (attr: string, value: number): RatingOverride => ({ attr, target: { kind: "ROLE", role: "ALL", side: "BOTH" }, change: { op: "SET", value } });
const raise = (attr: string, target: RatingOverride["target"], delta: number): RatingOverride => ({ attr, target, change: { op: "ADD", delta } });
const QB_BOTH: RatingOverride["target"] = { kind: "ROLE", role: "QB", side: "BOTH" };
/**
 * Every defense's four rushers (the ends, then the interior), the men who reach the quarterback: on
 * D3's flat league an interior lineman is in about nine first contests of ten and the first end in
 * one of 350 (review 2 S1), so raising one end alone measured nothing.
 */
const RUSHERS_BOTH: RatingOverride["target"] = { kind: "ROLE", role: "RUSHER", side: "BOTH" };

/** The probes' runs, in order (each played on both seed sets). */
export const STEP4_PROBE_RUNS: readonly ProbeRunDef[] = Object.freeze([
  { id: "PR-REL40", kind: "RELEASE", arm: "D6", league: "flat", ratings: [everyPlayer("release", RELEASE_LO)], what: `D6's bundle, the flat league, release ${String(RELEASE_LO)} on every player` },
  { id: "PR-REL80", kind: "RELEASE", arm: "D6", league: "flat", ratings: [everyPlayer("release", RELEASE_HI)], what: `D6's bundle, the flat league, release ${String(RELEASE_HI)} on every player` },
  { id: "PR-RELGEN-BASE", kind: "RELEASE_GEN", arm: "D6", league: "gen", ratings: [], what: "D6's bundle, the generated league, unraised (the gen probe's pair)" },
  { id: "PR-RELGEN-QB", kind: "RELEASE_GEN", arm: "D6", league: "gen", ratings: [raise("release", { kind: "ROLE", role: "QB", side: "HOME" }, GEN_RELEASE_RAISE)], pairedWith: "PR-RELGEN-BASE", what: `D6's bundle, the generated league, the home quarterback's release raised ${String(GEN_RELEASE_RAISE)}` },
  { id: "PR-RAT-BASE", kind: "RATING", arm: "D3", league: "flat", ratings: [], what: "D3's bundle, the flat league, unraised (the rating probes' pair)" },
  { id: "PR-QB-STRENGTH", kind: "RATING", arm: "D3", league: "flat", ratings: [raise("strength", QB_BOTH, PROBE_RAISE)], pairedWith: "PR-RAT-BASE", what: `D3's bundle, the flat league, every quarterback's strength raised ${String(PROBE_RAISE)}` },
  { id: "PR-QB-AGILITY", kind: "RATING", arm: "D3", league: "flat", ratings: [raise("agility", QB_BOTH, PROBE_RAISE)], pairedWith: "PR-RAT-BASE", what: `D3's bundle, the flat league, every quarterback's agility raised ${String(PROBE_RAISE)}` },
  { id: "PR-RUSHER-TACKLING", kind: "RATING", arm: "D3", league: "flat", ratings: [raise("tackling", RUSHERS_BOTH, PROBE_RAISE)], pairedWith: "PR-RAT-BASE", what: `D3's bundle, the flat league, each defense's four rushers' tackling raised ${String(PROBE_RAISE)}` },
  { id: "PR-RUSHER-SPEED", kind: "RATING", arm: "D3", league: "flat", ratings: [raise("speed", RUSHERS_BOTH, PROBE_RAISE)], pairedWith: "PR-RAT-BASE", what: `D3's bundle, the flat league, each defense's four rushers' speed raised ${String(PROBE_RAISE)}` },
] as const);

/** The play-level probe's one run (the golden 50 a league, no seed set). */
export const PLAY_PROBE_RUN = "PR-PLAY";
export const PLAY_PROBE_ARM: Step4ArmId = "D3";
/** The play-level probe's four raises, each on the named man of the game's first rated contest. */
export const PLAY_PROBE_RATINGS = Object.freeze([
  { rating: "strength", man: "QUARTERBACK" },
  { rating: "agility", man: "QUARTERBACK" },
  { rating: "tackling", man: "RUSHER" },
  { rating: "speed", man: "RUSHER" },
] as const);

export const STEP4_PROBE_RUN_IDS: readonly string[] = Object.freeze([...STEP4_PROBE_RUNS.map((r) => r.id), PLAY_PROBE_RUN]);

export function probeRunById(id: string): ProbeRunDef {
  const def = STEP4_PROBE_RUNS.find((r) => r.id === id);
  if (def === undefined) throw new RangeError(`step-4 probes: no run ${id} (${STEP4_PROBE_RUN_IDS.join(", ")})`);
  return def;
}

/** The runs read against `id` game by game, and `id` itself when it raises anything: whose raised men its fold watches. */
export function watchedRunsOf(def: ProbeRunDef): readonly ProbeRunDef[] {
  return STEP4_PROBE_RUNS.filter((r) => r.ratings.length > 0 && (r.id === def.id || r.pairedWith === def.id));
}

/** The step-4 arm a probe plays: `armById` (refused while P6, P7 or P8 is out), or built under a test's own petitions. */
export function probeArmOf(id: Step4ArmId, petitions?: Step4Petitions): Arm {
  if (petitions === undefined) return armById(id);
  return buildArm(step4ArmDef(id)!, petitions);
}

// --- the fold ------------------------------------------------------------------------------------------

/** One game's figures on one set of dropbacks. */
export interface ProbeCounts {
  dropbacks: number;
  aimed: number;
  /** Aimed throws with a THROWING `QB_HIT` (AM-7 item 13's numerator). */
  throwingHit: number;
  sacks: number;
  /** First rated `:contest`s, one a dropback at most, and those RUSHER_SACKS. */
  contests: number;
  contestSacks: number;
}

/** One game's figures on the raised men of one run (the base run reads its pairs' men). */
export interface WatchCounts {
  /** Dropbacks thrown by a watched passer, and those sacked. */
  passes: number;
  passerSacks: number;
  /** First rated contests with a watched man in them (rusher or quarterback), and those RUSHER_SACKS. */
  contests: number;
  contestSacks: number;
  /** Every rated contest a watched rusher reached (his arrivals), and those RUSHER_SACKS. */
  arrivals: number;
  arrivalSacks: number;
}

export interface ProbeGame {
  readonly all: ProbeCounts;
  /** The home side's dropbacks (the gen probe raises the home quarterback). */
  readonly home: ProbeCounts;
  readonly watch: Readonly<Record<string, WatchCounts>>;
}

const counts = (): ProbeCounts => ({ dropbacks: 0, aimed: 0, throwingHit: 0, sacks: 0, contests: 0, contestSacks: 0 });
const watchCounts = (): WatchCounts => ({ passes: 0, passerSacks: 0, contests: 0, contestSacks: 0, arrivals: 0, arrivalSacks: 0 });

/** One game's probe figures (pure): every `pocket-1.s4` dropback, the home side's, and each watch's men. */
export function probeGameOf(events: readonly MatchEventEnvelope[], tunables: Tunables, homeTeam: string, watches: Readonly<Record<string, ReadonlySet<string>>>): ProbeGame {
  const all = counts();
  const home = counts();
  const watch: Record<string, WatchCounts> = Object.fromEntries(Object.keys(watches).sort().map((k) => [k, watchCounts()]));
  for (const play of s4PlaysOf(events, tunables)) {
    if (!play.s4) continue;
    const d = play.dropback;
    const aimed = d.throwTick !== undefined;
    const throwingHit = aimed && play.hits.some((h) => h.phase === "THROWING");
    const rated = play.contests.filter((c) => !c.second);
    const head = rated[0];
    const sides = String(d.start.offenseTeam) === homeTeam ? [all, home] : [all];
    for (const c of sides) {
      c.dropbacks += 1;
      if (aimed) c.aimed += 1;
      if (throwingHit) c.throwingHit += 1;
      if (d.sacked) c.sacks += 1;
      if (head !== undefined) {
        c.contests += 1;
        if (head.band === "RUSHER_SACKS") c.contestSacks += 1;
      }
    }
    for (const [key, men] of Object.entries(watches)) {
      const w = watch[key]!;
      if (men.has(String(d.start.quarterback))) {
        w.passes += 1;
        if (d.sacked) w.passerSacks += 1;
      }
      if (head !== undefined && (men.has(head.rusher) || men.has(head.quarterback))) {
        w.contests += 1;
        if (head.band === "RUSHER_SACKS") w.contestSacks += 1;
      }
      for (const c of rated) {
        if (!men.has(c.rusher)) continue;
        w.arrivals += 1;
        if (c.band === "RUSHER_SACKS") w.arrivalSacks += 1;
      }
    }
  }
  return { all, home, watch };
}

// --- one run -------------------------------------------------------------------------------------------

export interface ProbeStamp {
  readonly probe: string;
  readonly arm: Step4ArmId;
  readonly league: League | "golden";
  readonly ratings: string;
  readonly watches: readonly string[];
  readonly filedDigest: string;
  readonly amendments: string;
  readonly rules: Arm["rules"];
  readonly overlayDigest?: string;
  readonly tunablesDigest: string;
  readonly seedSet: SeedSet | null;
  readonly caller: string;
  readonly corpus: Step1Corpus;
  readonly fingerprint: string;
  readonly commit: string;
  readonly dirty: boolean;
  readonly node: string;
}

export interface ProbeRecord {
  readonly format: typeof STEP4_PROBE_FORMAT;
  readonly stamp: ProbeStamp;
  readonly games: readonly ProbeGame[];
}

/** A probe run's stamp: the arm's, the overrides and the watches, the build's (never the host's). */
export function probeStampOf(id: string, seedSet: SeedSet | null, env: Step1Env, amendments: string, corpus: Step1Corpus, arm: Arm): ProbeStamp {
  const def = id === PLAY_PROBE_RUN ? undefined : probeRunById(id);
  return {
    probe: id,
    arm: def?.arm ?? PLAY_PROBE_ARM,
    league: def?.league ?? "golden",
    ratings: def === undefined ? "named man, +" + String(PROBE_RAISE) + ": " + PLAY_PROBE_RATINGS.map((r) => r.rating).join(", ") : ratingOverridesKey(def.ratings),
    watches: def === undefined ? [] : watchedRunsOf(def).map((r) => r.id),
    filedDigest: STEP0_FILED_DIGEST,
    amendments,
    rules: arm.rules,
    ...(arm.overlayDigest === undefined ? {} : { overlayDigest: arm.overlayDigest }),
    tunablesDigest: arm.tunablesDigest,
    seedSet,
    caller: STEP1_CALLER,
    corpus: { flatFirst: corpus.flatFirst, genThroughWeek: corpus.genThroughWeek },
    fingerprint: env.fingerprint,
    commit: env.commit,
    dirty: env.dirty,
    node: env.node,
  };
}

/** How a probe's games are played: its corpus with its tunables and overrides, each game to `visit`. */
export type ProbeGamesPlayer = (league: League, seedSet: SeedSet, game: { readonly tunables: Tunables; readonly ratings?: readonly RatingOverride[] }, corpus: Step1Corpus, visit: CorpusVisitor) => void;

/** The corpora the arms play: the flat league's 496 and the generated league's 272, each at its seed set. */
export const playProbeCorpus: ProbeGamesPlayer = (league, seedSet, game, corpus, visit) => {
  const opts = { tunables: game.tunables, callerVersion: STEP1_CALLER, ...(game.ratings === undefined || game.ratings.length === 0 ? {} : { ratings: game.ratings }) };
  if (league === "flat") flatBaseline(seedSet, visit, { ...opts, ...(corpus.flatFirst === null ? {} : { first: corpus.flatFirst }) });
  else genSeason(seedSet, visit, { ...opts, ...(corpus.genThroughWeek === null ? {} : { throughWeek: corpus.genThroughWeek }) });
};

export interface PlayProbeOptions {
  readonly env: Step1Env;
  readonly amendments: string;
  readonly corpus?: Step1Corpus;
  /** Tests only: the petitions the arm is built under (default the constants, all in contracts since the lift). */
  readonly petitions?: Step4Petitions;
  /** Tests only: plays the games (default `playProbeCorpus`). */
  readonly playGames?: ProbeGamesPlayer;
}

/** Plays one probe run at one seed set and folds every game. */
export function playProbeRun(id: string, seedSet: SeedSet, opts: PlayProbeOptions): ProbeRecord {
  const def = probeRunById(id);
  const corpus = opts.corpus ?? FULL_CORPUS;
  const arm = probeArmOf(def.arm, opts.petitions);
  const watched = watchedRunsOf(def);
  const games: ProbeGame[] = [];
  const visit: CorpusVisitor = (o, snapshot) => {
    const watches = Object.fromEntries(watched.map((r) => [r.id, ratingOverridesReach(snapshot, r.ratings)]));
    games.push(probeGameOf(o.events, arm.tunables, String(snapshot.home.team), watches));
  };
  (opts.playGames ?? playProbeCorpus)(def.league, seedSet, { tunables: arm.tunables, ...(def.ratings.length === 0 ? {} : { ratings: def.ratings }) }, corpus, visit);
  return { format: STEP4_PROBE_FORMAT, stamp: probeStampOf(id, seedSet, opts.env, opts.amendments, corpus, arm), games };
}

// --- the play-level probe --------------------------------------------------------------------------------

export type PlayPairVerdict = "COMPARED" | "DIVERGED" | "NO_CONTEST";

export interface PlayPair {
  readonly league: GoldenLeague;
  readonly game: number;
  readonly rating: string;
  readonly man: string;
  readonly verdict: PlayPairVerdict;
  readonly rngLabel?: string;
  readonly baseBand?: string;
  readonly raisedBand?: string;
  readonly baseMargin?: number;
  readonly raisedMargin?: number;
}

export interface PlayProbeRecord {
  readonly format: typeof STEP4_PLAY_PROBE_FORMAT;
  readonly stamp: ProbeStamp;
  /** Golden games with no rated contest (no pair drawn). */
  readonly noContest: number;
  readonly pairs: readonly PlayPair[];
}

const payloadOf = (e: MatchEventEnvelope): Readonly<Record<string, unknown>> => ((e.event as { readonly payload?: unknown }).payload ?? {}) as Readonly<Record<string, unknown>>;
const labelOf = (e: MatchEventEnvelope): string => String(((payloadOf(e)["roll"] ?? {}) as Readonly<Record<string, unknown>>)["rngLabel"] ?? "");

/** Whether an envelope is a rated `:contest` CHECK (P6's kind; never `:contest2`). */
export function isRatedContest(e: MatchEventEnvelope): boolean {
  return e.event.type === "CHECK" && payloadOf(e)["checkKind"] === ARRIVAL_CONTEST && !labelOf(e).endsWith(":contest2");
}

/** The stream position of a game's first rated contest, or -1. */
export function firstRatedContestAt(events: readonly MatchEventEnvelope[]): number {
  return events.findIndex(isRatedContest);
}

/**
 * One play-level pair (pure): the base game and the game replayed with one man raised. Compared only
 * when every event before the base's first rated contest is the same in both, so the same die lies
 * under the replayed contest; the replayed contest must then sit at the same position with the same
 * label (otherwise the pair diverged on the contest's own tick).
 */
export function playPairOf(base: readonly MatchEventEnvelope[], raised: readonly MatchEventEnvelope[], at: number, meta: Pick<PlayPair, "league" | "game" | "rating" | "man">): PlayPair {
  const b = base[at]!;
  for (let i = 0; i < at; i++) if (raised[i] === undefined || canonicalise(raised[i]) !== canonicalise(base[i])) return { ...meta, verdict: "DIVERGED", rngLabel: labelOf(b) };
  const r = raised[at];
  if (r === undefined || !isRatedContest(r) || labelOf(r) !== labelOf(b)) return { ...meta, verdict: "DIVERGED", rngLabel: labelOf(b) };
  return {
    ...meta,
    verdict: "COMPARED",
    rngLabel: labelOf(b),
    baseBand: String(payloadOf(b)["band"]),
    raisedBand: String(payloadOf(r)["band"]),
    baseMargin: Number(payloadOf(b)["margin"]),
    raisedMargin: Number(payloadOf(r)["margin"]),
  };
}

/** One golden game, its overrides applied: the observation and the snapshot as built. */
export type GoldenGamePlayer = (league: GoldenLeague, game: number, tunables: Tunables, ratings: readonly RatingOverride[]) => { readonly observation: SimGameObservation; readonly snapshot: GameSnapshot };

/** The golden corpora's games one at a time (the fixtures built once a league). */
export function goldenGamePlayer(): GoldenGamePlayer {
  const fixtures = new Map<GoldenLeague, ReturnType<typeof goldenFixtures>>();
  return (league, game, tunables, ratings) => {
    let f = fixtures.get(league);
    if (f === undefined) {
      f = goldenFixtures(league);
      fixtures.set(league, f);
    }
    const built = buildFixture(f.index, f.fixtures[game]!);
    const { observation } = runOneGame({ built, seed: f.seeds[game]!, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, tunables, callerVersion: STEP1_CALLER, ...(ratings.length === 0 ? {} : { ratings }) });
    return { observation, snapshot: built.snapshot };
  };
}

export const GOLDEN_PROBE_GAMES = 50;

export interface PlayLevelOptions extends Omit<PlayProbeOptions, "playGames"> {
  /** Tests only: plays one golden game (default `goldenGamePlayer()`). */
  readonly playGolden?: GoldenGamePlayer;
  /** Tests only: the first n games of each golden league (default 50). */
  readonly first?: number;
}

/** The play-level probe: each golden game's first rated contest, replayed once per raise on its named man. */
export function playPlayLevelProbe(opts: PlayLevelOptions): PlayProbeRecord {
  const corpus = opts.corpus ?? FULL_CORPUS;
  const arm = probeArmOf(PLAY_PROBE_ARM, opts.petitions);
  const play = opts.playGolden ?? goldenGamePlayer();
  const n = opts.first ?? GOLDEN_PROBE_GAMES;
  const pairs: PlayPair[] = [];
  let noContest = 0;
  for (const league of ["flat", "gen"] as const) {
    for (let game = 0; game < n; game++) {
      const base = play(league, game, arm.tunables, []).observation.events;
      const at = firstRatedContestAt(base);
      if (at < 0) {
        noContest += 1;
        continue;
      }
      const actors = payloadOf(base[at]!)["actors"];
      const [rusher, quarterback] = Array.isArray(actors) ? actors.map(String) : [];
      for (const r of PLAY_PROBE_RATINGS) {
        const man = r.man === "QUARTERBACK" ? quarterback : rusher;
        if (man === undefined || man.length === 0) continue;
        const raised = play(league, game, arm.tunables, [{ attr: r.rating, target: { kind: "PLAYER", player: man }, change: { op: "ADD", delta: PROBE_RAISE } }]).observation.events;
        pairs.push(playPairOf(base, raised, at, { league, game, rating: r.rating, man }));
      }
    }
  }
  return { format: STEP4_PLAY_PROBE_FORMAT, stamp: probeStampOf(PLAY_PROBE_RUN, null, opts.env, opts.amendments, corpus, arm), noContest, pairs };
}

// --- the readings (pure) ----------------------------------------------------------------------------------

const per100 = (x: number, n: number): number | null => (n > 0 ? (100 * x) / n : null);
const fmt = (v: number | null | undefined, dp = 2): string => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : v.toFixed(dp));

/** Two rates' difference (a less b, per 100) with its independent binomial SE. */
export function independentDiff(a: { readonly x: number; readonly n: number }, b: { readonly x: number; readonly n: number }): { readonly diff: number | null; readonly se: number | null } {
  if (a.n === 0 || b.n === 0) return { diff: null, se: null };
  const p1 = a.x / a.n;
  const p2 = b.x / b.n;
  return { diff: 100 * (p1 - p2), se: 100 * Math.sqrt((p1 * (1 - p1)) / a.n + (p2 * (1 - p2)) / b.n) };
}

/**
 * Two ratio rates' difference (a less b, per 100) over paired games (game g of a against game g of
 * b, the same seed), with the paired SE of the linearised ratio: each game's residual
 * (x_a - p_a n_a)/N_a - (x_b - p_b n_b)/N_b, summed in square, times G/(G - 1).
 */
export function pairedDiff(a: readonly { readonly x: number; readonly n: number }[], b: readonly { readonly x: number; readonly n: number }[]): { readonly diff: number | null; readonly se: number | null } {
  if (a.length !== b.length) throw new RangeError(`paired probes: ${String(a.length)} games against ${String(b.length)}; a pair is game by game`);
  const sum = (v: readonly { readonly x: number; readonly n: number }[]): { x: number; n: number } => v.reduce((s, g) => ({ x: s.x + g.x, n: s.n + g.n }), { x: 0, n: 0 });
  const A = sum(a);
  const B = sum(b);
  if (A.n === 0 || B.n === 0) return { diff: null, se: null };
  const pa = A.x / A.n;
  const pb = B.x / B.n;
  const G = a.length;
  if (G < 2) return { diff: 100 * (pa - pb), se: null };
  let ss = 0;
  for (let g = 0; g < G; g++) {
    const u = (a[g]!.x - pa * a[g]!.n) / A.n - (b[g]!.x - pb * b[g]!.n) / B.n;
    ss += u * u;
  }
  return { diff: 100 * (pa - pb), se: 100 * Math.sqrt((ss * G) / (G - 1)) };
}

export type ProbeRecords = ReadonlyMap<string, Readonly<Partial<Record<SeedSet, ProbeRecord>>>>;

export interface Step4ProbeGrade {
  readonly clauses: readonly Step2ClauseResult[];
  readonly lines: readonly string[];
  readonly structuralFailures: readonly string[];
}

const pick = (games: readonly ProbeGame[], f: (g: ProbeGame) => { readonly x: number; readonly n: number }): { x: number; n: number }[] => games.map((g) => ({ ...f(g) }));
const total = (v: readonly { readonly x: number; readonly n: number }[]): { x: number; n: number } => v.reduce((s, g) => ({ x: s.x + g.x, n: s.n + g.n }), { x: 0, n: 0 });

/** The release probe's reading (AM-7 item 13): release 80 against 40, THROWING hits per 100 aimed throws, both sets summed. */
export function releaseReading(records: ProbeRecords): { readonly verdict: "PASS" | "FAIL" | "NOT PLAYED"; readonly values: readonly string[] } {
  const lo = records.get("PR-REL40");
  const hi = records.get("PR-REL80");
  const sets = SEED_SETS.filter((s) => lo?.[s] !== undefined && hi?.[s] !== undefined);
  if (sets.length !== SEED_SETS.length) return { verdict: "NOT PLAYED", values: [`not played: ${SEED_SETS.filter((s) => !sets.includes(s)).map((s) => `set ${String(s)}`).join(", ")}`] };
  const hitOf = (g: ProbeGame) => ({ x: g.all.throwingHit, n: g.all.aimed });
  const lines: string[] = [];
  const allLo: { x: number; n: number }[] = [];
  const allHi: { x: number; n: number }[] = [];
  for (const s of sets) {
    const l = pick(lo![s]!.games, hitOf);
    const h = pick(hi![s]!.games, hitOf);
    allLo.push(...l);
    allHi.push(...h);
    const ind = independentDiff(total(h), total(l));
    const pair = pairedDiff(h, l);
    lines.push(`set ${String(s)}: release ${String(RELEASE_HI)} ${fmt(per100(total(h).x, total(h).n))} (${String(total(h).x)}/${String(total(h).n)}) against release ${String(RELEASE_LO)} ${fmt(per100(total(l).x, total(l).n))} (${String(total(l).x)}/${String(total(l).n)}); difference ${fmt(ind.diff)} (SE ${fmt(ind.se)}, paired SE ${fmt(pair.se)}), beside`);
  }
  const ind = independentDiff(total(allHi), total(allLo));
  const pair = pairedDiff(allHi, allLo);
  const measurable = ind.diff !== null && ind.se !== null && ind.diff < -2 * ind.se;
  return {
    verdict: measurable ? "PASS" : "FAIL",
    values: [
      `both sets summed: THROWING hits per 100 aimed throws, release ${String(RELEASE_HI)} ${fmt(per100(total(allHi).x, total(allHi).n))} against release ${String(RELEASE_LO)} ${fmt(per100(total(allLo).x, total(allLo).n))}; difference ${fmt(ind.diff)} points, SE ${fmt(ind.se)} (independent; paired SE ${fmt(pair.se)} beside); ${measurable ? "beyond 2 SE in its direction (more release, fewer hits): measurable" : "not beyond 2 SE in its direction: no measurable effect"}`,
      ...lines,
    ],
  };
}

/** The paired gen probe (printed beside, never graded): the home side's THROWING hits per 100 aimed throws, raised against unraised. */
export function genReleaseLines(records: ProbeRecords): readonly string[] {
  const base = records.get("PR-RELGEN-BASE");
  const raised = records.get("PR-RELGEN-QB");
  return SEED_SETS.map((s) => {
    const b = base?.[s];
    const r = raised?.[s];
    if (b === undefined || r === undefined) return `gen set ${String(s)}: not played`;
    const hitOf = (g: ProbeGame) => ({ x: g.home.throwingHit, n: g.home.aimed });
    const bh = pick(b.games, hitOf);
    const rh = pick(r.games, hitOf);
    const pair = pairedDiff(rh, bh);
    return `gen set ${String(s)} (printed beside, never graded): the home quarterback's release raised ${String(GEN_RELEASE_RAISE)} (one team's quarterback in every game; clamped at 99): home THROWING hits per 100 aimed throws ${fmt(per100(total(rh).x, total(rh).n))} against ${fmt(per100(total(bh).x, total(bh).n))} unraised; difference ${fmt(pair.diff)} (paired SE ${fmt(pair.se)})`;
  });
}

/** The game-level rating probes (printed with their paired SE, never graded). */
export function ratingGameLines(records: ProbeRecords): readonly string[] {
  const base = records.get("PR-RAT-BASE");
  const out: string[] = [];
  for (const def of STEP4_PROBE_RUNS.filter((r) => r.kind === "RATING" && r.pairedWith !== undefined)) {
    const run = records.get(def.id);
    for (const s of SEED_SETS) {
      const b = base?.[s];
      const r = run?.[s];
      if (b === undefined || r === undefined) {
        out.push(`${def.id} set ${String(s)}: not played`);
        continue;
      }
      const sacks = pairedDiff(pick(r.games, (g) => ({ x: g.all.sacks, n: g.all.dropbacks })), pick(b.games, (g) => ({ x: g.all.sacks, n: g.all.dropbacks })));
      const wr = (g: ProbeGame) => g.watch[def.id] ?? watchCounts();
      const share = pairedDiff(pick(r.games, (g) => ({ x: wr(g).contestSacks, n: wr(g).contests })), pick(b.games, (g) => ({ x: wr(g).contestSacks, n: wr(g).contests })));
      const rt = total(pick(r.games, (g) => ({ x: g.all.sacks, n: g.all.dropbacks })));
      const bt = total(pick(b.games, (g) => ({ x: g.all.sacks, n: g.all.dropbacks })));
      out.push(
        `${def.id} set ${String(s)} (${def.what}; printed, never graded): sacks per 100 dropbacks ${fmt(per100(rt.x, rt.n))} against ${fmt(per100(bt.x, bt.n))}, difference ${fmt(sacks.diff)} (paired SE ${fmt(sacks.se)}); ` +
          `the raised men's first contests ending in a sack ${fmt(share.diff)} points (paired SE ${fmt(share.se)})`,
      );
      if (def.ratings.some((o) => o.attr === "speed" || o.attr === "tackling")) {
        const arr = pairedDiff(pick(r.games, (g) => ({ x: wr(g).arrivals, n: g.all.dropbacks })), pick(b.games, (g) => ({ x: wr(g).arrivals, n: g.all.dropbacks })));
        const per = pairedDiff(pick(r.games, (g) => ({ x: wr(g).arrivalSacks, n: wr(g).arrivals })), pick(b.games, (g) => ({ x: wr(g).arrivalSacks, n: wr(g).arrivals })));
        out.push(`  ${def.id} set ${String(s)}, apart: the raised rushers' arrivals (rated contests) per 100 dropbacks ${fmt(arr.diff)} (paired SE ${fmt(arr.se)}); their sacks per 100 contests ${fmt(per.diff)} (paired SE ${fmt(per.se)})`);
      }
    }
  }
  return out;
}

/** The play-level probe's reading: what moved, and the failures (a quarterback's raise moving a contest toward the sack; a rusher's moving it away). */
export function playLevelReading(record: PlayProbeRecord | undefined): { readonly verdict: "PASS" | "FAIL" | "NOT PLAYED" | "NOT JUDGED"; readonly values: readonly string[]; readonly qbWrong: readonly string[]; readonly rusherWrong: readonly string[] } {
  if (record === undefined) return { verdict: "NOT PLAYED", values: ["not played: PR-PLAY"], qbWrong: [], rusherWrong: [] };
  const qbWrong: string[] = [];
  const rusherWrong: string[] = [];
  const values: string[] = [];
  for (const r of PLAY_PROBE_RATINGS) {
    const ps = record.pairs.filter((p) => p.rating === r.rating);
    const cmp = ps.filter((p) => p.verdict === "COMPARED");
    const toSack = cmp.filter((p) => p.baseBand === "QB_SHEDS" && p.raisedBand === "RUSHER_SACKS").length;
    const toShed = cmp.filter((p) => p.baseBand === "RUSHER_SACKS" && p.raisedBand === "QB_SHEDS").length;
    const up = cmp.filter((p) => p.raisedMargin! > p.baseMargin!).length;
    const down = cmp.filter((p) => p.raisedMargin! < p.baseMargin!).length;
    values.push(`${r.man === "QUARTERBACK" ? "the quarterback's" : "the rusher's"} ${r.rating} +${String(PROBE_RAISE)}: ${String(cmp.length)} compared, ${String(ps.length - cmp.length)} diverged before the contest; margin up ${String(up)}, down ${String(down)}; shed to sack ${String(toSack)}, sack to shed ${String(toShed)}`);
    for (const p of cmp) {
      const where = `${p.league} game ${String(p.game)} ${p.rngLabel ?? ""}: ${r.rating} on ${p.man} moved the margin ${String(p.baseMargin)} to ${String(p.raisedMargin)} (${String(p.baseBand)} to ${String(p.raisedBand)})`;
      if (r.man === "QUARTERBACK" && (p.raisedMargin! > p.baseMargin! || (p.baseBand === "QB_SHEDS" && p.raisedBand === "RUSHER_SACKS"))) qbWrong.push(where);
      if (r.man === "RUSHER" && (p.raisedMargin! < p.baseMargin! || (p.baseBand === "RUSHER_SACKS" && p.raisedBand === "QB_SHEDS"))) rusherWrong.push(where);
    }
  }
  values.push(`${String(record.noContest)} golden game(s) with no rated contest`);
  const qbCompared = record.pairs.some((p) => p.verdict === "COMPARED" && (p.rating === "strength" || p.rating === "agility"));
  const verdict = qbWrong.length > 0 ? "FAIL" : qbCompared ? "PASS" : "NOT JUDGED";
  return { verdict, values, qbWrong, rusherWrong };
}

/**
 * The two falsifiers' clauses and the probes' printed lines (pure). `s4.falsifier.release` is
 * structural and reads the release probe; `s4.falsifier.ratingProbes` is structural and reads the
 * play-level probe (the contest's exactness is the engine's unit proof, named); the game-level and
 * gen probes are printed, never graded.
 */
export function gradeStep4Probes(records: ProbeRecords, play: PlayProbeRecord | undefined): Step4ProbeGrade {
  const structuralFailures: string[] = [];
  const clauses: Step2ClauseResult[] = [];
  const release = releaseReading(records);
  clauses.push({
    id: "s4.falsifier.release",
    kind: "structural",
    arms: ["PR-REL80", "PR-REL40"],
    filed: "structural",
    values: release.values,
    verdict: release.verdict,
    note: `AM-7 item 13: D6's bundle on the flat league, release ${String(RELEASE_HI)} against ${String(RELEASE_LO)} on every player, both sets summed; measurable is the difference beyond 2 SE in its direction (more release, fewer hits); falsified when it is not`,
  });
  if (release.verdict === "FAIL") structuralFailures.push(`s4.falsifier.release: ${release.values[0] ?? ""}`);
  const p = playLevelReading(play);
  clauses.push({
    id: "s4.falsifier.ratingProbes",
    kind: "structural",
    arms: [PLAY_PROBE_RUN],
    filed: "structural",
    values: [...p.values, ...p.qbWrong.slice(0, 3)],
    verdict: p.verdict,
    note: "AM-7 item 14: exact at the contest for every b and tilt (the engine's unit proof, contact.test.ts); the play-level probe replays each golden game's first rated contest with one man raised, and a quarterback's strength or agility that moves a compared contest toward the sack falsifies it; the game-level probes are printed with their paired SE, never graded",
  });
  if (p.verdict === "FAIL") structuralFailures.push(`s4.falsifier.ratingProbes: ${String(p.qbWrong.length)} compared contest(s) moved toward the sack by the quarterback's raise, first: ${p.qbWrong[0] ?? ""}`);
  if (p.rusherWrong.length > 0) structuralFailures.push(`the play-level probe (a build fault beside the clause): ${String(p.rusherWrong.length)} compared contest(s) moved away from the sack by the rusher's raise, first: ${p.rusherWrong[0] ?? ""}`);
  const lines = [...genReleaseLines(records), ...ratingGameLines(records)];
  return { clauses, lines, structuralFailures };
}

// --- the cache and the run ----------------------------------------------------------------------------------

export interface ProbeTarget {
  readonly id: string;
  /** Null for the play-level probe (the golden corpora have one seed batch). */
  readonly seedSet: SeedSet | null;
}

export const probeTargetName = (t: ProbeTarget): string => (t.seedSet === null ? t.id : `${t.id}.set${String(t.seedSet)}`);

/** Every probe target, in order: each run on both sets, then the play-level probe. */
export const STEP4_PROBE_TARGETS: readonly ProbeTarget[] = Object.freeze([...STEP4_PROBE_RUNS.flatMap((r) => SEED_SETS.map((seedSet) => ({ id: r.id, seedSet }))), { id: PLAY_PROBE_RUN, seedSet: null }]);

export const probeFileOf = (dir: string, t: ProbeTarget): string => join(dir, `${probeTargetName(t)}.json`);

/** The probes' cache directory for a fingerprint (never an arm's: `pocket-step4-probes`, not `pocket-step4`). */
export function probeCacheDir(cacheParent: string, env: Step1Env): string {
  const dir = join(cacheParent, env.fingerprint);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export interface ProbeRunOptions {
  readonly env: Step1Env;
  readonly amendments: string;
  readonly cacheDir: string;
  readonly corpus?: Step1Corpus;
  readonly shard?: { readonly index: number; readonly count: number };
  readonly log?: (line: string) => void;
  readonly petitions?: Step4Petitions;
  readonly playGames?: ProbeGamesPlayer;
  readonly playGolden?: GoldenGamePlayer;
  readonly first?: number;
}

function probeArmFor(t: ProbeTarget, petitions?: Step4Petitions): Arm {
  return probeArmOf(t.seedSet === null ? PLAY_PROBE_ARM : probeRunById(t.id).arm, petitions);
}

function readProbeFile(path: string, t: ProbeTarget, want: ProbeStamp): ProbeRecord | PlayProbeRecord {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as ProbeRecord | PlayProbeRecord;
  const format = t.seedSet === null ? STEP4_PLAY_PROBE_FORMAT : STEP4_PROBE_FORMAT;
  if (parsed.format !== format) throw new Error(`${path}: not a step-4 probe record (format ${String((parsed as { format?: unknown }).format)})`);
  const problems = stampProblems(parsed.stamp, want);
  if (problems.length > 0) throw new Error(`ADR-089 step 4: the cached probe ${probeTargetName(t)} at ${path} is not this build's: ${problems.join("; ")}. Delete it, or use another --cache`);
  return parsed;
}

/** Plays this shard's probe targets not yet cached; every target already cached is checked against this build's stamp. */
export function playProbeTargets(opts: ProbeRunOptions): { readonly played: readonly string[]; readonly cached: readonly string[] } {
  const shard = opts.shard ?? { index: 1, count: 1 };
  const corpus = opts.corpus ?? FULL_CORPUS;
  const log = opts.log ?? ((): void => undefined);
  const played: string[] = [];
  const cached: string[] = [];
  STEP4_PROBE_TARGETS.forEach((t, i) => {
    if (i % shard.count !== shard.index - 1) return;
    const path = probeFileOf(opts.cacheDir, t);
    const want = probeStampOf(t.id, t.seedSet, opts.env, opts.amendments, corpus, probeArmFor(t, opts.petitions));
    if (existsSync(path)) {
      readProbeFile(path, t, want);
      cached.push(probeTargetName(t));
      log(`pocket step 4 probes: ${probeTargetName(t)} is cached`);
      return;
    }
    log(`pocket step 4 probes: playing ${probeTargetName(t)}`);
    const common = { env: opts.env, amendments: opts.amendments, corpus, ...(opts.petitions === undefined ? {} : { petitions: opts.petitions }) };
    const record =
      t.seedSet === null
        ? playPlayLevelProbe({ ...common, ...(opts.playGolden === undefined ? {} : { playGolden: opts.playGolden }), ...(opts.first === undefined ? {} : { first: opts.first }) })
        : playProbeRun(t.id, t.seedSet, { ...common, ...(opts.playGames === undefined ? {} : { playGames: opts.playGames }) });
    writeAtomic(path, jsonText(record));
    played.push(probeTargetName(t));
  });
  return { played, cached };
}

/** Every probe record in the cache, checked against this build's stamps; undefined while any target is missing. */
export function readProbeRecords(opts: Pick<ProbeRunOptions, "env" | "amendments" | "cacheDir" | "corpus" | "petitions">): { readonly records: ProbeRecords; readonly play: PlayProbeRecord } | undefined {
  const corpus = opts.corpus ?? FULL_CORPUS;
  if (STEP4_PROBE_TARGETS.some((t) => !existsSync(probeFileOf(opts.cacheDir, t)))) return undefined;
  const records = new Map<string, Partial<Record<SeedSet, ProbeRecord>>>();
  let play: PlayProbeRecord | undefined;
  for (const t of STEP4_PROBE_TARGETS) {
    const r = readProbeFile(probeFileOf(opts.cacheDir, t), t, probeStampOf(t.id, t.seedSet, opts.env, opts.amendments, corpus, probeArmFor(t, opts.petitions)));
    if (t.seedSet === null) play = r as PlayProbeRecord;
    else records.set(t.id, { ...(records.get(t.id) ?? {}), [t.seedSet]: r as ProbeRecord });
  }
  return { records, play: play! };
}

/** The probes' targets not yet in the cache, by name. */
export function remainingProbeTargets(cacheDir: string): readonly string[] {
  return STEP4_PROBE_TARGETS.filter((t) => !existsSync(probeFileOf(cacheDir, t))).map(probeTargetName);
}

/** The probes' section of a report: the two clauses and the printed lines. */
export function renderProbeSection(g: Step4ProbeGrade): readonly string[] {
  return [
    "## The step-4 probes (AM-7 items 13 and 14)",
    "",
    ...g.clauses.map((c) => `- ${c.id} (${c.kind}; ${c.arms.join(" against ")}): ${c.verdict}${c.values.length === 0 ? "" : `: ${c.values.join("; ")}`}${c.note === undefined ? "" : ` (${c.note})`}`),
    ...g.structuralFailures.map((f) => `- STRUCTURAL: ${f}`),
    ...g.lines.map((l) => `- ${l}`),
    "",
  ];
}
