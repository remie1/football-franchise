/**
 * The injury-rates report (ADR-087 §5, build step E): the measurement as Markdown for people and
 * JSON for the franchise injury table, with every definition and its limits written out.
 */

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
  return compactJson({ ...r, definitions: DEFINITIONS, limits: LIMITS }) + "\n";
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
