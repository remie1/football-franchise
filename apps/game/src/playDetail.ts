/**
 * PLAY DETAIL — what happened under the hood on one snap: where every man stood at the snap, the
 * two calls as called, what the defence showed against what it played, the pre-snap reads, the
 * pocket tick by tick, and every roll of the dice.
 *
 * A renderer like the play log: every fact is an event's, read and worded. PLAY_START is
 * `unknown` in contracts, so the calls are read defensively and a field the stream lacks is left
 * out, never guessed. The one comparison made here — which defenders' shown assignment differs
 * from the one they played — is a display of two fields the call already carries side by side.
 */
import type { MatchEvent, RollDetail } from "@ff/contracts";
import { nameOf, type GameFile } from "./gameFile.js";
import { readSnapPicture, type SnapDiagram } from "./snapPicture.js";
import { gapWords, sentenceCase } from "./words.js";

export interface DetailFact {
  readonly label: string;
  readonly value: string;
}

export interface DisguiseRow {
  readonly defender: string;
  readonly showed: string;
  readonly played: string;
}

export interface ReadRow {
  readonly who: string;
  readonly read: string;
  readonly roll: string;
  readonly modifiers: string;
  readonly result: string;
}

export interface TimelineRow {
  /** The tick the moment happened on, or "snap" before the first TICK. */
  readonly tick: string;
  readonly text: string;
}

export interface DiceRow {
  readonly kind: string;
  readonly who: string;
  readonly roll: string;
  /** Where the roll's total came from, for a hover: "DT Pass Rush +12, ...". */
  readonly modifiers: string;
  /** "vs 78" (opposed) or "needs 60" (a target), or "" when the check states neither. */
  readonly against: string;
  readonly margin: number;
  readonly tier: string;
  readonly band: string;
}

export interface PlayDetail {
  /** Where every man stood at the snap (ADR-090 step 1). Absent in a file made before it. */
  readonly snap?: SnapDiagram;
  readonly offense: readonly DetailFact[];
  readonly defense: readonly DetailFact[];
  /** Defenders who showed one job and played another. Empty when the look was honest. */
  readonly disguise: readonly DisguiseRow[];
  readonly reads: readonly ReadRow[];
  readonly timeline: readonly TimelineRow[];
  readonly dice: readonly DiceRow[];
}

// --- defensive reading of PLAY_START ----------------------------------------------------------

type Obj = Readonly<Record<string, unknown>>;
const obj = (v: unknown): Obj | undefined => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Obj) : undefined);
const arr = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined);

function fact(facts: DetailFact[], label: string, value: string | undefined): void {
  if (value !== undefined && value.length > 0) facts.push({ label, value });
}

const HORIZONTAL: Readonly<Record<string, string>> = {
  LW: "left wide",
  LH: "left half",
  C: "middle",
  RH: "right half",
  RW: "right wide",
};

/** One assignment as a coach says it: "man on Wes Reed (press)", "deep middle zone". */
export function sayAssignment(file: GameFile, a: unknown): string {
  const o = obj(a);
  if (o === undefined) return "?";
  if (o.kind === "MAN") {
    const covers = str(o.covers);
    const technique = str(o.technique);
    return `man on ${covers === undefined ? "?" : nameOf(file, covers)}${technique === undefined ? "" : ` (${technique.toLowerCase()})`}`;
  }
  if (o.kind === "ZONE") {
    const zone = obj(o.zone);
    const v = str(zone?.vertical)?.toLowerCase() ?? "";
    const h = HORIZONTAL[str(zone?.horizontal) ?? ""] ?? str(zone?.horizontal)?.toLowerCase() ?? "";
    return `${v} ${h} zone`.trim();
  }
  return sentenceCase(str(o.kind) ?? "?").toLowerCase();
}

function namesOf(file: GameFile, ids: readonly unknown[]): string {
  return ids
    .map(str)
    .filter((id): id is string => id !== undefined)
    .map((id) => nameOf(file, id))
    .join(", ");
}

function offenseFacts(file: GameFile, kind: string, offense: Obj | undefined): DetailFact[] {
  const facts: DetailFact[] = [];
  if (offense === undefined) return facts;
  fact(facts, "Call", str(offense.call));
  fact(facts, "Formation", str(offense.formation));
  if (kind === "RUN_PLAY_V1") {
    fact(facts, "Scheme", str(offense.scheme) === undefined ? undefined : sentenceCase(str(offense.scheme)!));
    const carrier = str(offense.carrier);
    fact(facts, "Ball carrier", carrier === undefined ? undefined : nameOf(file, carrier));
    const gap = str(offense.designedGap);
    fact(facts, "Designed hole", gap === undefined ? undefined : gapWords(gap));
    return facts;
  }
  fact(facts, "Reads", str(offense.readSystem) === undefined ? undefined : sentenceCase(str(offense.readSystem)!));
  fact(facts, "Read order", namesOf(file, arr(offense.readOrder)) || undefined);
  const routes = arr(offense.routes)
    .map(obj)
    .filter((r): r is Obj => r !== undefined)
    .map((r) => `${nameOf(file, str(r.receiver) ?? "?")} ${str(r.routeName) ?? ""}`.trim());
  fact(facts, "Routes", routes.join(", ") || undefined);
  const scheme = obj(offense.protectionScheme);
  if (scheme !== undefined) {
    const kindWord = str(scheme.kind) ?? "?";
    const slide = str(scheme.slideSide);
    const pickup = namesOf(file, arr(scheme.available));
    fact(
      facts,
      "Protection",
      `${kindWord === "SLIDE" && slide !== undefined ? `slide ${slide.toLowerCase()}` : kindWord.toLowerCase()}${pickup === "" ? "" : `, pickup ${pickup}`}${scheme.slideCheck === true ? ", slide check on" : ""}`,
    );
  }
  fact(facts, "Coach's leash", str(offense.leash));
  return facts;
}

const DISGUISE_WORDS: Readonly<Record<string, string>> = {
  BASIC: "none (shows what it plays)",
  ROTATED: "rotated at the snap",
  LATE_ROTATION: "late rotation",
  STANDARD: "none",
  ZONE_BLITZ: "zone blitz",
  DELAYED: "delayed",
  ZERO: "zero (all-out)",
};

function defenseFacts(file: GameFile, defense: Obj | undefined): DetailFact[] {
  const facts: DetailFact[] = [];
  if (defense === undefined) return facts;
  fact(facts, "Call", str(defense.call));
  fact(facts, "Personnel", str(defense.personnel));
  fact(facts, "Front", str(defense.front));
  fact(facts, "Coverage", str(defense.coverage) === undefined ? undefined : sentenceCase(str(defense.coverage)!));
  const tags = arr(defense.tags).map(obj).filter((t): t is Obj => t !== undefined);
  for (const [kind, label] of [
    ["LOOK", "Looks (disguises)"],
    ["PRESSURE", "Pressures"],
    ["FRONT", "Front tags"],
  ] as const) {
    fact(facts, label, tags.filter((t) => t.kind === kind).map((t) => str(t.name) ?? "?").join(", ") || undefined);
  }
  const cd = str(defense.coverageDisguise);
  fact(facts, "Coverage disguise", cd === undefined ? undefined : (DISGUISE_WORDS[cd] ?? sentenceCase(cd)));
  const bd = str(defense.blitzDisguise);
  fact(facts, "Blitz disguise", bd === undefined ? undefined : (DISGUISE_WORDS[bd] ?? sentenceCase(bd)));
  const rush = arr(defense.rush)
    .map(obj)
    .filter((r): r is Obj => r !== undefined)
    .map((r) => {
      const move = str(r.move);
      return `${nameOf(file, str(r.rusher) ?? "?")}${move === undefined ? "" : ` (${move.toLowerCase()})`}`;
    });
  fact(facts, "Rushers", rush.join(", ") || undefined);
  const stunts = arr(defense.stunts);
  fact(facts, "Stunts", stunts.length === 0 ? undefined : String(stunts.length));
  return facts;
}

function disguiseRows(file: GameFile, defense: Obj | undefined): DisguiseRow[] {
  if (defense === undefined) return [];
  const shown = new Map(
    arr(defense.shownAssignments)
      .map(obj)
      .filter((a): a is Obj => a !== undefined)
      .map((a) => [str(a.defender), a] as const),
  );
  const rows: DisguiseRow[] = [];
  for (const a of arr(defense.assignments).map(obj)) {
    if (a === undefined) continue;
    const id = str(a.defender);
    const s = shown.get(id);
    if (id === undefined || s === undefined) continue;
    const showed = sayAssignment(file, s);
    const played = sayAssignment(file, a);
    if (showed !== played) rows.push({ defender: nameOf(file, id), showed, played });
  }
  return rows;
}

// --- the stream's own events for the snap ------------------------------------------------------

/**
 * "42 → 66": the die as it landed, then the total the roll states. Nothing is added up here.
 *
 * A uniform (ADR-089 P2: the breaking-time draw on a `pass_rush_beat`, shape S of the block clock)
 * is a number in (0, 1], not a face, so it is named and given to three places: "uniform 0.734".
 */
export function sayRoll(roll: RollDetail): string {
  if (roll.die === "uniform") {
    const raw = `uniform ${roll.raw.toFixed(3)}`;
    return roll.raw === roll.total ? raw : `${raw} → ${roll.total.toFixed(3)}`;
  }
  return roll.raw === roll.total ? `${roll.raw}` : `${roll.raw} → ${roll.total}`;
}

/** The roll's modifiers as listed: "QB Awareness +12, C Awareness +12". */
export function sayModifiers(roll: RollDetail): string {
  return roll.modifiers.map((m) => `${m.source} ${m.value < 0 ? "−" : "+"}${Math.abs(m.value)}`).join(", ");
}

const READ_WORDS: Readonly<Record<string, string>> = {
  coverage_read: "Coverage read",
  blitz_recognition: "Blitz read",
  leash_discipline: "Leash discipline",
};

type Ev = MatchEvent;

/** A threat's approach (ADR-089 P4; absent under `legacy`), in the words of ADR-089 §4.0's card. */
type ThreatApproach = NonNullable<Extract<Ev, { type: "RUSH_THREAT" }>["payload"]["approach"]>;
const APPROACH_WORDS: Readonly<Record<ThreatApproach, string>> = {
  FREE: "free",
  ARC: "round the corner",
  THROUGH: "straight through",
  PUSH: "bull rush, still engaged",
};

function timelineText(file: GameFile, e: Ev): string | undefined {
  const who = (id: string) => nameOf(file, id);
  switch (e.type) {
    case "POCKET_STATUS":
      return `Pocket: ${e.payload.status.toLowerCase()}`;
    case "RUSH_THREAT": {
      const p = e.payload;
      // A label this viewer has no words for (a newer file's) is shown in its own name, lower-cased.
      const approach = p.approach === undefined ? "" : `; ${APPROACH_WORDS[p.approach] ?? sentenceCase(p.approach).toLowerCase()}`;
      return `${who(p.rusher)} (${p.alignment.toLowerCase()}): ${p.state.toLowerCase()}${p.state === "TRAVELLING" ? `, due tick ${p.etaTick}` : ""} [${sentenceCase(p.origin).toLowerCase()}${approach}]`;
    }
    case "QB_READ":
      return `Reads ${who(e.payload.target)}: sees ${e.payload.perceivedOpenness} open (really ${e.payload.actualOpenness})`;
    case "QB_DECISION":
      return `Decides: ${e.payload.choice.toLowerCase().replace("_", " ")}${e.payload.target === undefined ? "" : ` to ${who(e.payload.target)}`}`;
    case "QB_PURSUIT":
      return `Out of the pocket; pursuit due by tick ${e.payload.deadlineTick}`;
    case "THROW":
      return `Throws to ${who(e.payload.target)} (${e.payload.throwType.toLowerCase().replace("_", " ")}, ${sentenceCase(e.payload.accuracyTier).toLowerCase()})`;
    case "THROWAWAY":
      return `Throws it away (${sentenceCase(e.payload.cause).toLowerCase()})`;
    case "CATCH_RESOLUTION":
      return `${who(e.payload.receiver)}: ${e.payload.caught ? "caught" : "not caught"} (${e.payload.catchType.toLowerCase()})`;
    case "TIPPED_BALL":
      return `Tipped by ${who(e.payload.deflector)}${e.payload.recoveredBy === undefined ? ", falls incomplete" : `, caught by ${who(e.payload.recoveredBy)}`}`;
    case "RUN_RESOLUTION":
      return `${who(e.payload.carrier)} carries: ${e.payload.yardsBeforeContact} before contact, ${e.payload.yards} in all`;
    case "PENALTY":
      return `Penalty: ${sentenceCase(e.payload.kind)} on ${who(e.payload.player)}`;
    case "PLAY_RESULT":
      return `Result: ${e.payload.yards} yards${e.payload.turnover ? ", turnover" : ""}${e.payload.score === undefined ? "" : `, ${e.payload.score} points`}`;
    default:
      return undefined;
  }
}

/** Every event of one play, in stream order. */
export function eventsOfPlay(file: GameFile, playId: string): Ev[] {
  return file.events.map((e) => e.event).filter((e) => "playId" in e && e.playId === playId);
}

export function buildPlayDetail(file: GameFile, playId: string): PlayDetail {
  const events = eventsOfPlay(file, playId);
  const start = events.find((e) => e.type === "PLAY_START");
  const payload = obj(start?.payload);
  const kind = str(payload?.kind) ?? "UNKNOWN";
  const offense = obj(payload?.offense);
  const defense = obj(payload?.defense);

  const reads: ReadRow[] = [];
  const timeline: TimelineRow[] = [];
  const dice: DiceRow[] = [];
  let tick = "snap";
  // The engine restates the pocket every tick; the timeline shows it only when it changes.
  let pocket: string | undefined;

  for (const e of events) {
    if (e.type === "TICK") {
      tick = String(e.payload.tick);
      continue;
    }
    if (e.type === "PRESNAP_READ") {
      const p = e.payload;
      reads.push({
        who: nameOf(file, p.actor),
        read: READ_WORDS[p.kind] ?? sentenceCase(p.kind),
        roll: `${sayRoll(p.roll)} vs ${p.target}`,
        modifiers: sayModifiers(p.roll),
        result: sentenceCase(p.band ?? p.tier),
      });
      continue;
    }
    if (e.type === "CHECK") {
      const p = e.payload;
      // ADR-089 P3: only a `pass_rush_tick` may lack a roll (shape S's tick, which draws no die);
      // any other kind without one is shown as a missing roll. The viewer renders what it meets.
      const checkKind: string = p.checkKind;
      const missing = checkKind === "pass_rush_tick" ? "no die" : "missing roll";
      dice.push({
        kind: sentenceCase(p.checkKind),
        who: p.actors.map((a) => nameOf(file, a)).join(" vs "),
        roll: p.roll === undefined ? missing : sayRoll(p.roll),
        modifiers: [p.roll === undefined ? "" : sayModifiers(p.roll), p.opposedRoll === undefined ? "" : `against: ${sayModifiers(p.opposedRoll)}`].filter((m) => m !== "").join("; "),
        against: p.opposedRoll !== undefined ? `vs ${sayRoll(p.opposedRoll)}` : p.target !== undefined ? `needs ${p.target}` : "",
        margin: p.margin,
        tier: sentenceCase(p.tier),
        band: p.band === undefined ? "" : sentenceCase(p.band),
      });
      continue;
    }
    if (e.type === "POCKET_STATUS") {
      if (e.payload.status === pocket) continue;
      pocket = e.payload.status;
    }
    const text = timelineText(file, e);
    if (text !== undefined) timeline.push({ tick, text });
  }

  const snap = readSnapPicture(file, payload?.snap);
  return {
    ...(snap === undefined ? {} : { snap }),
    offense: offenseFacts(file, kind, offense),
    defense: defenseFacts(file, defense),
    disguise: disguiseRows(file, defense),
    reads,
    timeline,
    dice,
  };
}
