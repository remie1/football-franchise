/**
 * ============================================================================
 * ROADMAP 1e — `arrival.pressureWithinSeconds`'s PATCH AND RECONSTRUCTION VOCABULARY.
 * ============================================================================
 *
 * Shared by `pressureHorizonPlayScope.test.ts` and `pressureHorizonSweep.test.ts`, for the reason
 * `threatSupplyPatches.ts`'s own header gives: two instruments measuring one subject must not be able
 * to drift into measuring two different treatments under one name.
 *
 * ⚠ **MEASUREMENT ONLY.** Every function returns a NEW `Tunables` via `applyTunablePatch`, which
 * refuses a stale `currentValue`. Nothing here writes `packages/engine/src/tunables.ts`.
 *
 * ================== THE SUBJECT ==================
 *
 * `arrival.pressureWithinSeconds` (`packages/engine/src/tunables.ts:700`) is read in exactly ONE
 * place: `pocketFloorFromArrival` (`resolve/rushThreat.ts:402`), the third of three horizons —
 * `immediateWithinSeconds` (0.0), `collapsingWithinSeconds` (1.0), and this one, committed at
 * `POS_INF`. Unlike entry 40's `passRush.bands[RUSHER_WINS_REP].minMargin` (read by three tables) or
 * `pressureProgressByBand[*].reset` (read by two), this cell is a SINGLE mechanism by construction —
 * there is no "committed vs. arrival-only base" confound *on this cell itself*. What IS confounded is
 * the OUTCOME it produces, because `pocketStatusFor` takes the worst of three independently-live
 * channels (arrival, band floor, counter — `pocketChannelShares.ts`), and on the committed tree the
 * other two are frequently ALSO dirty on the same tick (a redundant sufficient cause, ADR-049's
 * finding). So this file runs the grid on TWO bases for the reason ADR-049 gives, not because the
 * cell itself is multi-mechanism: **`committed`** (`DEFAULT_TUNABLES`) prices "how far can this cell
 * move the number with the other two channels live", and **`arrival`**
 * (`threatSupplyPatches.ts`'s `arrivalOnlyBase()`) prices the mechanism alone, with the band floor and
 * counter extinguished so `pocketStatusFor` reduces to `pocketFloorFromArrival` and nothing else.
 *
 * ================== THE GRID, AND WHERE ITS ENDPOINTS COME FROM ==================
 *
 * `POS_INF` (control) plus every half-tick from 1.0 to 4.0. Both ends are READ OFF THE ENGINE, not
 * chosen:
 *
 *   - **1.0 is `arrival.collapsingWithinSeconds`.** At or below it, `pocketFloorFromArrival`'s
 *     PRESSURE branch is UNREACHABLE — every `minTta` that would land there is already caught by the
 *     COLLAPSING branch above it (`pocketBandSweep.test.ts`'s own note on its "inter" stage, and the
 *     reason its horizon grid stops there). It is the natural floor of the reachable domain, not an
 *     arbitrary lower bound.
 *   - **4.0 is `blitzPickup.freeRunnerPath.maxArrivalSeconds`.** No `RUSH_THREAT.etaTick` the engine
 *     can produce exceeds 4.0s of travel from the snap (a won-rep threat is capped at
 *     `arrival.maxTravelSeconds = 3.0`; a free runner at `freeRunnerPath.maxArrivalSeconds = 4.0`).
 *     Above it every arm is necessarily identical to `POS_INF` — a fact the grid is built to SHOW,
 *     not assume, which is why 4.0 is included rather than treated as a known ceiling.
 *
 * The step is 0.5s, the engine's own tick quantum (`arrival.quantizeSeconds`) — no value is invented
 * to a finer resolution than the ETAs it is being compared against actually occupy.
 */
import type { MatchEventEnvelope, PocketStatus } from "@ff/contracts";
import { DEFAULT_TUNABLES, applyTunablePatch, type Tunables } from "@ff/engine";
import { floorFromArrival } from "../src/knownTruth/geometryTimeRetirement.js";
import { severityOf } from "../src/knownTruth/pocketLadder.js";

const EVIDENCE =
  "roadmap 1e — arrival.pressureWithinSeconds horizon sweep. In-memory only; " +
  "packages/engine/src/tunables.ts is not written by this file (ADR-027).";

export const HORIZON_PATH = "arrival.pressureWithinSeconds";
export const HORIZON_COMMITTED: number = DEFAULT_TUNABLES.arrival.pressureWithinSeconds;
export const COLLAPSING_WITHIN: number = DEFAULT_TUNABLES.arrival.collapsingWithinSeconds;
export const IMMEDIATE_WITHIN: number = DEFAULT_TUNABLES.arrival.immediateWithinSeconds;
export const MAX_FREE_RUNNER_ARRIVAL: number =
  DEFAULT_TUNABLES.blitzPickup.freeRunnerPath.maxArrivalSeconds;
export const MAX_WON_REP_TRAVEL: number = DEFAULT_TUNABLES.arrival.maxTravelSeconds;

/** `POS_INF` plus every half-tick from 1.0 (`collapsingWithinSeconds`) to 4.0 (`maxArrivalSeconds`). */
export const HORIZON_GRID: readonly number[] = [
  HORIZON_COMMITTED,
  4.0,
  3.5,
  3.0,
  2.5,
  2.0,
  1.5,
  1.0,
];

export function horizonLabel(value: number): string {
  return value === HORIZON_COMMITTED || !Number.isFinite(value) ? "INF" : value.toFixed(1);
}

/** Move `arrival.pressureWithinSeconds`. A no-op patch when the value already matches (grid's INF row). */
export function horizonAt(value: number, base: Tunables = DEFAULT_TUNABLES): Tunables {
  if (base.arrival.pressureWithinSeconds === value) return base;
  return applyTunablePatch(base, {
    tunableId: HORIZON_PATH,
    currentValue: base.arrival.pressureWithinSeconds,
    proposedValue: value,
    evidence: EVIDENCE,
    expectedEffect:
      "a live threat further than `value` seconds from arrival no longer floors the pocket at " +
      "PRESSURE through the arrival channel; it may still be dirtied by the band floor or the " +
      "accumulated-pressure counter, which this patch does not touch",
  });
}

// ---------------------------------------------------------------------------
// RECONSTRUCTING THE ARRIVAL CHANNEL'S OWN `minTta`, FROM THE PUBLIC STREAM ONLY
// ---------------------------------------------------------------------------
//
// The same event-replay pattern `geometryTimeRetirement.ts`'s `processPlay` and
// `pocketChannelShares.ts`'s `reconstructPlay` already use and validate by an identity check against
// the published stream: a live-threat map keyed by rusher, fed by `RUSH_THREAT`, superseded by
// `QB_PURSUIT`'s deadline once a scramble is live (ADR-054). This file does not need the OTHER two
// channels (band floor, counter) — only what the arrival channel alone would say at each
// `POCKET_STATUS` tick, so a play-scope population predicate can be built without re-deriving the
// three-channel reduction `pocketChannelShares.ts` already owns.

interface LiveThreat {
  readonly etaTick: number;
}

export interface ArrivalTick {
  /** The arrival channel's own `minTta` at this tick; `undefined` when no threat is live. */
  readonly minTta: number | undefined;
  /** The status the ENGINE actually published at this tick (worst of all three channels). */
  readonly published: PocketStatus;
}

/**
 * Every `POCKET_STATUS` tick of one play, reduced to the arrival channel's own `minTta` alongside the
 * published (three-channel) status.
 */
export function arrivalTicksOf(events: readonly MatchEventEnvelope[]): readonly ArrivalTick[] {
  const real = new Map<string, LiveThreat>();
  let curTick = 0;
  let pursuitDeadlineTick: number | undefined;
  const out: ArrivalTick[] = [];

  const minTtaOfReal = (): number | undefined => {
    let min: number | undefined;
    for (const t of real.values()) {
      const tta = t.etaTick - curTick;
      if (min === undefined || tta < min) min = tta;
    }
    return min;
  };

  for (const envelope of events) {
    const event = envelope.event;
    switch (event.type) {
      case "TICK":
        curTick = event.payload.tick;
        break;
      case "QB_PURSUIT":
        pursuitDeadlineTick = event.payload.deadlineTick;
        break;
      case "RUSH_THREAT": {
        const id = String(event.payload.rusher);
        if (event.payload.state === "RESET") {
          real.delete(id);
          break;
        }
        real.set(id, { etaTick: event.payload.etaTick });
        break;
      }
      case "POCKET_STATUS": {
        const minTta = pursuitDeadlineTick === undefined ? minTtaOfReal() : pursuitDeadlineTick - curTick;
        out.push({ minTta, published: event.payload.status });
        break;
      }
      default:
        break;
    }
  }
  return out;
}

/**
 * The LARGEST arrival-channel `minTta` ever observed at a `POCKET_STATUS` tick on this play, or
 * `undefined` if no threat was ever live at a status tick. Lowering `pressureWithinSeconds` to a
 * value below this number is guaranteed to change what `pocketFloorFromArrival` alone would return on
 * at least one tick of this play — which is exactly the play-scope RAW population predicate for a
 * horizon arm at that value: it CANNOT decide anything on a play whose maximum never crosses it.
 */
export function maxArrivalMinTta(events: readonly MatchEventEnvelope[]): number | undefined {
  let max: number | undefined;
  for (const tick of arrivalTicksOf(events)) {
    if (tick.minTta === undefined) continue;
    if (max === undefined || tick.minTta > max) max = tick.minTta;
  }
  return max;
}

/**
 * SELF-CHECK, asserted by every caller rather than trusted: the arrival channel is one of three that
 * `pocketStatusFor` reduces by taking the WORST, so the published status can never be MILDER than
 * what `floorFromArrival` alone would say about the reconstructed `minTta`, on the COMMITTED tree
 * (where the grid's own patches have not moved anything). A violation means this file's `minTta`
 * reconstruction disagrees with the engine's, and every population count downstream is suspect.
 */
export function arrivalNeverExceedsPublished(events: readonly MatchEventEnvelope[]): boolean {
  for (const tick of arrivalTicksOf(events)) {
    const impliedByArrivalAlone = floorFromArrival(DEFAULT_TUNABLES, tick.minTta);
    if (severityOf(impliedByArrivalAlone) > severityOf(tick.published)) return false;
  }
  return true;
}
