/**
 * THE APPROACH LABEL (ADR-089 step 0, plan §3.6; step 1, plan §7.2 item 4; ADR-089 §4.0, lines
 * 382-394).
 *
 * §4.0's approach card gives every threat an approach (FREE, ARC, THROUGH, PUSH or BLOCKED) and a
 * from-class, derived by CHOSEN rules over facts the engine already holds. Step 1's engine
 * publishes the approach on every `RUSH_THREAT` of a `pocket-1` play (petition P4); a `legacy` play
 * carries none. So:
 *  - **`approachesOfPlay`, which every consumer reads** (`metrics/collect.ts`, `m4AlarmMix`,
 *    `m6Contact`, `m7Sight`): on a `pocket-1` play (its `PLAY_START` carries `rules`) each threat's
 *    label is the PUBLISHED `RUSH_THREAT.approach` (row `PUBLISHED`, with the derivation's own label
 *    beside it as `derived`); on a `legacy` play it is the derivation, as at step 0. A `pocket-1`
 *    threat without the field, or a `legacy` one with it, is refused.
 *  - **`deriveApproachesOfPlay`, the derivation**, kept for `legacy` streams and as S-8's
 *    cross-check of the published label (ADR-089:1218: "derived equals published"). At step 1 it
 *    learns shape S's join and shape L's PUSH (below).
 *
 * The facts, all on the stream:
 *  - the matchup's move and alignment: `PLAY_START.defense.rush[]` (`sim/passPlay.ts:525-546`);
 *  - a twist's penetrator: `PLAY_START.defense.stunts[]`;
 *  - the rep's latent margin: the `pass_rush_rep` CHECK (`resolve/passRush.ts:95-124`), reached
 *    from a won rep's `RUSH_THREAT.rollRef` through ADR-059's `rollRef` chain: under `legacy` and
 *    shape L the threat names the winning `pass_rush_tick`'s roll, whose `rollRef` names the rep;
 *    under shape S it names the rep's `pass_rush_beat` (P2), whose `rollRef` names the rep;
 *  - under shape L (a `pocket-1` play whose won rep is joined through a rolled tick), whether the
 *    matchup reported BLOCKER_BEATEN on a tick before the one that won (§4.0: "Under shape L, PUSH
 *    is a POWER rep that reported BLOCKER_BEATEN before it reported RUSHER_WINS_REP"; the stream is
 *    read in its own order for this one fact);
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
 *  5. a won rep, move POWER, latent margin 1 to 14 (the card's PUSH range) → PUSH, FRONT if
 *     INTERIOR, SIDE if EDGE; under shape L instead: a POWER rep that reported BLOCKER_BEATEN
 *     before it won → PUSH (row POWER_BEATEN_FIRST);
 *  6. any other won rep (POWER 15 or more, a late beat from a margin of 0 or less, interior SPEED
 *     or FINESSE) → THROUGH (FRONT), or ARC (SIDE) if EDGE;
 *  7. a matchup not beaten → BLOCKED (no from-class: it is read only by the side-aware escape).
 *
 * BEHIND (after a step-up under an ARC, or a won SIDESTEP) needs step 7's movement; no legacy fact
 * gives it, so it is never produced here.
 */
import type { MatchEventEnvelope, RushAlignment, RushApproach, RushMove, ThreatOrigin } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { rulesOnPlayStart } from "./rules.js";

export const APPROACHES = ["FREE", "ARC", "THROUGH", "PUSH", "BLOCKED"] as const;
export type Approach = (typeof APPROACHES)[number];

export const FROM_CLASSES = ["FRONT", "SIDE"] as const;
export type FromClass = (typeof FROM_CLASSES)[number];

/**
 * Which row of §4.0's table gave the label, in the table's order. `POWER_BEATEN_FIRST` is row 5
 * under shape L. `PUBLISHED` is not a row: it marks a label read off `RUSH_THREAT.approach` (a
 * `pocket-1` play), whose row the engine does not publish; the derivation's own label rides beside
 * it as `ThreatApproach.derived`.
 */
export const APPROACH_ROWS = [
  "UNBLOCKED_FREE",
  "LOOPER_OR_PENETRATOR",
  "TOUCHED",
  "EDGE_SPEED_FINESSE",
  "POWER_1_TO_14",
  "POWER_BEATEN_FIRST",
  "OTHER_WON_REP",
  "NOT_BEATEN",
  "PUBLISHED",
] as const;
export type ApproachRow = (typeof APPROACH_ROWS)[number];

/** The pickup and stunt bands §4.0 names (`DEFAULT_TUNABLES.blitzPickup.bands`, `.stunt.bands`). */
export const PICKUP_FREE_BAND = "BLOWN_UP";
export const PICKUP_TOUCHED_BAND = "RAN_THROUGH";
export const LOOPER_FREE_BAND = "LOOPER_FREE";
export const LOOPER_TOUCHED_BAND = "LATE_EXCHANGE";

/** The PUSH window on a POWER rep's latent margin, both ends included (ADR-089:389). */
export const PUSH_MARGIN = { min: 1, max: 14 } as const;

/** A PUSH range on the latent margin, both ends included. */
export interface PushMargin {
  readonly min: number;
  readonly max: number;
}

/**
 * The PUSH range a `pocket-1` bundle's approach card names (`passRush.approach.pushMinMargin`,
 * `pushMaxMargin`), or step 0's `PUSH_MARGIN` for tunables without the card (legacy).
 */
export function pushMarginOf(tunables: Tunables): PushMargin {
  const card = tunables.passRush.approach;
  return card === undefined ? PUSH_MARGIN : { min: card.pushMinMargin, max: card.pushMaxMargin };
}

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
  /**
   * For WON_REP under shape L only (a `pocket-1` play, the rep joined through a rolled tick):
   * whether the matchup reported BLOCKER_BEATEN on a tick before the one that won. Present, it
   * decides row 5 in place of the margin; absent (`legacy`, shape S), the margin decides.
   */
  readonly beatenBeforeWin?: boolean;
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

/**
 * §4.0's table on one rusher's facts. Throws on a fact the table cannot read (a band it does not
 * name). `push` is the card's PUSH range on the latent margin (default 1 to 14).
 */
export function approachOf(facts: ApproachFacts, push: PushMargin = PUSH_MARGIN): ApproachLabel {
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
        if (facts.beatenBeforeWin !== undefined) {
          // Shape L: BEATEN before the win is PUSH, whatever the margin (§4.0, ADR-089:1001).
          if (facts.beatenBeforeWin) return { approach: "PUSH", from: fromOf(alignment), row: "POWER_BEATEN_FIRST" };
        } else {
          const m = facts.latentMargin;
          if (m === undefined) throw new Error("approachOf: a POWER won rep needs its pass_rush_rep margin");
          if (m >= push.min && m <= push.max) return { approach: "PUSH", from: fromOf(alignment), row: "POWER_1_TO_14" };
        }
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
  /** What a consumer reads: the published label on a `pocket-1` play, the derivation's on a `legacy` one. */
  readonly label: ApproachLabel;
  /** On a `pocket-1` play only: the derivation's own label, for S-8's cross-check (derived equals published). */
  readonly derived?: ApproachLabel;
}

/** The approaches a `RUSH_THREAT` may publish (P4: never BLOCKED, which is not a threat). */
const PUBLISHED_APPROACHES: readonly string[] = ["FREE", "ARC", "THROUGH", "PUSH"];

/**
 * The from-class of a published approach on the rusher's alignment: the one every row of §4.0's
 * table gives with that approach (FREE and PUSH by alignment, ARC from the SIDE, THROUGH from the
 * FRONT).
 */
export function fromOfApproach(approach: Exclude<RushApproach, "BLOCKED">, alignment: RushAlignment): FromClass {
  switch (approach) {
    case "ARC":
      return "SIDE";
    case "THROUGH":
      return "FRONT";
    case "FREE":
    case "PUSH":
      return fromOf(alignment);
  }
}

interface CheckFacts {
  readonly checkKind: string;
  readonly band: string | undefined;
  readonly margin: number;
  readonly rollRef: string | undefined;
  /** The CHECK's place in the play's events (for shape L's "BLOCKER_BEATEN before the win"). */
  readonly index: number;
}

/** BLOCKER_BEATEN, the band shape L's PUSH reads (`passRush.bands`). */
export const BEATEN_BAND = "BLOCKER_BEATEN";

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

interface PlayFacts {
  readonly start: ReturnType<typeof rushOfPlayStart>;
  /** The play's `PLAY_START` carries a rules stamp: a `pocket-1` play. */
  readonly pocket1: boolean;
  readonly checks: ReadonlyMap<string, CheckFacts>;
  /** Each rusher's first `RUSH_THREAT`, with its published approach when it carries one. */
  readonly threats: ReadonlyMap<string, { readonly origin: ThreatOrigin; readonly rollRef: string; readonly approach: unknown }>;
  /** Each rusher's first rolled `pass_rush_tick` banded BLOCKER_BEATEN, by place in the play. */
  readonly beatenAt: ReadonlyMap<string, number>;
  /** Whether any `RUSH_THREAT` carried `approach`, and whether any lacked it. */
  readonly anyPublished: boolean;
  readonly anyUnpublished: string | undefined;
}

function readPlay(play: readonly MatchEventEnvelope[]): PlayFacts {
  let start: ReturnType<typeof rushOfPlayStart>;
  let pocket1 = false;
  const checks = new Map<string, CheckFacts>();
  const threats = new Map<string, { readonly origin: ThreatOrigin; readonly rollRef: string; readonly approach: unknown }>();
  const beatenAt = new Map<string, number>();
  let anyPublished = false;
  let anyUnpublished: string | undefined;
  for (const [index, { event }] of play.entries()) {
    if (event.type === "PLAY_START") {
      start = rushOfPlayStart(event.payload);
      pocket1 = rulesOnPlayStart(event.payload) !== undefined;
    } else if (event.type === "CHECK") {
      const c = event.payload;
      // ADR-089 P3: a `pass_rush_tick` with no die (shape S) names no roll a threat could join to,
      // and is skipped; any other kind without a roll is a lost roll.
      const kind: string = c.checkKind;
      if (c.roll === undefined) {
        if (kind !== "pass_rush_tick") throw new Error(`a ${kind} CHECK without a roll`);
        continue;
      }
      checks.set(c.roll.rngLabel, { checkKind: c.checkKind, band: c.band, margin: c.margin, rollRef: c.rollRef, index });
      const rusher = c.actors[0];
      if (c.checkKind === "pass_rush_tick" && c.band === BEATEN_BAND && rusher !== undefined && !beatenAt.has(String(rusher))) {
        beatenAt.set(String(rusher), index);
      }
    } else if (event.type === "RUSH_THREAT") {
      const t = event.payload;
      const approach = (t as { readonly approach?: unknown }).approach;
      if (approach === undefined) anyUnpublished ??= String(t.rusher);
      else anyPublished = true;
      if (!threats.has(String(t.rusher))) threats.set(String(t.rusher), { origin: t.origin, rollRef: t.rollRef, approach });
    }
  }
  return { start, pocket1, checks, threats, beatenAt, anyPublished, anyUnpublished };
}

/**
 * THE DERIVATION. Every rusher of one play, labelled by §4.0's table on the stream's facts: the
 * play's `PLAY_START.defense.rush[]`, each with his label at his first `RUSH_THREAT`, or BLOCKED if
 * he never was one. `play` is the play's events in stream order (the joins are by roll label; only
 * shape L's "BLOCKER_BEATEN before the win" reads the order). A play with no PLAY_START rush gives
 * an empty map. Throws if a threat's justifying CHECK is missing from the play: the stream must
 * carry it. A won rep is joined to its rep through the tick (`legacy`, shape L) or the beat
 * (shape S); on a `pocket-1` play joined through a tick (shape L), row 5 reads BLOCKER_BEATEN
 * before the win. `push` is the card's PUSH range (`pushMarginOf`), default 1 to 14.
 *
 * Under `legacy` this is what consumers read; under `pocket-1` it is S-8's cross-check only.
 */
export function deriveApproachesOfPlay(play: readonly MatchEventEnvelope[], push: PushMargin = PUSH_MARGIN): ReadonlyMap<string, ThreatApproach> {
  return deriveFrom(readPlay(play), push);
}

function deriveFrom(read: PlayFacts, push: PushMargin): ReadonlyMap<string, ThreatApproach> {
  const { start, pocket1, checks, threats, beatenAt } = read;
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
      const won = checks.get(threat.rollRef);
      if (won?.checkKind === "pass_rush_beat") {
        // Shape S: the threat names the beat (P2), and the beat names the rep it times.
        if (won.rollRef === undefined) throw new Error(`approachesOfPlay: rusher ${r.rusher}'s pass_rush_beat names no rep (rollRef)`);
        const rep = checkOf(won.rollRef, "pass_rush_rep", r.rusher);
        facts = { threat: true, origin: "WON_REP", latentMargin: rep.margin, ...base };
      } else {
        const tick = checkOf(threat.rollRef, "pass_rush_tick", r.rusher);
        if (tick.rollRef === undefined) throw new Error(`approachesOfPlay: rusher ${r.rusher}'s winning pass_rush_tick names no rep (ADR-059 rollRef)`);
        const rep = checkOf(tick.rollRef, "pass_rush_rep", r.rusher);
        // Shape L (a pocket-1 play on a rolled tick): BLOCKER_BEATEN before the winning tick.
        const beaten = pocket1 ? { beatenBeforeWin: (beatenAt.get(r.rusher) ?? Number.POSITIVE_INFINITY) < tick.index } : {};
        facts = { threat: true, origin: "WON_REP", latentMargin: rep.margin, ...beaten, ...base };
      }
    } else facts = { threat: true, origin: threat.origin, ...base };
    out.set(r.rusher, { rusher: r.rusher, facts, label: approachOf(facts, push) });
  }
  return out;
}

/**
 * WHAT CONSUMERS READ. On a `legacy` play, the derivation (`deriveApproachesOfPlay`), exactly as at
 * step 0. On a `pocket-1` play (its `PLAY_START` carries `rules`), each threatened rusher's label is
 * his first `RUSH_THREAT`'s PUBLISHED approach (P4), with its from-class (`fromOfApproach`) and row
 * `PUBLISHED`, the facts and the derivation's own label beside it (`derived`); a rusher never a
 * threat is BLOCKED, as derived. Refused: a `pocket-1` play with a `RUSH_THREAT` that carries no
 * approach, a `legacy` play with one that does, and a published value that is not a threat's
 * approach. `push` is the card's PUSH range, for the derivation.
 */
export function approachesOfPlay(play: readonly MatchEventEnvelope[], push: PushMargin = PUSH_MARGIN): ReadonlyMap<string, ThreatApproach> {
  const read = readPlay(play);
  const derived = deriveFrom(read, push);
  if (!read.pocket1) {
    if (read.anyPublished) throw new Error("approachesOfPlay: a legacy play (no PLAY_START rules) has a RUSH_THREAT that carries an approach");
    return derived;
  }
  if (read.anyUnpublished !== undefined) {
    throw new Error(`approachesOfPlay: a pocket-1 play's RUSH_THREAT for rusher ${read.anyUnpublished} carries no approach (P4)`);
  }
  const out = new Map<string, ThreatApproach>();
  for (const [rusher, d] of derived) {
    const threat = read.threats.get(rusher);
    if (threat === undefined) {
      out.set(rusher, d);
      continue;
    }
    const published = threat.approach;
    if (typeof published !== "string" || !PUBLISHED_APPROACHES.includes(published)) {
      throw new Error(`approachesOfPlay: rusher ${rusher}'s RUSH_THREAT publishes approach ${String(published)}, not a threat's approach`);
    }
    const approach = published as Exclude<RushApproach, "BLOCKED">;
    out.set(rusher, {
      rusher,
      facts: d.facts,
      label: { approach, from: fromOfApproach(approach, d.facts.alignment), row: "PUBLISHED" },
      derived: d.label,
    });
  }
  return out;
}

/** `approachesOfPlay` for every play of a game, keyed by play id, in stream order. */
export function approachesOfGame(events: readonly MatchEventEnvelope[], push: PushMargin = PUSH_MARGIN): ReadonlyMap<string, ReadonlyMap<string, ThreatApproach>> {
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
    const labels = approachesOfPlay(play, push);
    if (labels.size > 0) out.set(playId, labels);
  }
  return out;
}
