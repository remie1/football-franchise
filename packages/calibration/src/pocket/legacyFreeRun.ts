/**
 * TODAY'S FREE-RUNNER TIME, RESTATED FROM THE PUBLIC TUNABLES (ADR-089 step 0; plan §6.1; C2-S11).
 *
 * Under Wait every free runner who is not a down lineman keeps today's set time (ADR-089:558), so
 * M8 needs today's time for any man, not only the ones a stream happens to publish. The engine's
 * function is engine-internal (`freeRunnerArrivalSecondsFor`, `resolve/rushThreat.ts:507-525`; the
 * barrel trims resolvers, ADR-012), so it is restated here off `Tunables` alone:
 *
 *   UNBLOCKED / PICKUP_LOST  clamp(freeRunnerArrivalSeconds
 *                                  + freeRunnerPath.offsetSecondsByAlignmentAndDepth[alignment][depth(position)]
 *                                  + the pickup band's arrivalDelaySeconds (0 for UNBLOCKED),
 *                                  minArrivalSeconds, maxArrivalSeconds), toFixed(1)
 *   STUNT_LOOPER             (stunt.looperArrivalSeconds + the stunt band's arrivalDelaySeconds), toFixed(1)
 *                            (`sim/preSnap.ts:593`; no clamp there)
 *
 * with `depth(position)` read from the same tunables' `onLinePositions`, `deepPositions` and
 * `defaultDepthClass` (`freeRunnerDepthFor`, `rushThreat.ts:473-480`).
 *
 * **A real check, not an identity:** `restateFreeRunners` restates every free runner a play
 * publishes from the play's own facts (his alignment, his position from the snapshot, the band of
 * the CHECK his threat names) and sets it beside the published `etaTick`; the test asserts they are
 * equal. One subtlety it must get right: a stunt that is passed off exchanges WHOLE assignments,
 * free records included (`sim/preSnap.ts:570-581`, `withAssignmentOf`), so an UNBLOCKED record a
 * man carries after a pass-off was timed for his partner. A PICKUP_LOST record names its original
 * rusher directly (the pickup CHECK's second actor).
 */
import type { PlayerId, Position, RushAlignment, ThreatOrigin } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import type { Dropback, RushEntry } from "./throwClass.js";

export type LegacyDepth = "LINE" | "BOX" | "DEEP";

export function legacyDepthFor(tunables: Tunables, position: Position): LegacyDepth {
  const t = tunables.blitzPickup.freeRunnerPath;
  if ((t.onLinePositions as readonly string[]).includes(position)) return "LINE";
  if ((t.deepPositions as readonly string[]).includes(position)) return "DEEP";
  return t.defaultDepthClass as LegacyDepth;
}

function bandDelay(bands: readonly { readonly label: string; readonly arrivalDelaySeconds: number }[], band: string, what: string): number {
  const row = bands.find((b) => b.label === band);
  if (row === undefined) throw new Error(`legacyFreeRun: "${band}" is not a ${what} band of these tunables`);
  return row.arrivalDelaySeconds;
}

/** A pickup band's delay (`blitzPickup.bands[].arrivalDelaySeconds`). */
export function pickupDelaySeconds(tunables: Tunables, band: string): number {
  return bandDelay(tunables.blitzPickup.bands, band, "blitz_pickup");
}

/** A stunt band's delay (`stunt.bands[].arrivalDelaySeconds`). */
export function stuntDelaySeconds(tunables: Tunables, band: string): number {
  return bandDelay(tunables.stunt.bands, band, "stunt_communication");
}

/** Today's time for a man nobody blocks (UNBLOCKED, delay 0) or a lost pickup (his band's delay). */
export function legacyPathSeconds(tunables: Tunables, alignment: RushAlignment, position: Position, pickupDelay: number): number {
  const t = tunables.blitzPickup;
  const offsets = t.freeRunnerPath.offsetSecondsByAlignmentAndDepth as Readonly<Record<RushAlignment, Readonly<Record<LegacyDepth, number>>>>;
  const raw = t.freeRunnerArrivalSeconds + offsets[alignment][legacyDepthFor(tunables, position)] + pickupDelay;
  const bounded = Math.min(t.freeRunnerPath.maxArrivalSeconds, Math.max(t.freeRunnerPath.minArrivalSeconds, raw));
  return Number(bounded.toFixed(1));
}

/** Today's looper time (`sim/preSnap.ts:593`). */
export function legacyLooperSeconds(tunables: Tunables, stuntBand: string): number {
  return Number((tunables.stunt.looperArrivalSeconds + stuntDelaySeconds(tunables, stuntBand)).toFixed(1));
}

/** Today's time for one free runner, by origin. `band` is the pickup or stunt band (unused for UNBLOCKED). */
export function legacyFreeRunSeconds(
  tunables: Tunables,
  f: { readonly origin: ThreatOrigin; readonly alignment: RushAlignment; readonly position: Position; readonly band?: string },
): number {
  switch (f.origin) {
    case "UNBLOCKED":
      return legacyPathSeconds(tunables, f.alignment, f.position, 0);
    case "PICKUP_LOST":
      if (f.band === undefined) throw new Error("legacyFreeRunSeconds: a lost pickup needs its band");
      return legacyPathSeconds(tunables, f.alignment, f.position, pickupDelaySeconds(tunables, f.band));
    case "STUNT_LOOPER":
      if (f.band === undefined) throw new Error("legacyFreeRunSeconds: a looper needs his stunt band");
      return legacyLooperSeconds(tunables, f.band);
    case "WON_REP":
      throw new Error("legacyFreeRunSeconds: a won rep is not a free runner");
  }
  throw new Error(`legacyFreeRunSeconds: an unknown origin ${String(f.origin)}`);
}

/** One free runner of a play, as published and as restated. */
export interface RestatedFreeRunner {
  readonly rusher: string;
  readonly origin: Exclude<ThreatOrigin, "WON_REP">;
  /** The pickup or stunt band his threat's CHECK carries (undefined for UNBLOCKED). */
  readonly band?: string;
  /** The man whose alignment and position timed the record (himself, or his stunt partner after a pass-off). */
  readonly timedFor: string;
  readonly alignment: RushAlignment;
  readonly position: Position;
  readonly published: number;
  readonly restated: number;
}

/** The stunt bands that pass off (`stunt.bands[].passedOff`). */
function passesOff(tunables: Tunables, band: string | undefined): boolean {
  if (band === undefined) return false;
  return tunables.stunt.bands.some((b) => b.label === band && b.passedOff);
}

/**
 * Every free runner the play publishes at the snap (his first RUSH_THREAT, before the first TICK),
 * restated from the play's own facts. `positions` comes from the game's snapshot
 * (`positionsFromSnapshot`).
 */
export function restateFreeRunners(d: Dropback, positions: ReadonlyMap<PlayerId, Position>, tunables: Tunables): readonly RestatedFreeRunner[] {
  const rushBy = new Map<string, RushEntry>(d.start.rush.map((r) => [r.rusher, r]));
  const checkBy = new Map(d.checks.map((c) => [c.rngLabel, c]));
  const positionOf = (id: string): Position => {
    const p = positions.get(id as PlayerId);
    if (p === undefined) throw new Error(`restateFreeRunners: rusher ${id} is not on the snapshot`);
    return p;
  };
  // A passed-off stunt exchanged whole assignments: partner by partner.
  const passedOffPartner = new Map<string, string>();
  for (const s of d.start.stunts) {
    const check = d.checks.find((c) => c.checkKind === "stunt_communication" && c.actors.includes(s.looper) && c.actors.includes(s.penetrator));
    if (check !== undefined && passesOff(tunables, check.band)) {
      passedOffPartner.set(s.looper, s.penetrator);
      passedOffPartner.set(s.penetrator, s.looper);
    }
  }
  const out: RestatedFreeRunner[] = [];
  const seen = new Set<string>();
  for (const t of d.threats) {
    if (t.tick !== 0 || t.origin === "WON_REP" || seen.has(t.rusher)) continue;
    seen.add(t.rusher);
    let band: string | undefined;
    let timedFor = t.rusher;
    if (t.origin === "PICKUP_LOST") {
      const c = checkBy.get(t.rollRef);
      if (c === undefined || c.checkKind !== "blitz_pickup") throw new Error(`restateFreeRunners: ${t.rusher}'s lost pickup names no blitz_pickup CHECK`);
      band = c.band;
      timedFor = c.actors[1] ?? t.rusher;
    } else if (t.origin === "STUNT_LOOPER") {
      const c = checkBy.get(t.rollRef);
      if (c === undefined || c.checkKind !== "stunt_communication") throw new Error(`restateFreeRunners: ${t.rusher}'s loop names no stunt_communication CHECK`);
      band = c.band;
    } else {
      timedFor = passedOffPartner.get(t.rusher) ?? t.rusher;
    }
    const entry = rushBy.get(timedFor);
    if (entry === undefined) throw new Error(`restateFreeRunners: ${timedFor} is not on the play's rush`);
    const position = positionOf(timedFor);
    const restated = legacyFreeRunSeconds(tunables, { origin: t.origin, alignment: entry.alignment, position, ...(band === undefined ? {} : { band }) });
    out.push({
      rusher: t.rusher,
      origin: t.origin,
      ...(band === undefined ? {} : { band }),
      timedFor,
      alignment: entry.alignment,
      position,
      published: t.etaTick,
      restated,
    });
  }
  return out;
}
