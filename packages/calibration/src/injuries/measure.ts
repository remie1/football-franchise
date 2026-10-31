/**
 * Real NFL injury numbers from nflverse's public tables (ADR-087 §5.1, build step E): how many
 * time-loss injuries a team has per game, how long they last, what gets hurt by position, how
 * often a listed player plays through, what the reports can say about practice injuries, and how
 * many players go on injured reserve.
 *
 * Pure: timelines in (`timeline.ts`), a `Summary` per season set out. Every count's definition is
 * on its field; `report.ts` repeats them with their limits.
 */

import { POSITION_GROUPS, type BodyPart, type PositionGroup } from "./classify.js";
import { endedSeasonHurt, episodesOf, spellsOf, type Episode, type Spell } from "./spells.js";
import type { TeamSeason, Timeline, Timelines } from "./timeline.js";

/** Band edges, as ADR-087 §5.3 defines them: SHORT 1-3, LONG 4-8, MAJOR 9+ (games here, or weeks). */
export const LONG_FROM = 4;
export const MAJOR_FROM = 9;
/** Longest duration the survival curve is reported to. */
export const SURVIVAL_TO = 18;

export interface BandShares {
  /** 1-3 games (or weeks). */
  readonly short: number;
  /** 4-8. */
  readonly long: number;
  /** 9 or more. */
  readonly major: number;
}

/** One duration: exact when not censored, a lower bound (D ≥ length) when censored. */
export interface Duration {
  readonly length: number;
  readonly censored: boolean;
}

/**
 * Kaplan-Meier for discrete durations of at least 1: `s[k]` = P(D ≥ k) for k = 1..`to`
 * (`s[0]` = 1). A censored length c says only D ≥ c, so it counts as a survivor at every t < c and
 * drops out at c, where whether he came back is unknown. Censoring here is the season's end or
 * the player leaving the team, which have nothing to do with how bad the injury is (the method's
 * assumption; a team cutting an injured player is the exception).
 */
export function survival(durations: readonly Duration[], to: number = SURVIVAL_TO): number[] {
  const s: number[] = [1, 1];
  let surv = 1;
  for (let t = 1; t < to; t++) {
    let atRisk = 0;
    let ended = 0;
    for (const d of durations) {
      if (d.censored) {
        if (d.length > t) atRisk++;
      } else if (d.length >= t) {
        atRisk++;
        if (d.length === t) ended++;
      }
    }
    if (atRisk > 0) surv *= 1 - ended / atRisk;
    s.push(surv);
  }
  return s;
}

/** Band shares from a survival curve (every duration is at least 1). */
export function bandsFromSurvival(s: readonly number[]): BandShares {
  const at = (k: number): number => s[k] ?? s[s.length - 1] ?? 0;
  return { short: 1 - at(LONG_FROM), long: at(LONG_FROM) - at(MAJOR_FROM), major: at(MAJOR_FROM) };
}

/** Band shares treating every censored length as if it were exact (a floor on the long bands). */
export function naiveBands(durations: readonly Duration[]): BandShares {
  const n = durations.length;
  if (n === 0) return { short: 0, long: 0, major: 0 };
  let long = 0;
  let major = 0;
  for (const d of durations) {
    if (d.length >= MAJOR_FROM) major++;
    else if (d.length >= LONG_FROM) long++;
  }
  return { short: (n - long - major) / n, long: long / n, major: major / n };
}

/** The smallest k with P(D > k) ≤ 1/2 from the curve; null when the curve never gets there. */
export function medianFromSurvival(s: readonly number[]): number | null {
  for (let k = 1; k + 1 < s.length; k++) if (s[k + 1]! <= 0.5) return k;
  return null;
}

export interface DurationSummary {
  readonly n: number;
  readonly censored: number;
  readonly games: { readonly bands: BandShares; readonly naive: BandShares; readonly median: number | null; readonly survival: readonly number[] };
  readonly weeks: { readonly bands: BandShares; readonly naive: BandShares; readonly median: number | null; readonly survival: readonly number[] };
}

export function durationSummary(spells: readonly Spell[]): DurationSummary {
  const games = spells.map((s) => ({ length: s.gamesMissed, censored: s.censored }));
  const weeks = spells.map((s) => ({ length: s.weeksOut, censored: s.censored }));
  const sg = survival(games);
  const sw = survival(weeks);
  return {
    n: spells.length,
    censored: spells.filter((s) => s.censored).length,
    games: { bands: bandsFromSurvival(sg), naive: naiveBands(games), median: medianFromSurvival(sg), survival: sg.slice(1).map((x) => round(x, 4)) },
    weeks: { bands: bandsFromSurvival(sw), naive: naiveBands(weeks), median: medianFromSurvival(sw), survival: sw.slice(1).map((x) => round(x, 4)) },
  };
}

export interface PartCount {
  readonly part: BodyPart;
  readonly count: number;
  /** Share of all the spells counted, unknown included. */
  readonly share: number;
}

export interface GroupSummary {
  readonly group: PositionGroup;
  /** New in-season time-loss football injuries (onset AFTER_PLAYED or AFTER_NOT_PLAYED). */
  readonly newTimeLoss: number;
  /** Of those, the ones whose player played the game before. */
  readonly afterPlayed: number;
  /** Games he took a snap in that had a next team game (the exposure an onset can follow). */
  readonly playerGames: number;
  readonly snaps: number;
  /** newTimeLoss / playerGames. */
  readonly perPlayerGame: number;
  /** newTimeLoss / the league's team-game intervals: this group's injuries per team per game. */
  readonly perTeamGame: number;
  /** afterPlayed per 1,000 snaps played. */
  readonly per1000Snaps: number;
  readonly durations: DurationSummary;
  /** Of this group's new in-season designated episodes, the share that never cost a game. */
  readonly dayToDayShare: number;
  readonly bodyParts: readonly PartCount[];
}

export interface Ratio {
  readonly n: number;
  readonly yes: number;
  readonly share: number;
}

export interface Summary {
  readonly seasons: readonly number[];
  readonly teamSeasons: number;
  readonly teamGames: number;
  /**
   * Team games followed by another team game in the same regular season: the gaps a new injury can
   * show up in (its first missed game is the next one). Each team-season has games − 1.
   */
  readonly teamIntervals: number;
  readonly timeLoss: {
    /** New in-season time-loss football injuries: onset AFTER_PLAYED or AFTER_NOT_PLAYED, class FOOTBALL. */
    readonly newFootball: number;
    readonly perTeamGame: number;
    readonly perTeamSeason: number;
    readonly byOnset: { readonly afterPlayed: number; readonly afterNotPlayed: number; readonly beforeSeason: number; readonly unclear: number };
    /** New in-season spells listed as illness (an away-from-football cause). */
    readonly illness: number;
    /** New in-season spells on the non-football-injury list. */
    readonly nfi: number;
    /** (newFootball + illness + nfi) / teamIntervals. */
    readonly perTeamGameAllCauses: number;
    /** New in-season football spells whose first missed game was already on a reserve list (IR/PUP). */
    readonly straightToReserve: number;
  };
  readonly durations: DurationSummary;
  readonly groups: readonly GroupSummary[];
  readonly bodyParts: readonly (PartCount & { readonly long: number; readonly major: number })[];
  readonly playThrough: {
    /** Player-weeks on the 53 listed Questionable with a football injury: share who took a snap. */
    readonly questionable: Ratio;
    readonly doubtful: Ratio;
    readonly out: Ratio;
    /** Questionable the first week of an episode (not listed the game before). */
    readonly newlyQuestionable: Ratio;
    /** Listed with a practice limit and no game designation. */
    readonly limitedNoDesignation: Ratio;
    readonly dnpNoDesignation: Ratio;
  };
  readonly episodes: {
    /** New in-season listing episodes (onset AFTER_*), any listing (designation or practice limit). */
    readonly newAny: number;
    readonly dayToDayAny: number;
    readonly dayToDayShareAny: number;
    /** The same, for episodes with a game designation or a missed game. */
    readonly newDesignated: number;
    readonly dayToDayDesignated: number;
    readonly dayToDayShareDesignated: number;
    readonly dayToDayDesignatedPerTeamGame: number;
  };
  /**
   * Every new in-season injury that got a game designation, by band: DAY_TO_DAY is the designated
   * episodes that never cost a game; the rest split by the time-loss survival curve (games).
   */
  readonly allBands: { readonly dayToDay: number; readonly short: number; readonly long: number; readonly major: number };
  readonly practiceHints: {
    /** Healthy-on-the-53 game weeks with a next game, split by whether he played. */
    readonly playedIntervals: number;
    readonly notPlayedIntervals: number;
    /** AFTER_PLAYED time-loss onsets / playedIntervals. */
    readonly afterPlayedRate: number;
    /** AFTER_NOT_PLAYED time-loss onsets / notPlayedIntervals: a non-game (practice or away) rate. */
    readonly afterNotPlayedRate: number;
    /** afterNotPlayedRate × all healthy intervals / all new onsets: the non-game share if that rate applied to everyone. */
    readonly impliedNonGameShare: number;
    /**
     * New listings (any episode, day-to-day included) of players healthy on the 53 who did not
     * play the game before: per team-season, and how many of them did not practise on the first
     * week's final report. These are injuries from practice or away from football.
     */
    readonly listingsAfterNotPlayedPerTeamSeason: number;
    readonly listingsAfterNotPlayedDnp: number;
    /** The same contrast for any new listing (episodes, day-to-day included). */
    readonly episodeAfterPlayedRate: number;
    readonly episodeAfterNotPlayedRate: number;
    readonly episodeImpliedNonGameShare: number;
    /** Players out for a football injury at their team's first game, per team-season. */
    readonly outAtWeek1PerTeamSeason: number;
    /** Of those: still out from the end of last season / not (new: camp, preseason, offseason) / no lookback season. */
    readonly outAtWeek1CarriedOver: number;
    readonly outAtWeek1New: number;
    readonly outAtWeek1Unknown: number;
    readonly outAtWeek1ByKind: Readonly<Record<string, number>>;
    /** New listing episodes at week 1 (not carried over), per team-season, against in-season new episodes per team interval. */
    readonly week1NewEpisodesPerTeamSeason: number;
    readonly inSeasonNewEpisodesPerTeamInterval: number;
    /** Time-loss onsets per team interval, for intervals that span a bye and for the rest. */
    readonly postBye: { readonly intervals: number; readonly onsets: number; readonly rate: number; readonly otherIntervals: number; readonly otherOnsets: number; readonly otherRate: number };
    /**
     * A bye-week estimate of in-season practice (and away) injuries per team interval:
     * `postBye.rate − h × postBye.otherRate`, h = P(out 2+ weeks | out 1+ week) from the weeks
     * curve. It assumes a bye interval holds one game and two practice weeks, that a game (or
     * first-week practice) injury must last 2+ weeks to cost the next game across a bye, and that
     * practice and game injuries last alike. Bye weeks practise lighter than game weeks.
     */
    readonly byeModel: {
      readonly h: number;
      readonly practicePerTeamInterval: number;
      /** One standard error of that, from Poisson counts (h taken as known). */
      readonly practicePerTeamIntervalSe: number;
      readonly practiceShare: number;
    };
  };
  readonly reserve: {
    /**
     * New injured-reserve placements per team-season seen in the weekly rosters: in season (a game
     * 2..N week on IR after a week not on IR, PUP or NFI, so list transfers do not count), and on IR
     * at the team's first game.
     */
    readonly irInSeasonPerTeamSeason: number;
    readonly irAtWeek1PerTeamSeason: number;
    /** The fewest and most in-season placements of any one team-season. */
    readonly irInSeasonMin: number;
    readonly irInSeasonMax: number;
    readonly pupAtWeek1PerTeamSeason: number;
    readonly nfiAtWeek1PerTeamSeason: number;
    readonly nfiInSeasonPerTeamSeason: number;
    readonly illnessPerTeamSeason: number;
    /** Distinct players per team-season with a football spell of 4+ games missed (observed): new in-season ones, and all (week-1 and unclear onsets included). */
    readonly missing4PlusGamesNew: number;
    readonly missing4PlusGamesAll: number;
    readonly missing4PlusWeeksAll: number;
  };
}

/** Rates and shares are kept to 6 decimals so the JSON is stable and readable. */
export function round(x: number, places = 6): number {
  if (!Number.isFinite(x)) return 0;
  const f = 10 ** places;
  return Math.round(x * f) / f;
}

const div = (a: number, b: number): number => (b === 0 ? 0 : a / b);
const ratio = (n: number, yes: number): Ratio => ({ n, yes, share: round(div(yes, n)) });
const roundBands = (b: BandShares): BandShares => ({ short: round(b.short), long: round(b.long), major: round(b.major) });

function roundDurations(d: DurationSummary): DurationSummary {
  return {
    n: d.n, censored: d.censored,
    games: { ...d.games, bands: roundBands(d.games.bands), naive: roundBands(d.games.naive) },
    weeks: { ...d.weeks, bands: roundBands(d.weeks.bands), naive: roundBands(d.weeks.naive) },
  };
}

function partCounts(spells: readonly Spell[]): PartCount[] {
  const counts = new Map<BodyPart, number>();
  for (const s of spells) counts.set(s.bodyPart, (counts.get(s.bodyPart) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([part, count]) => ({ part, count, share: round(div(count, spells.length)) }));
}

const isNew = (onset: Spell["onset"]): boolean => onset === "AFTER_PLAYED" || onset === "AFTER_NOT_PLAYED";

/** Everything the measurement needs, read off the timelines once. */
export interface Derived {
  readonly teamSeasons: readonly TeamSeason[];
  readonly timelines: readonly Timeline[];
  readonly spells: readonly Spell[];
  readonly episodes: readonly Episode[];
  /** `season|gsis` → ended that season out injured (see `endedSeasonHurt`). */
  readonly endedHurt: ReadonlyMap<string, boolean>;
  readonly seasonsLoaded: ReadonlySet<number>;
}

export function derive(t: Timelines): Derived {
  return {
    teamSeasons: t.teamSeasons,
    timelines: t.timelines,
    spells: t.timelines.flatMap(spellsOf),
    episodes: t.timelines.flatMap(episodesOf),
    endedHurt: endedSeasonHurt(t.timelines),
    seasonsLoaded: new Set(t.teamSeasons.map((ts) => ts.season)),
  };
}

/** The measurement over one set of seasons. */
export function summarise(d: Derived, seasons: readonly number[]): Summary {
  const inSet = new Set(seasons);
  const teamSeasons = d.teamSeasons.filter((ts) => inSet.has(ts.season));
  const timelines = d.timelines.filter((t) => inSet.has(t.season));
  const spells = d.spells.filter((s) => inSet.has(s.season));
  const episodes = d.episodes.filter((e) => inSet.has(e.season));
  const nTeamSeasons = teamSeasons.length;
  const teamGames = teamSeasons.reduce((a, ts) => a + ts.weeks.length, 0);
  const teamIntervals = teamSeasons.reduce((a, ts) => a + Math.max(0, ts.weeks.length - 1), 0);
  const perTS = (n: number): number => round(div(n, nTeamSeasons));

  const football = spells.filter((s) => s.cls === "FOOTBALL");
  const newFootball = football.filter((s) => isNew(s.onset));
  const newIllness = spells.filter((s) => s.cls === "ILLNESS" && isNew(s.onset));
  const newNfi = spells.filter((s) => s.cls === "NFI" && isNew(s.onset));

  // ---- exposure ---------------------------------------------------------
  const playerGames = new Map<PositionGroup, number>();
  const snaps = new Map<PositionGroup, number>();
  let playedIntervals = 0;
  let notPlayedIntervals = 0;
  const pt = { q: [0, 0], d: [0, 0], o: [0, 0], nq: [0, 0], lim: [0, 0], dnp: [0, 0] };
  for (const t of timelines) {
    const es = t.entries;
    for (let i = 0; i < es.length; i++) {
      const e = es[i]!;
      const hasNext = i < es.length - 1;
      if (hasNext && e.state === "PLAYED") {
        playedIntervals++;
        playerGames.set(t.group, (playerGames.get(t.group) ?? 0) + 1);
        snaps.set(t.group, (snaps.get(t.group) ?? 0) + e.snaps);
      } else if (hasNext && e.state === "HEALTHY_DNP") notPlayedIntervals++;

      // play-through: on the 53 (or played), on the report with a football injury
      if (e.report === null || e.reportKind !== "FOOTBALL") continue;
      if (!(e.kind === "ACTIVE" || e.kind === "INACTIVE" || e.state === "PLAYED")) continue;
      const played = e.state === "PLAYED" ? 1 : 0;
      const tally = (c: number[]) => { c[0]!++; c[1]! += played; };
      const gs = e.report.gameStatus;
      if (gs === "QUESTIONABLE") {
        tally(pt.q);
        if (i > 0 && !es[i - 1]!.listed) tally(pt.nq);
      } else if (gs === "DOUBTFUL") tally(pt.d);
      else if (gs === "OUT") tally(pt.o);
      else if (e.report.practiceStatus === "LIMITED") tally(pt.lim);
      else if (e.report.practiceStatus === "DNP") tally(pt.dnp);
    }
  }

  // ---- episodes and bands -------------------------------------------------
  const newEpisodes = episodes.filter((e) => isNew(e.onset));
  const d2dAny = newEpisodes.filter((e) => e.gamesMissed === 0).length;
  const newDesignated = newEpisodes.filter((e) => e.designated);
  const d2dDesignated = newDesignated.filter((e) => e.gamesMissed === 0).length;
  const d2dShare = div(d2dDesignated, newDesignated.length);
  const durations = durationSummary(newFootball);
  const tl = durations.games.bands;

  // ---- groups -------------------------------------------------------------
  const groups: GroupSummary[] = POSITION_GROUPS.map((group) => {
    const mine = newFootball.filter((s) => s.group === group);
    const afterPlayed = mine.filter((s) => s.onset === "AFTER_PLAYED").length;
    const pg = playerGames.get(group) ?? 0;
    const sn = snaps.get(group) ?? 0;
    return {
      group,
      newTimeLoss: mine.length,
      afterPlayed,
      playerGames: pg,
      snaps: sn,
      perPlayerGame: round(div(mine.length, pg)),
      perTeamGame: round(div(mine.length, teamIntervals)),
      per1000Snaps: round(div(afterPlayed * 1000, sn)),
      durations: roundDurations(durationSummary(mine)),
      dayToDayShare: round(div(
        newDesignated.filter((e) => e.group === group && e.gamesMissed === 0).length,
        newDesignated.filter((e) => e.group === group).length,
      )),
      bodyParts: partCounts(mine).slice(0, 6),
    };
  });

  // ---- body parts (league) ----------------------------------------------
  const parts = partCounts(newFootball).map((p) => {
    const b = bandsFromSurvival(survival(newFootball.filter((s) => s.bodyPart === p.part).map((s) => ({ length: s.gamesMissed, censored: s.censored }))));
    return { ...p, long: round(b.long), major: round(b.major) };
  });

  // ---- practice hints -----------------------------------------------------
  const afterPlayed = newFootball.filter((s) => s.onset === "AFTER_PLAYED").length;
  const afterNotPlayed = newFootball.filter((s) => s.onset === "AFTER_NOT_PLAYED").length;
  const afterNotPlayedRate = div(afterNotPlayed, notPlayedIntervals);
  const epAfterPlayed = newEpisodes.filter((e) => e.onset === "AFTER_PLAYED").length;
  const epAfterNotPlayed = newEpisodes.filter((e) => e.onset === "AFTER_NOT_PLAYED").length;
  const epAfterNotPlayedRate = div(epAfterNotPlayed, notPlayedIntervals);

  const week1 = football.filter((s) => s.onset === "BEFORE_SEASON");
  let carried = 0;
  let fresh = 0;
  let unknown = 0;
  const byKind: Record<string, number> = {};
  for (const s of week1) {
    byKind[s.firstKind] = (byKind[s.firstKind] ?? 0) + 1;
    if (!d.seasonsLoaded.has(s.season - 1)) unknown++;
    else if (d.endedHurt.get(`${s.season - 1}|${s.gsisId}`) === true) carried++;
    else fresh++;
  }
  const week1Episodes = episodes.filter((e) => e.onset === "BEFORE_SEASON"
    && d.seasonsLoaded.has(e.season - 1) && d.endedHurt.get(`${e.season - 1}|${e.gsisId}`) !== true);
  const week1SeasonsWithLookback = teamSeasons.filter((ts) => d.seasonsLoaded.has(ts.season - 1)).length;

  let byeIntervals = 0;
  for (const ts of teamSeasons) for (let i = 1; i < ts.weeks.length; i++) if (ts.weeks[i]! - ts.weeks[i - 1]! > 1) byeIntervals++;
  const byeOnsets = newFootball.filter((s) => s.afterBye).length;
  const otherIntervals = teamIntervals - byeIntervals;
  const otherOnsets = newFootball.length - byeOnsets;
  const h = survival(newFootball.map((s) => ({ length: s.weeksOut, censored: s.censored })))[2] ?? 1;
  const byePractice = div(byeOnsets, byeIntervals) - h * div(otherOnsets, otherIntervals);

  // ---- reserve lists ------------------------------------------------------
  let irIn = 0;
  let irAt1 = 0;
  let pupAt1 = 0;
  let nfiAt1 = 0;
  const irByTeam = new Map<string, number>(teamSeasons.map((ts) => [`${ts.season}|${ts.team}`, 0] as const));
  for (const t of timelines) {
    const es = t.entries;
    for (let i = 0; i < es.length; i++) {
      const e = es[i]!;
      if (i === 0) {
        if (e.kind === "IR") irAt1++;
        if (e.kind === "PUP") pupAt1++;
        if (e.kind === "NFI") nfiAt1++;
        continue;
      }
      const before = es[i - 1]!.kind;
      if (e.kind === "IR" && before !== "IR" && before !== "PUP" && before !== "NFI") {
        irIn++;
        const k = `${t.season}|${t.team}`;
        irByTeam.set(k, (irByTeam.get(k) ?? 0) + 1);
      }
    }
  }
  const irCounts = [...irByTeam.values()];
  const distinct = (list: readonly Spell[]): number => new Set(list.map((s) => `${s.season}|${s.team}|${s.gsisId}`)).size;

  return {
    seasons: [...seasons],
    teamSeasons: nTeamSeasons,
    teamGames,
    teamIntervals,
    timeLoss: {
      newFootball: newFootball.length,
      perTeamGame: round(div(newFootball.length, teamIntervals)),
      perTeamSeason: perTS(newFootball.length),
      byOnset: {
        afterPlayed,
        afterNotPlayed,
        beforeSeason: week1.length,
        unclear: football.filter((s) => s.onset === "UNCLEAR").length,
      },
      illness: newIllness.length,
      nfi: newNfi.length,
      perTeamGameAllCauses: round(div(newFootball.length + newIllness.length + newNfi.length, teamIntervals)),
      straightToReserve: newFootball.filter((s) => s.firstKind === "IR" || s.firstKind === "PUP").length,
    },
    durations: roundDurations(durations),
    groups,
    bodyParts: parts,
    playThrough: {
      questionable: ratio(pt.q[0]!, pt.q[1]!),
      doubtful: ratio(pt.d[0]!, pt.d[1]!),
      out: ratio(pt.o[0]!, pt.o[1]!),
      newlyQuestionable: ratio(pt.nq[0]!, pt.nq[1]!),
      limitedNoDesignation: ratio(pt.lim[0]!, pt.lim[1]!),
      dnpNoDesignation: ratio(pt.dnp[0]!, pt.dnp[1]!),
    },
    episodes: {
      newAny: newEpisodes.length,
      dayToDayAny: d2dAny,
      dayToDayShareAny: round(div(d2dAny, newEpisodes.length)),
      newDesignated: newDesignated.length,
      dayToDayDesignated: d2dDesignated,
      dayToDayShareDesignated: round(d2dShare),
      dayToDayDesignatedPerTeamGame: round(div(d2dDesignated, teamIntervals)),
    },
    allBands: {
      dayToDay: round(d2dShare),
      short: round((1 - d2dShare) * tl.short),
      long: round((1 - d2dShare) * tl.long),
      major: round((1 - d2dShare) * tl.major),
    },
    practiceHints: {
      playedIntervals,
      notPlayedIntervals,
      afterPlayedRate: round(div(afterPlayed, playedIntervals)),
      afterNotPlayedRate: round(afterNotPlayedRate),
      impliedNonGameShare: round(div(afterNotPlayedRate * (playedIntervals + notPlayedIntervals), afterPlayed + afterNotPlayed)),
      listingsAfterNotPlayedPerTeamSeason: perTS(epAfterNotPlayed),
      listingsAfterNotPlayedDnp: newEpisodes.filter((e) => e.onset === "AFTER_NOT_PLAYED" && e.firstDnp).length,
      episodeAfterPlayedRate: round(div(epAfterPlayed, playedIntervals)),
      episodeAfterNotPlayedRate: round(epAfterNotPlayedRate),
      episodeImpliedNonGameShare: round(div(epAfterNotPlayedRate * (playedIntervals + notPlayedIntervals), epAfterPlayed + epAfterNotPlayed)),
      outAtWeek1PerTeamSeason: perTS(week1.length),
      outAtWeek1CarriedOver: carried,
      outAtWeek1New: fresh,
      outAtWeek1Unknown: unknown,
      outAtWeek1ByKind: Object.fromEntries(Object.entries(byKind).sort((a, b) => a[0].localeCompare(b[0]))),
      week1NewEpisodesPerTeamSeason: round(div(week1Episodes.length, week1SeasonsWithLookback)),
      inSeasonNewEpisodesPerTeamInterval: round(div(newEpisodes.length, teamIntervals)),
      postBye: {
        intervals: byeIntervals,
        onsets: byeOnsets,
        rate: round(div(byeOnsets, byeIntervals)),
        otherIntervals,
        otherOnsets,
        otherRate: round(div(otherOnsets, otherIntervals)),
      },
      byeModel: {
        h: round(h),
        practicePerTeamInterval: round(byePractice),
        practicePerTeamIntervalSe: round(Math.sqrt(div(byeOnsets, byeIntervals ** 2) + h * h * div(otherOnsets, otherIntervals ** 2))),
        practiceShare: round(div(byePractice, div(otherOnsets, otherIntervals))),
      },
    },
    reserve: {
      irInSeasonPerTeamSeason: perTS(irIn),
      irAtWeek1PerTeamSeason: perTS(irAt1),
      irInSeasonMin: irCounts.length === 0 ? 0 : Math.min(...irCounts),
      irInSeasonMax: irCounts.length === 0 ? 0 : Math.max(...irCounts),
      pupAtWeek1PerTeamSeason: perTS(pupAt1),
      nfiAtWeek1PerTeamSeason: perTS(nfiAt1),
      nfiInSeasonPerTeamSeason: perTS(newNfi.length),
      illnessPerTeamSeason: perTS(newIllness.length),
      missing4PlusGamesNew: perTS(distinct(newFootball.filter((s) => s.gamesMissed >= LONG_FROM))),
      missing4PlusGamesAll: perTS(distinct(football.filter((s) => s.gamesMissed >= LONG_FROM))),
      missing4PlusWeeksAll: perTS(distinct(football.filter((s) => s.weeksOut >= LONG_FROM))),
    },
  };
}
