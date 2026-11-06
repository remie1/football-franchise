/**
 * The nfl-careers report (ADR-087 D5b): the real baselines as Markdown for people and JSON for the
 * career check's grader. Both carry aggregates only: no ids, no names, no row per player.
 */

import { compactJson } from "../injuries/report.js";
import type { CareerRow, ComebackRow, CrossRow, NflCareersReport, PeakRow, UsageGroup } from "./baseline.js";
import { CAREER_GROUPS, USAGE_GROUPS, type CareerGroup } from "./groups.js";
import type { CrossValues } from "./measure.js";
import {
  BY_GROUP_BY_SEASON_SEASONS, CAREER_FAMILIES, CAREER_FAMILY_KEYS, EXIT_AGE_BANDS, OTC_SIGNED_AGAIN, ROOKIE_AGE_BINS, SIGNING_AGE_BANDS,
  YEARS_IN_LEAGUE_BANDS, type AgeBand, type NflRateRow, type NflRatesByAge, type RookieAgeBin,
} from "./nflCareers.js";
import type { Estimate } from "./stats.js";

export function renderJson(r: NflCareersReport): string {
  return compactJson(r) + "\n";
}

/** What each number is, in words (Markdown only; the JSON holds numbers and labels). */
export const DEFINITIONS: readonly { readonly term: string; readonly text: string }[] = [
  { term: "Data", text: "nflverse public release assets, regular season only: weekly rosters (roster_weekly_<season>.csv, 2012-2024), PFR snap counts (snap_counts_<season>.csv, 2012-2024; 2012's file has no rows, so counts start in 2013) and the player table (players.csv, read for three columns only: pfr_id, gsis_id, birth_date). Team wins come from packages/franchise/test/fixtures/nfl-seasons.json (nflverse scores 2020-2024). 2025 is never read (held out, calibration.md §7)." },
  { term: "Age", text: "Whole years on 23 October of the season (the stand-in file's snapshot point), from the roster's birth date; for a snap player with no roster row, from the player table's." },
  { term: "Group", text: "QB, RB (RB+FB), WR, TE, OL, EDGE, IDL, LB, CB, S, K, P, LS, folded from the roster's depth_chart_position, else its position, the way the stand-in importer folds a real roster (DE and OLB are EDGE; DT and NT IDL; MLB and ILB LB; FS and SS S; a group-only LB is an outside linebacker, so EDGE; a group-only DB is a corner). Older spellings OT, OG, HB, SAF read as T, G, RB, S. A player's group in a season is the most common group over his rows on a team's list that season (over all his rows if none)." },
  { term: "The 53", text: "Status ACT or INA on the weekly roster, without an injured-reserve or COVID code and without a practice-squad (P) code: the men on a team's 53 that week, dressed or not." },
  { term: "Week-8 rows", text: "The 53s of regular-season week 8, 2018-2024; a team on its bye is read from its week-7 roster. Mean age; shares aged 22 or under, 31 or over, 34 or over; rookie share (years_exp 0); undrafted share (draft_number missing). Pooled = the mean of the seven season values, SE = their sample SD / √7." },
  { term: "Credited season", text: "On a 53 in the season's final regular-season week (17 through 2020, 18 from 2021), as the sim credits a man on a team's 53 when the regular season ends." },
  { term: "Careers", text: "Cohorts: men whose first credited season (entry) is 2012-2022 and who entered the league in 2012 or later (rookie_year). Entry group: the group on the row that credited his first season. Career length: credited seasons in total. Censored: on any team's list (53, inactive, practice squad, reserve lists, exempt) in any 2024 week. Kaplan-Meier over career length; expected career = Σ P(career ≥ k) for k = 1..15 (past 13 seasons nothing is observed and the curve is carried flat); reach 5 = P(career ≥ 5), reach 10 = P(career ≥ 10). SE: bootstrap over players." },
  { term: "Position families", text: "QB; SKILL = RB, WR, TE; LINE = OL, IDL, EDGE; BACK_SEVEN = LB, CB, S; SPECIALISTS = K, P, LS (ADR-087 §11). A family's careers are one Kaplan-Meier over its member groups' entrants pooled, with its own bootstrap, the same way as a group's." },
  { term: "Snap share", text: "Per player-season (no K/P/LS): his side is offense or defense, whichever he played more; his team the one he logged the most snaps with; share = his snaps on that side for that team / the sum over that team's games of the game's busiest same-side man's snaps for that team (games he missed count zero). Special-teams-only seasons have share 0." },
  { term: "Peak usage age", text: "For seasons Y, Y+1 (2013-2024) with at least one snap of any kind in both, delta = share(Y+1) − share(Y), at his age in Y. Mean delta by age per group over ages with at least the minimum pairs, smoothed with a centered 3-age moving average; peak = the first age whose smoothed delta is ≤ 0 after an earlier age's was > 0. 'With exits' also counts Y+1 with no snaps as share 0. SE: bootstrap over players; 'resolved' is the share of replicates that found a peak." },
  { term: "Comebacks", text: "P(credited again in Y+2 | credited in Y and on no team's list in any week of Y+1), Y = 2016-2022: practice squads are listed in the weekly rosters only from 2017. Reported only. SE: bootstrap over players." },
  { term: "Wins", text: "Year-over-year win r: Pearson r of team wins in Y and Y+1 for 2020→21, 21→22, 22→23, 23→24; their mean, SE = their sample SD / √4. Win spread: the population SD of team wins each season 2021-2024 (as the season checks compute it), their mean, SE = sample SD / √4. A tie is half a win." },
  { term: "Rookies' ages", text: "Rookies (years_exp 0, as for the rookie share) on the week-8 53s, 2018-2024, pooled over the seasons' men (not the mean of the season values). Age on 23 October in whole years, and with the fraction kept (days lived / 365.2425); SD = the sample SD of the fractional ages. Drafted = a draft pick on his row. Rookies with no birth date are left out of every age." },
  { term: "Retired list", text: "A row with code R02 (Reserve/Retired) and status RET (2021-2024) or RES (2020, its first season) in some regular-season week. Cases: men credited in Y-1, Y = 2021-2024; a case is on the list when he has such a row in season Y. Age and years in the league (years_exp) in Y-1. 'Every man on the list' counts each man once per season he is on it, credited the year before or not, with age and years in Y. SE: bootstrap over players." },
  { term: "Back on a 53", text: "Cases: men credited in Y, Y = 2016-2022; a case is back when he is on a 53 (the 53 as above) in some regular-season week of Y+1 or Y+2. Age in Y. A man under contract counts whether or not he signed again. SE: bootstrap over players." },
  { term: "Starters gone", text: "Cases: starters credited in Y, Y = 2016-2022. A starter has at least 50% of his main team's snaps on his side that season (the snap share above); kickers, punters and snappers never are. A case is gone when he is on no team's list (any status) in any regular-season week of Y+1 and of Y+2; a man on the retired list is on no list. Age in Y. SE: bootstrap over players." },
];

/** Where the measurement had to depart from the written shared definitions, and why. */
export const DEPARTURES: readonly string[] = [
  "The 53 is ACT or INA, not ACT alone. From 2019 the weekly roster splits the 53 into ACT (dressed for the game) and INA (game-day inactive); ACT alone holds 46-48 men a team, not the 53 the sim's team.roster holds. In 2012-2018 ACT is the whole 53 and nothing changes. The ACT-only reading is shown beside the headline.",
  "A team on its week-8 bye has no week-8 rows (2-6 teams a season); its week-7 roster stands in, so all 32 teams count.",
  "'Never credited before 2012' is read as 'entered the league in 2012 or later' (rookie_year), because no roster before 2012 is read. It also leaves out men who were on a list before 2012 without a credited season, as the sim leaves out every man already in the stand-in file.",
  "The player table is read for gsis_id as well as pfr_id and birth_date: snap counts carry only PFR ids, and the weekly rosters carry a PFR id for only about half of them, so the GSIS id joins a snap player to his roster rows, which give his group (PFR's snap position lumps all linebackers as LB and cannot tell EDGE from LB). last_season, status and every other column are never read.",
  "'On any roster (any status)' leaves out rows that say he has left: cut, retired, traded away, free agent. 2017-2019 list cut men for weeks after their release.",
  "Comebacks use Y = 2016-2022 only: before 2017 the weekly rosters do not list practice squads, so a practice-squad year would read as out of the league.",
];

export const LIMITS: readonly string[] = [
  "Usage mixes ability with coaching and contracts, and survivors: peak usage age is when teams use a man most, not when he is best.",
  "Real data cannot tell a retirement from nobody calling: a career ends when he is never again on a 53 in a final week.",
  "Careers entering in 2012 can be followed for 13 seasons at most; the restricted mean's last two terms are carried flat from the 13th.",
  "Weekly rosters before 2016 under-list week 8 (about 47 a team); the week-8 rows start in 2018. Final-week rosters are whole in every season.",
  "Snap counts are PFR's per game; a man traded in season is counted with the team he played most for, so his share understates his season.",
  "2016-2019 rosters list some linebackers and defensive backs by group only (LB, DB); the importer's rule reads them as outside linebackers (EDGE) and corners, which moves some inside linebackers and safeties into EDGE and CB in those seasons.",
  "Rookies' ages count only rookies still on a 53 at week 8: men cut in camp, on reserve lists or on practice squads are not in them.",
  "The retired list exists in these files only from 2020, and it holds only men under contract: a man who retires unsigned, or after his release, gets no code. Its rates are lower bounds on retiring by age, not retirement rates.",
  "Exits by age read survivors: the men still on a 53 at 33 are the durable and the wanted. Back on a 53 counts men still under contract, so it is looser than signed again; starters gone also holds injuries, suspensions and men cut in camp.",
];

// ---------------------------------------------------------------- formatting

const pct = (x: number, d = 1): string => `${(x * 100).toFixed(d)}%`;
const fix = (x: number, d = 2): string => x.toFixed(d);
const int = (x: number): string => Math.round(x).toLocaleString("en-US");
const pe = (e: Estimate, d = 1): string => `${pct(e.value, d)} ± ${pct(e.se, d)}`;
const fe = (e: Estimate, d = 2): string => `${fix(e.value, d)} ± ${fix(e.se, d)}`;

function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]) => `| ${cells.join(" | ")} |`;
  return [line(head), line(head.map(() => "---")), ...rows.map(line)].join("\n");
}

const crossCells = (c: CrossRow): string[] => [fe(c.meanAge), pe(c.age22OrUnder), pe(c.age31Plus), pe(c.age34Plus), pe(c.rookie), pe(c.undrafted)];
const valueCells = (c: CrossValues): string[] => [int(c.n), fix(c.meanAge), pct(c.age22OrUnder), pct(c.age31Plus), pct(c.age34Plus), pct(c.rookie), pct(c.undrafted)];
const peakCell = (p: PeakRow): string => (p.peakAge === null ? `none (${pct(p.resolved, 0)} of replicates found one)` : `${p.peakAge.value} ± ${fix(p.peakAge.se, 2)} (${pct(p.resolved, 0)})`);
const careerCells = (c: CareerRow): string[] => [int(c.entrants), int(c.censored), fe(c.expectedCareer), pe(c.reach5), pe(c.reach10)];
const comebackCells = (c: ComebackRow): string[] => [int(c.cases), int(c.back), c.cases === 0 ? "-" : pe(c.share)];

// ---------------------------------------------------------------- 2026-11-06 sections

const BIN_LABEL: Readonly<Record<RookieAgeBin, string>> = {
  upTo20: "20 or under", age21: "21", age22: "22", age23: "23", age24: "24", age25: "25", from26: "26 or older",
};
const BAND_LABEL: Readonly<Record<string, string>> = {
  upTo25: "25 and under", upTo26: "26 and under", age26To28: "26-28", age27To28: "27-28", age29To30: "29-30", age31To32: "31-32", from33: "33 and over",
  exp0: "0", exp1To2: "1-2", exp3To5: "3-5", exp6To9: "6-9", exp10Plus: "10 and more",
};
const rateCells = (x: NflRateRow): string[] => [int(x.n), int(x.count), x.n === 0 ? "-" : pe(x.share, 2)];
const bandRows = <K extends string>(bands: readonly AgeBand<K>[], rows: Readonly<Record<K, NflRateRow>>): string[][] =>
  bands.map((b) => [BAND_LABEL[b.key] ?? b.key, ...rateCells(rows[b.key])]);
const allRow = <K extends string>(rates: NflRatesByAge<K>): string[] => [`All (${int(rates.noBirthDate)} with no birth date among them)`, ...rateCells(rates.all)];

function rookieSections(r: NflCareersReport, w8span: string): string[] {
  const a = r.weekEight.rookieAge;
  const out: string[] = [];
  out.push(`## Rookies' ages at week 8, ${w8span} (REAL)`);
  out.push("");
  out.push(
    `REAL, counted from the weekly rosters: rookies (years_exp 0) on the week-8 53s, pooled over the ${r.weekEight.perSeason.length} seasons' men. ` +
      `Ages on 23 October; rookies with no birth date are left out (${int(a.noBirthDate)} of them). Survivors only: rookies cut in camp, on reserve lists or on practice squads are not here.`,
  );
  out.push("");
  out.push(table(["", "Rookies", "Mean age (whole years)", "Mean age (fractional)", "SD (fractional)"], [
    ["All", int(a.n), fix(a.meanWhole), fix(a.meanFractional), fix(a.sd)],
    ["Drafted", int(a.draftedN), "", fix(a.draftedMeanFractional), ""],
    ["Undrafted", int(a.undraftedN), "", fix(a.undraftedMeanFractional), ""],
  ]));
  out.push("");
  out.push("Share of the rookies by whole years on 23 October:");
  out.push("");
  out.push(table(ROOKIE_AGE_BINS.map((b) => BIN_LABEL[b]), [ROOKIE_AGE_BINS.map((b) => pct(a.shareByWholeYear[b]))]));
  out.push("");
  out.push("By season:");
  out.push("");
  out.push(table(["Season", "Rookies", "Mean age (whole years)", "Mean age (fractional)"],
    a.perSeason.map((s) => [String(s.season), int(s.n), fix(s.meanWhole), fix(s.meanFractional)])));
  out.push("");

  const seasons = r.weekEight.perSeason.filter((s) => BY_GROUP_BY_SEASON_SEASONS.includes(s.season));
  if (seasons.length > 0) {
    const label = seasons.map((s) => String(s.season)).join(" / ");
    out.push(`## Week 8 by group, season by season, ${seasons[0]!.season}-${seasons[seasons.length - 1]!.season} (REAL)`);
    out.push("");
    out.push(
      `REAL: the by-group values of the seasons the league's week-8 rows are graded on, copied into \`NFL_CAREERS\` as \`weekEight.byGroupBySeason\`. Each cell reads ${label}. ` +
        "Kickers, punters and long snappers are about 32 men a season, so one season's share moves by several points by chance.",
    );
    out.push("");
    const cell = (f: (v: CrossValues) => number, show: (x: number) => string) => (g: CareerGroup) => seasons.map((s) => show(f(s.byGroup[g]))).join(" / ");
    out.push(table(["Group", "Men", "22 or under", "31 or over", "34 or over"], CAREER_GROUPS.map((g) => [
      g, cell((v) => v.n, int)(g), cell((v) => v.age22OrUnder, pct)(g), cell((v) => v.age31Plus, pct)(g), cell((v) => v.age34Plus, pct)(g),
    ])));
    out.push("");
  }
  return out;
}

function exitSections(r: NflCareersReport): string[] {
  const out: string[] = [];
  const t = r.retiredList;
  out.push(`## The reserve/retired list, Y = ${t.seasons[0]}-${t.seasons[1]} (REAL, a lower bound)`);
  out.push("");
  out.push(
    "REAL, counted from the weekly rosters. Of men credited in Y-1 (on a final-week 53), the share with a reserve/retired row (code R02) in some regular-season week of Y. " +
      `The code is in these files only from 2020 (RES with R02 that season, RET with R02 from 2021), so Y starts in ${t.seasons[0]}. ${t.note}`,
  );
  out.push("");
  out.push(table(["Age in Y-1", "Credited in Y-1", "On the retired list in Y", "Share"], [
    ...bandRows(EXIT_AGE_BANDS, t.byAge),
    [`All (${int(t.noBirthDate)} with no birth date among them)`, ...rateCells(t.all)],
  ]));
  out.push("");
  out.push(table(["Years in the league in Y-1", "Credited in Y-1", "On the retired list in Y", "Share"], [
    ...bandRows(YEARS_IN_LEAGUE_BANDS, t.byYearsInLeague),
    [`Unknown`, int(t.noYearsInLeague), "", ""],
  ]));
  out.push("");
  const p = t.placements;
  out.push(`Every man on the retired list in Y, ${t.seasons[0]}-${t.seasons[1]}, once per man and season, credited the year before or not: ${int(p.total)}. By age and by years in the league in Y:`);
  out.push("");
  out.push(table([...EXIT_AGE_BANDS.map((b) => BAND_LABEL[b.key]!), "No birth date"], [[...EXIT_AGE_BANDS.map((b) => int(p.byAge[b.key])), int(p.noBirthDate)]]));
  out.push("");
  out.push(table([...YEARS_IN_LEAGUE_BANDS.map((b) => `${BAND_LABEL[b.key]!} years`), "Unknown"], [[...YEARS_IN_LEAGUE_BANDS.map((b) => int(p.byYearsInLeague[b.key])), int(p.noYearsInLeague)]]));
  out.push("");

  const e = r.exitsByAge;
  out.push(`## Exits by age, Y = ${e.seasons[0]}-${e.seasons[1]} (REAL)`);
  out.push("");
  out.push(
    "REAL, counted from the weekly rosters and snap counts; ages in Y; Y+2 is at most 2024, so 2025 is never read. " +
      "Survivors: the men still on a 53 at 33 are the durable and the wanted.",
  );
  out.push("");
  const otc = OTC_SIGNED_AGAIN;
  out.push(
    "Back on a 53: of men credited in Y, the share on a 53 in some regular-season week of Y+1 or Y+2. This counts men still under contract, so it is looser than \"signed again\". " +
      `Beside it, REPORTED and not measured by this command: of expiring deals of at least ${pct(otc.minCapShare)} of the cap that ran out in ${otc.seasons[0]}-${otc.seasons[1]}, ` +
      `the share signed again within ${otc.withinYears} years (OverTheCap data via nflverse, counted by the salary-cap thread, ADR-085 step 12; n = ${int(otc.n)} deals, no count by age; about half of the next deals were for one year).`,
  );
  out.push("");
  out.push(table(["Age in Y", "Credited in Y", "On a 53 in Y+1 or Y+2", "Share", "Signed again within two years (OverTheCap, REPORTED)"], [
    ...SIGNING_AGE_BANDS.map((b) => [BAND_LABEL[b.key]!, ...rateCells(e.backOnA53.byAge[b.key]), pct(otc.byAge[b.key], 0)]),
    [...allRow(e.backOnA53), ""],
  ]));
  out.push("");
  out.push(
    `Starters gone: of starters (at least ${pct(e.startersGone.minShare, 0)} of his main team's snaps on his side) credited in Y, the share on no team's list in any regular-season week of Y+1 and of Y+2. ` +
      "A proxy for leaving while still wanted; it also holds injuries, suspensions and men cut in camp.",
  );
  out.push("");
  out.push(table(["Age in Y", "Starters credited in Y", "On no list in Y+1 or Y+2", "Share"], [
    ...bandRows(EXIT_AGE_BANDS, e.startersGone.byAge),
    allRow(e.startersGone),
  ]));
  out.push("");
  return out;
}

export function renderMarkdown(r: NflCareersReport): string {
  const out: string[] = [];
  const w8 = r.seasons.weekEight;
  const w8span = `${w8[0]}-${w8[w8.length - 1]}`;
  out.push("# Real NFL careers (ADR-087 D5b)");
  out.push("");
  out.push(
    `The real side of the 20-season career check, measured ${r.measuredOn} from nflverse's public weekly rosters, snap counts and player table ` +
      `(seasons ${r.seasons.read[0]}-${r.seasons.read[1]}) and the franchise package's real results fixture. 2025 is not read (held out, calibration.md §7). ` +
      "Aggregates only: no ids, no names, no row per player. Every number is defined under **Definitions**; where the measurement departs from the written shared definitions it says so under **Departures**.",
  );
  out.push("");
  out.push("Regenerate: `pnpm --filter @ff/calibration nfl-careers` (downloads once into `data-cache/injury-rates/raw/`; `-- --refresh` downloads again; `-- --out <path>` writes elsewhere). Numbers below are MEASURED; ± is one standard error.");
  out.push("");

  out.push(`## Week 8: the 53s, ${w8span}`);
  out.push("");
  out.push(table(["", "Mean age", "22 or under", "31 or over", "34 or over", "Rookies", "Undrafted"], [
    ["League (ACT or INA)", ...crossCells(r.weekEight.pooled.league)],
    ["League, ACT alone (variant)", ...crossCells(r.weekEight.actOnly)],
    ...CAREER_GROUPS.map((g) => [g, ...crossCells(r.weekEight.pooled.byGroup[g])]),
  ]));
  out.push("");
  out.push("By season, league:");
  out.push("");
  out.push(table(["Season", "Men", "Mean age", "22 or under", "31 or over", "34 or over", "Rookies", "Undrafted", "Bye teams from week 7"],
    r.weekEight.perSeason.map((s) => [String(s.season), ...valueCells(s.league), String(s.byeFilled)])));
  out.push("");
  out.push(...rookieSections(r, w8span));

  out.push(`## Peak usage age, ${r.seasons.usage[0]}-${r.seasons.usage[1]}`);
  out.push("");
  out.push(`Ages with at least ${r.peakUsage.minPairsPerAge} pairs. In brackets: the share of bootstrap replicates that found a peak.`);
  out.push("");
  out.push(table(["Group", "Pairs", "Players", "Peak age", "Pairs with exits", "Peak age with exits"],
    (USAGE_GROUPS as readonly UsageGroup[]).map((g) => {
      const u = r.peakUsage.byGroup[g];
      return [g, int(u.stayers.pairs), int(u.stayers.playerCount), peakCell(u.stayers), int(u.withExits.pairs), peakCell(u.withExits)];
    })));
  out.push("");
  const ages = [...new Set((USAGE_GROUPS as readonly UsageGroup[]).flatMap((g) => r.peakUsage.byGroup[g].stayers.curve.map((p) => p.age)))].sort((a, b) => a - b);
  out.push("Smoothed mean change in snap share by age (stayers; percentage points of the side's snaps):");
  out.push("");
  out.push(table(["Age", ...USAGE_GROUPS], ages.map((a) => [String(a), ...(USAGE_GROUPS as readonly UsageGroup[]).map((g) => {
    const p = r.peakUsage.byGroup[g].stayers.curve.find((x) => x.age === a);
    return p === undefined ? "" : (p.smoothed * 100).toFixed(1);
  })])));
  out.push("");

  out.push(`## Careers by entry group, entering ${r.seasons.careerEntry[0]}-${r.seasons.careerEntry[1]}`);
  out.push("");
  out.push(`Followed through ${r.seasons.lastObserved}. Kaplan-Meier over credited seasons; expected career is the mean to ${r.careers.horizon} seasons.`);
  out.push("");
  out.push(table(["Group", "Entrants", "Censored", "Expected career (seasons)", "Reach 5", "Reach 10"], [
    ["League", ...careerCells(r.careers.league)],
    ...CAREER_GROUPS.map((g) => [g, ...careerCells(r.careers.byGroup[g])]),
  ]));
  out.push("");
  out.push("By position family (the member groups' entrants pooled, one Kaplan-Meier each):");
  out.push("");
  out.push(table(["Family", "Entrants", "Censored", "Expected career (seasons)", "Reach 5", "Reach 10"],
    CAREER_FAMILY_KEYS.map((f) => [`${f} (${CAREER_FAMILIES[f].join(", ")})`, ...careerCells(r.careers.byFamily[f])])));
  out.push("");

  out.push(`## Back after a season out, Y = ${r.seasons.comebacks[0]}-${r.seasons.comebacks[1]} (reported only)`);
  out.push("");
  out.push(table(["Group", "Credited in Y, on no list in Y+1", "Credited in Y+2", "Share"], [
    ["League", ...comebackCells(r.comebacks.league)],
    ...CAREER_GROUPS.map((g) => [g, ...comebackCells(r.comebacks.byGroup[g])]),
  ]));
  out.push("");
  out.push(...exitSections(r));

  out.push("## Team wins");
  out.push("");
  const yoy = r.wins.yearOverYear;
  out.push(table(["", "Value"], [
    [`Year-over-year win r, mean of ${yoy.transitions.length} transitions`, fe(yoy.r)],
    ...yoy.transitions.map((t) => [`${t.from} → ${t.from + 1}`, fix(t.r, 3)]),
    ["All transitions as one sample", fix(yoy.pooledR, 3)],
    [`Win spread (SD of wins), mean of ${r.wins.spread.bySeason.length} seasons`, fe(r.wins.spread.spread)],
    ...r.wins.spread.bySeason.map((s) => [String(s.season), fix(s.sd, 2)]),
  ]));
  out.push("");

  out.push("## Coverage");
  out.push("");
  const c = r.coverage;
  const entry = `${r.seasons.careerEntry[0]}-${r.seasons.careerEntry[1]}`;
  out.push(table(["", "Count"], [
    ["Regular-season roster rows read", int(c.rosterRows)],
    ["Regular-season snap rows read", int(c.snapRows)],
    ["Snap player-seasons", int(c.snapPlayerSeasons)],
    ["... joined to the rosters by the roster's own PFR id", int(c.linkedByRoster)],
    ["... joined through the player table's GSIS id", int(c.linkedByPlayerTable)],
    ["... not joined", int(c.unlinked)],
    ["... group from the snap-count position (no roster row that season)", int(c.groupFromSnapPosition)],
    ["... no birth date", int(c.noBirthDate)],
    ["Career entrants with no readable entry position", int(c.entrantsNoGroup)],
    [`First credited ${entry} but entered the league before ${r.seasons.careerEntry[0]} (left out)`, int(c.enteredBeforeWindow)],
    [`First credited ${entry} but no entry year on any row (left out)`, int(c.noEntryYear)],
  ]));
  out.push("");
  out.push(`Bootstrap: ${r.bootstrap.replicates} replicates per row from the seeded PRNG (@ff/contracts), seed string \`${r.bootstrap.seed}\`.`);
  out.push("");

  out.push("## Definitions");
  out.push("");
  for (const d of DEFINITIONS) out.push(`- **${d.term}.** ${d.text}`);
  out.push("");
  out.push("## Departures from the written definitions");
  out.push("");
  for (const d of DEPARTURES) out.push(`- ${d}`);
  out.push("");
  out.push("## Limits");
  out.push("");
  for (const l of LIMITS) out.push(`- ${l}`);
  out.push("");
  out.push("## Sources");
  out.push("");
  out.push(table(["Asset", "Bytes", "sha256", "Fetched"], r.sources.map((s) => [`${s.tag}/${s.asset}`, int(s.bytes), `\`${s.sha256.replace(/^sha256:/, "").slice(0, 12)}\``, s.fetchedAt.slice(0, 10)])));
  out.push("");
  return out.join("\n");
}
