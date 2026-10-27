/**
 * AM-1's READING OF THE INTERCEPTION GUARD (ADR-089 Appendix F, F.11; the amendment's §4.3 to §4.5;
 * step-2 plan §4.2, §4.3, §5 on F.9 items 4 and 8).
 *
 * From step 2 each arm is read against the previous step's arm with the same settings except this
 * step's mechanisms (the filed base map, `amendments.ts`'s `guardFor`), on the same seeds, both seed
 * sets. On each set s, for one reading (one league, league-wide or one class):
 *
 *  - rise_s and allowed_s are the filed rule's (`bands.ts`'s `intGuard`, points per 100 aimed throws,
 *    on the arm's own release clock); the filed reading, `rise_s <= allowed_s`, is kept beside;
 *  - SE_s is `step1.ts`'s `guardNoise`, the binomial SE with the two arms read as independent;
 *  - z_s = (rise_s - allowed_s) / SE_s, and a set whose SE is 0 scores `zSetSE0` (0) and is kept;
 *  - Z = (z1 + z2) / sqrt 2; a reading breaches when Z is above its line, 2.0 league-wide and 3.0 in
 *    a class (strict: Z exactly at the line passes).
 *
 * **e\*, the minimum excess.** With the two sets' SEs, a mean excess e common to both sets gives
 * Z = (e / SE_1 + e / SE_2) / sqrt 2, so the reading breaches once e > e* = line x sqrt 2 /
 * (1 / SE_1 + 1 / SE_2); with equal SEs that is AM-1's line x SE / sqrt 2. It is printed beside every
 * reading (null when a set's SE is 0 or only one set was read).
 *
 * **What is not graded.** A reading with one seed set is reported, not graded (an arm played on one
 * set cannot close a step). A class reading is graded only when the class is SCORED on both sets;
 * where either set has no aimed throws in base or arm, it is REMOVED or NO_BASE there, as filed, and
 * reported with its counts. Each reading stands on its own: a fall in one class never offsets a rise
 * in another, and a league-wide pass never excuses a class breach (or the reverse).
 *
 * **Reported only, never graded:** the paired, game-clustered SE and its Z (the delta method over
 * the per-game guard vectors `s2Stream.ts` keeps, the allowance's noise included, as the drafter's
 * paired study computed it; S4-2), and DESPERATION's dirty and clean halves (`desperationPocketOf`,
 * the last status at or before the release; F.9 item 4), each with its own Z, and the rise
 * re-weighted to the base's composition of halves (AM-1 §4.5).
 */
import type { ThrowClass } from "./constructs.js";
import type { SeedSet } from "./corpus.js";
import { GUARD_CLASSES, intGuard, intGuardByClass, type GuardClock, type IntMix } from "./bands.js";
import type { GuardCell, GuardGameVector } from "./s2Stream.js";
import { REAL } from "./selection.js";
import { guardNoise } from "./step1.js";
import type { DesperationPocket } from "./throwClass.js";

export const SEED_SETS: readonly SeedSet[] = Object.freeze([1, 2] as const);

/** The lines AM-1 files (`rule.zLeague`, `rule.zClass`, `rule.zSetSE0`); the harness reads them from the file. */
export interface Am1Lines {
  readonly zLeague: number;
  readonly zClass: number;
  readonly zSetSE0: number;
}

/** AM-1 as filed: 2.0 league-wide, 3.0 in a class, a set with SE 0 scoring 0. */
export const AM1_LINES: Am1Lines = Object.freeze({ zLeague: 2.0, zClass: 3.0, zSetSE0: 0 });

/** A league-wide reading (`guard.mix`) or a class reading (`guard.byClass`). */
export type Am1Kind = "LEAGUE" | "CLASS";

const lineOf = (kind: Am1Kind, lines: Am1Lines): number => (kind === "LEAGUE" ? lines.zLeague : lines.zClass);
const aimedOf = (m: IntMix): number => m.aimedByBin.reduce((a, b) => a + b, 0);

/** One seed set's reading. */
export interface Am1SetReading {
  readonly seedSet: SeedSet;
  readonly baseAimed: number;
  readonly baseInterceptions: number;
  readonly armAimed: number;
  readonly armInterceptions: number;
  readonly baseRate: number;
  readonly armRate: number;
  readonly rise: number;
  readonly allowed: number;
  /** rise - allowed. */
  readonly excess: number;
  readonly se: number;
  /** (rise - allowed) / SE; `zSetSE0` when SE is 0. */
  readonly z: number;
  readonly seZero: boolean;
  /** The filed reading on this set: rise at most the allowance (no noise term). */
  readonly filedPasses: boolean;
}

export type Am1Verdict = "PASS" | "BREACH" | "REPORTED";

export interface Am1Reading {
  readonly kind: Am1Kind;
  readonly line: number;
  readonly sets: readonly Am1SetReading[];
  /** (z1 + z2) / sqrt 2; null unless both seed sets were read. */
  readonly Z: number | null;
  /** The minimum mean excess that breaches (see the module doc); null without two sets or with an SE of 0. */
  readonly eStar: number | null;
  readonly meanExcess: number;
  /** Both seed sets read: the reading counts toward the step. */
  readonly graded: boolean;
  /** PASS or BREACH when graded; REPORTED otherwise. */
  readonly verdict: Am1Verdict;
  /** The filed verdict beside: every set's rise at most its allowance. */
  readonly filedPasses: boolean;
}

/** One set's reading of one population. */
function setReading(seedSet: SeedSet, base: IntMix, arm: IntMix, clock: GuardClock, lines: Am1Lines): Am1SetReading {
  const v = intGuard(base, arm, clock);
  const n = guardNoise(base, arm, v);
  return {
    seedSet,
    baseAimed: aimedOf(base),
    baseInterceptions: base.interceptions,
    armAimed: aimedOf(arm),
    armInterceptions: arm.interceptions,
    baseRate: v.baseRate,
    armRate: v.armRate,
    rise: v.rise,
    allowed: v.allowed,
    excess: v.rise - v.allowed,
    se: n.se,
    z: n.z ?? lines.zSetSE0,
    seZero: n.z === null,
    filedPasses: v.passes,
  };
}

/**
 * The sets of a reading whose SE is 0 while the arm's rise is above its allowance (review CT-F3).
 * AM-1 scores such a set `zSetSE0` (0), as filed, so a set where base and arm rates sit at 0 or 1
 * and differ (base 0 of 3, arm 2 of 2: a 100-point rise) pulls the pooled Z down, and one more
 * interception can turn a BREACH into a PASS. The reading is kept as filed; the guard section flags
 * each such set, and whether it should make the reading REPORTED (or take a continuity-corrected SE)
 * is a question for an AM-2, which only the Orchestrator files.
 */
export function seZeroWithExcess(r: Am1Reading): readonly SeedSet[] {
  return r.sets.filter((s) => s.seZero && s.excess > 0).map((s) => s.seedSet);
}

/** Pools the set readings into AM-1's reading. */
function pool(kind: Am1Kind, sets: readonly Am1SetReading[], lines: Am1Lines): Am1Reading {
  const line = lineOf(kind, lines);
  const two = sets.length === 2;
  const Z = two ? (sets[0]!.z + sets[1]!.z) / Math.SQRT2 : null;
  const eStar = two && sets.every((s) => s.se > 0) ? (line * Math.SQRT2) / (1 / sets[0]!.se + 1 / sets[1]!.se) : null;
  return {
    kind,
    line,
    sets,
    Z,
    eStar,
    meanExcess: sets.reduce((a, s) => a + s.excess, 0) / sets.length,
    graded: two,
    verdict: Z === null ? "REPORTED" : Z > line ? "BREACH" : "PASS",
    filedPasses: sets.every((s) => s.filedPasses),
  };
}

/**
 * AM-1's reading of one population (league-wide or one class) of an arm against its base, by seed
 * set. Each set present in both is read; with both sets the reading is graded, with one it is
 * reported. Every population must have aimed throws on both sides (a class without them is
 * `am1ClassReading`'s REMOVED or NO_BASE, never this).
 */
export function am1Reading(
  baseBySet: Readonly<Partial<Record<SeedSet, IntMix>>>,
  armBySet: Readonly<Partial<Record<SeedSet, IntMix>>>,
  clock: GuardClock,
  kind: Am1Kind,
  lines: Am1Lines = AM1_LINES,
): Am1Reading {
  const sets: Am1SetReading[] = [];
  for (const s of SEED_SETS) {
    const b = baseBySet[s];
    const a = armBySet[s];
    if (b === undefined || a === undefined) continue;
    if (!(aimedOf(b) > 0) || !(aimedOf(a) > 0)) throw new Error(`am1Reading: seed set ${String(s)} has no aimed throws in ${aimedOf(b) > 0 ? "the arm" : "the base"}; a class without them is REMOVED or NO_BASE (am1ClassReading)`);
    sets.push(setReading(s, b, a, clock, lines));
  }
  if (sets.length === 0) throw new Error("am1Reading: no seed set holds both the base and the arm");
  return pool(kind, sets, lines);
}

/** What a guard reading reads of one arm on one league and seed set: the league's aimed throws and each class's. */
export interface GuardSide {
  readonly all: IntMix;
  readonly byClass: Readonly<Partial<Record<ThrowClass, IntMix>>>;
}

/** A class's status on one set, as the filed `intGuardByClass` gives it. */
export type ClassSetStatus =
  | { readonly seedSet: SeedSet; readonly status: "SCORED" }
  | { readonly seedSet: SeedSet; readonly status: "REMOVED"; readonly baseThrows: number; readonly baseInterceptions: number }
  | { readonly seedSet: SeedSet; readonly status: "NO_BASE"; readonly armThrows: number; readonly armInterceptions: number };

export interface Am1ClassReading {
  readonly cls: ThrowClass;
  /** Each set's status (a set where the class is empty on both sides is absent). */
  readonly bySet: readonly ClassSetStatus[];
  /** The reading over the sets where the class is SCORED; absent when it is scored on none. */
  readonly reading?: Am1Reading;
  /** Graded only when SCORED on both sets. */
  readonly graded: boolean;
}

/** AM-1's reading of one class (`GUARD_CLASSES`), by set. */
export function am1ClassReading(
  baseBySet: Readonly<Partial<Record<SeedSet, GuardSide>>>,
  armBySet: Readonly<Partial<Record<SeedSet, GuardSide>>>,
  clock: GuardClock,
  cls: ThrowClass,
  lines: Am1Lines = AM1_LINES,
): Am1ClassReading {
  const bySet: ClassSetStatus[] = [];
  const scored: Am1SetReading[] = [];
  let present = 0;
  for (const s of SEED_SETS) {
    const b = baseBySet[s];
    const a = armBySet[s];
    if (b === undefined || a === undefined) continue;
    present += 1;
    const v = intGuardByClass(b.byClass, a.byClass, clock).byClass[cls];
    if (v === undefined) continue;
    if (v.status === "SCORED") {
      bySet.push({ seedSet: s, status: "SCORED" });
      scored.push(setReading(s, b.byClass[cls]!, a.byClass[cls]!, clock, lines));
    } else bySet.push({ seedSet: s, ...v });
  }
  const reading = scored.length === 0 ? undefined : pool("CLASS", scored, lines);
  const graded = present === 2 && scored.length === 2;
  // A class scored on one set and REMOVED or NO_BASE on the other is not graded (AM-1 §4.5): its
  // pooled reading is reported only.
  return { cls, bySet, ...(reading === undefined ? {} : { reading: graded ? reading : { ...reading, graded: false, verdict: "REPORTED", Z: null, eStar: null } }), graded };
}

/** AM-1's readings of one arm against its base on one league: league-wide, then every guard class. */
export interface Am1ArmReading {
  readonly league: Am1Reading;
  readonly classes: readonly Am1ClassReading[];
  /** Both seed sets read: the arm's readings count toward the step. */
  readonly graded: boolean;
  /** The readings that breach: "league-wide", or the class. */
  readonly breaches: readonly string[];
  /** The filed rule beside: the league-wide and class readings whose rise exceeds the allowance on some set. */
  readonly filedBreaches: readonly string[];
}

export function am1ArmReading(
  baseBySet: Readonly<Partial<Record<SeedSet, GuardSide>>>,
  armBySet: Readonly<Partial<Record<SeedSet, GuardSide>>>,
  clock: GuardClock,
  lines: Am1Lines = AM1_LINES,
): Am1ArmReading {
  const all = (by: Readonly<Partial<Record<SeedSet, GuardSide>>>): Partial<Record<SeedSet, IntMix>> => Object.fromEntries(SEED_SETS.flatMap((s) => (by[s] === undefined ? [] : [[s, by[s]!.all]])));
  const league = am1Reading(all(baseBySet), all(armBySet), clock, "LEAGUE", lines);
  const classes = GUARD_CLASSES.map((cls) => am1ClassReading(baseBySet, armBySet, clock, cls, lines)).filter((c) => c.bySet.length > 0);
  const breaches = [...(league.verdict === "BREACH" ? ["league-wide"] : []), ...classes.flatMap((c) => (c.reading?.verdict === "BREACH" ? [c.cls] : []))];
  const filedBreaches = [...(league.filedPasses ? [] : ["league-wide"]), ...classes.flatMap((c) => (c.reading !== undefined && !c.reading.filedPasses ? [c.cls] : []))];
  return { league, classes, graded: league.graded, breaches, filedBreaches };
}

// --- reported: the paired, game-clustered SE (S4-2) ------------------------------------------------------

/** A per-game population: league-wide (every class), one class, or one DESPERATION half. */
export type GamePopulation = { readonly of: "LEAGUE" } | { readonly of: "CLASS"; readonly cls: ThrowClass } | { readonly of: "HALF"; readonly half: DesperationPocket };

const BINS = REAL.intPerAimedTick.length;

function cellOf(v: GuardGameVector, pop: GamePopulation): { bins: number[]; ints: number } {
  const add = (cells: readonly (GuardCell | undefined)[]): { bins: number[]; ints: number } => {
    const bins = new Array<number>(BINS).fill(0);
    let ints = 0;
    for (const c of cells) {
      if (c === undefined) continue;
      c.aimedByBin.forEach((x, i) => (bins[i] = (bins[i] ?? 0) + x));
      ints += c.interceptions;
    }
    return { bins, ints };
  };
  if (pop.of === "LEAGUE") return add(Object.values(v.classes));
  if (pop.of === "CLASS") return add([v.classes[pop.cls]]);
  return add([v.desperation[pop.half]]);
}

export interface PairedSet {
  readonly seedSet: SeedSet;
  readonly games: number;
  readonly excess: number;
  /** The paired SE of the excess (rise minus allowance), points per 100 aimed throws. */
  readonly se: number;
  /** excess / SE; null when SE is 0. */
  readonly z: number | null;
}

/**
 * The excess and its paired, game-clustered SE on one set: games pair by their place in the fold and
 * must carry the same game id (the same seeds), and each game's contribution is the delta method's
 * for the rise minus the allowance (the allowance's own noise included):
 * u_g = 100 [(Ia_g - ra Na_g) / Na_bar - (Ib_g - rb Nb_g) / Nb_bar] - sum_i r_i [(Na_gi - sa_i Na_g) / Na_bar - (Nb_gi - sb_i Nb_g) / Nb_bar],
 * SE = sqrt(G / (G - 1) * sum u_g^2) / G. Null when either side has no aimed throws, or G < 2.
 */
export function pairedSet(seedSet: SeedSet, baseGames: readonly GuardGameVector[], armGames: readonly GuardGameVector[], pop: GamePopulation, clock: GuardClock): PairedSet | null {
  if (baseGames.length !== armGames.length) throw new Error(`pairedSet: the base played ${String(baseGames.length)} games and the arm ${String(armGames.length)} on seed set ${String(seedSet)}; paired games are the same seeds`);
  const G = baseGames.length;
  const rates = clock === "TICK" ? REAL.intPerAimedTick : REAL.intPerAimedRaw;
  const A = armGames.map((v, i) => {
    const b = baseGames[i]!;
    if (v.game !== b.game || v.gameId !== b.gameId) throw new Error(`pairedSet: game ${String(i)} is ${b.gameId} in the base and ${v.gameId} in the arm; paired games are the same seeds`);
    return cellOf(v, pop);
  });
  const B = baseGames.map((v) => cellOf(v, pop));
  const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
  const Na = sum(A.map((g) => sum(g.bins)));
  const Nb = sum(B.map((g) => sum(g.bins)));
  if (!(Na > 0) || !(Nb > 0) || G < 2) return null;
  const ra = sum(A.map((g) => g.ints)) / Na;
  const rb = sum(B.map((g) => g.ints)) / Nb;
  const sa = rates.map((_, i) => sum(A.map((g) => g.bins[i] ?? 0)) / Na);
  const sb = rates.map((_, i) => sum(B.map((g) => g.bins[i] ?? 0)) / Nb);
  const allowed = rates.reduce((acc, r, i) => acc + (sa[i]! - sb[i]!) * r, 0);
  const excess = 100 * (ra - rb) - allowed;
  const naBar = Na / G;
  const nbBar = Nb / G;
  let ss = 0;
  for (let g = 0; g < G; g += 1) {
    const a = A[g]!;
    const b = B[g]!;
    const naG = sum(a.bins);
    const nbG = sum(b.bins);
    const aRate = (100 * (a.ints - ra * naG)) / naBar;
    const bRate = (100 * (b.ints - rb * nbG)) / nbBar;
    const aMix = rates.reduce((acc, r, i) => acc + r * ((a.bins[i] ?? 0) - sa[i]! * naG), 0) / naBar;
    const bMix = rates.reduce((acc, r, i) => acc + r * ((b.bins[i] ?? 0) - sb[i]! * nbG), 0) / nbBar;
    const u = aRate - aMix - (bRate - bMix);
    ss += u * u;
  }
  const se = Math.sqrt((G / (G - 1)) * ss) / G;
  return { seedSet, games: G, excess, se, z: se > 0 ? excess / se : null };
}

export interface PairedReading {
  readonly sets: readonly PairedSet[];
  /** (z1 + z2) / sqrt 2 over the paired z's; null unless both sets have one. */
  readonly Z: number | null;
}

/** The paired reading over the sets whose per-game vectors both sides carry (reported, never graded). */
export function pairedReading(
  baseBySet: Readonly<Partial<Record<SeedSet, readonly GuardGameVector[]>>>,
  armBySet: Readonly<Partial<Record<SeedSet, readonly GuardGameVector[]>>>,
  pop: GamePopulation,
  clock: GuardClock,
): PairedReading {
  const sets: PairedSet[] = [];
  for (const s of SEED_SETS) {
    const b = baseBySet[s];
    const a = armBySet[s];
    if (b === undefined || a === undefined) continue;
    const p = pairedSet(s, b, a, pop, clock);
    if (p !== null) sets.push(p);
  }
  const Z = sets.length === 2 && sets.every((p) => p.z !== null) ? (sets[0]!.z! + sets[1]!.z!) / Math.SQRT2 : null;
  return { sets, Z };
}

// --- reported: DESPERATION, dirty and clean (F.9 item 4), and any class's re-weighting (AM-1 §4.5) --------

export const DESPERATION_HALVES: readonly DesperationPocket[] = Object.freeze(["DIRTY", "CLEAN"] as const);

/** One set's composition of a class by part and the rise re-weighted to the base's composition. */
export interface ReweightedOf<H extends string> {
  readonly seedSet: SeedSet;
  /** The base's and the arm's share of the class's aimed throws in each part, percent. */
  readonly baseShare: Readonly<Record<H, number | null>>;
  readonly armShare: Readonly<Record<H, number | null>>;
  /** The class's own rise (points per 100 aimed throws). */
  readonly rise: number | null;
  /**
   * The rise with each part's rate change weighted by the base's share of that part: the rise the
   * class would show had its membership not moved. Null when a part the base throws in has no arm
   * throws (its rate change is not defined).
   */
  readonly reweightedRise: number | null;
}

/** DESPERATION's, by half (F.9 item 4). */
export type Reweighted = ReweightedOf<DesperationPocket>;

/** The composition and the re-weighted rise of a class split into `parts` (AM-1 §4.5), on one set. */
export function reweightedBy<H extends string>(seedSet: SeedSet, parts: readonly H[], base: Readonly<Record<H, IntMix>>, arm: Readonly<Record<H, IntMix>>): ReweightedOf<H> {
  const nb = parts.reduce((a, h) => a + aimedOf(base[h]), 0);
  const na = parts.reduce((a, h) => a + aimedOf(arm[h]), 0);
  const share = (side: Readonly<Record<H, IntMix>>, n: number): Record<H, number | null> =>
    Object.fromEntries(parts.map((h) => [h, n > 0 ? (100 * aimedOf(side[h])) / n : null])) as Record<H, number | null>;
  const rate = (m: IntMix): number | null => (aimedOf(m) > 0 ? (100 * m.interceptions) / aimedOf(m) : null);
  const ints = (side: Readonly<Record<H, IntMix>>): number => parts.reduce((a, h) => a + side[h].interceptions, 0);
  const rise = nb > 0 && na > 0 ? (100 * ints(arm)) / na - (100 * ints(base)) / nb : null;
  let reweightedRise: number | null = nb > 0 ? 0 : null;
  for (const h of parts) {
    if (reweightedRise === null) break;
    const nbh = aimedOf(base[h]);
    if (nbh === 0) continue;
    const rb = rate(base[h]);
    const ra = rate(arm[h]);
    reweightedRise = ra === null || rb === null ? null : reweightedRise + (nbh / nb) * (ra - rb);
  }
  return { seedSet, baseShare: share(base, nb), armShare: share(arm, na), rise, reweightedRise };
}

export function reweightedDesperation(seedSet: SeedSet, base: Readonly<Record<DesperationPocket, IntMix>>, arm: Readonly<Record<DesperationPocket, IntMix>>): Reweighted {
  return reweightedBy(seedSet, DESPERATION_HALVES, base, arm);
}
