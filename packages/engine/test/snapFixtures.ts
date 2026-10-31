/**
 * ADR-089 step 3 — SNAP PICTURES FOR THE ENGINE'S STEP-3 TESTS.
 *
 * The engine builds no picture (ADR-090: the playbook's callers draw it and the calls carry it,
 * S5). An s3 pass play needs one on its calls (plan §2.3), so these tests draw their own: every
 * played rusher by his position group, rush alignment and card side, on the half-yard grid, in the
 * frame of `contracts/src/snap.ts` (x across from the ball, negative the offense's left; y off the
 * line, positive downfield). Not ADR-090's beats: a stand-in that places men where its tables
 * roughly would (down linemen a yard off the ball, a blitzing backer at 2.5, a rushing defensive
 * back at 5), with every value a test reads stated here.
 */
import { POSITION_GROUP } from "@ff/contracts";
import type { PlayerId, PlayerSnapSpot, SnapMovement, SnapPicture } from "@ff/contracts";
import type { MatchGameState, PlayCalls, RunSide, RushAlignment } from "../src/types.js";
import type { Tunables } from "../src/tunables.js";

/** Where a rusher of a group stands: (width from the ball, depth), by alignment. */
const RUSHER_SPOTS = {
  DL: { EDGE: { width: 4.5, depth: 1.0 }, INTERIOR: { width: 1.5, depth: 1.0 } },
  LB: { EDGE: { width: 5.0, depth: 2.5 }, INTERIOR: { width: 2.0, depth: 2.5 } },
  DB: { EDGE: { width: 7.0, depth: 5.0 }, INTERIOR: { width: 3.5, depth: 5.0 } },
} as const;

export interface PictureOptions {
  readonly ballX?: number;
  /** Rushers left out of the defense list (for the refusals). */
  readonly omit?: readonly PlayerId[];
  /** Spots put in place of the drawn ones, by player id. */
  readonly at?: Readonly<Record<string, { readonly x: number; readonly y: number; readonly moving?: SnapMovement }>>;
}

const sign = (side: RunSide | undefined): number => (side === "LEFT" ? -1 : side === "RIGHT" ? 1 : 0);

/** A picture of `calls` on `state`: the played rushers by group, alignment and side; everyone else placed apart. */
export function pictureFor(state: MatchGameState, calls: PlayCalls, options: PictureOptions = {}): SnapPicture {
  const ballX = options.ballX ?? 0;
  const omit = new Set((options.omit ?? []).map(String));
  const seen = new Set<string>();
  const defense: PlayerSnapSpot[] = [];
  const place = (player: PlayerId, x: number, y: number): void => {
    const id = String(player);
    if (seen.has(id) || omit.has(id)) return;
    seen.add(id);
    const over = options.at?.[id];
    const spot = over ?? { x, y };
    defense.push({
      player,
      x: spot.x,
      y: spot.y,
      stance: spot.y <= 1.0 ? "DOWN" : "UP",
      ...(over?.moving === undefined ? {} : { moving: over.moving }),
    });
  };
  for (const r of calls.defense.rush) {
    const p = state.players[String(r.rusher)];
    if (p === undefined) throw new Error(`fixture: no player ${String(r.rusher)}`);
    const group = POSITION_GROUP[p.bio.position];
    const alignment: RushAlignment = r.alignment ?? (group === "DL" ? "INTERIOR" : "EDGE");
    const row = group === "DL" || group === "LB" || group === "DB" ? RUSHER_SPOTS[group][alignment] : { width: 1.0, depth: 3.0 };
    const s = sign(r.side);
    // A rusher the card gives no side stands half a yard off the ball, on no side the engine reads.
    place(r.rusher, ballX + (s === 0 ? 0.5 : s * row.width), row.depth);
  }
  calls.defense.assignments.forEach((a, i) => place(a.defender, ballX + (i % 2 === 0 ? -8 : 8), 8 + i));
  const offense: PlayerSnapSpot[] = [{ player: state.quarterback, x: ballX, y: -5, stance: "UP" }];
  const others = [
    ...calls.offense.protection.map((p) => p.blocker),
    ...calls.offense.routes.map((r) => r.receiver),
  ];
  others.forEach((player, i) => {
    if (offense.some((o) => o.player === player)) return;
    offense.push({ player, x: ballX + (i - others.length / 2), y: -1, stance: "DOWN" });
  });
  return { ballX, offense, defense };
}

/** `calls` with a picture of themselves on them. */
export function withPicture(state: MatchGameState, calls: PlayCalls, options: PictureOptions = {}): PlayCalls {
  return { ...calls, snap: pictureFor(state, calls, options) };
}

/** True when `tunables` carry any step-3 block, so a pass play under them needs a picture. */
export function needsPicture(tunables: Tunables): boolean {
  return (
    tunables.blitzPickup.freeRun !== undefined ||
    tunables.blitzPickup.lateBlock !== undefined ||
    tunables.pocket.climbLane !== undefined
  );
}

/** `calls`, with a picture when `tunables` need one and as they came otherwise. */
export function callsUnder(tunables: Tunables, state: MatchGameState, calls: PlayCalls): PlayCalls {
  return needsPicture(tunables) ? withPicture(state, calls) : calls;
}
