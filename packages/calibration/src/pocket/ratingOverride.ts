/**
 * ADR-089 STEP 4: THE RATING OVERRIDE (step-4 plan §4 "Release probe", AM-7 items 13 and 14;
 * review F9, F10).
 *
 * The step-4 probes play a corpus with one attribute set or raised on chosen men: release 40 against
 * 80 on every player of the flat league, one team's quarterback raised on the generated league, a
 * quarterback's strength or agility raised, one rusher's tackling or speed raised, or one named man
 * raised in a replayed game. This module is that override, and nothing else:
 *
 *  - **Plain data.** A `RatingOverride` names an attribute by its registry id (`registryAttr`, Iron
 *    Rule 5: never a hard-coded field), a target (a role on one side or both, optionally one slot of
 *    it, or one named man) and a change (SET a value, or ADD a delta), so a worker can be handed it
 *    and a record can stamp it (`ratingOverridesKey`, `ratingOverridesDigest`).
 *  - **Pure.** `applyRatingOverrides` returns a new snapshot and never touches the one it is given;
 *    the attribute is written through the registry's own path (`getAttr`, `setAttr`: rounded and
 *    clamped to the 0 to 99 scale). The same snapshot and overrides always give the same snapshot,
 *    so the same seed gives the same game.
 *  - **Absent is today.** No override, or an empty list, returns the snapshot it was given (the same
 *    object), and `runOneGame` takes the path it took before (`RunGameInput.ratings`).
 *
 * Who a role names is read off the snapshot's personnel (`TeamSnapshot.offense`, `.defense`), the
 * way the engine is told who plays where (ADR-006): QB is the quarterback; EDGE the two ends;
 * INTERIOR the two interior linemen; RUSHER the ends then the interior; ALL every player the team
 * brings (`TeamSnapshot.players`, in key order). `slot` picks one of the role's men by position in
 * that list (EDGE slot 0 is the first end).
 */
import { getAttr, setAttr } from "@ff/contracts";
import type { PlayerState } from "@ff/contracts";
import type { GameSnapshot, TeamSnapshot } from "@ff/engine";
import { canonicalise } from "../harness/digest.js";
import { registryAttr } from "./freeRun.js";
import { fnv1a } from "./golden.js";

export const OVERRIDE_ROLES = ["ALL", "QB", "EDGE", "INTERIOR", "RUSHER"] as const;
export type OverrideRole = (typeof OVERRIDE_ROLES)[number];
export const OVERRIDE_SIDES = ["HOME", "AWAY", "BOTH"] as const;
export type OverrideSide = (typeof OVERRIDE_SIDES)[number];

export type OverrideTarget =
  | { readonly kind: "ROLE"; readonly role: OverrideRole; readonly side: OverrideSide; readonly slot?: number }
  | { readonly kind: "PLAYER"; readonly player: string };

export type OverrideChange = { readonly op: "SET"; readonly value: number } | { readonly op: "ADD"; readonly delta: number };

export interface RatingOverride {
  /** A registry attribute id (`ATTRIBUTE_REGISTRY_V1`), refused if the registry does not declare it. */
  readonly attr: string;
  readonly target: OverrideTarget;
  readonly change: OverrideChange;
}

/** Refuses an override that is not plain, whole and on the registry, by name. */
export function checkRatingOverride(o: RatingOverride): void {
  const where = `rating override ${canonicalise(o)}`;
  registryAttr(o.attr);
  const t = o.target;
  if (t.kind === "ROLE") {
    if (!(OVERRIDE_ROLES as readonly string[]).includes(t.role)) throw new RangeError(`${where}: no role ${String(t.role)} (${OVERRIDE_ROLES.join(", ")})`);
    if (!(OVERRIDE_SIDES as readonly string[]).includes(t.side)) throw new RangeError(`${where}: no side ${String(t.side)} (${OVERRIDE_SIDES.join(", ")})`);
    if (t.slot !== undefined && (!Number.isInteger(t.slot) || t.slot < 0)) throw new RangeError(`${where}: a slot is a whole number, at least 0`);
  } else if (t.kind === "PLAYER") {
    if (typeof t.player !== "string" || t.player.length === 0) throw new RangeError(`${where}: a named man needs his player id`);
  } else throw new RangeError(`${where}: a target is a ROLE or a PLAYER`);
  const c = o.change;
  if (c.op === "SET") {
    if (!Number.isInteger(c.value) || c.value < 0 || c.value > 99) throw new RangeError(`${where}: SET takes a whole rating, 0 to 99`);
  } else if (c.op === "ADD") {
    if (!Number.isInteger(c.delta) || c.delta === 0) throw new RangeError(`${where}: ADD takes a whole, non-zero delta`);
  } else throw new RangeError(`${where}: a change is SET or ADD`);
}

function roleOf(team: TeamSnapshot, role: OverrideRole): readonly string[] {
  switch (role) {
    case "ALL":
      return Object.keys(team.players);
    case "QB":
      return [String(team.offense.quarterback)];
    case "EDGE":
      return team.defense.edges.map(String);
    case "INTERIOR":
      return team.defense.interior.map(String);
    case "RUSHER":
      return [...team.defense.edges, ...team.defense.interior].map(String);
  }
}

/** The player ids one override reaches in a snapshot, home's first, each once, in a fixed order. */
export function ratingOverrideTargets(snapshot: GameSnapshot, o: RatingOverride): readonly string[] {
  checkRatingOverride(o);
  const t = o.target;
  if (t.kind === "PLAYER") return snapshot.home.players[t.player] !== undefined || snapshot.away.players[t.player] !== undefined ? [t.player] : [];
  const teams = t.side === "HOME" ? [snapshot.home] : t.side === "AWAY" ? [snapshot.away] : [snapshot.home, snapshot.away];
  const out: string[] = [];
  for (const team of teams) {
    const men = roleOf(team, t.role);
    const picked = t.slot === undefined ? men : men[t.slot] === undefined ? [] : [men[t.slot]!];
    for (const id of picked) if (team.players[id] !== undefined && !out.includes(id)) out.push(id);
  }
  return out;
}

function changed(p: PlayerState, o: RatingOverride): PlayerState {
  const id = registryAttr(o.attr);
  const values = p.attributes.values;
  const next = o.change.op === "SET" ? o.change.value : getAttr(values, id) + o.change.delta;
  return { ...p, attributes: { ...p.attributes, values: setAttr(values, id, next) } };
}

/**
 * The snapshot with every override applied in order (a later one sees an earlier one's value). Pure:
 * the given snapshot is not touched, and only the reached men's states are new objects. No override
 * returns the given snapshot itself.
 */
export function applyRatingOverrides(snapshot: GameSnapshot, overrides: readonly RatingOverride[] | undefined): GameSnapshot {
  if (overrides === undefined || overrides.length === 0) return snapshot;
  const home: Record<string, PlayerState> = { ...snapshot.home.players };
  const away: Record<string, PlayerState> = { ...snapshot.away.players };
  for (const o of overrides) {
    const view: GameSnapshot = { ...snapshot, home: { ...snapshot.home, players: home }, away: { ...snapshot.away, players: away } };
    for (const id of ratingOverrideTargets(view, o)) {
      if (home[id] !== undefined) home[id] = changed(home[id]!, o);
      if (away[id] !== undefined) away[id] = changed(away[id]!, o);
    }
  }
  return { ...snapshot, home: { ...snapshot.home, players: home }, away: { ...snapshot.away, players: away } };
}

/** Every player an override list reaches in a snapshot, each once (the probes' "raised men"). */
export function ratingOverridesReach(snapshot: GameSnapshot, overrides: readonly RatingOverride[] | undefined): ReadonlySet<string> {
  const out = new Set<string>();
  for (const o of overrides ?? []) for (const id of ratingOverrideTargets(snapshot, o)) out.add(id);
  return out;
}

/** The overrides' canonical text, for a stamp ("none" for none). */
export function ratingOverridesKey(overrides: readonly RatingOverride[] | undefined): string {
  if (overrides === undefined || overrides.length === 0) return "none";
  for (const o of overrides) checkRatingOverride(o);
  return canonicalise(overrides);
}

/** The overrides' digest, for a cache key ("none" for none). */
export function ratingOverridesDigest(overrides: readonly RatingOverride[] | undefined): string {
  const key = ratingOverridesKey(overrides);
  return key === "none" ? key : fnv1a(key);
}
