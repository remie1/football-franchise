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
 */
import type { Rng } from "@ff/contracts";
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
} from "@ff/engine";
import type { OffensiveCall } from "@ff/contracts";
import type { AnyDefensiveCard, DepthChart, PlaySituation } from "@ff/playbook";
import {
  UnprotectableCallError,
  buildDefensiveUnit,
  buildOffensiveUnit,
  instantiateDefense,
  instantiateRun,
  instantiatePass,
  isRunConcept,
  selectDefensiveCard,
  selectPassConcept,
  selectRunConcept,
  type InstantiatedDefense,
  type InstantiatedOffense,
  type OffensiveConcept,
} from "@ff/playbook";
import type { Down } from "@ff/playbook";
import {
  DEFAULT_CALLER_VERSION,
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
  };
}

export interface FrozenCallerSpec {
  readonly tendencies: FittedTendencies;
  readonly fourthDown: FittedFourthDown;
  /**
   * v1 (the informed caller) or v2 (ADR-024's anticipating caller). Defaults to v2.
   *
   * OPTIONAL HERE AND RECORDED IN PROVENANCE, which is the same split `runBatch` makes for
   * `tunables`: ergonomics on the surface, and the value that was actually used printed in the
   * report header. It is part of `BaselineIdentity` through `BatchProvenance.callerVersion`, so
   * the two cannot be silently compared.
   */
  readonly callerVersion?: CallerVersion;
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
 */
export function callerIdentity(version: CallerVersion, tendenciesVersion: string): string {
  return `${version}/${tendenciesVersion}`;
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
function sharedSnapRng(rng: Rng, side: "offense" | "defense"): Rng {
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
  const rate = lookupPassRate(spec.tendencies, key);
  const pass = snapRng.fork("kind").next() < rate.passRate;

  // The defensive card is drawn WITHOUT reference to the offensive concept — the corpus's
  // situational weights are all it sees — so the defence is not clairvoyant either.
  const defensiveCard = selectDefensiveCard(snapRng.fork("defense-card"), situation);
  const defenseUnit = buildDefensiveUnit(defensiveCard.personnel, defenseChart);

  /**
   * ADR-024 step 2, on a fork of its own so v1's three addresses are untouched.
   *
   * The anticipation is drawn ONCE PER SNAP, before the concept loop, and deliberately not inside
   * it: a caller that re-anticipated on every re-draw would be sampling the defence repeatedly
   * until it found one it liked, which is clairvoyance wearing a guess's face.
   */
  const anticipated: AnticipatedFront | undefined =
    version === "v1"
      ? undefined
      : anticipateFront(snapRng.fork("anticipated-front"), situation, defensiveCard);

  let redraws = 0;
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_CONCEPT_REDRAWS; attempt++) {
    const conceptRng = snapRng.fork(`offense-card:${attempt}`);
    const concept: OffensiveConcept = pass
      ? selectPassConcept(conceptRng, situation)
      : selectRunConcept(conceptRng, situation);
    const offenseUnit = buildOffensiveUnit(concept.formation.personnel, offenseChart);
    const look = { formation: concept.formation, unit: offenseUnit };
    const defense = instantiateDefense(defensiveCard, defenseUnit, look);
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
    try {
      const offense = isRunConcept(concept)
        ? instantiateRun(concept, offenseUnit, expected)
        : instantiatePass(concept, offenseUnit, expected);
      const realRushers = new Set(defense.rush.map((r) => String(r.rusher)));
      const protectorsInCoverage =
        offense.call.kind === "PASS"
          ? offense.call.protection.filter((p) => !realRushers.has(String(p.rusher))).length
          : 0;
      return {
        offense,
        defense,
        defensiveCard,
        concept,
        redraws,
        pass,
        backoff: rate.level,
        anticipated,
        expectedDefense: expected,
        protectorsInCoverage,
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

export function frozenCallerPair(spec: FrozenCallerSpec): FrozenCallerPair {
  const callerVersion = spec.callerVersion ?? DEFAULT_CALLER_VERSION;
  const name = spec.name ?? `frozen-${callerIdentity(callerVersion, spec.tendencies.version)}`;
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
      return resolved.offense.call;
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

  return { home: makeCaller("HOME"), away: makeCaller("AWAY"), diagnostics, name, callerVersion };
}
