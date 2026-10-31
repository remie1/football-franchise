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
import { isDeepStrictEqual } from "node:util";
import type { MatchEventEnvelope, PlayerId, ShownRusher, TeamId, ThrowawayCause } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import type { GameSummary, StatLine, Tunables } from "@ff/engine";
import { COVERAGE_MASKS, FRONT_LOOKS, shownRushDiffers } from "@ff/playbook";
import { approachesOfPlay, LOOPER_FREE_BAND, PICKUP_FREE_BAND } from "../pocket/approach.js";
import { centerOfPlayStart, clockKeyOf, onClockUnder, touchOfCheck, type ClockKey, type Touch } from "../pocket/freeRunKey.js";

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
   *       `FoldTables.forcesDecision` below) — set by `forcedDecision`;
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
  /** Dropbacks on which at least one route actually converted hot (the pressure read's picture answered somebody, ADR-073 §2.3). */
  hotConversionDropbacks: number;

  /**
   * ================== ADR-069: DISGUISED DROPBACKS (THE COVERAGE LOOKS) ==================
   *
   * Dropbacks whose `PLAY_START.defense.shownAssignments` differs from `assignments` — the
   * offence was shown a coverage other than the one played. DIFFED, NOT READ OFF THE NAME:
   * ADR-067 §B refused a `wasDisguised` flag because a declaration can be wrong silently, so
   * the call's LOOK tags are not the signal here. Its coverage LOOK tags are the KEY of the split
   * below, and `shownAssignmentsStream` checks them against this diff play by play. A front look
   * (ADR-073 step 3.5) moves no coverage duty, so it is not counted here: it is
   * `frontLookDropbacks`' diff, on the shown rush.
   */
  disguisedDropbacks: number;
  /**
   * `disguisedDropbacks` by the coverage look the call named — its LOOK tags' ids that are
   * coverage looks (`@ff/playbook`'s `COVERAGE_MASKS`), joined with `+` when it wears more than one
   * (ADR-071): `SHOW_2`, `SHOW_2+PRESS`. A front LOOK tag (`MUG`, `STEM`) never joins the key, so a
   * call wearing Show 2 and a Mug is `SHOW_2` (ADR-073 §3.5). `UNNAMED` would be a divergence no
   * coverage look named.
   */
  disguisedDropbacksByMask: Record<string, number>;

  /**
   * ================== ADR-073 STEP 3.5: FRONT-LOOK DROPBACKS ==================
   *
   * Dropbacks whose `PLAY_START.defense.shownRush` differs from `defense.rush` — the line was shown
   * a rush other than the one that came: a front look, the Mug or the Stem (caller v7).
   * `front_look_rate`'s numerator. DIFFED, NOT READ OFF THE NAME, as `disguisedDropbacks` is: entry
   * by entry with playbook's `shownRushDiffers`, the comparison R28 uses, on PLAY_START's resolved
   * lists — rusher, side, alignment and gap, `move` never read, and a side or gap stated on one list
   * and omitted on the other no difference.
   *
   * It counts the look WORN, not the look that ACTED: a gap-only difference, and a Stem of linemen
   * the protection names, make nobody moved and show no ghost (ADR-073 §2.2), and both are counted
   * here.
   */
  frontLookDropbacks: number;
  /**
   * `frontLookDropbacks` by the front look the call named — its front LOOK tags' ids (`@ff/playbook`'s
   * `FRONT_LOOKS`: `MUG`, `STEM`), joined with `+` if a call ever named two (R28 refuses that).
   * `front_look_mix`. `UNNAMED` would be a shown rush that differs with no front look named.
   */
  frontLookDropbacksByLook: Record<string, number>;

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

  /**
   * ADR-089 step 0's registry rows (plan §5): the pocket fix's instruments, every one a pure fold
   * of the events. Kept in one nested field so that no existing field above moves; see
   * `PocketFold` below for each tally's construct.
   */
  pocket: PocketFold;
}

// --- ADR-089 step 0: the pocket rows' fold ------------------------------------

/** One release bin of `pressured_share_by_release_bin` and `hit_rate_by_release_bin`. */
export interface ReleaseBinFold {
  /** Pass attempts (throws and throwaways) released in the bin. */
  attempts: number;
  /** Those whose dropback's worst POCKET_STATUS was not CLEAN. */
  pressuredAttempts: number;
  /** Aimed throws (a THROW event; throwaways excluded) released in the bin. */
  aimed: number;
  /** Aimed throws on a dropback where a threat reached ARRIVED with the ball still in his hand. */
  aimedHits: number;
  /** Pass attempts on dropbacks with no free runner (no threat of an origin other than WON_REP). */
  attemptsNoFreeRunner: number;
  pressuredNoFreeRunner: number;
}

/** One down group of `by_down_fixed_calls`: dropbacks at 7-10 to go, goal-to-go excluded. */
export interface DownFold {
  dropbacks: number;
  pressured: number;
  pressuredSacks: number;
  pressuredThrowaways: number;
}

/** One quarterback's or one defence's tallies, for the season spreads. */
export interface UnitFold {
  dropbacks: number;
  pressured: number;
  pressuredSacks: number;
  /** Pass attempts with a release time, and the sum and sum of squares of those times. */
  attempts: number;
  releaseTotal: number;
  releaseSquares: number;
}

/** One situation window of `situation_end_of_half` and `situation_q1q3_last_two`. */
export interface SituationFold {
  scrimmagePlays: number;
  dropbacks: number;
  pressured: number;
  pressuredSacks: number;
  pressuredThrowaways: number;
  cleanThrowaways: number;
  attempts: number;
  releaseTotal: number;
  releaseSquares: number;
}

export interface StatusCompletionFold {
  attempts: number;
  completions: number;
}

/**
 * The situation clock's check (plan §5). The rebuilt clock is `PERIOD_START.clockSeconds` less
 * each `PLAY_RESULT.clockRunoff` in the period. It can only run AHEAD of the game's clock (the
 * huddle and the kicks burn time no `PLAY_RESULT` states), so the check is that no published clock
 * (`DRIVE_START.clockSeconds`, `PLAY_START.situation.clockSeconds`) is above it, and how often the
 * two are equal is counted.
 */
export interface ClockCheckFold {
  driveStarts: number;
  driveStartsEqualRebuilt: number;
  driveStartsAboveRebuilt: number;
  snaps: number;
  snapsEqualRebuilt: number;
  snapsAboveRebuilt: number;
  /** Snaps whose PLAY_START carried no `situation.clockSeconds`; their window reads the rebuilt clock. */
  snapsWithoutPublishedClock: number;
}

/** One release bin of the miss rule's split read with the arm's own free-run reading (ADR-089 step 3, AM-2). */
export interface ClockKeyBinFold {
  /** Pass attempts released in the bin on dropbacks with no man on the free-run clock under the arm's reading. */
  attemptsNoClockRunner: number;
  pressuredNoClockRunner: number;
}

/**
 * ADR-089 step 3, AM-2's `freeRunKey` (plan §2.7): the miss rule's split (n, f, the quick split, the
 * quick share's origin) with "free runner" read as a man on the free-run clock under the arm's own
 * reading (`pocket/freeRunKey.ts`: D19 on the design and on an arm with no free-run block; every
 * free runner under reading C; UNBLOCKED and a looper with no blocker under reading A). The
 * origin-keyed figures beside it are `PocketFold`'s own (`attemptsNoFreeRunner`,
 * `noFreeRunnerPressured`, `quickFirstPressureByOrigin`), unchanged. Read off the tunables the fold
 * is handed, which are the arm's own.
 */
export interface ClockKeyFold {
  /** Keyed by `RELEASE_BINS`' labels, beside `PocketFold.releaseBins` (whose attempts and pressured attempts it reads). */
  releaseBins: Record<string, ClockKeyBinFold>;
  /** Pressured dropbacks with no man on the clock, and those whose first pressure came before 2.5 s. */
  noClockRunnerPressured: number;
  noClockRunnerQuick: number;
  /**
   * Each first non-CLEAN tick, split evenly among its causes as `firstPressureOrigin` is, keyed
   * `CLOCK_RUNNER` (a threat on the clock under the arm's reading), `FREE_RUNNER` (any other threat
   * whose origin is not WON_REP), `WON_REP` and `COUNTER` (the band floor and the counter).
   */
  firstPressureByClock: Record<string, number>;
  quickFirstPressureByClock: Record<string, number>;
  /** (play, man) pairs on the clock under the arm's reading, and dropbacks with at least one. */
  clockMen: number;
  clockRunnerDropbacks: number;
}

export interface PocketFold {
  /**
   * `hit_or_sack_rate`'s numerator (ADR-089 §4.5, `ADR:692`): a sack, or a hit on a play that ends
   * in a pass attempt (throwaways included). Under legacy there is no `QB_HIT` event; a threat
   * published ARRIVED with the ball still in his hand stands in for it (plan §5).
   */
  hitOrSackDropbacks: number;
  /** The hit half alone: ARRIVED with the ball in his hand, on a play that ends in a pass attempt. */
  hitOnAttemptDropbacks: number;
  /** The same contact on a play that ends in a scramble: reported, never counted (`qb_hit_on_scramble`). */
  hitOnScrambleDropbacks: number;
  /**
   * Release on the named clock, one entry per pass attempt: `THROW.releaseSeconds` when the stream
   * carries it (P8, step 4), else the release tick (`throwTicks`' value, the decision tick).
   */
  releaseSeconds: number[];
  /** Keyed by `RELEASE_BINS`' labels. */
  releaseBins: Record<string, ReleaseBinFold>;
  /** The tick of each dropback's first PRESSURE-or-worse POCKET_STATUS (the clock named against NGS's 2.9 s). */
  firstPressureSeconds: number[];
  /** The tick of the first COLLAPSING or IMMEDIATE status (deviation O13: `forcesDecision`). */
  firstForcingSeconds: number[];
  /** The tick of the first threat published ARRIVED. */
  firstArrivalSeconds: number[];
  /** Each first non-CLEAN tick, split evenly among its causes, by `PRESSURE_ORIGINS`. */
  firstPressureOrigin: Record<string, number>;
  /** The same split by cause: the arriving threat's `ThreatOrigin`, else `BAND`, else `COUNTER`. */
  firstPressureCause: Record<string, number>;
  /** First pressures before 2.5 s, split the same way by origin. */
  quickFirstPressureByOrigin: Record<string, number>;
  quickFirstPressures: number;
  /** CLEAN statuses at which some WON_REP threat's latest state is TRAVELLING or DELAYED (`ADR:962`). */
  cleanLiveWonRepTicks: number;
  cleanLiveWonRepDropbacks: number;
  /** Those ticks whose live threat is a PUSH rep by `pocket/approach.ts` (`ADR:1160`). */
  cleanLiveWonRepPushTicks: number;
  /** Throwaways on pressured dropbacks, and on clean ones (`throwaway_rate_pressured` / `_clean`). */
  pressuredThrowaways: number;
  cleanThrowaways: number;
  /** One entry per scramble: its `RUN_RESOLUTION.yards`. */
  scrambleYards: number[];
  /** Keyed `EARLY` (first and second down), `THIRD`, `FOURTH`. */
  byDown: Record<string, DownFold>;
  /** Aimed throws (THROW events), and their completions and interceptions: the guards' population. */
  aimedThrows: number;
  aimedCompletions: number;
  aimedInterceptions: number;
  /** Aimed throws released on a tick whose own POCKET_STATUS is in `pocket.forcesDecision`. */
  forcedAimedThrows: number;
  /** Pass attempts and completions keyed by the dropback's worst POCKET_STATUS. */
  attemptsByWorstStatus: Record<string, StatusCompletionFold>;
  /** Keyed by `PLAY_START.offense.quarterback` and `PLAY_START.defense.team`. */
  qbUnits: Record<string, UnitFold>;
  defenceUnits: Record<string, UnitFold>;
  /** (play, man) pairs on the free-run clock: D19's origins (UNBLOCKED; PICKUP_LOST banded BLOWN_UP; STUNT_LOOPER banded LOOPER_FREE). */
  freeRunMen: number;
  /** Those whose own arrival floor reached PRESSURE or worse at a POCKET_STATUS with the ball in his hand. */
  freeRunPressures: number;
  /** Hit-or-sack dropbacks whose contact man (the last threat ARRIVED with the ball in his hand) was on the free-run clock. */
  unblockedHitOrSack: number;
  /** Pressured dropbacks with no free runner, and those whose first pressure came before 2.5 s. */
  noFreeRunnerPressured: number;
  noFreeRunnerQuick: number;
  /** §2.4's clean pocket: clean dropbacks with an escape (QB_PURSUIT), aimed throws after one, clean aimed throws. */
  cleanEscapes: number;
  cleanBreakoutAimedThrows: number;
  cleanAimedThrows: number;
  /**
   * Aimed throws after a clean break-out that the scramble drill ran on. Under legacy every escape
   * runs §8.8's drill, so this equals `cleanBreakoutAimedThrows`; step 6's drill (P12) splits them.
   */
  cleanDrillThrows: number;
  /** Keyed by `SITUATION_WINDOWS`. */
  situation: Record<string, SituationFold>;
  clockCheck: ClockCheckFold;
  /**
   * Contact (`ADR:649`): a threat ARRIVED, or the escape roll's CAUGHT, with the ball in his hand,
   * once per dropback on each side; "out" if an escape began earlier in the play.
   */
  contactsIn: number;
  sacksIn: number;
  contactsOut: number;
  sacksOut: number;
  /** Sacks whose last POCKET_STATUS before the sack was CLEAN (`coverage_sack_rows`), and each sack's tick. */
  sacksCleanAtSack: number;
  sackSeconds: number[];
  /** ADR-089 step 3: the miss rule's split under the arm's own free-run reading (AM-2's key). */
  clockKey: ClockKeyFold;
}

/** `pressured_share_by_release_bin`'s bins (`ADR:161-198`): lower bound inclusive, upper exclusive. */
export const RELEASE_BINS = [
  { label: "<2.0", lo: Number.NEGATIVE_INFINITY, hi: 2.0 },
  { label: "2.0-2.5", lo: 2.0, hi: 2.5 },
  { label: "2.5-3.0", lo: 2.5, hi: 3.0 },
  { label: "3.0-3.5", lo: 3.0, hi: 3.5 },
  { label: "3.5-4.0", lo: 3.5, hi: 4.0 },
  { label: "4-5", lo: 4.0, hi: 5.0 },
  { label: ">=5", lo: 5.0, hi: Number.POSITIVE_INFINITY },
] as const;
/** The miss rule's bin (`ADR:1172`): throws released at 2.0-2.5 s. */
export const TWO_SECOND_BIN = "2.0-2.5";

export function releaseBinOf(seconds: number): string {
  for (const bin of RELEASE_BINS) if (seconds >= bin.lo && seconds < bin.hi) return bin.label;
  return RELEASE_BINS[RELEASE_BINS.length - 1]!.label;
}

/** "Quick" pressure: the first PRESSURE-or-worse before 2.5 s (`ADR:962`; NGS's line). */
export const QUICK_PRESSURE_SECONDS = 2.5;

/** The situation windows (`ADR` §2.4): "the last 120 s" of a quarter. */
export const SITUATION_WINDOW_SECONDS = 120;
export const SITUATION_WINDOWS = [
  "HALF_END_TRAILING",
  "HALF_END_LEVEL_OR_LEADING",
  "Q1Q3_END",
  "REST",
  "OVERTIME",
] as const;
export type SituationWindow = (typeof SITUATION_WINDOWS)[number];

export function situationWindowOf(period: number, clockSeconds: number, offenseMargin: number): SituationWindow {
  if (period > 4) return "OVERTIME";
  const late = clockSeconds <= SITUATION_WINDOW_SECONDS;
  if (late && (period === 2 || period === 4)) return offenseMargin < 0 ? "HALF_END_TRAILING" : "HALF_END_LEVEL_OR_LEADING";
  if (late && (period === 1 || period === 3)) return "Q1Q3_END";
  return "REST";
}

/** `by_down_fixed_calls`' population (deviation O12): 7-10 to go, goal-to-go excluded. */
export const BY_DOWN_DISTANCE = { min: 7, max: 10 } as const;
export function downGroupOf(down: number): "EARLY" | "THIRD" | "FOURTH" | null {
  if (down === 1 || down === 2) return "EARLY";
  if (down === 3) return "THIRD";
  if (down === 4) return "FOURTH";
  return null;
}

function emptyPocketFold(): PocketFold {
  return {
    hitOrSackDropbacks: 0,
    hitOnAttemptDropbacks: 0,
    hitOnScrambleDropbacks: 0,
    releaseSeconds: [],
    releaseBins: {},
    firstPressureSeconds: [],
    firstForcingSeconds: [],
    firstArrivalSeconds: [],
    firstPressureOrigin: {},
    firstPressureCause: {},
    quickFirstPressureByOrigin: {},
    quickFirstPressures: 0,
    cleanLiveWonRepTicks: 0,
    cleanLiveWonRepDropbacks: 0,
    cleanLiveWonRepPushTicks: 0,
    pressuredThrowaways: 0,
    cleanThrowaways: 0,
    scrambleYards: [],
    byDown: {},
    aimedThrows: 0,
    aimedCompletions: 0,
    aimedInterceptions: 0,
    forcedAimedThrows: 0,
    attemptsByWorstStatus: {},
    qbUnits: {},
    defenceUnits: {},
    freeRunMen: 0,
    freeRunPressures: 0,
    unblockedHitOrSack: 0,
    noFreeRunnerPressured: 0,
    noFreeRunnerQuick: 0,
    cleanEscapes: 0,
    cleanBreakoutAimedThrows: 0,
    cleanAimedThrows: 0,
    cleanDrillThrows: 0,
    situation: {},
    clockCheck: {
      driveStarts: 0,
      driveStartsEqualRebuilt: 0,
      driveStartsAboveRebuilt: 0,
      snaps: 0,
      snapsEqualRebuilt: 0,
      snapsAboveRebuilt: 0,
      snapsWithoutPublishedClock: 0,
    },
    contactsIn: 0,
    sacksIn: 0,
    contactsOut: 0,
    sacksOut: 0,
    sacksCleanAtSack: 0,
    sackSeconds: [],
    clockKey: emptyClockKeyFold(),
  };
}

function emptyClockKeyFold(): ClockKeyFold {
  return {
    releaseBins: {},
    noClockRunnerPressured: 0,
    noClockRunnerQuick: 0,
    firstPressureByClock: {},
    quickFirstPressureByClock: {},
    clockMen: 0,
    clockRunnerDropbacks: 0,
  };
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
      disguisedDropbacks: 0,
      disguisedDropbacksByMask: {},
      frontLookDropbacks: 0,
      frontLookDropbacksByLook: {},
      threatOrigins: {},
      threatOriginDropbacks: {},
      pocket: emptyPocketFold(),
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
  /** The game clock at the snap (ADR-089 step 0's situation rows read it). */
  readonly clockSeconds?: number;
}

interface PlayStartShape {
  readonly kind: string;
  readonly offense?: {
    readonly team?: unknown;
    readonly quarterback?: unknown;
    /** ADR-022 petition 2 / §5.3 — routes that broke off hot, and what they were before. */
    readonly hotConversions?: readonly unknown[];
  };
  readonly defense?: {
    readonly team?: unknown;
    readonly coverage?: unknown;
    /** The rush as played, resolved, with each man's gap (ADR-073 P1). */
    readonly rush?: readonly unknown[];
    /** ADR-073 §2.5 — the rush as shown, resolved the same way: the played rush unless a front look was worn. */
    readonly shownRush?: readonly unknown[];
    /** §7.4 step 1 — rushers no `ProtectionAssignment` named. */
    readonly unaccountedRushers?: readonly unknown[];
    /** ADR-067 §B — what was played, and what the offence was shown. */
    readonly assignments?: unknown;
    readonly shownAssignments?: unknown;
    /** ADR-071 — the call's tags, said in order; its LOOKs name the look it wore. */
    readonly tags?: readonly { readonly kind?: unknown; readonly id?: unknown }[];
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

// ---------------------------------------------------------------------------
// THE TABLES THE FOLD READS, FROM THE TUNABLES THE GAME WAS PLAYED WITH
// ---------------------------------------------------------------------------

/**
 * Every value the fold reads off the tunables, derived once per `Tunables` (ADR-089 step 1, plan
 * §7.2 item 5; critique-2 F6). These were module-level constants read off `DEFAULT_TUNABLES`; a
 * `pocket-1` arm that patches a leaf (Heels, Past only, the hold, the horizons) must be folded by
 * its OWN tables (K14), so `foldGame` takes the tunables and derives them per call, memoised by
 * reference. `foldGame(acc, game)` with no tunables reads `DEFAULT_TUNABLES`, the same values as
 * before, so a legacy caller's output is byte for byte today's.
 *
 *  - `forcesDecision`: BACKLOG DISPATCH C, disjunct (2) of the exit predicate — DERIVED from the
 *    tunables, never restated as a literal, for the same reason `rusherWinsRepFloor` reads its floor
 *    off the table rather than copying a number: a rung added to or removed from
 *    `pocket.forcesDecision` moves this set automatically instead of silently going stale beside a
 *    hand-written copy. `Tunables` is the permitted surface ADR-012 item 3 names; this reads a value
 *    off it — no resolver function (`forcesDecision` itself, `packages/engine/src/resolve/pocket.ts`)
 *    is called or imported.
 *  - `severity`, `pressureSeverity`, `minimumStatusByBand`: the status ladder's order and the band
 *    floors, read off `pocket.severity` and `pocket.minimumStatusByBand` rather than restated.
 *  - `arrival`: the horizons of a threat's own arrival floor (`arrivalFloorOf`).
 *  - `escapeCaughtBands`: the escape roll's bands that end in a sack (`scramble.bands`): its CAUGHT.
 *  - `rusherWinsRepFloor`, `rusherWonBands`: see `recordRushRep`.
 */
interface FoldTables {
  readonly forcesDecision: ReadonlySet<string>;
  readonly severity: Readonly<Record<string, number>>;
  readonly pressureSeverity: number;
  readonly minimumStatusByBand: Readonly<Record<string, string>>;
  readonly arrival: {
    readonly immediateWithinSeconds: number;
    readonly collapsingWithinSeconds: number;
    readonly pressureWithinSeconds: number;
  };
  readonly escapeCaughtBands: ReadonlySet<string>;
  readonly rusherWinsRepFloor: number;
  readonly rusherWonBands: ReadonlySet<string>;
  /** ADR-089 step 3: whom the free-run clock times under the arm's own reading (AM-2's key). */
  readonly clockKey: ClockKey;
}

const FOLD_TABLES = new WeakMap<Tunables, FoldTables>();

/** The fold's tables for one `Tunables`, derived on first use and memoised by reference. */
function foldTablesOf(tunables: Tunables): FoldTables {
  const known = FOLD_TABLES.get(tunables);
  if (known !== undefined) return known;
  const severity: Readonly<Record<string, number>> = tunables.pocket.severity;
  const pressureSeverity = severity["PRESSURE"];
  if (pressureSeverity === undefined) throw new Error("collect: pocket.severity has no PRESSURE rung");
  const winsRep = tunables.passRush.bands.find((b) => b.label === "RUSHER_WINS_REP");
  if (winsRep === undefined) throw new Error("collect: passRush.bands has no RUSHER_WINS_REP row");
  const rusherWinsRepFloor = winsRep.minMargin;
  const a = tunables.arrival;
  const tables: FoldTables = {
    forcesDecision: new Set<string>(tunables.pocket.forcesDecision),
    severity,
    pressureSeverity,
    minimumStatusByBand: tunables.pocket.minimumStatusByBand,
    arrival: {
      immediateWithinSeconds: a.immediateWithinSeconds,
      collapsingWithinSeconds: a.collapsingWithinSeconds,
      pressureWithinSeconds: a.pressureWithinSeconds,
    },
    escapeCaughtBands: new Set(tunables.scramble.bands.filter((b) => b.sacked).map((b) => b.label)),
    rusherWinsRepFloor,
    // The band labels at or above that floor — DERIVED from the table, never listed.
    rusherWonBands: new Set(tunables.passRush.bands.filter((b) => b.minMargin >= rusherWinsRepFloor).map((b) => b.label)),
    clockKey: clockKeyOf(tunables),
  };
  FOLD_TABLES.set(tunables, tables);
  return tables;
}

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

/**
 * The two kinds of LOOK a call can name, by id, from playbook's own catalogues (calibration →
 * playbook is ratified, ADR-017; ADR-073 §3.5): the coverage looks key `disguisedDropbacksByMask`
 * and the front looks key `frontLookDropbacksByLook`. Read off the catalogues rather than
 * restated, so a look added to either moves its key set with it.
 */
const COVERAGE_LOOK_IDS: ReadonlySet<string> = new Set(COVERAGE_MASKS.map((mask) => mask.id));
const FRONT_LOOK_IDS: ReadonlySet<string> = new Set<string>(FRONT_LOOKS);

/** A PLAY_START's LOOK tag ids that are in `ids`, in the order the call says them. */
function lookIds(
  tags: readonly { readonly kind?: unknown; readonly id?: unknown }[],
  ids: ReadonlySet<string>,
): readonly string[] {
  return tags.filter((tag) => tag.kind === "LOOK" && ids.has(String(tag.id))).map((tag) => String(tag.id));
}

/** A PLAY_START rush list `shownRushDiffers` can read: an array of records. */
function isRushList(value: unknown): value is readonly ShownRusher[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "object" && entry !== null);
}

// --- per-play working state -------------------------------------------------

/** A rusher's threat as the stream last published it, for the pocket rows (ADR-089 step 0). */
interface PocketThreat {
  origin: string;
  etaTick: number;
  state: string;
  /** On the free-run clock: D19's three origins (UNBLOCKED, PICKUP_LOST BLOWN_UP, STUNT_LOOPER LOOPER_FREE). */
  freeRun: boolean;
  /** ADR-089 step 3: on the free-run clock under the arm's own reading (AM-2's key, `pocket/freeRunKey.ts`). */
  clock: boolean;
}

/** The pocket rows' per-play state. Everything is read off this play's own events. */
interface PocketPlayState {
  /** `PERIOD_START.payload.period` in force at the snap. */
  period: number;
  /** `PLAY_START.situation.clockSeconds`, or the rebuilt clock when the payload has none. */
  clockSeconds: number;
  /** Offence's score less the defence's at the snap. */
  offenseMargin: number;
  distance: number;
  quarterback: string | null;
  defenceTeam: string | null;
  /** Every envelope of the play, in order, for `approachesOfPlay` (only read on a play that needs it). */
  events: MatchEventEnvelope[];
  /** Pre-snap pickup and stunt CHECK bands by roll label: D19's free-run test reads them. */
  checkBands: Map<string, string | undefined>;
  /** ADR-089 step 3: the same CHECKs' touch (band and hand) by roll label, for AM-2's key. */
  checkTouches: Map<string, Touch>;
  /** Each rusher's latest `pass_rush_tick` band (at a POCKET_STATUS, last tick's: the band floor's input). */
  lastBands: Map<string, string>;
  threats: Map<string, PocketThreat>;
  /** A threat of an origin other than WON_REP was published on the play (§1.1's free runner). */
  freeRunner: boolean;
  freeRunMen: Set<string>;
  freeRunPressured: Set<string>;
  /** ADR-089 step 3: the men on the clock under the arm's own reading (AM-2's key). */
  clockMen: Set<string>;
  /** `PLAY_START.offense.protectionScheme.center`: the man a stunt CHECK names first, never its hand (`touchOfCheck`). */
  center: string | undefined;
  released: boolean;
  /** `THROW.releaseSeconds` when the stream carries it (P8; absent under legacy). */
  releaseSeconds: number | null;
  /** A threat published ARRIVED with the ball in his hand. */
  hit: boolean;
  lastArrivedRusher: string | null;
  firstPressure: number | null;
  firstForcing: number | null;
  firstArrival: number | null;
  /** The first non-CLEAN tick's causes, split evenly, by origin and by cause. */
  firstOrigin: Record<string, number> | null;
  firstCause: Record<string, number> | null;
  /** The same split keyed by AM-2's key (`ClockKeyFold.firstPressureByClock`). */
  firstClock: Record<string, number> | null;
  cleanLiveTicks: number;
  /** Per clean-live tick, the WON_REP rushers live at it, for the PUSH count at flush. */
  cleanLiveRushers: string[][];
  worstSeverity: number;
  worstStatus: string;
  lastStatus: string | null;
  lastStatusTick: number | null;
  forcedAtRelease: boolean;
  escaped: boolean;
  /** An aimed throw was made after the escape. */
  threwAfterEscape: boolean;
  contactIn: boolean;
  contactOut: boolean;
  /** The play's last TICK: a sack's time. */
  lastTick: number;
}

function blankPocketPlay(period: number, clockSeconds: number): PocketPlayState {
  return {
    period,
    clockSeconds,
    offenseMargin: 0,
    distance: 10,
    quarterback: null,
    defenceTeam: null,
    events: [],
    checkBands: new Map<string, string | undefined>(),
    checkTouches: new Map<string, Touch>(),
    lastBands: new Map<string, string>(),
    threats: new Map<string, PocketThreat>(),
    freeRunner: false,
    freeRunMen: new Set<string>(),
    freeRunPressured: new Set<string>(),
    clockMen: new Set<string>(),
    center: undefined,
    released: false,
    releaseSeconds: null,
    hit: false,
    lastArrivedRusher: null,
    firstPressure: null,
    firstForcing: null,
    firstArrival: null,
    firstOrigin: null,
    firstCause: null,
    firstClock: null,
    cleanLiveTicks: 0,
    cleanLiveRushers: [],
    worstSeverity: -1,
    worstStatus: "CLEAN",
    lastStatus: null,
    lastStatusTick: null,
    forcedAtRelease: false,
    escaped: false,
    threwAfterEscape: false,
    contactIn: false,
    contactOut: false,
    lastTick: 0,
  };
}

/**
 * A threat's own arrival floor, `pocketFloorFromArrival` (`resolve/rushThreat.ts:812`) restated
 * from the tunables' `arrival` horizons (a permitted read, ADR-012 item 3), on the same
 * tenth-rounded time-to-arrival the engine reads (`timeToArrival`, `:690`).
 */
function arrivalFloorOf(tb: FoldTables, etaTick: number, tick: number): string {
  const tta = Number((etaTick - tick).toFixed(1));
  const a = tb.arrival;
  if (tta <= a.immediateWithinSeconds) return "IMMEDIATE";
  if (tta <= a.collapsingWithinSeconds) return "COLLAPSING";
  if (tta <= a.pressureWithinSeconds) return "PRESSURE";
  return "CLEAN";
}

const severityOf = (tb: FoldTables, status: string): number => tb.severity[status] ?? 0;
const isLiveThreat = (t: PocketThreat): boolean => t.state !== "RESET";

/**
 * A first non-CLEAN tick is split evenly among its causes, in integer units so that the merge
 * stays exact and order-free (float shares summed in a different order differ in the last bit).
 * 27,720 is the least common multiple of 1 to 12: a split among up to twelve causes is exact.
 */
export const CAUSE_SPLIT_UNITS = 27_720;

/** D19 (ADR-089:385): completely unblocked, or a looper nobody touched. */
function onFreeRunClock(origin: string, band: string | undefined): boolean {
  if (origin === "UNBLOCKED") return true;
  if (origin === "PICKUP_LOST") return band === PICKUP_FREE_BAND;
  if (origin === "STUNT_LOOPER") return band === LOOPER_FREE_BAND;
  return false;
}

/**
 * The causes of a first non-CLEAN status, by `TM`'s cause rule (`two/read1.md:152`, `:344-349`):
 * every rusher whose own channel reaches the published status is a cause; an arrival names the
 * threat's origin, otherwise the band floor (`minimumStatusByBand` of his last band, a won band
 * left out while his threat is live, ADR-058), otherwise the counter. The per-rusher counter is
 * not rebuilt here: a status no arrival or band reaches is the counter's, whole. The coarse class
 * is `PRESSURE_ORIGINS`': WON_REP; FREE_RUNNER for every other origin; COUNTER for the band floor
 * and the counter together (`TM`'s type (d), "no real state").
 */
function causesOf(pk: PocketPlayState, status: string, tick: number, tb: FoldTables): { origin: Record<string, number>; cause: Record<string, number>; clock: Record<string, number> } {
  const need = severityOf(tb, status);
  const found: { cause: string; origin: string; clock: string }[] = [];
  const rushers = new Set<string>([...pk.threats.keys(), ...pk.lastBands.keys()]);
  for (const rusher of rushers) {
    const threat = pk.threats.get(rusher);
    const live = threat !== undefined && isLiveThreat(threat);
    if (live && severityOf(tb, arrivalFloorOf(tb, threat.etaTick, tick)) >= need) {
      const origin = threat.origin === "WON_REP" ? "WON_REP" : "FREE_RUNNER";
      found.push({ cause: threat.origin, origin, clock: threat.clock ? "CLOCK_RUNNER" : origin });
      continue;
    }
    const band = pk.lastBands.get(rusher);
    if (band === undefined || (live && tb.rusherWonBands.has(band))) continue;
    const floor = tb.minimumStatusByBand[band];
    if (floor !== undefined && severityOf(tb, floor) >= need) found.push({ cause: "BAND", origin: "COUNTER", clock: "COUNTER" });
  }
  if (found.length === 0) found.push({ cause: "COUNTER", origin: "COUNTER", clock: "COUNTER" });
  const share = CAUSE_SPLIT_UNITS / found.length;
  const origin: Record<string, number> = {};
  const cause: Record<string, number> = {};
  const clock: Record<string, number> = {};
  for (const f of found) {
    bumpKey(origin, f.origin, share);
    bumpKey(cause, f.cause, share);
    bumpKey(clock, f.clock, share);
  }
  return { origin, cause, clock };
}

function emptyReleaseBin(): ReleaseBinFold {
  return { attempts: 0, pressuredAttempts: 0, aimed: 0, aimedHits: 0, attemptsNoFreeRunner: 0, pressuredNoFreeRunner: 0 };
}
function emptyDown(): DownFold {
  return { dropbacks: 0, pressured: 0, pressuredSacks: 0, pressuredThrowaways: 0 };
}
function emptyUnit(): UnitFold {
  return { dropbacks: 0, pressured: 0, pressuredSacks: 0, attempts: 0, releaseTotal: 0, releaseSquares: 0 };
}
function emptySituation(): SituationFold {
  return {
    scrimmagePlays: 0, dropbacks: 0, pressured: 0, pressuredSacks: 0, pressuredThrowaways: 0,
    cleanThrowaways: 0, attempts: 0, releaseTotal: 0, releaseSquares: 0,
  };
}
function slot<T>(record: Record<string, T>, key: string, make: () => T): T {
  const existing = record[key];
  if (existing !== undefined) return existing;
  const fresh = make();
  record[key] = fresh;
  return fresh;
}

type StreamEvent = MatchEventEnvelope["event"];
type RushThreatPayload = Extract<StreamEvent, { type: "RUSH_THREAT" }>["payload"];
type CheckPayload = Extract<StreamEvent, { type: "CHECK" }>["payload"];

/**
 * A RUSH_THREAT publication, into the pocket rows' per-play state. Whether he is on the clock under
 * the arm's own reading (AM-2's key) is read once, at his first publication, from the CHECK his
 * record names, as D19's flag is.
 */
function rushThreatSeen(pk: PocketPlayState, t: RushThreatPayload, tick: number, tb: FoldTables): void {
  const rusher = String(t.rusher);
  const previous = pk.threats.get(rusher);
  const freeRun = previous?.freeRun ?? onFreeRunClock(t.origin, pk.checkBands.get(t.rollRef));
  const clock = previous?.clock ?? onClockUnder(tb.clockKey, t.origin, pk.checkTouches.get(t.rollRef));
  pk.threats.set(rusher, { origin: t.origin, etaTick: t.etaTick, state: t.state, freeRun, clock });
  if (t.origin !== "WON_REP") pk.freeRunner = true;
  if (freeRun) pk.freeRunMen.add(rusher);
  if (clock) pk.clockMen.add(rusher);
  if (t.state === "ARRIVED") {
    if (pk.firstArrival === null) pk.firstArrival = tick;
    if (!pk.released) {
      pk.hit = true;
      pk.lastArrivedRusher = rusher;
      if (pk.escaped) pk.contactOut = true;
      else pk.contactIn = true;
    }
  }
}

/** A POCKET_STATUS, into the pocket rows' per-play state. Published only while he holds the ball in the pocket. */
function pocketStatusSeen(pk: PocketPlayState, status: string, tick: number, tb: FoldTables): void {
  const severity = severityOf(tb, status);
  if (severity > pk.worstSeverity) {
    pk.worstSeverity = severity;
    pk.worstStatus = status;
  }
  pk.lastStatus = status;
  pk.lastStatusTick = tick;
  if (!pk.released) {
    for (const [rusher, t] of pk.threats) {
      if (t.freeRun && isLiveThreat(t) && severityOf(tb, arrivalFloorOf(tb, t.etaTick, tick)) >= tb.pressureSeverity) {
        pk.freeRunPressured.add(rusher);
      }
    }
  }
  if (status === "CLEAN") {
    const live: string[] = [];
    for (const [rusher, t] of pk.threats) {
      if (t.origin === "WON_REP" && (t.state === "TRAVELLING" || t.state === "DELAYED")) live.push(rusher);
    }
    if (live.length > 0) {
      pk.cleanLiveTicks++;
      pk.cleanLiveRushers.push(live);
    }
  } else if (pk.firstPressure === null) {
    pk.firstPressure = tick;
    const causes = causesOf(pk, status, tick, tb);
    pk.firstOrigin = causes.origin;
    pk.firstCause = causes.cause;
    pk.firstClock = causes.clock;
  }
  if (pk.firstForcing === null && tb.forcesDecision.has(status)) pk.firstForcing = tick;
}

/** A CHECK, into the pocket rows' per-play state: rush bands, pickup and stunt bands, the escape's CAUGHT. */
function pocketCheckSeen(pk: PocketPlayState, c: CheckPayload, tb: FoldTables): void {
  if (c.checkKind === "pass_rush_tick") {
    const rusher = c.actors[0];
    if (rusher !== undefined && c.band !== undefined) pk.lastBands.set(String(rusher), c.band);
  } else if (c.checkKind === "blitz_pickup" || c.checkKind === "stunt_communication") {
    pk.checkBands.set(c.roll.rngLabel, c.band);
    const touch = touchOfCheck(c, pk.center);
    if (touch !== undefined) pk.checkTouches.set(c.roll.rngLabel, touch);
  } else if (c.checkKind === "scramble" && c.band !== undefined && tb.escapeCaughtBands.has(c.band) && !pk.released) {
    if (pk.escaped) pk.contactOut = true;
    else pk.contactIn = true;
  }
}

/**
 * One play into the pocket rows (ADR-089 step 0, plan §5). Reads only `PlayState`, which the
 * stream filled; called from `flush()` after every existing tally, and writes only `pocket`.
 */
function foldPocketPlay(pf: PocketFold, play: PlayState): void {
  const k = play.pk;
  const sit = slot(pf.situation, situationWindowOf(k.period, k.clockSeconds, k.offenseMargin), emptySituation);
  sit.scrimmagePlays++;
  if (!play.isPass) return;

  // The same terminal-act chain `flush()` uses for `sacks` and `throwaways`, restated so the two
  // can never disagree about which dropbacks they are.
  const throwaway = !play.scramble && play.throwaway;
  const sacked = !play.scramble && !play.throwaway && !play.threw && !play.intercepted;
  const attempt = play.threw || play.throwaway;
  const releaseTick = play.threw ? play.throwTick : play.throwawayTick;
  const release = attempt ? (k.releaseSeconds ?? releaseTick) : null;
  const pressured = play.pressured;

  sit.dropbacks++;
  if (pressured) {
    sit.pressured++;
    if (sacked) sit.pressuredSacks++;
    if (throwaway) sit.pressuredThrowaways++;
  } else if (throwaway) sit.cleanThrowaways++;
  if (release !== null) {
    sit.attempts++;
    sit.releaseTotal += release;
    sit.releaseSquares += release * release;
  }

  // Hit-or-sack (§4.5): the hit stands in for QB_HIT under legacy.
  const hitOnAttempt = k.hit && attempt;
  const hitOrSack = sacked || hitOnAttempt;
  if (hitOrSack) pf.hitOrSackDropbacks++;
  if (hitOnAttempt) pf.hitOnAttemptDropbacks++;
  if (k.hit && play.scramble) pf.hitOnScrambleDropbacks++;

  if (release !== null) {
    pf.releaseSeconds.push(release);
    const bin = slot(pf.releaseBins, releaseBinOf(release), emptyReleaseBin);
    bin.attempts++;
    if (pressured) bin.pressuredAttempts++;
    if (play.threw) {
      bin.aimed++;
      if (k.hit) bin.aimedHits++;
    }
    if (!k.freeRunner) {
      bin.attemptsNoFreeRunner++;
      if (pressured) bin.pressuredNoFreeRunner++;
    }
  }

  if (k.firstPressure !== null) pf.firstPressureSeconds.push(k.firstPressure);
  if (k.firstForcing !== null) pf.firstForcingSeconds.push(k.firstForcing);
  if (k.firstArrival !== null) pf.firstArrivalSeconds.push(k.firstArrival);
  const quick = k.firstPressure !== null && k.firstPressure < QUICK_PRESSURE_SECONDS;
  if (k.firstOrigin !== null) {
    for (const [key, units] of Object.entries(k.firstOrigin)) {
      bumpKey(pf.firstPressureOrigin, key, units);
      if (quick) bumpKey(pf.quickFirstPressureByOrigin, key, units);
    }
  }
  if (k.firstCause !== null) for (const [key, units] of Object.entries(k.firstCause)) bumpKey(pf.firstPressureCause, key, units);
  if (quick) pf.quickFirstPressures++;
  if (pressured && !k.freeRunner) {
    pf.noFreeRunnerPressured++;
    if (quick) pf.noFreeRunnerQuick++;
  }

  if (k.cleanLiveTicks > 0) {
    pf.cleanLiveWonRepTicks += k.cleanLiveTicks;
    pf.cleanLiveWonRepDropbacks++;
    const labels = approachesOfPlay(k.events);
    for (const rushers of k.cleanLiveRushers) {
      if (rushers.some((r) => labels.get(r)?.label.approach === "PUSH")) pf.cleanLiveWonRepPushTicks++;
    }
  }

  if (throwaway) {
    if (pressured) pf.pressuredThrowaways++;
    else pf.cleanThrowaways++;
  }
  if (play.scramble) pf.scrambleYards.push(play.runYards);

  const group = downGroupOf(play.down);
  if (group !== null && k.distance >= BY_DOWN_DISTANCE.min && k.distance <= BY_DOWN_DISTANCE.max && play.ballOn + k.distance < 100) {
    const row = slot(pf.byDown, group, emptyDown);
    row.dropbacks++;
    if (pressured) {
      row.pressured++;
      if (sacked) row.pressuredSacks++;
      if (throwaway) row.pressuredThrowaways++;
    }
  }

  if (play.threw) {
    pf.aimedThrows++;
    if (play.caught) pf.aimedCompletions++;
    if (play.intercepted) pf.aimedInterceptions++;
    if (k.forcedAtRelease) pf.forcedAimedThrows++;
  }
  if (attempt) {
    const row = slot(pf.attemptsByWorstStatus, k.worstSeverity < 0 ? "NONE" : k.worstStatus, () => ({ attempts: 0, completions: 0 }));
    row.attempts++;
    if (play.caught) row.completions++;
  }

  const units: [Record<string, UnitFold>, string | null][] = [[pf.qbUnits, k.quarterback], [pf.defenceUnits, k.defenceTeam]];
  for (const [record, key] of units) {
    if (key === null) continue;
    const u = slot(record, key, emptyUnit);
    u.dropbacks++;
    if (pressured) {
      u.pressured++;
      if (sacked) u.pressuredSacks++;
    }
    if (release !== null) {
      u.attempts++;
      u.releaseTotal += release;
      u.releaseSquares += release * release;
    }
  }

  pf.freeRunMen += k.freeRunMen.size;
  pf.freeRunPressures += k.freeRunPressured.size;
  if (hitOrSack && k.lastArrivedRusher !== null && k.threats.get(k.lastArrivedRusher)?.freeRun === true) pf.unblockedHitOrSack++;

  // ADR-089 step 3, AM-2's key: the miss rule's split with the arm's own reading.
  const ck = pf.clockKey;
  const clockRunner = k.clockMen.size > 0;
  ck.clockMen += k.clockMen.size;
  if (clockRunner) ck.clockRunnerDropbacks++;
  if (release !== null && !clockRunner) {
    const bin = slot(ck.releaseBins, releaseBinOf(release), () => ({ attemptsNoClockRunner: 0, pressuredNoClockRunner: 0 }));
    bin.attemptsNoClockRunner++;
    if (pressured) bin.pressuredNoClockRunner++;
  }
  if (k.firstClock !== null) {
    for (const [key, units] of Object.entries(k.firstClock)) {
      bumpKey(ck.firstPressureByClock, key, units);
      if (quick) bumpKey(ck.quickFirstPressureByClock, key, units);
    }
  }
  if (pressured && !clockRunner) {
    ck.noClockRunnerPressured++;
    if (quick) ck.noClockRunnerQuick++;
  }

  if (!pressured) {
    if (k.escaped) pf.cleanEscapes++;
    if (play.threw) pf.cleanAimedThrows++;
    if (k.threwAfterEscape) {
      pf.cleanBreakoutAimedThrows++;
      pf.cleanDrillThrows++;
    }
  }

  // Every sack is a contact on the side it happened (the real side's contact is qb_hit OR sack).
  if (k.contactIn || (sacked && !k.escaped)) pf.contactsIn++;
  if (k.contactOut || (sacked && k.escaped)) pf.contactsOut++;
  if (sacked) {
    if (k.escaped) pf.sacksOut++;
    else pf.sacksIn++;
    pf.sackSeconds.push(k.lastTick);
    if (k.lastStatus === "CLEAN") pf.sacksCleanAtSack++;
  }
}

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
  /** ADR-089 step 0's per-play state (`PocketPlayState`). */
  pk: PocketPlayState;
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
    pk: blankPocketPlay(0, 0),
  };
}

/**
 * Fold one game into the accumulator. Mutates `acc` — it is a private working value owned by one
 * worker and never shared — and returns it for chaining.
 *
 * `tunables` are the tunables the game was PLAYED with (ADR-089 step 1, K14): the fold reads its
 * status ladder, band floors, arrival horizons, escape bands and won-rep floor off them
 * (`FoldTables`). A legacy caller passes nothing and folds with `DEFAULT_TUNABLES`, exactly as
 * before; a `pocket-1` arm passes its own bundle.
 */
export function foldGame(acc: SimAccumulator, game: SimGameObservation, tunables: Tunables = DEFAULT_TUNABLES): SimAccumulator {
  const tb = foldTablesOf(tunables);
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
  /**
   * ADR-089 step 0's situation rows: the period in force, the rebuilt clock (`PERIOD_START`'s
   * clock less each `PLAY_RESULT.clockRunoff`; see `ClockCheckFold`) and the score, all read off
   * the game's own events.
   */
  const pocket = p.pocket;
  let period = 0;
  let rebuiltClock = 0;
  let homeTeam: string | null = null;
  let homeScore = 0;
  let awayScore = 0;

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
    foldPocketPlay(pocket, play);
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
        current.pk = blankPocketPlay(period, rebuiltClock);
        current.pk.center = centerOfPlayStart(event.payload);
        tick = 0;
        pocket.clockCheck.snaps++;
        if (start !== null) {
          current.isPass = start.kind === "PASS_PLAY_V1";
          current.designedRun = start.kind === "RUN_PLAY_V1";
          const situation = start.situation;
          if (situation !== undefined) {
            current.down = situation.down;
            current.ballOn = situation.ballOn;
            playDistance = situation.distance;
            current.pk.distance = situation.distance;
          }
          // ADR-089 step 0: the snap's clock, its check against the rebuilt one, the score and the units.
          const published = situation?.clockSeconds;
          if (typeof published === "number") {
            current.pk.clockSeconds = published;
            if (published === rebuiltClock) pocket.clockCheck.snapsEqualRebuilt++;
            else if (published > rebuiltClock) pocket.clockCheck.snapsAboveRebuilt++;
          } else pocket.clockCheck.snapsWithoutPublishedClock++;
          const offenseTeam = start.offense?.team;
          if (homeTeam !== null && offenseTeam !== undefined) {
            current.pk.offenseMargin = String(offenseTeam) === homeTeam ? homeScore - awayScore : awayScore - homeScore;
          }
          const qb = start.offense?.quarterback;
          if (qb !== undefined) current.pk.quarterback = String(qb);
          const defenceTeam = start.defense?.team;
          if (defenceTeam !== undefined) current.pk.defenceTeam = String(defenceTeam);
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
            const tags = start.defense?.tags ?? [];
            const shown = start.defense?.shownAssignments;
            if (shown !== undefined && !isDeepStrictEqual(shown, start.defense?.assignments)) {
              p.disguisedDropbacks++;
              const looks = lookIds(tags, COVERAGE_LOOK_IDS);
              bumpKey(p.disguisedDropbacksByMask, looks.length === 0 ? "UNNAMED" : looks.join("+"));
            }
            // ADR-073 step 3.5: the shown rush against the played one, both as PLAY_START resolved
            // them. A stream with no `shownRush` (stored before ADR-073 step 3.1) counts nothing.
            const shownRush = start.defense?.shownRush;
            if (isRushList(rush) && isRushList(shownRush) && shownRushDiffers(rush, shownRush)) {
              p.frontLookDropbacks++;
              const fronts = lookIds(tags, FRONT_LOOK_IDS);
              bumpKey(p.frontLookDropbacksByLook, fronts.length === 0 ? "UNNAMED" : fronts.join("+"));
            }
          }
        }
        break;
      }
      case "TICK":
        tick = event.payload.tick;
        if (current !== null) current.pk.lastTick = tick;
        break;
      case "POCKET_STATUS":
        if (current !== null && current.isPass) {
          if (event.payload.status !== "CLEAN") current.pressured = true;
          // Backlog dispatch C, disjunct (2): DERIVED off the tunables' pocket.forcesDecision
          // (`FoldTables.forcesDecision` above), not restated.
          if (tb.forcesDecision.has(event.payload.status)) current.forcedDecision = true;
          // Tallied per TICK, immediately, not deferred to `flush()`: unlike `pressured` (a
          // per-DROPBACK worst-status flag), the severity partition is a per-TICK count and needs
          // no play-level reduction — see the `pocketStatusTicks` field comment.
          bumpKey(p.pocketStatusTicks, event.payload.status);
          pocketStatusSeen(current.pk, event.payload.status, tick, tb);
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
          rushThreatSeen(current.pk, event.payload, tick, tb);
        }
        break;
      case "THROW":
        if (current !== null) {
          current.threw = true;
          current.throwTick = tick;
          // ADR-089 step 0: the release, its named clock (P8's `releaseSeconds` once it exists; an
          // unknown key read structurally, so legacy streams simply lack it) and whether the
          // pocket forced it.
          const pk = current.pk;
          const releaseSeconds = (event.payload as { readonly releaseSeconds?: unknown }).releaseSeconds;
          if (typeof releaseSeconds === "number") pk.releaseSeconds = releaseSeconds;
          pk.forcedAtRelease = pk.lastStatusTick === tick && pk.lastStatus !== null && tb.forcesDecision.has(pk.lastStatus);
          if (pk.escaped) pk.threwAfterEscape = true;
          pk.released = true;
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
          current.pk.released = true;
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
            current.pk.released = true;
          }
        }
        break;
      case "CHECK":
        if (event.payload.checkKind === "pass_rush_tick") {
          recordRushRep(acc.player, event.payload.actors, event.payload.band, event.payload.margin, tb);
        }
        if (current !== null) pocketCheckSeen(current.pk, event.payload, tb);
        break;
      case "QB_PURSUIT":
        // ADR-089 step 0: an escape began (one publication per escape, ADR-054).
        if (current !== null) current.pk.escaped = true;
        break;
      case "GAME_START":
        homeTeam = String(event.payload.home);
        homeScore = 0;
        awayScore = 0;
        break;
      case "SCORE":
        homeScore = event.payload.home;
        awayScore = event.payload.away;
        break;
      case "PERIOD_START":
        period = event.payload.period;
        rebuiltClock = event.payload.clockSeconds;
        break;
      case "DRIVE_START":
        pocket.clockCheck.driveStarts++;
        if (event.payload.clockSeconds === rebuiltClock) pocket.clockCheck.driveStartsEqualRebuilt++;
        else if (event.payload.clockSeconds > rebuiltClock) pocket.clockCheck.driveStartsAboveRebuilt++;
        break;
      case "PLAY_RESULT":
        rebuiltClock = Math.max(0, rebuiltClock - event.payload.clockRunoff);
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
    if (current !== null && playId !== null) current.pk.events.push(envelope);
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
function recordRushRep(
  fold: PlayerFold,
  actors: readonly PlayerId[],
  band: string | undefined,
  margin: number,
  tb: FoldTables,
): void {
  const rusher = actors[0];
  const blocker = actors[1];
  if (rusher === undefined) return;
  // ADR-011: prefer the PUBLISHED band. `band` is optional on the payload, so the fallback reads
  // the same table's floor off the same margin — one source, two paths to it.
  const rusherWon = band === undefined ? margin >= tb.rusherWinsRepFloor : tb.rusherWonBands.has(band);
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

/** Field-by-field sum of two tallies built by the same factory (so their keys are the same, in the same order). */
function addFields<T extends object>(a: T, b: T): T {
  const out: Record<string, number> = {};
  const x = a as unknown as Record<string, number>;
  const y = b as unknown as Record<string, number>;
  for (const key of Object.keys(x)) out[key] = (x[key] ?? 0) + (y[key] ?? 0);
  return out as unknown as T;
}

/**
 * Key-by-key merge of two records of tallies, sorted like every other record merge here. The
 * release sums inside are exact under legacy (every release is a multiple of 0.5 s), so the merge
 * is order-free there; P8's raw-second release (step 4) is where float order could first show.
 */
function mergeTallies<T extends object>(a: Record<string, T>, b: Record<string, T>): Record<string, T> {
  const merged = new Map<string, T>();
  for (const [k, v] of Object.entries(a)) merged.set(k, { ...v });
  for (const [k, v] of Object.entries(b)) {
    const existing = merged.get(k);
    merged.set(k, existing === undefined ? { ...v } : addFields(existing, v));
  }
  return sortedRecord(merged);
}

const sortedConcat = (a: readonly number[], b: readonly number[]): number[] => [...a, ...b].sort((x, y) => x - y);

/** The pocket rows' merge (ADR-089 step 0): every field summed, every vector sorted, every record sorted. */
function mergePocketFold(a: PocketFold, b: PocketFold): PocketFold {
  return {
    hitOrSackDropbacks: a.hitOrSackDropbacks + b.hitOrSackDropbacks,
    hitOnAttemptDropbacks: a.hitOnAttemptDropbacks + b.hitOnAttemptDropbacks,
    hitOnScrambleDropbacks: a.hitOnScrambleDropbacks + b.hitOnScrambleDropbacks,
    releaseSeconds: sortedConcat(a.releaseSeconds, b.releaseSeconds),
    releaseBins: mergeTallies(a.releaseBins, b.releaseBins),
    firstPressureSeconds: sortedConcat(a.firstPressureSeconds, b.firstPressureSeconds),
    firstForcingSeconds: sortedConcat(a.firstForcingSeconds, b.firstForcingSeconds),
    firstArrivalSeconds: sortedConcat(a.firstArrivalSeconds, b.firstArrivalSeconds),
    firstPressureOrigin: mergeCounters(a.firstPressureOrigin, b.firstPressureOrigin),
    firstPressureCause: mergeCounters(a.firstPressureCause, b.firstPressureCause),
    quickFirstPressureByOrigin: mergeCounters(a.quickFirstPressureByOrigin, b.quickFirstPressureByOrigin),
    quickFirstPressures: a.quickFirstPressures + b.quickFirstPressures,
    cleanLiveWonRepTicks: a.cleanLiveWonRepTicks + b.cleanLiveWonRepTicks,
    cleanLiveWonRepDropbacks: a.cleanLiveWonRepDropbacks + b.cleanLiveWonRepDropbacks,
    cleanLiveWonRepPushTicks: a.cleanLiveWonRepPushTicks + b.cleanLiveWonRepPushTicks,
    pressuredThrowaways: a.pressuredThrowaways + b.pressuredThrowaways,
    cleanThrowaways: a.cleanThrowaways + b.cleanThrowaways,
    scrambleYards: sortedConcat(a.scrambleYards, b.scrambleYards),
    byDown: mergeTallies(a.byDown, b.byDown),
    aimedThrows: a.aimedThrows + b.aimedThrows,
    aimedCompletions: a.aimedCompletions + b.aimedCompletions,
    aimedInterceptions: a.aimedInterceptions + b.aimedInterceptions,
    forcedAimedThrows: a.forcedAimedThrows + b.forcedAimedThrows,
    attemptsByWorstStatus: mergeTallies(a.attemptsByWorstStatus, b.attemptsByWorstStatus),
    qbUnits: mergeTallies(a.qbUnits, b.qbUnits),
    defenceUnits: mergeTallies(a.defenceUnits, b.defenceUnits),
    freeRunMen: a.freeRunMen + b.freeRunMen,
    freeRunPressures: a.freeRunPressures + b.freeRunPressures,
    unblockedHitOrSack: a.unblockedHitOrSack + b.unblockedHitOrSack,
    noFreeRunnerPressured: a.noFreeRunnerPressured + b.noFreeRunnerPressured,
    noFreeRunnerQuick: a.noFreeRunnerQuick + b.noFreeRunnerQuick,
    cleanEscapes: a.cleanEscapes + b.cleanEscapes,
    cleanBreakoutAimedThrows: a.cleanBreakoutAimedThrows + b.cleanBreakoutAimedThrows,
    cleanAimedThrows: a.cleanAimedThrows + b.cleanAimedThrows,
    cleanDrillThrows: a.cleanDrillThrows + b.cleanDrillThrows,
    situation: mergeTallies(a.situation, b.situation),
    clockCheck: addFields(a.clockCheck, b.clockCheck),
    contactsIn: a.contactsIn + b.contactsIn,
    sacksIn: a.sacksIn + b.sacksIn,
    contactsOut: a.contactsOut + b.contactsOut,
    sacksOut: a.sacksOut + b.sacksOut,
    sacksCleanAtSack: a.sacksCleanAtSack + b.sacksCleanAtSack,
    sackSeconds: sortedConcat(a.sackSeconds, b.sackSeconds),
    clockKey: {
      releaseBins: mergeTallies(a.clockKey.releaseBins, b.clockKey.releaseBins),
      noClockRunnerPressured: a.clockKey.noClockRunnerPressured + b.clockKey.noClockRunnerPressured,
      noClockRunnerQuick: a.clockKey.noClockRunnerQuick + b.clockKey.noClockRunnerQuick,
      firstPressureByClock: mergeCounters(a.clockKey.firstPressureByClock, b.clockKey.firstPressureByClock),
      quickFirstPressureByClock: mergeCounters(a.clockKey.quickFirstPressureByClock, b.clockKey.quickFirstPressureByClock),
      clockMen: a.clockKey.clockMen + b.clockKey.clockMen,
      clockRunnerDropbacks: a.clockKey.clockRunnerDropbacks + b.clockKey.clockRunnerDropbacks,
    },
  };
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
    disguisedDropbacks: a.play.disguisedDropbacks + b.play.disguisedDropbacks,
    disguisedDropbacksByMask: mergeCounters(a.play.disguisedDropbacksByMask, b.play.disguisedDropbacksByMask),
    frontLookDropbacks: a.play.frontLookDropbacks + b.play.frontLookDropbacks,
    frontLookDropbacksByLook: mergeCounters(a.play.frontLookDropbacksByLook, b.play.frontLookDropbacksByLook),
    threatOrigins: mergeCounters(a.play.threatOrigins, b.play.threatOrigins),
    threatOriginDropbacks: mergeCounters(a.play.threatOriginDropbacks, b.play.threatOriginDropbacks),
    pocket: mergePocketFold(a.play.pocket, b.play.pocket),
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
