/**
 * THE CLEAN PICK AND HIS COUNT, RESTATED FROM THE STREAM (ADR-089 step 5a; §4.6; plan §4's readers
 * row and its `s5Stream.ts` row; AM-9).
 *
 * Under `pocket.cleanPocket` (`pocket-1.s5a` and `pocket-1.s5b`, and the step-5 bench arms) the
 * engine (`sim/passPlay.ts`, `sim/cleanPocket.ts`) changes four facts a stream reader restates:
 *
 *  - **The clean pick.** On a clean expiry that has not thrown, one ranked pick between MOVE and
 *    ESCAPE, published as a `pocket_movement` CHECK whose roll label ends `:clean`
 *    (`.../movement/t<tick>:clean`, the one new label family, plan §2.1). It is its own act: never
 *    the movement gate's (a forced pick's label ends `:movement`), never on a forced tick.
 *  - **The clean move.** A clean pick answered by `QB_DECISION` STEP_UP (today's climb in full) then
 *    restarts his reads at the first read and restates his count as the move tick plus one tick step
 *    plus the reset (D33): `Number((tick + clock.tickStepSeconds + resetSeconds).toFixed(1))`, the
 *    engine's own rounding (`resetAfterMove`). His progression reads after the move count from 0.
 *  - **The drop floor.** No aimed pocket throw is decided and no checkdown look is taken before the
 *    floor of the first read's route as run (`PLAY_START.offense.readOrder[0]`'s entry in
 *    `offense.routes`): QUICK 1.0 s, SHORT 1.5 s, INTERMEDIATE and DEEP 2.0 s; 0 with no floor in the
 *    block, no first read, or a screen (that route's `airYards` below 0).
 *  - **D26, his count.** The pocket's count part is today's (`tick >= budget || reads >= maxReads`)
 *    on the restated budget and reads, and also at or past the floor (`mustDecideNow`).
 *
 * Every function here is read only when the play's bundle carries the block (`cleanPocketOf`): a
 * reader keeps today's reading on every other stream, so steps 1 to 4 re-fold as before (Q-2f,
 * `pocketRefold.test.ts`). Nothing here plays a game, draws a die or adds a payload field: every
 * fact is the stream's, every dial the stamped rules' own (K14).
 */
import type { Tunables } from "@ff/engine";

/** The clean-pocket block a bundle carries, or `undefined` (every bundle but step 5's). */
export type CleanPocketBlock = NonNullable<Tunables["pocket"]["cleanPocket"]>;

/** The block of the play's own bundle (K14: the arm's tunables, never a default). */
export function cleanPocketOf(tunables: Tunables): CleanPocketBlock | undefined {
  return tunables.pocket.cleanPocket;
}

/** The clean pick's roll label suffix (`movement/t<tick>:clean`, plan §2.1). */
export const CLEAN_PICK_SUFFIX = ":clean";

/** Is a `pocket_movement` CHECK's roll label a clean pick's? */
export function isCleanPickLabel(rngLabel: string): boolean {
  return rngLabel.endsWith(CLEAN_PICK_SUFFIX);
}

// --- the drop floor -----------------------------------------------------------------------------------

/** The first read's route as run, from `PLAY_START`: the man, his route's depth class and declared air yards. */
export interface FirstReadRoute {
  readonly receiver: string;
  readonly depthClass: string;
  readonly airYards: number;
}

const obj = (v: unknown): Readonly<Record<string, unknown>> | undefined => (typeof v === "object" && v !== null ? (v as Readonly<Record<string, unknown>>) : undefined);

/**
 * The first read's route as run (`offense.readOrder[0]`'s entry in `offense.routes`, the routes he
 * ran at the snap, hot conversions included), or `undefined` with no first read or no route for him.
 */
export function firstReadRouteOf(playStartPayload: unknown): FirstReadRoute | undefined {
  const offense = obj(obj(playStartPayload)?.["offense"]);
  if (offense === undefined) return undefined;
  const order = offense["readOrder"];
  const first = Array.isArray(order) ? order[0] : undefined;
  if (first === undefined) return undefined;
  const routes = offense["routes"];
  if (!Array.isArray(routes)) return undefined;
  for (const raw of routes as readonly unknown[]) {
    const r = obj(raw);
    if (r === undefined || String(r["receiver"]) !== String(first)) continue;
    const depthClass = r["depthClass"];
    const airYards = r["airYards"];
    if (typeof depthClass !== "string" || typeof airYards !== "number") throw new Error(`cleanPick: the first read ${String(first)}'s route carries no depth class or air yards`);
    return { receiver: String(first), depthClass, airYards };
  }
  return undefined;
}

/** A screen: the first read's declared air yards below 0 (AM-9 `floor`; BUBBLE_NOW and RB_SLIP_SCREEN at 517002e). */
export function isScreenRoute(route: FirstReadRoute): boolean {
  return route.airYards < 0;
}

/** The play's drop floor: 0 with no floor in the block, no first read or a screen; else the floor of the first read's depth class. */
export function restatedFloorSeconds(block: CleanPocketBlock, first: FirstReadRoute | undefined): number {
  const floor = block.dropFloor;
  if (floor === undefined || first === undefined || isScreenRoute(first)) return 0;
  const seconds = (floor as unknown as Readonly<Record<string, number>>)[first.depthClass];
  if (seconds === undefined) throw new Error(`cleanPick: the drop floor has no depth class ${first.depthClass}`);
  return seconds;
}

// --- his count after a clean move ------------------------------------------------------------------------

/** The count a clean move at `moveTick` restates (`resetAfterMove`): the move tick plus a tick step plus the reset, to a tenth. */
export function budgetAfterMove(tunables: Tunables, block: CleanPocketBlock, moveTick: number): number {
  return Number((moveTick + tunables.clock.tickStepSeconds + block.resetSeconds).toFixed(1));
}

const TOLERANCE = 1e-9;

/** What the restated count reads: the base budget, the read system's `maxReads`, the floor, the clean moves' ticks and every progression read's tick. */
export interface CleanCountInputs {
  readonly tunables: Tunables;
  readonly block: CleanPocketBlock;
  /** `resolve/qbRead.ts`'s `timeBudgetSeconds`, restated (`s2Stream.ts`'s `restatedBudgetSeconds`). */
  readonly baseBudget: number;
  readonly maxReads: number;
  readonly floorSeconds: number;
  /** The ticks of the play's clean moves (a `:clean` CHECK answered by STEP_UP), in order. */
  readonly moveTicks: readonly number[];
  /** The ticks of the play's progression reads (`t<tick>:r<n>:` labels), in order. */
  readonly readTicks: readonly number[];
}

/** His count at the end of tick `t`'s reads, under the block. */
export interface CleanCountAt {
  /** The budget in force on `t`: the base, or the last clean move's before `t`. */
  readonly budget: number;
  /** The clean move that set it (strictly before `t`), if any. */
  readonly restartedAt: number | undefined;
  /** Progression reads since the last restart, `t`'s included. */
  readonly reads: number;
  /** Today's count part on the restated budget and reads (the budget or the read list spent). */
  readonly spent: boolean;
  /** `t` at or past the floor. */
  readonly pastFloor: boolean;
  /** The count part under the block (`mustDecideNow`'s, forced aside): spent and past the floor. */
  readonly count: boolean;
  /** Which part spent it: "reads" when the read list is spent, else "count" (the budget alone); undefined when not spent. */
  readonly trigger: "reads" | "count" | undefined;
}

export function cleanCountAt(x: CleanCountInputs, t: number): CleanCountAt {
  let restartedAt: number | undefined;
  for (const m of x.moveTicks) if (m < t - TOLERANCE) restartedAt = m;
  const budget = restartedAt === undefined ? x.baseBudget : budgetAfterMove(x.tunables, x.block, restartedAt);
  const reads = x.readTicks.filter((r) => r <= t + TOLERANCE && (restartedAt === undefined || r > restartedAt + TOLERANCE)).length;
  const byReads = reads >= x.maxReads;
  const spent = t >= budget || byReads;
  const pastFloor = t >= x.floorSeconds;
  return { budget, restartedAt, reads, spent, pastFloor, count: spent && pastFloor, trigger: spent ? (byReads ? "reads" : "count") : undefined };
}
