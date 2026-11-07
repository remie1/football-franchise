/**
 * ADR-089 step 4 — CONTACT BY APPROACH, §4.5 (plan §2.1; `pocket-1` from `pocket-1.s4` only).
 *
 * Pure functions with no generator of their own: the caller draws the dice on the play's fork
 * labels (`.../rush/t<tick>/<rusherId>:contest` for the play's first contact, `:contest2` after the
 * play's first shed; plan §2.2 item 3) and hands the faces in, so every function here is a closed
 * form of its inputs and is tested as one.
 *
 *  - `arrivalContest`: the hit, default D11. The rusher rolls d100 + tackling/5 + speed/5, the
 *    quarterback d100 + strength/5 + agility/5, each rating read through `getAttr` by its registry
 *    id; at most one approach tilt enters as a modifier on the side it favors. Margin is the
 *    rusher's total minus the quarterback's; b or more is RUSHER_SACKS, less QB_SHEDS.
 *  - `secondArrival`: any contact after the play's first shed (J1-11): one d100 against `target`,
 *    above it RUSHER_SACKS (0.85 exactly at target 15), no rating read.
 *  - `tiltClassOf` and `tiltOf`: the strongest class first (CHOSEN, AM-7): BEHIND or NEVER over a
 *    seen PUSH or BLOCKED over the free-run clock. Each contact is of one class, so the classes
 *    split the contacts; an arm with a class's tilt off plays that class untilted (it never falls
 *    through to a weaker class's tilt). At step 4 NEVER cannot arise (seen is true before step 7),
 *    a BLOCKED man makes no contact before step 6, and BEHIND (ARC only) cannot meet a man on the
 *    free-run clock, so the precedence is held by unit tests only.
 *  - `contactFrom`: FRONT or SIDE as §4.0's card gives them (`resolve/approach.ts`'s `fromOf`, which
 *    does not change), and BEHIND for an ARC man who was live (not ARRIVED) when the quarterback
 *    stepped up on this play, from that STEP_UP on (CHOSEN, AM-7).
 *  - `inGridOrder`: the order contacts on a held ball resolve in, the half-second grid's
 *    (`resolve/rushThreat.ts`'s `nearestThreat`): `etaTick`, then the priority alignment, then the
 *    lower PlayerId.
 *
 * The closed forms the unit tests hold (plan §2.1, R-5, R-6): with equal reads and no tilt,
 * P(RUSHER_SACKS) = (100 - b)(101 - b)/20000 for b >= 1 (0.456 at 5) and
 * 1 - (99 + b)(100 + b)/20000 for b <= 0; the second arrival (100 - target)/100, 0.85 at 15.
 *
 * Until petitions P6 and P7 are in contracts (`sim/pocketRules.ts`), no bundle reaching a play may
 * carry the contact block, so nothing here runs in a game. The contracts names the result stands
 * in for: `ContestBand` is the `arrival_contest` CHECK's band (P6), `ContactFromClass` is P7's
 * `ContactFrom`.
 */
import type { AttrId, PlayerState, RollDetail, RollModifier, RushApproach } from "@ff/contracts";
import { ATTR } from "../attrs.js";
import { actorAttrModifier, compact, flatModifier, sumModifiers } from "../rolls.js";
import type { ContactTiltsTunables } from "../tunables.js";
import type { RushAlignment } from "../types.js";
import type { ThreatApproach } from "../events.js";
import { fromOf } from "./approach.js";
import type { ArrivalClock } from "./rushThreat.js";

/** The `arrival_contest` CHECK's two bands (P6): a sack, or he breaks free. */
export type ContestBand = "RUSHER_SACKS" | "QB_SHEDS";

/**
 * Where the hit came from, on §4.0's card: the engine's stand-in for contracts' `ContactFrom`
 * (P7), with the same three values.
 */
export type ContactFromClass = "FRONT" | "SIDE" | "BEHIND";

/** The three tilt classes of §4.5, and a contact that is of none of them. */
export type TiltClass = "BEHIND_NEVER" | "PUSH_BLOCKED" | "FREE_RUN" | "NONE";

/**
 * The one tilt a contact plays under, with its size: `NONE`, or the tilt of its class when the
 * bundle has that tilt on.
 */
export type ContactTilt =
  | { readonly kind: "NONE" }
  | { readonly kind: "PUSH_BLOCKED"; readonly quarterbackBonus: number }
  | { readonly kind: "FREE_RUN"; readonly rusherBonus: number }
  | { readonly kind: "BEHIND_NEVER"; readonly rusherBonus: number };

export const NO_TILT: ContactTilt = Object.freeze({ kind: "NONE" });

/** What the tilt reads of a contact: how he came, from where, whether he was seen, and his clock. */
export interface ContactFacts {
  /** His approach on the card, as on his `RUSH_THREAT` (BLOCKED only on a caught escape, from step 6). */
  readonly approach: RushApproach;
  readonly from: ContactFromClass;
  /** Whether the quarterback had seen him: true on every contact before ADR-089 step 7. */
  readonly seen: boolean;
  /**
   * He is on the free-run clock under the arm's own reading (AM-2's key: D19's three origins by
   * band, and the untouched exchange), read from his own timing record, never from his label.
   */
  readonly onFreeRunClock: boolean;
}

/**
 * The class of a contact, the strongest first (CHOSEN, AM-7): from BEHIND or never seen; else a
 * seen PUSH or BLOCKED man; else a man on the free-run clock; else none.
 */
export function tiltClassOf(facts: ContactFacts): TiltClass {
  if (facts.from === "BEHIND" || !facts.seen) return "BEHIND_NEVER";
  if (facts.approach === "PUSH" || facts.approach === "BLOCKED") return "PUSH_BLOCKED";
  if (facts.onFreeRunClock) return "FREE_RUN";
  return "NONE";
}

/** The tilt a contact plays under: its class's, when the bundle has that tilt on; else none. */
export function tiltOf(facts: ContactFacts, tilts: ContactTiltsTunables): ContactTilt {
  switch (tiltClassOf(facts)) {
    case "BEHIND_NEVER":
      return tilts.behindNever.on ? { kind: "BEHIND_NEVER", rusherBonus: tilts.behindNever.rusherBonus } : NO_TILT;
    case "PUSH_BLOCKED":
      return tilts.pushBlocked.on ? { kind: "PUSH_BLOCKED", quarterbackBonus: tilts.pushBlocked.quarterbackBonus } : NO_TILT;
    case "FREE_RUN":
      return tilts.freeRun.on ? { kind: "FREE_RUN", rusherBonus: tilts.freeRun.rusherBonus } : NO_TILT;
    case "NONE":
      return NO_TILT;
  }
}

/** The two d100 faces of one rated contest, drawn by the caller on the contest's fork label. */
export interface ContestRolls {
  readonly rusher: number;
  readonly quarterback: number;
  /** The fork label the rusher's face was drawn on (`.../rush/t<tick>/<rusherId>:contest`). */
  readonly rngLabel: string;
  /**
   * The fork label the quarterback's face was drawn on, its own (`.../rush/t<tick>/<quarterbackId>:contest:<rusherId>`,
   * AM-5's pattern): ADR-004's audit key is one label a roll, so the two faces never share one.
   */
  readonly quarterbackRngLabel: string;
}

/** A rated contest, as the `arrival_contest` CHECK will state it (P6). */
export interface ArrivalContestResult {
  /** `roll`: the rusher's d100 plus his reads and any tilt in his favor. */
  readonly rusherRoll: RollDetail;
  /** `opposedRoll`: the quarterback's d100 plus his reads and any tilt in his favor. */
  readonly quarterbackRoll: RollDetail;
  /** The rusher's total minus the quarterback's. */
  readonly margin: number;
  /** `target`: the boundary b. */
  readonly boundary: number;
  readonly band: ContestBand;
  /** The ratings read, in this order: rusher tackling, rusher speed, quarterback strength, quarterback agility. */
  readonly testsAttrs: readonly AttrId[];
  readonly tilt: ContactTilt;
}

const TILT_SOURCE = {
  PUSH_BLOCKED: "Approach tilt (seen PUSH or BLOCKED)",
  FREE_RUN: "Approach tilt (free-run clock)",
  BEHIND_NEVER: "Approach tilt (BEHIND or never seen)",
} as const;

function d100Detail(raw: number, modifiers: readonly RollModifier[], rngLabel: string): RollDetail {
  if (!Number.isInteger(raw) || raw < 1 || raw > 100) {
    throw new Error(`@ff/engine: a contest face must be a d100 face, 1 to 100, got ${String(raw)}`);
  }
  const mods = [...modifiers];
  return { die: "d100", raw, modifiers: mods, total: raw + sumModifiers(mods), rngLabel };
}

/**
 * The rated contest (D11), §4.5 item 4. A seen PUSH or BLOCKED tilt drops the rusher's speed and
 * adds to the quarterback; a free-run tilt adds to the rusher; a BEHIND or NEVER tilt drops the
 * quarterback's agility and adds to the rusher.
 */
export function arrivalContest(
  rusher: PlayerState,
  quarterback: PlayerState,
  tilt: ContactTilt,
  rolls: ContestRolls,
  boundary: number,
): ArrivalContestResult {
  const readsRusherSpeed = tilt.kind !== "PUSH_BLOCKED";
  const readsQuarterbackAgility = tilt.kind !== "BEHIND_NEVER";
  const rusherMods = compact([
    actorAttrModifier(rusher, "Tackling", ATTR.tackling),
    readsRusherSpeed ? actorAttrModifier(rusher, "Speed", ATTR.speed) : undefined,
    tilt.kind === "FREE_RUN" || tilt.kind === "BEHIND_NEVER" ? flatModifier(TILT_SOURCE[tilt.kind], tilt.rusherBonus) : undefined,
  ]);
  const quarterbackMods = compact([
    actorAttrModifier(quarterback, "Strength", ATTR.strength),
    readsQuarterbackAgility ? actorAttrModifier(quarterback, "Agility", ATTR.agility) : undefined,
    tilt.kind === "PUSH_BLOCKED" ? flatModifier(TILT_SOURCE.PUSH_BLOCKED, tilt.quarterbackBonus) : undefined,
  ]);
  const rusherRoll = d100Detail(rolls.rusher, rusherMods, rolls.rngLabel);
  if (rolls.quarterbackRngLabel === rolls.rngLabel) throw new Error(`@ff/engine: a contest's two faces share the label ${rolls.rngLabel}`);
  const quarterbackRoll = d100Detail(rolls.quarterback, quarterbackMods, rolls.quarterbackRngLabel);
  const margin = rusherRoll.total - quarterbackRoll.total;
  const testsAttrs: AttrId[] = [ATTR.tackling];
  if (readsRusherSpeed) testsAttrs.push(ATTR.speed);
  testsAttrs.push(ATTR.strength);
  if (readsQuarterbackAgility) testsAttrs.push(ATTR.agility);
  return {
    rusherRoll,
    quarterbackRoll,
    margin,
    boundary,
    band: margin >= boundary ? "RUSHER_SACKS" : "QB_SHEDS",
    testsAttrs,
    tilt,
  };
}

/** The second arrival, as the `arrival_contest` CHECK on `:contest2` will state it (P6). */
export interface SecondArrivalResult {
  /** One d100, no modifier. */
  readonly roll: RollDetail;
  readonly target: number;
  readonly band: ContestBand;
  /** Empty: no rating is read. */
  readonly testsAttrs: readonly AttrId[];
}

/** §4.5 item 6: one d100 against `target`; above it RUSHER_SACKS (P = (100 - target)/100). */
export function secondArrival(face: number, target: number, rngLabel: string): SecondArrivalResult {
  const roll = d100Detail(face, [], rngLabel);
  return { roll, target, band: roll.total > target ? "RUSHER_SACKS" : "QB_SHEDS", testsAttrs: [] };
}

/** What `contactFrom` reads of a threat: his approach, his alignment, and his part in a STEP_UP. */
export interface ContactFromFacts {
  readonly approach: ThreatApproach;
  readonly alignment: RushAlignment;
  /**
   * He was live (not ARRIVED) when the quarterback took a STEP_UP earlier on this play (the
   * STEP_UP's tick or before this contact).
   */
  readonly liveAtStepUp: boolean;
}

/** P7's `from`: BEHIND for an ARC man live at a STEP_UP on this play; else the card's FRONT or SIDE. */
export function contactFrom(facts: ContactFromFacts): ContactFromClass {
  if (facts.approach === "ARC" && facts.liveAtStepUp) return "BEHIND";
  return fromOf(facts.approach, facts.alignment);
}

/**
 * Contacts on a held ball in the half-second grid's order (AM-7's contact order): `etaTick`, then
 * the priority alignment (`arrival.simultaneousArrivalPriority`), then the lower PlayerId, exactly
 * as `nearestThreat` picks the first. A new array; the input is not touched.
 */
export function inGridOrder<T extends ArrivalClock>(threats: readonly T[], priority: RushAlignment): T[] {
  return [...threats].sort((a, b) => gridCompare(a, b, priority));
}

/** `nearestThreat`'s total order as a comparator: negative when `a` resolves first. */
export function gridCompare(
  a: Pick<ArrivalClock, "etaTick" | "alignment" | "rusher">,
  b: Pick<ArrivalClock, "etaTick" | "alignment" | "rusher">,
  priority: RushAlignment,
): number {
  if (a.etaTick !== b.etaTick) return a.etaTick < b.etaTick ? -1 : 1;
  if (a.alignment !== b.alignment) return a.alignment === priority ? -1 : b.alignment === priority ? 1 : 0;
  return String(a.rusher).localeCompare(String(b.rusher));
}
