/**
 * ============================================================================
 * ROADMAP 1d, STEP 1 — THE THREE CHANNELS' SHARES, MEASURED BEFORE ANYTHING IS PRICED.
 * ============================================================================
 *
 * `pocketStatusFor` (`engine/src/resolve/pocket.ts:194`) reduces three independently-computed
 * channels through `worsePocketStatus`:
 *
 *   1. `pocketStatusFromPressure` — the accumulated per-rusher counter (`m.pressure`, driven by
 *      `passRush.pressureProgressByBand`).
 *   2. `pocketFloorFor` — the PREVIOUS tick's own §7.1 band, read through `pocket.minimumStatusByBand`.
 *   3. `pocketFloorFromArrival` — the nearest live threat's time-to-arrival, including §8.8's
 *      pursuit clock once a scramble is live (ADR-054, `QB_PURSUIT`).
 *
 * The owner's standing constraint (backlog 1d, and the reason it exists): over-determination has
 * already cost two dispatches (entry 40, ADR-050's ruling) because a channel was priced without
 * first establishing whether it was BINDING. This module measures BINDING-NESS — never prices a
 * tunable, never proposes a value. `packages/engine/src/tunables.ts` is not written by anything
 * here.
 *
 * ================== HOW THIS RECONSTRUCTS EACH CHANNEL, FROM THE PUBLIC STREAM ONLY ==================
 *
 * `packages/calibration` does not import `packages/engine`'s internal resolvers (Charter — public
 * API only, ADR-012). Every quantity below is read off the STREAM plus PUBLIC `Tunables` fields,
 * exactly as `geometryTimeRetirement.ts` already does for channel 3 alone. This module extends the
 * same discipline to channels 1 and 2, and — because the three must be judged TOGETHER — asserts a
 * single stronger identity: the reconstructed worst-of-three must equal the published
 * `POCKET_STATUS`, tick for tick, corpus-wide. That is the falsifier for the whole file; see
 * `reconstructPlay`'s `identityMismatches`.
 *
 * **Channel 1 (counter).** `pass_rush_tick` CHECKs publish `actors: [rusher, blocker]`, `band` and
 * `margin` (ADR-011, ADR-042) on every tick a matchup has a blocker. Per rusher, the counter evolves
 * exactly as `advancePressure` does in the engine: `resetsPressure ? 0 : max(0, current + delta)`,
 * where `{delta, resetsPressure}` is read off the PUBLIC `tunables.passRush.pressureProgressByBand`,
 * keyed by the published `band`. `pocketStatusFromPressure` is then a direct read of the PUBLIC
 * `tunables.pocket.thresholds` against the maximum counter across rushers.
 *
 * **Channel 2 (band floor).** The same `pass_rush_tick` CHECK's `band`, worst-of across rushers
 * through the PUBLIC `tunables.pocket.minimumStatusByBand` — WITH ONE NARROWING SINCE ADR-058
 * (August 2026, "arrival is authoritative for a won rep"): a `"RUSHER_WINS_REP"` band is excluded
 * from this channel's own worst-of whenever that rusher's threat is STILL LIVE (tracked by the
 * SAME `real` map channel 3 already maintains — see below), because arrival floors that tick
 * instead. This mirrors `sim/passPlay.ts`'s own `previousBands` filter at its call site
 * EXACTLY — see `reconstructPlay`'s `POCKET_STATUS` case for the one-line test and its citation
 * of `pocketStatus.test.ts`'s dormancy suite. A won rep whose threat was TIME-RETIRED the same
 * tick (arrival cannot see it) still reaches this channel, per ADR-058's own carve-out.
 *
 * **Channel 3 (arrival).** Unchanged from `geometryTimeRetirement.ts`'s `real` mirror:
 * `RUSH_THREAT` (`etaTick`) plus, since ADR-054, `QB_PURSUIT` (`deadlineTick`) once a scramble is
 * live — see that module's header for the full argument for why the pursuit clock supersedes the
 * matchup-fed mirror entirely rather than augmenting it.
 *
 * **ONE STRUCTURAL FACT, TRACED RATHER THAN RE-DERIVED FROM SCRATCH: CHANNELS 1 AND 2 ARE PINNED AT
 * CLEAN FROM THE TICK `QB_PURSUIT` IS OBSERVED.** `sim/passPlay.ts:911-922` sets `m.pressure = 0`
 * and `m.previousBand = undefined` for every matchup the instant a scramble begins, and the §7.1
 * rep-resolution block that would otherwise touch either only runs `if (scramble === undefined)`
 * (`:506`) — never again once pursuit starts. So this module does not need a `RESET`-style event to
 * clear its own per-rusher counters; it simply treats channels 1 and 2 as CLEAN for the rest of the
 * play once `QB_PURSUIT` is observed, exactly mirroring the engine's own frozen state. The identity
 * check is what proves this trace correct rather than merely asserting it.
 *
 * ================== WHAT WOULD MAKE THIS INSTRUMENT GO RED ==================
 *
 * | claim | what reddens it |
 * |---|---|
 * | the three-channel reconstruction reproduces the published stream | `identityMismatches > 0` |
 * | channels 1/2 are CLEAN for the rest of the play once QB_PURSUIT fires | a mismatch on a tick after `QB_PURSUIT` that only a live counter/band-floor value could explain |
 * | channel 2 narrows exactly the way `sim/passPlay.ts` narrows it (ADR-058) | a mismatch on a won-rep tick — the signature this narrowing was added to eliminate; see CALIBRATION-BACKLOG entries 105-109 and ADR-058 for the pre-narrowing baseline these figures are compared against |
 * | a rusher's counter is read only where he has a blocker | a `pass_rush_tick` CHECK with no matching matchup — cannot happen structurally, since the CHECK IS the matchup's own publication |
 */
import type { MatchEventEnvelope, PlayerId, PocketStatus, Position, RushAlignment, RushMove } from "@ff/contracts";
import type { GameSnapshot, Tunables } from "@ff/engine";
import { floorFromArrival } from "./geometryTimeRetirement.js";
import { severityOf } from "./pocketLadder.js";

export const CHANNEL_IDS = ["counter", "bandFloor", "arrival"] as const;
export type ChannelId = (typeof CHANNEL_IDS)[number];

/**
 * `PlayerId → Position`, off the SAME `GameSnapshot` every call site already builds a game from
 * (`BuiltFixture.snapshot`) — never an engine internal. This is what makes the depth-offset mirror
 * below possible at all: the event stream never publishes a rusher's `Position` (`RUSH_THREAT` and
 * `PLAY_START.defense.rush`'s `ResolvedRushAssignment` carry `alignment`, never `position`), so the
 * one place this module can get it honestly is the roster data calibration already owns.
 */
export function positionsFromSnapshot(snapshot: GameSnapshot): ReadonlyMap<PlayerId, Position> {
  const map = new Map<PlayerId, Position>();
  for (const team of [snapshot.home, snapshot.away]) {
    for (const player of Object.values(team.players)) {
      map.set(player.bio.id, player.bio.position);
    }
  }
  return map;
}

/**
 * §7.4's THREE STARTING DEPTHS, reimplemented off PUBLIC `Tunables` only —
 * `resolve/rushThreat.ts`'s `freeRunnerDepthFor` is not on `@ff/engine`'s barrel (ADR-012; it is a
 * resolver, category the barrel's own header explicitly trims), so this is the SAME "DUPLICATED ON
 * PURPOSE" discipline `reconstructedTravelSecondsFor` below already follows, extended one function
 * earlier in the chain: `tunables.blitzPickup.freeRunnerPath.{onLinePositions,deepPositions,
 * defaultDepthClass}` are the exact three PUBLIC lists the engine's own resolver reads, verified
 * against `packages/engine/src/resolve/rushThreat.ts`'s `freeRunnerDepthFor` line for line, not
 * assumed to match because the names look similar.
 */
export type ReconstructedDepth = "LINE" | "BOX" | "DEEP";

export function reconstructedDepthFor(tunables: Tunables, position: Position): ReconstructedDepth {
  const t = tunables.blitzPickup.freeRunnerPath;
  const onLine: readonly string[] = t.onLinePositions;
  if (onLine.includes(position)) return "LINE";
  const deep: readonly string[] = t.deepPositions;
  if (deep.includes(position)) return "DEEP";
  return t.defaultDepthClass;
}

interface RusherState {
  pressure: number;
  previousBand: string | undefined;
  /**
   * The `margin` field of the SAME `pass_rush_tick` CHECK that produced `previousBand`, on the
   * same tick (`resolve/passRush.ts:85-99` publishes both on one CHECK). Kept so a fresh
   * `RUSH_THREAT{state:"TRAVELLING"}` for this rusher, seen immediately afterward in the same
   * tick's block, can be attributed to the margin that won it — backlog entry 110's move-cell
   * census below needs it and `margin` is not otherwise carried anywhere in `real`.
   */
  lastMargin: number | undefined;
}

interface RealThreat {
  alignment: RushAlignment;
  etaTick: number;
  /**
   * ============================================================================
   * ENTRY 110's MOVE-CELL ATTRIBUTION — captured ONLY at the tick a WON REP freshly starts a
   * threat (`RUSH_THREAT{state:"TRAVELLING"}` immediately following a `pass_rush_tick` CHECK
   * banded `RUSHER_WINS_REP` for the same rusher), and left UNTOUCHED by a later `DELAYED`
   * publication for the same id.
   *
   * WHY THIS SHAPE. `move` (`RushMove` — SPEED/POWER/FINESSE) is never published on any event
   * (`packages/contracts/src/events.ts`'s `RUSH_THREAT` carries `alignment`, not `move`). But
   * `resolve/rushThreat.ts`'s `travelSecondsFor(tunables, alignment, move, margin)` is a PURE
   * function of three PUBLIC quantities — `tunables.arrival.travelSecondsByAlignmentAndMove`,
   * `tunables.arrival.dominanceMarginPerHalfTick/quantizeSeconds/min|maxTravelSeconds`, and
   * `tunables.passRush.bands` for `RUSHER_WINS_REP`'s own `minMargin` — so the ACTUAL travel this
   * rep produced (`etaTick − wonAtTick`, both public) can be matched against each move's PUBLIC
   * candidate to recover which one the engine used, the same reimplementation discipline
   * `floorFromArrival` above already uses for `pocketFloorFromArrival` ("DUPLICATED ON PURPOSE",
   * `resolve/rushThreat.ts`'s own comment). See `classifyMoveCell` below for the match.
   *
   * `wonMargin === undefined` for every threat this reconstruction cannot attribute to a live
   * `pass_rush_tick` win it saw — a free runner or looper (no blocker, no CHECK ever fires for
   * them, `sim/passPlay.ts:598`) or a `DELAYED` update for an id this reconstruction never saw
   * TRAVELLING (should not occur, but left honestly undefined rather than guessed at). BandFloor
   * had zero reach in the free-runner/looper population regardless (entry 109 item B), so
   * excluding them from the move-cell census costs nothing this census claims to answer.
   * ============================================================================
   */
  wonMargin: number | undefined;
  /** `etaTick − wonAtTick` at the moment `wonMargin` was captured — the OBSERVED travel, in
   *  seconds, that the move-cell match below compares against each move's PUBLIC candidate. */
  wonTravelSeconds: number | undefined;
}

export interface TickChannels {
  readonly published: PocketStatus;
  readonly counter: PocketStatus;
  readonly bandFloor: PocketStatus;
  readonly arrival: PocketStatus;
  /**
   * The alignment of the rusher whose ETA is the argmin of `real` at this tick — i.e. the rusher
   * channel 3's own value is READ OFF, when there is one. `undefined` when the pursuit clock is
   * live (§8.8 replaces the whole rusher-keyed threat set, per the module header — there is no
   * single rusher to attribute the clock to) or when `real` is empty (arrival is CLEAN and has no
   * argmin). Added for backlog 1f-RESULT's Finding 3 follow-up: whether the arrival+bandFloor tie
   * is INTERIOR-driven (where the two constants meet exactly) or EDGE (where they do not) is a
   * question about the SAME argmin rusher this field names — no new reconstruction, only a second
   * field read off state `reconstructPlay` already carries.
   */
  readonly arrivalAlignment: RushAlignment | undefined;
  /**
   * `RealThreat.wonMargin` / `.wonTravelSeconds` of the SAME argmin-arrival rusher `arrivalAlignment`
   * names, read off the SAME `minThreatOf()` call — no second attribution, no new reconstruction.
   * `undefined` under the identical conditions `arrivalAlignment` is (pursuit clock live, `real`
   * empty, or the argmin threat has no attributable win — see `RealThreat`'s own doc). Entry 110's
   * move-cell census (`classifyMoveCell`, below) is the sole consumer.
   */
  readonly arrivalWonMargin: number | undefined;
  readonly arrivalWonTravelSeconds: number | undefined;
  /**
   * CALIBRATION-BACKLOG entry 155 — the SAME argmin-arrival rusher's `ReconstructedDepth`, resolved
   * off the `positions` map `reconstructPlay` now takes (see that function's parameter doc). Needed
   * because `travelSecondsFor`'s blocked-path depth-offset term makes `EDGE`'s three move candidates
   * depend on depth as well as margin — `classifyMoveCell` cannot mirror the engine correctly
   * without it. `undefined` under the identical conditions `arrivalWonMargin` is (no attributable
   * win) OR when `positions` has no entry for the argmin rusher's id (an unresolvable position is
   * left honestly undefined rather than guessed at, the same convention `wonMargin` already uses).
   */
  readonly arrivalDepth: ReconstructedDepth | undefined;
  /**
   * ENTRY 110 PART C — the bandFloor channel's PRE-ADR-058 value: `statusFromBandFloor` over EVERY
   * `previousBand`, with none omitted for liveness. `bandFloor` (above) is the NARROWED,
   * currently-authoritative value the engine actually publishes (ADR-058); this sibling field is
   * the counterfactual "what would bandFloor have floored here under the superseded rule" —
   * computed from the SAME `rushers` map, at zero extra event-stream reads, so the two can be
   * compared tick-for-tick to price ADR-058's actual severity effect per cell without a second
   * simulation. Identical to `bandFloor` on every tick where no live `RUSHER_WINS_REP` band was
   * omitted (the overwhelming majority — non-won-rep ticks); differs only where ADR-058 bites.
   */
  readonly bandFloorUnnarrowed: PocketStatus;
}

export interface PlayChannelReclass {
  readonly ticks: readonly TickChannels[];
  readonly identityChecks: number;
  readonly identityMismatches: number;
}

function pressureUpdateFor(
  tunables: Tunables,
  band: string,
): { delta: number; reset: boolean } {
  const table = tunables.passRush.pressureProgressByBand as Readonly<
    Record<string, { readonly delta: number; readonly reset: boolean }>
  >;
  const row = table[band];
  if (row === undefined) {
    throw new RangeError(
      `pocketChannelShares: "${band}" (published on a pass_rush_tick CHECK) is not a row of ` +
        `passRush.pressureProgressByBand — the stream published a band this tunables tree does not know.`,
    );
  }
  return { delta: row.delta, reset: row.reset };
}

function statusFromCounter(tunables: Tunables, highestPressure: number): PocketStatus {
  const thresholds = tunables.pocket.thresholds as readonly {
    readonly label: PocketStatus;
    readonly minProgress: number;
  }[];
  for (const t of thresholds) {
    if (highestPressure >= t.minProgress) return t.label;
  }
  return "CLEAN";
}

/**
 * Worst-of across whatever bands are HANDED to it. Since ADR-058, the caller (the `POCKET_STATUS`
 * case in `reconstructPlay`, below) is responsible for OMITTING a live won rep's band before
 * calling this — this function itself is untouched by the ADR and has no way to know about
 * liveness on its own, exactly the division of labour `resolve/pocket.ts`'s own `pocketFloorFor`
 * doc comment describes for the engine's identical function.
 */
function statusFromBandFloor(tunables: Tunables, previousBands: readonly string[]): PocketStatus {
  const table = tunables.pocket.minimumStatusByBand as Readonly<Record<string, PocketStatus>>;
  let floor: PocketStatus = "CLEAN";
  for (const band of previousBands) {
    const rowStatus = table[band];
    if (rowStatus === undefined) {
      throw new RangeError(
        `pocketChannelShares: "${band}" is not a row of pocket.minimumStatusByBand.`,
      );
    }
    if (severityOf(rowStatus, tunables) > severityOf(floor, tunables)) floor = rowStatus;
  }
  return floor;
}

function worstOf(tunables: Tunables, a: PocketStatus, b: PocketStatus): PocketStatus {
  return severityOf(b, tunables) > severityOf(a, tunables) ? b : a;
}

/**
 * Reconstruct every `POCKET_STATUS` tick of one PASS dropback's own event buffer into its three
 * channel values plus the published truth. `buf` is exactly one play's slice (see
 * `reclassifyPlaysInGame` below for how a game's stream is split into these).
 *
 * `positions` is REQUIRED, not optional-with-a-silent-default — CALIBRATION-BACKLOG entry 155's
 * fix. It is the ONLY way this module can learn a rusher's `Position` (the event stream never
 * publishes one; see `positionsFromSnapshot`'s own doc), and `arrivalDepth` — needed to mirror
 * `travelSecondsFor`'s now-nonzero depth-offset term correctly — has no other source. An optional
 * parameter here would let a caller silently keep the old (now-wrong) behaviour; per the owner's
 * ruling this dispatch acts on, a reconstruction that can silently diverge is worse than one that
 * does not exist, so every caller must supply real roster data or fail to compile.
 */
export function reconstructPlay(
  buf: readonly MatchEventEnvelope[],
  tunables: Tunables,
  positions: ReadonlyMap<PlayerId, Position>,
): PlayChannelReclass {
  const rushers = new Map<string, RusherState>();
  const real = new Map<string, RealThreat>();
  let curTick = 0;
  let pursuitDeadlineTick: number | undefined;
  let identityChecks = 0;
  let identityMismatches = 0;
  const ticks: TickChannels[] = [];

  // The argmin of `real` by time-to-arrival, plus its alignment and (entry 155) its resolved
  // depth. Ties broken by Map iteration order (insertion order); not disambiguated further because
  // `passRush.bands`' §7.1 travel times are per-alignment constants, so two tied rushers of the SAME
  // alignment agree on the answer this field exists to give, and a tie ACROSS alignments is a
  // separate, rarer question this field does not claim to answer (see the report's abstention).
  const minThreatOf = ():
    | {
        readonly tta: number;
        readonly alignment: RushAlignment;
        readonly wonMargin: number | undefined;
        readonly wonTravelSeconds: number | undefined;
        readonly depth: ReconstructedDepth | undefined;
      }
    | undefined => {
    let min: number | undefined;
    let alignment: RushAlignment | undefined;
    let wonMargin: number | undefined;
    let wonTravelSeconds: number | undefined;
    let rusherId: string | undefined;
    for (const [id, t] of real) {
      const tta = t.etaTick - curTick;
      if (min === undefined || tta < min) {
        min = tta;
        alignment = t.alignment;
        wonMargin = t.wonMargin;
        wonTravelSeconds = t.wonTravelSeconds;
        rusherId = id;
      }
    }
    if (min === undefined || alignment === undefined) return undefined;
    const position = rusherId === undefined ? undefined : positions.get(rusherId as unknown as PlayerId);
    const depth = position === undefined ? undefined : reconstructedDepthFor(tunables, position);
    return { tta: min, alignment, wonMargin, wonTravelSeconds, depth };
  };

  for (const envelope of buf) {
    const event = envelope.event;
    switch (event.type) {
      case "TICK":
        curTick = event.payload.tick;
        break;
      case "QB_PURSUIT":
        pursuitDeadlineTick = event.payload.deadlineTick;
        break;
      case "QB_DECISION": {
        // `resolvePocketMovement`'s STEP_UP branch (`sim/passPlay.ts:828-842`) zeroes an EDGE
        // rusher's pressure counter as a SIDE EFFECT of the climb — `m.pressure = 0`, gated on the
        // PUBLIC `pocketMovement.stepUp.resetsEdgePressure` — with no CHECK of its own to publish
        // it. It is published only indirectly, via the `RUSH_THREAT{state:"DELAYED"}` that fires
        // in the same loop iteration for the same rusher. Without this, channel 1 silently drifts
        // from the engine's own counter on every STEP_UP against a live EDGE threat — this is the
        // gap the identity check (module header) exists to catch, and it found it.
        if (event.payload.choice === "STEP_UP" && tunables.pocketMovement.stepUp.resetsEdgePressure) {
          for (const [id, t] of real) {
            if (t.alignment !== "EDGE") continue;
            const prior = rushers.get(id);
            if (prior !== undefined) rushers.set(id, { ...prior, pressure: 0 });
          }
        }
        break;
      }
      case "CHECK": {
        if (event.payload.checkKind !== "pass_rush_tick") break;
        const actors = event.payload.actors;
        const band = event.payload.band;
        if (!Array.isArray(actors) || actors.length === 0 || typeof band !== "string") break;
        const rusherId = String(actors[0]);
        const update = pressureUpdateFor(tunables, band);
        const prior = rushers.get(rusherId) ?? { pressure: 0, previousBand: undefined, lastMargin: undefined };
        const pressure = update.reset ? 0 : Math.max(0, prior.pressure + update.delta);
        rushers.set(rusherId, { pressure, previousBand: band, lastMargin: event.payload.margin });
        break;
      }
      case "RUSH_THREAT": {
        const id = String(event.payload.rusher);
        const state = event.payload.state;
        if (state === "RESET") {
          real.delete(id);
          break;
        }
        const alignment = event.payload.alignment;
        const etaTick = event.payload.etaTick;
        if (state === "DELAYED") {
          // A recovering blocker's push (`delayThreat`) shifts `etaTick` without re-deriving from
          // move/margin — the move identity this rep started with does not change, so it is
          // CARRIED, not recomputed, from whatever `real.get(id)` already held (entry 110's own
          // header: "the shove doesn't change which move he used").
          const prior = real.get(id);
          real.set(id, {
            alignment,
            etaTick,
            wonMargin: prior?.wonMargin,
            wonTravelSeconds: prior?.wonTravelSeconds,
          });
          break;
        }
        // TRAVELLING — a fresh threat. Attribute it to a won rep ONLY if this reconstruction saw
        // the `pass_rush_tick` CHECK that produced it: `startsThreat` fires exclusively off
        // `RUSHER_WINS_REP` (`sim/passPlay.ts:622-629`'s own compile-time-enforced claim), so a
        // matching `rushers.get(id)` with that exact `previousBand`, on THIS tick, is the win.
        // Anything else (a free runner/looper's first publication) has no matching CHECK by
        // construction and is correctly left unattributed — see `RealThreat`'s own doc.
        const rusherState = rushers.get(id);
        const wonHere =
          rusherState?.previousBand === "RUSHER_WINS_REP" ? rusherState.lastMargin : undefined;
        real.set(id, {
          alignment,
          etaTick,
          wonMargin: wonHere,
          wonTravelSeconds: wonHere === undefined ? undefined : Number((etaTick - curTick).toFixed(1)),
        });
        break;
      }
      case "POCKET_STATUS": {
        identityChecks += 1;
        let counter: PocketStatus;
        let bandFloor: PocketStatus;
        let bandFloorUnnarrowed: PocketStatus;
        let arrival: PocketStatus;
        let arrivalAlignment: RushAlignment | undefined;
        let arrivalWonMargin: number | undefined;
        let arrivalWonTravelSeconds: number | undefined;
        let arrivalDepth: ReconstructedDepth | undefined;
        if (pursuitDeadlineTick !== undefined) {
          // §8.8 live: channels 1 and 2 are pinned CLEAN by construction (module header). The
          // pursuit clock has no single rusher to attribute an alignment to (it replaces the
          // whole threat set), so `arrivalAlignment` is `undefined` here by construction too.
          counter = "CLEAN";
          bandFloor = "CLEAN";
          bandFloorUnnarrowed = "CLEAN";
          arrival = floorFromArrival(tunables, pursuitDeadlineTick - curTick);
          arrivalAlignment = undefined;
          arrivalWonMargin = undefined;
          arrivalWonTravelSeconds = undefined;
          arrivalDepth = undefined;
        } else {
          const highest = [...rushers.values()].reduce((m, r) => Math.max(m, r.pressure), 0);
          // ADR-058 — ARRIVAL IS AUTHORITATIVE FOR A WON REP IT CAN SEE. Mirrors
          // `sim/passPlay.ts`'s own `previousBands` filter exactly: a won rep
          // (band `"RUSHER_WINS_REP"`) whose threat is STILL LIVE is omitted from
          // what feeds `statusFromBandFloor`, because channel 3 (`arrival`, below)
          // already floors that tick off the actual time-to-arrival — finer-grained
          // than this channel's blanket COLLAPSING, and sometimes lower (a slower
          // EDGE win) or higher (an interior win, IMMEDIATE). `real.has(id)` is
          // EXACTLY the liveness test the engine reads as `m.threat !== undefined`:
          // both are populated by the identical `RUSH_THREAT`
          // TRAVELLING/DELAYED-sets, RESET-deletes rule (see the `RUSH_THREAT` case
          // below), so this invents no second notion of "live" — it is the same
          // `liveAtTick` reconstruction `engine/test/pocketStatus.test.ts`'s ADR-058
          // dormancy suite builds, mirrored rather than reinvented (Charter §4.1).
          // Only a won rep whose threat was TIME-RETIRED the same tick it was won
          // (`real.has(id)` false again by the time this fires) still reaches the
          // array — the carve-out `tunables.pocket.minimumStatusByBand
          // .RUSHER_WINS_REP`'s own comment names, measured at 6-in-40,000 plays.
          const previousBands = [...rushers.entries()].flatMap(([id, r]) => {
            if (r.previousBand === undefined) return [];
            if (r.previousBand === "RUSHER_WINS_REP" && real.has(id)) return [];
            return [r.previousBand];
          });
          // ENTRY 110 PART C — the SAME `rushers` map, with NO liveness omission: the PRE-ADR-058
          // reading, kept alongside the narrowed one above rather than instead of it. Costs one
          // more `flatMap` over state already held; no new event reads.
          const previousBandsUnnarrowed = [...rushers.values()].flatMap((r) =>
            r.previousBand === undefined ? [] : [r.previousBand],
          );
          counter = statusFromCounter(tunables, highest);
          bandFloor = statusFromBandFloor(tunables, previousBands);
          bandFloorUnnarrowed = statusFromBandFloor(tunables, previousBandsUnnarrowed);
          const minThreat = minThreatOf();
          arrival = floorFromArrival(tunables, minThreat?.tta);
          arrivalAlignment = minThreat?.alignment;
          arrivalWonMargin = minThreat?.wonMargin;
          arrivalWonTravelSeconds = minThreat?.wonTravelSeconds;
          arrivalDepth = minThreat?.depth;
        }
        const predicted = worstOf(tunables, worstOf(tunables, counter, bandFloor), arrival);
        if (predicted !== event.payload.status) identityMismatches += 1;
        ticks.push({
          published: event.payload.status,
          counter,
          bandFloor,
          arrival,
          arrivalAlignment,
          arrivalWonMargin,
          arrivalWonTravelSeconds,
          arrivalDepth,
          bandFloorUnnarrowed,
        });
        break;
      }
      default:
        break;
    }
  }

  return { ticks, identityChecks, identityMismatches };
}

/**
 * Split one game's stream into PASS dropbacks and reconstruct each. Same PLAY_START/`kind` read as
 * `geometryTimeRetirement.ts`'s `reclassifyGame` — a structural read of an `unknown` payload
 * (§7 of the contracts spec), never a cast.
 *
 * `positions` — REQUIRED, threaded straight through to every `reconstructPlay` call this makes; see
 * that function's own doc. `positionsFromSnapshot(built.snapshot)` is the sanctioned way to build it.
 */
export function reconstructGame(
  events: readonly MatchEventEnvelope[],
  tunables: Tunables,
  positions: ReadonlyMap<PlayerId, Position>,
): readonly PlayChannelReclass[] {
  const out: PlayChannelReclass[] = [];
  let buf: MatchEventEnvelope[] = [];
  let isPass = false;

  const flush = (): void => {
    if (isPass && buf.length > 0) out.push(reconstructPlay(buf, tunables, positions));
    buf = [];
    isPass = false;
  };

  for (const envelope of events) {
    const event = envelope.event;
    if (event.type === "PLAY_START") {
      flush();
      const payload = event.payload;
      isPass =
        typeof payload === "object" && payload !== null && (payload as { kind?: unknown }).kind === "PASS_PLAY_V1";
    }
    buf.push(envelope);
  }
  flush();
  return out;
}

// ---------------------------------------------------------------------------
// SHARE / TIE-STRUCTURE / EXCLUSIVE-SHARE AGGREGATION
// ---------------------------------------------------------------------------

export interface ChannelFold {
  /** Every POCKET_STATUS tick observed, of any status. */
  allTicks: number;
  /** Ticks where the published status is non-CLEAN. */
  dirtyTicks: number;
  /** channel id → count of DIRTY ticks where the channel achieves the published severity (winner, incl. ties). */
  winner: Record<ChannelId, number>;
  /** channel id → count of DIRTY ticks where the channel is the UNIQUE max. */
  alone: Record<ChannelId, number>;
  /** channel id → count of DIRTY ticks where the channel ties with ≥1 other at the max. */
  tied: Record<ChannelId, number>;
  /** channel id → count of ALL ticks where the channel alone is non-CLEAN and the other two are CLEAN. */
  exclusiveOfAll: Record<ChannelId, number>;
  /** the same numerator, expressed against the dirty-tick denominator instead. */
  exclusiveOfDirty: Record<ChannelId, number>;
  /** tie-structure: which SUBSET of channels ties for the max, over dirty ticks. Key: sorted channel ids joined by "+". */
  winnerSubsets: Map<string, number>;
}

function emptyRecord(): Record<ChannelId, number> {
  return { counter: 0, bandFloor: 0, arrival: 0 };
}

export function emptyChannelFold(): ChannelFold {
  return {
    allTicks: 0,
    dirtyTicks: 0,
    winner: emptyRecord(),
    alone: emptyRecord(),
    tied: emptyRecord(),
    exclusiveOfAll: emptyRecord(),
    exclusiveOfDirty: emptyRecord(),
    winnerSubsets: new Map<string, number>(),
  };
}

export function foldTick(fold: ChannelFold, tick: TickChannels, tunables: Tunables): void {
  fold.allTicks += 1;
  const values: Record<ChannelId, PocketStatus> = {
    counter: tick.counter,
    bandFloor: tick.bandFloor,
    arrival: tick.arrival,
  };
  const sev: Record<ChannelId, number> = {
    counter: severityOf(tick.counter, tunables),
    bandFloor: severityOf(tick.bandFloor, tunables),
    arrival: severityOf(tick.arrival, tunables),
  };

  // EXCLUSIVE SHARE — over ALL ticks (owner addition): channel i alone is non-CLEAN.
  for (const id of CHANNEL_IDS) {
    const others = CHANNEL_IDS.filter((j) => j !== id);
    const isExclusive = values[id] !== "CLEAN" && others.every((j) => values[j] === "CLEAN");
    if (isExclusive) fold.exclusiveOfAll[id] += 1;
  }

  const published = tick.published;
  if (published === "CLEAN") return; // dirty-tick-scoped measures below; CLEAN tallied above already
  fold.dirtyTicks += 1;

  const M = Math.max(sev.counter, sev.bandFloor, sev.arrival);
  const winners = CHANNEL_IDS.filter((id) => sev[id] === M);
  for (const id of winners) {
    fold.winner[id] += 1;
    if (winners.length === 1) fold.alone[id] += 1;
    else fold.tied[id] += 1;
  }
  const subsetKey = [...winners].sort().join("+");
  fold.winnerSubsets.set(subsetKey, (fold.winnerSubsets.get(subsetKey) ?? 0) + 1);

  for (const id of CHANNEL_IDS) {
    const others = CHANNEL_IDS.filter((j) => j !== id);
    const isExclusive = values[id] !== "CLEAN" && others.every((j) => values[j] === "CLEAN");
    if (isExclusive) fold.exclusiveOfDirty[id] += 1;
  }
}

// ---------------------------------------------------------------------------
// STATUS PARTITION — the 1f-RESULT abstention: which STATUS a dirty tick emitted, cross-cut
// against the SAME winner/alone/tied/exclusive columns above. See CALIBRATION-BACKLOG.md
// 1f-RESULT, "THE ABSTENTION THAT GATES THE NEXT DISPATCH". `pocketChannelShares.ts` partitioned
// dirty ticks by WINNING CHANNEL only; this partitions by the CHANNEL and the EMITTED STATUS
// together, by calling `foldTick` a second time into a per-status accumulator. No new
// reconstruction, no new falsifier: the same `TickChannels` stream, the same `foldTick`.
// ---------------------------------------------------------------------------

/** The three statuses a dirty tick can carry. `CLEAN` ticks are excluded by definition. */
export const DIRTY_STATUSES = ["PRESSURE", "COLLAPSING", "IMMEDIATE"] as const;
export type DirtyStatus = (typeof DIRTY_STATUSES)[number];

export interface StatusPartitionedFold {
  /** Identical to running `foldTick` alone over every tick — the un-partitioned table. */
  readonly overall: ChannelFold;
  /** One `ChannelFold` per emitted status, fed ONLY the ticks whose `published` equals that key. */
  readonly byStatus: Record<DirtyStatus, ChannelFold>;
}

export function emptyStatusPartitionedFold(): StatusPartitionedFold {
  return {
    overall: emptyChannelFold(),
    byStatus: {
      PRESSURE: emptyChannelFold(),
      COLLAPSING: emptyChannelFold(),
      IMMEDIATE: emptyChannelFold(),
    },
  };
}

/**
 * Fold one tick into both the overall accumulator and (if dirty) its status-keyed accumulator.
 *
 * ⚠ **WHY `allTicks === dirtyTicks` INSIDE EVERY `byStatus` ENTRY, AND WHY THAT IS CORRECT AND NOT
 * A BUG.** Each `byStatus[S]` accumulator is fed exclusively ticks with `published === S`, which is
 * by definition never `CLEAN`, so every tick handed to it is dirty by `foldTick`'s own test. The
 * ALL-ticks and DIRTY-ticks denominators therefore coincide inside a status partition — there is no
 * CLEAN population left to distinguish them from, once the partition has already fixed the status.
 * `EXCLUSIVE / all ticks` and `EXCLUSIVE / dirty ticks` are consequently IDENTICAL columns within
 * each `byStatus[S]` table; both are still reported, unreduced, so a reader can see that identity
 * rather than take it on faith.
 */
export function foldTickByStatus(fold: StatusPartitionedFold, tick: TickChannels, tunables: Tunables): void {
  foldTick(fold.overall, tick, tunables);
  if (tick.published === "CLEAN") return;
  foldTick(fold.byStatus[tick.published], tick, tunables);
}

export function mergeStatusPartitionedFold(a: StatusPartitionedFold, b: StatusPartitionedFold): void {
  mergeChannelFold(a.overall, b.overall);
  for (const s of DIRTY_STATUSES) mergeChannelFold(a.byStatus[s], b.byStatus[s]);
}

function mergeChannelFold(a: ChannelFold, b: ChannelFold): void {
  a.allTicks += b.allTicks;
  a.dirtyTicks += b.dirtyTicks;
  for (const id of CHANNEL_IDS) {
    a.winner[id] += b.winner[id];
    a.alone[id] += b.alone[id];
    a.tied[id] += b.tied[id];
    a.exclusiveOfAll[id] += b.exclusiveOfAll[id];
    a.exclusiveOfDirty[id] += b.exclusiveOfDirty[id];
  }
  for (const [k, v] of b.winnerSubsets) a.winnerSubsets.set(k, (a.winnerSubsets.get(k) ?? 0) + v);
}

// ---------------------------------------------------------------------------
// THE ALIGNMENT SPLIT — 1f-RESULT Finding 3's unmeasured decomposition of the arrival+bandFloor
// tie, taken cheaply off the SAME reconstruction because `TickChannels.arrivalAlignment` was
// already available (added above). NOT a new instrument: same ticks, same `severityOf`, one more
// field read off state `reconstructPlay` already carried.
//
// ⚠ WHAT THIS DOES AND DOES NOT ESTABLISH. It reports the alignment of the rusher whose ETA
// determines channel 3's value on ticks where channels 2 and 3 are TIED FOR THE MAX (winning
// subset exactly `{arrival, bandFloor}`). It does NOT establish that this is the SAME rusher who
// set the band floor (channel 2's `previousBand` is a worst-of across all rushers with a live
// matchup, tracked independently of `real`, and can persist from an earlier tick after the
// argmin-by-arrival rusher has changed) — see the report's abstention on this exact point.
// ---------------------------------------------------------------------------

export interface TieAlignmentSplit {
  /** Ties where the argmin-arrival rusher is INTERIOR — the exact-coincidence case Finding 3 named. */
  interior: number;
  /** Ties where the argmin-arrival rusher is EDGE — travel 1.5–2.0s, not the coincident case. */
  edge: number;
  /** Ties with no attributable alignment (pursuit clock live, or no live threat) — see header. */
  unattributed: number;
}

export function emptyTieAlignmentSplit(): TieAlignmentSplit {
  return { interior: 0, edge: 0, unattributed: 0 };
}

/**
 * Fold one tick into the arrival+bandFloor tie-alignment split, using the IDENTICAL winner
 * computation `foldTick` uses (severity-max, ties by equal severity) so the subset this measures
 * is exactly the `"arrival+bandFloor"` row of `ChannelFold.winnerSubsets`.
 */
export function foldTieAlignmentSplit(acc: TieAlignmentSplit, tick: TickChannels, tunables: Tunables): void {
  if (tick.published === "CLEAN") return;
  const sev: Record<ChannelId, number> = {
    counter: severityOf(tick.counter, tunables),
    bandFloor: severityOf(tick.bandFloor, tunables),
    arrival: severityOf(tick.arrival, tunables),
  };
  const M = Math.max(sev.counter, sev.bandFloor, sev.arrival);
  const winners = CHANNEL_IDS.filter((id) => sev[id] === M);
  if (winners.length !== 2 || !winners.includes("arrival") || !winners.includes("bandFloor")) return;
  if (tick.arrivalAlignment === "INTERIOR") acc.interior += 1;
  else if (tick.arrivalAlignment === "EDGE") acc.edge += 1;
  else acc.unattributed += 1;
}

// ---------------------------------------------------------------------------
// ENTRY 110's MOVE-CELL CENSUS — "INTERIOR TIES / EDGE DISAGREES" narrowed to the six
// alignment×move cells, DERIVED from public tunables rather than taking any margin threshold
// (e.g. entry 110's own report of "65") as given. Reuses ONLY `RealThreat.wonMargin` /
// `.wonTravelSeconds`, already carried on `TickChannels` above — no new reconstruction.
//
// THE ARITHMETIC BEING MATCHED (`resolve/rushThreat.ts`'s `travelSecondsFor`, reimplemented here
// off PUBLIC `Tunables` only — the same "DUPLICATED ON PURPOSE" discipline that function's own
// comment states for `pocketFloorFromArrival`/`floorFromArrival`):
//
//   dominanceSteps = floor(max(0, margin − winMinMargin) / dominanceMarginPerHalfTick)
//   raw            = travelSecondsByAlignmentAndMove[alignment][move] − dominanceSteps × quantizeSeconds
//   travel         = clamp(round(raw / quantizeSeconds) × quantizeSeconds, minTravelSeconds, maxTravelSeconds)
//
// `winMinMargin` is `passRush.bands`' own `RUSHER_WINS_REP` row — the margin `startsThreat` requires
// before any of this runs at all — so `dominanceThresholdMarginFor` below is `winMinMargin +
// dominanceMarginPerHalfTick`, DERIVED, not the literal "65" entry 110 read off a report.
//
// WHY MOVE IS RECOVERABLE AT ALL. `move` is never published (see `RealThreat`'s doc above), but
// `travelSecondsFor` is a pure function of PUBLIC `tunables` plus `(alignment, move, margin)`, and
// `margin`/`alignment`/the OBSERVED travel (`etaTick − wonAtTick`) are all public. So for a given
// `(alignment, margin)` this module can compute EVERY move's candidate travel and ask which one the
// observed travel actually equals — recovering `move` by elimination rather than reading it.
//
// WHERE THIS IS GENUINELY AMBIGUOUS, STATED RATHER THAN HIDDEN.
//   - POWER and FINESSE are publicly INDISTINGUISHABLE AT THE COMMITTED TREE, and ONLY because of
//     that tree's own values, NOT as a structural fact about `travelSecondsByAlignmentAndMove`'s
//     shape: the table gives them the identical base at every alignment TODAY (INTERIOR 1.0/1.0,
//     EDGE 1.5/1.5, `tunables.ts:669,671`), so their candidates coincide at every margin ON THIS
//     TREE. Nothing in the classifier ASSUMES that coincidence — `classifyMoveCell` computes all
//     three candidates (SPEED/POWER/FINESSE) independently and merges POWER and FINESSE into
//     `EDGE_NOT_SPEED` only when their candidates actually agree at the observed travel. Move either
//     cell (`EDGE.POWER` or `EDGE.FINESSE`) off `1.5` and the merge stops happening automatically:
//     a POWER-only or FINESSE-only win reports as `EDGE_POWER` / `EDGE_FINESSE`, not folded into
//     `EDGE_NOT_SPEED` or silently misclassified as `EDGE_UNRECONCILED`. Per entry 110's own table
//     this costs nothing at the committed tree: both rows read "TIES" unconditionally there, so the
//     merge does not blur the tie/disagree question ON THAT TREE.
//   - SPEED's and the merged NOT_SPEED candidate coincide too, but only once margin is high enough
//     that BOTH have hit `minTravelSeconds`'s clamp floor — `EDGE_HIGH_MARGIN_AMBIGUOUS` names that
//     zone explicitly rather than folding it into either bucket silently.
//   - A FIFTH, DISTINCT ambiguity a sweep of `travelSecondsByAlignmentAndMove` surfaces (entry 83's
//     accidental-equality class, recurring): at an off-committed arm where `EDGE.POWER` or
//     `EDGE.FINESSE` is swept to `2.0` — the value `EDGE.SPEED` is COMMITTED at — SPEED's candidate
//     coincides with exactly one of POWER/FINESSE while the other still diverges. That is not the
//     three-way clamp coincidence above; it is two of the three candidates landing on the same
//     number by construction of the arm, and the third disagreeing. `EDGE_SPEED_AMBIGUOUS_WITH_OTHER`
//     names that zone separately, rather than either (a) folding it into `EDGE_HIGH_MARGIN_AMBIGUOUS`
//     (which would claim all three tied when only two did) or (b) resolving it to a bucket the
//     stream cannot actually support (which would claim a separation that does not exist). This
//     ambiguity is real and is reported, not classified away.
// ---------------------------------------------------------------------------

/** `tunables.passRush.bands`'s own `RUSHER_WINS_REP.minMargin` — the margin floor `startsThreat`
 *  requires before ANY threat in this census exists at all. `?? 15` only guards a shape the
 *  registry's own type does not allow; the committed tree always has the row. */
function winMinMarginFor(tunables: Tunables): number {
  const bands = tunables.passRush.bands as readonly {
    readonly label: string;
    readonly minMargin: number;
  }[];
  return bands.find((b) => b.label === "RUSHER_WINS_REP")?.minMargin ?? 15;
}

/**
 * ⛔ **THE DERIVED THRESHOLD** — replaces entry 110's "margin >= 65" (read off a report) with the
 * arithmetic that produces it: `winMinMargin + dominanceMarginPerHalfTick`. At the committed tree
 * (`15 + 50`) this is `65`, reproducing entry 110's figure, but as a computation rather than a
 * citation — a future change to either constant moves this function's answer with it.
 */
export function dominanceThresholdMarginFor(tunables: Tunables): number {
  return winMinMarginFor(tunables) + tunables.arrival.dominanceMarginPerHalfTick;
}

/**
 * `travelSecondsFor`, reimplemented off public `Tunables` only (see the section header).
 *
 * ✅ **CALIBRATION-BACKLOG entry 155's depth-offset term is MIRRORED, not ignored** — the prior
 * version of this comment (and a runtime tripwire that lived here) documented the opposite; both
 * were removed by the same dispatch that made the claim true rather than left standing beside code
 * that had outgrown it (Charter §4.1: a stale comment surviving its own fix is a defect this
 * register has catalogued repeatedly). `depth` is REQUIRED, not optional — mirroring
 * `reconstructPlay`'s own "no silent old behaviour" rule one layer down: `raw` now sums
 * `tunables.arrival.blockedDepthOffsetSecondsByAlignmentAndDepth[alignment][depth]` exactly where
 * the engine's `travelSecondsFor` does, before `Math.round`, alongside `base` and the dominance
 * shave. See `docConformance.test.ts` / the module header for the empirical agreement proof this
 * mirror was checked against, corpus-wide, before being trusted.
 */
export function reconstructedTravelSecondsFor(
  tunables: Tunables,
  alignment: RushAlignment,
  move: RushMove,
  margin: number,
  depth: ReconstructedDepth,
): number {
  const t = tunables.arrival;
  const table = t.travelSecondsByAlignmentAndMove as Readonly<
    Record<RushAlignment, Readonly<Record<RushMove, number>>>
  >;
  const offsets = t.blockedDepthOffsetSecondsByAlignmentAndDepth as Readonly<
    Record<RushAlignment, Readonly<Record<ReconstructedDepth, number>>>
  >;
  const base = table[alignment][move];
  const dominanceSteps = Math.floor(Math.max(0, margin - winMinMarginFor(tunables)) / t.dominanceMarginPerHalfTick);
  const raw = base - dominanceSteps * t.quantizeSeconds + offsets[alignment][depth];
  const quantized = Math.round(raw / t.quantizeSeconds) * t.quantizeSeconds;
  return Number(Math.min(t.maxTravelSeconds, Math.max(t.minTravelSeconds, quantized)).toFixed(1));
}

export type MoveCell =
  | "INTERIOR"
  /** POWER's and FINESSE's candidates coincide at the observed travel, and SPEED's does not — the
   *  merge is a CONSEQUENCE of the two committed values agreeing (`EDGE.POWER === EDGE.FINESSE`),
   *  checked below rather than assumed. Splits into `EDGE_POWER` / `EDGE_FINESSE` the moment either
   *  cell is moved off the other. */
  | "EDGE_NOT_SPEED"
  /** POWER's candidate alone matches — POWER and FINESSE have DIVERGED (an off-committed arm) and
   *  only POWER accounts for the observed travel. Never occurs at the committed tree, where POWER
   *  and FINESSE always coincide. */
  | "EDGE_POWER"
  /** FINESSE's candidate alone matches — the mirror of `EDGE_POWER`. Never occurs at the committed
   *  tree. */
  | "EDGE_FINESSE"
  | "EDGE_SPEED_DOMINANT"
  | "EDGE_SPEED_NONDOMINANT"
  /** All three candidates (SPEED, POWER, FINESSE) coincide at the observed travel — the three-way
   *  tie, typically both SPEED and the (coinciding) POWER/FINESSE pair having hit
   *  `minTravelSeconds`'s clamp floor together. Not a bug, see the section header. */
  | "EDGE_HIGH_MARGIN_AMBIGUOUS"
  /** SPEED's candidate coincides with EXACTLY ONE of POWER/FINESSE, which themselves still diverge
   *  from each other — a genuinely separate ambiguity from `EDGE_HIGH_MARGIN_AMBIGUOUS` (that one
   *  is a three-way tie; this one is a two-way tie with the third candidate still distinguishable).
   *  Only reachable off the committed tree, e.g. sweeping `EDGE.POWER` or `EDGE.FINESSE` to `2.0`,
   *  the value `EDGE.SPEED` is committed at (entry 83's accidental-equality class). Reported
   *  honestly rather than folded into either neighbouring bucket — see the section header. */
  | "EDGE_SPEED_AMBIGUOUS_WITH_OTHER"
  /** Observed travel matched NONE of the three candidates — should never occur; a falsifier, not a
   *  bucket a report should ever cite a nonzero count from. */
  | "EDGE_UNRECONCILED";

/**
 * Classify one argmin-arrival won-rep threat into entry 110's move-cell table (INTERIOR merged,
 * since it is move-invariant BY CONSTRUCTION — see below — and EDGE resolved by computing SPEED,
 * POWER and FINESSE's candidates INDEPENDENTLY and asking which the observed travel actually
 * equals — never by assuming any two of them coincide).
 *
 * INTERIOR needs no move recovery at all, and — CALIBRATION-BACKLOG entry 155 — no depth recovery
 * either, though for a narrower reason than before the depth-offset term existed. `depth` is still
 * accepted (uniformly with the EDGE branch, so no caller needs an alignment-conditional call shape)
 * but is unused here: `travelSecondsByAlignmentAndMove.INTERIOR` is `1.0` for all three moves, and
 * on the REACHABLE INTERIOR depths — `LINE` (base `1.0` + offset `−0.5`, clamps to `minTravelSeconds`
 * `1.0` at every dominance step) and `BOX` (offset `0.0`, `1.0 − dominanceSteps × 0.5` clamps to the
 * same `1.0` floor) — the clamp binds identically either way, so INTERIOR's travel is `1.0` at every
 * margin, move AND reachable depth. `DEEP` (offset `+0.5`) would NOT clamp (`1.0` or `1.5`,
 * genuinely live) and would break this identity — but `INTERIOR ∩ DEEP` is empty at the data level
 * (entry 151, re-derived for this exact table in `sweepTargetPreflight.test.ts`'s `EXCLUDED_TARGETS`
 * entry for `arrival.blockedDepthOffsetSecondsByAlignmentAndDepth.INTERIOR.DEEP`): no
 * `defensiveCards.ts` RUSH duty ever pairs `alignment: "INTERIOR"` with a position `DEEP` resolves
 * to, so this function never observes it in practice. Stated as a fact about the REACHABLE domain,
 * not re-derived as a universal one.
 *
 * ⛔ **THE MERGE IS A CONSEQUENCE, NOT AN ASSUMPTION.** All three candidates are computed
 * separately; `EDGE_NOT_SPEED` is returned only when the POWER and FINESSE candidates actually
 * agree with each other (and with the observation) — which happens on the committed tree because
 * `EDGE.POWER === EDGE.FINESSE === 1.5` there, not because this function takes it on faith. Move
 * either value and the two split into `EDGE_POWER` / `EDGE_FINESSE` automatically. See the section
 * header for the fifth ambiguity (`EDGE_SPEED_AMBIGUOUS_WITH_OTHER`) this independence surfaces.
 */
export function classifyMoveCell(
  tunables: Tunables,
  alignment: RushAlignment,
  depth: ReconstructedDepth,
  margin: number,
  observedTravelSeconds: number,
): MoveCell {
  if (alignment === "INTERIOR") return "INTERIOR";
  const speedCandidate = reconstructedTravelSecondsFor(tunables, "EDGE", "SPEED", margin, depth);
  const powerCandidate = reconstructedTravelSecondsFor(tunables, "EDGE", "POWER", margin, depth);
  const finesseCandidate = reconstructedTravelSecondsFor(tunables, "EDGE", "FINESSE", margin, depth);
  const isSpeed = observedTravelSeconds === speedCandidate;
  const isPower = observedTravelSeconds === powerCandidate;
  const isFinesse = observedTravelSeconds === finesseCandidate;

  // POWER and FINESSE coincide with each other (and with the observation), SPEED does not: the
  // merge, DERIVED from `powerCandidate === finesseCandidate === observedTravelSeconds` holding,
  // not assumed from the tree's shape.
  if (isPower && isFinesse && !isSpeed) return "EDGE_NOT_SPEED";
  if (isSpeed && (isPower || isFinesse)) {
    // SPEED coincides with at least one of POWER/FINESSE. If it coincides with BOTH, all three tie
    // (the pre-existing clamp-floor ambiguity); if with exactly one, POWER and FINESSE have
    // themselves diverged and only one of them also equals SPEED — the fifth, distinct ambiguity.
    return isPower && isFinesse ? "EDGE_HIGH_MARGIN_AMBIGUOUS" : "EDGE_SPEED_AMBIGUOUS_WITH_OTHER";
  }
  if (isSpeed) {
    return margin >= dominanceThresholdMarginFor(tunables) ? "EDGE_SPEED_DOMINANT" : "EDGE_SPEED_NONDOMINANT";
  }
  if (isPower) return "EDGE_POWER";
  if (isFinesse) return "EDGE_FINESSE";
  return "EDGE_UNRECONCILED";
}
