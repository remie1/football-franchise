/**
 * ADR-089 step 5a: THE STEP-5 TEST BLOCKS (plan §1.2), built by hand for the engine's tests.
 *
 * `CLEAN_POCKET_FILED` is the design's block, every part on with the drop floor and the reset
 * 1.0 s (D33); `CLEAN_POCKET_OFF` is every part off with no floor (the all-off proof's block, which
 * plays today's count). `withCleanPocket` adds the key to `pocket` only when given, never as
 * `undefined`, as `withStep4` does.
 */
import type { MatchEventEnvelope, RollDetail } from "@ff/contracts";
import type { CheckPayload } from "../src/events.js";
import type { CleanPocketTunables, DropFloorTunables, Tunables } from "../src/tunables.js";
import { S4L_TUNABLES, S4S_TUNABLES, S4_TUNABLES } from "./step4Fixtures.js";
import { stamp } from "./pocketTunables.js";

/** The drop floor by first-read depth (§4.6, CHOSEN): 1.0, 1.5, 2.0, 2.0 s. */
export const DROP_FLOOR_FILED: DropFloorTunables = Object.freeze({ QUICK: 1.0, SHORT: 1.5, INTERMEDIATE: 2.0, DEEP: 2.0 });

/** The design's block (`pocket-1.s5a`'s checklist): every part on, the reset 1.0 s, the floor. */
export const CLEAN_POCKET_FILED: CleanPocketTunables = Object.freeze({
  d23: true,
  expiryBar: 30,
  move: true,
  resetSeconds: 1.0,
  bump: true,
  breakOut: true,
  d23OnRun: true,
  dropFloor: DROP_FLOOR_FILED,
});

/** Every part off and no floor: the block present, today's count played. */
export const CLEAN_POCKET_OFF: CleanPocketTunables = Object.freeze({
  d23: false,
  expiryBar: 30,
  move: false,
  resetSeconds: 1.0,
  bump: false,
  breakOut: false,
  d23OnRun: false,
});

/** `base` with `pocket.cleanPocket` set to `block`. Nothing is checked here (refusal tests cast at the call site). */
export function withCleanPocket(base: Tunables, block: unknown): Tunables {
  return { ...base, pocket: { ...base.pocket, cleanPocket: block as CleanPocketTunables } };
}

// ---- ADR-089 step 5a: the checklist's test bundles and stream readers (plan §2.1) -------------


/** `base` restamped under an s5 name (the digest names the test bundle; nothing checks it here). */
export function restampS5(base: Tunables, digest: string, name = "pocket-1.s5a"): Tunables {
  return { ...base, engineRules: stamp(digest, name) };
}

/** The design's shape (D1's: the s3 bundle with both step-4 blocks) with the filed block: s5a on the league. Needs the picture. */
export const S5_TUNABLES: Tunables = withCleanPocket(restampS5(S4_TUNABLES, "fnv1a:7f5a0001"), CLEAN_POCKET_FILED);
/** Shape S of step 1 with both step-4 blocks and the filed block (no picture needed). */
export const S5S_TUNABLES: Tunables = withCleanPocket(restampS5(S4S_TUNABLES, "fnv1a:7f5a0002"), CLEAN_POCKET_FILED);
/** Shape L (R 5) with both step-4 blocks and the filed block. */
export const S5L_TUNABLES: Tunables = withCleanPocket(restampS5(S4L_TUNABLES, "fnv1a:7f5a0003"), CLEAN_POCKET_FILED);

/**
 * A bench where no block breaks in the play (shape S's theta far past the clock), so the pocket
 * stays CLEAN unless a free runner comes: the engine's stand-in for the clean bench, for tests
 * that need clean expiries in number.
 */
export function onCleanBench(base: Tunables): Tunables {
  const beatClock = base.passRush.beatClock;
  if (beatClock === undefined) throw new Error("onCleanBench needs shape S");
  return { ...base, passRush: { ...base.passRush, beatClock: { ...beatClock, thetaSeconds: 100000 } } };
}

/** The filed block with some parts changed (an arm's parts). */
export function cleanParts(parts: Partial<CleanPocketTunables>): CleanPocketTunables {
  return { ...CLEAN_POCKET_FILED, ...parts };
}

/** One event's tick (`undefined` before the first TICK). */
export function tickOfEvent({ event }: MatchEventEnvelope): number | undefined {
  return (event as { readonly tick?: number }).tick;
}

/** A CHECK's payload when the event is a CHECK. */
export function checkOf({ event }: MatchEventEnvelope): CheckPayload | undefined {
  return event.type === "CHECK" ? event.payload : undefined;
}

/** Every roll a stream carries (CHECK roll and opposed roll, PRESNAP_READ, QB_READ's variance roll), with its seq and tick. */
export function rollsOf(events: readonly MatchEventEnvelope[]): { readonly seq: number; readonly tick: number | undefined; readonly roll: RollDetail }[] {
  const out: { seq: number; tick: number | undefined; roll: RollDetail }[] = [];
  for (const e of events) {
    const tick = tickOfEvent(e);
    const visit = (v: unknown): void => {
      if (v === null || typeof v !== "object") return;
      if (Array.isArray(v)) {
        for (const x of v) visit(x);
        return;
      }
      const o = v as Record<string, unknown>;
      if (typeof o["rngLabel"] === "string" && typeof o["raw"] === "number") {
        out.push({ seq: e.seq, tick, roll: o as unknown as RollDetail });
        return;
      }
      for (const x of Object.values(o)) visit(x);
    };
    visit(e.event.payload);
  }
  return out;
}

/** The clean picks of a stream: every `pocket_movement` CHECK on a `:clean` label. */
export function cleanPicksOf(events: readonly MatchEventEnvelope[]): MatchEventEnvelope[] {
  return events.filter((e) => checkOf(e)?.checkKind === "pocket_movement" && (checkOf(e)?.roll?.rngLabel ?? "").endsWith(":clean"));
}

/**
 * The play's drop floor read off its `PLAY_START` (the first read's route as run, `airYards` below
 * 0 a screen), as the engine reads it, with the filed floor: 0 for a screen or no first read.
 */
export function floorOfPlay(events: readonly MatchEventEnvelope[], floor: DropFloorTunables = DROP_FLOOR_FILED): number {
  const start = events.find((e) => e.event.type === "PLAY_START");
  if (start === undefined || start.event.type !== "PLAY_START") throw new Error("no PLAY_START");
  const offense = (start.event.payload as { readonly offense: { readonly readOrder: readonly string[]; readonly routes: readonly { readonly receiver: string; readonly depthClass: keyof DropFloorTunables; readonly airYards: number }[] } }).offense;
  const first = offense.routes.find((r) => r.receiver === offense.readOrder[0]);
  if (first === undefined || first.airYards < 0) return 0;
  return floor[first.depthClass];
}

/** The tick each QB_DECISION THROW or CHECKDOWN was decided on, and whether he was out of the pocket (after a QB_PURSUIT). */
export function throwDecisionsOf(events: readonly MatchEventEnvelope[]): { readonly tick: number; readonly onTheRun: boolean; readonly target: string }[] {
  const out: { tick: number; onTheRun: boolean; target: string }[] = [];
  let onTheRun = false;
  for (const e of events) {
    if (e.event.type === "QB_PURSUIT") onTheRun = true;
    if (e.event.type !== "QB_DECISION") continue;
    const p = e.event.payload as { readonly choice: string; readonly target?: string };
    if (p.choice !== "THROW" && p.choice !== "CHECKDOWN") continue;
    out.push({ tick: tickOfEvent(e) ?? -1, onTheRun, target: String(p.target) });
  }
  return out;
}
