/**
 * Real NFL injury rates by depth-chart spot (ADR-087, the owner's ruling of 2026-11-06: injury risk
 * follows the spot his team plays him at, so the real rates are recounted by spot). Pure: the injury
 * measurement's own timelines and spells (`measure.ts` `derive`) in; counts and rates out. No id or
 * name leaves this module.
 *
 * The spot is the weekly roster's `depth_chart_position`, read week by week (the roster row of the
 * player-game), and folded into the injury groups by the injury groups' own rule (`classify.ts`
 * `positionGroup`). Beside it stays the listed group the rest of the report uses (the team-season's
 * most common listed position, `timeline.ts`). Everything returned is REAL (counted); the reading
 * of the older spellings below is CHOSEN.
 *
 * - Exposure: a player-game (a game he took a snap in that had a next team game) counts at that
 *   week's spot.
 * - An injury counts at the spot of the game week its onset follows: the game he played
 *   (AFTER_PLAYED) or the week he was healthy and did not play (AFTER_NOT_PLAYED).
 * - A blank or unreadable spot counts at the player's listed group, and is counted apart.
 */

import { POSITION_GROUPS, positionGroup, type PositionGroup } from "./classify.js";
import { round, type Derived } from "./measure.js";
import type { Spell } from "./spells.js";
import type { Entry, Timeline } from "./timeline.js";

/**
 * CHOSEN: older spellings in the column, read as `careers/groups.ts` reads them (OT, OG, HB, SAF as
 * T, G, RB, S). The injury fold already reads OT, OG and HB; SAF it does not, so without this a
 * safety spelled SAF would be an unknown spot.
 */
const SPELLING: Readonly<Record<string, string>> = { OT: "T", OG: "G", HB: "RB", SAF: "S" };

/** The spot's code, trimmed, upper-cased and with the older spellings read; null when blank. */
export function spotCode(depthChartPosition: string | null): string | null {
  if (depthChartPosition === null) return null;
  const c = depthChartPosition.trim().toUpperCase();
  if (c === "") return null;
  return SPELLING[c] ?? c;
}

/** The injury group of a spot; null when blank or not a position the injury groups know. */
export function spotGroup(depthChartPosition: string | null): PositionGroup | null {
  const g = positionGroup(spotCode(depthChartPosition));
  return g === "OTHER" ? null : g;
}

/** The fine spots in report order (codes after `spotCode`); any other code is listed after them. */
export const FINE_SPOTS: readonly string[] = [
  "QB", "RB", "FB", "WR", "TE", "T", "G", "C", "OL", "DE", "DT", "NT", "DL", "OLB", "ILB", "MLB", "LB", "CB", "FS", "SS", "S", "DB", "K", "P", "LS",
];

export interface Rates {
  /** New in-season time-loss football injuries. */
  readonly newTimeLoss: number;
  readonly afterPlayed: number;
  readonly playerGames: number;
  readonly snaps: number;
  readonly perPlayerGame: number;
  readonly per1000Snaps: number;
}

export interface SpotGroupRow {
  readonly group: PositionGroup;
  /** By the listed group: the same numbers as the report's "By position group". */
  readonly listed: Rates;
  /** By the depth-chart spot's group, week by week. */
  readonly spot: Rates;
  /** spot − listed. */
  readonly change: { readonly perPlayerGame: number; readonly per1000Snaps: number };
}

export interface FineSpotRow {
  /** The spot code (after `spotCode`), or "unknown" for a blank or unreadable spot. */
  readonly spot: string;
  readonly group: PositionGroup | null;
  readonly rates: Rates;
}

export interface SpotSummary {
  readonly seasons: readonly number[];
  readonly groups: readonly SpotGroupRow[];
  readonly playerGames: number;
  readonly snaps: number;
  /** Player-games (and their snaps, and the new injuries) whose spot group is not the listed group. */
  readonly differ: {
    readonly playerGames: number;
    readonly share: number;
    readonly snaps: number;
    readonly snapShare: number;
    readonly newTimeLoss: number;
    /** Player-games whose readable spot's group is not the group of that same week's listed position. */
    readonly fromThatWeeksListing: number;
  };
  /** Player-games with a blank or unreadable spot (counted at the listed group), by code as written. */
  readonly unknownSpot: {
    readonly playerGames: number;
    readonly snaps: number;
    readonly newTimeLoss: number;
    readonly codes: Readonly<Record<string, number>>;
  };
  /** The same rates by fine spot. */
  readonly fine: readonly FineSpotRow[];
}

const div = (a: number, b: number): number => (b === 0 ? 0 : a / b);
const isNew = (s: Spell): boolean => s.onset === "AFTER_PLAYED" || s.onset === "AFTER_NOT_PLAYED";

interface Acc { newTimeLoss: number; afterPlayed: number; playerGames: number; snaps: number }
const acc = (): Acc => ({ newTimeLoss: 0, afterPlayed: 0, playerGames: 0, snaps: 0 });
const rates = (a: Acc | undefined): Rates => {
  const x = a ?? acc();
  return {
    newTimeLoss: x.newTimeLoss, afterPlayed: x.afterPlayed, playerGames: x.playerGames, snaps: x.snaps,
    perPlayerGame: round(div(x.newTimeLoss, x.playerGames)), per1000Snaps: round(div(x.afterPlayed * 1000, x.snaps)),
  };
};

/** The new in-season time-loss injury rates by depth-chart spot over `seasons`, beside the listed groups. */
export function summariseBySpot(d: Derived, seasons: readonly number[]): SpotSummary {
  const inSet = new Set(seasons);
  const listed = new Map<PositionGroup, Acc>();
  const spot = new Map<PositionGroup, Acc>();
  const fine = new Map<string, Acc>();
  const get = <K>(m: Map<K, Acc>, k: K): Acc => {
    let a = m.get(k);
    if (a === undefined) m.set(k, (a = acc()));
    return a;
  };
  /** Where one game week counts: its spot group (else the listed group) and its fine spot. */
  const placeOf = (t: Timeline, e: Entry): { group: PositionGroup; read: PositionGroup | null; fine: string } => {
    const read = spotGroup(e.depthChartPosition);
    return { group: read ?? t.group, read, fine: read === null ? "unknown" : spotCode(e.depthChartPosition)! };
  };

  let playerGames = 0;
  let snaps = 0;
  const differ = { playerGames: 0, snaps: 0, newTimeLoss: 0, fromThatWeeksListing: 0 };
  const unknown = { playerGames: 0, snaps: 0, newTimeLoss: 0 };
  const codes = new Map<string, number>();
  const timelineOf = new Map<string, Timeline>();
  for (const t of d.timelines) {
    if (!inSet.has(t.season)) continue;
    timelineOf.set(`${t.season}|${t.team}|${t.gsisId}`, t);
    const es = t.entries;
    for (let i = 0; i < es.length - 1; i++) {
      const e = es[i]!;
      if (e.state !== "PLAYED") continue;
      const p = placeOf(t, e);
      playerGames++;
      snaps += e.snaps;
      for (const a of [get(listed, t.group), get(spot, p.group), get(fine, p.fine)]) {
        a.playerGames++;
        a.snaps += e.snaps;
      }
      if (p.group !== t.group) {
        differ.playerGames++;
        differ.snaps += e.snaps;
      }
      if (p.read !== null && p.read !== positionGroup(e.rosterPosition)) differ.fromThatWeeksListing++;
      if (p.read === null) {
        unknown.playerGames++;
        unknown.snaps += e.snaps;
        const c = e.depthChartPosition === null ? "(blank)" : e.depthChartPosition.trim().toUpperCase();
        codes.set(c, (codes.get(c) ?? 0) + 1);
      }
    }
  }

  for (const s of d.spells) {
    if (!inSet.has(s.season) || s.cls !== "FOOTBALL" || !isNew(s)) continue;
    const t = timelineOf.get(`${s.season}|${s.team}|${s.gsisId}`);
    const before = t?.entries[s.startIndex - 1];
    if (t === undefined || before === undefined) continue; // cannot happen: a new onset follows a game week of his timeline
    const p = placeOf(t, before);
    const played = s.onset === "AFTER_PLAYED" ? 1 : 0;
    for (const a of [get(listed, s.group), get(spot, p.group), get(fine, p.fine)]) {
      a.newTimeLoss++;
      a.afterPlayed += played;
    }
    if (p.group !== s.group) differ.newTimeLoss++;
    if (p.read === null) unknown.newTimeLoss++;
  }

  // the report's nine groups, and OTHER only when something landed there
  const groupList: PositionGroup[] = [...POSITION_GROUPS];
  if (listed.has("OTHER") || spot.has("OTHER")) groupList.push("OTHER");
  const groups: SpotGroupRow[] = groupList.map((group) => {
    const l = rates(listed.get(group));
    const sp = rates(spot.get(group));
    return {
      group, listed: l, spot: sp,
      change: { perPlayerGame: round(sp.perPlayerGame - l.perPlayerGame), per1000Snaps: round(sp.per1000Snaps - l.per1000Snaps) },
    };
  });

  const fineOrder = [
    ...FINE_SPOTS.filter((c) => fine.has(c)),
    ...[...fine.keys()].filter((c) => c !== "unknown" && !FINE_SPOTS.includes(c)).sort(),
    ...(fine.has("unknown") ? ["unknown"] : []),
  ];

  return {
    seasons: [...seasons],
    groups,
    playerGames,
    snaps,
    differ: {
      playerGames: differ.playerGames,
      share: round(div(differ.playerGames, playerGames)),
      snaps: differ.snaps,
      snapShare: round(div(differ.snaps, snaps)),
      newTimeLoss: differ.newTimeLoss,
      fromThatWeeksListing: differ.fromThatWeeksListing,
    },
    unknownSpot: {
      ...unknown,
      codes: Object.fromEntries([...codes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    },
    fine: fineOrder.map((c) => ({ spot: c, group: c === "unknown" ? null : spotGroup(c), rates: rates(fine.get(c)) })),
  };
}
