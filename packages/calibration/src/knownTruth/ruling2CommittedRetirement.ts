/**
 * ============================================================================
 * RULING 2's RE-MEASUREMENT, ON THE COMMITTED TREE — a fully de-confounded pricing of geometry+time
 * retirement, ON TOP OF what already ships (entry 73's sustained-containment retirement included).
 * ============================================================================
 *
 * CALIBRATION-BACKLOG entries 72/73/76/71-RESULT/68/ADR-049 §9. All three of ruling 2's ORIGINAL
 * confounds are closed (entry 76's dispatch table): the metric was blind to demotions (closed by the
 * census, entry 71-RESULT), `retireOn`'s P2 ceiling was never a confound (59-RESULT — ADR-049 §8 had
 * excluded `RUSHER_WINS_REP` correctly, on football grounds), and the pressure horizon is now bounded
 * at 2.0 (entry 76). `ruling2Dispatch.test.ts` priced ruling 2 on the ARRIVAL-ONLY MECHANISM BASE
 * (`threatSupplyPatches.arrivalOnlyBase()` — channels 1/2 extinguished so `pocketStatusFor` reduces to
 * `pocketFloorFromArrival` alone). This module prices it on the OPPOSITE tree: `DEFAULT_TUNABLES`,
 * unpatched, where `containRetiresAfterConsecutiveContains: 2` (entry 73) is already live and channels
 * 1/2 are live too. The question this module answers: *what does geometry+time retirement add ON TOP
 * OF the committed tree*, not what it is worth in isolation.
 *
 * ⛔ RULING 2 ASKED FOR TWO THINGS ENTRY 73 DID NOT SHIP: retirement by GEOMETRY (a threat whose path
 * has been redirected past the quarterback) and by TIME (a threat whose remaining travel exceeds the
 * time left in the play). Entry 73 shipped a THIRD, adjacent route — sustained containment — which is
 * already inside `DEFAULT_TUNABLES` and therefore already inside every `published` tick this module
 * reads. Neither GEOMETRY nor TIME exists in the engine; both are reclassified here exactly as
 * `geometryTimeRetirement.ts` reclassifies them on the arrival-only base — see that module's header
 * for the full argument, the two rules exactly as applied, and the ordering-bug context. This module
 * does not restate that argument; it extends the SAME two rules to a tree where they are not the only
 * thing that can retire a threat.
 *
 * ================== WHY THIS IS NOT A THIRD INDEPENDENT REIMPLEMENTATION OF CHANNELS 1/2 ==================
 *
 * `pocketChannelShares.reconstructPlay` already reconstructs channel 1 (the pressure counter) and
 * channel 2 (the band floor) against WHATEVER `Tunables` it is handed — including, and this module is
 * the first caller to exercise it this way, the full committed tree with `containRetiresAfterConsecutiveContains`
 * live — with its own identity self-check against the published stream (`pocketChannelShares.test.ts`).
 * Ruling 2 has no rule that touches either channel (`geometryTimeRetirement.ts`'s header: "Ruling 2 has
 * no rule that reaches a mechanism with no blocker to retire against" — the converse holds here too,
 * channels 1/2 read §7.1 band/counter state that geometry and time retirement do not touch). So this
 * module READS `reconstructPlay`'s own `counter`/`bandFloor` per tick rather than re-deriving them a
 * second time. Re-deriving would be exactly the duplicated-implementation risk this project's own
 * doctrine warns against paying for TWICE inside one subsystem — duplication is deliberate ONLY where
 * it buys an independent cross-check, and channels 1/2 already have one, at `pocketChannelShares.ts`'s
 * own boundary. This module's only NEW surface is channel 3 (arrival) under geometry+time retirement,
 * walked a second time over the SAME event buffer and zipped tick-for-tick against `reconstructPlay`'s
 * own tick sequence. Both walks visit the identical `POCKET_STATUS` events, in the identical buffer, in
 * the same order, so the two tick sequences are the same length BY CONSTRUCTION — asserted below
 * (`RangeError`), not assumed.
 *
 * ================== THREE ARMS, GEOMETRY AND TIME SEPARATELY AS WELL AS JOINTLY (entry 37) ==================
 *
 * `geometryOnly` — the GEOMETRY rule alone, TIME held off. `timeOnly` — the TIME rule alone, GEOMETRY
 * held off. `joint` — both rules live together. Each arm tracks its OWN counterfactual threat map, so
 * a threat retired by one arm's rule does not affect another arm's map — the three are genuinely
 * independent reconstructions over the same stream, not one map with two flags flipped in sequence.
 * `identity` is not a fourth arm here: it is `reconstructPlay`'s own published-stream reproduction,
 * asserted at `identityMismatches === 0` corpus-wide, exactly as every sibling instrument in this
 * package asserts it (`geometryTimeRetirement.ts`, `pocketChannelShares.ts`, `bandCensus.ts`).
 *
 * ================== THE OUTCOME VARIABLE IS SEVERITY, NOT THE RATE (entries 67-RESULT/68) ==================
 *
 * Every fold below is keyed by the four-rung `CLEAN | PRESSURE | COLLAPSING | IMMEDIATE` distribution,
 * for `published` and for each arm. `pressure_rate` (the non-CLEAN share) is DERIVABLE from either
 * distribution at render time and is reported ALONGSIDE it in the dispatch, never as the criterion —
 * per entry 68's ruling, a rate counting any non-CLEAN tick is blind to a change that only reshuffles
 * severity, which is exactly what retiring a threat that keeps another channel's floor dirty would do.
 *
 * ================== DEMOTE-VERSUS-CLEAR, THE SAME QUESTION ENTRY 71-RESULT ASKED OF P2 ==================
 *
 * For each arm, of the PUBLISHED ticks that are dirty (non-CLEAN) and where the arm's reconstructed
 * severity is STRICTLY LOWER than published: `cleared` counts the ones where the arm reads CLEAN,
 * `demoted` counts the ones where the arm still reads non-CLEAN, just at a lower rung. `touched` is
 * their sum — the denominator entry 71-RESULT used for the P2 split, restated for geometry/time. A
 * tick the arm leaves at the SAME severity as published (including every tick during the §8.8 pursuit
 * clock, where neither rule can act at all — see below) is not `touched`, by construction: it was never
 * retirement's business, or another channel already held the same floor.
 *
 * ================== WHAT IS HELD (entry 37) — AND ⛔ THE LOWER-BOUND CAVEAT, RESTATED AT FULL STRENGTH ==================
 *
 * Every arm here holds EVERY quarterback decision fixed at what actually happened in the published
 * stream — `geometryTimeRetirement.ts`'s declared limit, restated rather than relaxed by this
 * re-measurement. A live retirement rule would also change what the quarterback does NEXT tick: a
 * pocket that reads CLEAN one tick sooner can turn a STEP_UP into a HOLD, change whether he is
 * `forcesDecision`-d, and change whether a LATER `pass_rush_tick` rep is even rolled (the tick loop
 * stops the instant an outcome is decided). None of that is recomputed here. **This module can only
 * ever produce a LOWER BOUND on the mechanism's reach on SEVERITY, and it cannot speak to SACK or
 * COMPLETION at all** — those are quarterback decisions made against the real stream, not the
 * counterfactual one. A re-measurement does not upgrade a lower bound into a price; that abstention
 * was declared at ruling 2's first pricing and is declared again here, unchanged.
 *
 * Geometry alone holds time retirement off (and vice versa); joint holds neither off. All three hold
 * SUPPLY at whatever `passRush.bands[RUSHER_WINS_REP].minMargin` the caller's `tunables` carries —
 * this module takes no position on Ruling 1's supply correction and is run at whatever the caller
 * passes (the dispatch runs it at `DEFAULT_TUNABLES`, i.e. supply UNCORRECTED, because the brief this
 * module answers is "what does geometry+time add on top of what ships", not a joint Ruling 1 × Ruling
 * 2 price — that joint/separate question is `ruling2Dispatch.test.ts`'s, on its own base).
 *
 * ⛔ RULING 2's GEOMETRY/TIME RETIREMENT DOES NOT APPLY TO THE §8.8 PURSUIT CLOCK, for the identical
 * reason `geometryTimeRetirement.ts` gives: no `ThreatOrigin`, no blocker to retire against, and
 * `QB_DECISION{choice:"STEP_UP"}` cannot occur once pursuit is live. All three arms read the SAME
 * `floorFromArrival(tunables, deadlineTick - curTick)` as `published` for the rest of the play once
 * `QB_PURSUIT` is observed, so no arm can ever register `touched` there — consistent with the
 * arrival-only base's own scoping, restated on this tree.
 *
 * ================== WHAT WOULD MAKE THIS INSTRUMENT GO RED (backlog entry 55) ==================
 *
 * | claim | what reddens it |
 * |---|---|
 * | channels 1/2/3-unmodified reproduce the published stream on THIS tree | `identityMismatches > 0` — `pocketChannelShares.reconstructPlay`'s own falsifier, read here rather than re-derived |
 * | the two walks (channel reconstruction, arm threat-maps) stay in lockstep | `RangeError` the instant their `POCKET_STATUS` counts diverge, per play |
 * | a published status ever falls outside the four-rung ladder | `RangeError` from `severityOf`/`bumpSeverity` |
 * | geometry retirement is confined to arms with the rule enabled | `timeOnly`'s `geometryRetiredThreats` — structurally zero, the STEP_UP loop is gated `if (!ARM_FLAGS[arm].geometry) continue` before it ever touches that arm's map |
 * | time retirement is confined to arms with the rule enabled | `geometryOnly`'s `timeRetiredThreats` — structurally zero, `timeRetired` is computed as `flags.time && etaTick > finalTick` |
 * | no arm can register `touched` during the pursuit clock | not separately asserted; follows from all arms reading the identical `floorFromArrival(tunables, deadlineTick - curTick)` there, same as `published` |
 */
import type { MatchEventEnvelope, PocketStatus, RushAlignment } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { floorFromArrival } from "./geometryTimeRetirement.js";
import { reconstructPlay } from "./pocketChannelShares.js";
import { severityOf } from "./pocketLadder.js";

export const RETIREMENT_ARMS = ["geometryOnly", "timeOnly", "joint"] as const;
export type RetirementArm = (typeof RETIREMENT_ARMS)[number];

const ARM_FLAGS: Readonly<Record<RetirementArm, { readonly geometry: boolean; readonly time: boolean }>> = {
  geometryOnly: { geometry: true, time: false },
  timeOnly: { geometry: false, time: true },
  joint: { geometry: true, time: true },
};

interface LiveThreat {
  alignment: RushAlignment;
  etaTick: number;
  timeRetired: boolean;
  geometryRetired: boolean;
}

export interface SeverityCounts {
  CLEAN: number;
  PRESSURE: number;
  COLLAPSING: number;
  IMMEDIATE: number;
}

function emptySeverityCounts(): SeverityCounts {
  return { CLEAN: 0, PRESSURE: 0, COLLAPSING: 0, IMMEDIATE: 0 };
}

function bumpSeverity(counts: SeverityCounts, status: PocketStatus): void {
  if (status === "CLEAN" || status === "PRESSURE" || status === "COLLAPSING" || status === "IMMEDIATE") {
    counts[status] += 1;
    return;
  }
  throw new RangeError(
    `ruling2CommittedRetirement: "${status}" is outside the four-rung severity ladder ` +
      "(CLEAN/PRESSURE/COLLAPSING/IMMEDIATE) — a published POCKET_STATUS this module does not expect.",
  );
}

export interface DemoteClearCounts {
  /** dirty published ticks where this arm's reconstructed severity is strictly lower than published. */
  touched: number;
  /** subset of `touched` where the arm still reads non-CLEAN, just a lower rung. */
  demoted: number;
  /** subset of `touched` where the arm reads CLEAN. */
  cleared: number;
}

function emptyDemoteClear(): DemoteClearCounts {
  return { touched: 0, demoted: 0, cleared: 0 };
}

export interface Ruling2Fold {
  dropbacks: number;
  allTicks: number;
  /** `pocketChannelShares.reconstructPlay`'s own identity check, summed across every play folded. */
  identityChecks: number;
  identityMismatches: number;
  published: SeverityCounts;
  arm: Record<RetirementArm, SeverityCounts>;
  armDemoteClear: Record<RetirementArm, DemoteClearCounts>;
  /** distinct threat instances (by rusher id at first retirement) geometry-retired, per arm. */
  geometryRetiredThreats: Record<RetirementArm, number>;
  /** distinct threat instances time-retired, per arm. */
  timeRetiredThreats: Record<RetirementArm, number>;
}

export function emptyRuling2Fold(): Ruling2Fold {
  return {
    dropbacks: 0,
    allTicks: 0,
    identityChecks: 0,
    identityMismatches: 0,
    published: emptySeverityCounts(),
    arm: {
      geometryOnly: emptySeverityCounts(),
      timeOnly: emptySeverityCounts(),
      joint: emptySeverityCounts(),
    },
    armDemoteClear: {
      geometryOnly: emptyDemoteClear(),
      timeOnly: emptyDemoteClear(),
      joint: emptyDemoteClear(),
    },
    geometryRetiredThreats: { geometryOnly: 0, timeOnly: 0, joint: 0 },
    timeRetiredThreats: { geometryOnly: 0, timeOnly: 0, joint: 0 },
  };
}

const SEVERITY_KEYS = ["CLEAN", "PRESSURE", "COLLAPSING", "IMMEDIATE"] as const;

export function mergeRuling2Fold(a: Ruling2Fold, b: Ruling2Fold): void {
  a.dropbacks += b.dropbacks;
  a.allTicks += b.allTicks;
  a.identityChecks += b.identityChecks;
  a.identityMismatches += b.identityMismatches;
  for (const s of SEVERITY_KEYS) {
    a.published[s] += b.published[s];
    for (const arm of RETIREMENT_ARMS) a.arm[arm][s] += b.arm[arm][s];
  }
  for (const arm of RETIREMENT_ARMS) {
    a.armDemoteClear[arm].touched += b.armDemoteClear[arm].touched;
    a.armDemoteClear[arm].demoted += b.armDemoteClear[arm].demoted;
    a.armDemoteClear[arm].cleared += b.armDemoteClear[arm].cleared;
    a.geometryRetiredThreats[arm] += b.geometryRetiredThreats[arm];
    a.timeRetiredThreats[arm] += b.timeRetiredThreats[arm];
  }
}

function worstOf(tunables: Tunables, a: PocketStatus, b: PocketStatus): PocketStatus {
  return severityOf(b, tunables) > severityOf(a, tunables) ? b : a;
}

/**
 * Fold one PASS dropback's own event slice into `fold`. See the module header for why channels 1/2
 * are READ off `reconstructPlay` rather than re-derived, and for the lockstep invariant asserted below.
 */
export function foldPlayRuling2(
  fold: Ruling2Fold,
  buf: readonly MatchEventEnvelope[],
  finalTick: number,
  tunables: Tunables,
): void {
  const channels = reconstructPlay(buf, tunables);
  fold.identityChecks += channels.identityChecks;
  fold.identityMismatches += channels.identityMismatches;

  const armMaps: Record<RetirementArm, Map<string, LiveThreat>> = {
    geometryOnly: new Map(),
    timeOnly: new Map(),
    joint: new Map(),
  };
  const geoIds: Record<RetirementArm, Set<string>> = {
    geometryOnly: new Set(),
    timeOnly: new Set(),
    joint: new Set(),
  };
  const timeIds: Record<RetirementArm, Set<string>> = {
    geometryOnly: new Set(),
    timeOnly: new Set(),
    joint: new Set(),
  };

  const minTtaOf = (map: ReadonlyMap<string, LiveThreat>, curTick: number): number | undefined => {
    let min: number | undefined;
    for (const t of map.values()) {
      if (t.timeRetired || t.geometryRetired) continue;
      const tta = t.etaTick - curTick;
      if (min === undefined || tta < min) min = tta;
    }
    return min;
  };

  let curTick = 0;
  let pocketIndex = 0;
  let pursuitDeadlineTick: number | undefined;
  let dropbackCounted = false;

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
        if (event.payload.choice === "STEP_UP") {
          for (const arm of RETIREMENT_ARMS) {
            if (!ARM_FLAGS[arm].geometry) continue;
            for (const [id, t] of armMaps[arm]) {
              if (t.alignment === "EDGE" && !t.timeRetired && !t.geometryRetired) {
                t.geometryRetired = true;
                geoIds[arm].add(id);
              }
            }
          }
        }
        break;
      }
      case "RUSH_THREAT": {
        const id = String(event.payload.rusher);
        const state = event.payload.state;
        if (state === "RESET") {
          for (const arm of RETIREMENT_ARMS) armMaps[arm].delete(id);
          break;
        }
        const { alignment, etaTick } = event.payload;
        for (const arm of RETIREMENT_ARMS) {
          const flags = ARM_FLAGS[arm];
          const timeRetired = flags.time && etaTick > finalTick;
          if (timeRetired) timeIds[arm].add(id);
          const map = armMaps[arm];
          const existing = map.get(id);
          if (existing === undefined || state === "TRAVELLING") {
            map.set(id, { alignment, etaTick, timeRetired, geometryRetired: false });
          } else {
            existing.etaTick = etaTick;
            existing.timeRetired = timeRetired;
          }
        }
        break;
      }
      case "POCKET_STATUS": {
        if (!dropbackCounted) {
          fold.dropbacks += 1;
          dropbackCounted = true;
        }
        fold.allTicks += 1;
        const tick = channels.ticks[pocketIndex];
        pocketIndex += 1;
        if (tick === undefined) {
          throw new RangeError(
            "ruling2CommittedRetirement: fewer channel-reconstruction ticks than POCKET_STATUS " +
              "events in the same buffer — the two walks have gone out of sync.",
          );
        }
        const published = tick.published;
        bumpSeverity(fold.published, published);
        const publishedSeverity = severityOf(published, tunables);

        for (const arm of RETIREMENT_ARMS) {
          let armSeverity: PocketStatus;
          if (pursuitDeadlineTick !== undefined) {
            armSeverity = floorFromArrival(tunables, pursuitDeadlineTick - curTick);
          } else {
            const arrivalArm = floorFromArrival(tunables, minTtaOf(armMaps[arm], curTick));
            armSeverity = worstOf(tunables, worstOf(tunables, tick.counter, tick.bandFloor), arrivalArm);
          }
          bumpSeverity(fold.arm[arm], armSeverity);

          if (published !== "CLEAN") {
            const armSevNum = severityOf(armSeverity, tunables);
            if (armSevNum < publishedSeverity) {
              fold.armDemoteClear[arm].touched += 1;
              if (armSeverity === "CLEAN") fold.armDemoteClear[arm].cleared += 1;
              else fold.armDemoteClear[arm].demoted += 1;
            }
          }
        }
        break;
      }
      default:
        break;
    }
  }

  if (pocketIndex !== channels.ticks.length) {
    throw new RangeError(
      `ruling2CommittedRetirement: consumed ${String(pocketIndex)} of ${String(channels.ticks.length)} ` +
        "channel-reconstruction ticks — the two walks disagree about how many POCKET_STATUS events " +
        "this play carried.",
    );
  }
  for (const arm of RETIREMENT_ARMS) {
    fold.geometryRetiredThreats[arm] += geoIds[arm].size;
    fold.timeRetiredThreats[arm] += timeIds[arm].size;
  }
}

/**
 * Split one game's stream into PASS dropbacks and fold each. Same `PLAY_START`/`kind` structural read
 * every sibling module in this package uses (`geometryTimeRetirement.reclassifyGame`,
 * `pocketChannelShares.reconstructGame`, `bandCensus.foldGameBandCensus`).
 */
export function foldGameRuling2(fold: Ruling2Fold, events: readonly MatchEventEnvelope[], tunables: Tunables): void {
  let buf: MatchEventEnvelope[] = [];
  let isPass = false;
  let tick = 0;

  const flush = (): void => {
    if (isPass && buf.length > 0) foldPlayRuling2(fold, buf, tick, tunables);
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
}
