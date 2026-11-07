/**
 * ADR-085 step 13: computer teams judge a man ahead (owner's rulings of 2026-10-31 and 2026-11-06).
 *
 * - **How far ahead** follows the team's direction (ADR-081 G3): a contender judges on next season, a
 *   team retooling on the next two, a rebuilding team on the next three; a team with no direction yet
 *   (before its first meeting), two. A backup is judged a year further ahead than the team's starters,
 *   up to three, so a young backup's growth counts for him and an old backup's fade against him.
 * - **What is judged** is his rating today plus his expected change averaged over those years, from
 *   the development week at its mean (`expectedOverallPath`, ADR-087), with no extra age penalty.
 * - **Whose eyes**: the team's GM (owner's answer 1a). His guess at a man's change is the truth plus an
 *   error, refreshed at the new league year, at the end of camp and right after the last games before
 *   the trade deadline (answer 3): half of it stays with the GM and the man, half is drawn again at
 *   each refresh. The error is a misjudged pace: so much a year, every year. A weak GM's error is a
 *   bit bigger than a strong one's (answer 2b). A team with no GM seated reads the truth.
 * - **A newcomer** (a free agent, another team's man) is judged on the role he would have: a year
 *   further ahead when he would not start for the team by today's ratings, as its own backups are.
 * - **No position enters** (owner, 2026-11-06): the cap's age rules (deal length, the extension and cap
 *   casualty gates) read a man with a growth record at the age at which the league's men are expected
 *   to change as he is (`ruleAge`), not at his age shifted by his position.
 *
 * A man with no growth record (growth off) and a prospect read as today, under today's rules.
 */
import {
  CALENDAR_PHASE_ORDER, DEFAULT_LEAGUE_RULES, compareStamps, createRng,
  type CalendarStamp, type LeagueRules, type PlayerState, type StaffState, type TeamDirection, type TeamId,
} from "@ff/contracts";
import { STARTERS, type Rate } from "../draft/board.js";
import { expectedOverallPath } from "../players/development.js";
import type { LeaguePeople } from "../season/people.js";
import { rating } from "../staff/ratings.js";
import { legacyRuleAge, type ValueAhead } from "./value.js";

/** Today and the league as it stands, for `AheadView.setToday`. */
export interface AheadContext {
  readonly at: CalendarStamp;
  readonly people: Pick<LeaguePeople, "teams" | "players" | "staff">;
  readonly rules?: LeagueRules;
}

export const AHEAD = {
  /** Years ahead a team judges its starters on, by its direction (owner's ruling on the aging thread's doc, §4.2). */
  years: { CONTEND: 1, RETOOL: 2, REBUILD: 3 } as Readonly<Record<TeamDirection, number>>,
  /** A team with no direction yet: the middle (CHOSEN). */
  noDirection: 2,
  /** A backup is judged this many years further ahead than the starters (§4.3; CHOSEN)... */
  backupExtra: 1,
  /** ...and nobody further than this (the owner's three-year view for computer GMs, 2026-11-06). */
  most: 3,
  /**
   * The GM's error at a man's yearly change, in points of overall a year (sd), at outlook skill 25 and
   * 85, straight between and beyond. CHOSEN so that, with the season's own luck counted (sd 0.29 a year,
   * measured by the aging thread 2026-11-06, growth only, made-up players), a strong GM's typical miss
   * is 25% smaller than a weak one's (owner's answer 2b): 0.725 against 1.0 gives 0.78 against 1.04.
   */
  errorAt25: 1.0,
  errorAt85: 0.725,
  /**
   * The share of a GM's error at a man (its variance) that stays with the GM and the man from one
   * refresh to the next; the rest is drawn again at each refresh. CHOSEN: half, so a GM's view of a man
   * is sticky but moves (a fresh draw at every refresh had his opinion jump each time, and teams cut in
   * August the men they had signed in March).
   */
  errorKeep: 0.5,
  /** The ages whose expected change sets the age-for-the-rules line (where it runs straight; COMPUTED from the stand-in league 2026-11-06). */
  fitAges: [23, 33] as const,
  /** Fewer men than this in the line and the rules read a man's own age. */
  fitLeast: 30,
} as const;

/** What a team sees of a man ahead. */
export interface AheadView {
  /** The day and the league the view reads from now on: each step that reads it sets them first. Unset, every man reads as today. */
  setToday(ctx: AheadContext | undefined): void;
  /** Is he judged ahead: a growth record, and not a prospect. */
  judgesAhead(p: PlayerState): boolean;
  /** The rating `team` judges him on: today's plus his expected change over the team's years, as its GM sees it. No team: the truth over the middle years. */
  rate(team: TeamId | undefined, p: PlayerState): number;
  /** `rate` for one team. */
  forTeam(team: TeamId | undefined): Rate;
  /** What to add to `rate(team, p)` to read his expected rating across a deal of `years` instead (§4.1; three at most). */
  dealShift(team: TeamId | undefined, p: PlayerState, years: number): number;
  /** His age for the cap's age rules: for a man judged ahead, the age his expected change (as the team's GM sees it) matches; otherwise `legacyRuleAge`. */
  ruleAge(team: TeamId | undefined, p: PlayerState): number;
  /** `valuePlayer`'s step-13 reading for `team`, or undefined for a man not judged ahead. */
  value(team: TeamId | undefined, p: PlayerState): ValueAhead | undefined;
}

/** The season whose roster a decision on this day is for: the offseason's decisions are for the next one. */
export function decisionSeason(at: CalendarStamp): number {
  return CALENDAR_PHASE_ORDER.indexOf(at.phase) >= CALENDAR_PHASE_ORDER.indexOf("OFF_EVAL") ? at.season + 1 : at.season;
}

/**
 * The stretch of the year a GM's guess holds for (owner's answer 3): from the new league year to the
 * end of camp (cut-down day), from there to right after the last games before the trade deadline (the
 * first day of the deadline's week), and from there to the next league year.
 */
export function outlookPeriod(at: CalendarStamp, rules: LeagueRules = DEFAULT_LEAGUE_RULES): string {
  const i = CALENDAR_PHASE_ORDER.indexOf(at.phase);
  if (i >= CALENDAR_PHASE_ORDER.indexOf("OFF_RESET_FA")) return `${at.season + 1}/A`;
  if (i >= CALENDAR_PHASE_ORDER.indexOf("PLAYOFFS")) return `${at.season}/C`;
  const cut = rules.cutdown ?? DEFAULT_LEAGUE_RULES.cutdown!;
  const td = rules.tradeDeadline;
  const stamp = (s: { phase: string; week: number; day: number }) => ({ season: at.season, phase: s.phase as CalendarStamp["phase"], week: s.week, day: s.day });
  if (compareStamps(at, stamp(cut)) < 0) return `${at.season}/A`;
  if (compareStamps(at, stamp({ phase: td.phase, week: td.week, day: 1 })) < 0) return `${at.season}/B`;
  return `${at.season}/C`;
}

/** A team's GM, if one is seated. */
export function gmOf(team: TeamId, staff: readonly StaffState[] | undefined): StaffState | undefined {
  return staff?.find((s) => s.role === "GM" && s.teamId === team && s.retiredAfter === undefined);
}

/**
 * Who judges players for a team's contract calls (owner's answer 1a): its GM's talent evaluation; with
 * no GM seated, its head coach's (as before step 13); with neither, 50.
 */
export function gmEvaluation(team: TeamId, people: Pick<LeaguePeople, "staff">): number {
  const gm = gmOf(team, people.staff);
  if (gm) return rating(gm.attributes, "talentEvaluation");
  const hc = people.staff?.find((s) => s.teamId === team && s.role === "HEAD_COACH" && s.retiredAfter === undefined);
  return hc?.attributes["talentEvaluation"] ?? 50;
}

/** A GM's outlook skill: Forecasting and Talent Evaluation half and half, as the meeting's growth read (ADR-081). */
export function outlookSkill(gm: Pick<StaffState, "attributes">): number {
  return 0.5 * rating(gm.attributes, "forecasting") + 0.5 * rating(gm.attributes, "talentEvaluation");
}

/** The sd of a GM's error at a man's yearly change, by outlook skill (`AHEAD.errorAt25`, `errorAt85`). */
export function outlookError(skill: number): number {
  const s = Math.max(0, Math.min(100, skill));
  return Math.max(0, AHEAD.errorAt25 + (s - 25) * (AHEAD.errorAt85 - AHEAD.errorAt25) / 60);
}

function normal(u1: number, u2: number): number {
  return Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * The men who start for their teams today: the best by today's rating at each position, as many as
 * the position starts (at least one). Free agents start for nobody.
 */
function startersOf(people: AheadContext["people"], rate: Rate): Set<string> {
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const out = new Set<string>();
  for (const t of people.teams) {
    const at = new Map<string, PlayerState[]>();
    for (const id of t.roster) {
      const p = byId.get(String(id));
      if (p) (at.get(p.bio.position) ?? at.set(p.bio.position, []).get(p.bio.position)!).push(p);
    }
    for (const [pos, men] of at) {
      men.sort((a, b) => rate(b) - rate(a));
      for (const p of men.slice(0, Math.max(1, STARTERS[pos as keyof typeof STARTERS]))) out.add(String(p.bio.id));
    }
  }
  return out;
}

const mean = (xs: readonly number[], n: number): number => {
  let s = 0;
  for (let i = 0; i < n; i++) s += xs[i] ?? xs[xs.length - 1] ?? 0;
  return n > 0 ? s / n : 0;
};

/** A team as the view reads it: its direction, its roster, and its men's ratings today at each position, best first. */
interface TeamRead {
  readonly direction: TeamDirection | undefined;
  readonly roster: ReadonlySet<string>;
  readonly ratingsAt: ReadonlyMap<string, readonly number[]>;
}

/**
 * The view over a base rating (today's). Each step that reads it sets the day and the league first
 * (`setToday`). One expected path per man and decision season (a walk of three years, kept), one GM
 * error per GM, man and stretch of the year. A season's walk keeps one view (`runSeason`), so the
 * league year and the draft's cut-down judge a man alike. A path is read on the first day the walk
 * judges him for a season, so a run saved in the regular season, or between walks, carries on
 * exactly; one saved part-way through the offseason reads it again from the day it carries on.
 */
export function aheadView(base: Rate): AheadView {
  let now: AheadContext | undefined;
  const paths = new Map<string, readonly number[]>();
  const errors = new Map<string, number>();
  const kept = new Map<string, number>();
  const starters = new WeakMap<object, Set<string>>();
  const teamReads = new WeakMap<object, Map<string, TeamRead>>();
  const gms = new WeakMap<object, Map<string, StaffState>>();
  const lines = new Map<number, { a: number; b: number } | null>();
  let periodAt: { key: string; period: string } | undefined;

  const judgesAhead = (p: PlayerState) => p.attributes.development !== undefined && p.bio.draft !== "PROSPECT";
  const startersNow = (ctx: AheadContext) => {
    let s = starters.get(ctx.people.teams);
    if (!s) { s = startersOf(ctx.people, base); starters.set(ctx.people.teams, s); }
    return s;
  };
  const teamRead = (ctx: AheadContext, team: TeamId): TeamRead | undefined => {
    let m = teamReads.get(ctx.people.teams);
    if (!m) {
      const byId = new Map(ctx.people.players.map((p) => [String(p.bio.id), p]));
      m = new Map(ctx.people.teams.map((t) => {
        const ratingsAt = new Map<string, number[]>();
        for (const id of t.roster) {
          const p = byId.get(String(id));
          if (p) (ratingsAt.get(p.bio.position) ?? ratingsAt.set(p.bio.position, []).get(p.bio.position)!).push(base(p));
        }
        for (const xs of ratingsAt.values()) xs.sort((a, b) => b - a);
        return [String(t.id), { direction: t.direction, roster: new Set(t.roster.map(String)), ratingsAt }];
      }));
      teamReads.set(ctx.people.teams, m);
    }
    return m.get(String(team));
  };
  /** Would a man not on the team start for it today: fewer of its men at his position rated above him than it starts (at least one). */
  const wouldStart = (t: TeamRead, p: PlayerState): boolean => {
    const r = base(p);
    const above = (t.ratingsAt.get(p.bio.position) ?? []).filter((x) => x > r).length;
    return above < Math.max(1, STARTERS[p.bio.position]);
  };
  const gmNow = (ctx: AheadContext, team: TeamId): StaffState | undefined => {
    const staff = ctx.people.staff;
    if (!staff) return undefined;
    let m = gms.get(staff);
    if (!m) {
      m = new Map();
      for (const s of staff) if (s.role === "GM" && s.teamId !== undefined && s.retiredAfter === undefined) m.set(String(s.teamId), s);
      gms.set(staff, m);
    }
    return m.get(String(team));
  };
  const periodNow = (ctx: AheadContext): string => {
    const key = `${ctx.at.season}/${ctx.at.phase}/${ctx.at.week}/${ctx.at.day}`;
    if (periodAt?.key !== key) periodAt = { key, period: outlookPeriod(ctx.at, ctx.rules) };
    return periodAt.period;
  };
  /** His expected change at the end of each of the next three years (truth), kept for the decision season. */
  const pathOf = (p: PlayerState, ctx: AheadContext): readonly number[] => {
    const key = `${String(p.bio.id)}|${decisionSeason(ctx.at)}`;
    let path = paths.get(key);
    if (path === undefined) {
      path = expectedOverallPath(p, { at: ctx.at, starter: startersNow(ctx).has(String(p.bio.id)), years: AHEAD.most, ...(ctx.rules ? { rules: ctx.rules } : {}) });
      paths.set(key, path);
    }
    return path;
  };
  /** The team's GM's error at his yearly change (0 with no GM seated or no team). */
  const errorOf = (team: TeamId | undefined, p: PlayerState, ctx: AheadContext): number => {
    if (team === undefined) return 0;
    const gm = gmNow(ctx, team);
    if (!gm) return 0;
    const period = periodNow(ctx);
    const key = `${String(gm.id)}|${String(p.bio.id)}|${period}`;
    let e = errors.get(key);
    if (e === undefined) {
      // Drawn from the GM himself (made from the run's dice, ADR-081 G1), so the same guess holds all
      // through its stretch of the year, across the turn of the calendar season: a part that stays with
      // the GM and the man, and a part for the stretch.
      const seed = `outlook/${String(gm.id)}/${JSON.stringify(gm.attributes)}`;
      const own = `${String(gm.id)}|${String(p.bio.id)}`;
      let z = kept.get(own);
      if (z === undefined) {
        const rng = createRng(seed, `kept/${String(p.bio.id)}`);
        z = normal(rng.next(), rng.next());
        kept.set(own, z);
      }
      const rng = createRng(seed, `${period}/${String(p.bio.id)}`);
      const fresh = normal(rng.next(), rng.next());
      e = outlookError(outlookSkill(gm)) * (Math.sqrt(AHEAD.errorKeep) * z + Math.sqrt(1 - AHEAD.errorKeep) * fresh);
      errors.set(key, e);
    }
    return e;
  };
  /**
   * Years ahead `team` judges him on: its starters' years, a year more for a backup: a man on its roster
   * who does not start, or a newcomer who would not start for it today. No team (his own view of his
   * worth): the middle years, a year more for a man on a roster who does not start.
   */
  const yearsFor = (team: TeamId | undefined, p: PlayerState, ctx: AheadContext): number => {
    const t = team === undefined ? undefined : teamRead(ctx, team);
    const own = t?.direction !== undefined ? AHEAD.years[t.direction] : AHEAD.noDirection;
    const id = String(p.bio.id);
    const backup = team === undefined ? p.teamId !== undefined && !startersNow(ctx).has(id)
      : t === undefined ? false
      : t.roster.has(id) ? !startersNow(ctx).has(id)
      : !wouldStart(t, p);
    return Math.min(AHEAD.most, own + (backup ? AHEAD.backupExtra : 0));
  };
  /** His expected change averaged over the next `years`, as `team`'s GM sees it: the truth plus a misjudged pace. */
  const changeOver = (team: TeamId | undefined, p: PlayerState, years: number, ctx: AheadContext): number => {
    const n = Math.max(1, Math.min(AHEAD.most, Math.round(years)));
    return mean(pathOf(p, ctx), n) + errorOf(team, p, ctx) * (n + 1) / 2;
  };
  /** The league's line of three-year change against age (ages `fitAges`), for the decision season. */
  const lineOf = (ctx: AheadContext): { a: number; b: number } | null => {
    const season = decisionSeason(ctx.at);
    if (lines.has(season)) return lines.get(season)!;
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const p of ctx.people.players) {
      if (!judgesAhead(p) || p.bio.age < AHEAD.fitAges[0] || p.bio.age > AHEAD.fitAges[1]) continue;
      const y = mean(pathOf(p, ctx), AHEAD.most);
      n++; sx += p.bio.age; sy += y; sxx += p.bio.age * p.bio.age; sxy += p.bio.age * y;
    }
    const d = n * sxx - sx * sx;
    const b = d > 0 ? (n * sxy - sx * sy) / d : 0;
    const line = n >= AHEAD.fitLeast && b < -0.05 ? { a: (sy - b * sx) / n, b } : null;
    lines.set(season, line);
    return line;
  };

  const view: AheadView = {
    setToday(ctx) {
      now = ctx;
    },
    judgesAhead,
    rate(team, p) {
      const today = base(p);
      if (!now || !judgesAhead(p)) return today;
      return today + changeOver(team, p, yearsFor(team, p, now), now);
    },
    forTeam(team) {
      return (p) => view.rate(team, p);
    },
    dealShift(team, p, years) {
      if (!now || !judgesAhead(p)) return 0;
      return changeOver(team, p, years, now) - changeOver(team, p, yearsFor(team, p, now), now);
    },
    ruleAge(team, p) {
      if (!now || !judgesAhead(p)) return legacyRuleAge(p.bio.age, p.bio.position);
      const line = lineOf(now);
      if (!line) return p.bio.age;
      return Math.max(18, Math.min(45, (changeOver(team, p, AHEAD.most, now) - line.a) / line.b));
    },
    value(team, p) {
      if (!now || !judgesAhead(p)) return undefined;
      return { ruleAge: view.ruleAge(team, p), shift: (years) => view.dealShift(team, p, years) };
    },
  };
  return view;
}
