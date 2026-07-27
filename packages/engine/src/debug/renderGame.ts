/**
 * §17 AT GAME SCALE — the drive chart and the box score, rendered PURELY from
 * the event stream.
 *
 * Same discipline as `renderPlay`: the only inputs are envelopes and a name
 * lookup. No `TUNABLES`, no band tables, no `MatchState`, no `GameSummary`. If a
 * number is not in the stream this printout does not know it, which is the point
 * — the printout is the cheapest possible test of "can a consumer reconstruct
 * the game from the events alone?" (ADR-007's reconstruction test, one level up).
 *
 * `renderDriveChart` is the one to read when the loop looks wrong: it is the
 * shape of the game — who had the ball, from where, for how long, and what
 * happened — on one screen.
 */
import type { TeamId } from "@ff/contracts";
import type { GameEvent, GameEventEnvelope } from "../game/events.js";
import { reduceStatlines } from "../stats/statline.js";
import type { StatLine } from "../stats/statline.js";
import type { NameLookup } from "./renderPlay.js";

const RULE = "=".repeat(78);
const THIN = "-".repeat(78);

export interface GameNameLookup {
  readonly player: NameLookup;
  readonly team: (id: TeamId) => string;
}

function eventsOf<T extends GameEvent["type"]>(
  events: readonly GameEventEnvelope[],
  type: T,
): Extract<GameEvent, { type: T }>[] {
  return events
    .map((e) => e.event)
    .filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

function clock(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, Math.round(seconds)) % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function pad(text: string, width: number): string {
  return text.length >= width ? text.slice(0, width) : text + " ".repeat(width - text.length);
}

function padLeft(text: string, width: number): string {
  return text.length >= width ? text : " ".repeat(width - text.length) + text;
}

/**
 * A spot in football's own notation rather than the engine's. `ballOn` is yards
 * from the offence's own goal line, which is the right internal representation
 * and an unreadable printout: "own 56" is a real place and nobody says it.
 */
function yardLine(ballOn: number): string {
  if (ballOn === 50) return "50";
  return ballOn < 50 ? `own ${ballOn}` : `opp ${100 - ballOn}`;
}

/**
 * THE DRIVE CHART — one line per drive, in order, with the period it began in,
 * where it started, how long it lasted and how it ended.
 *
 * This is the printout that makes the game loop legible, in the way §17.1's play
 * printout makes a single snap legible. Everything on it is a `DRIVE_START` /
 * `DRIVE_END` pair plus the `SCORE` events between them.
 */
export function renderDriveChart(
  events: readonly GameEventEnvelope[],
  names: GameNameLookup,
): string {
  const lines: string[] = [RULE, "DRIVE CHART", RULE, ""];

  const starts = new Map<number, Extract<GameEvent, { type: "DRIVE_START" }>>();
  for (const start of eventsOf(events, "DRIVE_START")) {
    starts.set(start.payload.driveNumber, start);
  }

  lines.push(
    `${pad("#", 4)}${pad("Qtr", 5)}${pad("Start", 8)}${pad("Offense", 12)}` +
      `${pad("From", 8)}${pad("Pl", 4)}${pad("Yds", 6)}${pad("Time", 7)}${pad("Result", 20)}Pts`,
  );
  lines.push(THIN);

  for (const end of eventsOf(events, "DRIVE_END")) {
    const start = starts.get(end.payload.driveNumber);
    lines.push(
      pad(String(end.payload.driveNumber), 4) +
        pad(start === undefined ? "?" : `Q${start.payload.period}`, 5) +
        pad(start === undefined ? "?" : clock(start.payload.clockSeconds), 8) +
        pad(names.team(end.payload.offense), 12) +
        pad(start === undefined ? "?" : yardLine(start.payload.startYardLine), 8) +
        pad(String(end.payload.plays), 4) +
        pad(String(end.payload.yards), 6) +
        pad(clock(end.payload.elapsedSeconds), 7) +
        pad(end.payload.result, 20) +
        padLeft(end.payload.points === 0 ? "-" : String(end.payload.points), 3),
    );
  }

  lines.push("", RULE);
  return lines.join("\n");
}

/**
 * The game summary: scoreboard by period, the special-teams ledger, and the
 * §17.2-style totals — every one of them counted from the stream.
 */
export function renderGameSummary(
  events: readonly GameEventEnvelope[],
  names: GameNameLookup,
): string {
  const start = eventsOf(events, "GAME_START")[0];
  const end = eventsOf(events, "GAME_END")[0];
  if (start === undefined || end === undefined) return "";

  const home = start.payload.home;
  const away = start.payload.away;
  const lines: string[] = [RULE, "GAME SUMMARY", RULE, ""];

  // ADR-014 item 8: one closing event. The provenance that used to arrive on a
  // sibling `GAME_SUMMARY` is on the widened `GAME_END`.
  const periods = end.payload.periods;
  const header = ["", ...periods.map((p) => `Q${p.period}`), "F"];
  const homeRow = [names.team(home), ...periods.map((p) => String(p.home)), String(end.payload.home)];
  const awayRow = [names.team(away), ...periods.map((p) => String(p.away)), String(end.payload.away)];
  const width = 12;
  lines.push(header.map((h, i) => (i === 0 ? pad(h, width) : padLeft(h, 5))).join(""));
  lines.push(awayRow.map((h, i) => (i === 0 ? pad(h, width) : padLeft(h, 5))).join(""));
  lines.push(homeRow.map((h, i) => (i === 0 ? pad(h, width) : padLeft(h, 5))).join(""));
  lines.push("");

  lines.push(
    `  Ended: ${end.payload.reason} · ${end.payload.plays} plays · ${end.payload.drives} drives`,
  );
  // ★3 — the seed is the one thing on the summary that is NOT derivable from
  // the stream, and it is the reason the game is re-runnable at all.
  lines.push(`  Seed:  "${end.payload.seed}"`);
  lines.push("");

  // Drive-result census: the shape of the game in nine numbers.
  const census = new Map<string, number>();
  for (const drive of eventsOf(events, "DRIVE_END")) {
    census.set(drive.payload.result, (census.get(drive.payload.result) ?? 0) + 1);
  }
  lines.push("DRIVES BY RESULT:");
  for (const [result, count] of [...census.entries()].sort()) {
    lines.push(`  ${pad(result, 22)}${padLeft(String(count), 3)}`);
  }
  lines.push("");

  // Special teams — placeholder depth, and the printout says so rather than
  // implying a model that is not there.
  const kicks = eventsOf(events, "PLACEKICK");
  const punts = eventsOf(events, "PUNT");
  const kickoffs = eventsOf(events, "KICKOFF");
  lines.push("SPECIAL TEAMS (placeholder depth — one check per kick):");
  const fg = kicks.filter((k) => k.payload.kind === "FIELD_GOAL");
  const xp = kicks.filter((k) => k.payload.kind === "EXTRA_POINT");
  lines.push(
    `  Field goals: ${fg.filter((k) => k.payload.made).length}/${fg.length}` +
      (fg.length === 0
        ? ""
        : ` (longest made ${Math.max(0, ...fg.filter((k) => k.payload.made).map((k) => k.payload.distanceYards))})`),
  );
  lines.push(`  Extra points: ${xp.filter((k) => k.payload.made).length}/${xp.length}`);
  lines.push(
    `  Punts: ${punts.length}` +
      (punts.length === 0
        ? ""
        : `, gross ${(punts.reduce((a, p) => a + p.payload.grossYards, 0) / punts.length).toFixed(1)}` +
          `, ${punts.filter((p) => p.payload.touchback).length} touchbacks`),
  );
  lines.push(
    `  Kickoffs: ${kickoffs.length}, ${kickoffs.filter((k) => k.payload.touchback).length} touchbacks`,
  );
  lines.push("");

  lines.push(...renderBoxScoreLines(reduceStatlines(events), home, away, names));
  lines.push(RULE);
  return lines.join("\n");
}

/** The box score, from the reducer — never from a second tally. */
export function renderBoxScore(
  events: readonly GameEventEnvelope[],
  names: GameNameLookup,
): string {
  const start = eventsOf(events, "GAME_START")[0];
  if (start === undefined) return "";
  return renderBoxScoreLines(
    reduceStatlines(events),
    start.payload.home,
    start.payload.away,
    names,
  ).join("\n");
}

function renderBoxScoreLines(
  statlines: readonly StatLine[],
  home: TeamId,
  away: TeamId,
  names: GameNameLookup,
): string[] {
  const lines: string[] = [];
  for (const team of [away, home]) {
    const rows = statlines.filter((line) => line.team === team);
    lines.push(`BOX SCORE — ${names.team(team)}`);

    const passers = rows.filter((r) => r.passing.attempts > 0);
    if (passers.length > 0) {
      lines.push("  Passing            C/A     Yds  TD  INT  Sk");
      for (const r of passers) {
        lines.push(
          `  ${pad(names.player(r.player), 18)}` +
            padLeft(`${r.passing.completions}/${r.passing.attempts}`, 6) +
            padLeft(String(r.passing.yards), 8) +
            padLeft(String(r.passing.touchdowns), 4) +
            padLeft(String(r.passing.interceptions), 5) +
            padLeft(String(r.passing.sacked), 4),
        );
      }
    }

    const rushers = rows.filter((r) => r.rushing.attempts > 0);
    if (rushers.length > 0) {
      lines.push("  Rushing             Att     Yds  TD  Lng");
      for (const r of rushers) {
        lines.push(
          `  ${pad(names.player(r.player), 18)}` +
            padLeft(String(r.rushing.attempts), 6) +
            padLeft(String(r.rushing.yards), 8) +
            padLeft(String(r.rushing.touchdowns), 4) +
            padLeft(String(r.rushing.longest), 5),
        );
      }
    }

    const receivers = rows.filter((r) => r.receiving.targets > 0);
    if (receivers.length > 0) {
      lines.push("  Receiving           Rec/Tgt Yds  TD  Drop");
      for (const r of receivers) {
        lines.push(
          `  ${pad(names.player(r.player), 18)}` +
            padLeft(`${r.receiving.receptions}/${r.receiving.targets}`, 6) +
            padLeft(String(r.receiving.yards), 6) +
            padLeft(String(r.receiving.touchdowns), 4) +
            padLeft(String(r.receiving.drops), 6),
        );
      }
    }

    const defenders = rows.filter(
      (r) => r.defense.tackles + r.defense.sacks + r.defense.interceptions + r.defense.passesDefensed > 0,
    );
    if (defenders.length > 0) {
      lines.push("  Defense             Tkl  Sk  INT  PD  TFL");
      for (const r of defenders) {
        lines.push(
          `  ${pad(names.player(r.player), 18)}` +
            padLeft(String(r.defense.tackles), 4) +
            padLeft(String(r.defense.sacks), 4) +
            padLeft(String(r.defense.interceptions), 5) +
            padLeft(String(r.defense.passesDefensed), 4) +
            padLeft(String(r.defense.tacklesForLoss), 5),
        );
      }
    }
    lines.push("");
  }
  return lines;
}
