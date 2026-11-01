/**
 * THE FROZEN BASELINE PLAY-CALLER — `calibration.md` §3.1, Phase 1 deliverable 3.
 *
 * Two teams, one caller, held constant across every calibration experiment the project runs.
 * That is the entire purpose: if the caller could drift between batches, every observed delta
 * would be ambiguous between "the mechanic changed" and "the coach changed", and Mandate 1 would
 * have nothing to stand on.
 *
 * ================== WHAT IT IS ==================
 *
 *  1. **Run-or-pass** comes from `frozenTendencies.ts`, fitted from real play-by-play by
 *     down x distance band x field region x score state x two-minute, with a stated backoff
 *     chain for sparse cells.
 *  2. **Which card** comes from `@ff/playbook`'s usage weights (`selectPassConcept`,
 *     `selectRunConcept`, `selectDefensiveCard`) — the corpus's own situational applicability
 *     and frequencies, drawn through the contracts PRNG.
 *  2b. **Which looks** the defence wears over its card, from v3 (ADR-069, ADR-071) —
 *     `selectLooks`, one league-wide rate, drawn after the card on an address of its own. See
 *     below.
 *  2c. **The call in parts**, from v6 (ADR-071 step 3, ADR-073 §2.6) — the coverage, the pressure
 *     laid over it and the line game, each drawn on an address of its own, at rates that hold
 *     v5's by construction. See below.
 *  2d. **The front look**, from v7 (ADR-073 §2.5) — a Mug or a Stem over the called card, drawn
 *     after its coverage looks on an address of its own and worn by the real defence only. See
 *     below.
 *  3. **Fourth down** comes from a second fitted table (go / punt / field goal), drawn rather
 *     than taken modally. See `decideFourthDown` for why that disagrees with the engine's
 *     default caller on purpose.
 *
 * ================== WHAT IT DELIBERATELY DOES NOT MODEL ==================
 *
 * Recorded here rather than discovered later, because a caller's omissions are properties of
 * every number measured under it:
 *
 *  - **No game script beyond score state and the clock.** No tempo, no no-huddle, no hurry-up,
 *    no kneel-down, no timeout usage, no clock-driven urgency past the two-minute flag.
 *  - **No opponent.** No scouting, no personnel matching, no "they are in dime so run", no
 *    tendency-breaking, no self-scouting. The defence's card is drawn from the corpus's
 *    situational weights and never from what the offence just did.
 *  - **No sequencing and no memory.** Each play is drawn independently. Real callers set plays
 *    up; this one has no state at all, which is exactly what makes it reproducible from a seed.
 *  - **No coach attributes.** `COACH_ATTRIBUTE_REGISTRY_V1` has `playCalling` and
 *    `situationalJudgment`; neither is read, for the same reason the engine's default caller
 *    does not read them — how coaching works is Spec #11's decision.
 *  - **No audibles, no motion, no play-action distinction.** The corpus carries none of those as
 *    separate cards, so a caller cannot call them. (Hot routes it DOES get: they are a property
 *    of the card, converted by the engine's §5.3, not something the caller calls.)
 *  - **Unprotectable pressures cause a CONCEPT re-draw, not a defensive re-draw.** When the
 *    corpus's protection cannot be bound at all (`UnprotectableCallError` — a protector role with
 *    no player bound to it), the offensive concept is re-drawn and the defensive card is kept, so
 *    the fitted blitz rate survives and the offensive concept mix takes the distortion. The rate
 *    is counted and reported (`FrozenCallerDiagnostics.conceptRedraws`); it is a number to look
 *    at, not a number to ignore. `baseline-0002` measured 0 in 69,432 calls.
 *
 * ================== WHAT CHANGED AT v2 — ADR-024, AND IT IS THE BIG ONE ==================
 *
 * This block used to read **"PROTECTION IS PERFECTLY INFORMED, and this one is a real
 * distortion"**, and it was the caller half of `CALIBRATION-BACKLOG.md` entry 21: the concept draw
 * was blind, the blocking was not, and the consequence was that a whole branch of the pass game
 * never executed — `PICKUP_LOST` = 0 and `hot_route_rate` = 0.10% in 496 games.
 *
 * ⚠ **THOSE TWO FIGURES ARE v1's AND ARE NOT THE CURRENT STATE — quote them only about v1.**
 * Measured at v2 on the same league and schedule (496 games, seeds `fnv1a:020c1dcb#496`, tunables
 * `fnv1a:8a8354c3`): **5,901 `PICKUP_LOST` threats**, and **1,970 hot-converted dropbacks = 4.51%
 * of 43,657** — roughly 35× the v1 rate, and comfortably above `calibration.md` §5.3's refusal
 * floor, which the v1 figure sat below. Backlog 28a is the first finding that population made
 * measurable.
 *
 * **At `callerVersion` v2 the caller anticipates the front** (`anticipate.ts`, which carries the
 * whole argument including the personnel rule and everything rejected). A second card is drawn
 * from the same situational weights, constrained to the real card's personnel grouping; the
 * OFFENCE is instantiated against that; the real card goes to the engine.
 *
 * **IT ANTICIPATES ONCE, AND EVERYTHING DOWNSTREAM READS THAT DRAW — INCLUDING THE RUN.** ADR-024
 * rejected the narrower scoping by name: anticipating for protection while anything else keeps
 * reading the real card is not a smaller change, it is an INCOHERENT caller, and its failures
 * stop being protection problems and become the seam between two views of the same defence. A
 * caller that guessed on dropbacks and was clairvoyant on runs would be exactly that, one axis
 * over. So `instantiateRun` gets `D_exp` too, and run blocking is paired against the gaps the
 * offence expected to be filled.
 *
 * **WHAT v2 DOES NOT CHANGE, and this is what makes the re-baseline readable.** The run/pass
 * decision, the defensive card and the offensive concept are drawn on the SAME PRNG addresses as
 * v1 — `fork("kind")`, `fork("defense-card")`, `fork("offense-card:n")` — and the anticipation
 * uses a new, independent `fork("anticipated-front")`. So for any seed, v1 and v2 call the same
 * plays against the same defences and differ ONLY in what the offence blocked. Every movement
 * between a v1 and a v2 batch on one seed list is attributable to protection and to nothing else.
 * `test/caller.test.ts` asserts it rather than asserting the comment.
 *
 * ================== WHAT CHANGED AT v3 — ADR-069, THE MASK ==================
 *
 * **At v3 the defence wears a pre-snap mask over the card it called** on the share of snaps
 * `COVERAGE_MASK_RATE` sets, drawn on an address of its own, `fork("defense-mask")`,
 * AFTER the card. A mask changes only what the quarterback is SHOWN (`shownAssignments`); the
 * played coverage, the rush and every pairing the offence makes against them are the card's.
 * So, exactly as v1 → v2: for any seed, v2 and v3 call the same plays against the same cards and
 * differ ONLY in the look — and `test/caller.test.ts` asserts that too.
 *
 * `FrozenCallerSpec.coverageMasks` narrows the catalogue for a measurement arm (one mask alone,
 * ADR-069's conjoined-mechanism rule); it is never narrowed in a report run.
 *
 * ================== WHAT CHANGED AT v4 — ADR-071 STEP 2, THE CORNER LOOKS ==================
 *
 * **At v4 the catalogue grows** from Phase 1's two safety looks to all five: Press, Split and
 * Show 4 join Show 2 and Show 1, and a call may wear one look per position group — Show 2 with
 * Press over Cover 3, say (ADR-070 §2). The draw is on the same `fork("defense-mask")`, and its
 * FIRST die is still the one that decides whether the call is disguised at all, so for any seed
 * v3 and v4 call the same plays against the same cards and disguise the same snaps: they differ
 * ONLY in which looks those snaps wear. `test/caller.test.ts` asserts that as it does v2 → v3.
 *
 * And v3 still wears exactly what it wore: over Phase 1's catalogue no two looks combine, so
 * `selectLooks` rolls every die where Phase 1's draw rolled it (`playbook/test/masks.test.ts`
 * checks it die for die).
 *
 * ================== WHAT CHANGED AT v5 — ADR-073 STEP 3.3, THE LINE'S OPTIONS ==================
 *
 * **At v5 every pass call on a slide states the line's pre-snap SLIDE CHECK** (`protectionOptions`,
 * ADR-073 §2.3): `slideCheck`, so the line may check the slide toward the pressure it reads. That
 * is the call a centre and a quarterback make before the snap. Whether the line uses it is the
 * engine's decision, per snap, from the pressure read and the coach's leash (rung 30). Nothing is
 * drawn: no address moves, so for any seed v4 and v5 call the same plays against the same cards
 * wearing the same looks, and the calls differ ONLY in that one key. `test/caller.test.ts` asserts
 * it call for call.
 *
 * **v5 does NOT state the KEEP-IN by default** (`checkRelease`, the card's check-release men who
 * released, whom the engine may keep in to block). Keeping a check-release back in is the back's
 * own post-snap read in real football, not a call the QB or centre makes before it, so a caller
 * that stated it would be calling something no pre-snap caller calls (the owner's challenge of
 * 2026-10-17, ADR-077 proposal; ADR-073 §10 3.3 measured it as a driver of `sack_rate`).
 * `FrozenCallerSpec.keepIn: true` states it for a measurement arm: ADR-073 §10's keep-in-only
 * and full arms, and a later "Max" call that puts the back's read in the coach's hands.
 *
 * `FrozenCallerSpec.slideCheck: false` drops the slide check, and with the keep-in at its default
 * a v5 call is v4's, key for key (the proof arm).
 *
 * ================== WHAT CHANGED AT v6 — ADR-073 STEP 3.4, THE CALL DRAWN IN PARTS ==================
 *
 * **At v6 the defence draws its call in parts** (ADR-071 step 3, ADR-073 §2.6), each part on an
 * address of its own (`drawInParts`):
 *
 *  1. **the coverage**, on `fork("defense-card")`: v5's card, drawn with v5's own die, folded onto
 *     the coverage that hosts it (`selectCoverage`). So each coverage's share is its own weight
 *     plus the weights of the pressures it hosts, and on every snap v6's coverage is the host of the
 *     card v5 would have called;
 *  2. **the pressure** over it, on `fork("defense-pressure")` (`/blitz`, `/which`, `/creeper`):
 *     a five-or-more pressure at one rate per situation, so P(five or more) is v5's exactly, and
 *     with none drawn over a four-man Cover 3, the creeper on `CREEPER_RATE` of them;
 *  3. **the line game**, on `fork("defense-line")` (`/wears`, `/which`), among the games legal on
 *     the call, at the rate that holds v5's line-game share in every situation.
 *
 * Each die is thrown only where it can turn something (ADR-005). The parts are composed as a card
 * (`COMPOSED`, built and checked in playbook), so the looks are drawn over it on
 * `fork("defense-mask")` with the code above, and it is instantiated as any card is.
 *
 * **The huddle guesses the same way** (R30): a coverage and a pressure, on
 * `anticipated-front/coverage` and `anticipated-front/pressure`, with the real coverage's
 * personnel and the real draw's own weights, the creeper included, and nothing drawn on
 * `anticipated-front` itself (`anticipateDecomposed`). No line game: protection reads no stunts.
 * The guess is graded against the real call before its line game, so `exactCard` reads as v5's.
 * Protection is v5's: the slide check stated, the keep-in only on `keepIn: true`.
 *
 * **Three measurement knobs, each on by default.** `creeper: false` (`/creeper-0`) draws no creeper,
 * in the call or in the guess. `drawPressures: false` (`/pressures-bound`) calls v5's card on v5's
 * die, and the huddle guesses v5's way; with the line game drawn, the card's own stunts are
 * stripped first (the front arm). `drawLines: false` (`/lines-bound`) keeps each call's own stunts,
 * and Fire over Sky keeps Fire Zone's Tex (the pressure arm). With both bound a v6 call is v5's on
 * every snap (the bound proof arm). v1–v5 never fork the new addresses, and forks are pure, so not
 * one of their dice moves.
 *
 * ================== WHAT CHANGED AT v7 — ADR-073 STEP 3.5, THE FRONT LIES ==================
 *
 * **At v7 the defence may wear a FRONT LOOK over the call v6 makes** (ADR-073 §2.5): the Mug (the
 * walked-up backers shown in the A gaps, and a man shown rushing who drops) or the Stem (the
 * rushing down linemen shown one spot over). A coverage look lies about the coverage
 * (`shownAssignments`); a front look lies about the rush (`shownRush`). Playbook draws the look and
 * lays it over the call (`drawFrontLook`, `applyFrontLook`); this caller says where:
 *
 *  - **On its own address, after the coverage looks** (§2.6 step 5): `fork("defense-front")`, with
 *    legality read off the CALLED card, the card after its coverage looks. Its dice are thrown ONCE
 *    PER SNAP, before the anticipation and the concept loop, at the owner's `FRONT_LOOK_RATE`, which
 *    this caller passes to the draw explicitly. Never on `defense-mask`: a front look in that
 *    catalogue would move v4's and v6's coverage dice.
 *  - **Worn by the real defence only**, inside the concept loop, on each instantiation of the called
 *    card, after `expected` is bound. The huddle's guess never wears one: the huddle cannot see a
 *    look, and the line reads it after the snap through the shown rush (R30). So the offence's call
 *    is v6's on every snap, and the defence's call is v6's but for `shownRush` and the look's tag.
 *  - **A formation that makes the drawn look illegal** on an instance wears none (`applyFrontLook`
 *    hands the defence back, the same object). The dice stay thrown and the snap is counted
 *    (`FrozenCallerDiagnostics.frontLooks.formationDropped`).
 *
 * **One measurement knob,** `frontLooks`, narrows the catalogue as `coverageMasks` does and keeps the
 * rate: `[]` (`/front-0`) wears none, `["MUG"]` (`/front-MUG`) and `["STEM"]` (`/front-STEM`) one look
 * alone. `/front-0` throws no front die, so it is v6 on every snap: the proof arm (ADR-073 §4.5).
 * v1–v6 never fork `defense-front`, and forks are pure, so not one of their dice moves.
 */
import type { Cadence, Rng } from "@ff/contracts";
import { createRng } from "@ff/contracts";
import type {
  CoinTossChoice,
  CoinTossRequest,
  DefensiveCallRequest,
  DefensivePlayCall,
  FourthDownChoice,
  FourthDownRequest,
  OffensiveCallRequest,
  PlayCaller,
  Tunables,
} from "@ff/engine";
import type { OffensiveCall, ProtectionCall, SnapPicture } from "@ff/contracts";
import type { AnyDefensiveCard, DepthChart, PlaySituation, PreSnapOptions, SnapInput } from "@ff/playbook";
import {
  COMPOSED,
  COVERAGE_MASKS,
  FRONT_LOOKS,
  FRONT_LOOK_RATE,
  PHASE_1_MASKS,
  UnprotectableCallError,
  applyFrontLook,
  applyLooks,
  buildDefensiveUnit,
  buildOffensiveUnit,
  composeCall,
  composedKey,
  drawFrontLook,
  drawLineGame,
  drawPressure,
  instantiateDefense,
  instantiateRun,
  instantiatePass,
  isRunConcept,
  lineGameRate,
  protectionOptions,
  selectCoverage,
  selectDefensiveCard,
  selectLooks,
  selectPassConcept,
  selectRunConcept,
  snapPicture,
  type AnyOffensiveUnit,
  type CoverageMask,
  type FrontLookDraw,
  type FrontLookId,
  type HostedPressure,
  type InstantiatedDefense,
  type InstantiatedOffense,
  type LineChoice,
  type OffensiveConcept,
  type PassConcept,
} from "@ff/playbook";
import type { Down } from "@ff/playbook";
import {
  CALLER_VERSIONS,
  DEFAULT_CALLER_VERSION,
  anticipateDecomposed,
  anticipateFront,
  blankDrawQuality,
  compareFronts,
  recordDraw,
  type AnticipatedFront,
  type CallerVersion,
  type DrawQualityFold,
} from "./anticipate.js";
import {
  distanceBand,
  lookupPassRate,
  scoreState,
  type FittedTendencies,
  type TendencyKey,
} from "./tendencies.js";
import { lookupFourthDown, type FittedFourthDown } from "./fourthDown.js";
import { chooseCadence } from "./cadence.js";
import { fieldRegion } from "@ff/playbook";

export class FrozenCallerError extends Error {
  constructor(message: string) {
    super(`@ff/calibration: frozen caller — ${message}`);
    this.name = "FrozenCallerError";
  }
}

/** How many times a concept may be re-drawn against an unprotectable pressure before we stop. */
const MAX_CONCEPT_REDRAWS = 8;

/** Mutable, per-pair, and never a game fact — only counts of things worth reporting. */
export interface FrozenCallerDiagnostics {
  offensiveCalls: number;
  defensiveCalls: number;
  passCalls: number;
  runCalls: number;
  conceptRedraws: number;
  fourthDownGo: number;
  fourthDownPunt: number;
  fourthDownFieldGoal: number;
  /** Backoff level each run/pass decision was taken at, so a report can say how specific it was. */
  backoff: Record<string, number>;
  /**
   * ADR-024's instrument. Empty counters under v1 — the caller never guesses, so there is nothing
   * to grade, and zeroes are the honest reading rather than a missing key.
   */
  draw: DrawQualityFold;
  /**
   * ADR-073 §2.5 (v7): the front looks drawn, by look id, and how many of those draws a formation
   * made illegal, so the call wore none. Zeroes below v7, which draws none. A worn look is on the
   * stream already (its LOOK tag and `shownRush`); a dropped one is the fact the stream cannot show.
   */
  frontLooks: { drawn: Record<string, number>; formationDropped: number };
}

function blankDiagnostics(): FrozenCallerDiagnostics {
  return {
    offensiveCalls: 0,
    defensiveCalls: 0,
    passCalls: 0,
    runCalls: 0,
    conceptRedraws: 0,
    fourthDownGo: 0,
    fourthDownPunt: 0,
    fourthDownFieldGoal: 0,
    backoff: {},
    draw: blankDrawQuality(),
    frontLooks: { drawn: {}, formationDropped: 0 },
  };
}

export interface FrozenCallerSpec {
  readonly tendencies: FittedTendencies;
  readonly fourthDown: FittedFourthDown;
  /**
   * v1 (the informed caller), v2 (ADR-024's anticipating caller), v3 (v2 wearing ADR-069's
   * pre-snap masks), v4 (v3 with ADR-071 step 2's corner looks), v5 (v4 stating the line's
   * slide check, ADR-073; the keep-in only on request, `keepIn`), v6 (v5 drawing its defence's
   * call in parts, and the creeper, ADR-073 step 3.4) or v7 (v6 wearing ADR-073 §2.5's front looks,
   * step 3.5). Defaults to v7.
   *
   * OPTIONAL HERE AND RECORDED IN PROVENANCE, which is the same split `runBatch` makes for
   * `tunables`: ergonomics on the surface, and the value that was actually used printed in the
   * report header. It is part of `BaselineIdentity` through `BatchProvenance.callerVersion`, so
   * the two cannot be silently compared.
   */
  readonly callerVersion?: CallerVersion;
  /**
   * The looks a defence may wear (ADR-069, ADR-071). Defaults to the version's catalogue —
   * Phase 1's two at v3, all five at v4 to v7; `[]` wears none. A MEASUREMENT KNOB for
   * one-look-alone arms, never narrowed in a report run — the rate stays `COVERAGE_MASK_RATE`
   * either way, so a narrowed arm disguises fewer snaps, which is the point. Ignored below v3,
   * which draws no looks at all.
   */
  readonly coverageMasks?: readonly CoverageMask[];
  /**
   * The coach's leash this caller puts on every pass call (ADR-072 §3), 0–100. Defaults to
   * `DEFAULT_LEASH`. ONE LEAGUE-WIDE VALUE, because this caller is coach-agnostic by design
   * (`coaching-staff.md` §4.3): a real coach's leash is his own and his read of his quarterback,
   * and neither exists here. A MEASUREMENT KNOB for the leash arms (ADR-072 §5), never moved in a
   * report run; a caller at another leash says so in its identity (`callerIdentity`).
   */
  readonly leash?: number;
  /**
   * ADR-073 §2.3, the two options v5 to v7 state, and they are NOT symmetric. `slideCheck` is
   * stated on every slide unless set `false`: a pre-snap call, v5's whole content. `keepIn` is
   * `checkRelease`, the card's released check-release men, stated on a call ONLY when set `true`:
   * keeping a back in is his own post-snap read, not a call the QB or centre makes (ADR-073 §10
   * 3.3; the owner's challenge of 2026-10-17, ADR-077 proposal), so it is an opt-in MEASUREMENT
   * KNOB for §10's keep-in-only and full arms and a later "Max" call. Neither is moved in a report
   * run; a caller off the default on either says so in its identity (`/no-slide-check`,
   * `/keep-in`). Both are refused on a version that states no options, whatever the value, so an
   * identity never names a knob that did nothing.
   */
  readonly slideCheck?: boolean;
  readonly keepIn?: boolean;
  /**
   * ADR-073 §2.6, v6's three parts, each DRAWN unless set `false`, and each a MEASUREMENT KNOB for
   * step 3.4's arms, never moved in a report run. `creeper: false` (`/creeper-0`) draws no creeper,
   * in the call or in the huddle's guess. `drawPressures: false` (`/pressures-bound`) calls v5's
   * card on v5's die, and the huddle guesses v5's way (the front arm). `drawLines: false`
   * (`/lines-bound`) keeps each call's own stunts (the pressure arm). With both bound a v6 call is
   * v5's on every snap. Refused, whatever the value, on a version that draws its call as one card
   * (v1–v5), and `creeper: false` is refused with the pressures bound, where there is no creeper to
   * turn off: an identity never names a knob that did nothing.
   */
  readonly creeper?: boolean;
  readonly drawPressures?: boolean;
  readonly drawLines?: boolean;
  /**
   * ADR-073 step 3.5, v7 only: the front looks a defence may wear. Defaults to the version's
   * catalogue, `FRONT_LOOKS` (the Mug, then the Stem); `[]` wears none (`/front-0`), `["MUG"]` the
   * Mug alone (`/front-MUG`), `["STEM"]` the Stem alone (`/front-STEM`). A MEASUREMENT KNOB, as
   * `coverageMasks` is: the catalogue is narrowed before the draw's `wears` die and the rate stays
   * `FRONT_LOOK_RATE`, so a narrowed arm wears its look on 1 in 10 of the calls that can wear it.
   * Refused below v7, whatever the value, and refused in any other order or with a repeat or an
   * unknown id: the order is part of the draw.
   */
  readonly frontLooks?: readonly FrontLookId[];
  /**
   * BOTH depth charts, because both callers resolve BOTH sides of every snap and must agree.
   * That agreement is the load-bearing property: the engine asks the offence first and the
   * defence second, but a protection assignment cannot be written without knowing the rush, so
   * the offensive caller resolves the defensive card too. Two independent resolutions of the
   * same snap from the same inputs and the same PRNG address are identical by construction —
   * and `callDefense` asserts it against the call it is handed rather than trusting it.
   */
  readonly homeDepthChart: DepthChart;
  readonly awayDepthChart: DepthChart;
  readonly name?: string;
}

export interface FrozenCallerPair {
  readonly home: PlayCaller;
  readonly away: PlayCaller;
  readonly diagnostics: FrozenCallerDiagnostics;
  readonly name: string;
  readonly callerVersion: CallerVersion;
  /** The leash on every pass call this pair makes (ADR-072). */
  readonly leash: number;
}

/**
 * THE IDENTITY STRING A BASELINE IS COMPARED ON.
 *
 * `BatchProvenance.callerVersion` used to be `tendencies.version` alone, which tracked the TABLE
 * and not the CALLER. `report/identity.ts` states the criterion it is meant to satisfy — *"the
 * frozen caller sets the play mix that every rate in the library is measured over. A different
 * caller is a different denominator"* — and a behaviour change with an unchanged table met that
 * criterion while leaving the string alone. ADR-024 is exactly such a change, so the behaviour
 * version is composed in and the field now says what its own comment always claimed.
 *
 * A knob off its default is appended, so a measurement arm cannot be compared as the caller it
 * changed (ADR-073 §2.7): `/no-slide-check`, then `/keep-in`, then v6's `/creeper-0`,
 * `/pressures-bound` and `/lines-bound`, then v7's `/front-0`, `/front-MUG` or `/front-STEM` (the
 * catalogue narrowed; the full catalogue is unmarked), then `/leash-N` last, so every leash mark
 * keeps its place. A knob at its default is unmarked, so every identity written before the knobs
 * existed still reads the same. The defaults are the slide check ON and the keep-in OFF, so the
 * marks are `slideCheck: false` and `keepIn: true`; `keepIn: false` is the default spelled out and
 * is unmarked. There is no `/no-keep-in`: that was the mark of v5's first build, which stated the
 * keep-in by default. v6's three parts are drawn by default, so each is marked when `false`.
 */
export function callerIdentity(
  version: CallerVersion,
  tendenciesVersion: string,
  leash: number = DEFAULT_LEASH,
  knobs: CallerKnobs = {},
): string {
  return [
    `${version}/${tendenciesVersion}`,
    knobs.slideCheck === false ? "/no-slide-check" : "",
    knobs.keepIn === true ? "/keep-in" : "",
    knobs.creeper === false ? "/creeper-0" : "",
    knobs.drawPressures === false ? "/pressures-bound" : "",
    knobs.drawLines === false ? "/lines-bound" : "",
    frontMark(knobs.frontLooks),
    leash === DEFAULT_LEASH ? "" : `/leash-${String(leash)}`,
  ].join("");
}

/**
 * v7's front-look catalogue as a mark (ADR-073 step 3.5): none for the version's own catalogue,
 * `FRONT_LOOKS`, whether left out or spelled out in order; `/front-0` for `[]`; `/front-MUG` or
 * `/front-STEM` for one look alone. Any other list is no catalogue the caller plays (the order is
 * part of the draw), so it has no name and is refused rather than named.
 */
function frontMark(catalogue: readonly FrontLookId[] | undefined): string {
  if (catalogue === undefined) return "";
  if (!isFrontCatalogue(catalogue)) throw new FrozenCallerError(notAFrontCatalogue(catalogue));
  if (catalogue.length === FRONT_LOOKS.length) return "";
  return catalogue.length === 0 ? "/front-0" : `/front-${catalogue.join("-")}`;
}

/** `FRONT_LOOKS` or a part of it, in its order, each look once: the order is part of the draw. */
function isFrontCatalogue(catalogue: readonly FrontLookId[]): boolean {
  let last = -1;
  for (const id of catalogue) {
    const at = FRONT_LOOKS.indexOf(id);
    if (at <= last) return false;
    last = at;
  }
  return true;
}

const notAFrontCatalogue = (catalogue: readonly FrontLookId[]): string =>
  `frontLooks [${catalogue.map(String).join(", ")}] is no front-look catalogue: it is FRONT_LOOKS ` +
  `(${FRONT_LOOKS.join(", ")}) or a part of it, in its order, each look once — the order is part of ` +
  `the draw, so another order would play another game under the same name.`;

/**
 * The knobs an identity names (`FrozenCallerSpec.slideCheck`, `.keepIn`, `.creeper`,
 * `.drawPressures`, `.drawLines`, `.frontLooks`).
 */
export interface CallerKnobs {
  readonly slideCheck?: boolean;
  readonly keepIn?: boolean;
  readonly creeper?: boolean;
  readonly drawPressures?: boolean;
  readonly drawLines?: boolean;
  readonly frontLooks?: readonly FrontLookId[];
}

/**
 * ADR-072 §3: the leash the frozen caller puts on every pass call — a mid-slider coach. It opens
 * every rung of today's ladder (`presnap.leash.rungs`, all at or below it), so a batch at the
 * default plays exactly what a batch played before the leash existed, and the identity leaves it
 * unmarked for that reason. ⚠ That stops being true the day a rung above 50 lands: that change
 * moves what the default plays, and must say so in the caller's version.
 *
 * ADR-073's PROTECTION_ADJUST rung, at 30, sits below it, so the default is unchanged. On v5 a
 * leash below 30 closes the line's adjustment: the one roll is thrown, HELD runs the protection as
 * called and BROKE makes it (`engine/src/resolve/leash.ts`). From 30 to 39 the adjustment is open
 * and WORK_TO (40) closed. v4 states no options, so its leash behaviour does not move.
 */
export const DEFAULT_LEASH = 50;

/**
 * WHAT EACH VERSION DOES, ONE ROW EACH (ADR-073 §2.7). Rows v1–v4 restate what the version
 * ternary used to say: v1 plays the card it is dealt; from v2 the offence blocks the front it
 * anticipated; v3 wears Phase 1's two safety looks; v4 all five. None of them states the line's
 * options. v5 is v4 with them (ADR-073 step 3.3), the first row the ternary never had: the slide
 * check by default, the keep-in only on a spec that asks (`FrozenCallerSpec.keepIn`). v1–v5 draw
 * their call as one card, its pressure and its line game bound to it. v6 is v5 drawing them on
 * their own (ADR-073 step 3.4, §2.6), and its huddle guesses the call decomposed the same way.
 * v7 is v6 wearing ADR-073 §2.5's front looks.
 *
 * A TABLE AND NOT A TERNARY because the type is the list of versions (`CALLER_VERSIONS`): a
 * version with no row fails to compile, where the ternary quietly played any version it did not
 * name as a v2 (anticipating, wearing nothing). A string that is no version at all is refused by
 * `frozenCallerPair`.
 */
interface CallerProfile {
  /**
   * "NONE": the offence blocks the card it is dealt (v1). "CARD": it blocks a second draw (ADR-024).
   * "DECOMPOSED": it blocks a second draw of the coverage and the pressure (ADR-073 §2.6, R30),
   * and blocks as "CARD" when the pressures are bound (`/pressures-bound`): with no pressure
   * drawn there is none to decompose.
   */
  readonly anticipation: "NONE" | "CARD" | "DECOMPOSED";
  /**
   * The looks the defence may wear. `undefined`, not `[]`, below v3: no look is DRAWN there, so
   * `FrozenCallerSpec.coverageMasks` has nothing to narrow and is ignored.
   */
  readonly looks: readonly CoverageMask[] | undefined;
  /** Every slide states the line's slide check, and a pass call the keep-in if asked (ADR-073 §2.3; `withLineOptions`). */
  readonly protectionOptions: boolean;
  /**
   * "BOUND": the pressure is the card's own (v1–v5). "DRAWN": it is drawn over the coverage on its
   * own address, the creeper among them (ADR-073 §2.6; `FrozenCallerSpec.drawPressures`, `.creeper`).
   */
  readonly pressures: "BOUND" | "DRAWN";
  /**
   * "BOUND": the line plays the call's own stunts (v1–v5). "DRAWN": the line game is drawn on its own
   * address among those legal on the call (ADR-073 §2.6; `FrozenCallerSpec.drawLines`).
   */
  readonly lines: "BOUND" | "DRAWN";
  /**
   * The front looks the defence may wear (ADR-073 §2.5). `undefined`, not `[]`, below v7: no front
   * look is DRAWN there, so `FrozenCallerSpec.frontLooks` has nothing to narrow and is refused.
   */
  readonly fronts: readonly FrontLookId[] | undefined;
}

const PROFILE: Readonly<Record<CallerVersion, CallerProfile>> = {
  v1: { anticipation: "NONE", looks: undefined, protectionOptions: false, pressures: "BOUND", lines: "BOUND", fronts: undefined },
  v2: { anticipation: "CARD", looks: undefined, protectionOptions: false, pressures: "BOUND", lines: "BOUND", fronts: undefined },
  v3: { anticipation: "CARD", looks: PHASE_1_MASKS, protectionOptions: false, pressures: "BOUND", lines: "BOUND", fronts: undefined },
  v4: { anticipation: "CARD", looks: COVERAGE_MASKS, protectionOptions: false, pressures: "BOUND", lines: "BOUND", fronts: undefined },
  v5: { anticipation: "CARD", looks: COVERAGE_MASKS, protectionOptions: true, pressures: "BOUND", lines: "BOUND", fronts: undefined },
  v6: { anticipation: "DECOMPOSED", looks: COVERAGE_MASKS, protectionOptions: true, pressures: "DRAWN", lines: "DRAWN", fronts: undefined },
  v7: { anticipation: "DECOMPOSED", looks: COVERAGE_MASKS, protectionOptions: true, pressures: "DRAWN", lines: "DRAWN", fronts: FRONT_LOOKS },
};

/** A profile with a spec's knobs applied: what each snap draws. Pure, and the same on both sides. */
interface SnapPlan {
  readonly anticipation: CallerProfile["anticipation"];
  readonly pressures: CallerProfile["pressures"];
  readonly lines: CallerProfile["lines"];
  /** The creeper is drawn: the pressures are drawn and `creeper` is not `false`. */
  readonly creeper: boolean;
  /**
   * The front-look catalogue the snap draws from (v7): the spec's `frontLooks`, else the profile's.
   * `undefined` below v7, which never forks `defense-front`.
   */
  readonly fronts: readonly FrontLookId[] | undefined;
}

function snapPlan(profile: CallerProfile, spec: FrozenCallerSpec): SnapPlan {
  const pressures = profile.pressures === "DRAWN" && spec.drawPressures !== false ? "DRAWN" : "BOUND";
  const lines = profile.lines === "DRAWN" && spec.drawLines !== false ? "DRAWN" : "BOUND";
  return {
    anticipation: profile.anticipation === "DECOMPOSED" && pressures === "BOUND" ? "CARD" : profile.anticipation,
    pressures,
    lines,
    creeper: pressures === "DRAWN" && spec.creeper !== false,
    fronts: profile.fronts === undefined ? undefined : (spec.frontLooks ?? profile.fronts),
  };
}

/** One part-drawn call (`drawInParts`). */
interface DrawnCall {
  /** The coverage drawn, when the pressures are drawn: what the huddle's decomposed guess is held to. */
  readonly coverage: AnyDefensiveCard | undefined;
  /** The call before its line game, with no stunts: what the huddle's guess is graded against. */
  readonly graded: AnyDefensiveCard;
  /** The call as played: with its drawn line game, or with its own stunts when lines are BOUND. */
  readonly card: AnyDefensiveCard;
}

function composed(coverage: AnyDefensiveCard, pressure: HostedPressure | undefined, line: LineChoice): AnyDefensiveCard {
  const key = composedKey(coverage.id, pressure?.pressure, line);
  const entry = COMPOSED[key];
  if (entry === undefined) {
    throw new FrozenCallerError(`the draw reached ${key}, which playbook's COMPOSED does not hold`);
  }
  return entry.call;
}

/**
 * ADR-073 §2.6, from v6: the defensive call drawn in parts, each on its own fork of the snap, and
 * each a playbook draw (`pressureDraw.ts`, which states their law and holds v5's rates by
 * construction). Called only when a part is drawn; with both bound the caller draws v5's card on
 * v5's die and never comes here.
 *
 *  - **Pressures DRAWN:** the coverage on `defense-card` (`selectCoverage`: v5's die, folded onto
 *    its host), then the pressure over it on `defense-pressure`, the creeper as the plan says.
 *  - **Pressures BOUND** (`/pressures-bound`): v5's card, on v5's `defense-card` die.
 *  - **Lines DRAWN:** the line game on `defense-line`, over the call with its own stunts stripped, at
 *    the plan's r_line (`lineGameRate`).
 *  - **Lines BOUND** (`/lines-bound`): the call keeps its own stunts (a reproduction its card's).
 */
function drawInParts(snapRng: Rng, situation: PlaySituation, plan: SnapPlan): DrawnCall {
  if (plan.pressures === "DRAWN") {
    const coverage = selectCoverage(snapRng.fork("defense-card"), situation);
    const pressure = drawPressure(snapRng.fork("defense-pressure"), coverage, situation, { creeper: plan.creeper });
    const graded = composed(coverage, pressure, "NONE");
    if (plan.lines === "BOUND") return { coverage, graded, card: composed(coverage, pressure, "BOUND") };
    const rLine = lineGameRate(situation, { pressures: "DRAWN", creeper: plan.creeper });
    const game = drawLineGame(snapRng.fork("defense-line"), graded, situation, rLine);
    return { coverage, graded, card: game === undefined ? graded : composed(coverage, pressure, game.id) };
  }
  const card = selectDefensiveCard(snapRng.fork("defense-card"), situation);
  const graded = composeCall(card, undefined, "NONE");
  const game = drawLineGame(snapRng.fork("defense-line"), graded, situation, lineGameRate(situation, { pressures: "BOUND" }));
  return { coverage: undefined, graded, card: game === undefined ? graded : composeCall(card, undefined, game.id) };
}

/**
 * ADR-073 §2.3, from v5: the pass call with the line's options stated, as `protectionOptions`
 * states them from the card, less the ones this caller does not call. The slide check is stated
 * unless `slideCheck` is `false`; the keep-in (`checkRelease`) is stated ONLY if `keepIn` is
 * `true`, because it is the back's own post-snap read and not a pre-snap call (ADR-073 §10 3.3;
 * the owner's challenge of 2026-10-17). A dropped option's key is ABSENT rather than `undefined`
 * (`exactOptionalPropertyTypes`; the engine validator asks `"slideCheck" in scheme`), and every
 * other key keeps its place: the card's scheme carries neither key, so with the slide check off
 * and the keep-in at its default the call is v4's, key for key and in order.
 */
function withLineOptions(
  spec: FrozenCallerSpec,
  concept: PassConcept,
  unit: AnyOffensiveUnit,
  offense: InstantiatedOffense,
): InstantiatedOffense {
  if (offense.call.kind !== "PASS") return offense;
  const off = new Set<string>([
    ...(spec.slideCheck === false ? ["slideCheck"] : []),
    ...(spec.keepIn === true ? [] : ["checkRelease"]),
  ]);
  const protectionScheme = Object.fromEntries(
    Object.entries(protectionOptions(concept, unit, offense)).filter(([key]) => !off.has(key)),
  ) as ProtectionCall;
  return { ...offense, call: { ...offense.call, protectionScheme } };
}

function situationOf(request: {
  readonly situation: {
    readonly down: number;
    readonly distance: number;
    readonly ballOn: number;
    readonly twoMinute: boolean;
  };
}): PlaySituation {
  const down = request.situation.down;
  if (down < 1 || down > 4 || !Number.isInteger(down)) {
    throw new FrozenCallerError(`down ${down} is not 1-4`);
  }
  return {
    down: down as Down,
    distance: request.situation.distance,
    ballOn: request.situation.ballOn,
    twoMinute: request.situation.twoMinute,
  };
}

function tendencyKeyOf(request: {
  readonly situation: {
    readonly down: number;
    readonly distance: number;
    readonly ballOn: number;
    readonly twoMinute: boolean;
    readonly offenseScore: number;
    readonly defenseScore: number;
  };
}): TendencyKey {
  const s = request.situation;
  return {
    down: s.down as Down,
    distance: distanceBand(s.distance),
    region: fieldRegion(s.ballOn),
    score: scoreState(s.offenseScore - s.defenseScore),
    twoMinute: s.twoMinute,
  };
}

/**
 * THE SHARED PRNG ADDRESS, and why it is derived by label surgery rather than passed.
 *
 * `simulateGame` forks `game:{id}/call:{n}` into `/offense` and `/defense` and hands one to each
 * caller. Both sides of this pair must resolve the SAME snap identically, so both need the same
 * address; neither is given the parent. Reconstructing it from `Rng.seed` + `Rng.label` — both
 * public fields of a public type — is the only way to get there without shared mutable state
 * between two supposedly pure callers.
 *
 * It depends on the engine's fork-label scheme, which `simulateGame`'s header states as
 * structural commitment 2. If that scheme ever changes, this throws **loudly on the first snap**
 * rather than letting the two sides diverge quietly — which is the difference between a broken
 * batch and a batch of clean statistics about two teams playing different plays.
 */
/** The head-only Mug's drawing options (ADR-090 §4.3, question 1's other answer). */
const MUG_HEAD_ONLY: PreSnapOptions = Object.freeze({ mug: "HEAD_ONLY" });

/**
 * How the frozen pair draws the snap picture for an arm (ADR-089 step 3, plan §2.11, K5): the
 * picture its physics reads, named by the free-run block's picture dial. `undefined`, the ruled
 * picture (`snapPicture(input)`), for a bundle with no free-run block (legacy, `pocket-1.s1`,
 * `pocket-1.s2`) and for `AS_RULED`; the head-only Mug (`snapPicture(input, { mug: "HEAD_ONLY" })`)
 * for `MUG_HEAD_ONLY`, which skips beat 3 for the Mug alone. No die is read.
 */
export function pictureOptionsOf(tunables: Tunables): PreSnapOptions | undefined {
  const picture = tunables.blitzPickup.freeRun?.picture;
  switch (picture) {
    case undefined:
    case "AS_RULED":
      return undefined;
    case "MUG_HEAD_ONLY":
      return MUG_HEAD_ONLY;
    default: {
      const unhandled: never = picture;
      throw new FrozenCallerError(`the free-run block names a picture this frozen pair cannot draw: ${String(unhandled)}`);
    }
  }
}

function sharedSnapRng(rng: Rng, side: "offense" | "defense" | "line-up"): Rng {
  const suffix = `/${side}`;
  if (!rng.label.endsWith(suffix)) {
    throw new FrozenCallerError(
      `expected the ${side} caller's Rng label to end in "${suffix}", got "${rng.label}". ` +
        `The engine's fork-label scheme (simulateGame commitment 2) changed; the frozen caller ` +
        `derives a shared per-snap address from it and cannot silently guess a new one.`,
    );
  }
  return createRng(rng.seed, `${rng.label.slice(0, -suffix.length)}/frozen-snap`);
}

interface ResolvedSnap {
  readonly offense: InstantiatedOffense;
  readonly defense: InstantiatedDefense;
  /**
   * The card drawn, as the anticipation is graded against it. From v6, when a part is drawn, the
   * call BEFORE its line game (the huddle guesses none), which carries the same id, personnel and
   * front as the call played.
   */
  readonly defensiveCard: AnyDefensiveCard;
  readonly concept: OffensiveConcept;
  readonly redraws: number;
  readonly pass: boolean;
  readonly backoff: string;
  /**
   * The front the offence blocked, and how close it was. Absent under v1, where there is no
   * second draw and therefore nothing to grade — an absent value, not a zeroed one, because
   * "the caller did not guess" and "the caller guessed perfectly" are different facts and only
   * one of them is ADR-024's subject (same argument as ADR-005 on an absent CHECK).
   */
  readonly anticipated: AnticipatedFront | undefined;
  /**
   * The anticipated card, instantiated — what the offence actually blocked. Identical to
   * `defense` under v1 and whenever the guess was exact, which is why the two are separate
   * fields rather than one optional: the code that grades the draw must not have to ask whether
   * it is looking at the real front by accident.
   */
  readonly expectedDefense: InstantiatedDefense;
  /** Protection entries naming a man `defense.rush` does not contain. ADR-026's population. */
  readonly protectorsInCoverage: number;
  /** ADR-073 §2.5 (v7): the front look drawn this snap, if `/wears` said yes; `undefined` otherwise. */
  readonly frontDraw: FrontLookDraw | undefined;
  /**
   * The call wears it: drawn, and this instance did not make it illegal. `false` with a draw is a
   * formation-dropped look (§2.5), known by `applyFrontLook` handing the defence back unchanged.
   */
  readonly frontWorn: boolean;
  /**
   * What the snap picture is drawn from (ADR-090 step 1): the formation and the eleven the
   * offense put out, the called card as it wears its coverage looks, and the defense as played,
   * with its front look on. Read by `lineUp` only; nothing above it reads a spot.
   */
  readonly snapInput: SnapInput;
}

/**
 * Resolve one snap completely, from the same inputs both callers hold. Pure and deterministic:
 * the only randomness is `snapRng`, whose address is a function of the game id and the play
 * number.
 */
function resolveSnap(
  spec: FrozenCallerSpec,
  offenseChart: DepthChart,
  defenseChart: DepthChart,
  situation: PlaySituation,
  key: TendencyKey,
  snapRng: Rng,
): ResolvedSnap {
  const version = spec.callerVersion ?? DEFAULT_CALLER_VERSION;
  const profile = PROFILE[version];
  const plan = snapPlan(profile, spec);
  const rate = lookupPassRate(spec.tendencies, key);
  const pass = snapRng.fork("kind").next() < rate.passRate;

  // The defensive card is drawn WITHOUT reference to the offensive concept — the corpus's
  // situational weights are all it sees — so the defence is not clairvoyant either. From v6 it is
  // drawn in parts (ADR-073 §2.6); with both parts bound it is v5's card on v5's die.
  const drawn = plan.pressures === "BOUND" && plan.lines === "BOUND" ? undefined : drawInParts(snapRng, situation, plan);
  const defensiveCard =
    drawn === undefined ? selectDefensiveCard(snapRng.fork("defense-card"), situation) : drawn.card;
  const defenseUnit = buildDefensiveUnit(defensiveCard.personnel, defenseChart);

  /**
   * ADR-069 and ADR-071, from v3: the coverage looks the defence wears over that card, on their own
   * address and AFTER the card, so the card is the one v2 would have called. From v7 a front look
   * follows them (below; ADR-073 §2.5), and it does change what the line is shown. The anticipated
   * card (the offence's guess) is still drawn bare, now because the huddle cannot see a look: the
   * guess is made before the defence shows anything, and the line reads the look after the snap
   * through the shown rush (ADR-073 R30). So nothing below but the real defence ever wears one.
   */
  const catalogue = profile.looks;
  const lookDraw =
    catalogue === undefined
      ? undefined
      : selectLooks(snapRng.fork("defense-mask"), defensiveCard, spec.coverageMasks ?? catalogue);
  const calledCard = lookDraw === undefined ? defensiveCard : applyLooks(defensiveCard, lookDraw);

  /**
   * ADR-073 §2.5, from v7: the front look, on an address of its own and AFTER the card and its
   * coverage looks (§2.6 step 5), so the call is the one v6 would have made. Its dice are thrown
   * ONCE PER SNAP, here, with legality read off the called card, at the owner's rate, passed
   * explicitly. The concept loop below lays the drawn look over each instantiation and never
   * re-throws a die. The huddle's guess never sees it. Below v7 `plan.fronts` is `undefined` and
   * nothing is forked.
   */
  const frontDraw =
    plan.fronts === undefined
      ? undefined
      : drawFrontLook(snapRng.fork("defense-front"), calledCard, plan.fronts, FRONT_LOOK_RATE);

  /**
   * ADR-024 step 2, on a fork of its own so v1's three addresses are untouched.
   *
   * The anticipation is drawn ONCE PER SNAP, before the concept loop, and deliberately not inside
   * it: a caller that re-anticipated on every re-draw would be sampling the defence repeatedly
   * until it found one it liked, which is clairvoyance wearing a guess's face.
   *
   * From v6, with the pressures drawn, it is decomposed as the call is (ADR-073 R30), on children
   * of the same fork, and held to the real coverage's personnel.
   */
  const anticipated: AnticipatedFront | undefined =
    plan.anticipation === "NONE"
      ? undefined
      : plan.anticipation === "CARD"
        ? anticipateFront(snapRng.fork("anticipated-front"), situation, defensiveCard)
        : anticipateDecomposed(snapRng.fork("anticipated-front"), situation, coverageOf(drawn), {
            pressures: "DRAWN",
            creeper: plan.creeper,
          });

  let redraws = 0;
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_CONCEPT_REDRAWS; attempt++) {
    const conceptRng = snapRng.fork(`offense-card:${attempt}`);
    const concept: OffensiveConcept = pass
      ? selectPassConcept(conceptRng, situation)
      : selectRunConcept(conceptRng, situation);
    const offenseUnit = buildOffensiveUnit(concept.formation.personnel, offenseChart);
    const look = { formation: concept.formation, unit: offenseUnit };
    const defense = instantiateDefense(calledCard, defenseUnit, look);
    /**
     * THE SAME ELEVEN MEN, and that is the whole point of the personnel rule.
     *
     * `anticipated.card.personnel === defensiveCard.personnel` by construction in
     * `anticipateFront`, and `buildDefensiveUnit` is a pure function of the grouping and the
     * chart — so `defenseUnit` is correct for both cards and every player the protection names is
     * on the field. Reusing the same unit rather than rebuilding it is what makes that a
     * structural fact instead of a coincidence two calls happen to agree on.
     */
    const expected =
      anticipated === undefined
        ? defense
        : instantiateDefense(anticipated.card, defenseUnit, look);
    // ADR-073 §2.5: the real defence wears the drawn look; `expected` never does. A formation that
    // makes the look illegal on this instance gets `defense` itself back, and that call wears none.
    const worn = frontDraw === undefined ? defense : applyFrontLook(defense, frontDraw);
    try {
      const offense = isRunConcept(concept)
        ? instantiateRun(concept, offenseUnit, expected)
        : profile.protectionOptions
          ? withLineOptions(spec, concept, offenseUnit, instantiatePass(concept, offenseUnit, expected))
          : instantiatePass(concept, offenseUnit, expected);
      const realRushers = new Set(defense.rush.map((r) => String(r.rusher)));
      const protectorsInCoverage =
        offense.call.kind === "PASS"
          ? offense.call.protection.filter((p) => !realRushers.has(String(p.rusher))).length
          : 0;
      return {
        offense,
        defense: worn,
        defensiveCard: drawn === undefined ? defensiveCard : drawn.graded,
        concept,
        redraws,
        pass,
        backoff: rate.level,
        anticipated,
        expectedDefense: expected,
        protectorsInCoverage,
        frontDraw,
        frontWorn: frontDraw !== undefined && worn !== defense,
        snapInput: { formation: concept.formation, offense: offenseUnit, card: calledCard, defense: worn },
      };
    } catch (e) {
      if (!(e instanceof UnprotectableCallError)) throw e;
      lastError = e;
      redraws++;
    }
  }
  throw new FrozenCallerError(
    `no offensive concept in the corpus could be protected against ` +
      `${anticipated === undefined ? defensiveCard.id : anticipated.card.id} on ` +
      `${situation.down} and ${situation.distance} at ${situation.ballOn} after ` +
      `${MAX_CONCEPT_REDRAWS + 1} draws. Last: ${String(lastError)}`,
  );
}

/** The coverage of a part-drawn call. Asked only where the pressures are drawn, which draws one. */
function coverageOf(drawn: DrawnCall | undefined): AnyDefensiveCard {
  if (drawn?.coverage === undefined) {
    throw new FrozenCallerError("the huddle decomposes the call, and no coverage was drawn to decompose");
  }
  return drawn.coverage;
}

export function frozenCallerPair(spec: FrozenCallerSpec): FrozenCallerPair {
  const callerVersion = spec.callerVersion ?? DEFAULT_CALLER_VERSION;
  // Membership in the list, not `PROFILE[v] === undefined`: an inherited name ("constructor")
  // finds an entry on any object, and would play a caller nobody wrote.
  if (!(CALLER_VERSIONS as readonly string[]).includes(callerVersion)) {
    throw new FrozenCallerError(
      `no caller version "${String(callerVersion)}". Expected one of ${CALLER_VERSIONS.join(", ")}.`,
    );
  }
  if (!PROFILE[callerVersion].protectionOptions && (spec.slideCheck !== undefined || spec.keepIn !== undefined)) {
    throw new FrozenCallerError(
      `caller ${callerVersion} states no line options, so it has none to set: slideCheck and ` +
        `keepIn are knobs of a version that states them (v5 to v7, ADR-073 §2.7).`,
    );
  }
  const profile = PROFILE[callerVersion];
  if (
    profile.pressures === "BOUND" &&
    profile.lines === "BOUND" &&
    (spec.creeper !== undefined || spec.drawPressures !== undefined || spec.drawLines !== undefined)
  ) {
    throw new FrozenCallerError(
      `caller ${callerVersion} draws its call as one card, so it has no part to bind: creeper, ` +
        `drawPressures and drawLines are knobs of a version that draws them (v6 and v7, ADR-073 §2.6).`,
    );
  }
  if (spec.creeper === false && spec.drawPressures === false) {
    throw new FrozenCallerError(
      `with the pressures bound (drawPressures: false) no creeper is drawn, so creeper: false would ` +
        `name a knob that did nothing (ADR-073 step 3.4).`,
    );
  }
  if (profile.fronts === undefined && spec.frontLooks !== undefined) {
    throw new FrozenCallerError(
      `caller ${callerVersion} draws no front look, so it has no catalogue to narrow: frontLooks is a ` +
        `knob of a version that draws them (v7, ADR-073 §2.5).`,
    );
  }
  if (spec.frontLooks !== undefined && !isFrontCatalogue(spec.frontLooks)) {
    throw new FrozenCallerError(notAFrontCatalogue(spec.frontLooks));
  }
  const leash = spec.leash ?? DEFAULT_LEASH;
  const name = spec.name ?? `frozen-${callerIdentity(callerVersion, spec.tendencies.version, leash, spec)}`;
  const diagnostics = blankDiagnostics();

  const chartsFor = (side: "HOME" | "AWAY"): { offense: DepthChart; defense: DepthChart } =>
    side === "HOME"
      ? { offense: spec.homeDepthChart, defense: spec.awayDepthChart }
      : { offense: spec.awayDepthChart, defense: spec.homeDepthChart };

  const makeCaller = (side: "HOME" | "AWAY"): PlayCaller => ({
    name,

    callOffense(request: OffensiveCallRequest, rng: Rng): OffensiveCall {
      const charts = chartsFor(side);
      const resolved = resolveSnap(
        spec,
        charts.offense,
        charts.defense,
        situationOf(request),
        tendencyKeyOf(request),
        sharedSnapRng(rng, "offense"),
      );
      diagnostics.offensiveCalls++;
      if (resolved.pass) diagnostics.passCalls++;
      else diagnostics.runCalls++;
      diagnostics.conceptRedraws += resolved.redraws;
      diagnostics.backoff[resolved.backoff] = (diagnostics.backoff[resolved.backoff] ?? 0) + 1;
      // Recorded HERE and not in `callDefense`, which resolves the identical snap and would
      // double every count. The two resolutions agreeing is asserted below; it is not a licence
      // to fold both.
      const anticipated = resolved.anticipated;
      if (anticipated !== undefined) {
        recordDraw(diagnostics.draw, {
          front: anticipated,
          comparison: compareFronts(
            anticipated.card,
            resolved.expectedDefense,
            resolved.defensiveCard,
            resolved.defense,
          ),
          pass: resolved.pass,
          personnel: resolved.defensiveCard.personnel,
          protectorsInCoverage: resolved.protectorsInCoverage,
        });
      }
      // ADR-073 §2.5 (v7): the front look drawn, and a draw this instance's formation made illegal.
      const front = resolved.frontDraw;
      if (front !== undefined) {
        const counts = diagnostics.frontLooks;
        counts.drawn[front.look] = (counts.drawn[front.look] ?? 0) + 1;
        if (!resolved.frontWorn) counts.formationDropped++;
      }
      // ADR-072: the leash is the coach's, so it is stamped here, on the call he makes, and not in
      // `resolveSnap` — which both sides run, and which is about what is played, not who may change it.
      return resolved.offense.call.kind === "PASS" ? { ...resolved.offense.call, leash } : resolved.offense.call;
    },

    callDefense(request: DefensiveCallRequest, rng: Rng): DefensivePlayCall {
      // The DEFENDING team's caller resolves the snap, so `offense`/`defense` are the other way
      // round from this caller's own side.
      const charts = side === "HOME"
        ? { offense: spec.awayDepthChart, defense: spec.homeDepthChart }
        : { offense: spec.homeDepthChart, defense: spec.awayDepthChart };
      const resolved = resolveSnap(
        spec,
        charts.offense,
        charts.defense,
        situationOf(request),
        tendencyKeyOf(request),
        sharedSnapRng(rng, "defense"),
      );
      // The agreement is asserted, not assumed. Two identical resolutions of the same snap is
      // the property the whole design rests on; a silent disagreement would mean the defence
      // was built against a play the offence did not run, and every coverage number after it
      // would be describing a game nobody played.
      if (resolved.offense.call.name !== request.against.name) {
        throw new FrozenCallerError(
          `the two sides of the frozen pair disagree about this snap: the offence ran ` +
            `"${request.against.name}" and the defensive resolution produced ` +
            `"${resolved.offense.call.name}". Same seed, same situation, same charts — so the ` +
            `inputs the two callers hold have diverged.`,
        );
      }
      diagnostics.defensiveCalls++;
      return resolved.defense.call;
    },

    /**
     * ADR-091 §5.1 (D1) and ADR-092 §5.4 (D8): the quarterback's count, asked of the OFFENSE's
     * caller on a snap whose defense wears a stem (ADR-090 step 3, under `legacy` rules only). One
     * d100 from the snap's own address (`call:<n>/cadence`), none when a hard count is owed at home.
     * Its request is typed through `PlayCaller`, as `lineUp`'s is, so calibration's engine surface
     * gains no name (ADR-089 step 0's pin).
     */
    cadence(request, rng): Cadence {
      const s = request.situation;
      return chooseCadence({ home: request.home, down: s.down, distance: s.distance, hardCountsOwed: request.hardCountsOwed }, rng);
    },

    /**
     * ADR-090 step 1 (petition S5): where every man stands at the snap. Asked of the DEFENDING
     * team's caller after both calls, so the charts are the other way round from this caller's own
     * side, as in `callDefense`. It resolves the same snap again from the same shared address
     * (`resolveSnap` is pure in its inputs) and draws the picture from it; no die is thrown and no
     * diagnostic is counted, so the game is the game it was.
     *
     * ADR-090 step 3: when the engine played a stem out at the line, the picture is drawn with its
     * ending (`request.stem`, ADR-091 §6); with none, a worn Stem is drawn on time, as before.
     */
    lineUp(request, rng): SnapPicture {
      const charts = side === "HOME"
        ? { offense: spec.awayDepthChart, defense: spec.homeDepthChart }
        : { offense: spec.homeDepthChart, defense: spec.awayDepthChart };
      const resolved = resolveSnap(
        spec,
        charts.offense,
        charts.defense,
        situationOf(request),
        tendencyKeyOf(request),
        sharedSnapRng(rng, "line-up"),
      );
      // As `callDefense` asserts: a picture of a snap the offence did not run would be a picture of
      // a game nobody played.
      if (resolved.offense.call.name !== request.offenseCall.name) {
        throw new FrozenCallerError(
          `the line-up resolved "${resolved.offense.call.name}" and the offence ran ` +
            `"${request.offenseCall.name}". Same seed, same situation, same charts — so the inputs ` +
            `the callers hold have diverged.`,
        );
      }
      // ADR-090 step 3: the stem's ending, when the engine played one out at the line (only under
      // `legacy`, so never beside a free-run block's picture dial).
      const input = request.stem === undefined ? resolved.snapInput : { ...resolved.snapInput, stem: request.stem };
      // ADR-089 step 3 (plan §2.11, K5): an arm publishes the picture its physics reads, the one
      // its free-run block's picture dial names (`pictureOptionsOf`). AS_RULED, and every bundle
      // with no free-run block (legacy, s1, s2), draw the ruled picture exactly as before; the
      // Mug's head-only answer (C6) draws ADR-090 question 1's other picture.
      const options = pictureOptionsOf(request.tunables);
      return options === undefined ? snapPicture(input) : snapPicture(input, options);
    },

    /**
     * DRAWN FROM THE FITTED DISTRIBUTION, not taken modally — a deliberate disagreement with
     * `@ff/engine`'s `defaultPlayCaller`, whose comment says "no die: a coach who flips a coin
     * on fourth down is noise in every metric that reads this."
     *
     * That is right about variance and wrong about bias, and calibration cares about the second.
     * Real fourth-and-1 at midfield is roughly a coin flip; a modal policy would punt every
     * time and put a systematic error into drives/game, punts/game and points/drive — three
     * Tier 1 metrics. Across the hundreds of games a batch runs, the variance a draw adds
     * vanishes into the confidence interval; the bias a modal policy adds does not.
     */
    decideFourthDown(request: FourthDownRequest): FourthDownChoice {
      const s = request.situation;
      const inRange =
        request.fieldGoalDistanceYards <=
        request.tunables.game.specialTeams.fieldGoal.maxAttemptDistanceYards;
      // Addressed by the situation rather than by a fork of a caller-held Rng: this decision
      // point is handed no Rng at all by the engine, and a hidden counter would make the caller
      // stateful and the batch unreproducible.
      const rng = createRng(
        `fourth-down:${String(request.offense.team)}`,
        `${s.period}:${s.clockSeconds}:${s.down}:${s.distance}:${s.ballOn}:${s.offenseScore}:${s.defenseScore}`,
      );
      const choice = lookupFourthDown(spec.fourthDown, tendencyKeyOf(request), rng, inRange);
      if (choice === "GO_FOR_IT") diagnostics.fourthDownGo++;
      else if (choice === "PUNT") diagnostics.fourthDownPunt++;
      else diagnostics.fourthDownFieldGoal++;
      return choice;
    },

    /** Always receive. Deferring is a tendency, and this caller has exactly the tendencies it was fitted. */
    decideCoinToss(_request: CoinTossRequest): CoinTossChoice {
      return "RECEIVE";
    },
  });

  return { home: makeCaller("HOME"), away: makeCaller("AWAY"), diagnostics, name, callerVersion, leash };
}
