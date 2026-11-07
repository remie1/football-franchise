/**
 * Real NFL injuries by age (ADR-087, the owner's rulings of 2026-11-06: measure injuries by age
 * before adding slower healing). Pure: the injury measurement's own timelines and spells
 * (`measure.ts` `derive`) and a birth date per player in; counts, rates and Kaplan-Meier weeks out
 * per age band out. No id, name or birth date leaves this module: every result is a count, a rate
 * or a share.
 *
 * What is REAL and what is CHOSEN:
 * - REAL (counted): every number this module returns, read off the nflverse files.
 * - CHOSEN: the age bands (`AGE_BANDS`), the body-part classes (`BODY_CLASS_PARTS`, a grouping of
 *   `classify.ts`'s keyword classes), the reference date (23 October, the stand-in file's snapshot
 *   point, `careers/measure.ts` `ageOn`) and the Poisson standard error on the mix ratio.
 *
 * The definitions are the injury measurement's own (`measure.ts`): a new in-season time-loss
 * injury is a football spell with onset AFTER_PLAYED or AFTER_NOT_PLAYED; a player-game is a game
 * he took a snap in that had a next team game; per 1,000 snaps counts only the injuries after a
 * game he played.
 */

import { ageOn, SNAPSHOT_DAY, SNAPSHOT_MONTH } from "../careers/measure.js";
import type { BodyPart, PositionGroup } from "./classify.js";
import { LONG_FROM, MAJOR_FROM, medianFromSurvival, round, survival, type Derived } from "./measure.js";
import type { RosterRow } from "./rows.js";
import type { Spell } from "./spells.js";

// ---------------------------------------------------------------- bands and classes (CHOSEN)

/** CHOSEN age bands, in whole years on 23 October of the season. */
export const AGE_BANDS = ["25 and under", "26-28", "29-30", "31-32", "33 and over"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export function ageBand(age: number | null): AgeBand | null {
  if (age === null) return null;
  if (age <= 25) return "25 and under";
  if (age <= 28) return "26-28";
  if (age <= 30) return "29-30";
  if (age <= 32) return "31-32";
  return "33 and over";
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

/** The reference date of every age here, in words (the stand-in file's snapshot point). */
export const AGE_REFERENCE = `whole years on ${SNAPSHOT_DAY} ${MONTHS[SNAPSHOT_MONTH - 1]} of the season`;

/** CHOSEN body-part classes, grouping `classify.ts`'s keyword classes. */
export const BODY_CLASSES = ["soft tissue", "concussion", "joint", "other", "unknown"] as const;
export type BodyClass = (typeof BODY_CLASSES)[number];

const CLASS_OF: Readonly<Record<BodyPart, BodyClass>> = {
  hamstring: "soft tissue", "groin/hip": "soft tissue", "calf/shin": "soft tissue", "quad/thigh": "soft tissue", achilles: "soft tissue",
  "concussion/head": "concussion",
  knee: "joint", ankle: "joint", shoulder: "joint", "foot/toe": "joint", "hand/wrist": "joint", "elbow/arm": "joint",
  "back/neck": "other", "chest/ribs/abdomen": "other", illness: "other", other: "other",
  unknown: "unknown",
};

export const bodyClass = (part: BodyPart): BodyClass => CLASS_OF[part];

/** Each class's keyword classes, for the report's definitions. */
const partsOf = (c: BodyClass): readonly BodyPart[] => (Object.keys(CLASS_OF) as BodyPart[]).filter((p) => CLASS_OF[p] === c);
export const BODY_CLASS_PARTS: Readonly<Record<BodyClass, readonly BodyPart[]>> = {
  "soft tissue": partsOf("soft tissue"), concussion: partsOf("concussion"), joint: partsOf("joint"), other: partsOf("other"), unknown: partsOf("unknown"),
};

// ---------------------------------------------------------------- birth dates

/**
 * Each player's birth date: the first non-blank one on his weekly-roster rows, in row order (the
 * caller loads the seasons oldest first, so the lookback season's rows come first). The career
 * ledger reads it the same way (`careers/measure.ts`). A handful of players carry two different
 * dates across seasons; the first wins.
 */
export function birthDates(rosters: readonly RosterRow[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of rosters) {
    const b = r.birthDate ?? null;
    if (b !== null && !out.has(r.gsisId)) out.set(r.gsisId, b);
  }
  return out;
}

// ---------------------------------------------------------------- weeks out

/** Kaplan-Meier weeks out of a set of spells (`measure.ts` `survival` over `weeksOut`). */
export interface WeeksOut {
  readonly n: number;
  readonly censored: number;
  /** The smallest k with P(out more than k weeks) ≤ 1/2; null when there are no spells or the curve never gets there. */
  readonly median: number | null;
  /** P(out 2+ weeks), P(out 4+ weeks), P(out 9+ weeks); null when there are no spells. */
  readonly p2Plus: number | null;
  readonly p4Plus: number | null;
  readonly p9Plus: number | null;
}

export function weeksOut(spells: readonly Spell[]): WeeksOut {
  const s = survival(spells.map((x) => ({ length: x.weeksOut, censored: x.censored })));
  const none = spells.length === 0;
  const at = (k: number): number | null => (none ? null : round(s[k] ?? 0));
  return {
    n: spells.length,
    censored: spells.filter((x) => x.censored).length,
    median: none ? null : medianFromSurvival(s),
    p2Plus: at(2),
    p4Plus: at(LONG_FROM),
    p9Plus: at(MAJOR_FROM),
  };
}

// ---------------------------------------------------------------- shared reading

const isNew = (s: Spell): boolean => s.onset === "AFTER_PLAYED" || s.onset === "AFTER_NOT_PLAYED";
const div = (a: number, b: number): number => (b === 0 ? 0 : a / b);
/** Listed kickers, punters and long snappers: left out of the age rows. */
const SPECIALISTS: PositionGroup = "K/P";

/** The age band of a player in a season, from the birth-date map. */
function bandOf(births: ReadonlyMap<string, string>, gsisId: string, season: number): AgeBand | null {
  return ageBand(ageOn(births.get(gsisId) ?? null, season));
}

/** The new in-season football spells of `seasons` with a known age band, listed specialists left out. */
function bandedSpells(d: Derived, seasons: readonly number[], births: ReadonlyMap<string, string>): Map<AgeBand, Spell[]> {
  const inSet = new Set(seasons);
  const out = new Map<AgeBand, Spell[]>(AGE_BANDS.map((b) => [b, []]));
  for (const s of d.spells) {
    if (!inSet.has(s.season) || s.group === SPECIALISTS || s.cls !== "FOOTBALL" || !isNew(s)) continue;
    const b = bandOf(births, s.gsisId, s.season);
    if (b !== null) out.get(b)!.push(s);
  }
  return out;
}

interface Exposure {
  playerGames: number;
  snaps: number;
  playerSeasons: Set<string>;
}

/** Player-games and snaps per band, and per listed group within each band (for the mix adjustment). */
function bandedExposure(d: Derived, seasons: readonly number[], births: ReadonlyMap<string, string>): {
  byBand: Map<AgeBand, Exposure>;
  byGroupBand: Map<string, { playerGames: number; snaps: number }>;
  noBirth: { timelines: number; playerGames: number };
  specialistTimelines: number;
  availability: Map<AgeBand, { gameWeeks: number; missed: number; missedFootball: number; onReserve: number }>;
} {
  const inSet = new Set(seasons);
  const byBand = new Map<AgeBand, Exposure>(AGE_BANDS.map((b) => [b, { playerGames: 0, snaps: 0, playerSeasons: new Set<string>() }]));
  const byGroupBand = new Map<string, { playerGames: number; snaps: number }>();
  const availability = new Map<AgeBand, { gameWeeks: number; missed: number; missedFootball: number; onReserve: number }>(
    AGE_BANDS.map((b) => [b, { gameWeeks: 0, missed: 0, missedFootball: 0, onReserve: 0 }]),
  );
  const noBirth = { timelines: 0, playerGames: 0 };
  let specialistTimelines = 0;
  for (const t of d.timelines) {
    if (!inSet.has(t.season)) continue;
    if (t.group === SPECIALISTS) {
      specialistTimelines++;
      continue;
    }
    const es = t.entries;
    const b = bandOf(births, t.gsisId, t.season);
    if (b === null) {
      noBirth.timelines++;
      for (let i = 0; i < es.length - 1; i++) if (es[i]!.state === "PLAYED") noBirth.playerGames++;
      continue;
    }
    const e = byBand.get(b)!;
    const gk = `${t.group}|${b}`;
    let g = byGroupBand.get(gk);
    if (g === undefined) byGroupBand.set(gk, (g = { playerGames: 0, snaps: 0 }));
    for (let i = 0; i < es.length - 1; i++) {
      const en = es[i]!;
      if (en.state !== "PLAYED") continue;
      e.playerGames++;
      e.snaps += en.snaps;
      e.playerSeasons.add(`${t.season}|${t.gsisId}`);
      g.playerGames++;
      g.snaps += en.snaps;
    }
    const a = availability.get(b)!;
    for (const en of es) {
      if (en.state !== "PLAYED" && en.state !== "HEALTHY_DNP" && en.state !== "MISSED_INJURY") continue;
      a.gameWeeks++;
      if (en.state !== "MISSED_INJURY") continue;
      a.missed++;
      if (en.missClass === "FOOTBALL") a.missedFootball++;
      if (en.kind === "IR" || en.kind === "PUP") a.onReserve++;
    }
  }
  return { byBand, byGroupBand, noBirth, specialistTimelines, availability };
}

// ---------------------------------------------------------------- by age

/** Observed injuries in a band against what each player-game's own listed-group rate (all ages) expects. */
export interface MixRatio {
  readonly observed: number;
  readonly expected: number;
  readonly ratio: number;
  /** One Poisson standard error of the ratio, √observed / expected (CHOSEN method; expected taken as known). */
  readonly se: number;
}

export interface Availability {
  /** Team game weeks he played, was healthy on the 53 and did not play, or missed for injury (any cause). */
  readonly gameWeeks: number;
  /** Of those, missed for injury: football, illness or the non-football list. */
  readonly missed: number;
  readonly missedShare: number;
  readonly missedFootball: number;
  readonly missedFootballShare: number;
  /** Missed while on injured reserve or PUP. */
  readonly onReserve: number;
  readonly onReserveShare: number;
}

export interface AgeBandRow {
  readonly band: AgeBand;
  /** Distinct player-seasons with a player-game in the band. */
  readonly playerSeasons: number;
  readonly playerGames: number;
  readonly snaps: number;
  /** New in-season time-loss football injuries. */
  readonly newTimeLoss: number;
  /** Of those, after a game he played. */
  readonly afterPlayed: number;
  /** afterPlayed per 1,000 snaps played. */
  readonly per1000Snaps: number;
  /** newTimeLoss / playerGames. */
  readonly perPlayerGame: number;
  /** Per snap: observed afterPlayed against Σ (group's all-age afterPlayed per snap × the band's snaps in that group). */
  readonly mixPerSnap: MixRatio;
  /** Per player-game: observed newTimeLoss against Σ (group's all-age newTimeLoss per player-game × the band's player-games in that group). */
  readonly mixPerPlayerGame: MixRatio;
  readonly weeksOut: WeeksOut;
  readonly availability: Availability;
}

export interface AgeSummary {
  readonly seasons: readonly number[];
  /** How age is read, in words. */
  readonly reference: string;
  readonly bands: readonly AgeBandRow[];
  readonly leftOut: {
    /** Team-season timelines of listed kickers, punters and long snappers (K/P). */
    readonly specialistTimelines: number;
    /** Timelines (not K/P) whose player has no birth date on any loaded roster row, and their player-games and new injuries. */
    readonly noBirthDate: { readonly timelines: number; readonly playerGames: number; readonly newTimeLoss: number };
  };
}

function mix(observed: number, expected: number): MixRatio {
  return { observed, expected: round(expected, 3), ratio: round(div(observed, expected), 4), se: round(div(Math.sqrt(observed), expected), 4) };
}

/** New in-season time-loss injuries by age band over `seasons` (listed K/P left out). */
export function summariseByAge(d: Derived, seasons: readonly number[], births: ReadonlyMap<string, string>): AgeSummary {
  const spells = bandedSpells(d, seasons, births);
  const x = bandedExposure(d, seasons, births);

  // each listed group's all-age rates, over the age-known player-games (the mix adjustment's "expected")
  const groupTotals = new Map<PositionGroup, { snaps: number; playerGames: number; afterPlayed: number; newTimeLoss: number }>();
  const totalFor = (g: PositionGroup) => {
    let t = groupTotals.get(g);
    if (t === undefined) groupTotals.set(g, (t = { snaps: 0, playerGames: 0, afterPlayed: 0, newTimeLoss: 0 }));
    return t;
  };
  for (const [k, v] of x.byGroupBand) {
    const t = totalFor(k.split("|")[0] as PositionGroup);
    t.snaps += v.snaps;
    t.playerGames += v.playerGames;
  }
  for (const list of spells.values()) {
    for (const s of list) {
      const t = totalFor(s.group);
      t.newTimeLoss++;
      if (s.onset === "AFTER_PLAYED") t.afterPlayed++;
    }
  }
  const groups = [...groupTotals.keys()].sort();

  const inSet = new Set(seasons);
  const noBirthSpells = d.spells.filter((s) => inSet.has(s.season) && s.group !== SPECIALISTS && s.cls === "FOOTBALL" && isNew(s)
    && bandOf(births, s.gsisId, s.season) === null).length;

  const bands: AgeBandRow[] = AGE_BANDS.map((band) => {
    const e = x.byBand.get(band)!;
    const ss = spells.get(band)!;
    const afterPlayed = ss.filter((s) => s.onset === "AFTER_PLAYED").length;
    let expSnap = 0;
    let expGame = 0;
    for (const g of groups) {
      const v = x.byGroupBand.get(`${g}|${band}`);
      if (v === undefined) continue;
      const t = groupTotals.get(g)!;
      expSnap += div(t.afterPlayed, t.snaps) * v.snaps;
      expGame += div(t.newTimeLoss, t.playerGames) * v.playerGames;
    }
    const a = x.availability.get(band)!;
    return {
      band,
      playerSeasons: e.playerSeasons.size,
      playerGames: e.playerGames,
      snaps: e.snaps,
      newTimeLoss: ss.length,
      afterPlayed,
      per1000Snaps: round(div(afterPlayed * 1000, e.snaps)),
      perPlayerGame: round(div(ss.length, e.playerGames)),
      mixPerSnap: mix(afterPlayed, expSnap),
      mixPerPlayerGame: mix(ss.length, expGame),
      weeksOut: weeksOut(ss),
      availability: {
        gameWeeks: a.gameWeeks,
        missed: a.missed,
        missedShare: round(div(a.missed, a.gameWeeks)),
        missedFootball: a.missedFootball,
        missedFootballShare: round(div(a.missedFootball, a.gameWeeks)),
        onReserve: a.onReserve,
        onReserveShare: round(div(a.onReserve, a.gameWeeks)),
      },
    };
  });

  return {
    seasons: [...seasons],
    reference: AGE_REFERENCE,
    bands,
    leftOut: {
      specialistTimelines: x.specialistTimelines,
      noBirthDate: { timelines: x.noBirth.timelines, playerGames: x.noBirth.playerGames, newTimeLoss: noBirthSpells },
    },
  };
}

// ---------------------------------------------------------------- by age and body-part class

export interface AgeClassRow {
  readonly band: AgeBand;
  readonly cls: BodyClass;
  /** New in-season time-loss football injuries of the class in the band. */
  readonly n: number;
  readonly afterPlayed: number;
  /** afterPlayed per 1,000 of the band's snaps. */
  readonly per1000Snaps: number;
  readonly weeksOut: WeeksOut;
}

export interface AgeClassSummary {
  readonly seasons: readonly number[];
  /** CHOSEN: each class's keyword classes from `classify.ts`. */
  readonly classes: Readonly<Record<BodyClass, readonly BodyPart[]>>;
  /** Band by band, each band's classes in `BODY_CLASSES` order. */
  readonly rows: readonly AgeClassRow[];
}

export function summariseByAgeClass(d: Derived, seasons: readonly number[], births: ReadonlyMap<string, string>): AgeClassSummary {
  const spells = bandedSpells(d, seasons, births);
  const x = bandedExposure(d, seasons, births);
  const rows: AgeClassRow[] = [];
  for (const band of AGE_BANDS) {
    const snaps = x.byBand.get(band)!.snaps;
    for (const cls of BODY_CLASSES) {
      const ss = spells.get(band)!.filter((s) => bodyClass(s.bodyPart) === cls);
      const afterPlayed = ss.filter((s) => s.onset === "AFTER_PLAYED").length;
      rows.push({ band, cls, n: ss.length, afterPlayed, per1000Snaps: round(div(afterPlayed * 1000, snaps)), weeksOut: weeksOut(ss) });
    }
  }
  return { seasons: [...seasons], classes: BODY_CLASS_PARTS, rows };
}

// ---------------------------------------------------------------- repeat concussions

export interface ConcussionOrder {
  /** Every concussion spell of this order, whatever its onset. */
  readonly all: WeeksOut;
  /** The new in-season ones among them (onset AFTER_PLAYED or AFTER_NOT_PLAYED). */
  readonly newInSeason: WeeksOut;
}

export interface RepeatConcussion {
  readonly seasons: readonly number[];
  /** Football spells with body part concussion/head in the window, every onset and every group. */
  readonly spells: number;
  readonly men: number;
  readonly menWith2Plus: number;
  /** A man's first concussion spell seen in the window (not necessarily his first ever). */
  readonly first: ConcussionOrder;
  /** His second or later in the window. */
  readonly later: ConcussionOrder;
  /**
   * Of `later`: the quick relapses (`isQuickRelapse`), which begin the team game after the one game
   * that ended his previous concussion spell, on the same team in the same season. Some may be one
   * concussion counted twice (back for a game, then out again).
   */
  readonly laterQuickRelapse: ConcussionOrder;
  /** Of `later`: the rest (a new team, a new season, or two or more team games between). */
  readonly laterApart: ConcussionOrder;
  /** First spells whose man's next concussion spell is a quick relapse (the first half of such a pair sits in `first`). */
  readonly firstFollowedByQuickRelapse: number;
}

/**
 * A quick relapse: `s` begins the team game right after the one game that ended `prev` (he was back
 * on the 53 for one game, then missed again), on the same team in the same season. The gap is
 * counted in team games, so a bye between does not matter. CHOSEN line: one game back.
 */
export function isQuickRelapse(prev: Spell | undefined, s: Spell): boolean {
  return prev !== undefined && prev.season === s.season && prev.team === s.team && s.startIndex === prev.startIndex + prev.gamesMissed + 1;
}

/**
 * Concussions in order, per player: every football spell whose body part is concussion/head in
 * `seasons` (any onset, any group, kickers included), ordered by season and first missed week (not
 * by team: a man traded in the season keeps his own order); the first seen in the window against
 * the second or later, and the later ones split into quick relapses and the rest.
 */
export function summariseRepeatConcussion(d: Derived, seasons: readonly number[]): RepeatConcussion {
  const inSet = new Set(seasons);
  const conc = d.spells
    .filter((s) => inSet.has(s.season) && s.cls === "FOOTBALL" && s.bodyPart === "concussion/head")
    .sort((a, b) => a.season - b.season || a.startWeek - b.startWeek);
  const seen = new Map<string, number>();
  const previous = new Map<string, Spell>();
  const first: Spell[] = [];
  const later: Spell[] = [];
  const relapse: Spell[] = [];
  const apart: Spell[] = [];
  let firstFollowedByQuickRelapse = 0;
  for (const s of conc) {
    const k = seen.get(s.gsisId) ?? 0;
    seen.set(s.gsisId, k + 1);
    if (k === 0) first.push(s);
    else {
      later.push(s);
      const prev = previous.get(s.gsisId);
      const quick = isQuickRelapse(prev, s);
      (quick ? relapse : apart).push(s);
      if (quick && k === 1) firstFollowedByQuickRelapse++;
    }
    previous.set(s.gsisId, s);
  }
  const order = (list: readonly Spell[]): ConcussionOrder => ({ all: weeksOut(list), newInSeason: weeksOut(list.filter(isNew)) });
  return {
    seasons: [...seasons],
    spells: conc.length,
    men: seen.size,
    menWith2Plus: [...seen.values()].filter((v) => v >= 2).length,
    first: order(first),
    later: order(later),
    laterQuickRelapse: order(relapse),
    laterApart: order(apart),
    firstFollowedByQuickRelapse,
  };
}
