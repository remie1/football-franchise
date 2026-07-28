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
 *  - **No audibles, no hot routes, no motion, no play-action distinction.** The corpus carries
 *    none of those as separate cards, so a caller cannot call them.
 *  - **PROTECTION IS PERFECTLY INFORMED, and this one is a real distortion.** The engine
 *    rejects a play whose defensive rush includes a man no protection assignment names
 *    (`UnsupportedPlayCallError` — §7.4 blitz pickup is unimplemented). So the offence's
 *    protection is built AGAINST THE ACTUAL DEFENSIVE CARD. The concept choice is still blind —
 *    the tendency draw and the card draw happen before the defence is known — but the blocking
 *    is not. **Expect sack rate and pressure rate to be biased DOWNWARD** relative to reality
 *    by however much real offences miss blitz pickups, and do not fit a pass-rush tunable to
 *    that number until §7.4 exists. This is not fixable in calibration.
 *  - **Unprotectable pressures cause a CONCEPT re-draw, not a defensive re-draw.** When the
 *    corpus's protection cannot account for a pressure at all (empty personnel against a
 *    six-man pressure throws `UnprotectableCallError` by design), the offensive concept is
 *    re-drawn and the defensive card is kept, so the fitted blitz rate survives and the
 *    offensive concept mix takes the distortion. The rate is counted and reported
 *    (`FrozenCallerDiagnostics.conceptRedraws`); it is a number to look at, not a number to
 *    ignore.
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
  };
}

export interface FrozenCallerSpec {
  readonly tendencies: FittedTendencies;
  readonly fourthDown: FittedFourthDown;
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
  const rate = lookupPassRate(spec.tendencies, key);
  const pass = snapRng.fork("kind").next() < rate.passRate;

  // The defensive card is drawn WITHOUT reference to the offensive concept — the corpus's
  // situational weights are all it sees — so the defence is not clairvoyant even though the
  // offence's protection is.
  const defensiveCard = selectDefensiveCard(snapRng.fork("defense-card"), situation);
  const defenseUnit = buildDefensiveUnit(defensiveCard.personnel, defenseChart);

  let redraws = 0;
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_CONCEPT_REDRAWS; attempt++) {
    const conceptRng = snapRng.fork(`offense-card:${attempt}`);
    const concept: OffensiveConcept = pass
      ? selectPassConcept(conceptRng, situation)
      : selectRunConcept(conceptRng, situation);
    const offenseUnit = buildOffensiveUnit(concept.formation.personnel, offenseChart);
    const defense = instantiateDefense(defensiveCard, defenseUnit, {
      formation: concept.formation,
      unit: offenseUnit,
    });
    try {
      const offense = isRunConcept(concept)
        ? instantiateRun(concept, offenseUnit, defense)
        : instantiatePass(concept, offenseUnit, defense);
      return {
        offense,
        defense,
        defensiveCard,
        concept,
        redraws,
        pass,
        backoff: rate.level,
      };
    } catch (e) {
      if (!(e instanceof UnprotectableCallError)) throw e;
      lastError = e;
      redraws++;
    }
  }
  throw new FrozenCallerError(
    `no offensive concept in the corpus could be protected against ${defensiveCard.id} on ` +
      `${situation.down} and ${situation.distance} at ${situation.ballOn} after ` +
      `${MAX_CONCEPT_REDRAWS + 1} draws. Last: ${String(lastError)}`,
  );
}

export function frozenCallerPair(spec: FrozenCallerSpec): FrozenCallerPair {
  const name = spec.name ?? `frozen-${spec.tendencies.version}`;
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

  return { home: makeCaller("HOME"), away: makeCaller("AWAY"), diagnostics, name };
}
