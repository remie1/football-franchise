/**
 * ADR-089 step 6: THE STEP-6 TEST BLOCKS AND THEIR RECORDS (step-6 plan §1.2), built by hand for the
 * engine's tests.
 *
 * `OUTS_FILED` is every part on with the recommended answer to each owner question (HOLD,
 * ZERO_GAIN_ONLY, SEEN), which are the owner's answers: the block `pocket-1.s6` will carry. `OUTS_OFF`
 * is every part off (the all-off proof's block, which plays step 5a's outs). `withOuts` adds the key
 * to `pocket` only when given, never as `undefined`, as `withCleanPocket` does. `GRANTED_S6` grants
 * every petition, step 6's included, P21 among them (the build still withholds it), so a test reaches
 * every part, the unseen answer too, through `pocketRulesUnder` or `simulatePassPlayWith`.
 *
 * P9 to P12 are in contracts, so the outs write their records on the stream: an OUT_OF_POCKET
 * throwaway (P9), `THROWAWAY.outsideTackleBox` (P10), `QB_DECISION.direction` (P11) and the
 * `scramble_drill` CHECKs (P12). `playS6` plays one pass play through the seam and reads them back
 * off the stream (`step6RecordsOf`), each with its place: a whole record's own `seq` and tick, a
 * field's those of the event carrying it. `withoutStep6` takes them out again, the stream as it stood
 * before the lift, for the tests that line a play with the outs up against one without them. Before
 * the lift the same records came from a test-only recorder.
 */
import type { MatchEvent, MatchEventEnvelope, RollDetail, RunSide } from "@ff/contracts";
import type { CheckPayload } from "../src/events.js";
import { simulatePassPlayWith } from "../src/sim/passPlay.js";
import type { ContractPetitions } from "../src/sim/pocketRules.js";
import type { ContestPosition, MatchGameState, PlayCalls } from "../src/types.js";
import type { OutsTunables, Tunables } from "../src/tunables.js";
import { GRANTED } from "./step4Fixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, restampS5 } from "./step5Fixtures.js";

/** Every part on, the recommended answers, which are the owner's answers (the bundles' defaults until AM-13 files them, never a record). */
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

/** Where a step-6 record stands in the stream: its own `seq` and tick (a field: those of the event carrying it). */
export interface Step6Position {
  readonly seq: number;
  readonly tick: number | undefined;
}

/** A THROWAWAY's payload. */
export type ThrowawayPayload = Extract<MatchEvent, { type: "THROWAWAY" }>["payload"];

/** A `scramble_drill` CHECK's payload: it always carries its roll, its target, its band (a contest position) and its `rollRef`. */
export type DrillPayload = CheckPayload & {
  readonly roll: RollDetail;
  readonly target: number;
  readonly band: ContestPosition;
  readonly rollRef: string;
};

const POSITIONS: ReadonlySet<string> = new Set<ContestPosition>(["TRAILING", "EVEN", "IN_FRONT"]);
const isPosition = (band: string): band is ContestPosition => POSITIONS.has(band);

/**
 * One step-6 record of a stream, with its place: an OUT_OF_POCKET throwaway (its `outsideTackleBox`
 * in its payload), the flag on any other throwaway, the side on a decision, a drill CHECK.
 */
export type Step6Record =
  | { readonly kind: "outOfPocketThrowaway"; readonly payload: ThrowawayPayload; readonly at: Step6Position }
  | { readonly kind: "outsideTackleBox"; readonly value: boolean; readonly at: Step6Position }
  | { readonly kind: "direction"; readonly side: RunSide; readonly at: Step6Position }
  | { readonly kind: "scrambleDrill"; readonly payload: DrillPayload; readonly at: Step6Position };

/** Every step-6 record of a stream, in order, with its place. */
export function step6RecordsOf(events: readonly MatchEventEnvelope[]): Step6Record[] {
  const out: Step6Record[] = [];
  for (const { seq, event } of events) {
    const at: Step6Position = { seq, tick: (event as { readonly tick?: number }).tick };
    if (event.type === "THROWAWAY") {
      if (event.payload.cause === "OUT_OF_POCKET") out.push({ kind: "outOfPocketThrowaway", payload: event.payload, at });
      else if (event.payload.outsideTackleBox !== undefined) out.push({ kind: "outsideTackleBox", value: event.payload.outsideTackleBox, at });
    } else if (event.type === "QB_DECISION" && event.payload.direction !== undefined) {
      out.push({ kind: "direction", side: event.payload.direction, at });
    } else if (event.type === "CHECK" && event.payload.checkKind === "scramble_drill") {
      const payload = event.payload;
      const { roll, target, band, rollRef } = payload;
      if (roll === undefined || target === undefined || band === undefined || !isPosition(band) || rollRef === undefined) {
        throw new Error(`a scramble_drill CHECK without its roll, target, rollRef or a contest position for its band (${String(band)})`);
      }
      out.push({ kind: "scrambleDrill", payload: { ...payload, roll, target, band, rollRef }, at });
    }
  }
  return out;
}

/** Whether an event is a whole step-6 record: an OUT_OF_POCKET throwaway or a drill CHECK. */
export function isStep6Event(event: MatchEvent): boolean {
  return (
    (event.type === "THROWAWAY" && event.payload.cause === "OUT_OF_POCKET") ||
    (event.type === "CHECK" && event.payload.checkKind === "scramble_drill")
  );
}

/**
 * The stream as it stood before the lift: the whole step-6 records taken out, the two fields taken off
 * the events that carry them (`outsideTackleBox` off a THROWAWAY, `direction` off a QB_DECISION), and
 * the seqs renumbered from the play's first, as the stream numbered them before the lift.
 */
export function withoutStep6(events: readonly MatchEventEnvelope[]): MatchEventEnvelope[] {
  const first = events[0];
  if (first === undefined) return [];
  let seq = first.seq;
  const out: MatchEventEnvelope[] = [];
  for (const e of events) {
    if (isStep6Event(e.event)) continue;
    let event = e.event;
    if (event.type === "THROWAWAY" && event.payload.outsideTackleBox !== undefined) {
      const { outsideTackleBox: _flag, ...payload } = event.payload;
      event = { ...event, payload };
    } else if (event.type === "QB_DECISION" && event.payload.direction !== undefined) {
      const { direction: _side, ...payload } = event.payload;
      event = { ...event, payload };
    }
    out.push({ ...e, seq: seq++, event });
  }
  return out;
}

/**
 * Where a record stood before the lift, in `withoutStep6`'s numbering: a whole record the seq the next
 * event took (it stood just before that event), a field the seq of the event carrying it. That is the
 * seq less the whole step-6 records before it, so a play with the outs lines up with one without them.
 */
export function beforeLiftSeq(events: readonly MatchEventEnvelope[], seq: number): number {
  let whole = 0;
  for (const e of events) {
    if (e.seq >= seq) break;
    if (isStep6Event(e.event)) whole += 1;
  }
  return seq - whole;
}

/** The envelope a record names: the event at its seq (a field record's: the event carrying it). */
export function eventAt(events: readonly MatchEventEnvelope[], at: Step6Position): MatchEventEnvelope | undefined {
  return events.find((e) => e.seq === at.seq);
}

/** One pass play under step 6's petitions, with its step-6 records read off its stream. */
export interface Step6Play {
  readonly events: readonly MatchEventEnvelope[];
  readonly records: readonly Step6Record[];
}

/** One pass play through the seam (`simulatePassPlayWith`), every petition granted, with its records. */
export function playS6(state: MatchGameState, calls: PlayCalls, seed: string, tunables: Tunables): Step6Play {
  const { events } = simulatePassPlayWith(state, calls, seed, tunables, { petitions: GRANTED_S6 });
  return { events, records: step6RecordsOf(events) };
}
