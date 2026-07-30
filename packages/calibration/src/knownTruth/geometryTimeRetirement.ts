/**
 * ============================================================================
 * RULING 2 — THREAT RETIREMENT BY GEOMETRY AND BY TIME. A STREAM RECLASSIFIER, NOT A SIMULATION.
 * ============================================================================
 *
 * Backlog entry 1b-ii (roadmap). The owner's ruling: a threat whose path has been redirected past
 * the quarterback's position (GEOMETRY), or whose remaining travel exceeds the time left in the
 * play (TIME), retires. **This is a missing engine state transition, not a tunable** — ADR-049 §9
 * declared exactly that abstention: "no time-based or distance-based threat retirement was priced,
 * because none exists… a sweep cannot price a mechanism the engine does not have."
 *
 * `packages/calibration` does not modify `packages/engine` (Charter — consume the public API only).
 * So this module is NOT a proposal and does not claim to BE the mechanism. It is a POST-HOC
 * RECLASSIFICATION of a stream the engine already produced, using two fields the engine already
 * publishes on `RUSH_THREAT` (`etaTick`, `alignment`) and one it already publishes on `QB_DECISION`
 * (`choice === "STEP_UP"`). It asks: *of the dirty pocket-status ticks this play actually produced,
 * how many would a geometry+time retirement rule have cleaned, HOLDING EVERYTHING ELSE THE
 * QUARTERBACK DID FIXED AT WHAT HE ACTUALLY DID?*
 *
 * ⛔ **THAT HOLD IS A DECLARED LIMIT, NOT A HIDDEN ONE.** A genuinely live retirement rule would
 * also change what the quarterback does next tick — a pocket that reads CLEAN one tick sooner can
 * change a STEP_UP into a HOLD, change whether he is `forcesDecision`-d, change whether a *later*
 * `pass_rush_tick` rep is even rolled (the tick loop stops once an outcome is decided). None of that
 * is recomputed here. This module can only ever produce a LOWER BOUND on the mechanism's reach on
 * PRESSURE, and it cannot speak to SACK or COMPLETION at all — those outcomes are QB decisions made
 * against the real stream, not against this one. Both limits are asserted by the self-check below,
 * never smuggled past a reader as "the sack rate under Ruling 2".
 *
 * ================== THE TWO RULES, EXACTLY AS APPLIED ==================
 *
 * **GEOMETRY.** On a published `QB_DECISION{choice:"STEP_UP"}` at tick T, every threat whose
 * `alignment === "EDGE"` and which is still live in the counterfactual set at T retires — not
 * delayed, RETIRED — because a QB who has climbed past an edge rusher's arc is not still on that
 * rusher's path. Interior threats are untouched: §7.2's own doc reasoning (`resolve/rushThreat.ts`)
 * is that an interior rusher's straight-line arc converges on roughly the space a step-up uses, so
 * climbing does not take him out of the play the way it takes an edge rusher out. A rusher who wins
 * a FRESH rep after being geometry-retired (a new `TRAVELLING` publication, not a `DELAYED` one)
 * re-enters the live set — he beat his man again, from wherever the launch point now is.
 *
 * **TIME.** A threat instance retires for its entire published life if its `etaTick` exceeds the
 * play's ACTUAL terminal tick — the tick the play in fact resolved at. This is a RETROSPECTIVE test
 * (the terminal tick is only known once the whole play has been replayed), which is exactly why it
 * is a reclassification and not a runtime rule: a live engine cannot know in advance when a play
 * will end. It is the retrospective statement of the football claim ("he did not have the ground to
 * cover before the ball went") on the one horizon this instrument can actually measure.
 *
 * ================== WHY THE ORDERING BUG MAKES THE EXISTING TUNABLE THE WRONG INSTRUMENT ==================
 *
 * `packages/engine/src/sim/passPlay.ts`'s tick loop tests `startsThreat(rush.band)` BEFORE
 * `clearsThreat(tunables, rush.band)` (an `if / else if` chain). `RUSHER_WINS_REP`'s OWN
 * `pressureProgressByBand.RUSHER_WINS_REP.reset` flag is therefore dead code: a rusher who keeps
 * winning his rep can never reach the `clearsThreat` branch on a tick he wins, whatever that band's
 * `reset` flag says. `threatSupplyPatches.ts`'s `retireOn` (the P2 "ceiling") already excludes
 * `RUSHER_WINS_REP` from the bands it can turn on for exactly this reason — it is the only
 * tunable-expressible retirement mechanism, and it is capped BY THE ORDERING at "a threat lives one
 * tick unless re-won", never able to retire a threat on a tick where the same rusher wins again.
 *
 * Geometry and time retirement, as ruled, must NOT be so capped — a rusher who is ridden past the
 * pocket stays past it even if he keeps beating his man on the ARC he is no longer running toward
 * the ball. Expressing that requires a genuine branch reorder or an independent geometry/time check
 * ahead of `startsThreat`, which is `match-engine`'s change to make, not calibration's. This module
 * is the priced argument for that petition, not a substitute for it.
 *
 * ================== WHAT WOULD MAKE THIS INSTRUMENT GO RED (backlog entry 55) ==================
 *
 * | claim | what reddens it |
 * |---|---|
 * | the reclassifier reproduces the real stream with both rules off | `identityMismatches > 0` on the arrival-only base — asserted by the harness, not merely printed |
 * | geometry only touches EDGE | a mismatch between `geometryRetiredThreats` and a hand count restricted to EDGE-aligned `RUSH_THREAT`s |
 * | time retirement is retrospective, not a live rule | any caller reading `timeRetired` before the play's terminal tick is known |
 * | the pursuit-clock reconstruction agrees with the engine | `identityMismatches > 0` on a play carrying a `QB_PURSUIT` event |
 *
 * ================== ADR-054 — THE §8.8 PURSUIT CLOCK IS NOW RECONSTRUCTABLE, NOT EXCLUDED ==================
 *
 * §8.8's pursuit clock used to have no publication at all, so every play carrying a `scramble` CHECK
 * had to be excluded wholesale (entry 58; 34.5% of dropbacks at supply=15, 22.2% at supply=45 — the
 * population most likely to differ, removed from exactly the measurement built to compare channels).
 * `QB_PURSUIT` (`sinceTick`, `deadlineTick`, `rollRef`) now publishes exactly what the engine's own
 * `activeThreats` computes for those ticks — ADR-054 verified this is the SOLE determinant of
 * `POCKET_STATUS` once a scramble is live, because `activeThreats` (`sim/passPlay.ts:1489-1512`)
 * discards every §7.1 matchup entirely and substitutes one synthetic clock the instant
 * `scramble !== undefined`, and the tick loop never re-enters rep resolution, RUSH_THREAT
 * publication, or STEP_UP/ESCAPE logic once that branch is live (`sim/passPlay.ts:771-804` always
 * either `continue`s or `break`s before line 806's `hasArrived`/`forcesDecision` block is reached
 * again). So from the tick `QB_PURSUIT` is observed onward, this module stops reading the
 * `RUSH_THREAT`-fed `real`/`cf` mirrors (which the engine itself has abandoned) and reconstructs
 * `POCKET_STATUS` from `floorFromArrival(tunables, deadlineTick − curTick)` instead — the same
 * function, the same inputs the engine's own `pocketFloorFromArrival` reads, only sourced from the
 * published clock rather than a live matchup array.
 *
 * ⛔ RULING 2's GEOMETRY/TIME RETIREMENT DOES NOT APPLY TO THE PURSUIT CLOCK. It is scoped to §7.1's
 * THREAT model (a rusher who beat his blocker); the pursuit clock is a different mechanism entirely
 * (a quarterback outrunning containment) with no `ThreatOrigin` and no blocker to retire against. A
 * `QB_DECISION{choice:"STEP_UP"}` cannot occur once pursuit is live (the branch that emits it is
 * unreachable, per the trace above), so the geometry rule is naturally inert there; the pursuit-clock
 * floor is applied to BOTH the identity prediction and the counterfactual prediction, unchanged by
 * either rule, because the counterfactual only ever diverges from identity by RETIRING something, and
 * nothing in this module retires a pursuit clock.
 */
import type { MatchEventEnvelope, PocketStatus, RushAlignment } from "@ff/contracts";
import type { Tunables } from "@ff/engine";

/**
 * `pocketFloorFromArrival`, restated. `packages/engine/src/resolve/rushThreat.ts` is not exported
 * from `@ff/engine`'s public surface (`src/index.ts` category 1/2/3 — the sim entry points, their
 * input/output types, and the tunables-patch interface; no internal resolver). This is therefore a
 * DERIVATION off the same three PUBLIC tunables fields (`arrival.immediateWithinSeconds`,
 * `collapsingWithinSeconds`, `pressureWithinSeconds`), asserted to agree with the engine's own
 * function by the identity self-check in `reclassifyGame` — never trusted by construction.
 */
export function floorFromArrival(tunables: Tunables, minTta: number | undefined): PocketStatus {
  if (minTta === undefined) return "CLEAN";
  const a = tunables.arrival;
  if (minTta <= a.immediateWithinSeconds) return "IMMEDIATE";
  if (minTta <= a.collapsingWithinSeconds) return "COLLAPSING";
  if (minTta <= a.pressureWithinSeconds) return "PRESSURE";
  return "CLEAN";
}

interface LiveThreat {
  alignment: RushAlignment;
  etaTick: number;
  timeRetired: boolean;
  geometryRetired: boolean;
}

export interface DropbackReclass {
  readonly identityPressured: boolean;
  readonly counterfactualPressured: boolean;
  readonly identityChecks: number;
  readonly identityMismatches: number;
  /** Distinct rushers geometry-retired at least once on this play. */
  readonly geometryRetiredThreats: number;
  /** Distinct threat instances (by rusher id at first publication) time-retired on this play. */
  readonly timeRetiredThreats: number;
  readonly finalTick: number;
}

function processPlay(
  buf: readonly MatchEventEnvelope[],
  finalTick: number,
  tunables: Tunables,
): DropbackReclass {
  const real = new Map<string, LiveThreat>();
  const cf = new Map<string, LiveThreat>();
  let curTick = 0;
  let identityPressured = false;
  let counterfactualPressured = false;
  let identityChecks = 0;
  let identityMismatches = 0;
  const geometryRetiredIds = new Set<string>();
  const timeRetiredIds = new Set<string>();
  // §8.8's PURSUIT CLOCK (ADR-054). Once set, it is the SOLE determinant of `POCKET_STATUS` for the
  // rest of the play — see the module header. It is applied to BOTH the identity and counterfactual
  // predictions identically: Ruling 2 has no rule that reaches a mechanism with no blocker to
  // retire against, so the two predictions never diverge once this is live.
  let pursuitDeadlineTick: number | undefined;

  const minTtaOf = (map: ReadonlyMap<string, LiveThreat>, excludeRetired: boolean): number | undefined => {
    let min: number | undefined;
    for (const t of map.values()) {
      if (excludeRetired && (t.timeRetired || t.geometryRetired)) continue;
      const tta = t.etaTick - curTick;
      if (min === undefined || tta < min) min = tta;
    }
    return min;
  };

  for (const envelope of buf) {
    const event = envelope.event;
    switch (event.type) {
      case "TICK":
        curTick = event.payload.tick;
        break;
      case "QB_PURSUIT":
        // One publication per escape (ADR-054 §3): the deadline never moves once set, so a later
        // event of this type on the same play cannot occur — nothing runs step-up/escape logic
        // again while `scramble !== undefined` (`sim/passPlay.ts:771-804`).
        pursuitDeadlineTick = event.payload.deadlineTick;
        break;
      case "QB_DECISION": {
        if (event.payload.choice === "STEP_UP") {
          for (const [id, t] of cf) {
            if (t.alignment === "EDGE" && !t.timeRetired && !t.geometryRetired) {
              t.geometryRetired = true;
              geometryRetiredIds.add(id);
            }
          }
        }
        break;
      }
      case "RUSH_THREAT": {
        const id = String(event.payload.rusher);
        const state = event.payload.state;
        if (state === "RESET") {
          real.delete(id);
          cf.delete(id);
          break;
        }
        const { alignment, etaTick } = event.payload;

        // The real-stream mirror: alignment never changes for a threat instance and etaTick is
        // always the freshest published truth, whatever transition carried it.
        real.set(id, { alignment, etaTick, timeRetired: false, geometryRetired: false });

        const timeRetired = etaTick > finalTick;
        if (timeRetired) timeRetiredIds.add(id);
        const existingCf = cf.get(id);
        if (existingCf === undefined || state === "TRAVELLING") {
          // A fresh win (a NEW or improved threat instance, per `soonerThreat`) re-establishes the
          // rusher: he beat his man again, and geometry retirement does not survive that.
          cf.set(id, { alignment, etaTick, timeRetired, geometryRetired: false });
        } else {
          // DELAYED / ARRIVED — the SAME threat instance continuing. `geometryRetired` persists.
          existingCf.etaTick = etaTick;
          existingCf.timeRetired = timeRetired;
        }
        break;
      }
      case "POCKET_STATUS": {
        identityChecks += 1;
        // Once the pursuit clock is live it is the SOLE determinant (module header) — the engine's
        // own `activeThreats` has discarded every §7.1 matchup, so the `real`/`cf` mirrors below are
        // reading a threat model the engine itself has stopped consulting. Both predictions read the
        // same published clock; Ruling 2 has no rule that touches it.
        const minTta = pursuitDeadlineTick === undefined ? minTtaOf(real, false) : pursuitDeadlineTick - curTick;
        const predicted = floorFromArrival(tunables, minTta);
        if (predicted !== event.payload.status) identityMismatches += 1;
        if (event.payload.status !== "CLEAN") identityPressured = true;

        const minTtaCf = pursuitDeadlineTick === undefined ? minTtaOf(cf, true) : pursuitDeadlineTick - curTick;
        const predictedCf = floorFromArrival(tunables, minTtaCf);
        if (predictedCf !== "CLEAN") counterfactualPressured = true;
        break;
      }
      default:
        break;
    }
  }

  return {
    identityPressured,
    counterfactualPressured,
    identityChecks,
    identityMismatches,
    geometryRetiredThreats: geometryRetiredIds.size,
    timeRetiredThreats: timeRetiredIds.size,
    finalTick,
  };
}

export interface GameReclass {
  /**
   * Every PASS dropback in the game. §8.8's pursuit clock no longer forces an exclusion (ADR-054,
   * entry 58) — a play carrying a scramble is reconstructed via `QB_PURSUIT`, not dropped. There is
   * no exclusion count any more because there is no exclusion.
   */
  readonly plays: readonly DropbackReclass[];
}

/**
 * Reclassify every PASS dropback in one game's stream. Non-pass plays are skipped; `isPass` is read
 * off `PLAY_START.payload.kind`, structurally, the same way `metrics/collect.ts` and
 * `threatSupplySweep.test.ts`'s `foldSide` do — the payload is `unknown` in `@ff/contracts` by
 * design (§7 of the contracts spec), so every reader of it is a structural read, not a cast.
 */
export function reclassifyGame(events: readonly MatchEventEnvelope[], tunables: Tunables): GameReclass {
  const out: DropbackReclass[] = [];
  let buf: MatchEventEnvelope[] = [];
  let isPass = false;
  let tick = 0;

  const flush = (): void => {
    if (isPass && buf.length > 0) {
      out.push(processPlay(buf, tick, tunables));
    }
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
    if (event.type === "TICK") tick = event.payload.tick;
  }
  flush();
  return { plays: out };
}
