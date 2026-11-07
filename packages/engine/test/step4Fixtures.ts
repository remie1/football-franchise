/**
 * ADR-089 step 4 — THE STEP-4 TEST BUNDLES AND THE RECORDER (plan §1.1, §2.2, §7).
 *
 * P6, P7 and P8 are not in contracts, so every bundle carrying `pocket.contact` or
 * `throwExec.motion` is refused by `pocketRulesOf` before the first die. The wired path is reached
 * only through the engine's test seam, `simulatePassPlayWith` with the three petitions granted and a
 * `Step4Recorder` that takes what the stream will carry once they are lifted (an `arrival_contest`
 * CHECK, a `QB_HIT`, `THROW.releaseSeconds`), each with the position it would have taken. Nothing
 * here is on any stream.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import type { MatchGameState, PlayCalls } from "../src/types.js";
import { simulatePassPlayWith } from "../src/sim/passPlay.js";
import type { ArrivalContestPayload, QbHitRecord, Step4Position, Step4Recorder } from "../src/events.js";
import type { ContractPetitions } from "../src/sim/pocketRules.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import type { ContactTunables, MotionTunables, Tunables } from "../src/tunables.js";
import { APPROACH_CARD, S3_TUNABLES, S_TUNABLES, L5_TUNABLES, stamp } from "./pocketTunables.js";

/** The filed contact block (plan §1.1): b 5, every tilt on, the 0.5 s and 1.0 s sheds, `:contest2` at 15. */
export const CONTACT_FILED: ContactTunables = Object.freeze({
  boundary: 5,
  tilts: Object.freeze({
    pushBlocked: Object.freeze({ on: true, quarterbackBonus: 20 }),
    freeRun: Object.freeze({ on: true, rusherBonus: 10 }),
    behindNever: Object.freeze({ on: true, rusherBonus: 10 }),
  }),
  shedDelaySeconds: 0.5,
  pushShedDelaySeconds: 1.0,
  secondArrival: Object.freeze({ target: 15 }),
  order: "CONTEST_AFTER_THROW",
});

/** The filed motion block: rho0 0.3 s, rho_d 400, D21's continuous race. */
export const MOTION_FILED: MotionTunables = Object.freeze({ rho0: 0.3, rhoD: 400, reading: "CONTINUOUS" });

/** A test's own petitions: every one granted (never the engine's constants, which stay false). */
export const GRANTED: ContractPetitions = Object.freeze({ P5: true, P17: true, P6: true, P7: true, P8: true });

/** `base` with the step-4 blocks given, each key added only when given (never as `undefined`). */
export function withStep4(base: Tunables, blocks: { readonly contact?: unknown; readonly motion?: unknown }): Tunables {
  return {
    ...base,
    pocket: { ...base.pocket, ...(blocks.contact === undefined ? {} : { contact: blocks.contact as ContactTunables }) },
    throwExec: { ...base.throwExec, ...(blocks.motion === undefined ? {} : { motion: blocks.motion as MotionTunables }) },
  };
}

/** Kind T, today's line plus contact: the stamp, the approach card and the contact block on DEFAULT_TUNABLES. */
export function todaysLine(contact: unknown = CONTACT_FILED, digest = "fnv1a:7e000004"): Tunables {
  const base: Tunables = {
    ...DEFAULT_TUNABLES,
    engineRules: stamp(digest, "pocket-1.s4"),
    passRush: { ...DEFAULT_TUNABLES.passRush, approach: APPROACH_CARD },
  };
  return withStep4(base, { contact });
}

const restamped = (t: Tunables, digest: string): Tunables => ({ ...t, engineRules: stamp(digest, "pocket-1.s4") });

/** The design (D1's shape): the s3 bundle with both blocks. Its plays need the snap picture. */
export const S4_TUNABLES: Tunables = withStep4(restamped(S3_TUNABLES, "fnv1a:7e000001"), { contact: CONTACT_FILED, motion: MOTION_FILED });
/** Shape S of step 1 with both blocks (no step-2 or step-3 part): no picture needed. */
export const S4S_TUNABLES: Tunables = withStep4(restamped(S_TUNABLES, "fnv1a:7e000002"), { contact: CONTACT_FILED, motion: MOTION_FILED });
/** Shape L (R 5) with both blocks. */
export const S4L_TUNABLES: Tunables = withStep4(restamped(L5_TUNABLES, "fnv1a:7e000003"), { contact: CONTACT_FILED, motion: MOTION_FILED });
/** Contact alone on step 1's shape S (no motion). */
export const S4C_TUNABLES: Tunables = withStep4(restamped(S_TUNABLES, "fnv1a:7e000005"), { contact: CONTACT_FILED });
/** The motion alone on step 1's shape S (no contact: today's sack, the stale list). */
export const S4M_TUNABLES: Tunables = withStep4(restamped(S_TUNABLES, "fnv1a:7e000006"), { motion: MOTION_FILED });
/** Kind T with the filed contact block. */
export const T_TUNABLES: Tunables = todaysLine();

export type Step4Record =
  | { readonly kind: "CONTEST"; readonly payload: ArrivalContestPayload; readonly at: Step4Position }
  | { readonly kind: "QB_HIT"; readonly payload: QbHitRecord; readonly at: Step4Position }
  | { readonly kind: "RELEASE"; readonly payload: number; readonly at: Step4Position };

/** Takes every step-4 record in order, with the position it would have on the stream. */
export class RecordingStep4 implements Step4Recorder {
  readonly records: Step4Record[] = [];
  arrivalContest(payload: ArrivalContestPayload, at: Step4Position): void {
    this.records.push({ kind: "CONTEST", payload, at });
  }
  qbHit(hit: QbHitRecord, at: Step4Position): void {
    this.records.push({ kind: "QB_HIT", payload: hit, at });
  }
  releaseSeconds(seconds: number, at: Step4Position): void {
    this.records.push({ kind: "RELEASE", payload: seconds, at });
  }
}

export interface Step4Play {
  readonly events: readonly MatchEventEnvelope[];
  readonly records: readonly Step4Record[];
}

/** One pass play through the seam, the petitions granted, with its records. */
export function playStep4(state: MatchGameState, calls: PlayCalls, seed: string, tunables: Tunables): Step4Play {
  const recorder = new RecordingStep4();
  const { events } = simulatePassPlayWith(state, calls, seed, tunables, { petitions: GRANTED, step4Recorder: recorder });
  return { events, records: recorder.records };
}
