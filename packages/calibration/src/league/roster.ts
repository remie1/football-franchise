/**
 * ROSTER CONSTRUCTION — the shared skeleton every synthetic league is poured into.
 *
 * One place decides how many players at each position a team carries and in what order they sit
 * on the depth chart, so a flat league and an archetype league differ ONLY in their attribute
 * values. That is what makes the two comparable: if a designed-ladder batch and a flat batch
 * disagree, the disagreement is the attributes and cannot be the roster shape.
 *
 * The counts are sized by what the play corpus demands, not by an NFL 53-man rulebook: the
 * offensive corpus reaches 13 personnel (three tight ends) and 00 personnel (five receivers),
 * and the defensive corpus reaches DIME (six defensive backs). A league that cannot field a
 * card the caller may legally select would surface as a `PersonnelUnavailableError` mid-batch,
 * which is a loud failure but a late one.
 */
import type { AttributeMap, PlayerId, PlayerState, Position, TeamId } from "@ff/contracts";
import { playerId } from "@ff/contracts";

/**
 * Depth at each position. Every number is justified by a card in the corpus:
 *   WR 6  — `00` personnel plays five receivers; one spare.
 *   TE 4  — `13` personnel plays three tight ends; one spare.
 *   RB 3, FB 1 — `22` plays two backs plus a fullback role that falls back to a back.
 *   OL 2 deep at each of the five spots — `buildOffensiveUnit`'s preference chains walk sideways.
 *   CB 6  — DIME plays four corners; nickel/dime packages plus attrition.
 *   S  4  — two safeties, two spares.
 *   DL 8, LB 5 — BASE plays four down plus three linebackers; goal-line adds a fifth lineman.
 */
export const POSITION_DEPTH: Readonly<Record<Position, number>> = {
  QB: 2,
  RB: 3,
  FB: 1,
  WR: 6,
  TE: 4,
  LT: 2,
  LG: 2,
  C: 2,
  RG: 2,
  RT: 2,
  DE: 4,
  DT: 3,
  NT: 1,
  OLB: 3,
  MLB: 1,
  ILB: 1,
  CB: 6,
  FS: 2,
  SS: 2,
  K: 1,
  P: 1,
  LS: 1,
};

export const ROSTER_SIZE = Object.values(POSITION_DEPTH).reduce((a, b) => a + b, 0);

/** Stable position order, so a roster array is deterministic and diffable. */
export const POSITION_ORDER: readonly Position[] = [
  "QB", "RB", "FB", "WR", "TE",
  "LT", "LG", "C", "RG", "RT",
  "DE", "DT", "NT", "OLB", "MLB", "ILB",
  "CB", "FS", "SS", "K", "P", "LS",
];

/**
 * Deterministic id: `p:{team}:{position}{index}`. Not parsed by anything — `ids.ts` forbids
 * that — but readable in a failing assertion, which is worth the eight characters.
 */
export function syntheticPlayerId(team: TeamId, position: Position, index: number): PlayerId {
  return playerId(`p:${String(team)}:${position}${index}`);
}

/** What a league builder must answer for each slot it is asked to fill. */
export interface SlotSpec {
  readonly team: TeamId;
  readonly position: Position;
  /** 0-based depth-chart index at this position. 0 is the starter. */
  readonly depthIndex: number;
  readonly id: PlayerId;
}

export type AttributesFor = (slot: SlotSpec) => AttributeMap;

/**
 * Everything about a synthetic player except his numbers. Bio height/weight and age are FIXED
 * per position rather than sampled: nothing in the engine reads them today, and a random one
 * would be an undeclared source of variance the day something does.
 */
const BUILD: Readonly<Record<Position, { readonly heightIn: number; readonly weightLb: number }>> = {
  QB: { heightIn: 75, weightLb: 220 },
  RB: { heightIn: 70, weightLb: 215 },
  FB: { heightIn: 72, weightLb: 245 },
  WR: { heightIn: 73, weightLb: 200 },
  TE: { heightIn: 77, weightLb: 250 },
  LT: { heightIn: 78, weightLb: 315 },
  LG: { heightIn: 76, weightLb: 315 },
  C: { heightIn: 75, weightLb: 300 },
  RG: { heightIn: 76, weightLb: 315 },
  RT: { heightIn: 78, weightLb: 315 },
  DE: { heightIn: 76, weightLb: 270 },
  DT: { heightIn: 75, weightLb: 305 },
  NT: { heightIn: 74, weightLb: 330 },
  OLB: { heightIn: 74, weightLb: 245 },
  MLB: { heightIn: 74, weightLb: 240 },
  ILB: { heightIn: 74, weightLb: 240 },
  CB: { heightIn: 71, weightLb: 190 },
  FS: { heightIn: 72, weightLb: 200 },
  SS: { heightIn: 72, weightLb: 210 },
  K: { heightIn: 72, weightLb: 195 },
  P: { heightIn: 74, weightLb: 210 },
  LS: { heightIn: 74, weightLb: 240 },
};

export function buildRosterSlots(team: TeamId): readonly SlotSpec[] {
  const slots: SlotSpec[] = [];
  for (const position of POSITION_ORDER) {
    for (let i = 0; i < POSITION_DEPTH[position]; i++) {
      slots.push({ team, position, depthIndex: i, id: syntheticPlayerId(team, position, i) });
    }
  }
  return slots;
}

export function buildPlayer(slot: SlotSpec, attributes: AttributeMap): PlayerState {
  const build = BUILD[slot.position];
  return {
    bio: {
      id: slot.id,
      displayName: `${slot.position}${slot.depthIndex + 1} ${String(slot.team)}`,
      position: slot.position,
      age: 26,
      heightIn: build.heightIn,
      weightLb: build.weightLb,
      draft: "UDFA",
    },
    attributes: { kind: "true", values: attributes, traits: new Set<string>() },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    teamId: slot.team,
  };
}

/** Depth chart in slot order: index 0 at each position is the starter. */
export function depthChartFromSlots(
  slots: readonly SlotSpec[],
): Partial<Record<Position, PlayerId[]>> {
  const chart: Partial<Record<Position, PlayerId[]>> = {};
  for (const slot of slots) {
    const list = chart[slot.position];
    if (list === undefined) chart[slot.position] = [slot.id];
    else list.push(slot.id);
  }
  return chart;
}
