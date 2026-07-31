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
 * through the PUBLIC `tunables.pocket.minimumStatusByBand`.
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
 * | a rusher's counter is read only where he has a blocker | a `pass_rush_tick` CHECK with no matching matchup — cannot happen structurally, since the CHECK IS the matchup's own publication |
 */
import type { MatchEventEnvelope, PocketStatus, RushAlignment } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { floorFromArrival } from "./geometryTimeRetirement.js";
import { severityOf } from "./pocketLadder.js";

export const CHANNEL_IDS = ["counter", "bandFloor", "arrival"] as const;
export type ChannelId = (typeof CHANNEL_IDS)[number];

interface RusherState {
  pressure: number;
  previousBand: string | undefined;
}

interface RealThreat {
  alignment: RushAlignment;
  etaTick: number;
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
 */
export function reconstructPlay(buf: readonly MatchEventEnvelope[], tunables: Tunables): PlayChannelReclass {
  const rushers = new Map<string, RusherState>();
  const real = new Map<string, RealThreat>();
  let curTick = 0;
  let pursuitDeadlineTick: number | undefined;
  let identityChecks = 0;
  let identityMismatches = 0;
  const ticks: TickChannels[] = [];

  // The argmin of `real` by time-to-arrival, plus its alignment. Ties broken by Map iteration
  // order (insertion order); not disambiguated further because `passRush.bands`' §7.1 travel
  // times are per-alignment constants, so two tied rushers of the SAME alignment agree on the
  // answer this field exists to give, and a tie ACROSS alignments is a separate, rarer question
  // this field does not claim to answer (see the report's abstention).
  const minThreatOf = (): { readonly tta: number; readonly alignment: RushAlignment } | undefined => {
    let min: number | undefined;
    let alignment: RushAlignment | undefined;
    for (const t of real.values()) {
      const tta = t.etaTick - curTick;
      if (min === undefined || tta < min) {
        min = tta;
        alignment = t.alignment;
      }
    }
    return min === undefined || alignment === undefined ? undefined : { tta: min, alignment };
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
        const prior = rushers.get(rusherId) ?? { pressure: 0, previousBand: undefined };
        const pressure = update.reset ? 0 : Math.max(0, prior.pressure + update.delta);
        rushers.set(rusherId, { pressure, previousBand: band });
        break;
      }
      case "RUSH_THREAT": {
        const id = String(event.payload.rusher);
        const state = event.payload.state;
        if (state === "RESET") {
          real.delete(id);
          break;
        }
        real.set(id, { alignment: event.payload.alignment, etaTick: event.payload.etaTick });
        break;
      }
      case "POCKET_STATUS": {
        identityChecks += 1;
        let counter: PocketStatus;
        let bandFloor: PocketStatus;
        let arrival: PocketStatus;
        let arrivalAlignment: RushAlignment | undefined;
        if (pursuitDeadlineTick !== undefined) {
          // §8.8 live: channels 1 and 2 are pinned CLEAN by construction (module header). The
          // pursuit clock has no single rusher to attribute an alignment to (it replaces the
          // whole threat set), so `arrivalAlignment` is `undefined` here by construction too.
          counter = "CLEAN";
          bandFloor = "CLEAN";
          arrival = floorFromArrival(tunables, pursuitDeadlineTick - curTick);
          arrivalAlignment = undefined;
        } else {
          const highest = [...rushers.values()].reduce((m, r) => Math.max(m, r.pressure), 0);
          const previousBands = [...rushers.values()].flatMap((r) =>
            r.previousBand === undefined ? [] : [r.previousBand],
          );
          counter = statusFromCounter(tunables, highest);
          bandFloor = statusFromBandFloor(tunables, previousBands);
          const minThreat = minThreatOf();
          arrival = floorFromArrival(tunables, minThreat?.tta);
          arrivalAlignment = minThreat?.alignment;
        }
        const predicted = worstOf(tunables, worstOf(tunables, counter, bandFloor), arrival);
        if (predicted !== event.payload.status) identityMismatches += 1;
        ticks.push({ published: event.payload.status, counter, bandFloor, arrival, arrivalAlignment });
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
 */
export function reconstructGame(
  events: readonly MatchEventEnvelope[],
  tunables: Tunables,
): readonly PlayChannelReclass[] {
  const out: PlayChannelReclass[] = [];
  let buf: MatchEventEnvelope[] = [];
  let isPass = false;

  const flush = (): void => {
    if (isPass && buf.length > 0) out.push(reconstructPlay(buf, tunables));
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
