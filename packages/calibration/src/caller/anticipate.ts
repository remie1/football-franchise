/**
 * THE ANTICIPATED FRONT — ADR-024, `callerVersion` v2.
 *
 * ============================ WHAT THIS IS FOR ============================
 *
 * Until v2 the frozen caller resolved the ACTUAL defensive card and then built its protection
 * against it. The concept draw was blind; the blocking was not. `CALIBRATION-BACKLOG.md` entry 21
 * called that "perfectly-informed protection", and `baseline-0002` measured what it costs:
 *
 *   `unaccounted_rusher_rate`  0.13%   (56 of 43,583 dropbacks)
 *   `hot_route_rate`           0.10%   (42 dropbacks)
 *   `PICKUP_LOST` threats      0       in 496 games
 *
 * ⚠ **ALL THREE ARE v1 FIGURES. They describe the DEFECT this module exists to remove and must
 * never be quoted as the current state.** At v2, same league and schedule (496 games, seeds
 * `fnv1a:020c1dcb#496`, tunables `fnv1a:8a8354c3`): **5,901 `PICKUP_LOST` threats** and **1,970
 * hot-converted dropbacks, 4.51% of 43,657** — about 35× the v1 rate. That matters beyond
 * bookkeeping: the v1 figure sat BELOW `calibration.md` §5.3's refusal floor, so no sweep of the
 * hot-route mechanic was admissible at all, and the v2 figure clears it by a wide margin. Backlog
 * 28a is the first finding that population made measurable.
 *
 * Those are not weak numbers. They are the numbers of a branch that has never executed: §7.4 step
 * 3 and ADR-022's sixteen authored hot routes were built, tested, and never once given a snap on
 * which they could fire. ADR-024 was approved to end that, and its mechanism is deliberately not
 * a new dial:
 *
 *   1. draw the real card `D_real` exactly as v1 does;
 *   2. draw a second card `D_exp` from **the same situational weights**, on an independent fork;
 *   3. instantiate the OFFENCE against `D_exp` and hand `D_real` to the engine.
 *
 * The offence is then wrong at the corpus's own rate, which is a rate the corpus already
 * justifies, rather than at a rate somebody picked — the failure ADR-018 records about `laneSpan`
 * and ADR-022 records about `StuntComplexity`.
 *
 * ==================== SUB-QUESTION 1: THE PERSONNEL RULE, DECIDED ====================
 *
 * ADR-024 left this open and named it load-bearing. **The rule is: `D_exp` is drawn from the
 * cards that apply to this situation AND share `D_real`'s `DefensePersonnel` grouping, by the
 * same usage weights.** Three arguments, in the order that decides it.
 *
 * **1. It is the only rule under which every name in the protection is a man on the field, and
 * nothing downstream would catch a violation.** `buildDefensiveUnit(personnel, chart)` is a pure
 * function of the grouping and the depth chart, so two cards sharing a grouping bind *literally
 * the same eleven players*. Two cards in different groupings do not: NICKEL binds `CB_N` and BASE
 * binds `LB_S`, so a protection built against a NICKEL card and played against a BASE card names
 * a nickel corner who is standing on the sideline.
 *
 * ADR-024 said this "depends on whether `MatchGameState.players` is the 22 on the field or both
 * full rosters — **this was not established** and it decides the design." **It is now
 * established, and it is the bad case.** `buildTeamSnapshot` (`league/snapshot.ts`) copies every
 * available player on the roster into `TeamSnapshot.players`, and `simulateGame` merges both
 * teams' maps into `MatchGameState.players`. So `assertCoherentPlayCall`'s rule 1 —
 * `known(state, id)` — passes for any rostered player, and a protection naming a defender who is
 * not playing would resolve cleanly, produce plausible numbers, and be invisible. That is
 * `CALIBRATION-BACKLOG.md` 3a in miniature, and it is exactly the class of thing Charter §4.1
 * says to encode rather than to remember.
 *
 * **2. It is the real information asymmetry, not a convenient one.** Offensive personnel goes on
 * the field first; the defence substitutes in response; the quarterback and the centre then look
 * at what is aligned in front of them and count the box. What a real offence CAN see pre-snap is
 * the grouping. What it CANNOT see is the coverage rotation and who is actually coming. "Knows
 * the grouping, does not know the call" is that asymmetry written down.
 *
 * **3. It satisfies ADR-024's stated constraint transitively and honestly.** The constraint is
 * that `D_exp` be possible against the offensive personnel on the field. `D_real` is the corpus's
 * own answer for this situation, and any card sharing its grouping is fieldable by the same
 * eleven defenders; `instantiateDefense` resolves man targets against the concrete
 * `OffensiveLook` with a REQUIRED `ifAbsent` fallback (backlog 8b), so a same-grouping card
 * cannot name an offensive role that is not there either.
 *
 * ---- WHAT WAS REJECTED, AND WHY. Recorded so the next reader does not re-open it. ----
 *
 *  - **An unconstrained second draw** over `applicableDefensiveCards(situation)`. Rejected on
 *    argument 1: it names men who are not playing and nothing rejects it.
 *  - **A fitted offensive-personnel → defensive-personnel table.** Rejected, and this is the
 *    interesting one. The corpus's own `selectDefensiveCard` does NOT condition on offensive
 *    personnel — `frozen.ts` says so in its list of omissions, "no personnel matching" — so
 *    drawing `D_exp` from a personnel-aware distribution would make the offence wrong partly
 *    because it holds a BETTER model of the defence than the defence holds of itself. That is a
 *    second bias, in an unmeasurable direction, and it is not "a second draw from the same
 *    situational weights". It would also need a new fitted, content-hashed table to answer a
 *    question the defence does not yet ask.
 *  - **Matching on rusher count** (anticipate the number, not the men). Rejected: the rusher
 *    count is precisely the thing the offence must be allowed to be wrong about. Constraining it
 *    makes `PICKUP_LOST` unreachable again, which is the starvation ADR-024 exists to end.
 *  - **Matching on coverage family / shell.** Rejected: it constrains the wrong axis and does not
 *    solve the on-field problem at all. Backlog 8b establishes that shell and rusher count are
 *    ORTHOGONAL, so a shell match leaves rusher count free (which is right) while still permitting
 *    a grouping change (which is the fatal part).
 *  - **Drawing freely and remapping the rush onto roles present in `D_real`'s unit.** Rejected:
 *    that invents a pairing at runtime, and the caller's wrongness would then be an artefact of a
 *    remapping table rather than a football fact.
 *  - **`D_exp` = `D_real` with the coverage stripped**, i.e. anticipate only the front. Rejected:
 *    it is not a draw at all, and every share it produced would be a number somebody picked.
 *
 * ---- THE COST OF THE RULE, STATED RATHER THAN HIDDEN ----
 *
 * Where only ONE card in the corpus applies to (situation, grouping), `D_exp ≡ D_real` and the
 * caller is clairvoyant on that snap by construction. That is a real limitation of a 22-card
 * corpus, it is not detectable from an exact-match rate alone, and it is therefore REPORTED:
 * `forcedDraws` counts those snaps and the draw-quality table prints the share beside the match
 * rate it inflates.
 *
 * ==================== WHY THE RUN GAME ANTICIPATES TOO, AND WHY IT IS SAFE ====================
 *
 * ADR-024 rejected the narrow scoping by name: anticipating for protection while anything else
 * keeps reading the real card is an INCOHERENT caller. A caller that guessed on dropbacks and was
 * clairvoyant on runs would be exactly that, one axis over — so `instantiateRun` is handed `D_exp`
 * as well, and run blocking is paired against the gaps the offence expected to be filled.
 *
 * That widens the space of (offensive concept × defensive card) pairs the caller can produce, and
 * `instantiateRun` THROWS `UnresolvableAssignmentError` when nobody owns the designed gap and no
 * climb target is free. **It cannot fire.** `packages/playbook`'s `test/corpus.test.ts` asserts
 * the FULL cross product — every pass concept and every run concept against every one of the
 * twenty-two defensive cards — instantiates without throwing. The pairs v2 can reach are a subset
 * of that cross product, so there is no fallback path here and deliberately none: a `catch` that
 * re-drew the anticipation until it found one that resolved would be the caller peeking at the
 * real front through an exception handler.
 *
 * ==================== SUB-QUESTION 2: THE PROTECTOR IN COVERAGE ====================
 *
 * Not settled here, and deliberately not patched here. When `D_exp` sends a man `D_real` drops,
 * a blocker is paired to somebody who is not rushing. `resolvePreSnap` looks up protection BY
 * RUSHER (`offense.protection.find(p => p.rusher === assignment.rusher)`), so that entry is never
 * consulted and the blocker stands idle — he neither blocks nor appears in `scheme.available`,
 * because `available` is the leftovers of a pairing walk that happened against the wrong front.
 *
 * That needs an OWNER, and this file's judgement is that it is the ENGINE's (§7.4 step 1 already
 * decides who is accounted for; this is the same step read from the protection's side, and it is
 * arithmetic about the call's own arguments). Calibration may not touch the engine, so it is
 * petitioned in **ADR-026** and MEASURED here instead: `phantomRushers` counts it per snap and
 * `passDrawsWithBoth` counts the snaps where it actually changes an outcome — a protector with
 * nobody to block on the same dropback as a rusher with nobody blocking him.
 *
 * ==================== DRAW QUALITY IS A FIRST-CLASS OUTPUT ====================
 *
 * The owner's decisive argument for ratifying rather than deferring: *a caller that guesses badly
 * is a confound you can measure; a branch that never executes is one you cannot.* So the guess is
 * measured, on several independent axes rather than one score, and the axes state what they do
 * and do not capture — see `DrawComparison` below.
 *
 * ==================== WHERE THIS LIVES, AND WHY IT IS NOT AN EVENT ====================
 *
 * `D_exp` is a fact about the CALLER's decision, not a game fact, so it goes in
 * `FrozenCallerDiagnostics` beside `conceptRedraws` rather than into the event stream. Iron rule
 * 3 governs game facts; the caller's own draw is not one, and inventing a `PLAY_START` field for
 * it would be a contract petition for a number no other consumer of the engine can produce.
 */
import type { Rng } from "@ff/contracts";
import type { PlayerId } from "@ff/contracts";
import type {
  AnyDefensiveCard,
  CoverageShell,
  InstantiatedDefense,
  PlaySituation,
} from "@ff/playbook";
import { applicableDefensiveCards, weightedPick } from "@ff/playbook";

/**
 * WHICH CALLER RAN. Part of `BaselineIdentity` via `BatchProvenance.callerVersion`, so a v1 report
 * and a v2 report are refused as trend partners (ADR-025) rather than compared.
 *
 * v1 is KEPT AND RUNNABLE, not deleted. ADR-024's comparability paragraph asks for the first v2
 * report to be run alongside a final v1 report on the same seeds "so the size of the discontinuity
 * is a measurement rather than a surprise", and that paired run is the only honest instrument
 * available once the trend layer has (correctly) refused the boundary.
 */
export type CallerVersion = "v1" | "v2";

export const CALLER_VERSIONS: readonly CallerVersion[] = ["v1", "v2"];

/** The default. ADR-024 is ratified; a batch that wants the old caller asks for it by name. */
export const DEFAULT_CALLER_VERSION: CallerVersion = "v2";

/** Five or more rushers, the threshold `blitz_rate` uses on BOTH sides. Same number, one place. */
const BLITZ_MIN_RUSHERS = 5;

// --- the draw ---------------------------------------------------------------

export interface AnticipatedFront {
  readonly card: AnyDefensiveCard;
  /** How many cards the anticipation could have chosen between. 1 ⇒ the guess was forced. */
  readonly poolSize: number;
  /** `poolSize === 1`. The caller was right because it had no alternative, not because it read the down. */
  readonly forced: boolean;
}

/**
 * A second draw from the same situational weights, constrained to `real`'s personnel grouping.
 *
 * The pool is never empty: `real` was itself drawn by `selectDefensiveCard` from
 * `applicableDefensiveCards(situation)` and shares its own grouping, so it is always a candidate.
 * The assertion is kept anyway — it costs nothing and it is the one that would fire if playbook
 * ever made card selection stateful.
 */
export function anticipateFront(
  rng: Rng,
  situation: PlaySituation,
  real: AnyDefensiveCard,
): AnticipatedFront {
  const pool = applicableDefensiveCards(situation).filter(
    (card) => card.personnel === real.personnel,
  );
  if (pool.length === 0) {
    throw new Error(
      `@ff/calibration: anticipateFront found no card sharing ${real.id}'s ${real.personnel} ` +
        `grouping among the cards applicable to ${situation.down} and ${situation.distance} at ` +
        `${situation.ballOn}. The real card is drawn from that same set, so this is impossible ` +
        `unless playbook's selection stopped being a pure function of the situation.`,
    );
  }
  const card = weightedPick(rng, pool, (c) => c.usage.weight);
  return { card, poolSize: pool.length, forced: pool.length === 1 };
}

// --- similarity -------------------------------------------------------------

/**
 * HOW CLOSE THE GUESS WAS, on axes that are reported separately and never summed.
 *
 * A single similarity score would be the same mistake `StuntComplexity`-as-an-enum was: it would
 * put a weighting nobody fitted in front of the only question the sub-questions need answered.
 * So each axis stands alone and each says what it is for.
 *
 * ==================== WHAT THESE CAPTURE ====================
 *
 *  - `exactCard` — the strictest reading, and the one to quote when somebody asks "how often is
 *    the caller right". Read it beside `forcedDraws`, which inflates it.
 *  - `sameFrontLabel` — `AnyDefensiveCard.front`, playbook's own renderer string ("4-3 over",
 *    "nickel 4-2-5 double A"). Coarser than the card and finer than the grouping.
 *  - `sameRusherCount` / `sameBlitzClass` — how many are coming, exactly and at the five-man
 *    threshold `blitz_rate` uses. `sameBlitzClass` is the one that predicts whether the offence
 *    had ENOUGH bodies; `sameRusherCount` is the one that predicts whether it had the right
 *    number of them.
 *  - `sameCoverageFamily` — `deriveShell` over the assignments: MAN / ZONE / MIXED / NONE.
 *  - `rusherJaccard`, `missedRushers`, `phantomRushers` — the axis that actually drives outcomes.
 *    Protection pairs BY PLAYER, so what matters is not how many are coming but WHICH:
 *    `missedRushers` (real ∖ expected) is the population §7.4 step 3 and §5.3 fire on, and
 *    `phantomRushers` (expected ∖ real) is the ADR-026 population.
 *
 * ==================== WHAT THEY DO NOT CAPTURE — READ THIS BEFORE QUOTING THEM ====
 *
 *  - **Technique.** Two cards can send the same man from a different `alignment` or `side`, which
 *    changes which protector `claim()` gives him. A rusher counted as MATCHED can still be
 *    mispaired, so `rusherJaccard = 1` does not mean the protection is identical.
 *  - **Stunts.** Protection does not read `stunts` at all and the engine gets `D_real`'s, so a
 *    stunt divergence is invisible to every axis here while still moving pressure. `STUNT_LOOPER`
 *    is unaffected by the caller and must not be read as draw quality.
 *  - **Coverage, causally.** Nothing downstream of the caller reads `D_exp`'s coverage — only
 *    `defense.rush` reaches `assignProtection`. `sameCoverageFamily` is DESCRIPTIVE, not a driver,
 *    and a reader who treats it as one will attribute a completion change to it wrongly.
 *  - **Alignment as a defence actually shows it.** The corpus's spatial vocabulary for a rusher is
 *    `{EDGE, INTERIOR} x {LEFT, RIGHT}`; there is no alignment model finer than that to compare.
 *  - **The run game's analogue.** `instantiateRun` pairs blockers to defenders BY GAP, not by
 *    rusher identity, so `phantomRushers` on a run draw is a card fact with no direct blocking
 *    consequence. The pass-only counters exist for exactly that reason.
 */
export interface DrawComparison {
  readonly exactCard: boolean;
  readonly sameFrontLabel: boolean;
  readonly sameRusherCount: boolean;
  readonly sameBlitzClass: boolean;
  readonly sameCoverageFamily: boolean;
  readonly exactRusherSet: boolean;
  /** |expected ∩ real| ÷ |expected ∪ real| over rusher ids. 1 when the same men are coming. */
  readonly rusherJaccard: number;
  /** real ∖ expected — rushers the offence did not expect. §7.4 step 3's population. */
  readonly missedRushers: number;
  /** expected ∖ real — men the offence expected who dropped. ADR-026's population. */
  readonly phantomRushers: number;
  readonly expectedRusherCount: number;
  readonly realRusherCount: number;
}

function idSet(ids: readonly PlayerId[]): Set<string> {
  return new Set(ids.map(String));
}

function shellOf(defense: InstantiatedDefense): CoverageShell {
  return defense.shell;
}

export function compareFronts(
  expectedCard: AnyDefensiveCard,
  expected: InstantiatedDefense,
  realCard: AnyDefensiveCard,
  real: InstantiatedDefense,
): DrawComparison {
  const expectedRushers = idSet(expected.rush.map((r) => r.rusher));
  const realRushers = idSet(real.rush.map((r) => r.rusher));
  let intersection = 0;
  for (const id of expectedRushers) if (realRushers.has(id)) intersection++;
  const union = expectedRushers.size + realRushers.size - intersection;
  return {
    exactCard: expectedCard.id === realCard.id,
    sameFrontLabel: expectedCard.front === realCard.front,
    sameRusherCount: expectedRushers.size === realRushers.size,
    sameBlitzClass:
      expectedRushers.size >= BLITZ_MIN_RUSHERS === (realRushers.size >= BLITZ_MIN_RUSHERS),
    sameCoverageFamily: shellOf(expected) === shellOf(real),
    exactRusherSet: intersection === expectedRushers.size && intersection === realRushers.size,
    rusherJaccard: union === 0 ? 1 : intersection / union,
    missedRushers: realRushers.size - intersection,
    phantomRushers: expectedRushers.size - intersection,
    expectedRusherCount: expectedRushers.size,
    realRusherCount: realRushers.size,
  };
}

// --- the fold ---------------------------------------------------------------

/**
 * Counters only, merged the way every other fold in this package is merged — associative,
 * commutative, and with a sorted key order so worker count cannot change the OUTPUT and not
 * merely the numbers (`metrics/collect.ts` makes the same argument at length).
 */
export interface DrawQualityFold {
  draws: number;
  passDraws: number;
  runDraws: number;
  /** Draws where the personnel-matched pool held exactly one card, so the guess could not be wrong. */
  forcedDraws: number;
  poolSizeSum: number;

  exactCard: number;
  sameFrontLabel: number;
  sameRusherCount: number;
  sameBlitzClass: number;
  sameCoverageFamily: number;
  exactRusherSet: number;
  jaccardSum: number;

  missedRusherSum: number;
  phantomRusherSum: number;
  drawsWithMissed: number;
  drawsWithPhantom: number;

  /**
   * ==================== THE ADR-026 EVIDENCE ====================
   * Pass draws only, because only a dropback has a protection to be wrong.
   *
   * `passDrawsWithBoth` is the one that matters: a protector standing idle on the same snap as a
   * rusher nobody is blocking is the case where the engine's answer to sub-question 2 CHANGES AN
   * OUTCOME rather than merely wasting a body. Everything else is a lineman with nothing to do on
   * a play that was going to be fine anyway.
   */
  passDrawsWithMissed: number;
  passDrawsWithPhantom: number;
  passDrawsWithBoth: number;
  /**
   * Protection entries naming a man who is not in `D_real.rush`, counted from the CALL the engine
   * was handed rather than from the card diff. The two differ: a phantom rusher the expected
   * pairing left unblocked never became a protection entry at all.
   */
  protectorsInCoverage: number;

  /** Distribution rather than a mean — how many at once, which is what decides how bad it gets. */
  missedHistogram: Record<string, number>;
  phantomHistogram: Record<string, number>;
  /** Draws by personnel grouping, so the pool-size caveat can be read per grouping. */
  byPersonnel: Record<string, number>;
  exactByPersonnel: Record<string, number>;
}

export function blankDrawQuality(): DrawQualityFold {
  return {
    draws: 0,
    passDraws: 0,
    runDraws: 0,
    forcedDraws: 0,
    poolSizeSum: 0,
    exactCard: 0,
    sameFrontLabel: 0,
    sameRusherCount: 0,
    sameBlitzClass: 0,
    sameCoverageFamily: 0,
    exactRusherSet: 0,
    jaccardSum: 0,
    missedRusherSum: 0,
    phantomRusherSum: 0,
    drawsWithMissed: 0,
    drawsWithPhantom: 0,
    passDrawsWithMissed: 0,
    passDrawsWithPhantom: 0,
    passDrawsWithBoth: 0,
    protectorsInCoverage: 0,
    missedHistogram: {},
    phantomHistogram: {},
    byPersonnel: {},
    exactByPersonnel: {},
  };
}

function bump(record: Record<string, number>, key: string, by = 1): void {
  record[key] = (record[key] ?? 0) + by;
}

export function recordDraw(
  fold: DrawQualityFold,
  input: {
    readonly front: AnticipatedFront;
    readonly comparison: DrawComparison;
    readonly pass: boolean;
    readonly personnel: string;
    /** Protection entries naming a non-rusher. Zero on a run: there is no protection. */
    readonly protectorsInCoverage: number;
  },
): void {
  const c = input.comparison;
  fold.draws++;
  if (input.pass) fold.passDraws++;
  else fold.runDraws++;
  if (input.front.forced) fold.forcedDraws++;
  fold.poolSizeSum += input.front.poolSize;

  if (c.exactCard) fold.exactCard++;
  if (c.sameFrontLabel) fold.sameFrontLabel++;
  if (c.sameRusherCount) fold.sameRusherCount++;
  if (c.sameBlitzClass) fold.sameBlitzClass++;
  if (c.sameCoverageFamily) fold.sameCoverageFamily++;
  if (c.exactRusherSet) fold.exactRusherSet++;
  fold.jaccardSum += c.rusherJaccard;

  fold.missedRusherSum += c.missedRushers;
  fold.phantomRusherSum += c.phantomRushers;
  if (c.missedRushers > 0) fold.drawsWithMissed++;
  if (c.phantomRushers > 0) fold.drawsWithPhantom++;
  bump(fold.missedHistogram, String(c.missedRushers));
  bump(fold.phantomHistogram, String(c.phantomRushers));
  bump(fold.byPersonnel, input.personnel);
  if (c.exactCard) bump(fold.exactByPersonnel, input.personnel);

  if (input.pass) {
    if (c.missedRushers > 0) fold.passDrawsWithMissed++;
    if (input.protectorsInCoverage > 0) fold.passDrawsWithPhantom++;
    if (c.missedRushers > 0 && input.protectorsInCoverage > 0) fold.passDrawsWithBoth++;
    fold.protectorsInCoverage += input.protectorsInCoverage;
  }
}

function sortedRecord(entries: Iterable<readonly [string, number]>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of [...entries].sort((x, y) => x[0].localeCompare(y[0]))) out[k] = v;
  return out;
}

function mergeCounters(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const totals = new Map<string, number>();
  for (const [k, v] of Object.entries(a)) totals.set(k, (totals.get(k) ?? 0) + v);
  for (const [k, v] of Object.entries(b)) totals.set(k, (totals.get(k) ?? 0) + v);
  return sortedRecord(totals);
}

export function mergeDrawQuality(a: DrawQualityFold, b: DrawQualityFold): DrawQualityFold {
  return {
    draws: a.draws + b.draws,
    passDraws: a.passDraws + b.passDraws,
    runDraws: a.runDraws + b.runDraws,
    forcedDraws: a.forcedDraws + b.forcedDraws,
    poolSizeSum: a.poolSizeSum + b.poolSizeSum,
    exactCard: a.exactCard + b.exactCard,
    sameFrontLabel: a.sameFrontLabel + b.sameFrontLabel,
    sameRusherCount: a.sameRusherCount + b.sameRusherCount,
    sameBlitzClass: a.sameBlitzClass + b.sameBlitzClass,
    sameCoverageFamily: a.sameCoverageFamily + b.sameCoverageFamily,
    exactRusherSet: a.exactRusherSet + b.exactRusherSet,
    jaccardSum: a.jaccardSum + b.jaccardSum,
    missedRusherSum: a.missedRusherSum + b.missedRusherSum,
    phantomRusherSum: a.phantomRusherSum + b.phantomRusherSum,
    drawsWithMissed: a.drawsWithMissed + b.drawsWithMissed,
    drawsWithPhantom: a.drawsWithPhantom + b.drawsWithPhantom,
    passDrawsWithMissed: a.passDrawsWithMissed + b.passDrawsWithMissed,
    passDrawsWithPhantom: a.passDrawsWithPhantom + b.passDrawsWithPhantom,
    passDrawsWithBoth: a.passDrawsWithBoth + b.passDrawsWithBoth,
    protectorsInCoverage: a.protectorsInCoverage + b.protectorsInCoverage,
    missedHistogram: mergeCounters(a.missedHistogram, b.missedHistogram),
    phantomHistogram: mergeCounters(a.phantomHistogram, b.phantomHistogram),
    byPersonnel: mergeCounters(a.byPersonnel, b.byPersonnel),
    exactByPersonnel: mergeCounters(a.exactByPersonnel, b.exactByPersonnel),
  };
}
