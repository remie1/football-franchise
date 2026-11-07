/**
 * The injury-rates report (ADR-087 §5, build step E): the measurement as Markdown for people and
 * JSON for the franchise injury table, with every definition and its limits written out.
 */

import { AGE_BANDS, BODY_CLASSES, type AgeClassSummary, type AgeSummary, type RepeatConcussion, type WeeksOut } from "./byAge.js";
import type { SpotSummary } from "./bySpot.js";
import type { AssetManifest } from "./data.js";
import type { GroupSummary, Summary } from "./measure.js";
import type { TimelineCoverage } from "./timeline.js";

export interface InjuryRatesReport {
  readonly seasons: readonly number[];
  /** The season loaded only to tell week-1 absences carried over from last season from new ones. */
  readonly lookbackSeason: number | null;
  readonly sources: readonly AssetManifest[];
  readonly coverage: readonly TimelineCoverage[];
  /** All measured seasons pooled. */
  readonly pooled: Summary;
  /** 2022-2024 pooled: today's rules (17 games, 4-game IR returns), no COVID lists. */
  readonly recent: Summary | null;
  readonly perSeason: readonly Summary[];
  /** REAL, all measured seasons pooled: new in-season injuries by age band (owner's rulings 2026-11-06; `byAge.ts`). */
  readonly byAge: AgeSummary;
  /** REAL: the same by CHOSEN body-part class within each age band. */
  readonly byAgeClass: AgeClassSummary;
  /** REAL: a man's first concussion seen in the window against his second or later. */
  readonly repeatConcussion: RepeatConcussion;
  /** REAL: the per-group rates by depth-chart spot, beside the listed groups (`bySpot.ts`). */
  readonly byDepthChartGroup: SpotSummary;
}

/** What each count is, in words. Shared by the Markdown and the JSON. */
export const DEFINITIONS: readonly { readonly term: string; readonly text: string }[] = [
  {
    term: "Data",
    text: "nflverse public release assets, regular season only: the weekly injury reports (injuries_<season>.csv: one row per player per team per game week, the week's final report, with its game status and the last practice day's participation), the weekly rosters (roster_weekly_<season>.csv: each player's status that game week), PFR snap counts (snap_counts_<season>.csv: every player who took at least one snap) and the schedule (games.csv). 2025 is never read (held out, calibration.md §7).",
  },
  {
    term: "Team game, team interval",
    text: "A team game is one team's side of one regular-season game. A team interval is a team game followed by another team game of the same regular season (so each team-season has games − 1): a new injury shows up as the next game missed, so it can only be seen in an interval. A team's final regular-season game is exposure no injury can be seen after, and is left out of both the counts and the denominators.",
  },
  {
    term: "Played",
    text: "Took at least one snap (offence, defence or special teams) in the game, from the snap counts. The weekly roster's ACT/INA split is not used for this: it is not reliable for the game itself (2019 lists injured, unused players as ACT).",
  },
  {
    term: "Missed for injury",
    text: "Did not play, and either was on injured reserve (R01, R48, or a RES row with no code in 2019 and early 2020), PUP (R04, R47, PUP) or the non-football list (R05, R49, RSN), or was on the 53 and on the final injury report with an injury (not 'not injury related', rest, personal, coach's decision or COVID) and a game designation (Questionable, Doubtful, Out) or a practice limit (did not participate, limited). Illness counts, as its own class. COVID lists, suspensions, the practice squad and holdouts never count. The weekly roster can lag a reserve move by a week (Dak Prescott, DAL 2020 w6), so a game with no snap and no report line between a game he played and a reserve-list game counts as missed for that injury.",
  },
  {
    term: "Time-loss injury (spell)",
    text: "A run of one or more consecutive team games missed for injury. It is new in season when, the team game before it, he played (onset AFTER_PLAYED: hurt in that game, that week's practice or away from football) or was healthy on the 53 and did not play (AFTER_NOT_PLAYED: hurt in practice or away). Spells already running at the team's first game (BEFORE_SEASON) and spells whose game before is unclear (not on the 53, or listed hurt without playing) are counted apart and left out of the new-injury rates. The headline counts football injuries; illness and the non-football list are reported beside them.",
  },
  {
    term: "Games missed, weeks out",
    text: "Games missed: consecutive team games missed (byes skipped). Weeks out: calendar weeks from the first missed game's week to the week of the game he was back for (byes count), which is ADR-087's weeksRemaining. A spell ends when he plays, or is healthy on the 53 without playing; it is censored when the regular season ends or he leaves the team's list (cut, traded, practice squad, COVID list).",
  },
  {
    term: "Bands",
    text: "ADR-087 §5.3: SHORT 1-3, LONG 4-8, MAJOR 9 or more, in games (and, beside it, in weeks). Shares come from a Kaplan-Meier survival curve over the new in-season spells, so a censored spell counts only for as long as it was seen (a censored length c says D ≥ c). 'Naive' shares treat censored lengths as exact and are a floor on the long bands.",
  },
  {
    term: "Listing episode, day to day",
    text: "An episode is a run of consecutive team game weeks on the injury list: missed for a football injury, or on the report with a football injury and a designation or practice limit. A new in-season episode has an AFTER_PLAYED or AFTER_NOT_PLAYED onset. A day-to-day injury is a new designated episode (a game designation or a missed game at some point) that never cost a game. 'Any' episodes also count practice-limit-only listings.",
  },
  {
    term: "Rates",
    text: "Per team-game: new in-season time-loss injuries / team intervals. Per player-game (by group): the group's new in-season injuries / the group's player-games played that had a next team game. Per 1,000 snaps (by group): new injuries after a game he played / snaps in those player-games.",
  },
  {
    term: "Position group",
    text: "From the weekly roster's position (its most common value for the player on that team that season): QB; RB (incl. FB); WR; TE; OL; DL (DE, DT, NT); LB (incl. OLB, so 3-4 edge rushers are LB and 4-3 ends DL); DB; K/P (K, P, LS).",
  },
  {
    term: "Body part",
    text: "The report's injury text, read into a class by keyword (the earliest-named part wins; 'left'/'right' ignored): from the first missed game's report, else the week before, else any week of the spell, else the two weeks after it (players placed straight on IR are not on the report until they return). 'unknown' when none of those weeks has one.",
  },
  {
    term: "IR placements",
    text: "From the weekly rosters: in season, a team game week 2..N on injured reserve after a week not on IR, PUP or NFI (list transfers are not new placements; an activation followed by a second placement counts twice); before week 1, on IR at the team's first game.",
  },
];

/** The known limits of the measurement. */
export const LIMITS: readonly string[] = [
  "The report names a body part, never a diagnosis: 'Knee' is an ACL tear and a bruise alike, so kinds such as ACL, MCL or a high ankle sprain cannot be counted.",
  "Only the week's final report is published per player: a player limited on Wednesday and full on Friday shows as full; earlier days are not seen.",
  "Healthy scratches: an inactive player who is not on the report reads as a healthy scratch. A hurt player his team left off the report reads healthy, and a healthy scratch listed with a designation or a practice limit reads as missed for injury.",
  "Players placed straight onto IR after a game are never on that week's report, so their body part comes from their return weeks or is unknown (about 11% of spells, skewed to the longest injuries: their MAJOR share is about 75%). The body-part shares therefore understate the serious kinds.",
  "Injury reserve rules shape the games-missed numbers: in 2019 IR was season-ending except two designated returns a team (8 weeks minimum); 2020-2021 had a 3-week minimum; 2022 on, 4 games. Teams also shut injured players down late in a lost season. Recorded games missed therefore overstate medical time lost for some players, and inflate LONG and MAJOR, most of all in 2019.",
  "Kaplan-Meier assumes censoring is unrelated to how bad an injury is. Censoring here is the season's end (unrelated) or the player leaving the team's list (a team cutting an injured player with an injury settlement is related, and rare).",
  "Injuries in a team's last regular-season game, in the playoffs and in the offseason are not seen; a week-1 absence is called carried over only when the player ended the previous regular season out injured.",
  "Practice and game injuries cannot be told apart for a player who played the game before: the reports say who is hurt, not where. The practice numbers below are hints, each with its own assumptions.",
  "Snap counts meet the roster by PFR id and, for the roster rows with no PFR id (about a third), by normalised name within the team-week; about 1% of snap rows meet no roster row (see Coverage) and a listed player whose snap row was lost reads as having missed the game.",
  "2020 and 2021: the COVID-19 lists (R59, RSR) and 2020's opt-outs (R62, NWT) are not injuries and never count; 2020's moved games and 2022's cancelled BUF-CIN game follow the schedule. 2019 and 2020 to week 7 carry no reserve codes, so every RES row there is read as IR (a few reserve players of other kinds are in it).",
  "The practice squad is left out: a practice-squad player hurt in practice misses no game of the 53.",
  "'Players missing 4+ games' counts what was seen: an injury late in the season cannot reach 4 games before the season ends.",
];

/** JSON with every array or object that fits in `width` characters, and every array of plain numbers, kept on one line. */
export function compactJson(value: unknown, width = 110, indent = ""): string {
  const flat = JSON.stringify(value);
  if (flat === undefined) return "null";
  const numbers = Array.isArray(value) && value.every((v) => typeof v === "number");
  if (numbers || flat.length + indent.length <= width || value === null || typeof value !== "object") {
    return flat.replace(/,"/g, ', "').replace(/":/g, '": ').replace(/,(?=[\d\-[{tfn])/g, ", ");
  }
  const inner = indent + "  ";
  if (Array.isArray(value)) {
    return `[\n${value.map((v) => inner + compactJson(v, width, inner)).join(",\n")}\n${indent}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
  return `{\n${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${compactJson(v, width, inner)}`).join(",\n")}\n${indent}}`;
}

export function renderJson(r: InjuryRatesReport): string {
  return compactJson({ ...r, ageAndSpotCaveats: AGE_AND_SPOT_CAVEATS, definitions: DEFINITIONS, limits: LIMITS }) + "\n";
}

// ---------------------------------------------------------------- formatting

/** How a week-1 absence's roster kind reads in the report. */
const WEEK1_LABEL: Readonly<Record<string, string>> = {
  ACTIVE: "on the 53 (roster ACT) but ruled out or listed and unused",
  INACTIVE: "inactive and listed",
  IR: "injured reserve",
  PUP: "PUP",
};

const pct = (x: number, d = 1): string => `${(x * 100).toFixed(d)}%`;
const fix = (x: number, d = 2): string => x.toFixed(d);
const int = (x: number): string => Math.round(x).toLocaleString("en-US");
const span = (seasons: readonly number[]): string =>
  seasons.length === 1 ? String(seasons[0]) : `${seasons[0]}-${seasons[seasons.length - 1]}`;

function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]) => `| ${cells.join(" | ")} |`;
  return [line(head), line(head.map(() => "---")), ...rows.map(line)].join("\n");
}

function topParts(g: GroupSummary, n = 4): string {
  return g.bodyParts.slice(0, n).map((p) => `${p.part} ${pct(p.share, 0)}`).join(", ");
}

// ---------------------------------------------------------------- markdown

export function renderMarkdown(r: InjuryRatesReport): string {
  const p = r.pooled;
  const q = r.recent;
  const both = (f: (s: Summary) => string): readonly string[] => [f(p), q === null ? "-" : f(q)];
  const heads = ["", span(p.seasons), q === null ? "-" : span(q.seasons)];
  const out: string[] = [];

  out.push(`# Real NFL injury rates (ADR-087 §5, build step E)`);
  out.push("");
  out.push(
    `Measured from nflverse's public injury reports, weekly rosters and snap counts, regular seasons ${span(r.seasons)} ` +
      `(${p.teamSeasons} team-seasons, ${int(p.teamGames)} team games). ${r.lookbackSeason === null ? "" : `${r.lookbackSeason} is read only to tell week-1 absences carried over from last season. `}` +
      `2025 is not read (held out, calibration.md §7). Every count is defined under **Definitions**, with its limits. ` +
      `The second column pools ${q === null ? "-" : span(q.seasons)} (17 games, 4-game IR returns, no COVID lists).`,
  );
  out.push("");
  out.push("Regenerate: `pnpm --filter @ff/calibration injury-rates` (downloads once into `data-cache/injury-rates/`; `-- --refresh` downloads again). Numbers below are MEASURED.");
  out.push("");

  out.push("## Headline");
  out.push("");
  out.push(table(heads, [
    ["New time-loss injuries per team-game (football)", ...both((s) => fix(s.timeLoss.perTeamGame, 2))],
    ["... per team-season", ...both((s) => fix(s.timeLoss.perTeamSeason, 1))],
    ["... with illness and the non-football list", ...both((s) => fix(s.timeLoss.perTeamGameAllCauses, 2))],
    ["Day-to-day injuries per team-game (designated, no game missed)", ...both((s) => fix(s.episodes.dayToDayDesignatedPerTeamGame, 2))],
    ["Time-loss bands, games missed: SHORT / LONG / MAJOR", ...both((s) => `${pct(s.durations.games.bands.short)} / ${pct(s.durations.games.bands.long)} / ${pct(s.durations.games.bands.major)}`)],
    ["Time-loss bands, weeks out: SHORT / LONG / MAJOR", ...both((s) => `${pct(s.durations.weeks.bands.short)} / ${pct(s.durations.weeks.bands.long)} / ${pct(s.durations.weeks.bands.major)}`)],
    ["Median games missed / weeks out", ...both((s) => `${s.durations.games.median ?? "-"} / ${s.durations.weeks.median ?? "-"}`)],
    ["All designated injuries: DAY_TO_DAY / SHORT / LONG / MAJOR", ...both((s) => `${pct(s.allBands.dayToDay)} / ${pct(s.allBands.short)} / ${pct(s.allBands.long)} / ${pct(s.allBands.major)}`)],
    ["Listed Questionable: share who played", ...both((s) => pct(s.playThrough.questionable.share))],
    ["IR placements per team-season: in season + before week 1", ...both((s) => `${fix(s.reserve.irInSeasonPerTeamSeason, 1)} + ${fix(s.reserve.irAtWeek1PerTeamSeason, 1)}`)],
    ["Players per team-season missing 4+ games (any onset; new in season)", ...both((s) => `${fix(s.reserve.missing4PlusGamesAll, 1)}; ${fix(s.reserve.missing4PlusGamesNew, 1)}`)],
    ["New time-loss injuries after a game played / after not playing", ...both((s) => `${int(s.timeLoss.byOnset.afterPlayed)} / ${int(s.timeLoss.byOnset.afterNotPlayed)}`)],
  ]));
  out.push("");

  out.push("## By position group");
  out.push("");
  out.push(`New in-season time-loss football injuries, ${span(p.seasons)}. Bands are Kaplan-Meier, games missed. Body parts are shares of the group's spells (unknown = no report row near the spell).`);
  out.push("");
  out.push(table(
    ["Group", "Injuries", "Player-games", "Per player-game", "Per team-game", "Per 1,000 snaps", "SHORT", "LONG", "MAJOR", "Day-to-day share", "Top body parts"],
    p.groups.map((g) => [
      g.group, int(g.newTimeLoss), int(g.playerGames), fix(g.perPlayerGame, 4), fix(g.perTeamGame, 3), fix(g.per1000Snaps, 2),
      pct(g.durations.games.bands.short), pct(g.durations.games.bands.long), pct(g.durations.games.bands.major),
      pct(g.dayToDayShare), topParts(g),
    ]),
  ));
  out.push("");

  out.push("## Body parts");
  out.push("");
  out.push(`All new in-season time-loss football injuries, ${span(p.seasons)}. LONG and MAJOR are each part's own Kaplan-Meier shares.`);
  out.push("");
  out.push(table(["Body part", "Injuries", "Share", "LONG", "MAJOR"], p.bodyParts.map((b) => [b.part, int(b.count), pct(b.share), pct(b.long), pct(b.major)])));
  out.push("");

  out.push("## How long: the survival curve");
  out.push("");
  out.push(`P(out at least k), new in-season time-loss injuries, ${span(p.seasons)} (${int(p.durations.n)} spells, ${int(p.durations.censored)} censored).`);
  out.push("");
  const ks = [1, 2, 3, 4, 5, 6, 8, 9, 12, 16];
  out.push(table(["k", ...ks.map(String)], [
    ["games", ...ks.map((k) => pct(p.durations.games.survival[k - 1] ?? 0, 0))],
    ["weeks", ...ks.map((k) => pct(p.durations.weeks.survival[k - 1] ?? 0, 0))],
  ]));
  out.push("");
  out.push(`Naive shares (censored as exact), games: SHORT ${pct(p.durations.games.naive.short)}, LONG ${pct(p.durations.games.naive.long)}, MAJOR ${pct(p.durations.games.naive.major)}.`);
  out.push("");

  out.push("## Playing through");
  out.push("");
  out.push("Player-weeks on the report with a football injury, by the week's final designation: the share who took a snap.");
  out.push("");
  const pt = p.playThrough;
  out.push(table(["Listed", "Player-weeks", "Played"], [
    ["Questionable", int(pt.questionable.n), pct(pt.questionable.share)],
    ["... first week of an episode", int(pt.newlyQuestionable.n), pct(pt.newlyQuestionable.share)],
    ["Doubtful", int(pt.doubtful.n), pct(pt.doubtful.share)],
    ["Out", int(pt.out.n), pct(pt.out.share)],
    ["Limited, no designation", int(pt.limitedNoDesignation.n), pct(pt.limitedNoDesignation.share)],
    ["Did not practise, no designation", int(pt.dnpNoDesignation.n), pct(pt.dnpNoDesignation.share)],
  ]));
  out.push("");
  out.push(
    `Of ${int(p.episodes.newDesignated)} new designated injury episodes, ${pct(p.episodes.dayToDayShareDesignated)} never cost a game (day to day). ` +
      `Counting practice-limit-only listings too, ${pct(p.episodes.dayToDayShareAny)} of ${int(p.episodes.newAny)}.`,
  );
  out.push("");

  out.push("## Practice and away from football: what the reports can say");
  out.push("");
  const h = p.practiceHints;
  out.push(
    `The reports say who is hurt, not where. A new injury to a player who played the game before can be from that game, that week's practice or away from football. These are the hints, each with its assumption:`,
  );
  out.push("");
  out.push(
    `1. **Players who did not play the game before.** A healthy player on the 53 who did not play cannot have been hurt in that game. ` +
      `Such players newly listed (any listing, day-to-day included): ${fix(h.listingsAfterNotPlayedPerTeamSeason, 1)} per team-season, ${int(h.listingsAfterNotPlayedDnp)} of them not practising on the first week's final report. ` +
      `New time-loss injuries per player-week: ${pct(h.afterNotPlayedRate, 2)} after not playing (${int(p.timeLoss.byOnset.afterNotPlayed)} over ${int(h.notPlayedIntervals)} player-weeks) against ${pct(h.afterPlayedRate, 2)} after playing ` +
      `(${int(p.timeLoss.byOnset.afterPlayed)} over ${int(h.playedIntervals)}). If the non-playing rate applied to everyone, non-game injuries would be ${pct(h.impliedNonGameShare, 0)} of new in-season time-loss injuries ` +
      `(${pct(h.episodeImpliedNonGameShare, 0)} of all new listings). Read it as a ceiling: healthy scratches practise at full speed on the scout team while starters' in-season practice is lighter, and some are moved to IR with a minor injury to free a roster spot.`,
  );
  out.push(
    `2. **Byes.** An interval across a bye holds one game and two practice weeks. It shows ${fix(h.postBye.rate, 2)} new time-loss injuries per team against ${fix(h.postBye.otherRate, 2)} for a normal interval ` +
      `(${int(h.postBye.intervals)} bye intervals): fewer, because a game injury must last two weeks to cost the next game across a bye. With h = P(out 2+ weeks | out 1+) = ${fix(h.byeModel.h, 3)}, the extra practice week adds ` +
      `${fix(h.byeModel.practicePerTeamInterval, 3)} ± ${fix(h.byeModel.practicePerTeamIntervalSe, 3)} per team interval, about ${pct(h.byeModel.practiceShare, 0)} of a normal interval's injuries ` +
      `(bye-week practice is lighter than a game week's; the per-season values swing widely, see the JSON).`,
  );
  out.push(
    `3. **Before the season.** ${fix(h.outAtWeek1PerTeamSeason, 1)} players per team-season are out for a football injury at the first game: ${int(h.outAtWeek1New)} new ` +
      `(${fix(h.outAtWeek1New / Math.max(1, p.teamSeasons), 1)} per team-season: hurt in camp, preseason games or the offseason) and ${int(h.outAtWeek1CarriedOver)} still out from the end of last season` +
      `${h.outAtWeek1Unknown > 0 ? `, ${int(h.outAtWeek1Unknown)} with no lookback season` : ""}. By list at week 1: ${Object.entries(h.outAtWeek1ByKind).map(([k, v]) => `${WEEK1_LABEL[k] ?? k} ${int(v)}`).join(", ")}. ` +
      `New listing episodes at week 1: ${fix(h.week1NewEpisodesPerTeamSeason, 1)} per team-season, against ${fix(h.inSeasonNewEpisodesPerTeamInterval, 2)} per team interval in season.`,
  );
  out.push(
    `4. **Away from football.** New in-season spells on the non-football list: ${fix(p.reserve.nfiInSeasonPerTeamSeason, 2)} per team-season; on it at week 1: ${fix(p.reserve.nfiAtWeek1PerTeamSeason, 2)}. ` +
      `Illness that cost a game: ${fix(p.reserve.illnessPerTeamSeason, 2)} per team-season. Car, bicycle or fireworks accidents are not named as such.`,
  );
  out.push("");

  out.push("## Injured reserve and other lists, per team-season");
  out.push("");
  out.push(table(
    ["Season", "IR in season", "IR fewest-most", "IR at week 1", "PUP at week 1", "NFI at week 1", "Missing 4+ games (all; new)", "Missing 4+ weeks (all)"],
    [...r.perSeason, p].map((s) => [
      s === p ? `**${span(s.seasons)}**` : span(s.seasons), fix(s.reserve.irInSeasonPerTeamSeason, 1), `${s.reserve.irInSeasonMin}-${s.reserve.irInSeasonMax}`,
      fix(s.reserve.irAtWeek1PerTeamSeason, 1), fix(s.reserve.pupAtWeek1PerTeamSeason, 2), fix(s.reserve.nfiAtWeek1PerTeamSeason, 2),
      `${fix(s.reserve.missing4PlusGamesAll, 1)}; ${fix(s.reserve.missing4PlusGamesNew, 1)}`, fix(s.reserve.missing4PlusWeeksAll, 1),
    ]),
  ));
  out.push("");

  out.push("## Per season");
  out.push("");
  out.push(table(
    ["Season", "Team games", "Per team-game", "Per team-season", "SHORT", "LONG", "MAJOR", "Day-to-day share", "Q played"],
    [...r.perSeason, p].map((s) => [
      s === p ? `**${span(s.seasons)}**` : span(s.seasons), int(s.teamGames), fix(s.timeLoss.perTeamGame, 2), fix(s.timeLoss.perTeamSeason, 1),
      pct(s.durations.games.bands.short), pct(s.durations.games.bands.long), pct(s.durations.games.bands.major),
      pct(s.episodes.dayToDayShareDesignated), pct(s.playThrough.questionable.share),
    ]),
  ));
  out.push("");

  out.push("## For the franchise injury table (ADR-087 D3)");
  out.push("");
  out.push(
    `- Game-setting time-loss injuries: about ${fix(p.timeLoss.perTeamGame, 1)} per team-game (the D3 placeholder aims at 1.5-2); by group, the per-1,000-snap rates above. ` +
      `Plus about ${fix(p.episodes.dayToDayDesignatedPerTeamGame, 1)} day-to-day injuries per team-game that cost no game.`,
  );
  out.push(
    `- Lengths: SHORT ${pct(p.durations.weeks.bands.short, 0)}, LONG ${pct(p.durations.weeks.bands.long, 0)}, MAJOR ${pct(p.durations.weeks.bands.major, 0)} of time-loss injuries in weeks out ` +
      `(${pct(p.durations.games.bands.short, 0)} / ${pct(p.durations.games.bands.long, 0)} / ${pct(p.durations.games.bands.major, 0)} in games); the IR rules and late-season shutdowns push the long bands up (see Limits).`,
  );
  out.push(
    `- Players missing 4+ games: about ${fix(p.reserve.missing4PlusGamesAll, 0)} per team-season as seen in season (the D3 placeholder aims at 18-25 a season, which counts the offseason too and is not cut short by the season's end).`,
  );
  out.push(
    `- Setting split: the reports cannot give it. In season, games dominate: the bye-week estimate puts the extra practice week at about ${pct(h.byeModel.practiceShare, 0)} of an interval's injuries, and the players-who-did-not-play contrast caps non-game injuries at about ${pct(h.impliedNonGameShare, 0)}. ` +
      `Before the season, ${fix(h.outAtWeek1New / Math.max(1, p.teamSeasons), 1)} new injuries per team keep a player out of week 1 (camp, preseason games, offseason), against ${fix(p.timeLoss.perTeamSeason, 1)} new in-season ones. ` +
      `Away from football (non-football list and illness) about ${fix(p.reserve.nfiInSeasonPerTeamSeason + p.reserve.illnessPerTeamSeason + p.reserve.nfiAtWeek1PerTeamSeason, 1)} per team-season.`,
  );
  out.push("");

  out.push(...renderAgeAndSpot(r));

  out.push("## Definitions");
  out.push("");
  for (const d of DEFINITIONS) out.push(`- **${d.term}.** ${d.text}`);
  out.push("");
  out.push("## Limits");
  out.push("");
  for (const l of LIMITS) out.push(`- ${l}`);
  out.push("");

  out.push("## Coverage");
  out.push("");
  out.push(table(
    ["Season", "Team games", "Roster rows", "No-game rows", "Report rows", "Unmatched report", "Team-weeks no report", "Snap rows", "By PFR id", "By name", "Unmatched snaps", "Played while out"],
    r.coverage.map((c) => [
      String(c.season), int(c.teamGames), int(c.rosterRows), int(c.rosterRowsNoGame), int(c.reportRows), int(c.reportRowsUnmatched),
      int(c.teamWeeksWithoutReport), int(c.snapRows), int(c.snapRowsJoinedById), int(c.snapRowsJoinedByName), int(c.snapRowsUnmatched), int(c.playedWhileListedOut),
    ]),
  ));
  out.push("");
  out.push("## Sources");
  out.push("");
  out.push(table(["Asset", "Bytes", "sha256", "Fetched"], r.sources.map((s) => [`[${s.tag}/${s.asset}](${s.url})`, int(s.bytes), `\`${s.sha256.slice(7, 23)}…\``, s.fetchedAt.slice(0, 10)])));
  out.push("");
  return out.join("\n");
}

// ---------------------------------------------------------------- by age and by spot

const orDash = (x: number | null, f: (v: number) => string): string => (x === null ? "-" : f(x));
const median = (w: WeeksOut): string => (w.n === 0 ? "-" : String(w.median ?? "-"));
const signed = (x: number, d: number): string => `${x >= 0 ? "+" : ""}${x.toFixed(d)}`;

/** The limits of the age and spot numbers, in the Markdown section and the JSON. */
export const AGE_AND_SPOT_CAVEATS: readonly string[] = [
  "Survivors: the men still playing at 33 and over are the ones durable and good enough to last, so the oldest band's rates describe them, not what age does to a typical player.",
  "Position mix: older men are more often quarterbacks, linemen and specialists, so the raw rates by age mix age with position; the observed / expected columns adjust for the listed group only, not for role (starter or backup) or snaps per game.",
  "Injured-reserve rules shape weeks out and availability: 2019's IR was season-ending but for two designated returns a team, 2020-2021 had a 3-week minimum, 2022 on 4 games; teams shut players down late in a lost season, and stash young men on IR to keep them, which lifts the youngest band's share of game weeks missed.",
  "Unknown body parts: about 11% of spells have no report text near them, skewed to the longest (players placed straight on IR), so the unknown class holds many of the long injuries and the named classes' out-4+-weeks shares understate theirs.",
  "Only these seasons: six regular seasons (2019-2024). The code reads back to 2013, but the older injury files would have to be downloaded; 2025 is held out and never read.",
  "Ages are one per player-season, on 23 October: a man who turns 26 in December is 25 all season.",
  "First concussion means the first seen in the window (since 2019), not his first ever: a man concussed in 2018 and again in 2020 has his 2020 one counted first.",
  "Quick relapses: a second or later concussion that begins after one game back from the one before, on the same team in the same season, may be the same concussion counted twice. It sits in the second-or-later row and is also set apart; the first spell of such a pair, often short, sits in the first row.",
  "Depth-chart spot: the weekly roster's depth_chart_position is each man's position on the team's list in fine form, not the game-day depth chart's order or formation (nflverse's separate depth-chart table, not cached here, has those). A man who plays outside his listed spot on game day, such as a safety at corner in the nickel, is not seen.",
];

/**
 * The section for the owner's rulings of 2026-11-06 (ADR-087): REAL (counted) injuries by age, by
 * body-part class within age, repeat concussions, and the group rates recounted by depth-chart spot.
 */
export function renderAgeAndSpot(r: InjuryRatesReport): string[] {
  const a = r.byAge;
  const c = r.byAgeClass;
  const rc = r.repeatConcussion;
  const sp = r.byDepthChartGroup;
  const out: string[] = [];

  out.push("## By age, body-part class and depth-chart spot (REAL)");
  out.push("");
  out.push(
    `Added for the owner's rulings of 2026-11-06 (ADR-087): measure injuries by age before adding slower healing, and recount the group rates by the spot a team plays a man at. ` +
      `Every number in this section is REAL (counted) from the same files, timelines and definitions as above, regular seasons ${span(a.seasons)} pooled; 2025 is never read. ` +
      "CHOSEN: the age bands, the body-part classes, the reference date, the reading of older spot spellings and the standard error's method.",
  );
  out.push("");
  out.push(
    `Age is ${a.reference} (the stand-in file's snapshot point, the same reading as \`nfl-careers\`), from the first birth date on the player's weekly-roster rows, oldest season first. ` +
      `One age per player-season. Listed kickers, punters and long snappers (K/P) are left out of the age rows (${int(a.leftOut.specialistTimelines)} team-season timelines), ` +
      `and so are ${int(a.leftOut.noBirthDate.timelines)} timelines with no birth date (${int(a.leftOut.noBirthDate.playerGames)} player-games, ${int(a.leftOut.noBirthDate.newTimeLoss)} new injuries).`,
  );
  out.push("");

  out.push("### Injuries by age");
  out.push("");
  out.push(table(
    ["Age", "Player-seasons", "Player-games", "Injuries (after a game played)", "Per 1,000 snaps", "Per player-game", "Observed / expected, per snap", "Observed / expected, per player-game"],
    a.bands.map((b) => [
      b.band, int(b.playerSeasons), int(b.playerGames), `${int(b.newTimeLoss)} (${int(b.afterPlayed)})`, fix(b.per1000Snaps, 3), fix(b.perPlayerGame, 4),
      `${fix(b.mixPerSnap.ratio, 2)} ± ${fix(b.mixPerSnap.se, 2)}`, `${fix(b.mixPerPlayerGame.ratio, 2)} ± ${fix(b.mixPerPlayerGame.se, 2)}`,
    ]),
  ));
  out.push("");
  out.push(
    "Injuries are new in-season time-loss football injuries; per 1,000 snaps counts those after a game he played. Observed / expected sets the band's injuries against what its own player-games " +
      "would have at each listed group's rate over all ages, so a band heavy with quarterbacks or linemen is not read as an age effect; ± is one Poisson standard error (√observed / expected).",
  );
  out.push("");
  out.push(table(
    ["Age", "Injuries (censored)", "Median weeks out", "Out 4+ weeks", "Out 9+ weeks", "Game weeks", "Missed for injury", "... football", "... on IR or PUP"],
    a.bands.map((b) => [
      b.band, `${int(b.weeksOut.n)} (${int(b.weeksOut.censored)})`, median(b.weeksOut),
      orDash(b.weeksOut.p4Plus, (x) => pct(x)), orDash(b.weeksOut.p9Plus, (x) => pct(x)),
      int(b.availability.gameWeeks), pct(b.availability.missedShare), pct(b.availability.missedFootballShare), pct(b.availability.onReserveShare),
    ]),
  ));
  out.push("");
  out.push(
    "Weeks out are Kaplan-Meier over the band's new in-season time-loss injuries (calendar weeks, byes count). Game weeks are the team game weeks he played, was healthy on the 53 " +
      "and did not play, or missed for injury of any cause (football, illness, the non-football list); the last three columns are shares of them (availability).",
  );
  out.push("");

  out.push("### By body-part class within each age band");
  out.push("");
  const partsOf = (cls: (typeof BODY_CLASSES)[number]): string => c.classes[cls].filter((p) => p !== "illness").join(", ");
  out.push(
    `Classes (CHOSEN, grouping the keyword classes above): ${BODY_CLASSES.filter((k) => k !== "unknown").map((k) => `${k} = ${partsOf(k)}`).join("; ")}; ` +
      "unknown = no report text near the spell. Elbow/arm also catches biceps and triceps.",
  );
  out.push("");
  const cell = (band: string, cls: string) => c.rows.find((x) => x.band === band && x.cls === cls);
  out.push(table(
    ["Per 1,000 snaps (injuries)", ...AGE_BANDS],
    BODY_CLASSES.map((cls) => [cls, ...AGE_BANDS.map((band) => {
      const x = cell(band, cls);
      return x === undefined ? "-" : `${fix(x.per1000Snaps, 3)} (${int(x.n)})`;
    })]),
  ));
  out.push("");
  out.push(table(
    ["Out 4+ weeks, Kaplan-Meier", ...AGE_BANDS],
    BODY_CLASSES.map((cls) => [cls, ...AGE_BANDS.map((band) => {
      const x = cell(band, cls);
      return x === undefined ? "-" : orDash(x.weeksOut.p4Plus, (v) => pct(v));
    })]),
  ));
  out.push("");
  out.push("The count in brackets is the class's new in-season injuries in the band; the per-snap rate counts the ones after a game played, over the band's snaps.");
  out.push("");

  out.push("### Repeat concussions");
  out.push("");
  out.push(
    `Every football spell with body part concussion/head in ${span(rc.seasons)} (any onset, any group): ${int(rc.spells)} spells, ${int(rc.men)} men, ${int(rc.menWith2Plus)} of them with two or more. ` +
      "Each man's spells are ordered by season and first missed week.",
  );
  out.push("");
  const conc = (label: string, o: RepeatConcussion["first"]): string[] => [
    label, int(o.all.n), median(o.all), orDash(o.all.p2Plus, (x) => pct(x)), orDash(o.all.p4Plus, (x) => pct(x)),
    `${int(o.newInSeason.n)}; ${orDash(o.newInSeason.p4Plus, (x) => pct(x))}`,
  ];
  out.push(table(
    ["Concussion", "Spells", "Median weeks out", "Out 2+ weeks", "Out 4+ weeks", "New in season: spells; out 4+ weeks"],
    [
      conc("First seen in the window", rc.first), conc("Second or later", rc.later),
      conc("... a quick relapse", rc.laterQuickRelapse), conc("... the rest", rc.laterApart),
    ],
  ));
  out.push("");
  out.push(
    `A quick relapse begins the team game after the one game that ended his previous concussion spell, on the same team in the same season (CHOSEN line: one game back). ` +
      `Some of those may be one concussion counted twice, so the second-or-later row mixes them with the rest; a rule that later concussions heal slower is better built on the rest's row. ` +
      `The first half of such a pair is in the first row: ${int(rc.firstFollowedByQuickRelapse)} first spells are followed by a quick relapse.`,
  );
  out.push("");

  out.push("### By depth-chart spot");
  out.push("");
  const codes = Object.entries(sp.unknownSpot.codes).map(([k, v]) => `${k} ${int(v)}`).join(", ");
  out.push(
    "The spot is the weekly roster's depth_chart_position, read week by week and folded into the injury groups by the listed position's own rule (DE, DT, NT are DL; OLB, ILB, MLB are LB; " +
      "CB, FS, SS, S are DB; T, G, C are OL; FB is RB; K, P, LS are K/P). Older spellings OT, OG, HB and SAF read as T, G, RB and S (CHOSEN, as `nfl-careers` reads them). " +
      "A player-game counts at that week's spot; an injury counts at the spot of the game week its onset follows. " +
      `A blank or unreadable spot counts at his listed group: ${int(sp.unknownSpot.playerGames)} player-games${codes === "" ? "" : ` (${codes})`}, ${int(sp.unknownSpot.newTimeLoss)} injuries.`,
  );
  out.push("");
  const maxSnap = Math.max(0, ...sp.groups.map((g) => Math.abs(g.change.per1000Snaps)));
  const maxGame = Math.max(0, ...sp.groups.map((g) => Math.abs(g.change.perPlayerGame)));
  out.push(
    `The spot group differs from the listed group in ${int(sp.differ.playerGames)} of ${int(sp.playerGames)} player-games (${pct(sp.differ.share, 2)}; ${pct(sp.differ.snapShare, 2)} of snaps) ` +
      `and moves ${int(sp.differ.newTimeLoss)} injuries. ${int(sp.differ.fromThatWeeksListing)} of those player-games have a spot outside that same week's listed group; the rest come from a listed ` +
      "position that changed during the season (the listed group is the team-season's most common). In these files the column holds the man's position in its fine form (CB, FS, SS; T, G, C; " +
      `DE, DT, NT; OLB, ILB, MLB), not the game-day depth chart, so the recount moves no group's rate by more than ${fix(maxSnap, 3)} per 1,000 snaps or ${fix(maxGame, 4)} per player-game. ` +
      "Edge rushers stay split the way teams list them (a 4-3 end is DL, a 3-4 outside linebacker LB). The fine spots below are where the spot says more than the group.",
  );
  out.push("");
  out.push(table(
    ["Group", "Player-games (listed; spot)", "Per player-game (listed; spot; change)", "Per 1,000 snaps (listed; spot; change)"],
    sp.groups.map((g) => [
      g.group, `${int(g.listed.playerGames)}; ${int(g.spot.playerGames)}`,
      `${fix(g.listed.perPlayerGame, 4)}; ${fix(g.spot.perPlayerGame, 4)}; ${signed(g.change.perPlayerGame, 4)}`,
      `${fix(g.listed.per1000Snaps, 3)}; ${fix(g.spot.per1000Snaps, 3)}; ${signed(g.change.per1000Snaps, 3)}`,
    ]),
  ));
  out.push("");
  out.push(table(
    ["Spot", "Group", "Player-games", "Injuries (after a game played)", "Per player-game", "Per 1,000 snaps"],
    sp.fine.map((f) => [
      f.spot, f.group ?? "-", int(f.rates.playerGames), `${int(f.rates.newTimeLoss)} (${int(f.rates.afterPlayed)})`, fix(f.rates.perPlayerGame, 4), fix(f.rates.per1000Snaps, 3),
    ]),
  ));
  out.push("");

  out.push("### Caveats for this section");
  out.push("");
  for (const line of AGE_AND_SPOT_CAVEATS) out.push(`- ${line}`);
  out.push("");
  return out;
}
