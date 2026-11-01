/**
 * THE PLAY LOG — every snap and kick of a saved game, drive by drive, in plain words.
 *
 * A renderer over the stream (Iron Rule 3), like the engine's own debug printout: it reads what
 * the events say and words it. Where the stream has no event for a fact, the reading below is
 * the same one the engine's stat counter makes (`packages/engine/src/stats/statline.ts`), so
 * the log and the box score never disagree about what happened:
 *
 *  - a SACK is a dropback with no throw, no throwaway and no carry that lost ground;
 *  - the sacker is the last rusher the stream published as ARRIVED (a coverage sack has none);
 *  - an INTERCEPTION is a pass play that ended in a turnover; the man who made it is the defender
 *    in the contested catch banded INTERCEPTION, or whoever came up with a tipped ball.
 *
 * Built to outlive the front work: an event kind it does not know is skipped, and anything it
 * reads off PLAY_START (which contracts type as `unknown`) is read defensively.
 */
import type { MatchEvent, PenaltyOutcome, PocketStatus } from "@ff/contracts";
import { nameOf, teamName, type GameFile } from "./gameFile.js";
import { clock, downAndDistance, gain, gapWords, kickSpot, quarter, sentenceCase, spot } from "./words.js";

export type LineTag = "score" | "turnover" | "sack" | "pressure" | "penalty" | "big";

export interface LogLine {
  /** The play's id, when the line is a snap or a kick (the play-detail view will key on it). */
  readonly playId?: string;
  /** "Q1 14:53". Absent on kicks, which the stream does not clock. */
  readonly when?: string;
  /** "3rd & 7 at opp 32". Snaps only. */
  readonly situation?: string;
  /** What happened, as a sentence. */
  readonly text: string;
  /** The two calls, when the snap carries them: "Spot Option vs Cover 1 (Smoke)". */
  readonly calls?: string;
  readonly tags: readonly LineTag[];
}

export interface LoggedDrive {
  readonly number: number;
  readonly offense: string;
  readonly offenseName: string;
  /** "Drive 3 · City 01 Team 01 · from own 30 after a kickoff". */
  readonly heading: string;
  /** "3 plays, 70 yards, 1:19 · Touchdown". Absent if the stream never closed the drive. */
  readonly summary?: string;
  readonly lines: readonly LogLine[];
}

export interface PlayLog {
  /** Before the first drive: the coin toss and the opening kickoff. */
  readonly opening: readonly LogLine[];
  readonly drives: readonly LoggedDrive[];
}

// --- PLAY_START is `unknown` in contracts; read it defensively -----------------------------

interface SnapView {
  readonly kind: string;
  readonly down: number | undefined;
  readonly distance: number | undefined;
  readonly ballOn: number | undefined;
  readonly clockSeconds: number | undefined;
  readonly offenseCall: string | undefined;
  readonly defenseCall: string | undefined;
  readonly defenseTags: readonly string[];
  readonly quarterback: string | undefined;
}

function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>)[key] : undefined;
}
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export function readSnap(payload: unknown): SnapView {
  const situation = field(payload, "situation");
  const offense = field(payload, "offense");
  const defense = field(payload, "defense");
  const tags = field(defense, "tags");
  return {
    kind: str(field(payload, "kind")) ?? "UNKNOWN",
    down: num(field(situation, "down")),
    distance: num(field(situation, "distance")),
    ballOn: num(field(situation, "ballOn")),
    clockSeconds: num(field(situation, "clockSeconds")),
    offenseCall: str(field(offense, "call")),
    defenseCall: str(field(defense, "call")),
    defenseTags: Array.isArray(tags) ? tags.map((t) => str(field(t, "name"))).filter((t): t is string => t !== undefined) : [],
    quarterback: str(field(offense, "quarterback")),
  };
}

// --- one snap ---------------------------------------------------------------------------------

type Ev = MatchEvent;
type Of<T extends Ev["type"]> = Extract<Ev, { type: T }>;

const POCKET_ORDER: readonly PocketStatus[] = ["CLEAN", "PRESSURE", "COLLAPSING", "IMMEDIATE"];
const POCKET_WORDS: Readonly<Record<PocketStatus, string | undefined>> = {
  CLEAN: undefined,
  PRESSURE: "under pressure",
  COLLAPSING: "pocket collapsing",
  IMMEDIATE: "immediate pressure",
};

/** How the log words a flag that was not marked off (ADR-093 F3). */
const FLAG_WORDS: Readonly<Record<Exclude<PenaltyOutcome, "ENFORCED">, string>> = {
  DECLINED: "declined",
  OFFSET: "offsetting",
  SUPERSEDED: "superseded",
};

/** Yards at or past which a snap is flagged as a big play. Display only. */
export const BIG_PLAY_YARDS = 20;

function first<T extends Ev["type"]>(events: readonly Ev[], type: T): Of<T> | undefined {
  return events.find((e): e is Of<T> => e.type === type);
}
function all<T extends Ev["type"]>(events: readonly Ev[], type: T): Of<T>[] {
  return events.filter((e): e is Of<T> => e.type === type);
}

function describeSnap(file: GameFile, snap: SnapView, events: readonly Ev[]): { text: string; tags: LineTag[] } {
  const who = (id: string) => nameOf(file, id);
  const result = first(events, "PLAY_RESULT");
  const yards = result?.payload.yards ?? 0;
  const turnover = result?.payload.turnover ?? false;
  const scored = result?.payload.score !== undefined;
  const tags: LineTag[] = [];
  const parts: string[] = [];

  const run = first(events, "RUN_RESOLUTION");
  const throwEvent = first(events, "THROW");
  const throwaway = first(events, "THROWAWAY");
  const passer = snap.quarterback === undefined ? "The quarterback" : who(snap.quarterback);

  if (snap.kind === "PASS_PLAY_V1") {
    if (throwEvent !== undefined) {
      const target = throwEvent.payload.target;
      const tip = first(events, "TIPPED_BALL");
      const caught = all(events, "CATCH_RESOLUTION").find((c) => c.payload.caught);
      if (turnover) {
        const contested = all(events, "CHECK").find((c) => c.payload.checkKind === "contested_catch" && c.payload.band === "INTERCEPTION");
        const thief = contested?.payload.actors[1] ?? tip?.payload.recoveredBy;
        parts.push(`${passer} intercepted${thief === undefined ? "" : ` by ${who(thief)}`}, intended for ${who(target)}`);
      } else if (caught !== undefined || (tip?.payload.recoveredBy !== undefined && file.players[tip.payload.recoveredBy]?.team === file.players[target]?.team)) {
        const receiver = caught?.payload.receiver ?? tip!.payload.recoveredBy!;
        parts.push(`${passer} complete to ${who(receiver)} ${gain(yards)}`);
      } else {
        const dropped = all(events, "CHECK").some((c) => c.payload.checkKind === "catch" && c.payload.band?.startsWith("DROPPED") === true);
        parts.push(`${passer} incomplete, intended for ${who(target)}${dropped ? " (dropped)" : tip !== undefined ? " (tipped)" : ""}`);
      }
    } else if (throwaway !== undefined) {
      parts.push(`${passer} throws it away${throwaway.payload.cause === "CLOCK_EXPIRED" ? " (nobody open)" : ""}`);
    } else if (run !== undefined) {
      parts.push(`${who(run.payload.carrier)} scrambles ${gain(yards)}`);
    } else if (yards < 0) {
      const arrived = all(events, "RUSH_THREAT").filter((t) => t.payload.state === "ARRIVED").at(-1);
      parts.push(`${passer} sacked${arrived === undefined ? "" : ` by ${who(arrived.payload.rusher)}`} ${gain(yards)}`);
      tags.push("sack");
    } else {
      parts.push(`Pass play ${gain(yards)}`);
    }
    const worst = all(events, "POCKET_STATUS").reduce<PocketStatus>(
      (w, p) => (POCKET_ORDER.indexOf(p.payload.status) > POCKET_ORDER.indexOf(w) ? p.payload.status : w),
      "CLEAN",
    );
    const pressure = POCKET_WORDS[worst];
    if (pressure !== undefined && !tags.includes("sack")) {
      parts[0] += `, ${pressure}`;
      tags.push("pressure");
    }
  } else if (run !== undefined) {
    const gap = run.payload.gap === undefined ? "" : ` ${gapWords(run.payload.gap)}`;
    parts.push(`${who(run.payload.carrier)} runs${gap} ${gain(yards)}${turnover ? ", fumbles, lost" : ""}`);
  } else {
    parts.push(`${sentenceCase(snap.kind)} ${gain(yards)}`);
  }

  for (const p of all(events, "PENALTY")) {
    const flag = p.payload;
    // An outcome this viewer has no words for (a newer file's) is shown in its own name, lower-cased.
    const ruling =
      flag.outcome !== "ENFORCED"
        ? (FLAG_WORDS[flag.outcome] ?? sentenceCase(flag.outcome).toLowerCase())
        : flag.enforcement.safety
          ? "safety"
          : `${flag.enforcement.yards} ${flag.enforcement.yards === 1 ? "yard" : "yards"}, accepted`;
    parts.push(`Penalty on ${who(flag.player)}: ${sentenceCase(flag.kind)}, ${ruling}`);
    if (!tags.includes("penalty")) tags.push("penalty");
  }
  if (scored) {
    parts.push("Touchdown!");
    tags.push("score");
  }
  if (turnover) tags.push("turnover");
  if (yards >= BIG_PLAY_YARDS) tags.push("big");
  return { text: parts.join(". ") + (scored ? "" : "."), tags };
}

function describeKick(file: GameFile, e: Of<"KICKOFF"> | Of<"PUNT"> | Of<"PLACEKICK">): { text: string; tags: LineTag[] } {
  const who = (id: string) => nameOf(file, id);
  switch (e.type) {
    case "KICKOFF": {
      const p = e.payload;
      if (p.touchback) return { text: `${who(p.kicker)} kicks off. Touchback.`, tags: [] };
      const ret = p.returner === undefined ? "" : `, ${who(p.returner)} returns ${p.returnYards} yards`;
      return { text: `${who(p.kicker)} kicks off${ret} to ${kickSpot(p.resultYardLine)}.`, tags: [] };
    }
    case "PUNT": {
      const p = e.payload;
      const head = `${who(p.punter)} punts ${p.grossYards} yards`;
      if (p.touchback) return { text: `${head}. Touchback.`, tags: [] };
      if (p.downed) return { text: `${head}, downed at ${kickSpot(p.resultYardLine)}.`, tags: [] };
      const ret = p.returner === undefined ? "" : `, ${who(p.returner)} returns ${p.returnYards} yards`;
      return { text: `${head}${ret} to ${kickSpot(p.resultYardLine)}.`, tags: [] };
    }
    case "PLACEKICK": {
      const p = e.payload;
      if (p.kind === "EXTRA_POINT") return { text: `${who(p.kicker)}'s extra point is ${p.made ? "good" : "no good"}.`, tags: p.made ? ["score"] : [] };
      return {
        text: `${who(p.kicker)}'s ${p.distanceYards}-yard field goal is ${p.made ? "good" : "no good"}.`,
        tags: p.made ? ["score"] : [],
      };
    }
  }
}

// --- the whole game ---------------------------------------------------------------------------

const CAUSE_WORDS: Readonly<Record<string, string>> = {
  OPENING_KICKOFF: "the opening kickoff",
  SECOND_HALF_KICKOFF: "the second-half kickoff",
  OVERTIME_KICKOFF: "the overtime kickoff",
  KICKOFF_AFTER_SCORE: "a kickoff",
  FREE_KICK_AFTER_SAFETY: "a free kick",
  PUNT: "a punt",
  INTERCEPTION: "an interception",
  DOWNS: "a turnover on downs",
  MISSED_FIELD_GOAL: "a missed field goal",
  END_OF_PERIOD: "the end of the period",
};

interface DriveDraft {
  number: number;
  offense: string;
  heading: string;
  summary?: string;
  lines: LogLine[];
}

export function buildPlayLog(file: GameFile): PlayLog {
  const opening: LogLine[] = [];
  const drives: DriveDraft[] = [];
  /** Lines that belong to the next drive's lead-in: a kickoff comes before its drive starts. */
  let leadIn: LogLine[] = [];
  let inDrive = false;
  let period = 1;

  const push = (line: LogLine, beforeNextDrive = false) => {
    if (beforeNextDrive && !inDrive) leadIn.push(line);
    else if (drives.length === 0) opening.push(line);
    else drives[drives.length - 1]!.lines.push(line);
  };

  // A snap's events, gathered until its PLAY_RESULT closes it.
  let snap: { playId: string; view: SnapView; events: Ev[] } | null = null;

  for (const { event } of file.events) {
    if (snap !== null && "playId" in event && event.playId === snap.playId) {
      snap.events.push(event);
      if (event.type === "PLAY_RESULT") {
        const { text, tags } = describeSnap(file, snap.view, snap.events);
        const v = snap.view;
        const calls =
          v.offenseCall === undefined
            ? undefined
            : `${v.offenseCall}${v.defenseCall === undefined ? "" : ` vs ${v.defenseCall}`}${v.defenseTags.length === 0 ? "" : ` (${v.defenseTags.join(", ")})`}`;
        push({
          playId: snap.playId,
          ...(v.clockSeconds === undefined ? {} : { when: `${quarter(period)} ${clock(v.clockSeconds)}` }),
          ...(v.down === undefined || v.distance === undefined || v.ballOn === undefined
            ? {}
            : { situation: downAndDistance(v.down, v.distance, v.ballOn) }),
          text,
          ...(calls === undefined ? {} : { calls }),
          tags,
        });
        snap = null;
      }
      continue;
    }

    switch (event.type) {
      case "PLAY_START":
        snap = { playId: event.playId, view: readSnap(event.payload), events: [event] };
        break;
      case "COIN_TOSS":
        opening.push({
          text: `${teamName(file, event.payload.winner)} win the toss and ${event.payload.choice === "RECEIVE" ? "will receive" : "defer"}.`,
          tags: [],
        });
        break;
      case "PERIOD_START":
        period = event.payload.period;
        break;
      case "KICKOFF":
        push({ playId: event.playId, ...describeKick(file, event) }, true);
        break;
      case "PUNT":
      case "PLACEKICK":
        push({ playId: event.playId, ...describeKick(file, event) });
        break;
      case "COACH_DECISION":
        if (event.payload.kind === "FOURTH_DOWN" && event.payload.choice === "GO_FOR_IT") push({ text: "Going for it on fourth down.", tags: [] });
        break;
      case "DRIVE_START": {
        const p = event.payload;
        drives.push({
          number: p.driveNumber,
          offense: String(p.offense),
          heading: `${teamName(file, p.offense)} ball at the ${spot(p.startYardLine)}, ${quarter(p.period)} ${clock(p.clockSeconds)}, after ${CAUSE_WORDS[p.cause] ?? sentenceCase(p.cause)}`,
          lines: leadIn,
        });
        leadIn = [];
        inDrive = true;
        break;
      }
      case "DRIVE_END": {
        const p = event.payload;
        const drive = drives[drives.length - 1];
        if (drive !== undefined) {
          drive.summary = `${p.plays} ${p.plays === 1 ? "play" : "plays"}, ${p.yards} yards, ${clock(p.elapsedSeconds)} · ${sentenceCase(p.result)}`;
        }
        inDrive = false;
        break;
      }
      default:
        break;
    }
  }

  // A kickoff with no drive after it (the game ended) stays where it was kicked, not lost.
  if (drives.length > 0) drives[drives.length - 1]!.lines.push(...leadIn);
  return {
    opening: [...opening, ...(drives.length === 0 ? leadIn : [])],
    drives: drives.map((d) => ({
      number: d.number,
      offense: d.offense,
      offenseName: teamName(file, d.offense),
      heading: d.heading,
      ...(d.summary === undefined ? {} : { summary: d.summary }),
      lines: d.lines,
    })),
  };
}
