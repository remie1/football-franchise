/**
 * Injury spells and listing episodes, read off player timelines (ADR-087 §5, build step E).
 *
 * A **spell** is a time-loss injury: a run of one or more consecutive team games a player missed
 * for an injury (see `timeline.ts` MISSED_INJURY). An **episode** is a run of consecutive team
 * game weeks on the injury list (`Entry.listed`): it includes the weeks he played hurt, so an
 * episode that never cost a game is a day-to-day injury.
 *
 * Pure: timelines in, spells and episodes out, in timeline order.
 */

import type { BodyPart, PositionGroup, RosterKind } from "./classify.js";
import { bodyPart } from "./classify.js";
import type { Entry, MissClass, Timeline } from "./timeline.js";

/**
 * What the player was doing the team game before the spell or episode began, which bounds where
 * the injury happened:
 * - AFTER_PLAYED: he played the game before, so he was hurt in that game, or in the week's
 *   practice, or away from football.
 * - AFTER_NOT_PLAYED: he was on the 53 and healthy the game before but did not play (a healthy
 *   scratch, or dressed and unused), so he was hurt in practice or away from football, not in a
 *   regular-season game.
 * - BEFORE_SEASON: already out (or listed) for the team's first game: hurt before the season, or
 *   still out from last season (`measure.ts` tells the two apart with `endedSeasonHurt`).
 * - UNCLEAR: not on this team's 53 the game before (signed, promoted, back from a suspension or a
 *   COVID list), or on the report with an injury and not playing (a lingering injury that the
 *   final report had cleared): where and when he was hurt cannot be said. Left out of the
 *   new-injury counts.
 */
export type Onset = "AFTER_PLAYED" | "AFTER_NOT_PLAYED" | "BEFORE_SEASON" | "UNCLEAR";

/** How a spell ended. RETURNED: he played. RECOVERED: healthy on the 53 but did not play. LEFT and SEASON_END are censored. */
export type SpellEnd = "RETURNED" | "RECOVERED" | "LEFT" | "SEASON_END";

export interface Spell {
  readonly season: number;
  readonly team: string;
  readonly gsisId: string;
  readonly group: PositionGroup;
  /** Index of the first missed game in the team's season (0 = its first game). */
  readonly startIndex: number;
  readonly startWeek: number;
  readonly onset: Onset;
  /** True when the gap before the first missed game spans a bye (two practice weeks, one game). */
  readonly afterBye: boolean;
  readonly cls: MissClass;
  /** The roster kind at the first missed game (IR = straight onto a reserve list). */
  readonly firstKind: RosterKind | "ABSENT";
  /** Spent at least one game of the spell on injured reserve. */
  readonly ir: boolean;
  readonly bodyPart: BodyPart;
  /** Consecutive team games missed (observed; a lower bound when censored). */
  readonly gamesMissed: number;
  /** Calendar weeks from the first missed game's week to the return game's week (byes count). */
  readonly weeksOut: number;
  readonly end: SpellEnd;
  readonly censored: boolean;
}

export interface Episode {
  readonly season: number;
  readonly team: string;
  readonly gsisId: string;
  readonly group: PositionGroup;
  readonly startIndex: number;
  readonly onset: Onset;
  /** Given a game designation (or missed a game) at some point in the episode, not only a practice limit. */
  readonly designated: boolean;
  /** Games missed for a football injury during the episode. */
  readonly gamesMissed: number;
  /** The episode ran into the season's end or his leaving while he was still missing games. */
  readonly censored: boolean;
  /** On its first week's final report he did not practise. */
  readonly firstDnp: boolean;
}

/** Healthy on the 53 for this game: played, or did not play with nothing wrong. */
const healthyOn53 = (e: Entry): boolean => e.state === "PLAYED" || e.state === "HEALTHY_DNP";

/** Where an injury that first shows at `entries[i]` can have happened, from the game before. */
export function onsetOf(entries: readonly Entry[], i: number): Onset {
  if (i === 0) return "BEFORE_SEASON";
  const prev = entries[i - 1]!;
  if (prev.state === "PLAYED") return "AFTER_PLAYED";
  if (prev.state === "HEALTHY_DNP" && prev.reportKind !== "FOOTBALL" && prev.reportKind !== "ILLNESS") return "AFTER_NOT_PLAYED";
  return "UNCLEAR";
}

/**
 * The body part of a football spell: the report at its first missed game, else the week before
 * (listed, played), else any week of it, else the two weeks after it (a player who went straight
 * onto a reserve list is never on the report until he is back, and is often listed on his return).
 */
function spellBodyPart(entries: readonly Entry[], start: number, end: number): BodyPart {
  const order = [start, start - 1];
  for (let j = start + 1; j < end; j++) order.push(j);
  order.push(end, end + 1);
  for (const j of order) {
    const e = entries[j];
    if (e === undefined || e.reportKind !== "FOOTBALL") continue;
    return bodyPart(e.reportText);
  }
  return "unknown";
}

export function spellsOf(t: Timeline): Spell[] {
  const out: Spell[] = [];
  const es = t.entries;
  let i = 0;
  while (i < es.length) {
    if (es[i]!.state !== "MISSED_INJURY") {
      i++;
      continue;
    }
    let j = i;
    let ir = false;
    while (j < es.length && es[j]!.state === "MISSED_INJURY") {
      if (es[j]!.kind === "IR") ir = true;
      j++;
    }
    const after = es[j];
    const end: SpellEnd = after === undefined ? "SEASON_END"
      : after.state === "PLAYED" ? "RETURNED"
      : after.state === "HEALTHY_DNP" ? "RECOVERED"
      : "LEFT";
    const lastWeek = es[es.length - 1]!.week;
    const first = es[i]!;
    out.push({
      season: t.season, team: t.team, gsisId: t.gsisId, group: t.group,
      startIndex: i, startWeek: first.week,
      onset: onsetOf(es, i),
      afterBye: i > 0 && first.week - es[i - 1]!.week > 1,
      cls: first.missClass ?? "FOOTBALL",
      firstKind: first.kind,
      ir,
      bodyPart: first.missClass === "NFI" ? "unknown" : first.missClass === "ILLNESS" ? "illness" : spellBodyPart(es, i, j),
      gamesMissed: j - i,
      weeksOut: (after === undefined ? lastWeek + 1 : after.week) - first.week,
      end,
      censored: end === "LEFT" || end === "SEASON_END",
    });
    i = j;
  }
  return out;
}

export function episodesOf(t: Timeline): Episode[] {
  const out: Episode[] = [];
  const es = t.entries;
  let i = 0;
  while (i < es.length) {
    if (!es[i]!.listed) {
      i++;
      continue;
    }
    let j = i;
    let missed = 0;
    let designated = false;
    while (j < es.length && es[j]!.listed) {
      const e = es[j]!;
      if (e.state === "MISSED_INJURY") missed++;
      if (e.designated) designated = true;
      j++;
    }
    const last = es[j - 1]!;
    const after = es[j];
    out.push({
      season: t.season, team: t.team, gsisId: t.gsisId, group: t.group,
      startIndex: i, onset: onsetOf(es, i), designated, gamesMissed: missed,
      censored: last.state === "MISSED_INJURY" && (after === undefined || !healthyOn53(after)),
      firstDnp: es[i]!.report?.practiceStatus === "DNP",
    });
    i = j;
  }
  return out;
}

/**
 * The player's state at his last regular-season game week of a season, on any team: true when he
 * was missing it for an injury. Used to tell a week-1 absence carried over from last season from
 * a new one.
 */
export function endedSeasonHurt(timelines: readonly Timeline[]): Map<string, boolean> {
  const last = new Map<string, { week: number; hurt: boolean }>();
  for (const t of timelines) {
    for (const e of t.entries) {
      if (e.state === "ABSENT") continue;
      const k = `${t.season}|${t.gsisId}`;
      const prev = last.get(k);
      const hurt = e.state === "MISSED_INJURY";
      // a player on two teams in one week (a trade) counts as hurt if either list says so
      if (prev === undefined || e.week > prev.week) last.set(k, { week: e.week, hurt });
      else if (e.week === prev.week && hurt) last.set(k, { week: e.week, hurt: true });
    }
  }
  return new Map([...last.entries()].map(([k, v]) => [k, v.hurt] as const));
}
