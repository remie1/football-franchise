/**
 * THE 20-SEASON CHECK'S READER (ADR-087 §9, row D5b).
 *
 * Watches the cap check's multi-season walk (`runCapCheck`) on the stand-in league with growth and
 * injuries switched on, and writes down, season by season, what the graded rows need to set the
 * league against itself (year 0) and against the real NFL. It only watches: it reads what the walk
 * hands its watchers and never changes it.
 *
 * What it reads, and when (the walk's `onDay` runs first in each day's order, after that day's games):
 *  - Regular-season week 8, day 1 (the league file's 23 October point): each team's 53 (`roster`).
 *    Every man's overall at his own position (contracts' `positionOverall`): the league's and each
 *    group's mean, the pooled within-group spread, how many ratings sit at 95+ and at 99, the
 *    starters' and backups' means (starters as the engine fields them, `fieldedStarters`), how far
 *    the teams' starters sit apart, the rating groups' means, ages, rookies and undrafted men; and the
 *    draft check's starter rate by round, read off the depth charts (`STARTING`).
 *  - Camp week 1 day 1 and regular-season week 18 day 7 (the two days an unsigned man may retire):
 *    each free agent and how long he has been unsigned (`playerMemory.unsignedSince`), read before
 *    the day's unsigned step can forget a retiree's date. Week 18 day 7's 53s are also kept, to
 *    cross-check the credited seasons.
 *  - Day 1 of every regular-season week: who is on a team (any status), for careers' censoring and
 *    the comebacks.
 *  - Every regular-season game: each man's snaps on offense and defense against his team's busiest
 *    man on that side in that game (the who-played report, as franchise's `playerWeeks` reads it).
 *  - After each season (`onRun`, with the season's stamped events and step ids): the career ledger
 *    (how each man came in, when his credited seasons rose, a position rewritten by an emergency
 *    call-up, retirement), the win spread and how wins carry into the next season, the free-agent
 *    pool and the players in limbo, emergency signings told apart from the league year's bargain
 *    minimum deals, injuries by age, and what the limbo took from each team.
 *  - Also after each season, for the cap thread that will make teams let old players go sooner: the
 *    ages of the men released, of the veterans re-signed or extended by their own team, and of the
 *    veterans signed by a new team (`capMoveAges`, own and new told apart as the cap check's money
 *    counts tell them, `lastTeams`); and how many teams changed head coach (the carousel, ADR-084),
 *    beside the sitting head coaches' depth-chart leanings at week 8 (`headCoachLeanings`).
 *
 * Ages. A man's age is his `bio.age` during the season (as read at week 8); the year turn at the end
 * of each walk adds one, so an age read after it (in `onRun`'s people) is next season's (`seasonAge`).
 *
 * Year 0 is the walk's own 2026 week-8 picture, read by the same reader; the league file as loaded
 * (`file`) is kept beside it as a cross-check, since 2026 replays camp and part of a season's growth
 * on top of the real ratings.
 *
 * Every measure follows the D5b plan's shared definitions, read the way the real-NFL side
 * (`careers/`, `NFL_CAREERS`) reads them: snap shares (`snapShares`, as `careers/usage.ts`
 * `snapSeasons`), a season's group (`modalGroup`), peak usage with its 20-pair floor (`usagePeak`, as
 * `deltaCurve` and `peakAge`), and Kaplan-Meier with a man still going leaving the risk set before
 * the exits at his length (`kaplanMeier`, as `careerValues`). Where the sim forces a choice, the
 * measure's comment says which.
 *
 * `runCareerCheck` runs this reader and the draft check's (`draftReader`) on ONE walk, so a seed gives
 * both the D5b rows and the D7 rows. Between seasons both readers save their state as plain JSON
 * and restore it (`save`, `restore`), so a walk stopped after a season carries on from a checkpoint
 * (`CareerCheckOptions`; the files are `careerCheckRun.ts`'s).
 */
import {
  DEFAULT_LEAGUE_RULES, positionOverall, stampToString,
  type CalendarStamp, type FranchiseEvent, type GameParticipation, type PlayerState, type Position, type StaffState, type Team,
} from "@ff/contracts";
import type { SeasonRun } from "@ff/franchise";
import { PersonnelUnavailableError } from "@ff/playbook";
import { MIN_PAIRS_PER_AGE } from "../careers/usage.js";
import { lastTeams, limboPlayers, runCapCheck, VETERAN_DEAL_KINDS, type CapCheckDayGames, type CapCheckInput, type CapCheckRun } from "./capCheck.js";
import { draftReader, STARTING, type DraftCheckResult, type DraftReaderState } from "./draftCheck.js";
import { fieldedStarters } from "./playerChecks.js";
import type { SeasonPeople } from "./realSeason.js";

// --- groups --------------------------------------------------------------------------------------

/** The position groups careers, ages and usage are reported by (the shared definitions' groups). */
export type CareerGroup = "QB" | "RB" | "WR" | "TE" | "OL" | "EDGE" | "IDL" | "LB" | "CB" | "S" | "K" | "P" | "LS";
export const CAREER_GROUPS: readonly CareerGroup[] = ["QB", "RB", "WR", "TE", "OL", "EDGE", "IDL", "LB", "CB", "S", "K", "P", "LS"];

/**
 * Our positions in those groups: the stand-in importer's own ranking groups (its OT and IOL together
 * as OL), so a real roster folded the importer's way lands in the same group as its stand-in.
 */
export const CAREER_GROUP: Readonly<Record<Position, CareerGroup>> = {
  QB: "QB", RB: "RB", FB: "RB", WR: "WR", TE: "TE",
  LT: "OL", LG: "OL", C: "OL", RG: "OL", RT: "OL",
  DE: "EDGE", OLB: "EDGE", DT: "IDL", NT: "IDL", MLB: "LB", ILB: "LB",
  CB: "CB", FS: "S", SS: "S", K: "K", P: "P", LS: "LS",
};

/** Kickers, punters and long snappers: no usage row (their share of their side's snaps hardly moves). */
export const SPECIALIST_GROUPS: ReadonlySet<CareerGroup> = new Set(["K", "P", "LS"]);

/**
 * The rating groups of ADR-087 §2.3 (what moves each rating), copied from franchise's
 * `GROUP_MEMBERS` (developmentTables.ts), which calibration may not import. Pinned by
 * `RATING_GROUP_DIGEST` (the sha256 of this object's `JSON.stringify`); franchise's own table must
 * give the same digest, so a change there shows here.
 */
export const RATING_GROUP_COPY: Readonly<Record<string, readonly string[]>> = {
  BODY: ["speed", "agility", "jumping", "strength"],
  BODY_PRACTICE: ["acceleration", "mobility", "firstStep", "pursuit", "power", "anchor"],
  OWN_CURVE: ["armStrength", "kickPower", "puntPower", "stamina", "durability"],
  SKILL: [
    "accuracy", "touch", "improvisation", "release",
    "passBlock", "runBlock", "footwork", "sustain", "pullSkill",
    "passRush", "runStuff", "powerMove", "finesseMove", "blockShed",
    "tackling", "zoneCoverage", "manCoverage", "press", "ballSkills",
    "routeRunning", "releaseWR", "catching", "catchInTraffic", "spectacularCatch", "yac",
    "elusiveness", "ballSecurity", "kickAccuracy", "puntHangTime",
    "disguise",
  ],
  SMARTS: [
    "awareness", "reaction", "decisionMaking", "pocketPatience", "poise",
    "playRecognition", "instincts", "vision", "patience", "footballIQ", "gapDiscipline",
  ],
  FIXED: ["volatility", "discipline"],
};
export const RATING_GROUP_DIGEST = "babfb713ab7386800c90ef202988d3013ca3943f7ae69f2f2bde6de6e672e416";
/** The groups whose ratings move (FIXED never does): the 95+ and 99 counts read these ratings only. */
export const MOVING_RATING_GROUPS: readonly string[] = ["BODY", "BODY_PRACTICE", "OWN_CURVE", "SKILL", "SMARTS"];

// --- the days it reads ---------------------------------------------------------------------------

type DayOfYear = { readonly phase: CalendarStamp["phase"]; readonly week: number; readonly day: number };
const isDay = (s: CalendarStamp, d: DayOfYear) => s.phase === d.phase && s.week === d.week && s.day === d.day;
/** The league file's snapshot point (23 October): regular-season week 8, day 1. */
export const WEEK_8: DayOfYear = { phase: "REGULAR_SEASON", week: 8, day: 1 };
/** The two retirement moments (franchise unsigned.ts `retirementMoment`): camps open; the regular season ends. */
export const CAMP_OPENS: DayOfYear = { phase: "TRAINING_CAMP", week: 1, day: 1 };
export const SEASON_ENDS: DayOfYear = { phase: "REGULAR_SEASON", week: DEFAULT_LEAGUE_RULES.weeksPerSeason, day: 7 };
/** The step whose `CONTRACT_SIGNED` events are emergency signings (franchise players/steps.ts: `players:` + `week`). */
export const EMERGENCY_STEP = "players:week";

// --- small statistics ----------------------------------------------------------------------------

const mean = (xs: readonly number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
/** Population sd (as the player checks' win spread is). */
const sd = (xs: readonly number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
const quantile = (xs: readonly number[], q: number) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))]!;
};
const bump = (m: Record<string, number>, k: string) => { m[k] = (m[k] ?? 0) + 1; };

/** Pearson's r of two equal-length series; null when either has no spread or there are fewer than 2 points. */
export function pearson(xs: readonly number[], ys: readonly number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i]! - mx, dy = ys[i]! - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy);
}

/**
 * A man's age in a season. During the season (any read from camp to the year turn) it is his
 * `bio.age`; the year turn at the end of the walk adds one, so an age read after it is one less.
 */
export function seasonAge(age: number, readAfterYearTurn: boolean): number {
  return readAfterYearTurn ? age - 1 : age;
}

// --- the week-8 picture --------------------------------------------------------------------------

export interface GroupPicture {
  readonly n: number;
  /** Mean overall at his own position. */
  readonly mean: number;
  readonly sd: number;
  /** Mean overall of the group's five best in the league. */
  readonly top5: number;
  readonly age: number;
}

/** The 53s at one moment. */
export interface RosterPicture {
  /** Men on the 53s. */
  readonly players: number;
  readonly overall: {
    readonly mean: number;
    /** Raw sd, every group together. */
    readonly sd: number;
    /** Pooled within-group sd: sqrt(sum over groups of squared deviations from the group's mean / (men - groups)). */
    readonly pooledSd: number;
    readonly p10: number;
    readonly p50: number;
    readonly p90: number;
    readonly max: number;
  };
  readonly groups: Record<CareerGroup, GroupPicture>;
  /** Each rating group's mean rating (each man's mean over the group's ratings he has, then over men). */
  readonly ratingGroups: Record<string, number>;
  /** Every moving rating of every man on the 53s: how many, how many at 95 or more, how many at 99. */
  readonly ratings: { readonly total: number; readonly at95: number; readonly at99: number };
  /**
   * Starters (as the engine fields them, `teamStarters`) against the rest of the 53; how many teams
   * were read with their men who are out put back (`paddedTeams`), and how many could not field a
   * side at all and count no starter (`shortTeams`).
   */
  readonly gap: {
    readonly starters: number; readonly backups: number; readonly starterMean: number; readonly backupMean: number; readonly gap: number;
    readonly paddedTeams: number; readonly shortTeams: number;
  };
  /** Each team's starters' mean overall: their mean and sd across the teams (a short team left out). */
  readonly teamStrength: { readonly mean: number; readonly sd: number };
  readonly age: {
    readonly mean: number;
    /** Shares of the 53s aged 22 or under, 31 or over, 34 or over. */
    readonly upTo22: number;
    readonly from31: number;
    readonly from34: number;
    /** Men by age. */
    readonly histogram: Record<string, number>;
  };
  /**
   * Share in their first season in the league, as the real rosters' `years_exp` 0 reads (years_exp
   * is the season less the year he came in, not his credited seasons). Read with the ledger's
   * first seasons (`firstSeasonOf`); without them (the league file as loaded), `creditedSeasons` 0,
   * which in the file is `years_exp`.
   */
  readonly rookieShare: number;
  /**
   * Share with no credited season yet (an absent count reads 0, as contracts says): the earlier
   * reading of a rookie, reported beside it. It also counts a man in his second season or later who
   * has never been on a 53 when a regular season ended.
   */
  readonly noCreditShare: number;
  /** Share whose draft line is UDFA. */
  readonly undraftedShare: number;
}

/**
 * A team's starters as the engine fields them (`fieldedStarters`). In season the depth chart leaves
 * off the men who are out, so a team with a bye can be a man short at a position until its next
 * week's emergency signing; then the men left off are put back at the foot of their position's list
 * (after every man who can play) and the starters read again (`padded`). A team that still cannot
 * field a side counts no starter (`short`).
 */
export function teamStarters(team: Team, byId: ReadonlyMap<string, PlayerState>): { ids: Set<string>; padded: boolean; short: boolean } {
  const read = (t: Team): Set<string> | undefined => {
    try {
      return fieldedStarters([t]);
    } catch (e) {
      if (e instanceof PersonnelUnavailableError) return undefined;
      throw e;
    }
  };
  const plain = read(team);
  if (plain !== undefined) return { ids: plain, padded: false, short: false };
  const listed = new Set(Object.values(team.depthChart).flatMap((ids) => (ids ?? []).map(String)));
  const depthChart: Team["depthChart"] = { ...team.depthChart };
  for (const id of team.roster) {
    const p = byId.get(String(id));
    if (p === undefined || listed.has(String(id))) continue;
    depthChart[p.bio.position] = [...(depthChart[p.bio.position] ?? []), id];
  }
  const padded = read({ ...team, depthChart });
  return padded === undefined ? { ids: new Set(), padded: true, short: true } : { ids: padded, padded: true, short: false };
}

/** Who is in his first season in the league: the season read, and each man's first season (the ledger's). */
export interface RookieReading {
  readonly season: number;
  readonly firstSeasonOf: (id: string) => number | undefined;
}

/**
 * The 53s' picture: each team's `roster` (the practice squad, reserve lists and anyone on no team
 * left out), ages as read. Read during the season (week 8), the ages need no offset. With `rookies`,
 * a rookie is a man whose first season in the league is the season read (a man the ledger has no
 * first season for is read by his credited seasons); without it, a man with no credited season.
 */
export function rosterPicture(people: Pick<SeasonPeople, "teams" | "players">, rookies?: RookieReading): RosterPicture {
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const fielded = people.teams.map((t) => teamStarters(t, byId));
  const starters = new Set(fielded.flatMap((f) => [...f.ids]));
  const rows: { p: PlayerState; overall: number; group: CareerGroup; team: string }[] = [];
  for (const t of people.teams) {
    for (const id of t.roster) {
      const p = byId.get(String(id));
      if (p === undefined) continue;
      rows.push({ p, overall: positionOverall(p.bio.position, p.attributes.values), group: CAREER_GROUP[p.bio.position], team: String(t.id) });
    }
  }
  const overalls = rows.map((r) => r.overall);
  const groups = {} as Record<CareerGroup, GroupPicture>;
  let within = 0, groupsSeen = 0;
  for (const g of CAREER_GROUPS) {
    const mine = rows.filter((r) => r.group === g);
    const xs = mine.map((r) => r.overall);
    const m = mean(xs);
    within += xs.reduce((s, x) => s + (x - m) ** 2, 0);
    if (xs.length > 0) groupsSeen++;
    groups[g] = { n: xs.length, mean: m, sd: sd(xs), top5: mean([...xs].sort((a, b) => b - a).slice(0, 5)), age: mean(mine.map((r) => r.p.bio.age)) };
  }
  const ratingGroups: Record<string, number> = {};
  for (const [group, ids] of Object.entries(RATING_GROUP_COPY)) {
    const perMan = rows.flatMap((r) => {
      const vs = ids.map((id) => r.p.attributes.values[id]).filter((v): v is number => v !== undefined);
      return vs.length === 0 ? [] : [mean(vs)];
    });
    ratingGroups[group] = mean(perMan);
  }
  const moving = MOVING_RATING_GROUPS.flatMap((g) => RATING_GROUP_COPY[g] ?? []);
  let total = 0, at95 = 0, at99 = 0;
  for (const r of rows) {
    for (const id of moving) {
      const v = r.p.attributes.values[id];
      if (v === undefined) continue;
      total++;
      if (v >= 95) at95++;
      if (v >= 99) at99++;
    }
  }
  const starterRows = rows.filter((r) => starters.has(String(r.p.bio.id)));
  const backupRows = rows.filter((r) => !starters.has(String(r.p.bio.id)));
  const starterMean = mean(starterRows.map((r) => r.overall));
  const backupMean = mean(backupRows.map((r) => r.overall));
  const teamMeans = people.teams.flatMap((t, i) => (fielded[i]!.short ? [] : [mean(starterRows.filter((r) => r.team === String(t.id)).map((r) => r.overall))]));
  const ages = rows.map((r) => r.p.bio.age);
  const histogram: Record<string, number> = {};
  for (const a of [...ages].sort((x, y) => x - y)) bump(histogram, String(a));
  const share = (pred: (r: (typeof rows)[number]) => boolean) => (rows.length === 0 ? 0 : rows.filter(pred).length / rows.length);
  return {
    players: rows.length,
    overall: {
      mean: mean(overalls), sd: sd(overalls),
      pooledSd: rows.length - groupsSeen > 0 ? Math.sqrt(within / (rows.length - groupsSeen)) : 0,
      p10: quantile(overalls, 0.1), p50: quantile(overalls, 0.5), p90: quantile(overalls, 0.9),
      max: overalls.length === 0 ? 0 : Math.max(...overalls),
    },
    groups,
    ratingGroups,
    ratings: { total, at95, at99 },
    gap: {
      starters: starterRows.length, backups: backupRows.length, starterMean, backupMean, gap: starterMean - backupMean,
      paddedTeams: fielded.filter((f) => f.padded && !f.short).length, shortTeams: fielded.filter((f) => f.short).length,
    },
    teamStrength: { mean: mean(teamMeans), sd: sd(teamMeans) },
    age: { mean: mean(ages), upTo22: share((r) => r.p.bio.age <= 22), from31: share((r) => r.p.bio.age >= 31), from34: share((r) => r.p.bio.age >= 34), histogram },
    rookieShare: share((r) => {
      const first = rookies?.firstSeasonOf(String(r.p.bio.id));
      return first === undefined ? (r.p.bio.creditedSeasons ?? 0) === 0 : first === rookies!.season;
    }),
    noCreditShare: share((r) => (r.p.bio.creditedSeasons ?? 0) === 0),
    undraftedShare: share((r) => r.p.bio.draft === "UDFA"),
  };
}

// --- unsigned waits ------------------------------------------------------------------------------

/** How long an unsigned man has waited: under one league year, one to two, two or more, or not known. */
export type WaitClass = "under1" | "1to2" | "2plus" | "unknown";
export const WAIT_CLASSES: readonly WaitClass[] = ["under1", "1to2", "2plus", "unknown"];

/** A wait in days, against a league year's length in days. */
export function waitClass(days: number | undefined, yearDays: number): WaitClass {
  if (days === undefined || !(yearDays > 0)) return "unknown";
  return days < yearDays ? "under1" : days < 2 * yearDays ? "1to2" : "2plus";
}

const emptyWaits = (): Record<WaitClass, number> => ({ under1: 0, "1to2": 0, "2plus": 0, unknown: 0 });

/**
 * Each free agent (prospects aside) and how many days he has been unsigned on `today`, counted by
 * `dayNumber` (the days the walk has passed). One not yet remembered became unsigned today (the
 * unsigned step, which remembers him, runs after the watcher); undefined = his date is a day the
 * count never saw.
 */
export function unsignedWaits(
  people: Pick<SeasonPeople, "players" | "freeAgents" | "playerMemory">, today: number, dayNumber: (s: CalendarStamp) => number | undefined,
): Map<string, number | undefined> {
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const since = people.playerMemory?.unsignedSince ?? {};
  const waits = new Map<string, number | undefined>();
  for (const id of people.freeAgents) {
    const p = byId.get(String(id));
    if (p === undefined || p.bio.draft === "PROSPECT" || waits.has(String(id))) continue;
    const from = since[String(id)];
    const at = from === undefined ? today : dayNumber(from);
    waits.set(String(id), at === undefined ? undefined : today - at);
  }
  return waits;
}

// --- signings, limbo -----------------------------------------------------------------------------

/**
 * The season's one-year minimum deals (`CONTRACT_SIGNED` of kind MINIMUM), by the step that signed
 * them: the players' week step's (`EMERGENCY_STEP`) are emergency signings; any other step's are the
 * league year's bargain deals; those no step emitted are the year turn's reserve/future deals for
 * last year's practice squads. `byStep` counts every signing of any kind by step (`turn` for the
 * year turn's).
 */
export function minimumSignings(run: Pick<SeasonRun, "events" | "stepEvents">): {
  emergency: number; bargain: number; yearTurn: number; byStep: Record<string, number>;
} {
  const stepOf = new Map<number, string>();
  for (const s of run.stepEvents ?? []) stepOf.set(s.envelope.seq, s.step);
  let emergency = 0, bargain = 0, yearTurn = 0;
  const byStep: Record<string, number> = {};
  for (const e of run.events) {
    if (e.event.type !== "CONTRACT_SIGNED") continue;
    const step = stepOf.get(e.seq);
    bump(byStep, step ?? "turn");
    if (e.event.payload.kind !== "MINIMUM") continue;
    if (step === EMERGENCY_STEP) emergency++;
    else if (step === undefined) yearTurn++;
    else bargain++;
  }
  return { emergency, bargain, yearTurn, byStep };
}

/**
 * The players in limbo after a season (`limboPlayers`: on no team, not free agents, not prospects)
 * and how many each team lost to it, counted by each man's team in the people the season started
 * with, in `teams` order (a man who had no team then counts in `elsewhere`).
 */
export function reserveLoss(
  before: Pick<SeasonPeople, "players">, after: Pick<SeasonPeople, "players" | "freeAgents">, teams: readonly Pick<Team, "id">[],
): { limbo: number; byTeam: number[]; elsewhere: number } {
  const was = new Map(before.players.map((p) => [String(p.bio.id), p.teamId === undefined ? undefined : String(p.teamId)]));
  const stranded = limboPlayers(after);
  const index = new Map(teams.map((t, i) => [String(t.id), i]));
  const byTeam = teams.map(() => 0);
  let elsewhere = 0;
  for (const id of stranded) {
    const i = index.get(was.get(String(id)) ?? "");
    if (i === undefined) elsewhere++; else byTeam[i]!++;
  }
  return { limbo: stranded.length, byTeam, elsewhere };
}

// --- the cap's moves by age, the head coaches ----------------------------------------------------

/** The age histograms' bins: one a year from `from` to `to`, the first counting every age below too and the last every age above. */
export const AGE_BINS = { from: 21, to: 40 } as const;

/**
 * Some men's ages: how many, their mean, and a histogram by whole-year age (`AGE_BINS`: index 0 is
 * 21 and under, the last 40 and over). A man whose age is not known counts in `unknown` alone.
 */
export interface AgeTally {
  readonly n: number;
  readonly mean: number;
  readonly histogram: number[];
  readonly unknown: number;
}

export function ageTally(ages: readonly (number | undefined)[]): AgeTally {
  const histogram = Array.from({ length: AGE_BINS.to - AGE_BINS.from + 1 }, () => 0);
  const known = ages.filter((a): a is number => a !== undefined);
  for (const a of known) histogram[Math.min(AGE_BINS.to, Math.max(AGE_BINS.from, Math.floor(a))) - AGE_BINS.from]!++;
  return { n: known.length, mean: mean(known), histogram, unknown: ages.length - known.length };
}

/** A season's moves the cap decides, by the men's ages. */
export interface CapMoveAges {
  /** Every `PLAYER_RELEASED` (a man released twice counts twice). */
  readonly released: AgeTally;
  /** The same by the step that made them (`cutdown`, the league year's steps by id; `turn` for one no step made), by step id. */
  readonly releasedByStep: Record<string, AgeTally>;
  /** Veteran deals (`VETERAN_DEAL_KINDS`) with the team of his latest deal before the season: re-signings and extensions. */
  readonly reSigned: AgeTally;
  /** Veteran deals with another team than that one (emergency signings among them). */
  readonly newTeam: AgeTally;
  /**
   * Both by the deal's kind (`NONE` for a deal with no kind), by kind: a practice-squad man promoted
   * to his own team's 53 on a minimum deal is a re-signing here, as the cap check counts him.
   */
  readonly reSignedByKind: Record<string, AgeTally>;
  readonly newTeamByKind: Record<string, AgeTally>;
}

/**
 * The ages of a season's releases and veteran signings. A veteran deal (`CONTRACT_SIGNED` of a kind in
 * `VETERAN_DEAL_KINDS`) is a re-signing when his team on his latest deal before the season
 * (`lastTeam`, the cap check's `lastTeams` of the people the season started with) is the signing team,
 * and a move when it is another; a man with no deal before the season is neither, as the cap check's
 * money counts read him. `ageOf` gives a man's age in the season; the steps come from the run's
 * `stepEvents`, as `minimumSignings` reads them. Every split's keys are sorted.
 */
export function capMoveAges(
  run: Pick<SeasonRun, "events" | "stepEvents">, lastTeam: ReadonlyMap<string, string>, ageOf: (id: string) => number | undefined,
): CapMoveAges {
  const stepOf = new Map<number, string>();
  for (const s of run.stepEvents ?? []) stepOf.set(s.envelope.seq, s.step);
  type Ages = (number | undefined)[];
  const released: Ages = [], reSigned: Ages = [], newTeam: Ages = [];
  const byStep: Record<string, Ages> = {}, reSignedByKind: Record<string, Ages> = {}, newTeamByKind: Record<string, Ages> = {};
  for (const { seq, event: e } of run.events) {
    if (e.type === "PLAYER_RELEASED") {
      const age = ageOf(String(e.payload.player));
      released.push(age);
      (byStep[stepOf.get(seq) ?? "turn"] ??= []).push(age);
    }
    if (e.type !== "CONTRACT_SIGNED" || !VETERAN_DEAL_KINDS.includes(e.payload.kind)) continue;
    const was = lastTeam.get(String(e.payload.player));
    if (was === undefined) continue;
    const own = was === String(e.payload.team);
    const age = ageOf(String(e.payload.player));
    (own ? reSigned : newTeam).push(age);
    ((own ? reSignedByKind : newTeamByKind)[e.payload.kind ?? "NONE"] ??= []).push(age);
  }
  const tallies = (m: Record<string, Ages>) => Object.fromEntries(Object.keys(m).sort().map((k) => [k, ageTally(m[k]!)]));
  return {
    released: ageTally(released), releasedByStep: tallies(byStep), reSigned: ageTally(reSigned), newTeam: ageTally(newTeam),
    reSignedByKind: tallies(reSignedByKind), newTeamByKind: tallies(newTeamByKind),
  };
}

/**
 * The head coach sitting at each team, by team id: a man whose current job (the last on his résumé,
 * not ended) is an NFL head coach's with that team, the first in staff order should there be two (as
 * franchise's `headCoachOf` reads him).
 */
export function sittingHeadCoaches(staff: readonly StaffState[] | undefined): Map<string, StaffState> {
  const out = new Map<string, StaffState>();
  for (const s of staff ?? []) {
    const job = s.career[s.career.length - 1];
    if (job === undefined || job.lastSeason !== undefined || job.ended !== undefined) continue;
    if (job.level !== "NFL" || job.role !== "HEAD_COACH" || job.team === undefined) continue;
    if (!out.has(String(job.team))) out.set(String(job.team), s);
  }
  return out;
}

/** Of these teams, how many have another head coach (or none, or one where there was none) in `after` than in `before`. */
export function headCoachChanges(
  before: readonly StaffState[] | undefined, after: readonly StaffState[] | undefined, teams: readonly Pick<Team, "id">[],
): number {
  const was = sittingHeadCoaches(before), now = sittingHeadCoaches(after);
  return teams.filter((t) => was.get(String(t.id))?.id !== now.get(String(t.id))?.id).length;
}

/** The sitting head coaches' depth-chart leanings at one moment. */
export interface HeadCoachLeanings {
  /** Teams with a sitting head coach. */
  readonly n: number;
  /** Of them, those with no leanings stored (franchise draws them from his type and the season's seed). */
  readonly unset: number;
  /** The stored leanings' means (0 with none stored). */
  readonly incumbent: number;
  readonly veteran: number;
  readonly form: number;
}

/** These teams' sitting head coaches (`sittingHeadCoaches`) and their stored leanings. */
export function headCoachLeanings(staff: readonly StaffState[] | undefined, teams: readonly Pick<Team, "id">[]): HeadCoachLeanings {
  const sitting = sittingHeadCoaches(staff);
  const coaches = teams.map((t) => sitting.get(String(t.id))).filter((s): s is StaffState => s !== undefined);
  const set = coaches.map((s) => s.lineup).filter((l): l is NonNullable<StaffState["lineup"]> => l !== undefined);
  return {
    n: coaches.length, unset: coaches.length - set.length,
    incumbent: mean(set.map((l) => l.incumbent)), veteran: mean(set.map((l) => l.veteran)), form: mean(set.map((l) => l.form)),
  };
}

// --- snap shares ---------------------------------------------------------------------------------

/** Regular-season snaps by side (special teams too: they count toward his team and "a snap" in a season). */
export interface SideSnaps { offense: number; defense: number; special: number }

/** The busiest man's snaps on each side in one team's games (special teams have no share). */
export interface BusiestSnaps { offense: number; defense: number }

/**
 * Add one game's who-played report to a season's tallies: each man's offense, defense and special
 * teams snaps with his team (`snaps`, by man then team), and for both teams the game's busiest man
 * on offense and on defense (`busiest`, summed over the team's games; a side nobody played adds 0).
 * Men with no snap of any kind are not added.
 */
export function addGame(
  game: Pick<CapCheckDayGames[number]["game"], "home" | "away">, report: readonly Pick<GameParticipation, "player" | "team" | "snaps">[],
  snaps: Map<string, Map<string, SideSnaps>>, busiest: Map<string, BusiestSnaps>,
): void {
  const most = new Map<string, BusiestSnaps>();
  for (const r of report) {
    const team = String(r.team);
    const special = r.snaps.special ?? 0;
    const m = most.get(team) ?? { offense: 0, defense: 0 };
    m.offense = Math.max(m.offense, r.snaps.offense);
    m.defense = Math.max(m.defense, r.snaps.defense);
    most.set(team, m);
    if (r.snaps.offense + r.snaps.defense + special === 0) continue;
    const mine = snaps.get(String(r.player)) ?? new Map<string, SideSnaps>();
    const s = mine.get(team) ?? { offense: 0, defense: 0, special: 0 };
    s.offense += r.snaps.offense; s.defense += r.snaps.defense; s.special += special;
    mine.set(team, s);
    snaps.set(String(r.player), mine);
  }
  for (const team of [String(game.home), String(game.away)]) {
    const m = most.get(team) ?? { offense: 0, defense: 0 };
    const b = busiest.get(team) ?? { offense: 0, defense: 0 };
    b.offense += m.offense; b.defense += m.defense;
    busiest.set(team, b);
  }
}

/** One man's season of snaps: his team, his side (null with special teams snaps only), his share of that side's snaps. */
export interface SnapShare { team: string; side: "offense" | "defense" | null; share: number }

/**
 * Each man's snap share for a season (the shared definitions, read exactly as the real side reads
 * them, `careers/usage.ts` `snapSeasons`): his side is offense or defense, whichever he played more
 * over the season (offense on a tie above 0; none, share 0, when he played special teams only); his
 * team is the one he logged the most snaps of every kind with (special teams included; the first
 * by team id on a tie); his share is his snaps on his side with that team over the sum, across that
 * team's regular-season games, of each game's busiest man on that side for that team (`busiest`),
 * so games he missed count zero. The numerator takes that team's snaps only, so a share never
 * passes 1. Every man with a snap of any kind gets a row.
 */
export function snapShares(
  snaps: ReadonlyMap<string, ReadonlyMap<string, SideSnaps>>, busiest: ReadonlyMap<string, BusiestSnaps>,
): Map<string, SnapShare> {
  const out = new Map<string, SnapShare>();
  for (const [id, teams] of snaps) {
    let offense = 0, defense = 0;
    let team: string | undefined, most = -1;
    for (const t of [...teams.keys()].sort()) {
      const s = teams.get(t)!;
      offense += s.offense; defense += s.defense;
      const all = s.offense + s.defense + s.special;
      if (all > most) { most = all; team = t; }
    }
    if (team === undefined || most <= 0) continue;
    const side = offense > defense ? "offense" : defense > offense ? "defense" : offense > 0 ? "offense" : null;
    const of = side === null ? 0 : busiest.get(team)?.[side] ?? 0;
    out.set(id, { team, side, share: side !== null && of > 0 ? teams.get(team)![side] / of : 0 });
  }
  return out;
}

/** One age's year-to-year usage change: men with snaps both years (`n`, `sum`), and with leavers counted at share 0 (`nExit`, `sumExit`). */
export interface UsageCell { n: number; sum: number; nExit: number; sumExit: number }

/**
 * Add a season pair's changes to the usage cells, by each man's group and age in the first season
 * (`was`; specialists in that group are left out): every such man counts in the exit variant (a man
 * with no snap of any kind in `now` reads 0); one with a snap in both seasons counts in the plain
 * variant too. `now` holds every man with a snap the second season, specialists included.
 */
export function addUsage(
  cells: Record<string, Record<string, UsageCell>>,
  was: ReadonlyMap<string, { share: number; group: string; age: number }>, now: ReadonlyMap<string, { share: number }>,
): void {
  for (const [id, w] of was) {
    if (SPECIALIST_GROUPS.has(w.group as CareerGroup)) continue;
    const cell = ((cells[w.group] ??= {})[String(w.age)] ??= { n: 0, sum: 0, nExit: 0, sumExit: 0 });
    const next = now.get(id);
    const delta = (next?.share ?? 0) - w.share;
    cell.nExit++; cell.sumExit += delta;
    if (next !== undefined) { cell.n++; cell.sum += delta; }
  }
}

/** Cells summed: `into` gains every cell of `from` (pooling seasons or seeds). */
export function addCells(into: Record<string, UsageCell>, from: Readonly<Record<string, UsageCell>>): void {
  for (const [age, c] of Object.entries(from)) {
    const t = (into[age] ??= { n: 0, sum: 0, nExit: 0, sumExit: 0 });
    t.n += c.n; t.sum += c.sum; t.nExit += c.nExit; t.sumExit += c.sumExit;
  }
}

/**
 * Peak usage age from one group's cells by age (the shared definitions, read as the real side's
 * `deltaCurve` and `peakAge` read them): the mean change by age, ages with fewer than `minPairs`
 * pairs left out (the real side's `MIN_PAIRS_PER_AGE`, 20), smoothed with a centered 3-age moving
 * average (each kept age's smoothed value is the plain mean of the kept age means at age - 1, age
 * and age + 1), and the peak is the first kept age where the smoothed change is 0 or less after one
 * above 0; null if it never is. `exit` reads the variant that counts a man with no snaps the next
 * season at share 0.
 */
export function usagePeak(cells: Readonly<Record<string, UsageCell>>, exit = false, minPairs: number = MIN_PAIRS_PER_AGE): {
  peak: number | null; means: Record<string, number>; smoothed: Record<string, number>;
} {
  const means = new Map<number, number>();
  for (const [age, c] of Object.entries(cells)) {
    const n = exit ? c.nExit : c.n;
    if (n > 0 && n >= minPairs) means.set(Number(age), (exit ? c.sumExit : c.sum) / n);
  }
  const ages = [...means.keys()].sort((a, b) => a - b);
  const smoothed = new Map<number, number>();
  for (const a of ages) smoothed.set(a, mean([a - 1, a, a + 1].filter((x) => means.has(x)).map((x) => means.get(x)!)));
  let peak: number | null = null, rising = false;
  for (const a of ages) {
    const v = smoothed.get(a)!;
    if (v > 0) rising = true;
    else if (rising) { peak = a; break; }
  }
  const obj = (m: Map<number, number>) => Object.fromEntries(ages.map((a) => [String(a), m.get(a)!]));
  return { peak, means: obj(means), smoothed: obj(smoothed) };
}

/**
 * His group in a season, as the real side reads it (`careers/measure.ts`, `groupBySeason`): the
 * most common group over his reads on a team's list that season (day 1 of each regular-season week
 * here, each week's roster row there), ties to the group of his latest read.
 */
export function modalGroup(reads: readonly CareerGroup[]): CareerGroup | undefined {
  if (reads.length === 0) return undefined;
  const counts = new Map<CareerGroup, number>();
  for (const g of reads) counts.set(g, (counts.get(g) ?? 0) + 1);
  let best = reads[reads.length - 1]!;
  let bestN = counts.get(best)!;
  for (const [g, n] of counts) if (n > bestN) { best = g; bestN = n; }
  return best;
}

// --- careers -------------------------------------------------------------------------------------

/**
 * One man who came into the league during the walk and earned at least one credited season.
 * `e` entry season (his first credited season); `g` his group in it (his position on the 53 on the
 * regular season's last day, as the real side reads the final week's roster row; his position at
 * the season's end if he was not on a 53 then); `o` his group when he came in (his draft-class position); `r` how he came in; `n` credited
 * seasons in all; `c` 1 when right-censored (on a team, any status, in the walk's last season); `x` 1
 * when an emergency call-up rewrote his position at some point; `t` his retirement's timing, null if
 * he did not retire.
 */
export interface CareerEntrant {
  readonly e: number;
  readonly g: CareerGroup;
  readonly o: CareerGroup;
  readonly r: "DRAFT" | "UDFA";
  readonly n: number;
  readonly c: 0 | 1;
  readonly x: 0 | 1;
  readonly t: "IMMEDIATE" | "SLOW" | "LATE" | "SEASON_END" | null;
}

export type EntryRoute = "FILE" | "DRAFT" | "UDFA";

interface LedgerEntry {
  route: EntryRoute;
  origin: Position;
  relabeled: boolean;
  /** Credited seasons when the walk first saw him (the file's for its men; 0 for a rookie). */
  creditedAtStart: number;
  /**
   * His first season in the league, as the real rosters' `entry_year` reads it: for a league-file
   * man, the walk's first season less his file `creditedSeasons` (the importer's `years_exp`, which
   * is the season less `entry_year`); for a man who came in during the walk, the first season he is
   * on a team (a draftee's draft year; an undrafted man's signing). Unset until then.
   */
  firstSeason?: number;
  /** Seasons of the walk he was credited. */
  credited: number[];
  /** Seasons of the walk he was on a team (any status) on day 1 of some regular-season week. */
  present: Set<number>;
  entryGroup?: CareerGroup;
  retired?: { season: number; timing: NonNullable<CareerEntrant["t"]> };
  /** The walk's own draftees: the draft and round. */
  draft?: { year: number; round: number };
}

/** A ledger entry as JSON keeps it (the checkpoint): `present` as a sorted list. */
export type LedgerEntryState = Omit<LedgerEntry, "present"> & { present: number[] };
/** The whole ledger as JSON keeps it. */
export interface LedgerState { readonly started: boolean; readonly entries: [string, LedgerEntryState][] }

/**
 * The career ledger: every man the walk has seen, by id. Pure bookkeeping on what it is handed, so it
 * is tested on made-up people and events.
 */
export interface CareerLedger {
  /**
   * The people the walk starts with, in its first season: every one of them (prospects aside) came
   * from the league file. Without `season` their first seasons are not known.
   */
  start(players: readonly PlayerState[], season?: number): void;
  /** Men on a team (any status) on day 1 of a regular-season week of `season`. */
  present(season: number, players: readonly PlayerState[]): void;
  /**
   * A finished season: the people it started with (`before`) and ended with (`after`, past the year
   * turn), its events, and each man's position on a 53 on the regular season's last day
   * (`finalPositions`, for the entry group). Returns who was credited this season (his count rose
   * over it) and whose listed position was first found rewritten.
   */
  season(season: number, before: readonly PlayerState[], after: readonly PlayerState[], events: readonly FranchiseEvent[],
    finalPositions?: ReadonlyMap<string, Position>): {
    credited: string[]; relabeled: string[];
  };
  /** In-run entrants with a credited season, as of the walk's last season. */
  entrants(lastSeason: number): CareerEntrant[];
  /** P(credited again in Y+2 | credited in Y and on no team in any week of Y+1), as counts by Y (every man). */
  comebacks(firstSeason: number, lastSeason: number): { season: number; out: number; back: number }[];
  counts(): { FILE: number; DRAFT: number; UDFA: number; relabeled: number; fileRookies: number };
  route(id: string): EntryRoute | undefined;
  /** The draft and round of one of the walk's own draftees. */
  draftOf(id: string): { year: number; round: number } | undefined;
  /** His first season in the league (see `LedgerEntry.firstSeason`), if known. */
  firstSeasonOf(id: string): number | undefined;
  /** Everything it holds, as plain JSON (a checkpoint between seasons), and back. */
  save(): LedgerState;
  restore(state: LedgerState): void;
}

export function careerLedger(): CareerLedger {
  let entries = new Map<string, LedgerEntry>();
  let started = false;
  /** His entry, made the first time he is seen; a prospect has none (his class decides for him). */
  const entryOf = (p: PlayerState, route?: EntryRoute): LedgerEntry | undefined => {
    const id = String(p.bio.id);
    const had = entries.get(id);
    if (had !== undefined) return had;
    if (p.bio.draft === "PROSPECT") return undefined;
    const r: EntryRoute = route ?? (p.bio.draft === "UDFA" ? "UDFA" : "DRAFT");
    const entry: LedgerEntry = {
      route: r, origin: p.bio.position, relabeled: false, creditedAtStart: p.bio.creditedSeasons ?? 0, credited: [], present: new Set(),
      ...(r === "DRAFT" && typeof p.bio.draft === "object" ? { draft: { year: p.bio.draft.year, round: p.bio.draft.round } } : {}),
    };
    entries.set(id, entry);
    return entry;
  };
  return {
    start(players, season) {
      if (started) return;
      started = true;
      for (const p of players) {
        const entry = entryOf(p, "FILE");
        if (entry !== undefined && season !== undefined) entry.firstSeason = season - entry.creditedAtStart;
      }
    },
    present(season, players) {
      for (const p of players) {
        if (p.teamId === undefined) continue;
        const entry = entryOf(p);
        if (entry === undefined) continue;
        entry.present.add(season);
        if (entry.route !== "FILE") entry.firstSeason ??= season;
      }
    },
    season(season, before, after, events, finalPositions) {
      const was = new Map(before.map((p) => [String(p.bio.id), p]));
      const credited: string[] = [];
      const relabeled: string[] = [];
      for (const p of after) {
        const id = String(p.bio.id);
        const entry = entryOf(p);
        if (entry === undefined) continue;
        const prior = was.get(id);
        // On a team after the year turn (a draftee, an undrafted man signed after the draft): next
        // season is his first.
        if (p.teamId !== undefined && entry.route !== "FILE") entry.firstSeason ??= season + 1;
        // A credited season is the rise in his count over the season (the draft-order day hands them
        // out); a man the season did not start with joined after that day (the draft follows it).
        if (prior !== undefined && (p.bio.creditedSeasons ?? 0) > (prior.bio.creditedSeasons ?? 0)) {
          if (entry.credited.length === 0 && entry.creditedAtStart === 0) entry.entryGroup = CAREER_GROUP[finalPositions?.get(id) ?? p.bio.position];
          entry.credited.push(season);
          credited.push(id);
        }
        if (!entry.relabeled && p.bio.position !== entry.origin) { entry.relabeled = true; relabeled.push(id); }
      }
      for (const e of events) {
        if (e.type !== "PLAYER_RETIRED") continue;
        const entry = entries.get(String(e.payload.player));
        if (entry !== undefined && entry.retired === undefined) entry.retired = { season, timing: e.payload.timing };
      }
      return { credited, relabeled };
    },
    entrants(lastSeason) {
      const out: CareerEntrant[] = [];
      for (const entry of entries.values()) {
        if (entry.route === "FILE" || entry.entryGroup === undefined) continue;
        out.push({
          e: entry.credited[0]!, g: entry.entryGroup, o: CAREER_GROUP[entry.origin], r: entry.route,
          n: entry.creditedAtStart + entry.credited.length, c: entry.present.has(lastSeason) ? 1 : 0, x: entry.relabeled ? 1 : 0,
          t: entry.retired?.timing ?? null,
        });
      }
      return out;
    },
    comebacks(firstSeason, lastSeason) {
      const out: { season: number; out: number; back: number }[] = [];
      for (let y = firstSeason; y + 2 <= lastSeason; y++) {
        let away = 0, back = 0;
        for (const entry of entries.values()) {
          if (!entry.credited.includes(y) || entry.present.has(y + 1)) continue;
          away++;
          if (entry.credited.includes(y + 2)) back++;
        }
        out.push({ season: y, out: away, back });
      }
      return out;
    },
    counts() {
      const c = { FILE: 0, DRAFT: 0, UDFA: 0, relabeled: 0, fileRookies: 0 };
      for (const e of entries.values()) {
        c[e.route]++;
        if (e.relabeled) c.relabeled++;
        if (e.route === "FILE" && e.creditedAtStart === 0) c.fileRookies++;
      }
      return c;
    },
    route: (id) => entries.get(id)?.route,
    draftOf: (id) => entries.get(id)?.draft,
    firstSeasonOf: (id) => entries.get(id)?.firstSeason,
    save: () => ({
      started,
      entries: [...entries].map(([id, e]) => [id, { ...e, credited: [...e.credited], present: [...e.present].sort((a, b) => a - b) }]),
    }),
    restore(state) {
      started = state.started;
      entries = new Map(state.entries.map(([id, e]) => [id, { ...e, credited: [...e.credited], present: new Set(e.present) }]));
    },
  };
}

/** A life table: by career length (credited seasons), how many left (`exits`) and how many were still going (`censored`). */
export interface LifeTable { readonly exits: number[]; readonly censored: number[] }

export function lifeTable(entrants: readonly Pick<CareerEntrant, "n" | "c">[]): LifeTable {
  const max = entrants.reduce((m, e) => Math.max(m, e.n), 0);
  const exits = Array.from({ length: max + 1 }, () => 0);
  const censored = Array.from({ length: max + 1 }, () => 0);
  for (const e of entrants) (e.c === 1 ? censored : exits)[e.n]!++;
  return { exits, censored };
}

/**
 * Kaplan-Meier on careers counted in whole seasons, read as the real side reads them
 * (`careers/measure.ts` `careerValues`, through the injury measure's `survival`). S(t) = P(career >
 * t) = the product over u <= t of (1 - exits at u / men at risk at u). The men at risk at u are
 * those whose career ended at u or later, and those still going whose count passed u: a man still
 * going with u seasons says only that his career is u or more, so he leaves the risk set before
 * the exits at u are read. Past the last man at risk S stays where it was. Expected career = the
 * mean restricted to `horizon` seasons, the sum of S(t) for t from 0 below `horizon` (= the real
 * side's sum of P(career >= k), k = 1..15); reach 5 = S(4) = P(career >= 5), reach 10 = S(9). Null
 * with nobody in the table.
 */
export function kaplanMeier(table: LifeTable, horizon = 15): {
  n: number; exits: number; survival: number[]; expected: number | null; reach5: number | null; reach10: number | null;
} {
  const exits = table.exits.reduce((a, b) => a + b, 0);
  const n = exits + table.censored.reduce((a, b) => a + b, 0);
  if (n === 0) return { n, exits, survival: [], expected: null, reach5: null, reach10: null };
  const survival: number[] = [];
  let s = 1, atRisk = n;
  for (let t = 0; t < Math.max(horizon, table.exits.length, 10); t++) {
    const d = table.exits[t] ?? 0;
    atRisk -= table.censored[t] ?? 0;
    if (atRisk > 0) s *= 1 - d / atRisk;
    survival.push(s);
    atRisk -= d;
  }
  return { n, exits, survival, expected: survival.slice(0, horizon).reduce((a, b) => a + b, 0), reach5: survival[4]!, reach10: survival[9]! };
}

// --- the rows ------------------------------------------------------------------------------------

/** The draft check's round bands. */
const band = (round: number) => (round <= 3 ? String(round) : "4-7");
const BANDS = ["1", "2", "3", "4-7"] as const;
const emptyBands = () => Object.fromEntries(BANDS.map((b) => [b, [0, 0]])) as Record<string, [number, number]>;

/** The positions a team's starting slots are read at, in this order, `STARTING[position]` deep (the draft check's starters). */
export const SLOT_POSITIONS: readonly Position[] = (Object.keys(STARTING) as Position[]).filter((p) => STARTING[p] > 0);

/**
 * Each team's starting slots at one moment, in team order then `SLOT_POSITIONS` order: the first
 * `STARTING[position]` men on the position's depth chart ("" for a slot nobody fills). Two leagues
 * read the same way can be set slot by slot against each other (the coach-style check).
 */
export function starterSlots(teams: readonly Pick<Team, "depthChart">[]): string[] {
  const out: string[] = [];
  for (const t of teams) {
    for (const pos of SLOT_POSITIONS) {
      const chart = t.depthChart[pos] ?? [];
      for (let i = 0; i < STARTING[pos]; i++) out.push(chart[i] === undefined ? "" : String(chart[i]));
    }
  }
  return out;
}

export interface SeasonRow {
  readonly season: number;
  /** The 53s at week 8 day 1; null if the walk never got there. */
  readonly week8: RosterPicture | null;
  /** Each team's starting slots at week 8 day 1 (`starterSlots`); empty if the walk never got there. */
  readonly slots: string[];
  /** League-file men still on a 53 at week 8. */
  readonly fileOn53: number;
  /** The walk's own draftees on a 53 at week 8, by round band: [started (in his position's first `STARTING`), on a 53]. */
  readonly draftWeek8: Record<string, [number, number]>;
  /** Regular-season wins by team, in the league's team order (a tie counts half). */
  readonly wins: number[];
  /** Population sd of `wins`. */
  readonly winSpread: number;
  /** Pearson r of `wins` against last season's; null in the first season. */
  readonly winR: number | null;
  /** The free-agent pool: at camp's first day, at week 8, after the year turn, and with any limbo swept in (switched on only). */
  readonly freeAgents: { readonly camp: number; readonly week8: number; readonly end: number; readonly afterSweep: number };
  /** Players in limbo after the season (before the sweep), and how many each team lost to it (league team order). */
  readonly limbo: number;
  readonly reserveLoss: number[];
  /** Free agents at each retirement moment by how long they had waited, and the season's unsigned retirements by timing and wait. */
  readonly unsigned: {
    readonly pool: { readonly camp: Record<WaitClass, number>; readonly seasonEnd: Record<WaitClass, number> };
    readonly retired: Record<string, Record<WaitClass, number>>;
  };
  /** One-year minimum deals by who signed them; every signing by step id. */
  readonly signings: { readonly emergency: number; readonly bargain: number; readonly yearTurn: number; readonly byStep: Record<string, number> };
  /** Men whose listed position was first found rewritten after this season. */
  readonly relabels: number;
  /** `INJURY_OCCURRED` this season, all and time-loss (a week or more), by age in the season. */
  readonly injuries: { readonly total: number; readonly timeLoss: number; readonly byAge: Record<string, number>; readonly timeLossByAge: Record<string, number> };
  /** Credited this season (the count's rise), on a 53 at week 18 day 7, and both. */
  readonly credited: { readonly credited: number; readonly week18: number; readonly both: number };
  /** Rookies the season's draft brought in: picks, and undrafted men signed. */
  readonly rookies: { readonly drafted: number; readonly undrafted: number };
  /** People in the league after the season. */
  readonly players: number;
  /**
   * The season's releases and veteran signings by age (`capMoveAges`). Ages are in the season, as
   * `injuries` reads them: the walk's league year (free agency, re-signings, cap cuts) comes after the
   * playoffs and before the year turn, so a man signed in it is a year younger here than in the season
   * he signs for.
   */
  readonly moves: CapMoveAges;
  /**
   * The coaches: teams whose sitting head coach after the season is not the one it started with (the
   * carousel), head coaches hired (`STAFF_HIRED`, head coach), and the sitting head coaches' leanings
   * at week 8 (null if the walk never got there).
   */
  readonly coaches: { readonly headCoachChanges: number; readonly headCoachHires: number; readonly week8: HeadCoachLeanings | null };
}

/** What the rows hold and the reader saves: a change to either starts a fresh version. */
export const CAREER_ROWS_VERSION = 4;

export interface CareerCheckRows {
  readonly version: typeof CAREER_ROWS_VERSION;
  readonly seed: string;
  readonly firstSeason: number;
  readonly seasons: number;
  readonly switches: { readonly development: boolean; readonly injuries: boolean };
  /** The league file as loaded (its 53s; ages as of the file's 23 October), the cross-check beside year 0. */
  readonly file: RosterPicture | null;
  /** One row a season; index 0 is year 0 (the walk's own first week-8 picture). */
  readonly perSeason: SeasonRow[];
  readonly careers: {
    readonly lastSeason: number;
    /** Every in-run entrant with a credited season: pool these across seeds into life tables. */
    readonly entrants: CareerEntrant[];
    /**
     * This seed's Kaplan-Meier by entry group (`g`), restricted mean to 15 seasons, a summary. The
     * grader reads the pooled entrants itself and carries the curve flat past the real side's
     * longest follow-up (13 seasons) before the mean, as the real side's curve is.
     */
    readonly byGroup: Record<CareerGroup, { n: number; exits: number; expected: number | null; reach5: number | null; reach10: number | null }>;
    readonly routes: { readonly FILE: number; readonly DRAFT: number; readonly UDFA: number };
    readonly relabeled: number;
    /** League-file men with no credited season at the start (left out of the cohorts, as every file man is). */
    readonly fileRookies: number;
    /** Entrants' exits that were unsigned retirements, and exits with none (still unsigned, or in limbo, at the end). */
    readonly exitsRetired: number;
    readonly exitsOther: number;
    readonly comebacks: { season: number; out: number; back: number }[];
  };
  readonly usage: {
    /** By group (no K, P, LS) and age in season Y: the change in snap share from Y to Y + 1, every pair of the walk. Pool across seeds by summing. */
    readonly cells: Record<string, Record<string, UsageCell>>;
    /** The same cells by the pair's first season Y (so a grader can take a window of years). */
    readonly bySeason: Record<string, Record<string, Record<string, UsageCell>>>;
    readonly peaks: Record<string, { readonly peak: number | null; readonly peakExit: number | null }>;
  };
  /** The walk's own draftees read at week 8 (D7 with the switches on): starter seasons, and ever a starter (drafts with 3+ seasons), [count, of]. */
  readonly draftWeek8: { readonly starterSeasons: Record<string, [number, number]>; readonly everStarter: Record<string, [number, number]> };
  /** The draft check's own rows (ADR-086 D7), read from the same walk. */
  readonly draft: DraftCheckResult;
}

export interface CareerReaderInput {
  readonly seed: string;
  readonly firstSeason: number;
  readonly seasons: number;
  readonly switches: { readonly development: boolean; readonly injuries: boolean };
}

/** One man's season of snaps as the usage pairs read it: share, group and age in that season. */
interface UsageSeason { share: number; group: CareerGroup; age: number }

/**
 * Everything the reader has written down, as plain JSON: what a checkpoint between seasons keeps
 * so a stopped walk can carry on. Taken only between seasons (after a season's `onRun`, before the
 * next season's first day), when nothing of a season is half read.
 */
export interface CareerReaderState {
  readonly version: typeof CAREER_ROWS_VERSION;
  readonly ledger: LedgerState;
  readonly rows: SeasonRow[];
  readonly file: RosterPicture | null;
  readonly dayNumber: [string, number][];
  readonly days: number;
  readonly yearDays: number;
  readonly lastWins: number[] | null;
  readonly ever: [string, boolean][];
  readonly usageCells: Record<string, Record<string, UsageCell>>;
  readonly usageBySeason: Record<string, Record<string, Record<string, UsageCell>>>;
  readonly lastShares: [string, UsageSeason][];
}

/** The reader's watchers and what they wrote down; `rows` takes the draft check's rows to put beside its own. */
export interface CareerReader {
  readonly onDay: NonNullable<CapCheckInput["onDay"]>;
  readonly onRun: (season: number, events: readonly FranchiseEvent[], people: SeasonPeople, more: CapCheckRun) => void;
  rows(draft: DraftCheckResult): CareerCheckRows;
  /** Its state between seasons, as plain JSON; throws if a season is half read. */
  save(): CareerReaderState;
  /** Carry on from a saved state (a fresh reader, between seasons). */
  restore(state: CareerReaderState): void;
}

/** What one season's days wrote down, until its `onRun`. */
interface SeasonTally {
  touched: boolean;
  week8: RosterPicture | null;
  slots: string[];
  fileOn53: number;
  draftWeek8: Record<string, [number, number]>;
  faCamp: number;
  faWeek8: number;
  /** Each retirement moment's free agents and their waits in days, by the day's stamp. */
  waits: Map<string, Map<string, number | undefined>>;
  /** Men on a 53 on the regular season's last day, with their position then. */
  week18: Map<string, Position>;
  snaps: Map<string, Map<string, SideSnaps>>;
  busiest: Map<string, BusiestSnaps>;
  /** Each man's group at each read on a team's list (day 1 of each regular-season week), in order. */
  groupReads: Map<string, CareerGroup[]>;
  /** Each man's age in the season (any read during it; ages move only at the year turn). */
  ages: Map<string, number>;
  /** Each man's position at his last regular-season game (his group when he was never read on a list). */
  lastSeen: Map<string, Position>;
  /** The sitting head coaches' leanings at week 8. */
  leanings: HeadCoachLeanings | null;
}

const newTally = (): SeasonTally => ({
  touched: false, week8: null, slots: [], fileOn53: 0, draftWeek8: emptyBands(), faCamp: 0, faWeek8: 0, waits: new Map(),
  week18: new Map(), snaps: new Map(), busiest: new Map(), groupReads: new Map(), ages: new Map(), lastSeen: new Map(), leanings: null,
});

/** The D5b reader: watchers for the cap check's walk and the rows they add up to. */
export function careerReader(input: CareerReaderInput): CareerReader {
  const ledger = careerLedger();
  let rows: SeasonRow[] = [];
  let file: RosterPicture | null = null;
  let tally = newTally();
  // Day numbers, counted by the days the walk passes, for how long a man has been unsigned.
  let dayNumber = new Map<string, number>();
  let days = 0;
  /** A league year's days: the first season's count, known at its end. */
  let yearDays = 0;
  let lastWins: number[] | undefined;
  /** The walk's own draftees seen on a 53 at week 8: did he ever start there. */
  let ever = new Map<string, boolean>();
  let usageCells: Record<string, Record<string, UsageCell>> = {};
  let usageBySeason: Record<string, Record<string, Record<string, UsageCell>>> = {};
  let lastShares = new Map<string, UsageSeason>();
  const switched = input.switches.development || input.switches.injuries;

  const readWeek8 = (season: number, people: SeasonPeople) => {
    tally.week8 = rosterPicture(people, { season, firstSeasonOf: (id) => ledger.firstSeasonOf(id) });
    tally.slots = starterSlots(people.teams);
    tally.faWeek8 = people.freeAgents.length;
    tally.leanings = headCoachLeanings(people.staff, people.teams);
    const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
    for (const t of people.teams) {
      for (const id of t.roster) {
        const p = byId.get(String(id));
        if (p === undefined) continue;
        if (ledger.route(String(id)) === "FILE") tally.fileOn53++;
        const draft = ledger.draftOf(String(id));
        if (draft === undefined) continue;
        const started = (t.depthChart[p.bio.position] ?? []).slice(0, STARTING[p.bio.position]).some((x) => String(x) === String(id));
        const cell = tally.draftWeek8[band(draft.round)]!;
        cell[1]++;
        if (started) cell[0]++;
        ever.set(String(id), started || (ever.get(String(id)) ?? false));
      }
    }
  };

  const readGames = (people: SeasonPeople, games: CapCheckDayGames) => {
    const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
    for (const g of games) {
      const report = (g.extras as { participation?: readonly GameParticipation[] } | undefined)?.participation;
      if (!Array.isArray(report)) continue;
      addGame(g.game, report, tally.snaps, tally.busiest);
      for (const r of report) {
        const p = byId.get(String(r.player));
        if (p === undefined || r.snaps.offense + r.snaps.defense + (r.snaps.special ?? 0) === 0) continue;
        tally.lastSeen.set(String(r.player), p.bio.position);
        if (!tally.ages.has(String(r.player))) tally.ages.set(String(r.player), p.bio.age);
      }
    }
  };

  const onDay: CareerReader["onDay"] = (season, day, people, games) => {
    tally.touched = true;
    const today = days++;
    dayNumber.set(stampToString(day), today);
    if (today === 0) {
      // The first day of the walk: the people it starts with, the league file as loaded.
      file = rosterPicture(people);
      ledger.start(people.players, season);
    }
    const waitsToday = () => tally.waits.set(stampToString(day), unsignedWaits(people, today, (s) => dayNumber.get(stampToString(s))));
    if (isDay(day, CAMP_OPENS)) { tally.faCamp = people.freeAgents.length; waitsToday(); }
    if (day.phase === "REGULAR_SEASON" && day.day === 1) {
      ledger.present(season, people.players);
      for (const p of people.players) {
        if (p.teamId === undefined) continue;
        const id = String(p.bio.id);
        const reads = tally.groupReads.get(id);
        if (reads === undefined) tally.groupReads.set(id, [CAREER_GROUP[p.bio.position]]);
        else reads.push(CAREER_GROUP[p.bio.position]);
        if (!tally.ages.has(id)) tally.ages.set(id, p.bio.age);
      }
    }
    if (isDay(day, WEEK_8)) readWeek8(season, people);
    if (isDay(day, SEASON_ENDS)) {
      waitsToday();
      const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
      for (const t of people.teams) {
        for (const id of t.roster) {
          const p = byId.get(String(id));
          if (p !== undefined) tally.week18.set(String(id), p.bio.position);
        }
      }
    }
    const regular = games.filter((g) => g.game.kind === "REGULAR");
    if (regular.length > 0) readGames(people, regular);
  };

  const onRun: CareerReader["onRun"] = (season, events, people, { run, before }) => {
    if (yearDays === 0) yearDays = days;
    const teams = before.teams;
    // Wins, and how they carry from last season.
    const winsBy = new Map(run.state.standings.map((r) => [String(r.team), r.overall.wins + 0.5 * r.overall.ties]));
    const wins = teams.map((t) => winsBy.get(String(t.id)) ?? 0);
    const winR = lastWins === undefined ? null : pearson(lastWins, wins);
    lastWins = wins;
    // The ledger, and the credited seasons against week 18's 53s.
    const { credited, relabeled } = ledger.season(season, before.players, people.players, events, tally.week18);
    const both = credited.filter((id) => tally.week18.has(id)).length;
    // The free agents' waits at the two moments, and the retirements on those days.
    const pool = (d: DayOfYear) => {
      const into = emptyWaits();
      for (const w of tally.waits.get(stampToString({ season, ...d }))?.values() ?? []) into[waitClass(w, yearDays)]++;
      return into;
    };
    const retired: Record<string, Record<WaitClass, number>> = {};
    for (const e of run.events) {
      if (e.event.type !== "PLAYER_RETIRED") continue;
      const into = (retired[e.event.payload.timing] ??= emptyWaits());
      const waits = tally.waits.get(stampToString(e.at));
      into[waits === undefined ? "unknown" : waitClass(waits.get(String(e.event.payload.player)), yearDays)]++;
    }
    // Signings, limbo, injuries by age in the season, the draft's rookies.
    const signings = minimumSignings(run);
    const loss = reserveLoss(before, people, teams);
    const ageIn = new Map(before.players.map((p) => [String(p.bio.id), p.bio.age]));
    for (const p of people.players) if (!ageIn.has(String(p.bio.id))) ageIn.set(String(p.bio.id), seasonAge(p.bio.age, true));
    const injuries = { total: 0, timeLoss: 0, byAge: {} as Record<string, number>, timeLossByAge: {} as Record<string, number> };
    for (const e of events) {
      if (e.type !== "INJURY_OCCURRED") continue;
      const age = String(ageIn.get(String(e.payload.player)) ?? "?");
      injuries.total++;
      bump(injuries.byAge, age);
      if (e.payload.band !== "DAY_TO_DAY") { injuries.timeLoss++; bump(injuries.timeLossByAge, age); }
    }
    const started = new Set(before.players.map((p) => String(p.bio.id)));
    const joined = people.players.filter((p) => !started.has(String(p.bio.id)));
    // The cap's moves by age (own team and new team as the cap check tells them), and the head coaches.
    const moves = capMoveAges(run, lastTeams(before.contracts ?? []), (id) => ageIn.get(id));
    const headCoachHires = events.filter((e) => e.type === "STAFF_HIRED" && e.payload.role === "HEAD_COACH").length;
    // Usage: this season's shares (every man with a snap of any kind, his group and age this season),
    // and the change from last season's (specialists left out by their group last season).
    const now = new Map<string, UsageSeason>();
    for (const [id, s] of snapShares(tally.snaps, tally.busiest)) {
      const group = modalGroup(tally.groupReads.get(id) ?? []) ?? (tally.lastSeen.has(id) ? CAREER_GROUP[tally.lastSeen.get(id)!] : undefined);
      const age = tally.ages.get(id);
      if (group === undefined || age === undefined) continue;
      now.set(id, { share: s.share, group, age });
    }
    if (rows.length > 0) {
      const pairs: Record<string, Record<string, UsageCell>> = {};
      addUsage(pairs, lastShares, now);
      usageBySeason[String(season - 1)] = pairs;
      for (const [g, cells] of Object.entries(pairs)) addCells((usageCells[g] ??= {}), cells);
    }
    lastShares = now;
    rows.push({
      season,
      week8: tally.week8,
      slots: tally.slots,
      fileOn53: tally.fileOn53,
      draftWeek8: tally.draftWeek8,
      wins, winSpread: sd(wins), winR,
      freeAgents: { camp: tally.faCamp, week8: tally.faWeek8, end: people.freeAgents.length, afterSweep: people.freeAgents.length + (switched ? loss.limbo : 0) },
      limbo: loss.limbo,
      reserveLoss: loss.byTeam,
      unsigned: { pool: { camp: pool(CAMP_OPENS), seasonEnd: pool(SEASON_ENDS) }, retired },
      signings,
      relabels: relabeled.length,
      injuries,
      credited: { credited: credited.length, week18: tally.week18.size, both },
      rookies: {
        drafted: joined.filter((p) => typeof p.bio.draft === "object").length,
        undrafted: joined.filter((p) => p.bio.draft === "UDFA").length,
      },
      players: people.players.length,
      moves,
      coaches: { headCoachChanges: headCoachChanges(before.staff, people.staff, teams), headCoachHires, week8: tally.leanings },
    });
    tally = newTally();
  };

  const rowsOf = (draft: DraftCheckResult): CareerCheckRows => {
    const lastSeason = input.firstSeason + input.seasons - 1;
    const entrants = ledger.entrants(lastSeason);
    const byGroup = {} as CareerCheckRows["careers"]["byGroup"];
    for (const g of CAREER_GROUPS) {
      const km = kaplanMeier(lifeTable(entrants.filter((e) => e.g === g)));
      byGroup[g] = { n: km.n, exits: km.exits, expected: km.expected, reach5: km.reach5, reach10: km.reach10 };
    }
    const counts = ledger.counts();
    const byAge = (m: Record<string, UsageCell> | undefined) => Object.fromEntries(Object.entries(m ?? {}).sort((a, b) => Number(a[0]) - Number(b[0])));
    const cells: Record<string, Record<string, UsageCell>> = {};
    const peaks: Record<string, { peak: number | null; peakExit: number | null }> = {};
    for (const g of CAREER_GROUPS) {
      if (SPECIALIST_GROUPS.has(g)) continue;
      cells[g] = byAge(usageCells[g]);
      peaks[g] = { peak: usagePeak(cells[g]).peak, peakExit: usagePeak(cells[g], true).peak };
    }
    const bySeason: Record<string, Record<string, Record<string, UsageCell>>> = {};
    for (const y of Object.keys(usageBySeason).sort()) {
      bySeason[y] = {};
      for (const g of CAREER_GROUPS) if (!SPECIALIST_GROUPS.has(g)) bySeason[y]![g] = byAge(usageBySeason[y]![g]);
    }
    const starterSeasons = emptyBands();
    for (const r of rows) for (const b of BANDS) { starterSeasons[b]![0] += r.draftWeek8[b]![0]; starterSeasons[b]![1] += r.draftWeek8[b]![1]; }
    const everStarter = emptyBands();
    for (const [id, started] of ever) {
      const d = ledger.draftOf(id)!;
      if (lastSeason - d.year + 1 < 3) continue;
      const cell = everStarter[band(d.round)]!;
      cell[1]++;
      if (started) cell[0]++;
    }
    return {
      version: CAREER_ROWS_VERSION,
      seed: input.seed,
      firstSeason: input.firstSeason,
      seasons: input.seasons,
      switches: input.switches,
      file,
      perSeason: rows,
      careers: {
        lastSeason,
        entrants,
        byGroup,
        routes: { FILE: counts.FILE, DRAFT: counts.DRAFT, UDFA: counts.UDFA },
        relabeled: counts.relabeled,
        fileRookies: counts.fileRookies,
        exitsRetired: entrants.filter((e) => e.c === 0 && e.t !== null).length,
        exitsOther: entrants.filter((e) => e.c === 0 && e.t === null).length,
        comebacks: ledger.comebacks(input.firstSeason, lastSeason),
      },
      usage: { cells, bySeason, peaks },
      draftWeek8: { starterSeasons, everStarter },
      draft,
    };
  };

  const save = (): CareerReaderState => {
    if (tally.touched) throw new Error("career check: the reader is saved between seasons only, and a season is half read");
    return JSON.parse(JSON.stringify({
      version: CAREER_ROWS_VERSION,
      ledger: ledger.save(),
      rows,
      file,
      dayNumber: [...dayNumber],
      days,
      yearDays,
      lastWins: lastWins ?? null,
      ever: [...ever],
      usageCells,
      usageBySeason,
      lastShares: [...lastShares],
    })) as CareerReaderState;
  };

  const restore = (state: CareerReaderState): void => {
    if (state.version !== CAREER_ROWS_VERSION) throw new Error(`career check: a saved reader of version ${String(state.version)}, not ${CAREER_ROWS_VERSION}`);
    if (tally.touched || days !== 0) throw new Error("career check: a reader is restored fresh, before any day");
    const copy = JSON.parse(JSON.stringify(state)) as CareerReaderState;
    ledger.restore(copy.ledger);
    rows = copy.rows;
    file = copy.file;
    dayNumber = new Map(copy.dayNumber);
    days = copy.days;
    yearDays = copy.yearDays;
    lastWins = copy.lastWins ?? undefined;
    ever = new Map(copy.ever);
    usageCells = copy.usageCells;
    usageBySeason = copy.usageBySeason;
    lastShares = new Map(copy.lastShares);
  };

  return { onDay, onRun, rows: rowsOf, save, restore };
}

/** What `runCareerCheck` returns: the D5b rows, with the D7 rows of the same walk in `draft`. */
export type CareerCheckResult = CareerCheckRows;

/**
 * Where a stopped walk stands between seasons: the seasons played, the people the next season
 * starts from (after the limbo sweep), and both readers' states. The people are the walk's own
 * objects (Sets inside); a caller that keeps a checkpoint on disk encodes them
 * (`careerCheckRun.ts`).
 */
export interface CareerCheckpoint {
  readonly seasonsDone: number;
  readonly people: SeasonPeople;
  readonly reader: CareerReaderState;
  readonly draft: DraftReaderState;
}

/** Resuming and checkpointing a walk: where to start from, and what to call after each season. */
export interface CareerCheckOptions {
  /** Carry on from a checkpoint (the same input as the walk that took it). */
  readonly resume?: CareerCheckpoint;
  /** After each season, once the next season's people are settled: a checkpoint to keep. It may throw to stop the walk. */
  readonly onCheckpoint?: (checkpoint: CareerCheckpoint) => void;
}

/**
 * One seed of the 20-season check: the cap check's walk (`runCapCheck`) with the D5b reader and the
 * draft check's reader (`draftReader`) watching the same walk. The walk takes the input as given
 * (seed, league file, seasons, switches, staff transform, caller, `onYear`); only the watchers are
 * this check's. Same input, same rows; a walk resumed from a checkpoint gives the rows the unbroken
 * walk gives.
 */
export function runCareerCheck(input: Omit<CapCheckInput, "onRun" | "onDay" | "onEvent" | "resume" | "onSeasonEnd">, options: CareerCheckOptions = {}): CareerCheckResult {
  const reader = careerReader({
    seed: input.seed, firstSeason: input.file.season, seasons: input.seasons,
    switches: { development: input.players?.development === true, injuries: input.players?.injuries === true },
  });
  const draft = draftReader();
  const { resume, onCheckpoint } = options;
  if (resume !== undefined) {
    reader.restore(resume.reader);
    draft.restore(resume.draft);
  }
  runCapCheck({
    ...input,
    ...(resume === undefined ? {} : { resume: { seasonsDone: resume.seasonsDone, people: resume.people } }),
    onDay: reader.onDay,
    onRun: (season, events, people, more) => {
      draft.onRun(season, events, people);
      reader.onRun(season, events, people, more);
    },
    ...(onCheckpoint === undefined ? {} : {
      onSeasonEnd: (season: number, people: SeasonPeople) =>
        onCheckpoint({ seasonsDone: season - input.file.season + 1, people, reader: reader.save(), draft: draft.save() }),
    }),
  });
  return reader.rows(draft.result());
}
