/**
 * ADR-089 step 6: THE STEP-6 TEST BLOCKS (step-6 plan §1.2), built by hand for the engine's tests.
 *
 * `OUTS_FILED` is every part on with the recommended answer to each owner question (HOLD,
 * ZERO_GAIN_ONLY, SEEN): the block `pocket-1.s6` will carry. `OUTS_OFF` is every part off (the
 * all-off proof's block, which plays step 5a's outs). `withOuts` adds the key to `pocket` only when
 * given, never as `undefined`, as `withCleanPocket` does. `GRANTED_S6` grants every petition, step
 * 6's included, so a test reaches the parts through `pocketRulesUnder` or `simulatePassPlayWith`
 * (the flags in `sim/pocketRules.ts` stay false); `recorder()` takes the records the stream cannot
 * carry before the lift, and `playS6` plays one pass play through the seam with both.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import type { RunSide } from "@ff/contracts";
import type { ScrambleDrillPayload, Step6Position, Step6Recorder, ThrowawayRecordS6 } from "../src/events.js";
import { simulatePassPlayWith } from "../src/sim/passPlay.js";
import type { ContractPetitions } from "../src/sim/pocketRules.js";
import type { MatchGameState, PlayCalls } from "../src/types.js";
import type { OutsTunables, Tunables } from "../src/tunables.js";
import { GRANTED } from "./step4Fixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, restampS5 } from "./step5Fixtures.js";

/** Every part on, the recommended answers (the owner has not answered: these are the bundles' defaults, never a record). */
export const OUTS_FILED: OutsTunables = Object.freeze({
  throwawayRule: true,
  scrambleStart: "ZERO_GAIN_ONLY",
  escapeCap: Object.freeze({ maxPerPlay: 1, whenSpent: "HOLD" }),
  pursuit: Object.freeze({ speedBaseline: 70, speedDivisor: 5, mobilityDivisor: 10, mobilityCentering: 7 }),
  noLateHorizonSack: true,
  direction: true,
  sideCatch: Object.freeze({ perLiveThreat: 10, perUnregistered: 15 }),
  caughtAsContact: true,
  caughtSeen: "SEEN",
  drill: true,
  drillBySide: true,
  deadlinePick: Object.freeze({ runMargin: 1 }),
  failedScrambleSack: true,
});

/** Every part off: the block present, step 5a's outs played. */
export const OUTS_OFF: OutsTunables = Object.freeze({
  throwawayRule: false,
  noLateHorizonSack: false,
  direction: false,
  caughtAsContact: false,
  drill: false,
  drillBySide: false,
  failedScrambleSack: false,
});

/** The all-off block with some parts on (an arm's parts). */
export function outsParts(parts: Partial<OutsTunables>): OutsTunables {
  return { ...OUTS_OFF, ...parts };
}

/** Every petition granted, step 6's P9 to P12, P20 and P21 included. */
export const GRANTED_S6: ContractPetitions = Object.freeze({ ...GRANTED, P9: true, P10: true, P11: true, P12: true, P20: true, P21: true });

/** `base` with `pocket.outs` set to `block`. Nothing is checked here (refusal tests cast at the call site). */
export function withOuts(base: Tunables, block: unknown): Tunables {
  return { ...base, pocket: { ...base.pocket, outs: block as OutsTunables } };
}

/** The s5a test bundles restamped under the s6 name, with the filed block: the design's shape (needs the picture), shape S and shape L. */
export const S6_TUNABLES: Tunables = withOuts(restampS5(S5_TUNABLES, "fnv1a:7f600001", "pocket-1.s6"), OUTS_FILED);
export const S6S_TUNABLES: Tunables = withOuts(restampS5(S5S_TUNABLES, "fnv1a:7f600002", "pocket-1.s6"), OUTS_FILED);
export const S6L_TUNABLES: Tunables = withOuts(restampS5(S5L_TUNABLES, "fnv1a:7f600003", "pocket-1.s6"), OUTS_FILED);

/** One record a `Step6Recorder` took, with where it stands. */
export type Step6Record =
  | { readonly kind: "outOfPocketThrowaway"; readonly payload: ThrowawayRecordS6; readonly at: Step6Position }
  | { readonly kind: "outsideTackleBox"; readonly value: boolean; readonly at: Step6Position }
  | { readonly kind: "direction"; readonly side: RunSide; readonly at: Step6Position }
  | { readonly kind: "scrambleDrill"; readonly payload: ScrambleDrillPayload; readonly at: Step6Position };

/** A recorder that keeps every record in order. */
export function recorder(): Step6Recorder & { readonly records: Step6Record[] } {
  const records: Step6Record[] = [];
  return {
    records,
    outOfPocketThrowaway: (payload, at) => records.push({ kind: "outOfPocketThrowaway", payload, at }),
    outsideTackleBox: (value, at) => records.push({ kind: "outsideTackleBox", value, at }),
    direction: (side, at) => records.push({ kind: "direction", side, at }),
    scrambleDrill: (payload, at) => records.push({ kind: "scrambleDrill", payload, at }),
  };
}

/** The envelope a field record names (`outsideTackleBox`, `direction`): the event at its seq. */
export function eventAt(events: readonly MatchEventEnvelope[], at: Step6Position): MatchEventEnvelope | undefined {
  return events.find((e) => e.seq === at.seq);
}

/** One pass play under step 6's petitions, with the records the stream cannot carry before the lift. */
export interface Step6Play {
  readonly events: readonly MatchEventEnvelope[];
  readonly records: readonly Step6Record[];
}

/** One pass play through the seam (`simulatePassPlayWith`), every petition granted, a recorder handed in. */
export function playS6(state: MatchGameState, calls: PlayCalls, seed: string, tunables: Tunables): Step6Play {
  const r = recorder();
  const { events } = simulatePassPlayWith(state, calls, seed, tunables, { petitions: GRANTED_S6, step6Recorder: r });
  return { events, records: r.records };
}
