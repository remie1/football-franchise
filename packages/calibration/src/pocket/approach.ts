/**
 * THE APPROACH LABEL, ON LEGACY FACTS (ADR-089 step 0; plan §3.6; ADR-089 §4.0, lines 382-394).
 *
 * §4.0's approach card gives every threat an approach (FREE, ARC, THROUGH, PUSH or BLOCKED) and a
 * from-class, derived by CHOSEN rules over facts the engine already holds. Step 1's engine
 * publishes it on `RUSH_THREAT` (petition P4); until then calibration derives it here from the
 * stream, so S2 can count PUSH apart and S3's M4, M6 and M7 can key on it (C1-S10). At step 1 a
 * test asserts this equals the published label (ADR-089:1218).
 *
 * The facts, all on the stream today:
 *  - the matchup's move and alignment: `PLAY_START.defense.rush[]` (`sim/passPlay.ts:525-546`);
 *  - a twist's penetrator: `PLAY_START.defense.stunts[]`;
 *  - the rep's latent margin: the `pass_rush_rep` CHECK (`resolve/passRush.ts:95-124`), reached
 *    from a won rep's `RUSH_THREAT.rollRef` (its `pass_rush_tick` roll) through that tick's
 *    `rollRef` (ADR-059);
 *  - the threat's origin (`RUSH_THREAT.origin`) and, for a pickup or a stunt, its band: the
 *    `blitz_pickup` or `stunt_communication` CHECK its `rollRef` names.
 *
 * §4.0's table, applied in its own row order (the first row that fits):
 *
 *  1. completely unblocked and not a looper: origin UNBLOCKED, or a pickup BLOWN_UP → FREE,
 *     from FRONT if INTERIOR, SIDE if EDGE;
 *  2. a looper the line never touched (LOOPER_FREE), and a twist's penetrator → THROUGH, FRONT;
 *     a penetrator whatever his own threat's origin, once row 1 does not fit: a won rep, or a man
 *     touched on a pickup or a stunt (he inherits a free assignment when the stunt swaps them, or
 *     he is also another stunt's looper), so row 3 never reaches a penetrator;
 *  3. a man somebody got a hand on (RAN_THROUGH, LATE_EXCHANGE) → ARC (SIDE) if EDGE, THROUGH
 *     (FRONT) if INTERIOR. At steps 1 and 2 (and under legacy) that is his label with today's
 *     time (ADR-089:394); step 3 changes his timing, not his label;
 *  4. a won rep, move SPEED or FINESSE, EDGE → ARC, SIDE;
 *  5. a won rep, move POWER, latent margin 1 to 14 → PUSH, FRONT if INTERIOR, SIDE if EDGE;
 *  6. any other won rep (POWER 15 or more, a late beat from a margin of 0 or less, interior SPEED
 *     or FINESSE) → THROUGH (FRONT), or ARC (SIDE) if EDGE;
 *  7. a matchup not beaten → BLOCKED (no from-class: it is read only by the side-aware escape).
 *
 * BEHIND (after a step-up under an ARC, or a won SIDESTEP) needs step 7's movement; no legacy fact
 * gives it, so it is never produced here.
 */
import type { MatchEventEnvelope, RushAlignment, RushMove, ThreatOrigin } from "@ff/contracts";

export const APPROACHES = ["FREE", "ARC", "THROUGH", "PUSH", "BLOCKED"] as const;
export type Approach = (typeof APPROACHES)[number];

export const FROM_CLASSES = ["FRONT", "SIDE"] as const;
export type FromClass = (typeof FROM_CLASSES)[number];

/** Which row of §4.0's table gave the label, in the table's order. */
export const APPROACH_ROWS = [
  "UNBLOCKED_FREE",
  "LOOPER_OR_PENETRATOR",
  "TOUCHED",
  "EDGE_SPEED_FINESSE",
  "POWER_1_TO_14",
  "OTHER_WON_REP",
  "NOT_BEATEN",
] as const;
export type ApproachRow = (typeof APPROACH_ROWS)[number];

/** The pickup and stunt bands §4.0 names (`DEFAULT_TUNABLES.blitzPickup.bands`, `.stunt.bands`). */
export const PICKUP_FREE_BAND = "BLOWN_UP";
export const PICKUP_TOUCHED_BAND = "RAN_THROUGH";
export const LOOPER_FREE_BAND = "LOOPER_FREE";
export const LOOPER_TOUCHED_BAND = "LATE_EXCHANGE";

/** The PUSH window on a POWER rep's latent margin, both ends included (ADR-089:389). */
export const PUSH_MARGIN = { min: 1, max: 14 } as const;

export interface ApproachFacts {
  /** False for a matchup the play never beat (no RUSH_THREAT for him). */
  readonly threat: boolean;
  readonly origin?: ThreatOrigin;
  /** For PICKUP_LOST and STUNT_LOOPER: the band of the CHECK the threat's `rollRef` names. */
  readonly band?: string;
  readonly alignment: RushAlignment;
  readonly move: RushMove;
  /** For WON_REP: the `pass_rush_rep` margin (rusher total − blocker total). */
  readonly latentMargin?: number;
  /** Named as a penetrator by one of the play's stunts. */
  readonly penetrator: boolean;
}

export interface ApproachLabel {
  readonly approach: Approach;
  /** Absent only for BLOCKED. */
  readonly from?: FromClass;
  readonly row: ApproachRow;
}

const byAlignment = (alignment: RushAlignment, row: ApproachRow): ApproachLabel =>
  alignment === "EDGE" ? { approach: "ARC", from: "SIDE", row } : { approach: "THROUGH", from: "FRONT", row };

const fromOf = (alignment: RushAlignment): FromClass => (alignment === "EDGE" ? "SIDE" : "FRONT");

/** Row 2: a looper the line never touched, or a twist's penetrator. */
const PENETRATOR: ApproachLabel = Object.freeze({ approach: "THROUGH", from: "FRONT", row: "LOOPER_OR_PENETRATOR" });

/** §4.0's table on one rusher's facts. Throws on a fact the table cannot read (a band it does not name). */
export function approachOf(facts: ApproachFacts): ApproachLabel {
  if (!facts.threat) return { approach: "BLOCKED", row: "NOT_BEATEN" };
  const { origin, band, alignment, move } = facts;
  switch (origin) {
    case "UNBLOCKED":
      return { approach: "FREE", from: fromOf(alignment), row: "UNBLOCKED_FREE" };
    case "PICKUP_LOST":
      if (band === PICKUP_FREE_BAND) return { approach: "FREE", from: fromOf(alignment), row: "UNBLOCKED_FREE" };
      if (band !== PICKUP_TOUCHED_BAND) throw new Error(`approachOf: a PICKUP_LOST threat with band ${String(band)}; §4.0 reads ${PICKUP_FREE_BAND} or ${PICKUP_TOUCHED_BAND}`);
      // Row 2 before row 3 (review CT-N4): a touched man who is also a twist's penetrator is the penetrator.
      return facts.penetrator ? PENETRATOR : byAlignment(alignment, "TOUCHED");
    case "STUNT_LOOPER":
      if (band === LOOPER_FREE_BAND) return PENETRATOR;
      if (band !== LOOPER_TOUCHED_BAND) throw new Error(`approachOf: a STUNT_LOOPER threat with band ${String(band)}; §4.0 reads ${LOOPER_FREE_BAND} or ${LOOPER_TOUCHED_BAND}`);
      return facts.penetrator ? PENETRATOR : byAlignment(alignment, "TOUCHED");
    case "WON_REP": {
      if (facts.penetrator) return PENETRATOR;
      if (alignment === "EDGE" && (move === "SPEED" || move === "FINESSE")) return { approach: "ARC", from: "SIDE", row: "EDGE_SPEED_FINESSE" };
      if (move === "POWER") {
        const m = facts.latentMargin;
        if (m === undefined) throw new Error("approachOf: a POWER won rep needs its pass_rush_rep margin");
        if (m >= PUSH_MARGIN.min && m <= PUSH_MARGIN.max) return { approach: "PUSH", from: fromOf(alignment), row: "POWER_1_TO_14" };
      }
      return byAlignment(alignment, "OTHER_WON_REP");
    }
    case undefined:
      throw new Error("approachOf: a threat needs its origin");
  }
  throw new Error(`approachOf: an origin §4.0 does not name: ${String(origin)}`);
}

// --- reading the facts off the stream ----------------------------------------

export interface ThreatApproach {
  readonly rusher: string;
  readonly facts: ApproachFacts;
  readonly label: ApproachLabel;
}

interface CheckFacts {
  readonly checkKind: string;
  readonly band: string | undefined;
  readonly margin: number;
  readonly rollRef: string | undefined;
}

interface RushEntry {
  readonly rusher: string;
  readonly move: RushMove;
  readonly alignment: RushAlignment;
}

/**
 * `PLAY_START.payload` is `unknown` in contracts (the engine fills its own shape and exports none),
 * so it is read structurally, as `metrics/collect.ts` reads it.
 */
function rushOfPlayStart(payload: unknown): { readonly rush: readonly RushEntry[]; readonly penetrators: ReadonlySet<string> } | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const defense = (payload as { readonly defense?: { readonly rush?: unknown; readonly stunts?: unknown } }).defense;
  if (defense === undefined || !Array.isArray(defense.rush)) return undefined;
  const rush: RushEntry[] = [];
  for (const entry of defense.rush as readonly unknown[]) {
    const r = entry as { readonly rusher?: unknown; readonly move?: unknown; readonly alignment?: unknown };
    if (typeof r.rusher !== "string" || typeof r.move !== "string" || typeof r.alignment !== "string") {
      throw new Error("approachesOfPlay: a PLAY_START rush entry without rusher, move and alignment");
    }
    rush.push({ rusher: r.rusher, move: r.move as RushMove, alignment: r.alignment as RushAlignment });
  }
  const penetrators = new Set<string>();
  if (Array.isArray(defense.stunts)) {
    for (const s of defense.stunts as readonly { readonly penetrator?: unknown }[]) if (typeof s.penetrator === "string") penetrators.add(s.penetrator);
  }
  return { rush, penetrators };
}

/**
 * Every rusher of one play, labelled: the play's `PLAY_START.defense.rush[]`, each with §4.0's
 * label at his first `RUSH_THREAT`, or BLOCKED if he never was one. `play` is the play's events
 * (any order; the joins are by roll label). A play with no PLAY_START rush gives an empty map.
 * Throws if a threat's justifying CHECK is missing from the play: the stream must carry it.
 */
export function approachesOfPlay(play: readonly MatchEventEnvelope[]): ReadonlyMap<string, ThreatApproach> {
  let start: ReturnType<typeof rushOfPlayStart>;
  const checks = new Map<string, CheckFacts>();
  const threats = new Map<string, { readonly origin: ThreatOrigin; readonly rollRef: string }>();
  for (const { event } of play) {
    if (event.type === "PLAY_START") start = rushOfPlayStart(event.payload);
    else if (event.type === "CHECK") {
      const c = event.payload;
      // ADR-089 P3: a `pass_rush_tick` with no die (shape S) names no roll a threat could join to,
      // and is skipped; any other kind without a roll is a lost roll.
      const kind: string = c.checkKind;
      if (c.roll === undefined) {
        if (kind !== "pass_rush_tick") throw new Error(`a ${kind} CHECK without a roll`);
        continue;
      }
      checks.set(c.roll.rngLabel, { checkKind: c.checkKind, band: c.band, margin: c.margin, rollRef: c.rollRef });
    } else if (event.type === "RUSH_THREAT") {
      const t = event.payload;
      if (!threats.has(String(t.rusher))) threats.set(String(t.rusher), { origin: t.origin, rollRef: t.rollRef });
    }
  }
  const out = new Map<string, ThreatApproach>();
  if (start === undefined) return out;

  const checkOf = (label: string, kind: string, rusher: string): CheckFacts => {
    const c = checks.get(label);
    if (c === undefined || c.checkKind !== kind) {
      throw new Error(`approachesOfPlay: rusher ${rusher}'s threat names roll ${label}, and the play has no ${kind} CHECK with it`);
    }
    return c;
  };

  for (const r of start.rush) {
    const threat = threats.get(r.rusher);
    const base = { alignment: r.alignment, move: r.move, penetrator: start.penetrators.has(r.rusher) };
    let facts: ApproachFacts;
    if (threat === undefined) facts = { threat: false, ...base };
    else if (threat.origin === "PICKUP_LOST" || threat.origin === "STUNT_LOOPER") {
      const kind = threat.origin === "PICKUP_LOST" ? "blitz_pickup" : "stunt_communication";
      const band = checkOf(threat.rollRef, kind, r.rusher).band;
      facts = { threat: true, origin: threat.origin, ...(band === undefined ? {} : { band }), ...base };
    } else if (threat.origin === "WON_REP") {
      const tick = checkOf(threat.rollRef, "pass_rush_tick", r.rusher);
      if (tick.rollRef === undefined) throw new Error(`approachesOfPlay: rusher ${r.rusher}'s winning pass_rush_tick names no rep (ADR-059 rollRef)`);
      const rep = checkOf(tick.rollRef, "pass_rush_rep", r.rusher);
      facts = { threat: true, origin: "WON_REP", latentMargin: rep.margin, ...base };
    } else facts = { threat: true, origin: threat.origin, ...base };
    out.set(r.rusher, { rusher: r.rusher, facts, label: approachOf(facts) });
  }
  return out;
}

/** `approachesOfPlay` for every play of a game, keyed by play id, in stream order. */
export function approachesOfGame(events: readonly MatchEventEnvelope[]): ReadonlyMap<string, ReadonlyMap<string, ThreatApproach>> {
  const plays = new Map<string, MatchEventEnvelope[]>();
  for (const envelope of events) {
    const playId = (envelope.event as { readonly playId?: unknown }).playId;
    if (typeof playId !== "string") continue;
    const buffer = plays.get(playId);
    if (buffer === undefined) plays.set(playId, [envelope]);
    else buffer.push(envelope);
  }
  const out = new Map<string, ReadonlyMap<string, ThreatApproach>>();
  for (const [playId, play] of plays) {
    const labels = approachesOfPlay(play);
    if (labels.size > 0) out.set(playId, labels);
  }
  return out;
}
