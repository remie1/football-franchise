/**
 * THE COLLECTORS — `calibration.md` §3's `collectors: MetricCollector[]`, made concrete.
 *
 * *"Consumes **only** the engine's typed event stream — the same events the debug printout
 * renders. If a metric can't be computed from events, that's a `CHECK`/event-coverage gap →
 * contract petition, not a side channel."*
 *
 * Taken literally. Everything below reads `MatchEventEnvelope[]` and `reduceStatlines`, which is
 * itself a pure reduction over the same array (ADR-014 item 15 put it on the barrel precisely so
 * calibration would not write a second one and let the two drift).
 *
 * ================== WHY A FOLD RATHER THAN A LIST OF STREAMS ==================
 *
 * The harness runs in worker threads. Handing a full event stream back across a thread boundary
 * for every one of several hundred games is the obvious design and it is the one that runs out
 * of memory: a game is a few thousand envelopes with nested roll details. So a worker folds each
 * game into `SimAccumulator` — counters plus bounded sample vectors — and the parent merges.
 * The fold is associative and has an identity, so merge order does not affect the result, which
 * is what makes a batch reproducible from its seeds regardless of how many workers ran it.
 *
 * The sample VECTORS are the exception that has to be justified: Tier 2 needs distributions, and
 * a distribution cannot be folded into a counter. They are kept, and they are the reason
 * `SimAccumulator` grows linearly with plays rather than staying constant.
 */
import type { MatchEventEnvelope, PlayerId, TeamId, ThrowawayCause } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import type { GameSummary, StatLine } from "@ff/engine";

/** One simulated game, as it comes back from a worker. */
export interface SimGameObservation {
  readonly seed: string;
  readonly summary: GameSummary;
  readonly events: readonly MatchEventEnvelope[];
  readonly statlines: readonly StatLine[];
}

// --- the fold ---------------------------------------------------------------

export interface PlayFold {
  plays: number;
  scrimmagePlays: number;

  dropbacks: number;
  /**
   * ================== BACKLOG ENTRY 94 FINDING 1/2: THROWAWAYS ARE ATTEMPTS ==================
   *
   * Dropbacks where the QB either threw to a receiver (a THROW event) OR threw the ball away (a
   * `THROWAWAY` event — ADR-056 Option C; entry 94/95 read this off `QB_DECISION{choice:
   * "THROWAWAY"}` before the ADR-056 event existed, entry 98 switched the signal, see `case
   * "THROWAWAY"` below). Both are pass attempts in the scoring sense nflverse uses: `isPassAttempt`
   * (`realInput.ts`) is `passAttempt === true && sack !== true`, and nflverse codes a throwaway
   * `pass_attempt = 1`, `sack = 0` — an ordinary incomplete attempt. There is no
   * `qb_throwaway`-equivalent column in the ingested `PbpRow` schema to exclude one even if a
   * metric wanted to, so the real side has always included them; this field used to NOT (a
   * THROW-event-only count), which was the defect entry 94 named. It still excludes sacks and
   * scrambles, exactly as `isPassAttempt` does.
   *
   * `packages/engine`'s own `StatLine.passing.attempts` USED TO exclude throwaways (`statline.ts`'s
   * own comment recorded it as a routed, unfixed gap) — ADR-056 closed that too, so the two are the
   * SAME population again as of this dispatch (entry 98) and `test/metrics.test.ts`'s reconciliation
   * check against the reducer asserts equality directly, with no compensating subtraction.
   */
  passAttempts: number;
  completions: number;
  interceptions: number;
  sacks: number;
  throwaways: number;
  /**
   * ================== POCKET DURESS vs CLOCK EXPIRED (ADR-056 AMENDED BESIDE) ==================
   *
   * `throwaways` above is ONE population produced by TWO different football events, and ADR-056's
   * amendment beside Option C exists precisely so a consumer can tell them apart instead of
   * inferring it again: `POCKET_DURESS` (the `forcesDecision(pocket)` branch, `passPlay.ts:1077`
   * — the pocket beat him) and `CLOCK_EXPIRED` (the clock/reads ran out with **no** duress,
   * `passPlay.ts:1096` — nobody got open). Keyed by `THROWAWAY.payload.cause`, READ DIRECTLY OFF
   * THE EVENT — never re-derived from `pressured`, `forcedDecision`, or any other pocket-status
   * fact this fold already tracks. That is the entire point of the field: the engine already
   * knows which is which, and re-deriving it from a correlated-but-distinct signal would
   * reintroduce the exact inference ADR-056 shipped `cause` to make unnecessary.
   *
   * `Object.values(...)` sums back to `throwaways` above by construction — both are bumped in the
   * same branch of `flush()`, once per throwaway, so `throwaways === Σ throwawaysByCause` on every
   * fold. `test/metrics.test.ts` asserts the identity directly.
   */
  throwawaysByCause: Record<string, number>;
  scrambles: number;
  /** Dropbacks whose worst POCKET_STATUS was anything other than CLEAN. */
  pressuredDropbacks: number;
  /**
   * ================== BACKLOG 87 DISPATCH A: THE SACK NUMERATOR ==================
   *
   * Sacks whose dropback ALSO set the `pressuredDropbacks` flag — the identical per-play
   * `pressured` boolean (worst POCKET_STATUS not CLEAN), read at the SAME `flush()`, never a
   * second notion of "pressured" invented for this field. `pressure_to_sack`'s numerator was
   * `sacks` (every sack, ADR-033's coverage sacks included) over a denominator of PRESSURED
   * dropbacks only — a conditional rate compared with a non-conditional one, independent of
   * whatever `was_pressure` turns out to mean on the real side. This field conditions the
   * numerator to match: it is `sacks` restricted to dropbacks where `pressured === true`, so
   * `pressureToSackRate` can finally read `P(sack | pressured)` on the sim side instead of
   * `P(sack) / P(pressured)`.
   *
   * A sack can only ever be a subset of `sacks` here — same play, same flag, same instant — so
   * `pressuredSacks <= sacks` always, and the two cannot disagree about what "pressured" means
   * because there is exactly one `pressured` boolean per dropback and both consumers read it.
   */
  pressuredSacks: number;
  /**
   * ================== BACKLOG DISPATCH C: PIPELINE EXIT (`qb_disruption_rate`) ==================
   *
   * `threat_creation_rate` counts PIPELINE ENTRY — a dropback where the pocket was ever anything
   * other than CLEAN. Nothing before this field counted EXIT: whether that entry ever converted
   * into something that actually disrupted the passer, as opposed to a pocket that dirtied for one
   * tick and cleared. This is that count. A dropback is "disrupted" iff ANY of three PUBLISHED
   * signals fired during it:
   *
   *   (1) a `RUSH_THREAT` reached `state: "ARRIVED"` — set by `threatArrived` below;
   *   (2) a `POCKET_STATUS` was ever a status in `DEFAULT_TUNABLES.pocket.forcesDecision`
   *       (`COLLAPSING`/`IMMEDIATE` today, read from tunables rather than restated — see
   *       `FORCES_DECISION_STATUSES` below) — set by `forcedDecision`;
   *   (3) the dropback ended in a sack — the SAME dichotomy `sacks` above already makes (no
   *       THROW, no scramble, no throwaway, no interception); no second sack rule. (Backlog entry
   *       94: this used to be inferred from negative result yards rather than read off a
   *       `throwaway` flag; the population it selects is unchanged.)
   *
   * A FOURTH disjunct in the drafted shape — "the QB was hit" — is DROPPED. `@ff/contracts`
   * publishes no event for a quarterback being hit as distinct from being sacked; inventing one
   * here would be reaching past the public stream into a fact the engine never states. Dropped,
   * not silently narrowed: this comment is where that is said.
   *
   * ================== THE SUBSET RELATION, VERIFIED NOT INHERITED ==================
   *
   * `disruptedDropbacks <= pressuredDropbacks` always, under `DEFAULT_TUNABLES`:
   *   - (1) and (2) hold BY CONSTRUCTION. `pocket.severity` ranks `CLEAN: 0 < COLLAPSING: 2 <
   *     IMMEDIATE: 3` (`tunables.ts`), `forcesDecision` names exactly `COLLAPSING`/`IMMEDIATE`
   *     (both non-CLEAN by that ranking), and `pocketFloorFromArrival` (`rushThreat.ts`) returns
   *     `IMMEDIATE` on the same comparison (`minTta <= immediateWithinSeconds`) `hasArrived`
   *     (`rushThreat.ts` — DORMANT since the no-target sack's re-anchoring off it, zero production
   *     call sites; kept for the LABEL question, see `passPlay.ts`'s §7.2 SACK comment) computes —
   *     so an ARRIVED threat or a forcesDecision status is, this tick, never CLEAN, which is
   *     exactly the condition that sets `pressured = true` below. Neither disjunct can fire on a
   *     dropback whose worst status stayed CLEAN. CALIBRATION-BACKLOG entry 126 finding 8: this
   *     formula identity between `hasArrived` and `pocketFloorFromArrival` HOLDS ONLY AT THE
   *     COMMITTED tunable value — the ARRIVED event is published off `etaTick <= tick`, never off
   *     this formula, so moving `immediateWithinSeconds` decouples the two. (1)/(2) are proven
   *     under `DEFAULT_TUNABLES` only, which is exactly what this header already claims, not under
   *     every tunable value.
   *   - (3) is MEASURED, not proven for every code path: backlog entries 87/88 measured 0 of 6,593
   *     sim sacks landing on a CLEAN-worst dropback on the canonical corpus, and entries 91/92
   *     traced why — two of the three sack paths require non-CLEAN by construction or by a
   *     separately measured population, and the third (the only one that COULD be CLEAN-worst)
   *     never fires under `DEFAULT_TUNABLES`. Entry 91's "by construction" for the no-target sack
   *     (path 1) read off that path CALLING `hasArrived`; the no-target sack is now re-anchored to
   *     `minTta <= 0` directly (`passPlay.ts`'s §7.2 SACK comment) and no longer calls `hasArrived`.
   *     The conclusion is unchanged at `DEFAULT_TUNABLES` (`immediateWithinSeconds = 0`, so
   *     `minTta <= 0` still implies `minTta <= immediateWithinSeconds`, still IMMEDIATE, still
   *     non-CLEAN) and CALIBRATION-BACKLOG entry 129 now confirms the underlying three-path count
   *     independently (`pathSum === sacks` on 496 games / 32 teams, no fourth site) — but the
   *     mechanism entry 91 named for path 1 no longer matches the code. So (3) does not add a
   *     counterexample on this corpus, but is not asserted to hold under every future tunable value
   *     the way (1)/(2) are.
   *
   * Pinned: `test/metrics.test.ts` asserts `disruptedDropbacks <= pressuredDropbacks` across the
   * fold's own 30-game corpus, so a future change that breaks the relation fails a test rather
   * than shipping a ratio that silently exceeds 100%.
   *
   * ================== THE IDENTITY CHECK (backlog dispatch C item 2) — NEGATIVE ==================
   *
   * Checked against every existing `PlayFold` field before adding this one: `pressuredDropbacks`
   * is a per-dropback worst-status boolean with no per-signal breakdown; `pressuredSacks`/`sacks`
   * carry sacks only, not arrival or forcesDecision; `pocketStatusTicks` is a per-TICK tally, not a
   * per-DROPBACK boolean, and folds three channels together with no dropback-level flag recoverable
   * from it; `threatOrigins`/`threatOriginDropbacks` carry HOW a rusher came free, never WHETHER he
   * arrived. None of them is an algebraic rearrangement of `disruptedDropbacks`, and none of them
   * can reconstruct it after the fact. Result: NO IDENTITY FOUND — a genuinely new tally, reported
   * as a null result rather than left unstated.
   */
  disruptedDropbacks: number;
  /**
   * ================== THE SEVERITY PARTITION (backlog 67/67-RESULT, ADR-049) ==================
   *
   * `threat_creation_rate` (`pressuredDropbacks / dropbacks`; renamed from `pressure_rate`,
   * backlog entry 93) is `1 − P(every tick CLEAN)`: it counts a dropback once its WORST tick
   * leaves CLEAN and never again, so a lever that moves a tick from COLLAPSING to PRESSURE — a
   * real, football-meaningful de-escalation — is invisible to it. Measured: on the channel that
   * dominates dirty ticks, a demotion off COLLAPSING is invisible to this rate 63.629% of the
   * time; off the band floor, 94.226% (67-RESULT, canonical N, identity falsifier 0 of 257,598).
   *
   * `pocketStatusTicks` is every `POCKET_STATUS.payload.status` published during a pass dropback,
   * tallied by value — CLEAN/PRESSURE/COLLAPSING/IMMEDIATE (`@ff/contracts`' `PocketStatus`
   * union, read as a string key so this file needs no import from it and cannot go stale against
   * a union it never names). It is the STANDING, always-on half of the severity partition: no
   * `Tunables` read, no per-play reconstruction, no falsifier of its own to run — it tallies a
   * field the stream already publishes verbatim, the same field
   * `packages/calibration/src/knownTruth/pocketChannelShares.ts`'s `TickChannels.published` reads.
   * `pocketChannelShares.test.ts` cross-checks the two tallies against each other on the canonical
   * corpus (backlog 67's ruling: derive from the existing fold, do not build a second
   * reconstruction) — this field does not reconstruct anything the other file already reconstructs;
   * it is the raw tally both that file's `ChannelFold.allTicks`/`byStatus[S].allTicks` and this
   * field are ultimately counting off the identical published enum.
   *
   * What `pocketStatusTicks` does NOT do, and does not try to: it does not say WHICH channel
   * (counter / bandFloor / arrival) produced a status — that disambiguation stays in
   * `pocketChannelShares.ts`, Tier 3 and env-gated, because it needs `Tunables` to reconstruct the
   * three channels and pays for an identity check on every tick. This field is cheap specifically
   * because it asks less: "what did the pocket end up at", not "why".
   */
  pocketStatusTicks: Record<string, number>;
  passYards: number;
  /** Yards on every pass ATTEMPT, incompletions as zero. Kept so the mean has a real interval. */
  passAttemptYards: number[];
  airYards: number;
  yardsAfterCatch: number;
  /**
   * When the ball was released, one entry per THROW or per THROWAWAY (backlog entry 94: a
   * throwaway is a release too, just not to a receiver, and the real side's `time_to_throw` join
   * already includes it — see `passAttempts` above). `TICK.payload.tick` is expressed in
   * SECONDS on a 0.5s grid (`TUNABLES.tickStepSeconds`; the design doc's tick labels are 1.0,
   * 1.5, 2.0), so these are directly comparable to NGS time-to-throw with no conversion — and
   * a conversion factor is exactly the sort of constant that would rot silently.
   */
  throwTicks: number[];

  rushAttempts: number;
  rushYards: number;
  designedRushYards: number[];
  yardsBeforeContact: number;

  /** Every scrimmage play's yardage. Tier 2's yards-per-play tail. */
  playYards: number[];

  explosivePasses: number;
  explosiveRushes: number;

  thirdDowns: number;
  thirdDownConversions: number;
  fourthDowns: number;
  fourthDownConversions: number;

  redZoneSnaps: number;
  redZoneTouchdowns: number;

  touchdowns: number;
  turnovers: number;

  /** Interceptions by the cause the stream states. See `INT_SOURCES`. */
  intSources: Record<string, number>;
  tippedBalls: number;
  /**
   * Where a tipped ball ended up. The TIPPED_BALL event names a recoverer but not his side, so
   * the side is read off PLAY_RESULT.turnover — which is also exactly how `reduceStatlines`
   * decides that an offensive tip recovery is a completion. Two consumers, one rule.
   */
  tippedRecoveredByOffense: number;
  tippedRecoveredByDefense: number;

  /** Coverage-shell mix from PLAY_START, a STRUCTURAL description of what was called. */
  coverageShells: Record<string, number>;
  /** Rusher counts from PLAY_START, the other half of the orthogonality check (BACKLOG 8b). */
  rusherCounts: Record<string, number>;

  /**
   * ================== THE ADR-022 / ADR-023 PRESSURE COUNTERS ==================
   *
   * Three facts about a dropback that became sayable only when the corpus could state
   * pressure. All three are read from PLAY_START, which is where ADR-022 put them, and
   * none is re-derived from a resolution — ADR-022 refused a `blitz` flag on PLAY_START
   * precisely because rusher count and `unaccountedRushers` already state it, so these
   * count the fields the ADR ratified rather than inventing a fourth spelling.
   */
  /** Dropbacks the defence rushed five or more men on. */
  blitzDropbacks: number;
  /**
   * Dropbacks where at least one rusher was named by no `ProtectionAssignment` — §7.4
   * step 1's UNACCOUNTED, a fact about the CALL. Distinct from `blitzDropbacks`: a
   * six-man pressure a seven-man protection answers is a blitz and is fully accounted,
   * and a four-man rush against empty can leave a man unaccounted without being one.
   */
  unaccountedRusherDropbacks: number;
  /** Dropbacks on which at least one route actually converted hot (§5.3 recognised). */
  hotConversionDropbacks: number;

  /**
   * ================== ADR-024: THE STARVED BRANCH, PROMOTED TO A STANDING COUNT ==================
   *
   * `RUSH_THREAT.origin` (ADR-022 petition 5), counted once per (play, rusher) rather than once
   * per publication — a threat transitions TRAVELLING → DELAYED → ARRIVED/RESET and publishes at
   * each step, so counting envelopes would count the same free runner three times and make
   * `PICKUP_LOST` look like a rate when it is a population.
   *
   * It is here rather than in `test/sackAttribution.test.ts` because `baseline-0002` recorded
   * **`PICKUP_LOST` = 0 in 496 games** as the headline evidence for ADR-024, and a number that
   * important living only in an env-gated probe is a number nobody notices going wrong again.
   * §7.4 step 3 is the branch it measures; ADR-024 exists because it had never once resolved.
   */
  threatOrigins: Record<string, number>;
  /** Dropbacks on which at least one threat of each origin was published. Rates, not populations. */
  threatOriginDropbacks: Record<string, number>;
}

export interface DriveFold {
  drives: number;
  driveResults: Record<string, number>;
  drivePlays: number;
  driveYards: number;
  drivePoints: number;
  driveElapsedSeconds: number;
  /** Per-drive observations, so plays/drive and points/drive carry real intervals. */
  drivePlaySamples: number[];
  drivePointSamples: number[];
  threeAndOuts: number;
  punts: number;
  fieldGoalAttempts: number;
  fieldGoalsMade: number;
  extraPointAttempts: number;
  extraPointsMade: number;
}

/** One row per team per game. Tier 2's score distribution and Tier 3's records read this. */
export interface TeamGameRow {
  readonly gameId: string;
  /**
   * The seed that produced this game. Reports cite seeds (`calibration.md` §3), and it also
   * makes the merge sort a TOTAL order: two runs of the same fixture share a `gameId` by
   * construction (`deriveGameId` is a function of the schedule coordinates), so without it the
   * sort would be unstable and worker count could reorder rows.
   */
  readonly seed: string;
  readonly team: TeamId;
  readonly opponent: TeamId;
  readonly points: number;
  readonly opponentPoints: number;
  readonly home: boolean;
  /** Possessions this team had, and punts it took. Per-team-game rates read these. */
  readonly drives: number;
  readonly punts: number;
}

export interface PlayerFold {
  /** Statline totals keyed by player id, merged across games. */
  statlines: Record<string, StatLine>;
  /** `pass_rush_tick` reps and wins, keyed by player id. Tier 4's sim-side win rates. */
  rushReps: Record<string, { wins: number; reps: number }>;
  blockReps: Record<string, { wins: number; reps: number }>;
}

export interface SimAccumulator {
  games: number;
  seeds: string[];
  play: PlayFold;
  drive: DriveFold;
  teamGames: TeamGameRow[];
  player: PlayerFold;
}

export function emptyAccumulator(): SimAccumulator {
  return {
    games: 0,
    seeds: [],
    play: {
      plays: 0,
      scrimmagePlays: 0,
      dropbacks: 0,
      passAttempts: 0,
      completions: 0,
      interceptions: 0,
      sacks: 0,
      throwaways: 0,
      throwawaysByCause: {},
      scrambles: 0,
      pressuredDropbacks: 0,
      pressuredSacks: 0,
      disruptedDropbacks: 0,
      pocketStatusTicks: {},
      passYards: 0,
      passAttemptYards: [],
      airYards: 0,
      yardsAfterCatch: 0,
      throwTicks: [],
      rushAttempts: 0,
      rushYards: 0,
      designedRushYards: [],
      yardsBeforeContact: 0,
      playYards: [],
      explosivePasses: 0,
      explosiveRushes: 0,
      thirdDowns: 0,
      thirdDownConversions: 0,
      fourthDowns: 0,
      fourthDownConversions: 0,
      redZoneSnaps: 0,
      redZoneTouchdowns: 0,
      touchdowns: 0,
      turnovers: 0,
      intSources: {},
      tippedBalls: 0,
      tippedRecoveredByOffense: 0,
      tippedRecoveredByDefense: 0,
      coverageShells: {},
      rusherCounts: {},
      blitzDropbacks: 0,
      unaccountedRusherDropbacks: 0,
      hotConversionDropbacks: 0,
      threatOrigins: {},
      threatOriginDropbacks: {},
    },
    drive: {
      drives: 0,
      driveResults: {},
      drivePlays: 0,
      driveYards: 0,
      drivePoints: 0,
      driveElapsedSeconds: 0,
      drivePlaySamples: [],
      drivePointSamples: [],
      threeAndOuts: 0,
      punts: 0,
      fieldGoalAttempts: 0,
      fieldGoalsMade: 0,
      extraPointAttempts: 0,
      extraPointsMade: 0,
    },
    teamGames: [],
    player: { statlines: {}, rushReps: {}, blockReps: {} },
  };
}

/**
 * The interception causes the stream can actually distinguish today. Three of the four
 * `calibration.md` §4 asks for; the fourth is a declared absence (`int_source_unseen_defender`),
 * and this list does NOT contain a residual bucket for exactly that reason.
 */
export const INT_SOURCES = ["TIPPED_RECOVERY", "CONTESTED_CATCH", "DIRECT"] as const;
export type IntSource = (typeof INT_SOURCES)[number];

// --- narrowing helpers ------------------------------------------------------

interface PlayStartSituation {
  readonly down: number;
  readonly distance: number;
  readonly ballOn: number;
}

interface PlayStartShape {
  readonly kind: string;
  readonly offense?: {
    readonly team?: unknown;
    /** ADR-022 petition 2 / §5.3 — routes that broke off hot, and what they were before. */
    readonly hotConversions?: readonly unknown[];
  };
  readonly defense?: {
    readonly coverage?: unknown;
    readonly rush?: readonly unknown[];
    /** §7.4 step 1 — rushers no `ProtectionAssignment` named. */
    readonly unaccountedRushers?: readonly unknown[];
  };
  readonly situation?: PlayStartSituation;
}

/**
 * Five or more rushers. Both sides of `blitz_rate` use this number and nothing else, which is
 * the whole reason it is a named constant here rather than a `>= 5` at two call sites: the sim
 * side counts `PLAY_START.defense.rush` and the real side counts FTN's `n_pass_rushers`, and a
 * metric whose two sides disagree about the threshold is worse than no metric.
 */
export const BLITZ_MIN_RUSHERS = 5;

/**
 * BACKLOG DISPATCH C, disjunct (2) of the exit predicate — DERIVED from `DEFAULT_TUNABLES`, never
 * restated as a literal, for the same reason `RUSHER_WINS_REP_FLOOR` above reads its floor off the
 * table rather than copying a number: a rung added to or removed from `pocket.forcesDecision`
 * moves this set automatically instead of silently going stale beside a hand-written copy.
 * `DEFAULT_TUNABLES` is the permitted surface ADR-012 item 3 names; this reads a value off it, the
 * same way `RUSHER_WINS_REP_FLOOR` and `RUSHER_WON_BANDS` already do — no resolver function
 * (`forcesDecision` itself, `packages/engine/src/resolve/pocket.ts`) is called or imported.
 */
const FORCES_DECISION_STATUSES: ReadonlySet<string> = new Set(DEFAULT_TUNABLES.pocket.forcesDecision);

/**
 * `PLAY_START.payload` is `unknown` in contracts — a deliberately open slot the engine fills
 * with its own shape and does not export. Reading it structurally is the sanctioned route (it is
 * the event stream), and everything read is optional-chained: a payload that changes shape
 * produces missing counts, never a thrown batch.
 */
function asPlayStart(payload: unknown): PlayStartShape | null {
  if (typeof payload !== "object" || payload === null) return null;
  const shape = payload as PlayStartShape;
  return typeof shape.kind === "string" ? shape : null;
}

function bumpKey(record: Record<string, number>, key: string, by = 1): void {
  record[key] = (record[key] ?? 0) + by;
}

// --- per-play working state -------------------------------------------------

interface PlayState {
  isPass: boolean;
  down: number;
  ballOn: number;
  pressured: boolean;
  /** Backlog dispatch C, disjunct (1): a RUSH_THREAT reached `state: "ARRIVED"` this dropback. */
  threatArrived: boolean;
  /** Backlog dispatch C, disjunct (2): a POCKET_STATUS this dropback was in `forcesDecision`. */
  forcedDecision: boolean;
  threw: boolean;
  throwTick: number | null;
  /**
   * Set from the `THROWAWAY` event (ADR-056 Option C; backlog entry 98 switched this fold from
   * `QB_DECISION.payload.choice === "THROWAWAY"`, entry 94/95's original signal, to this event —
   * see `case "THROWAWAY"` below for why the switch is provably a no-op). Fires whether the
   * throwaway was forced by duress (`cause: "POCKET_DURESS"`) or by the clock (`cause:
   * "CLOCK_EXPIRED"`) — this fold does not yet distinguish the two (see that case). Mutually
   * exclusive with `threw`/`scramble`/`intercepted` by construction: a dropback resolves to
   * exactly one terminal act.
   */
  throwaway: boolean;
  /**
   * The tick at which the THROWAWAY event fired, read off the SAME per-tick `tick` local this
   * file already tracks for `throwTick` — `THROWAWAY` carries `tick` on `MatchEventBase` like
   * every other event, but this reads the mirrored local rather than `event.tick` to match the
   * existing convention (`case "THROW"` below does the same).
   */
  throwawayTick: number | null;
  /**
   * `THROWAWAY.payload.cause`, read directly off the event — see `PlayFold.throwawaysByCause`.
   * `null` only before the event has fired; the contract makes `cause` required on the payload,
   * so it is never `null` at the point `flush()` reads it for a play with `throwaway === true`.
   */
  throwawayCause: ThrowawayCause | null;
  caught: boolean;
  intercepted: boolean;
  intSource: IntSource | null;
  tipped: boolean;
  tipRecovered: boolean;
  scramble: boolean;
  designedRun: boolean;
  runYards: number;
  yardsBeforeContact: number;
  yac: number;
  air: number;
  resultYards: number | null;
  resultScore: number;
  turnover: boolean;
  /**
   * Rusher id → the origin the stream FIRST published for him on this play.
   *
   * First-wins rather than last-wins because a threat's origin is a fact about how it was
   * created and does not change; only its `state` does. A stunt swap re-publishes with the
   * looper's origin under a new id, so it is a different key and counts separately, which is
   * correct — that is a second threat, not the same one re-labelled.
   */
  threats: Map<string, string>;
}

function blankPlay(): PlayState {
  return {
    isPass: false,
    down: 0,
    ballOn: 0,
    pressured: false,
    threatArrived: false,
    forcedDecision: false,
    threw: false,
    throwTick: null,
    throwaway: false,
    throwawayTick: null,
    throwawayCause: null,
    caught: false,
    intercepted: false,
    intSource: null,
    tipped: false,
    tipRecovered: false,
    scramble: false,
    designedRun: false,
    runYards: 0,
    yardsBeforeContact: 0,
    yac: 0,
    air: 0,
    resultYards: null,
    resultScore: 0,
    turnover: false,
    threats: new Map<string, string>(),
  };
}

/**
 * Fold one game into the accumulator. Mutates `acc` — it is a private working value owned by one
 * worker and never shared — and returns it for chaining.
 */
export function foldGame(acc: SimAccumulator, game: SimGameObservation): SimAccumulator {
  acc.games++;
  acc.seeds.push(game.seed);

  const p = acc.play;
  const d = acc.drive;

  let current: PlayState | null = null;
  let currentPlayId: string | null = null;
  let tick = 0;
  /** `distance` is only on PLAY_START and `flush` needs it, so it lives beside `current`. */
  let playDistance = 10;
  /** Per-team tallies for this game only, folded into the two `TeamGameRow`s at the end. */
  const drivesByTeam: Record<string, number> = {};
  const puntsByTeam: Record<string, number> = {};

  const flush = (): void => {
    if (current === null) return;
    const play = current;
    p.plays++;
    p.scrimmagePlays++;

    if (play.down === 3) {
      p.thirdDowns++;
      // A conversion is a first down; the stream's PLAY_RESULT yardage against the distance the
      // play started with is the only statement of it available, so it is computed here rather
      // than looked for as a flag the engine does not emit.
      if (play.resultYards !== null && play.resultYards >= playDistance) p.thirdDownConversions++;
    } else if (play.down === 4) {
      p.fourthDowns++;
      if (play.resultYards !== null && play.resultYards >= playDistance) p.fourthDownConversions++;
    }
    if (play.ballOn >= 80) {
      p.redZoneSnaps++;
      if (play.resultScore >= 6) p.redZoneTouchdowns++;
    }
    if (play.resultScore >= 6) p.touchdowns++;
    if (play.turnover) p.turnovers++;
    if (play.resultYards !== null) p.playYards.push(play.resultYards);

    if (play.isPass) {
      p.dropbacks++;
      if (play.pressured) p.pressuredDropbacks++;
      // Backlog dispatch C: whether this dropback ends in a sack is not known until the branch
      // below runs, so the exit tally is finished after it rather than started here.
      let sacked = false;
      const originsSeen = new Set<string>();
      for (const origin of play.threats.values()) {
        bumpKey(p.threatOrigins, origin);
        originsSeen.add(origin);
      }
      for (const origin of originsSeen) bumpKey(p.threatOriginDropbacks, origin);
      // ================== BACKLOG ENTRY 94 (RULING 1): passAttempts NEEDS THROWAWAYS ==================
      // A throwaway is an ATTEMPT (nflverse: pass_attempt=1, sack=0) but is NEVER a completion,
      // carries ZERO yards, and is NEVER explosive — so it must move this DENOMINATOR without
      // touching any of the four numerators nested inside `if (play.caught)` below. `play.threw`
      // and `play.throwaway` are mutually exclusive (exactly one QB_DECISION terminal choice per
      // dropback), so this cannot double-count a play `p.throwaways` below also counts.
      if (play.threw || play.throwaway) {
        p.passAttempts++;
        // time_to_throw NEEDS a release tick, not a target: a throwaway IS a release (the QB let
        // go of the ball), just not to a receiver, and the real side's `time_to_throw` join
        // (`isPassAttempt`, tier1.ts) already includes it — this was entry 94 finding 3's false
        // "excluded from both sides" claim, and the fix is to make the sim side true of it rather
        // than leave the doc string true of neither side.
        const releaseTick = play.threw ? play.throwTick : play.throwawayTick;
        if (releaseTick !== null) p.throwTicks.push(releaseTick);
        p.airYards += play.air;
        if (play.caught) {
          p.completions++;
          p.passYards += play.resultYards ?? 0;
          p.passAttemptYards.push(play.resultYards ?? 0);
          p.yardsAfterCatch += play.yac;
          if ((play.resultYards ?? 0) >= 20) p.explosivePasses++;
        } else {
          // Covers both a genuine incompletion and a throwaway — both are zero yards, neither is
          // explosive, and `play.resultYards` is already 0 for a throwaway (the engine's
          // `outcome.yards` for both throwaway paths is hardcoded 0, `passPlay.ts`), so pushing
          // the literal rather than `play.resultYards ?? 0` changes nothing observable and keeps
          // the incompletion case exactly as it read before this dispatch.
          p.passAttemptYards.push(0);
        }
      }
      if (play.intercepted) {
        p.interceptions++;
        bumpKey(p.intSources, play.intSource ?? "DIRECT");
      }
      if (play.scramble) p.scrambles++;
      else if (play.throwaway) {
        // Already counted in `passAttempts` above; this is the separate diagnostic population
        // `pocketLadder.ts`'s `throwaway_rate` reads (denominator `dropbacks`, not `passAttempts`).
        p.throwaways++;
        // The partition (see `PlayFold.throwawaysByCause`). `?? "UNKNOWN_CAUSE"` is unreachable
        // given the contract's required `cause` field and the invariant that both fields are set
        // together in `case "THROWAWAY"` below — kept for type safety only, same convention as
        // `play.intSource ?? "DIRECT"` above.
        bumpKey(p.throwawaysByCause, play.throwawayCause ?? "UNKNOWN_CAUSE");
      } else if (!play.threw && !play.intercepted) {
        // No throw, no scramble, no throwaway: a sack. Entry 94 removed the old inference by
        // yardage sign (`(play.resultYards ?? 0) < 0`) in favour of this directly-observed
        // dichotomy — `play.throwaway` is now a real flag fed by a published event (`QB_DECISION`
        // originally, the `THROWAWAY` event as of entry 98), not a side effect of a throwaway
        // happening to carry non-negative yards. Same population, sturdier signal.
        p.sacks++;
        // backlog 87: the SAME `pressured` flag `pressuredDropbacks` already set above for
        // this dropback, read again rather than re-derived, so the two can never disagree.
        if (play.pressured) p.pressuredSacks++;
        sacked = true;
      }
      // Backlog dispatch C: the exit predicate — see PlayFold.disruptedDropbacks for the full
      // derivation and the subset-relation argument. Evaluated once, after every disjunct is
      // known: arrival and forcesDecision are set as the stream is read; sacked is set just above.
      if (play.threatArrived || play.forcedDecision || sacked) p.disruptedDropbacks++;
    } else if (play.designedRun) {
      p.rushAttempts++;
      p.rushYards += play.runYards;
      p.designedRushYards.push(play.runYards);
      p.yardsBeforeContact += play.yardsBeforeContact;
      if (play.runYards >= 10) p.explosiveRushes++;
    }
    current = null;
  };

  for (const envelope of game.events) {
    const event = envelope.event;
    const playId = event.playId === undefined ? null : String(event.playId);
    if (playId !== null && playId !== currentPlayId) {
      flush();
      currentPlayId = playId;
    }

    switch (event.type) {
      case "PLAY_START": {
        const start = asPlayStart(event.payload);
        current = blankPlay();
        tick = 0;
        if (start !== null) {
          current.isPass = start.kind === "PASS_PLAY_V1";
          current.designedRun = start.kind === "RUN_PLAY_V1";
          const situation = start.situation;
          if (situation !== undefined) {
            current.down = situation.down;
            current.ballOn = situation.ballOn;
            playDistance = situation.distance;
          }
          const coverage = start.defense?.coverage;
          if (typeof coverage === "string") bumpKey(p.coverageShells, coverage);
          const rush = start.defense?.rush;
          if (Array.isArray(rush)) bumpKey(p.rusherCounts, String(rush.length));
          // Dropbacks only. `blitz_rate` and `hot_route_rate` are per-dropback rates and a run
          // play carries a `rush` list too, so counting every PLAY_START would put the run mix
          // in the denominator of a passing-game metric.
          if (current.isPass) {
            if (Array.isArray(rush) && rush.length >= BLITZ_MIN_RUSHERS) p.blitzDropbacks++;
            const unaccounted = start.defense?.unaccountedRushers;
            if (Array.isArray(unaccounted) && unaccounted.length > 0) p.unaccountedRusherDropbacks++;
            const hot = start.offense?.hotConversions;
            if (Array.isArray(hot) && hot.length > 0) p.hotConversionDropbacks++;
          }
        }
        break;
      }
      case "TICK":
        tick = event.payload.tick;
        break;
      case "POCKET_STATUS":
        if (current !== null && current.isPass) {
          if (event.payload.status !== "CLEAN") current.pressured = true;
          // Backlog dispatch C, disjunct (2): DERIVED off DEFAULT_TUNABLES.pocket.forcesDecision
          // (FORCES_DECISION_STATUSES above), not restated.
          if (FORCES_DECISION_STATUSES.has(event.payload.status)) current.forcedDecision = true;
          // Tallied per TICK, immediately, not deferred to `flush()`: unlike `pressured` (a
          // per-DROPBACK worst-status flag), the severity partition is a per-TICK count and needs
          // no play-level reduction — see the `pocketStatusTicks` field comment.
          bumpKey(p.pocketStatusTicks, event.payload.status);
        }
        break;
      case "RUSH_THREAT":
        if (current !== null) {
          const key = String(event.payload.rusher);
          if (!current.threats.has(key)) current.threats.set(key, event.payload.origin);
          // Backlog dispatch C, disjunct (1). Not gated on `current.isPass`, matching `threats`
          // above: a run play's RUSH_THREAT (if any) is harmless to record since `flush()` only
          // reads `threatArrived` inside the `isPass` branch.
          if (event.payload.state === "ARRIVED") current.threatArrived = true;
        }
        break;
      case "THROW":
        if (current !== null) {
          current.threw = true;
          current.throwTick = tick;
          // Entry 94's historical note: `throwType` here is drawn from `selectThrowType`
          // (`throwExecution.ts`), which only ever returns `BULLET`/`TOUCH` (`BACK_SHOULDER` is
          // wired and dormant per `tunables.ts:78`) — a `THROW` event's `throwType` was never
          // actually `"THROWAWAY"` even before ADR-056 removed that union member entirely. A
          // throwaway never reaches this case; it reaches `case "THROWAWAY"` below instead.
        }
        break;
      case "THROWAWAY":
        // ADR-056 Option C / backlog entry 98: THE ACT, read directly, rather than inferred from
        // `QB_DECISION{choice:"THROWAWAY"}` (entry 94/95's original signal — now the DECISION,
        // kept live on the stream but no longer this fold's source). Both engine emit sites
        // (`passPlay.ts:1081`/`:1085` and `:1104`/`:1107`) log `qbDecision("THROWAWAY")`
        // immediately followed by `log.throwaway(...)` on the next line, unconditionally, at the
        // same tick — so the two signals fire on exactly the same plays BY CONSTRUCTION, and the
        // switch is a pure signal-source change: pre-registered and measured to move no number
        // (see the dispatch report; canonical-arm figures bit-identical before/after). Read the
        // mirrored `tick` local (not `event.tick`) to match the `THROW` case's own convention.
        if (current !== null) {
          current.throwaway = true;
          current.throwawayTick = tick;
          // Read directly off the event, per ADR-056's amendment — see PlayFold.throwawaysByCause.
          current.throwawayCause = event.payload.cause;
        }
        break;
      case "CATCH_RESOLUTION":
        if (current !== null && event.payload.caught) current.caught = true;
        break;
      case "TIPPED_BALL":
        p.tippedBalls++;
        if (current !== null) {
          current.tipped = true;
          current.tipRecovered = event.payload.recoveredBy !== undefined;
        }
        break;
      case "YAC_ZONE":
        if (current !== null) current.yac += event.payload.yardsInZone;
        break;
      case "RUSH_ZONE":
        if (current !== null) current.runYards += event.payload.yardsInZone;
        break;
      case "RUN_RESOLUTION":
        if (current !== null) {
          current.runYards = event.payload.yards;
          current.yardsBeforeContact = event.payload.yardsBeforeContact;
          if (event.payload.carryType === "SCRAMBLE") {
            current.scramble = true;
            current.designedRun = false;
          }
        }
        break;
      case "CHECK":
        if (event.payload.checkKind === "pass_rush_tick") {
          recordRushRep(acc.player, event.payload.actors, event.payload.band, event.payload.margin);
        }
        break;
      case "PLAY_RESULT":
        if (current !== null) {
          current.resultYards = event.payload.yards;
          current.resultScore = event.payload.score ?? 0;
          current.turnover = event.payload.turnover;
          if (event.payload.turnover && current.isPass && !current.caught) {
            current.intercepted = true;
            current.intSource = current.tipped
              ? "TIPPED_RECOVERY"
              : current.threw
                ? "CONTESTED_CATCH"
                : "DIRECT";
          }
          if (current.tipRecovered) {
            if (event.payload.turnover) p.tippedRecoveredByDefense++;
            else {
              p.tippedRecoveredByOffense++;
              // Real scoring, and `reduceStatlines`' rule: a tipped ball the offence came up
              // with is a completion. Aligning here is not cosmetic — the two would otherwise
              // disagree about completion percentage, and the disagreement would be invisible.
              current.caught = true;
            }
          }
        }
        break;
      case "DRIVE_END": {
        d.drives++;
        bumpKey(d.driveResults, event.payload.result);
        d.drivePlays += event.payload.plays;
        d.driveYards += event.payload.yards;
        d.drivePoints += event.payload.points;
        d.driveElapsedSeconds += event.payload.elapsedSeconds;
        d.drivePlaySamples.push(event.payload.plays);
        d.drivePointSamples.push(event.payload.points);
        bumpKey(drivesByTeam, String(event.payload.offense));
        // Three-and-out: three plays, then a punt or a turnover on downs.
        if (
          event.payload.plays <= 3 &&
          (event.payload.result === "PUNT" || event.payload.result === "TURNOVER_ON_DOWNS")
        ) {
          d.threeAndOuts++;
        }
        break;
      }
      case "PUNT":
        d.punts++;
        bumpKey(puntsByTeam, String(event.payload.team));
        break;
      case "PLACEKICK":
        if (event.payload.kind === "FIELD_GOAL") {
          d.fieldGoalAttempts++;
          if (event.payload.made) d.fieldGoalsMade++;
        } else {
          d.extraPointAttempts++;
          if (event.payload.made) d.extraPointsMade++;
        }
        break;
      default:
        break;
    }
  }
  flush();

  // Team-game rows, from the summary (which is itself derived from the stream).
  const summary = game.summary;
  acc.teamGames.push(
    {
      gameId: String(summary.gameId),
      seed: game.seed,
      team: summary.home,
      opponent: summary.away,
      points: summary.score.home,
      opponentPoints: summary.score.away,
      home: true,
      drives: drivesByTeam[String(summary.home)] ?? 0,
      punts: puntsByTeam[String(summary.home)] ?? 0,
    },
    {
      gameId: String(summary.gameId),
      seed: game.seed,
      team: summary.away,
      opponent: summary.home,
      points: summary.score.away,
      opponentPoints: summary.score.home,
      home: false,
      drives: drivesByTeam[String(summary.away)] ?? 0,
      punts: puntsByTeam[String(summary.away)] ?? 0,
    },
  );

  for (const line of game.statlines) {
    const key = String(line.player);
    const existing = acc.player.statlines[key];
    acc.player.statlines[key] = existing === undefined ? line : mergeStatline(existing, line);
  }

  return acc;
}

/**
 * ⛔ **"DID THE RUSHER WIN THE REP" HAS ONE ANSWER AND IT IS §7.1's BAND TABLE** — owner ruling,
 * ADR-051. Both arms below read `passRush.bands` and nothing else.
 *
 * WHAT WAS HERE, AND IT WAS A LIVE DEFECT. The fallback arm read three tier identities —
 * `CRITICAL_SUCCESS || STRONG_SUCCESS || SUCCESS` — which is `margin ≥ 5`, while the band arm is
 * `RUSHER_WINS_REP` at `margin ≥ 15`. **The two arms disagreed by ten points of margin**, and the
 * tier arm counted `BLOCKER_BEATEN` as a rusher win — the exact interval ADR-033 split out on the
 * owner's ruling that *gaining ground is not pressure*. It was introduced with the fold and stood
 * until ADR-051.
 *
 * WHY THE IDENTITIES ARE REMOVED RATHER THAN CORRECTED. Three equality comparisons against tier
 * NAMES are a restated constant: `ResultTier` is a closed union that grows, and ADR-051's own
 * consumer audit found that a rung added ABOVE `CRITICAL_SUCCESS` would make this line record the
 * largest-margin win in the game as a LOSS — and credit the blocker with the corresponding win.
 * The compiler cannot see that, because the comparison is against a string. Reading the floor
 * removes the failure mode rather than deferring it.
 *
 * `actors` is `[rusher, blocker]` by the engine's own ordering convention on this check.
 */
const RUSHER_WINS_REP_FLOOR: number = ((): number => {
  const row = DEFAULT_TUNABLES.passRush.bands.find((b) => b.label === "RUSHER_WINS_REP");
  if (row === undefined) throw new Error("collect: passRush.bands has no RUSHER_WINS_REP row");
  return row.minMargin;
})();

/** The band labels at or above that floor — DERIVED from the table, never listed. */
const RUSHER_WON_BANDS: ReadonlySet<string> = new Set(
  DEFAULT_TUNABLES.passRush.bands.filter((b) => b.minMargin >= RUSHER_WINS_REP_FLOOR).map((b) => b.label),
);

function recordRushRep(
  fold: PlayerFold,
  actors: readonly PlayerId[],
  band: string | undefined,
  margin: number,
): void {
  const rusher = actors[0];
  const blocker = actors[1];
  if (rusher === undefined) return;
  // ADR-011: prefer the PUBLISHED band. `band` is optional on the payload, so the fallback reads
  // the same table's floor off the same margin — one source, two paths to it.
  const rusherWon = band === undefined ? margin >= RUSHER_WINS_REP_FLOOR : RUSHER_WON_BANDS.has(band);
  const rusherKey = String(rusher);
  const r = fold.rushReps[rusherKey] ?? { wins: 0, reps: 0 };
  r.reps++;
  if (rusherWon) r.wins++;
  fold.rushReps[rusherKey] = r;
  if (blocker !== undefined) {
    const blockerKey = String(blocker);
    const b = fold.blockReps[blockerKey] ?? { wins: 0, reps: 0 };
    b.reps++;
    if (!rusherWon) b.wins++;
    fold.blockReps[blockerKey] = b;
  }
}

function mergeStatline(a: StatLine, b: StatLine): StatLine {
  return {
    player: a.player,
    team: a.team,
    passing: {
      attempts: a.passing.attempts + b.passing.attempts,
      completions: a.passing.completions + b.passing.completions,
      yards: a.passing.yards + b.passing.yards,
      touchdowns: a.passing.touchdowns + b.passing.touchdowns,
      interceptions: a.passing.interceptions + b.passing.interceptions,
      sacked: a.passing.sacked + b.passing.sacked,
      sackYards: a.passing.sackYards + b.passing.sackYards,
    },
    rushing: {
      attempts: a.rushing.attempts + b.rushing.attempts,
      yards: a.rushing.yards + b.rushing.yards,
      touchdowns: a.rushing.touchdowns + b.rushing.touchdowns,
      longest: Math.max(a.rushing.longest, b.rushing.longest),
    },
    receiving: {
      targets: a.receiving.targets + b.receiving.targets,
      receptions: a.receiving.receptions + b.receiving.receptions,
      yards: a.receiving.yards + b.receiving.yards,
      touchdowns: a.receiving.touchdowns + b.receiving.touchdowns,
      drops: a.receiving.drops + b.receiving.drops,
    },
    defense: {
      tackles: a.defense.tackles + b.defense.tackles,
      sacks: a.defense.sacks + b.defense.sacks,
      interceptions: a.defense.interceptions + b.defense.interceptions,
      passesDefensed: a.defense.passesDefensed + b.defense.passesDefensed,
      tacklesForLoss: a.defense.tacklesForLoss + b.defense.tacklesForLoss,
    },
    kicking: {
      fieldGoalAttempts: a.kicking.fieldGoalAttempts + b.kicking.fieldGoalAttempts,
      fieldGoalsMade: a.kicking.fieldGoalsMade + b.kicking.fieldGoalsMade,
      extraPointAttempts: a.kicking.extraPointAttempts + b.kicking.extraPointAttempts,
      extraPointsMade: a.kicking.extraPointsMade + b.kicking.extraPointsMade,
      punts: a.kicking.punts + b.kicking.punts,
      puntGrossYards: a.kicking.puntGrossYards + b.kicking.puntGrossYards,
    },
    returns: {
      kickReturns: a.returns.kickReturns + b.returns.kickReturns,
      kickReturnYards: a.returns.kickReturnYards + b.returns.kickReturnYards,
      puntReturns: a.returns.puntReturns + b.returns.puntReturns,
      puntReturnYards: a.returns.puntReturnYards + b.returns.puntReturnYards,
    },
  };
}

/**
 * KEY ORDER IS PART OF THE VALUE, and this is why every record merge sorts.
 *
 * `JSON.stringify` preserves insertion order, and a report or a save file is compared and
 * diffed as text. Merging `{a}` into `{b}` and `{b}` into `{a}` produces objects that are equal
 * key-for-key and serialise differently — so without sorting, "worker count cannot change a
 * batch's numbers" would be true and "worker count cannot change a batch's OUTPUT" would be
 * false, which is not a distinction anybody wants to discover from a diff.
 */
function sortedRecord<T>(entries: Iterable<readonly [string, T]>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of [...entries].sort((x, y) => x[0].localeCompare(y[0]))) out[k] = v;
  return out;
}

function mergeCounters(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const totals = new Map<string, number>();
  for (const [k, v] of Object.entries(a)) totals.set(k, (totals.get(k) ?? 0) + v);
  for (const [k, v] of Object.entries(b)) totals.set(k, (totals.get(k) ?? 0) + v);
  return sortedRecord(totals);
}

function mergeReps(
  a: Record<string, { wins: number; reps: number }>,
  b: Record<string, { wins: number; reps: number }>,
): Record<string, { wins: number; reps: number }> {
  const merged = new Map<string, { wins: number; reps: number }>();
  for (const [k, v] of Object.entries(a)) merged.set(k, { wins: v.wins, reps: v.reps });
  for (const [k, v] of Object.entries(b)) {
    const existing = merged.get(k);
    merged.set(
      k,
      existing === undefined
        ? { wins: v.wins, reps: v.reps }
        : { wins: existing.wins + v.wins, reps: existing.reps + v.reps },
    );
  }
  return sortedRecord(merged);
}

/**
 * Associative and commutative merge. Worker count must not change a batch's numbers, and the
 * only way to guarantee that is for the merge to be order-independent — which is why the sample
 * vectors are SORTED after concatenation rather than left in arrival order.
 */
export function mergeAccumulators(a: SimAccumulator, b: SimAccumulator): SimAccumulator {
  const play: PlayFold = {
    plays: a.play.plays + b.play.plays,
    scrimmagePlays: a.play.scrimmagePlays + b.play.scrimmagePlays,
    dropbacks: a.play.dropbacks + b.play.dropbacks,
    passAttempts: a.play.passAttempts + b.play.passAttempts,
    completions: a.play.completions + b.play.completions,
    interceptions: a.play.interceptions + b.play.interceptions,
    sacks: a.play.sacks + b.play.sacks,
    throwaways: a.play.throwaways + b.play.throwaways,
    throwawaysByCause: mergeCounters(a.play.throwawaysByCause, b.play.throwawaysByCause),
    scrambles: a.play.scrambles + b.play.scrambles,
    pressuredDropbacks: a.play.pressuredDropbacks + b.play.pressuredDropbacks,
    pressuredSacks: a.play.pressuredSacks + b.play.pressuredSacks,
    disruptedDropbacks: a.play.disruptedDropbacks + b.play.disruptedDropbacks,
    pocketStatusTicks: mergeCounters(a.play.pocketStatusTicks, b.play.pocketStatusTicks),
    passYards: a.play.passYards + b.play.passYards,
    passAttemptYards: [...a.play.passAttemptYards, ...b.play.passAttemptYards].sort((x, y) => x - y),
    airYards: a.play.airYards + b.play.airYards,
    yardsAfterCatch: a.play.yardsAfterCatch + b.play.yardsAfterCatch,
    throwTicks: [...a.play.throwTicks, ...b.play.throwTicks].sort((x, y) => x - y),
    rushAttempts: a.play.rushAttempts + b.play.rushAttempts,
    rushYards: a.play.rushYards + b.play.rushYards,
    designedRushYards: [...a.play.designedRushYards, ...b.play.designedRushYards].sort((x, y) => x - y),
    yardsBeforeContact: a.play.yardsBeforeContact + b.play.yardsBeforeContact,
    playYards: [...a.play.playYards, ...b.play.playYards].sort((x, y) => x - y),
    explosivePasses: a.play.explosivePasses + b.play.explosivePasses,
    explosiveRushes: a.play.explosiveRushes + b.play.explosiveRushes,
    thirdDowns: a.play.thirdDowns + b.play.thirdDowns,
    thirdDownConversions: a.play.thirdDownConversions + b.play.thirdDownConversions,
    fourthDowns: a.play.fourthDowns + b.play.fourthDowns,
    fourthDownConversions: a.play.fourthDownConversions + b.play.fourthDownConversions,
    redZoneSnaps: a.play.redZoneSnaps + b.play.redZoneSnaps,
    redZoneTouchdowns: a.play.redZoneTouchdowns + b.play.redZoneTouchdowns,
    touchdowns: a.play.touchdowns + b.play.touchdowns,
    turnovers: a.play.turnovers + b.play.turnovers,
    intSources: mergeCounters(a.play.intSources, b.play.intSources),
    tippedBalls: a.play.tippedBalls + b.play.tippedBalls,
    tippedRecoveredByOffense: a.play.tippedRecoveredByOffense + b.play.tippedRecoveredByOffense,
    tippedRecoveredByDefense: a.play.tippedRecoveredByDefense + b.play.tippedRecoveredByDefense,
    coverageShells: mergeCounters(a.play.coverageShells, b.play.coverageShells),
    rusherCounts: mergeCounters(a.play.rusherCounts, b.play.rusherCounts),
    blitzDropbacks: a.play.blitzDropbacks + b.play.blitzDropbacks,
    unaccountedRusherDropbacks: a.play.unaccountedRusherDropbacks + b.play.unaccountedRusherDropbacks,
    hotConversionDropbacks: a.play.hotConversionDropbacks + b.play.hotConversionDropbacks,
    threatOrigins: mergeCounters(a.play.threatOrigins, b.play.threatOrigins),
    threatOriginDropbacks: mergeCounters(a.play.threatOriginDropbacks, b.play.threatOriginDropbacks),
  };

  const drive: DriveFold = {
    drives: a.drive.drives + b.drive.drives,
    driveResults: mergeCounters(a.drive.driveResults, b.drive.driveResults),
    drivePlays: a.drive.drivePlays + b.drive.drivePlays,
    driveYards: a.drive.driveYards + b.drive.driveYards,
    drivePoints: a.drive.drivePoints + b.drive.drivePoints,
    driveElapsedSeconds: a.drive.driveElapsedSeconds + b.drive.driveElapsedSeconds,
    drivePlaySamples: [...a.drive.drivePlaySamples, ...b.drive.drivePlaySamples].sort((x, y) => x - y),
    drivePointSamples: [...a.drive.drivePointSamples, ...b.drive.drivePointSamples].sort((x, y) => x - y),
    threeAndOuts: a.drive.threeAndOuts + b.drive.threeAndOuts,
    punts: a.drive.punts + b.drive.punts,
    fieldGoalAttempts: a.drive.fieldGoalAttempts + b.drive.fieldGoalAttempts,
    fieldGoalsMade: a.drive.fieldGoalsMade + b.drive.fieldGoalsMade,
    extraPointAttempts: a.drive.extraPointAttempts + b.drive.extraPointAttempts,
    extraPointsMade: a.drive.extraPointsMade + b.drive.extraPointsMade,
  };

  const statlineMap = new Map<string, StatLine>(Object.entries(a.player.statlines));
  for (const [k, v] of Object.entries(b.player.statlines)) {
    const existing = statlineMap.get(k);
    statlineMap.set(k, existing === undefined ? v : mergeStatline(existing, v));
  }
  const statlines = sortedRecord(statlineMap);

  return {
    games: a.games + b.games,
    seeds: [...a.seeds, ...b.seeds].sort(),
    play,
    drive,
    teamGames: [...a.teamGames, ...b.teamGames].sort(
      (x, y) =>
        x.gameId.localeCompare(y.gameId) ||
        x.seed.localeCompare(y.seed) ||
        String(x.team).localeCompare(String(y.team)),
    ),
    player: {
      statlines,
      rushReps: mergeReps(a.player.rushReps, b.player.rushReps),
      blockReps: mergeReps(a.player.blockReps, b.player.blockReps),
    },
  };
}

export function collectGames(games: readonly SimGameObservation[]): SimAccumulator {
  let acc = emptyAccumulator();
  for (const game of games) acc = foldGame(acc, game);
  // The single-worker path must produce exactly what the merged multi-worker path produces.
  return mergeAccumulators(emptyAccumulator(), acc);
}
