/**
 * THE 20-SEASON CHECK'S GRADER (ADR-087 §9, row D5b; the D5b plan's "Bands (CHOSEN)" as the owner's
 * answers of 2026-10-31 and 2026-11-01 set them, ADR-087 §11).
 *
 * Pure: the cached rows of the grade seeds (and of the coach-style arms' seeds), the real league's
 * numbers (`NFL_CAREERS`, `NFL_DRAFT`) and the years each band is judged on go in; one grade comes
 * out, with a Markdown and a JSON rendering. Nothing is read from disk here and nothing is drawn.
 *
 * THE OWNER'S ANSWERS (decision cards, 2026-10-31 and 2026-11-01; ADR-087 §11). `CAREER_BANDS` is
 * the source of truth for every line, and a row that a card's answer set names that card:
 *  - Drift, "Loose: 3 points": the mean overall on the 53s within 3 points of year 0 every season
 *    2029-45 (GATE); the mean of 2036-45 within ±1.0 is reported only. The pooled within-group sd
 *    keeps its own line, 2036-45 within ±10% (GATE; the Drift card did not ask about it).
 *  - Spread, "The league file as loaded" (2026-11-01): the pooled within-group sd's line is measured
 *    from the league file as loaded (`CareerCheckRows.file`: its 53s before the walk signs anyone),
 *    not year 0's week 8, whose spread carries the stopgap kickers (and a few punters) the walk
 *    signs for injuries. Year 0's value is shown beside it, reported. The Drift rows keep year 0.
 *  - Close, "Close": league mean age ±0.5, the 31-and-over share ±3 points, peak usage age per
 *    group ±1.5 years, expected career ±20% (GATE).
 *  - Old, "Hold until teams cut sooner": the 34-and-over share (at most the NFL's + 2 points) and
 *    reaching ten seasons (±3 points) are GATE: they block the flip.
 *  - Even, "Fix first, block below 2.75": the win spread, mean of 2029-45, at least 2.75 (GATE, a
 *    floor only); the NFL's band 2.75-3.35 is reported beside it, so a league too uneven still shows.
 *  - Floor, "Keep floor; judge growth vs season one" (2026-11-01): 2.75 stays the GATE for the flip.
 *    A growth or draft-talent tuning round is judged on whether the later seasons stay as spread out
 *    as season one: the mean of 2029-45 at least season one's spread on the same seeds (reported, a
 *    `notBelow` check: at or above passes; a shortfall within 2·√(SE_sim² + SE_ref²) is not
 *    resolvable; further below fails). Season one itself sits near 2.5 with both switches on, so
 *    the rest of the gap to 2.75 waits on the engine and roster building, not on growth.
 *  - Rookies and Aged set tuning policy (draft talent tuned with growth and the draft check re-run;
 *    only the real veterans aged once): nothing to grade beyond D7's rows.
 * No row is marked OWNER any more. The mark and `GradeInput.ownerAnswers` stay for a later card (an
 * OWNER row with no answer would block the flip as a GATE row does); today they change nothing.
 *
 * The readings recorded with the answers (CHOSEN):
 *  - Week-8 league rows (mean age, 22 or under, 31 and over, 34 and over, rookies, undrafted) are set
 *    against the latest three real seasons, 2022-24: the mean of the three season values, SE their
 *    sample SD over √3 (`weekEightLeagueReference`). Group mean ages keep the pooled 2018-24 values.
 *  - Careers are graded by entry group, by position family (`CAREER_FAMILIES`: QB; RB-WR-TE;
 *    OL-IDL-EDGE; LB-CB-S; K-P-LS) and league-wide, all GATE.
 *  - D7 (ADR-086 §13 judged it by reading): starter rate by round band within ±0.10 of `NFL_DRAFT`
 *    (GATE); ever a starter by round band within ±0.10 and round-1 share by group, reported.
 *  - Rookie = a man's first season on a team (the real rosters' years_exp 0); "no credited season
 *    yet" is shown beside it.
 *
 * How a row is graded:
 *  - Pooling: each seed gives one value per check (a year's value, or its mean over the judged
 *    years); the pooled value is the mean over seeds. Careers and peak usage are read on the seeds'
 *    entrants and usage cells pooled together (the same functions the reader uses), as the real side
 *    reads its players pooled.
 *  - Standard errors: the sim's is the seed-to-seed sample SD over √seeds (none with fewer than two
 *    seeds); the reference's is the real side's own (`Estimate.se`), or for year 0 the seed-to-seed
 *    SE of year 0, for the league file as loaded its seed-to-seed SE (0 when every seed loads the
 *    same file), for season one its seed-to-seed SE. A fixed number the owner set (the win spread's
 *    floor) and `NFL_DRAFT` carry none.
 *  - "Not resolvable" (the gross-miss rule): a check whose band half-width is under
 *    2·√(SE_sim² + SE_ref²) and whose value is in the band or outside it by no more than that
 *    2·√(...): a miss that could be noise. A value further outside its band than 2·√(...) fails
 *    whatever the half-width, so a wide reference SE cannot let a gross miss pass. One-sided bands
 *    use their allowance as the half-width (NFL + 2 points: 2 points; 2×: the reference itself). A
 *    floor (the win spread's 2.75, the coach-style 5% of slots) is a fixed number with no reference
 *    SE and is never unresolved, whatever the sim's SE: below it fails, at or above it passes. Not
 *    below a reference (`notBelow`, the win spread against season one) has no allowance: at or above
 *    it passes; below it follows the gross-miss rule (by no more than 2·√(...), not resolvable;
 *    further, a fail). The grade lists the checks the reference's own SE leaves unresolvable whatever the sim does
 *    (half-width under 2·SE_ref): they can fail only by a gross miss.
 *  - A row fails if any check in it fails; otherwise it has no data if any check has no value, no SE
 *    if any check has no seed-to-seed SE (one seed), not resolvable if any check is, else it passes.
 *    No data and no SE block a pass without failing. A REPORT row is shown with each check's own
 *    status and never blocks.
 *  - The flip rule: recommended iff every grade seed is in, there are at least two, every
 *    coach-style seed has both arms, and every GATE row passes or is not resolvable (the coach-style
 *    rows, the Old rows and D7's starter rate among them). This is ADR-087 §11's wording, which
 *    leaves out the D5b plan's separate clause that "the coach-style check passes": a coach-style
 *    row that is not resolvable does not block. The slots row is a floor and never unresolved, so
 *    only the sd row can be.
 *  - Careers: the real careers can be followed for at most 13 seasons (entry 2012, last observed
 *    2024), so the real survival curve is carried flat past 13; the sim's is carried flat past the
 *    same point (`followUp`) before the restricted mean is taken, so both sides' expected careers
 *    cover the same horizon. Reach 5 and reach 10 sit inside it and are not touched.
 *  - The week-8 league rows show the league's own 2018-24 values season by season and their trend
 *    beside the 2022-24 reference, and year 0 (the real league of 2026 as the walk plays it) against
 *    the same band, reported.
 *
 * ADDED FOR THE OWNER'S AGING RULINGS OF 2026-11-06 (rows version 5). Every row added here is REPORT:
 * shown, never blocking. One change reaches GATE rows: the NFL comparison rows (mean age, the 22-or-
 * under, 31+ and 34+ shares, rookies, undrafted, and the group mean ages) now read the 53s counted
 * like the NFL (`SeasonRow.week8Nfl`: the men out 4+ weeks left out, as the real count leaves out
 * injured reserve), where they read the sim's whole rosters before. Rows written before version 5
 * have no such count and read as no data there. The drift and coach-style rows keep `week8`.
 *  - The later window (`GradeWindows.later`, 2033-45): a REPORTED check beside each early check of the
 *    NFL rows, the group rows, peak usage, the win spread and win r, and the other-report row.
 *  - Shares 31+ and 34+ by group, against the 2022-24 seasons (mean of the three) and 2018-24 pooled.
 *  - Signed again within two years by age (`market.expiries`) against OverTheCap's REPORTED rates
 *    (`OTC_SIGNED_AGAIN`: no SE, age convention unknown, so the sim's age in Y and in Y + 1 are both
 *    shown), the league file's deals whose early years the importer cut (`ExpiryRecord.t`) left out
 *    of the rates and shown apart; back on a 53 within two seasons (`exitsByAge.backOnA53`), the
 *    sim's 53s counted like the NFL as the real side's leave out injured reserve.
 *  - Retirements: by his own choice while signed within a year of a final-week 53, against the
 *    reserve/retired list (a lower bound); starters gone two seasons (`exitsByAge.startersGone`).
 *  - Rookies' ages on the week-8 53s (`weekEight.rookieAge`); availability by age (ours only: no real
 *    availability by age is merged).
 *  - The NFL count itself (`nfl-count`): the NFL rows' league readings on the weeks-left variant
 *    (`week8NflWeeksLeft`) and on the whole 53s beside the band reading they are graded on, and the
 *    men each reading leaves out with the teams' sizes (`nflCount`), so the CHOSEN band can be judged.
 * Bands on these rows are CHOSEN (they never block); references are REAL except OverTheCap's, which
 * is REPORTED by the cap thread.
 *
 * ADDED FOR THE AGING REDESIGN (ADR-087 §12, step AB1; rows version 6): measure-only rows, every one
 * REPORT with no band (`agingRedesignRows`): shown with the sim's MEASURED values beside a reference
 * (REAL, or the walk's own year 0), never graded, never blocking; no GATE row reads them. Ability-group
 * means by age and the combine measures by age; the 99s by group, age and rating, and the SMARTS
 * share; football time-loss injuries per snap by age (with the real side's spot-mix ratio) and by
 * spot played; concussions out 4+ weeks, first and later and by age, and durability by concussions
 * had; contact per snap by spot (roll sets, information only) and career contact at 27 (AB6's
 * `free`); the share of game weeks missed hurt by age on the real side's definition; retirements by
 * moment and by years in the league; the teams' overall spread and year-to-year r beside the win
 * spread and win r; D7's starter rate by round band and age. The real injury numbers are
 * `NFL_INJURIES` (`injuries/nflInjuries.ts`, copied from `reports/injury-rates.json`). Rows written
 * before version 6 have none of these readings: the loader refuses to grade two versions together
 * (`checkRecordVersion`), and a row that lacks them shows no data.
 */
import {
  bandOf as ageBandOf, BY_GROUP_BY_SEASON_SEASONS, CAREER_FAMILIES, CAREER_FAMILY_KEYS, EXIT_AGE_BANDS, NFL_CAREERS, OTC_SIGNED_AGAIN, ROOKIE_AGE_BINS,
  rookieAgeBin, SIGNING_AGE_BANDS, YEARS_IN_LEAGUE_BANDS, type AgeBand, type CareerFamily, type NflCareers, type NflGroupAgeShares, type NflWeekEightSeason, type ReportedSignedAgain,
} from "../careers/nflCareers.js";
import type { Estimate } from "../careers/stats.js";
import { ABILITY_GROUPS, type AbilityGroup, type Position } from "@ff/contracts";
import { NFL_INJURIES, REAL_SPOT_OF, type NflInjuries } from "../injuries/nflInjuries.js";
import { ABILITY_GROUP_COPY, CONCUSSION_CLASSES, INJURY_SPOT_GROUP, SPECIALIST_SPOTS, SPOT_ORDER } from "./careerAging.js";
import {
  addCells, CAREER_GROUPS, kaplanMeier, lifeTable, pearson, RETIREMENT_MOMENTS, RETIREMENT_WAYS, SPECIALIST_GROUPS, usagePeak,
  type CareerCheckRows, type CareerEntrant, type CareerGroup, type GroupPicture, type NflCount, type RetirementWay, type RosterPicture, type SeasonRow, type UsageCell,
} from "./careerCheck.js";
import { NFL_DRAFT } from "./draftCheck.js";

// --- the bands -----------------------------------------------------------------------------------

/**
 * GATE blocks the flip unless the row passes or is not resolvable; REPORT is shown and never blocks.
 * OWNER (no row today): GATE or REPORT by the owner's answer on its card; with no answer, it blocks
 * the flip as a GATE row does.
 */
export type BandMark = "GATE" | "REPORT" | "OWNER";
export type OwnerCard = "Drift" | "Close" | "Old" | "Even" | "Spread" | "Floor";

/** How a check is judged against its reference. */
export type BandRule =
  | { readonly kind: "abs"; readonly half: number; readonly halfFor?: Readonly<Partial<Record<string, number>>> }
  | { readonly kind: "rel"; readonly frac: number }
  | { readonly kind: "atMost"; readonly plus: number }
  | { readonly kind: "atMostTimes"; readonly times: number }
  | { readonly kind: "atLeast"; readonly min: number }
  | { readonly kind: "range"; readonly lo: number; readonly hi: number }
  /** At least the reference itself, no allowance (the win spread against season one). */
  | { readonly kind: "notBelow" }
  | { readonly kind: "order" }
  | { readonly kind: "report" };

export interface CareerBand {
  readonly id: string;
  /** The row, its reference and its band, in plain words. */
  readonly row: string;
  readonly reference: string;
  readonly band: string;
  readonly mark: BandMark;
  /** The owner's card whose answer set the row's band or mark (ADR-087 §11); none for a plan line no card asked about. */
  readonly card?: OwnerCard;
  /** The years it is judged on, and how. */
  readonly judged: string;
  readonly rule: BandRule;
}

/** The week-8 league rows' reference years: the latest three real seasons (ADR-087 §11). */
export const WEEK_EIGHT_LEAGUE_YEARS: readonly [number, number] = [2022, 2024];
const W8_LEAGUE = `NFL wk 8, ${WEEK_EIGHT_LEAGUE_YEARS[0]}-${String(WEEK_EIGHT_LEAGUE_YEARS[1]).slice(2)} (mean of the three seasons)`;
const W8_GROUP = "NFL wk 8, 2018-24 (pooled)";
const W8_GROUP_SEASONS = `NFL wk 8 by group, ${BY_GROUP_BY_SEASON_SEASONS[0]}-${String(BY_GROUP_BY_SEASON_SEASONS[BY_GROUP_BY_SEASON_SEASONS.length - 1]).slice(2)} (mean of the three seasons) and 2018-24 (pooled)`;
const CAREERS_REF = "NFL exit hazard, entry 2012-22";
const CAREERS_JUDGED = "in-run entrants with two seasons to follow, seeds pooled";

/**
 * The bands, one entry per graded line: the plan's (CHOSEN) as the owner's answers of 2026-10-31 and
 * 2026-11-01 and the readings recorded with them set them (ADR-087 §11). Shares are 0-1 (3 points = 0.03).
 * "2029-45" and "2036-45" are the years the plan names; a band that names none is judged on 2029-45.
 */
export const CAREER_BANDS: readonly CareerBand[] = [
  { id: "overall-mean-each", row: "Mean overall on the 53", reference: "Year 0", band: "within 3 points each year 2029-45", mark: "GATE", card: "Drift", judged: "each year 2029-45", rule: { kind: "abs", half: 3 } },
  { id: "overall-mean-late", row: "Mean overall on the 53, late mean", reference: "Year 0", band: "mean of 2036-45 within ±1.0 (reported)", mark: "REPORT", card: "Drift", judged: "mean of 2036-45", rule: { kind: "abs", half: 1.0 } },
  { id: "pooled-sd", row: "Pooled within-group sd", reference: "The league file as loaded", band: "2036-45 within ±10%", mark: "GATE", card: "Spread", judged: "mean of 2036-45", rule: { kind: "rel", frac: 0.10 } },
  { id: "at95", row: "95+ count (pooled)", reference: "Year 0", band: "At most 2×", mark: "GATE", judged: "each year 2029-45", rule: { kind: "atMostTimes", times: 2 } },
  { id: "at99", row: "Ratings of 99", reference: "Year 0", band: "99s at most the year-0 count + 3 a league-season", mark: "GATE", judged: "each year 2029-45", rule: { kind: "atMost", plus: 3 } },
  { id: "gap", row: "Starter-backup gap (fieldedStarters)", reference: "Year 0", band: "±1.0", mark: "GATE", judged: "each year 2029-45", rule: { kind: "abs", half: 1.0 } },
  { id: "groups-report", row: "Group mean, top-5, rating-group means", reference: "Year 0", band: "Reported", mark: "REPORT", judged: "mean of 2036-45", rule: { kind: "report" } },
  { id: "coach-slots", row: "Coach styles: incumbent league vs form league", reference: "Each other", band: "Starters differ in at least 5% of slots", mark: "GATE", judged: "each year of the walk", rule: { kind: "atLeast", min: 0.05 } },
  { id: "coach-sd", row: "Coach styles: incumbent league vs form league", reference: "Each other", band: "pooled sd within 5% of each other every year", mark: "GATE", judged: "each year of the walk", rule: { kind: "rel", frac: 0.05 } },
  { id: "age-league", row: "Mean age, league", reference: W8_LEAGUE, band: "±0.5", mark: "GATE", card: "Close", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.5 } },
  { id: "age-group", row: "Mean age, group", reference: W8_GROUP, band: "±1.0 (K/P ±2)", mark: "GATE", judged: "mean of 2029-45", rule: { kind: "abs", half: 1.0, halfFor: { K: 2, P: 2 } } },
  { id: "share-22", row: "Share 22 or under", reference: W8_LEAGUE, band: "±3 pts", mark: "GATE", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.03 } },
  { id: "share-31", row: "Share 31+", reference: W8_LEAGUE, band: "±3 pts", mark: "GATE", card: "Close", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.03 } },
  { id: "share-34", row: "Share 34+", reference: W8_LEAGUE, band: "at most NFL + 2 pts", mark: "GATE", card: "Old", judged: "mean of 2029-45", rule: { kind: "atMost", plus: 0.02 } },
  { id: "peak-usage", row: "Peak usage age (no K/P/LS)", reference: "Within-player change in offense_pct/defense_pct by age, 2013-24", band: "±1.5 years", mark: "GATE", card: "Close", judged: "pairs with both seasons in 2029-45, seeds pooled", rule: { kind: "abs", half: 1.5 } },
  { id: "peak-rb-earliest", row: "Peak usage age (no K/P/LS)", reference: "Within-player change in offense_pct/defense_pct by age, 2013-24", band: "RB earliest", mark: "GATE", judged: "pairs with both seasons in 2029-45, seeds pooled", rule: { kind: "order" } },
  { id: "career-expected", row: "Career by entry group", reference: CAREERS_REF, band: "Expected career ±20%", mark: "GATE", card: "Close", judged: CAREERS_JUDGED, rule: { kind: "rel", frac: 0.20 } },
  { id: "career-expected-family", row: "Career by position family", reference: CAREERS_REF, band: "Expected career ±20%", mark: "GATE", card: "Close", judged: CAREERS_JUDGED, rule: { kind: "rel", frac: 0.20 } },
  { id: "career-expected-league", row: "Career, league-wide", reference: CAREERS_REF, band: "Expected career ±20%", mark: "GATE", card: "Close", judged: CAREERS_JUDGED, rule: { kind: "rel", frac: 0.20 } },
  { id: "career-reach5", row: "Career by entry group", reference: CAREERS_REF, band: "reach 5 ±5 pts", mark: "GATE", judged: CAREERS_JUDGED, rule: { kind: "abs", half: 0.05 } },
  { id: "career-reach5-family", row: "Career by position family", reference: CAREERS_REF, band: "reach 5 ±5 pts", mark: "GATE", judged: CAREERS_JUDGED, rule: { kind: "abs", half: 0.05 } },
  { id: "career-reach5-league", row: "Career, league-wide", reference: CAREERS_REF, band: "reach 5 ±5 pts", mark: "GATE", judged: CAREERS_JUDGED, rule: { kind: "abs", half: 0.05 } },
  { id: "career-reach10", row: "Career by entry group", reference: CAREERS_REF, band: "reach 10 ±3 pts", mark: "GATE", card: "Old", judged: CAREERS_JUDGED, rule: { kind: "abs", half: 0.03 } },
  { id: "career-reach10-family", row: "Career by position family", reference: CAREERS_REF, band: "reach 10 ±3 pts", mark: "GATE", card: "Old", judged: CAREERS_JUDGED, rule: { kind: "abs", half: 0.03 } },
  { id: "career-reach10-league", row: "Career, league-wide", reference: CAREERS_REF, band: "reach 10 ±3 pts", mark: "GATE", card: "Old", judged: CAREERS_JUDGED, rule: { kind: "abs", half: 0.03 } },
  { id: "rookie", row: "Rookie share", reference: W8_LEAGUE, band: "±3 pts", mark: "GATE", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.03 } },
  { id: "undrafted", row: "Undrafted share", reference: W8_LEAGUE, band: "±4 pts", mark: "GATE", judged: "mean of 2029-45", rule: { kind: "abs", half: 0.04 } },
  { id: "d7-starter", row: "D7 starter rate by round band, switches on", reference: "NFL_DRAFT (drafts 2011-18)", band: "±0.10", mark: "GATE", judged: "in-run drafts over the whole walk, seeds pooled", rule: { kind: "abs", half: 0.10 } },
  { id: "d7-ever", row: "D7 ever a starter by round band, switches on", reference: "NFL_DRAFT (drafts 2011-18)", band: "±0.10 (reported)", mark: "REPORT", judged: "in-run drafts with 3+ seasons played, seeds pooled", rule: { kind: "abs", half: 0.10 } },
  { id: "d7-round1", row: "D7 round-1 share by group, switches on", reference: "NFL_DRAFT (round 1, 2011-24)", band: "Reported", mark: "REPORT", judged: "in-run drafts over the whole walk, seeds pooled", rule: { kind: "report" } },
  { id: "win-spread", row: "Win spread", reference: "The owner's floor, 2.75", band: "mean of 2029-45 at least 2.75", mark: "GATE", card: "Even", judged: "mean of 2029-45", rule: { kind: "atLeast", min: 2.75 } },
  { id: "win-spread-nfl", row: "Win spread against the NFL", reference: "3.05 (NFL 2021-24)", band: "2.75-3.35 (reported)", mark: "REPORT", card: "Even", judged: "mean of 2029-45", rule: { kind: "range", lo: 2.75, hi: 3.35 } },
  { id: "win-spread-season-one", row: "Win spread against season one", reference: "Season one (year 0), same seeds", band: "mean of 2029-45 at least season one's (reported; the growth tuning's yardstick)", mark: "REPORT", card: "Floor", judged: "mean of 2029-45", rule: { kind: "notBelow" } },
  { id: "win-r", row: "Year-over-year win r", reference: "0.40 (4 transitions)", band: "0.25-0.55", mark: "REPORT", judged: "mean of the pairs inside 2029-45", rule: { kind: "range", lo: 0.25, hi: 0.55 } },
  { id: "other-report", row: "Back after a season out; retire after 1 vs 2; FA pool", reference: "NFL / patience arithmetic", band: "Pool trend under 5% a year", mark: "REPORT", judged: "2029-45", rule: { kind: "report" } },
  // Added for the owner's aging rulings of 2026-11-06: all REPORT, bands CHOSEN.
  { id: "share-31-group", row: "Share 31+, by group (the 53 counted like the NFL)", reference: W8_GROUP_SEASONS, band: "±3 pts (K/P/LS ±8) (reported)", mark: "REPORT", judged: "mean of 2029-45; 2033-45 beside it", rule: { kind: "abs", half: 0.03, halfFor: { K: 0.08, P: 0.08, LS: 0.08 } } },
  { id: "share-34-group", row: "Share 34+, by group (the 53 counted like the NFL)", reference: W8_GROUP_SEASONS, band: "±2 pts (K/P/LS ±6) (reported)", mark: "REPORT", judged: "mean of 2029-45; 2033-45 beside it", rule: { kind: "abs", half: 0.02, halfFor: { K: 0.06, P: 0.06, LS: 0.06 } } },
  { id: "signed-again", row: "Signed again within two years, by age (deals of 1.5%+ of the cap that ran out)", reference: "OverTheCap via nflverse, deals ending 2016-22 (REPORTED by the cap thread; no SE)", band: "±5 pts (reported)", mark: "REPORT", judged: "deals that ran out in 2029-45 with two league years followed", rule: { kind: "abs", half: 0.05 } },
  { id: "back-on-53", row: "Back on a 53 within two seasons, by age", reference: "NFL final-week 53s, Y 2016-22", band: "±5 pts (reported)", mark: "REPORT", judged: "final-week 53s of 2029-45 with two seasons followed", rule: { kind: "abs", half: 0.05 } },
  { id: "starters-gone", row: "Starters on no team's list for two seasons, by age", reference: "NFL starters (50%+ of snaps), Y 2016-22", band: "±3 pts (reported)", mark: "REPORT", judged: "final-week 53s of 2029-45 with two seasons followed", rule: { kind: "abs", half: 0.03 } },
  { id: "retired-signed", row: "Retired by his own choice while signed, within a year of a final-week 53, by age", reference: "NFL reserve/retired list, Y 2021-24 (a lower bound)", band: "Reported", mark: "REPORT", judged: "final-week 53s of 2029-45 with a year followed", rule: { kind: "report" } },
  { id: "rookie-age", row: "Rookies' ages on the week-8 53s (the 53 counted like the NFL)", reference: "NFL wk 8 rookies, 2018-24 (pooled over the men)", band: "mean ±0.3 years; whole-year shares ±5 pts (reported)", mark: "REPORT", judged: "mean of 2029-45; 2033-45 beside it", rule: { kind: "abs", half: 0.05, halfFor: { mean: 0.3 } } },
  { id: "availability", row: "Expected availability by age (man-weeks on a 53 not out injured)", reference: "None merged (the injuries part's real share by age)", band: "Reported", mark: "REPORT", judged: "2029-45; 2033-45 beside it", rule: { kind: "report" } },
  { id: "nfl-count", row: "The 53 counted like the NFL: the weeks-left variant, the whole 53s, the men left out", reference: "The band reading (week8Nfl) the NFL rows are graded on", band: "Reported", mark: "REPORT", judged: "mean of 2029-45; 2033-45 beside it", rule: { kind: "report" } },
  // Added for the aging redesign (ADR-087 §12, AB1; rows version 6): measure-only, all REPORT with no band.
  { id: "ability-age", row: "Ability-group means by age (week-8 53s; measure-only)", reference: "Year 0, the same group and ages", band: "Reported (measure-only)", mark: "REPORT", judged: "2029-45, men pooled over the seasons", rule: { kind: "report" } },
  { id: "body-age", row: "Combine measures by age (men with a body record; measure-only)", reference: "Year 0, the same ages", band: "Reported (measure-only)", mark: "REPORT", judged: "2029-45, men pooled over the seasons", rule: { kind: "report" } },
  { id: "at99-detail", row: "Ratings of 99 by ability group, age and rating; the SMARTS share (measure-only)", reference: "Year 0", band: "Reported (measure-only)", mark: "REPORT", judged: "mean of 2029-45, a league-season; the SMARTS share 2033-45 beside it", rule: { kind: "report" } },
  { id: "injury-age", row: "Football time-loss injuries per snap by age, after a game played (measure-only)", reference: "NFL 2019-24 (injury-rates.md, Injuries by age)", band: "Reported (measure-only)", mark: "REPORT", judged: "2029-45; 2033-45 beside it", rule: { kind: "report" } },
  { id: "injury-spot", row: "Football time-loss injuries per snap by spot played (measure-only)", reference: "NFL 2019-24 by fine listed position (injury-rates.md, By depth-chart spot)", band: "Reported (measure-only)", mark: "REPORT", judged: "2029-45", rule: { kind: "report" } },
  { id: "concussion", row: "Concussions out 4+ weeks, first and later and by age; durability by concussions had (measure-only)", reference: "NFL 2019-24 (injury-rates.md, Repeat concussions; concussion class by age)", band: "Reported (measure-only)", mark: "REPORT", judged: "2029-45", rule: { kind: "report" } },
  { id: "contact-spot", row: "Contact per snap by spot (roll sets; information only) and career contact at 27", reference: "None (AB6's free value is the median at 27)", band: "Reported (measure-only)", mark: "REPORT", judged: "2029-45; the median at 27 2033-45 beside it", rule: { kind: "report" } },
  { id: "availability-aligned", row: "Share of game weeks missed hurt by age, the real side's game weeks (measure-only)", reference: "NFL 2019-24 (injury-rates.md, By age: missed for injury)", band: "Reported (measure-only)", mark: "REPORT", judged: "2029-45; 2033-45 beside it", rule: { kind: "report" } },
  { id: "retire-moment", row: "Retirements by moment and way, and by years in the league (measure-only)", reference: "NFL reserve/retired list by years in the league, Y 2021-24 (a lower bound)", band: "Reported (measure-only)", mark: "REPORT", judged: "2029-45, a season; final-week 53s of 2029-45 with a year followed", rule: { kind: "report" } },
  { id: "team-overall", row: "Team overall: spread and year-to-year r, beside the win spread and win r (measure-only)", reference: "Year 0's spread; NFL win spread (2021-24) and win r (2020-24)", band: "Reported (measure-only)", mark: "REPORT", judged: "2029-45 (r: the pairs inside it); 2033-45 beside it", rule: { kind: "report" } },
  { id: "d7-age", row: "D7 starter rate by round band and age, switches on (measure-only)", reference: "NFL_DRAFT (drafts 2011-18; no age split)", band: "Reported (measure-only)", mark: "REPORT", judged: "in-run drafts over the whole walk, seeds pooled", rule: { kind: "report" } },
];

const bandOf = (id: string): CareerBand => {
  const b = CAREER_BANDS.find((x) => x.id === id);
  if (b === undefined) throw new Error(`career grade: no band ${id}`);
  return b;
};

// --- statistics ----------------------------------------------------------------------------------

const mean = (xs: readonly number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const sampleSd = (xs: readonly number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};

/** Per-seed values pooled: their mean, and the seed-to-seed SE (null with fewer than two values). */
export function poolSeeds(values: readonly (number | null | undefined)[]): { value: number | null; se: number | null; n: number } {
  const xs = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (xs.length === 0) return { value: null, se: null, n: 0 };
  return { value: mean(xs), se: xs.length < 2 ? null : sampleSd(xs) / Math.sqrt(xs.length), n: xs.length };
}

/** "Not resolvable": the band's half-width is under 2·√(SE_sim² + SE_ref²). */
export function notResolvable(halfWidth: number, seSim: number, seRef: number): boolean {
  return halfWidth < 2 * Math.sqrt(seSim ** 2 + seRef ** 2);
}

/** Least-squares slope of ys on 0, 1, 2, ... over their mean: the trend as a share a year. */
export function trendShare(ys: readonly number[]): number | null {
  if (ys.length < 2) return null;
  const xs = ys.map((_, i) => i);
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < ys.length; i++) { sxy += (xs[i]! - mx) * (ys[i]! - my); sxx += (xs[i]! - mx) ** 2; }
  return my === 0 ? null : sxy / sxx / my;
}

// --- checks --------------------------------------------------------------------------------------

export type CheckStatus = "PASS" | "FAIL" | "NOT_RESOLVABLE" | "NO_DATA" | "NO_SE" | "REPORTED";

export interface GradeCheck {
  /** What it is: a year, a group, a round. */
  readonly label: string;
  readonly sim: number | null;
  readonly seSim: number | null;
  /** Seeds behind the sim's value. */
  readonly seeds: number;
  readonly ref: number | null;
  readonly seRef: number | null;
  readonly halfWidth: number | null;
  /** 2·√(SE_sim² + SE_ref²). */
  readonly resolution: number | null;
  readonly inBand: boolean | null;
  /** How far outside its band the sim's value sits (0 in it). */
  readonly outside: number | null;
  readonly status: CheckStatus;
}

export type RowStatus = "PASS" | "FAIL" | "NOT_RESOLVABLE" | "NO_DATA" | "NO_SE" | "REPORTED";

export interface GradeRow {
  readonly id: string;
  readonly row: string;
  readonly reference: string;
  readonly band: string;
  readonly mark: BandMark;
  readonly card: OwnerCard | null;
  readonly judged: string;
  readonly status: RowStatus;
  readonly checks: GradeCheck[];
  /** Plain words on what was read, where it needs saying. */
  readonly note?: string;
}

/**
 * The band's half-width for a check with this reference (and group). A one-sided band's is its
 * allowance: NFL + 2 points, 2 points; 2×, the reference itself; a floor, the floor itself (shown
 * only: `gradeCheck` never leaves a floor unresolved); not below the reference, none.
 */
function halfWidthOf(rule: BandRule, ref: number, group?: string): number | null {
  switch (rule.kind) {
    case "abs": return (group !== undefined ? rule.halfFor?.[group] : undefined) ?? rule.half;
    case "rel": return rule.frac * Math.abs(ref);
    case "atMost": return rule.plus;
    case "atMostTimes": return (rule.times - 1) * Math.abs(ref);
    case "atLeast": return rule.min;
    case "range": return (rule.hi - rule.lo) / 2;
    case "notBelow": return 0;
    default: return null;
  }
}

function inBandOf(rule: BandRule, sim: number, ref: number, group?: string): boolean | null {
  switch (rule.kind) {
    case "abs": return Math.abs(sim - ref) <= halfWidthOf(rule, ref, group)!;
    case "rel": return Math.abs(sim - ref) <= rule.frac * Math.abs(ref);
    case "atMost": return sim <= ref + rule.plus;
    case "atMostTimes": return sim <= rule.times * ref;
    case "atLeast": return sim >= rule.min;
    case "range": return sim >= rule.lo && sim <= rule.hi;
    case "notBelow": return sim >= ref;
    default: return null;
  }
}

/** How far outside its band a value sits: 0 in the band (edges included). */
export function outsideBand(rule: BandRule, sim: number, ref: number, group?: string): number {
  switch (rule.kind) {
    case "abs": return Math.max(0, Math.abs(sim - ref) - halfWidthOf(rule, ref, group)!);
    case "rel": return Math.max(0, Math.abs(sim - ref) - rule.frac * Math.abs(ref));
    case "atMost": return Math.max(0, sim - (ref + rule.plus));
    case "atMostTimes": return Math.max(0, sim - rule.times * ref);
    case "atLeast": return Math.max(0, rule.min - sim);
    case "range": return Math.max(0, rule.lo - sim, sim - rule.hi);
    case "notBelow": return Math.max(0, ref - sim);
    default: return 0;
  }
}

/**
 * One check: the sim's pooled value against its reference, under the band's rule and the SE rule.
 * In the band: a pass, or not resolvable when the half-width is under 2·√(SE_sim² + SE_ref²).
 * Outside it: a fail, unless the half-width is under 2·√(...) AND the value is outside the band by
 * no more than 2·√(...) (a miss that could be noise), which is not resolvable. A floor (`atLeast`)
 * is never unresolved: below it fails and at or above it passes, whatever the SEs. Not below the
 * reference (`notBelow`, no allowance): at or above it passes; below it, by no more than 2·√(...)
 * is not resolvable, further fails.
 */
export function gradeCheck(
  rule: BandRule, label: string, sim: { value: number | null; se: number | null; n: number }, ref: { value: number | null; se: number | null },
  group?: string,
): GradeCheck {
  const base = { label, sim: sim.value, seSim: sim.se, seeds: sim.n, ref: ref.value, seRef: ref.se };
  if (rule.kind === "report" || rule.kind === "order") {
    return { ...base, halfWidth: null, resolution: null, inBand: null, outside: null, status: "REPORTED" };
  }
  const refValue = rule.kind === "range" || rule.kind === "atLeast" ? (ref.value ?? 0) : ref.value;
  if (refValue === null) return { ...base, halfWidth: null, resolution: null, inBand: null, outside: null, status: "NO_DATA" };
  // The half-width is kept even with no sim value, so a reference too wide to resolve is listed.
  const halfWidth = halfWidthOf(rule, refValue, group)!;
  if (sim.value === null) return { ...base, halfWidth, resolution: null, inBand: null, outside: null, status: "NO_DATA" };
  const inBand = inBandOf(rule, sim.value, refValue, group);
  const outside = outsideBand(rule, sim.value, refValue, group);
  if (sim.se === null) return { ...base, halfWidth, resolution: null, inBand, outside, status: "NO_SE" };
  const resolution = 2 * Math.sqrt(sim.se ** 2 + (ref.se ?? 0) ** 2);
  const unresolved = rule.kind !== "atLeast" && halfWidth < resolution;
  const status: CheckStatus = inBand
    ? (unresolved && rule.kind !== "notBelow" ? "NOT_RESOLVABLE" : "PASS")
    : (unresolved && outside <= resolution ? "NOT_RESOLVABLE" : "FAIL");
  return { ...base, halfWidth, resolution, inBand, outside, status };
}

/** A row's status from its checks (see the header). */
export function rowStatus(mark: BandMark, rule: BandRule, checks: readonly GradeCheck[]): RowStatus {
  if (mark === "REPORT" || rule.kind === "report") return "REPORTED";
  if (checks.length === 0) return "NO_DATA";
  if (checks.some((c) => c.status === "FAIL")) return "FAIL";
  if (checks.some((c) => c.status === "NO_DATA")) return "NO_DATA";
  if (checks.some((c) => c.status === "NO_SE")) return "NO_SE";
  if (checks.some((c) => c.status === "NOT_RESOLVABLE")) return "NOT_RESOLVABLE";
  return "PASS";
}

function row(id: string, checks: GradeCheck[], note?: string): GradeRow {
  const b = bandOf(id);
  return {
    id, row: b.row, reference: b.reference, band: b.band, mark: b.mark, card: b.card ?? null, judged: b.judged,
    status: rowStatus(b.mark, b.rule, checks), checks, ...(note === undefined ? {} : { note }),
  };
}

// --- the grade -----------------------------------------------------------------------------------

/**
 * The years the bands are judged on: `early` (2029-45 in the plan), `late` (2036-45), and `later`
 * (2033-45, the owner's ruling of 2026-11-06: the league after the stand-in file's own men are mostly
 * gone, reported beside each early check).
 */
export interface GradeWindows {
  readonly early: readonly [number, number];
  readonly late: readonly [number, number];
  readonly later: readonly [number, number];
}

export const PLAN_WINDOWS: GradeWindows = { early: [2029, 2045], late: [2036, 2045], later: [2033, 2045] };

/** Entrants are graded once they have this many seasons to follow (the real cohorts enter by 2022 and are followed to 2024). */
export const CAREER_FOLLOW_UP = 2;

export interface GradeInput {
  readonly pass: 1 | 2;
  /** The grade seeds asked for, and the rows found (arm `both`), by seed. */
  readonly seeds: readonly string[];
  readonly rows: ReadonlyMap<string, CareerCheckRows>;
  /** The coach-style arms: the seeds asked for, and each arm's rows found, by seed. */
  readonly coach: { readonly seeds: readonly string[]; readonly incumbent: ReadonlyMap<string, CareerCheckRows>; readonly form: ReadonlyMap<string, CareerCheckRows> };
  readonly nfl?: NflCareers;
  readonly nflDraft?: typeof NFL_DRAFT;
  /** The real injury numbers the aging redesign's rows are set against (rows version 6). */
  readonly nflInjuries?: NflInjuries;
  readonly windows?: GradeWindows;
  /**
   * The owner's answers that decide OWNER rows' marks: an answered OWNER row takes the answer's
   * mark; one with no answer blocks the flip unless it passes or is not resolvable. No row is OWNER
   * since the answers of 2026-10-31 (the Old card made its rows GATE), so today this changes
   * nothing: kept for a later card.
   */
  readonly ownerAnswers?: Readonly<Partial<Record<OwnerCard, "GATE" | "REPORT">>>;
  /** What the rows were made with, for the report's header. */
  readonly meta: {
    readonly seasons: number;
    readonly league: { readonly path: string; readonly sha256: string };
    readonly fingerprints: Readonly<Record<string, string>>;
    readonly engineRules: string;
    readonly callerVersion: string;
    /** A smoke run: windows clipped to the seasons there are; never a graded report. */
    readonly smoke?: boolean;
  };
}

export interface CareerGrade {
  readonly pass: 1 | 2;
  readonly smoke: boolean;
  readonly meta: GradeInput["meta"];
  readonly windows: GradeWindows;
  readonly seeds: { readonly asked: readonly string[]; readonly graded: readonly string[]; readonly missing: readonly string[] };
  readonly coachSeeds: { readonly asked: readonly string[]; readonly graded: readonly string[]; readonly missing: readonly string[] };
  readonly rows: GradeRow[];
  /**
   * Checks of GATE (and OWNER) rows whose band half-width is under twice the reference's own SE: no
   * sim, however many seeds, can resolve them, and they can fail only by a gross miss (outside the
   * band by more than 2·√(SE_sim² + SE_ref²)).
   */
  readonly unresolvable: string[];
  readonly flip: {
    readonly recommended: boolean;
    /** Why not, in plain words (empty when recommended). */
    readonly reasons: string[];
    readonly gate: { readonly pass: number; readonly notResolvable: number; readonly fail: number; readonly other: number };
    /** OWNER rows whose answer is pending and that do not pass (or are not resolvable): they block the flip until answered. None today. */
    readonly ownerBlocking: string[];
  };
}

const inWindow = (y: number, w: readonly [number, number]) => y >= w[0] && y <= w[1];
const seasonRow = (r: CareerCheckRows, y: number): SeasonRow | undefined => r.perSeason.find((s) => s.season === y);
/** Which week-8 picture a row reads: the sim's whole 53s (`week8`, the drift and coach-style rows), or the 53s counted like the NFL (`week8Nfl`). */
type PictureOf = (s: SeasonRow) => RosterPicture | null | undefined;
const plainPicture: PictureOf = (s) => s.week8;
/** Rows written before version 5 have no NFL count: no data, not the whole 53s. */
const nflPicture: PictureOf = (s) => s.week8Nfl ?? null;
const week8 = (r: CareerCheckRows, y: number, which: PictureOf = plainPicture): RosterPicture | null => {
  const s = seasonRow(r, y);
  return s === undefined ? null : which(s) ?? null;
};
const year0 = (r: CareerCheckRows, which: PictureOf = plainPicture): RosterPicture | null => week8(r, r.firstSeason, which);
/** A seed's mean of `pick` over the window's seasons that have the week-8 picture read (a value that is not a number left out); null with none. */
const windowMean = (r: CareerCheckRows, w: readonly [number, number], pick: (p: RosterPicture) => number, which: PictureOf = plainPicture): number | null => {
  const xs = r.perSeason.filter((s) => inWindow(s.season, w)).map((s) => which(s) ?? null).filter((p): p is RosterPicture => p !== null)
    .map(pick).filter((x) => Number.isFinite(x));
  return xs.length === 0 ? null : mean(xs);
};
const windowLabel = (w: readonly [number, number]) => `${w[0]}-${w[1]}`;
/** A check beside an early one on the later window: shown, never graded. */
const laterCheck = (c: GradeCheck): GradeCheck => ({ ...c, status: "REPORTED" });
const est = (e: Estimate | null | undefined) => ({ value: e?.value ?? null, se: e?.se ?? null });
const yearsOf = (w: readonly [number, number]) => Array.from({ length: Math.max(0, w[1] - w[0] + 1) }, (_, i) => w[0] + i);

/**
 * A restricted mean career to `horizon` seasons from a survival curve (`survival[t]` = P(career > t)),
 * the curve carried flat past `followUp` seasons: P(career >= k) for k > followUp is taken as
 * P(career >= followUp). The real side can follow a career `followUp` seasons at most (entry 2012,
 * last observed 2024: 13), so its curve is flat past there; the sim's is read the same way. Null
 * with no curve.
 */
export function expectedCareer(survival: readonly number[], horizon: number, followUp: number): number | null {
  if (survival.length === 0) return null;
  let sum = 0;
  for (let t = 0; t < horizon; t++) sum += survival[Math.min(t, followUp - 1, survival.length - 1)]!;
  return sum;
}

/** A line of values: the least-squares slope of `ys` on `xs`; null with fewer than two points. */
export function slopeOf(xs: readonly number[], ys: readonly number[]): number | null {
  if (xs.length < 2 || xs.length !== ys.length) return null;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < xs.length; i++) { sxy += (xs[i]! - mx) * (ys[i]! - my); sxx += (xs[i]! - mx) ** 2; }
  return sxx === 0 ? null : sxy / sxx;
}

/** Every seed's entrants pooled, those with `CAREER_FOLLOW_UP` seasons to follow. */
function graded(entrants: readonly CareerEntrant[], lastSeason: number): CareerEntrant[] {
  return entrants.filter((e) => e.e <= lastSeason - CAREER_FOLLOW_UP);
}

/** Usage cells by group, summed over the pairs whose two seasons sit in the window. */
function windowCells(r: CareerCheckRows, w: readonly [number, number]): Record<string, Record<string, UsageCell>> {
  const out: Record<string, Record<string, UsageCell>> = {};
  for (const [y, groups] of Object.entries(r.usage.bySeason ?? {})) {
    if (!inWindow(Number(y), w) || !inWindow(Number(y) + 1, w)) continue;
    for (const [g, cells] of Object.entries(groups)) addCells((out[g] ??= {}), cells);
  }
  return out;
}

type W8Key = Exclude<keyof NflWeekEightSeason, "season" | "n">;

/**
 * A week-8 league row's reference: the mean of the real league's season values over `years` (the
 * latest three seasons, 2022-24), SE = their sample SD over √seasons, n = the men behind them. Null
 * unless every season in `years` is there.
 */
export function weekEightLeagueReference(nfl: NflCareers, key: W8Key, years: readonly [number, number] = WEEK_EIGHT_LEAGUE_YEARS): Estimate | null {
  const rows = nfl.weekEight.leagueBySeason.filter((x) => x.season >= years[0] && x.season <= years[1]);
  if (new Set(rows.map((x) => x.season)).size !== years[1] - years[0] + 1 || rows.length !== years[1] - years[0] + 1) return null;
  const xs = rows.map((x) => x[key]);
  return { value: mean(xs), se: sampleSd(xs) / Math.sqrt(xs.length), n: rows.reduce((a, x) => a + x.n, 0) };
}

type GroupShareKey = Exclude<keyof NflGroupAgeShares, "n">;

/**
 * A group's age share on the latest real seasons (`weekEight.byGroupBySeason`, 2022-24): the mean
 * of the season values, SE their sample SD over √seasons, n the men behind them. Null unless every
 * season in `years` is there.
 */
export function groupSeasonReference(nfl: NflCareers, group: CareerGroup, key: GroupShareKey, years: readonly [number, number] = WEEK_EIGHT_LEAGUE_YEARS): Estimate | null {
  const rows = (nfl.weekEight.byGroupBySeason ?? []).filter((x) => x.season >= years[0] && x.season <= years[1]);
  if (new Set(rows.map((x) => x.season)).size !== years[1] - years[0] + 1 || rows.length !== years[1] - years[0] + 1) return null;
  const xs = rows.map((x) => x.byGroup[group][key]);
  return { value: mean(xs), se: sampleSd(xs) / Math.sqrt(xs.length), n: rows.reduce((a, x) => a + x.byGroup[group].n, 0) };
}

/**
 * Counts by whole-year age ("?" for none) summed into age bands: [men, of them with the outcome] by
 * band key. Ages with no band ("?") are left out.
 */
export function bandCounts<K extends string>(bands: readonly AgeBand<K>[], byAge: Readonly<Record<string, readonly [number, number]>>, shift = 0): Map<K, [number, number]> {
  const out = new Map<K, [number, number]>();
  for (const [age, [n, k]] of Object.entries(byAge)) {
    if (age === "?" || !Number.isFinite(Number(age))) continue;
    const key = ageBandOf(bands, Number(age) + shift)!;
    const c = out.get(key) ?? [0, 0];
    c[0] += n; c[1] += k;
    out.set(key, c);
  }
  return out;
}

/** k / n, or null with no n. */
const shareOrNull = (c: readonly [number, number] | undefined): number | null => (c === undefined || c[0] === 0 ? null : c[1] / c[0]);

/**
 * One seed's signed-again counts by age band, over the deals of at least `minCapShare` that ran out
 * in the window's seasons and were followed two league years: [deals, signed again] within two
 * league years (or one, `within` 1), by his age in the season it ran out (`shift` 1: the next one).
 * `cut`: the league file's deals whose early years the importer cut (`ExpiryRecord.t`, their share
 * not their APY's) left out (`out`, the default, CHOSEN), alone (`only`), or with the rest (`in`).
 */
export function signedAgainCounts<K extends string>(
  r: CareerCheckRows, w: readonly [number, number], bands: readonly AgeBand<K>[],
  o: { readonly minCapShare: number; readonly within: 1 | 2; readonly shift: 0 | 1; readonly cut?: "out" | "only" | "in" },
): Map<K, [number, number]> {
  const byAge: Record<string, [number, number]> = {};
  const cut = o.cut ?? "out";
  for (const x of r.market?.expiries ?? []) {
    if (x.c < 2 || !(x.s >= o.minCapShare) || !inWindow(x.y, w)) continue;
    const isCut = x.t === 1;
    if ((cut === "out" && isCut) || (cut === "only" && !isCut)) continue;
    const c = (byAge[x.a === null ? "?" : String(x.a)] ??= [0, 0]);
    c[0]++;
    if ((o.within === 1 ? x.w1 : x.w2) === 1) c[1]++;
  }
  return bandCounts(bands, byAge, o.shift);
}

/** A family's label in the grade: its key, and its member groups when there are several. */
export const familyLabel = (f: CareerFamily): string => {
  const groups = CAREER_FAMILIES[f];
  return groups.length === 1 ? f : `${f} (${groups.join(", ")})`;
};

// --- the aging redesign's measure-only rows (ADR-087 §12, AB1; rows version 6) -------------------

/** The age bins the ability, combine and draft-age rows read (CHOSEN): the young side split finer than the exit bands. */
export const ABILITY_AGE_BINS: readonly AgeBand<string>[] = [
  { key: "22 or under", last: 22 }, { key: "23-25", last: 25 }, { key: "26-28", last: 28 },
  { key: "29-30", last: 30 }, { key: "31-32", last: 32 }, { key: "33 and over", last: Infinity },
];

const seasonsIn = (r: CareerCheckRows, w: readonly [number, number]) => r.perSeason.filter((s) => inWindow(s.season, w));
const ageNumber = (a: string): number | null => (a === "?" || a === "" || !Number.isFinite(Number(a)) ? null : Number(a));
const NONE = { value: null, se: null };
/** A real count per 1,000 snaps with its Poisson SE, √count over snaps (CHOSEN, as the real side's own ratio SE). */
const per1000Ref = (k: number, snaps: number) => ({ value: (1000 * k) / snaps, se: (1000 * Math.sqrt(k)) / snaps });
/** A real share with a binomial SE, √(p(1 - p)/n) (CHOSEN: a Kaplan-Meier share's own SE is not in the report). */
const shareRef = (p: number, n: number) => ({ value: p, se: n > 0 ? Math.sqrt((p * (1 - p)) / n) : null });
export function medianOf(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}
const add3 = (m: Map<string, [number, number, number]>, k: string, c: readonly [number, number, number]) => {
  const t = m.get(k) ?? [0, 0, 0];
  t[0] += c[0]; t[1] += c[1]; t[2] += c[2];
  m.set(k, t);
};

/** One seed's ability-group means by age bin over the window: by bin, each group's [men, Σ group means] (men pooled over the seasons). */
export function abilityByBin(r: CareerCheckRows, w: readonly [number, number]): Map<string, Record<AbilityGroup, [number, number]>> {
  const out = new Map<string, Record<AbilityGroup, [number, number]>>();
  for (const s of seasonsIn(r, w)) {
    for (const [age, groups] of Object.entries(s.ability?.byAge ?? {})) {
      const bin = ageBandOf(ABILITY_AGE_BINS, ageNumber(age));
      if (bin === null) continue;
      let into = out.get(bin);
      if (into === undefined) out.set(bin, (into = Object.fromEntries(ABILITY_GROUPS.map((g) => [g, [0, 0]])) as Record<AbilityGroup, [number, number]>));
      for (const g of ABILITY_GROUPS) {
        const c = groups[g];
        if (c === undefined) continue;
        into[g][0] += c[0]; into[g][1] += c[1];
      }
    }
  }
  return out;
}

/** One seed's combine measures by age bin over the window: [men, Σ forty, Σ cone, Σ vertical, Σ bench]. */
export function bodyByBin(r: CareerCheckRows, w: readonly [number, number]): Map<string, [number, number, number, number, number]> {
  const out = new Map<string, [number, number, number, number, number]>();
  for (const s of seasonsIn(r, w)) {
    for (const [age, c] of Object.entries(s.ability?.body ?? {})) {
      const bin = ageBandOf(ABILITY_AGE_BINS, ageNumber(age));
      if (bin === null) continue;
      const t = out.get(bin) ?? [0, 0, 0, 0, 0];
      out.set(bin, [t[0] + c[0], t[1] + c[1], t[2] + c[2], t[3] + c[3], t[4] + c[4]]);
    }
  }
  return out;
}

/**
 * One seed's injury exposure over the window, cells summed under `keyOf` (age in the season, null
 * not known; the chart spot), a cell `keyOf` gives null left out: [snaps, football time-loss injuries
 * after a game played, of them hurt in the game].
 */
export function exposureBy(r: CareerCheckRows, w: readonly [number, number], keyOf: (age: number | null, spot: string) => string | null): Map<string, [number, number, number]> {
  const out = new Map<string, [number, number, number]>();
  for (const s of seasonsIn(r, w)) {
    for (const [age, spots] of Object.entries(s.exposure?.cells ?? {})) {
      for (const [spot, c] of Object.entries(spots)) {
        const k = keyOf(ageNumber(age), spot);
        if (k !== null) add3(out, k, c);
      }
    }
  }
  return out;
}

/**
 * One seed's injuries by age band over the window, the real side's way (listed K/P left out there;
 * here K, P and LS by the spot played, and ages not known): per 1,000 snaps, hurt in the game alone
 * per 1,000 snaps, and observed / expected at each spot group's all-age rate (the sim's own,
 * `INJURY_SPOT_GROUP`, as the real side's "expected" uses each listed group's).
 */
export function injuriesByAge(r: CareerCheckRows, w: readonly [number, number]): Map<string, { per1000: number | null; game1000: number | null; ratio: number | null }> {
  const keep = (age: number | null, spot: string) => age !== null && !SPECIALIST_SPOTS.has(spot as Position);
  const byBand = exposureBy(r, w, (age, spot) => (keep(age, spot) ? ageBandOf(EXIT_AGE_BANDS, age) : null));
  const byGroup = exposureBy(r, w, (age, spot) => (keep(age, spot) ? INJURY_SPOT_GROUP[spot as Position] ?? null : null));
  const byBoth = exposureBy(r, w, (age, spot) => (keep(age, spot) ? `${ageBandOf(EXIT_AGE_BANDS, age)}|${INJURY_SPOT_GROUP[spot as Position]}` : null));
  const out = new Map<string, { per1000: number | null; game1000: number | null; ratio: number | null }>();
  for (const b of EXIT_AGE_BANDS) {
    const c = byBand.get(b.key);
    if (c === undefined || c[0] === 0) { out.set(b.key, { per1000: null, game1000: null, ratio: null }); continue; }
    let expected = 0;
    for (const [g, t] of byGroup) if (t[0] > 0) expected += (t[1] / t[0]) * (byBoth.get(`${b.key}|${g}`)?.[0] ?? 0);
    out.set(b.key, { per1000: (1000 * c[1]) / c[0], game1000: (1000 * c[2]) / c[0], ratio: expected > 0 ? c[1] / expected : null });
  }
  return out;
}

/** One seed's injuries per 1,000 snaps by the real side's fine spot (`REAL_SPOT_OF`, every age), and over every spot ("all"). */
export function injuriesBySpot(r: CareerCheckRows, w: readonly [number, number]): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  for (const [k, c] of exposureBy(r, w, (_age, spot) => REAL_SPOT_OF[spot] ?? null)) out.set(k, [c[0], c[1]]);
  const all = exposureBy(r, w, () => "all").get("all");
  if (all !== undefined) out.set("all", [all[0], all[1]]);
  return out;
}

/** A sum of [n, k] pairs over seasons. */
const sumPairs = (xs: readonly (readonly [number, number] | undefined)[]): [number, number] => {
  const t: [number, number] = [0, 0];
  for (const x of xs) if (x !== undefined) { t[0] += x[0]; t[1] += x[1]; }
  return t;
};

/**
 * The aging redesign's measure-only rows (ADR-087 §12, AB1; rows version 6). Every row is REPORT
 * with a `report` rule: shown, never graded, never blocking. Rows written before version 6 have
 * none of these readings and show no data (the loader refuses to mix versions; a test's rows may
 * lack them).
 */
export function agingRedesignRows(
  runs: readonly CareerCheckRows[], windows: GradeWindows, nfl: NflCareers, nflDraft: typeof NFL_DRAFT, real: NflInjuries = NFL_INJURIES,
): GradeRow[] {
  const rows: GradeRow[] = [];
  const perSeed = (f: (r: CareerCheckRows) => number | null | undefined) => poolSeeds(runs.map(f));
  const asRef = (p: { value: number | null; se: number | null }) => ({ value: p.value, se: p.se });
  const report: BandRule = { kind: "report" };
  const laterLabel = `later window ${windowLabel(windows.later)}`;
  const firstOf = (r: CareerCheckRows): readonly [number, number] => [r.firstSeason, r.firstSeason];
  const per = (k: number, n: number) => (n === 0 ? null : k / n);
  /** A seed's mean over the window's seasons of `pick` (seasons it gives no number left out). */
  const seasonMean = (r: CareerCheckRows, w: readonly [number, number], pick: (s: SeasonRow) => number | null | undefined) => {
    const xs = seasonsIn(r, w).map(pick).filter((x): x is number => typeof x === "number" && Number.isFinite(x));
    return xs.length === 0 ? null : mean(xs);
  };

  // Ability-group means by age, against year 0's same cell.
  {
    const early = runs.map((r) => abilityByBin(r, windows.early));
    const zero = runs.map((r) => abilityByBin(r, firstOf(r)));
    const cell = (m: Map<string, Record<AbilityGroup, [number, number]>>, bin: string, g: AbilityGroup) => { const c = m.get(bin)?.[g]; return c === undefined || c[0] === 0 ? null : c[1] / c[0]; };
    const checks: GradeCheck[] = [];
    for (const g of ABILITY_GROUPS) {
      for (const b of ABILITY_AGE_BINS) {
        checks.push(gradeCheck(report, `${g}, ${b.key}`, poolSeeds(early.map((m) => cell(m, b.key, g))), asRef(poolSeeds(zero.map((m) => cell(m, b.key, g))))));
      }
    }
    rows.push(row("ability-age", checks,
      "Each ability group's mean rating (ADR-087 §12.2.1; a man's group mean is the plain mean of the group's ratings he has, CHOSEN; the membership is " +
      "`ABILITY_GROUP_COPY`, which AB3's franchise table must match) on the week-8 53s, by age in the season, men pooled over the window's seasons; " +
      "year 0's same cell beside it. The body groups are read on the ratings; the combine measures are the next row. Measure-only (AB1)."));
  }
  // The combine measures by age (growth on: the men with a body record).
  {
    const measures = ["forty", "cone", "vertical", "bench"] as const;
    const early = runs.map((r) => bodyByBin(r, windows.early));
    const zero = runs.map((r) => bodyByBin(r, firstOf(r)));
    const cell = (m: Map<string, [number, number, number, number, number]>, bin: string, i: number) => { const c = m.get(bin); return c === undefined || c[0] === 0 ? null : c[i + 1]! / c[0]; };
    const checks: GradeCheck[] = [];
    measures.forEach((name, i) => {
      for (const b of ABILITY_AGE_BINS) checks.push(gradeCheck(report, `${name}, ${b.key}`, poolSeeds(early.map((m) => cell(m, b.key, i))), asRef(poolSeeds(zero.map((m) => cell(m, b.key, i))))));
    });
    rows.push(row("body-age", checks,
      "The combine measures (contracts `PlayerDevelopment.body`: forty and cone in seconds, vertical in inches, bench in reps) of the week-8 53s' men who carry a " +
      "body record, by age in the season, men pooled over the window's seasons; year 0 beside it. Optional: a league whose men carry no body record shows no data."));
  }
  // The 99s by ability group, by age and by rating, and the SMARTS share.
  {
    const at99 = (s: SeasonRow) => s.ability?.at99;
    const groupMean = (r: CareerCheckRows, w: readonly [number, number], g: AbilityGroup) => seasonMean(r, w, (s) => at99(s)?.byGroup[g]);
    const checks: GradeCheck[] = [
      gradeCheck(report, "every group, a league-season", perSeed((r) => seasonMean(r, windows.early, (s) => at99(s)?.total)), asRef(perSeed((r) => seasonMean(r, firstOf(r), (s) => at99(s)?.total)))),
    ];
    const smarts = (r: CareerCheckRows, w: readonly [number, number]) => {
      const xs = seasonsIn(r, w).map(at99).filter((x) => x !== undefined);
      return per(xs.reduce((a, x) => a + x.byGroup.SMARTS, 0), xs.reduce((a, x) => a + x.total, 0));
    };
    checks.push(gradeCheck(report, "SMARTS share of the 99s", perSeed((r) => smarts(r, windows.early)), asRef(perSeed((r) => smarts(r, firstOf(r))))));
    checks.push(laterCheck(gradeCheck(report, `SMARTS share of the 99s, ${laterLabel}`, perSeed((r) => smarts(r, windows.later)), asRef(perSeed((r) => smarts(r, firstOf(r)))))));
    for (const g of ABILITY_GROUPS) checks.push(gradeCheck(report, `${g}, a league-season`, perSeed((r) => groupMean(r, windows.early, g)), asRef(perSeed((r) => groupMean(r, firstOf(r), g)))));
    const byBin = (r: CareerCheckRows, w: readonly [number, number], bin: string) => seasonMean(r, w, (s) => {
      const a = at99(s);
      if (a === undefined) return null;
      let n = 0;
      for (const [age, k] of Object.entries(a.byAge)) if (ageBandOf(ABILITY_AGE_BINS, ageNumber(age)) === bin) n += k;
      return n;
    });
    for (const b of ABILITY_AGE_BINS) checks.push(gradeCheck(report, `aged ${b.key}, a league-season`, perSeed((r) => byBin(r, windows.early, b.key)), asRef(perSeed((r) => byBin(r, firstOf(r), b.key)))));
    for (const g of ABILITY_GROUPS) {
      for (const id of ABILITY_GROUP_COPY[g]) {
        const sim = perSeed((r) => seasonMean(r, windows.early, (s) => at99(s)?.byRating[id]));
        const ref = perSeed((r) => seasonMean(r, firstOf(r), (s) => at99(s)?.byRating[id]));
        if ((sim.value ?? 0) > 0 || (ref.value ?? 0) > 0) checks.push(gradeCheck(report, `${id} (${g}), a league-season`, sim, asRef(ref)));
      }
    }
    rows.push(row("at99-detail", checks,
      "Ratings at 99 on the week-8 53s (every rating of the 12 ability groups: the at99 row's ratings), a league-season over the window: all of them (the at99 row's own count), " +
      "the share in SMARTS (§12.6: the largest source under variant D in the toy), by group, by age in the season, and by rating (only the ratings with a 99 in the window or in year 0). " +
      "Year 0 beside each."));
  }
  // Injuries per snap by age and by spot, against the real side's.
  {
    const realBand = real.byAge;
    const realAll = EXIT_AGE_BANDS.reduce((a, b) => ({ k: a.k + realBand[b.key].afterPlayed, n: a.n + realBand[b.key].snaps }), { k: 0, n: 0 });
    const early = runs.map((r) => injuriesByAge(r, windows.early));
    const later = runs.map((r) => injuriesByAge(r, windows.later));
    const everyAge = (r: CareerCheckRows, w: readonly [number, number]) => {
      const c = exposureBy(r, w, (age, spot) => (age !== null && !SPECIALIST_SPOTS.has(spot as Position) ? "all" : null)).get("all");
      return c === undefined || c[0] === 0 ? null : (1000 * c[1]) / c[0];
    };
    const checks: GradeCheck[] = [];
    for (const b of EXIT_AGE_BANDS) {
      const rb = realBand[b.key];
      checks.push(gradeCheck(report, `${b.key}, per 1,000 snaps`, poolSeeds(early.map((m) => m.get(b.key)?.per1000)), per1000Ref(rb.afterPlayed, rb.snaps)));
    }
    checks.push(gradeCheck(report, "every age, per 1,000 snaps", perSeed((r) => everyAge(r, windows.early)), per1000Ref(realAll.k, realAll.n)));
    for (const b of EXIT_AGE_BANDS) {
      checks.push(gradeCheck(report, `${b.key}, observed / expected (spot-group mix)`, poolSeeds(early.map((m) => m.get(b.key)?.ratio)), { value: realBand[b.key].mixPerSnap.ratio, se: realBand[b.key].mixPerSnap.se }));
    }
    for (const b of EXIT_AGE_BANDS) checks.push(gradeCheck(report, `${b.key}, hurt in the game alone, per 1,000 snaps`, poolSeeds(early.map((m) => m.get(b.key)?.game1000)), NONE));
    checks.push(gradeCheck(report, "not counted (no game played before it), a league-season", perSeed((r) => seasonMean(r, windows.early, (s) => s.exposure?.notAfterPlayed)), NONE));
    for (const b of EXIT_AGE_BANDS) {
      const rb = realBand[b.key];
      checks.push(laterCheck(gradeCheck(report, `${b.key}, per 1,000 snaps, ${laterLabel}`, poolSeeds(later.map((m) => m.get(b.key)?.per1000)), per1000Ref(rb.afterPlayed, rb.snaps))));
      checks.push(laterCheck(gradeCheck(report, `${b.key}, observed / expected, ${laterLabel}`, poolSeeds(later.map((m) => m.get(b.key)?.ratio)), { value: rb.mixPerSnap.ratio, se: rb.mixPerSnap.se })));
    }
    rows.push(row("injury-age", checks,
      "Football (game or practice; AWAY, illness and the rest away from football, left out) time-loss (a week or more) injuries in the regular season, counted after a game he played " +
      "(his team's last game at or before the injury's week is one he took a snap in), at the spot and age of that game, over every snap he took (offense, defense, special teams); " +
      "K, P and LS by the spot played left out, as the real side leaves listed K/P out. Observed / expected sets each band against the sim's own spot-group rates over all ages, " +
      "as the real side's sets it against each listed group's. The real side cannot see an injury after a team's last game and leaves that game out; the sim counts it (CHOSEN). " +
      "Reference SEs: per 1,000 snaps √count / snaps (Poisson, CHOSEN); the ratio's the real side's own. Ages: the sim's bio.age in the season, the real side's whole years on 23 October."));
    const spotEarly = runs.map((r) => injuriesBySpot(r, windows.early));
    const spotChecks: GradeCheck[] = [];
    const realLeague = (1000 * real.all.afterPlayed) / real.all.snaps;
    const rate = (m: Map<string, [number, number]>, k: string) => { const c = m.get(k); return c === undefined || c[0] === 0 ? null : (1000 * c[1]) / c[0]; };
    for (const [spot, x] of Object.entries(real.bySpot)) {
      spotChecks.push(gradeCheck(report, `${spot}, per 1,000 snaps`, poolSeeds(spotEarly.map((m) => rate(m, spot))), per1000Ref(x.afterPlayed, x.snaps)));
    }
    spotChecks.push(gradeCheck(report, "every spot, per 1,000 snaps", poolSeeds(spotEarly.map((m) => rate(m, "all"))), per1000Ref(real.all.afterPlayed, real.all.snaps)));
    for (const [spot, x] of Object.entries(real.bySpot)) {
      spotChecks.push(gradeCheck(report, `${spot}, against every spot`, poolSeeds(spotEarly.map((m) => { const a = rate(m, spot), all = rate(m, "all"); return a === null || all === null || all === 0 ? null : a / all; })),
        { value: x.per1000Snaps / realLeague, se: null }));
    }
    rows.push(row("injury-spot", spotChecks,
      "The same injuries by the spot played (the chart key that listed him that game, the first in contracts' Position order; off the chart, the spot he last played at this season, " +
      "else his listed position): LT and RT read the real side's T, LG and RG its G (CHOSEN). The real rates are by fine listed position (nflverse depth_chart_position), not " +
      "the game-day chart. 'Against every spot' is the spot's rate over the league's, the shape §12.3.1's spot factors carry. Every age; specialists included here."));
  }
  // Concussions: first and later, by age; durability by how many a man has had.
  {
    const sums = (r: CareerCheckRows, w: readonly [number, number], pick: "first" | "repeat") => sumPairs(seasonsIn(r, w).map((s) => s.concussions?.[pick]));
    const shareOf = (r: CareerCheckRows, w: readonly [number, number], pick: "first" | "repeat") => { const [n, k] = sums(r, w, pick); return per(k, n); };
    const c = real.concussion;
    const checks: GradeCheck[] = [
      gradeCheck(report, "first, out 4+ weeks", perSeed((r) => shareOf(r, windows.early, "first")), shareRef(c.first.out4, c.first.n)),
      gradeCheck(report, "later, out 4+ weeks (against the later ones, quick relapses set apart)", perSeed((r) => shareOf(r, windows.early, "repeat")), shareRef(c.laterApart.out4, c.laterApart.n)),
      gradeCheck(report, "later, out 4+ weeks (against every later one)", perSeed((r) => shareOf(r, windows.early, "repeat")), shareRef(c.later.out4, c.later.n)),
      gradeCheck(report, "first concussions, a league-season", perSeed((r) => seasonMean(r, windows.early, (s) => s.concussions?.first[0])), NONE),
      gradeCheck(report, "later concussions, a league-season", perSeed((r) => seasonMean(r, windows.early, (s) => s.concussions?.repeat[0])), NONE),
    ];
    const byBand = (r: CareerCheckRows, w: readonly [number, number]) => {
      const out = new Map<string, [number, number, number]>();
      for (const s of seasonsIn(r, w)) {
        for (const [age, x] of Object.entries(s.concussions?.byAge ?? {})) {
          const a = ageNumber(age);
          if (a !== null) add3(out, ageBandOf(EXIT_AGE_BANDS, a)!, x);
        }
      }
      return out;
    };
    const early = runs.map((r) => byBand(r, windows.early));
    for (const b of EXIT_AGE_BANDS) {
      const rb = real.byAge[b.key];
      checks.push(gradeCheck(report, `${b.key}, out 4+ weeks`, poolSeeds(early.map((m) => { const x = m.get(b.key); return x === undefined ? null : per(x[1], x[0]); })), shareRef(rb.concussionOut4, rb.concussions)));
    }
    for (const b of EXIT_AGE_BANDS) {
      checks.push(gradeCheck(report, `${b.key}, share that were later ones`, poolSeeds(early.map((m) => { const x = m.get(b.key); return x === undefined ? null : per(x[2], x[0]); })), NONE));
    }
    const dur = (r: CareerCheckRows, w: readonly [number, number], cls: string) => {
      let n = 0, d = 0, a = 0, all = 0;
      for (const s of seasonsIn(r, w)) {
        const x = s.durabilityByConcussions;
        if (x === null || x === undefined) continue;
        for (const [k, v] of Object.entries(x)) { all += v[0]; if (k === cls) { n += v[0]; d += v[1]; a += v[2]; } }
      }
      return { durability: per(d, n), age: per(a, n), share: per(n, all) };
    };
    for (const cls of CONCUSSION_CLASSES) {
      checks.push(gradeCheck(report, `durability, ${cls} concussions had`, perSeed((r) => dur(r, windows.early, cls).durability), NONE));
      checks.push(gradeCheck(report, `mean age, ${cls} concussions had`, perSeed((r) => dur(r, windows.early, cls).age), NONE));
      checks.push(gradeCheck(report, `share of the 53s, ${cls} concussions had`, perSeed((r) => dur(r, windows.early, cls).share), NONE));
    }
    rows.push(row("concussion", checks,
      "Time-loss football concussions in the regular season, out 4+ weeks by the draw's length, first and later: later is any after a concussion of his earlier in the walk " +
      "(every draw counts, any phase, setting or band; the league file's current injuries do not). The real side's first is the first seen since 2019 and its shares are Kaplan-Meier " +
      "(reference SEs binomial on its counts, CHOSEN); 'quick relapses set apart' is its later row without the relapses after one game back (§12.3.4's 26.3%). By age: the sim's " +
      "out 4+ share and how many of the band's were later ones, beside the real concussion class's out 4+ share by age (§12.3.3: 'Concussion: not yet', measured here). " +
      "Durability on the week-8 53s by how many concussions a man has had (the sim's PlayerMemory.injuries), with the class's mean age and share."));
  }
  // Contact per snap by spot (information only) and career contact at 27 (AB6's free value).
  {
    const bySpot = (r: CareerCheckRows, w: readonly [number, number], spot: string) => {
      const [snaps, contact] = sumPairs(seasonsIn(r, w).map((s) => s.contact?.bySpot[spot]));
      return per(contact, snaps);
    };
    const spots = [...new Set(runs.flatMap((r) => r.perSeason.flatMap((s) => Object.keys(s.contact?.bySpot ?? {}))))];
    const order = (s: string) => { const i = SPOT_ORDER.indexOf(s as Position); return i < 0 ? SPOT_ORDER.length : i; };
    spots.sort((a, b) => order(a) - order(b) || a.localeCompare(b));
    const checks: GradeCheck[] = spots.map((spot) => gradeCheck(report, `${spot}, contact a snap`, perSeed((r) => bySpot(r, windows.early, spot)), NONE));
    const at27 = (r: CareerCheckRows, w: readonly [number, number], who: "entrants" | "all") => medianOf(seasonsIn(r, w).flatMap((s) => s.contact?.at27[who] ?? []));
    for (const [w, label] of [[windows.early, windowLabel(windows.early)], [windows.later, laterLabel]] as const) {
      for (const who of ["entrants", "all"] as const) {
        const c = gradeCheck(report, `median career contact at 27, ${who === "entrants" ? "the walk's own entrants" : "every man"}, ${label}`, perSeed((r) => at27(r, w, who)), NONE);
        checks.push(w === windows.later ? laterCheck(c) : c);
      }
    }
    rows.push(row("contact-spot", checks,
      "Contact taken (ADR-087 §12.3.6, information only): each game, for each roll set of CONTACT_RATINGS (careerAging.ts CONTACT_ROLL_SETS, read from the engine), the largest " +
      "won + lost among its ratings, summed over the sets; a lower bound on contact contests that never counts one twice. Per snap at the spot played (every snap: offense, defense, " +
      "special teams). Career contact at 27: of the men aged 27 in a season with a regular-season snap, the median of each man's contact over the walk's regular-season games " +
      "through that season (each seed's median, then the mean over seeds); the walk's own entrants apart, whose whole careers are in the walk once the window is late enough " +
      "(a league-file man's count starts at the walk's start, as AB6's counter starts at 0 for everyone). AB6's `free` is this median (§12.3.6)."));
  }
  // Availability, the real side's way: the share of game weeks missed hurt by age.
  {
    const weeksOf = (r: CareerCheckRows, w: readonly [number, number]) => {
      const byAge: Record<string, [number, number]> = {};
      for (const s of seasonsIn(r, w)) for (const [a, [n, k]] of Object.entries(s.gameWeeks ?? {})) { const t = (byAge[a] ??= [0, 0]); t[0] += n; t[1] += k; }
      return bandCounts(EXIT_AGE_BANDS, byAge);
    };
    const realAll = EXIT_AGE_BANDS.reduce((a, b) => ({ k: a.k + real.byAge[b.key].missed, n: a.n + real.byAge[b.key].gameWeeks }), { k: 0, n: 0 });
    const checks: GradeCheck[] = EXIT_AGE_BANDS.map((b) => gradeCheck(report, b.key, perSeed((r) => shareOrNull(weeksOf(r, windows.early).get(b.key))),
      shareRef(real.byAge[b.key].missedShare, real.byAge[b.key].gameWeeks)));
    checks.push(gradeCheck(report, "every age", perSeed((r) => { const t = sumPairs([...weeksOf(r, windows.early).values()]); return per(t[1], t[0]); }), shareRef(realAll.k / realAll.n, realAll.n)));
    for (const b of EXIT_AGE_BANDS) {
      checks.push(laterCheck(gradeCheck(report, `${b.key}, ${laterLabel}`, perSeed((r) => shareOrNull(weeksOf(r, windows.later).get(b.key))), shareRef(real.byAge[b.key].missedShare, real.byAge[b.key].gameWeeks))));
    }
    rows.push(row("availability-aligned", checks,
      "The share of game weeks missed hurt, by age, read the real side's way (injury-rates.md, 'Game weeks'): for each team game, of the men on its 53 or a reserve list, " +
      "a game week is one he played (a snap), was healthy on the 53 and did not play, or missed hurt (an injury of any setting, illness included, and no snap); a healthy man on a " +
      "reserve list is not counted. K, P and LS by spot left out, as the real side leaves listed K/P out. The real share is 'Missed for injury' (any cause; 'football' alone is a " +
      "little lower), 2019-24. The real side's IR rules (2019's season-ending IR, the stashing of young men) lift its youngest band. The availability row above reads the sim's " +
      "own older definition (man-weeks on a 53, day 1 of each week)."));
  }
  // Retirements by moment and way, and by years in the league.
  {
    const momentMean = (r: CareerCheckRows, m: (typeof RETIREMENT_MOMENTS)[number], way: RetirementWay) => seasonMean(r, windows.early, (s) => s.retiredHow?.byMoment[m][way]);
    const checks: GradeCheck[] = [];
    for (const m of RETIREMENT_MOMENTS) for (const way of RETIREMENT_WAYS) checks.push(gradeCheck(report, `${m}, ${way}, a season`, perSeed((r) => momentMean(r, m, way)), NONE));
    const yearsMean = (r: CareerCheckRows, b: string, way: RetirementWay) => seasonMean(r, windows.early, (s) => {
      const x = s.retiredHow?.byYears[way];
      if (x === undefined) return null;
      let n = 0;
      for (const [y, k] of Object.entries(x)) if (ageBandOf(YEARS_IN_LEAGUE_BANDS, ageNumber(y)) === b) n += k;
      return n;
    });
    for (const b of YEARS_IN_LEAGUE_BANDS) for (const way of RETIREMENT_WAYS) checks.push(gradeCheck(report, `${b.key}, ${way}, a season`, perSeed((r) => yearsMean(r, b.key, way)), NONE));
    const cohort = (r: CareerCheckRows, w: readonly [number, number], way: RetirementWay | "any") => {
      const byYears: Record<string, [number, number]> = {};
      for (const c of r.exits?.retiredNextYearByYears ?? []) {
        if (!inWindow(c.y, w)) continue;
        for (const [y, x] of Object.entries(c.byYears)) {
          const t = (byYears[y] ??= [0, 0]);
          t[0] += x.n;
          t[1] += way === "any" ? x.unsigned + x.ownSigned + x.ownUnsigned : x[way];
        }
      }
      return bandCounts(YEARS_IN_LEAGUE_BANDS, byYears);
    };
    for (const b of YEARS_IN_LEAGUE_BANDS) {
      checks.push(gradeCheck(report, `${b.key}, final-week 53 retired within a year, own choice while signed`, perSeed((r) => shareOrNull(cohort(r, windows.early, "ownSigned").get(b.key))),
        est(nfl.retiredList.byYearsInLeague[b.key].share)));
    }
    for (const b of YEARS_IN_LEAGUE_BANDS) checks.push(gradeCheck(report, `${b.key}, final-week 53 retired within a year, any way`, perSeed((r) => shareOrNull(cohort(r, windows.early, "any").get(b.key))), NONE));
    rows.push(row("retire-moment", checks,
      "The season's retirements by moment (PLAYER_RETIRED.timing: IMMEDIATE, SLOW, LATE, SEASON_END) and way (unsigned, his own choice while signed, his own choice unsigned), " +
      "and by way and years in the league (the season less his first, as the real rosters' years_exp; bands as nfl-careers'), each a season over the window. Then the final-week " +
      "cohorts of the retired-signed row by years in the league, against the reserve/retired list by years in the league (Y 2021-24, a lower bound: only men under contract are placed on it)."));
  }
  // The teams' overall: its spread and how it carries, beside the win spread and win r.
  {
    const rWindow: readonly [number, number] = [windows.early[0] + 1, windows.early[1]];
    const rLater: readonly [number, number] = [windows.later[0] + 1, windows.later[1]];
    const withWins = (s: SeasonRow) => {
      const t = s.teamOverall;
      if (t === null || t === undefined) return null;
      const xs: number[] = [], ys: number[] = [];
      t.byTeam.forEach((x, i) => { if (x !== null && s.wins[i] !== undefined) { xs.push(x); ys.push(s.wins[i]!); } });
      return pearson(xs, ys);
    };
    const checks: GradeCheck[] = [
      gradeCheck(report, `team overall spread, ${windowLabel(windows.early)}`, perSeed((r) => seasonMean(r, windows.early, (s) => s.teamOverall?.spread)),
        asRef(perSeed((r) => seasonMean(r, firstOf(r), (s) => s.teamOverall?.spread)))),
      gradeCheck(report, `team overall year-to-year r, ${windowLabel(windows.early)}`, perSeed((r) => seasonMean(r, rWindow, (s) => s.teamOverall?.r)), NONE),
      gradeCheck(report, `team overall against wins, same season (r), ${windowLabel(windows.early)}`, perSeed((r) => seasonMean(r, windows.early, withWins)), NONE),
      gradeCheck(report, `win spread, ${windowLabel(windows.early)}`, perSeed((r) => seasonMean(r, windows.early, (s) => s.winSpread)), est(nfl.winSpread.spread)),
      gradeCheck(report, `win r, ${windowLabel(windows.early)}`, perSeed((r) => seasonMean(r, rWindow, (s) => s.winR)), est(nfl.winYearOverYearR.r)),
      laterCheck(gradeCheck(report, `team overall spread, ${laterLabel}`, perSeed((r) => seasonMean(r, windows.later, (s) => s.teamOverall?.spread)),
        asRef(perSeed((r) => seasonMean(r, firstOf(r), (s) => s.teamOverall?.spread))))),
      laterCheck(gradeCheck(report, `team overall year-to-year r, ${laterLabel}`, perSeed((r) => seasonMean(r, rLater, (s) => s.teamOverall?.r)), NONE)),
    ];
    rows.push(row("team-overall", checks,
      "Each team's starters' mean overall at week 8 (the starters as the engine fields them, each at his own position, as teamStrength reads them; a short team left out): its " +
      "spread (population sd over the teams, as the win spread is) against year 0's, its year-to-year r over the pairs inside the window, and its r with the same season's wins; " +
      "the win spread and win r beside it against the NFL's (§12.6: a team of late faders should stay good longer)."));
  }
  // D7 by round band with starts by age, the whole walk.
  {
    const cells = (r: CareerCheckRows) => {
      const out = new Map<string, [number, number]>();
      for (const s of r.perSeason) {
        for (const [band, byAge] of Object.entries(s.draftEnd ?? {})) {
          for (const [age, [n, k]] of Object.entries(byAge)) {
            const bin = ageBandOf(ABILITY_AGE_BINS, ageNumber(age));
            for (const key of [`${band}|all`, ...(bin === null ? [] : [`${band}|${bin}`])]) { const t = out.get(key) ?? [0, 0]; t[0] += n; t[1] += k; out.set(key, t); }
          }
        }
      }
      return out;
    };
    const all = runs.map(cells);
    const checks: GradeCheck[] = [];
    for (const band of ["1", "2", "3", "4-7"]) {
      checks.push(gradeCheck(report, `round ${band}, every age`, poolSeeds(all.map((m) => shareOrNull(m.get(`${band}|all`)))), { value: nflDraft.starterRate[band] ?? null, se: null }));
      for (const b of ABILITY_AGE_BINS) checks.push(gradeCheck(report, `round ${band}, aged ${b.key}`, poolSeeds(all.map((m) => shareOrNull(m.get(`${band}|${b.key}`)))), NONE));
    }
    rows.push(row("d7-age", checks,
      "The walk's own draftees on a 53 at each season's end (the people after the year turn, as the D7 starter rate reads them), the share that started (the first STARTING men at his " +
      "position on the chart), by round band and age in the season, over the whole walk. 'Every age' is the D7 starter rate's own reading, against NFL_DRAFT (no age split there)."));
  }
  return rows;
}

export function gradeCareerCheck(input: GradeInput): CareerGrade {
  const nfl = input.nfl ?? NFL_CAREERS;
  const nflDraft = input.nflDraft ?? NFL_DRAFT;
  const windows = input.windows ?? PLAN_WINDOWS;
  const graded_ = input.seeds.filter((s) => input.rows.has(s));
  const missing = input.seeds.filter((s) => !input.rows.has(s));
  const runs = graded_.map((s) => input.rows.get(s)!);
  const coachGraded = input.coach.seeds.filter((s) => input.coach.incumbent.has(s) && input.coach.form.has(s));
  const coachMissing = input.coach.seeds.filter((s) => !coachGraded.includes(s));
  const rows: GradeRow[] = [];
  const perSeed = (f: (r: CareerCheckRows) => number | null | undefined) => poolSeeds(runs.map(f));
  const ref0 = (f: (p: RosterPicture) => number) => { const p = perSeed((r) => { const y = year0(r); return y === null ? null : f(y); }); return { value: p.value, se: p.se }; };

  // Drift: the 53s against year 0.
  const eachYear = (id: string, f: (p: RosterPicture) => number) => {
    const b = bandOf(id);
    const ref = ref0(f);
    return yearsOf(windows.early).map((y) => gradeCheck(b.rule, String(y), perSeed((r) => { const p = week8(r, y); return p === null ? null : f(p); }), ref));
  };
  rows.push(row("overall-mean-each", eachYear("overall-mean-each", (p) => p.overall.mean)));
  rows.push(row("overall-mean-late", [gradeCheck(bandOf("overall-mean-late").rule, `${windows.late[0]}-${windows.late[1]}`,
    perSeed((r) => windowMean(r, windows.late, (p) => p.overall.mean)), ref0((p) => p.overall.mean))]));
  // The pooled sd against the league file as loaded (the Spread card, 2026-11-01); year 0 beside it, reported.
  const sdRule = bandOf("pooled-sd").rule;
  const fileSd = perSeed((r) => r.file?.overall.pooledSd ?? null);
  const fileRef = { value: fileSd.value, se: fileSd.se };
  const sdYear0 = gradeCheck(sdRule, `year 0 (${runs[0]?.firstSeason ?? "-"} wk 8), against the same band`, perSeed((r) => year0(r)?.overall.pooledSd ?? null), fileRef);
  rows.push(row("pooled-sd", [
    gradeCheck(sdRule, `${windows.late[0]}-${windows.late[1]}`, perSeed((r) => windowMean(r, windows.late, (p) => p.overall.pooledSd)), fileRef),
    { ...sdYear0, status: "REPORTED" },
  ], "Measured from the league file as loaded (the Spread card's answer, 2026-11-01): its 53s before the walk signs anyone. " +
    "Year 0's week-8 value is shown against the same band, not graded: it carries the stopgap kickers (and a few punters) the walk signs for injuries."));
  rows.push(row("at95", eachYear("at95", (p) => p.ratings.at95)));
  rows.push(row("at99", eachYear("at99", (p) => p.ratings.at99)));
  rows.push(row("gap", eachYear("gap", (p) => p.gap.gap)));
  const report = bandOf("groups-report").rule;
  const groupChecks: GradeCheck[] = [];
  for (const g of CAREER_GROUPS) {
    groupChecks.push(gradeCheck(report, `${g} mean`, perSeed((r) => windowMean(r, windows.late, (p) => p.groups[g].mean)), ref0((p) => p.groups[g].mean)));
    groupChecks.push(gradeCheck(report, `${g} top-5`, perSeed((r) => windowMean(r, windows.late, (p) => p.groups[g].top5)), ref0((p) => p.groups[g].top5)));
  }
  const ratingGroups = Object.keys(runs.find((r) => year0(r) !== null)?.perSeason[0]?.week8?.ratingGroups ?? {});
  for (const rg of ratingGroups) {
    groupChecks.push(gradeCheck(report, `rating group ${rg}`, perSeed((r) => windowMean(r, windows.late, (p) => p.ratingGroups[rg] ?? 0)), ref0((p) => p.ratingGroups[rg] ?? 0)));
  }
  rows.push(row("groups-report", groupChecks));

  // The coach-style check: the incumbent league against the form league, seed by seed.
  const coachRuns = coachGraded.map((s) => ({ inc: input.coach.incumbent.get(s)!, form: input.coach.form.get(s)! }));
  const coachYears = [...new Set(coachRuns.flatMap((c) => c.inc.perSeason.map((p) => p.season)))].sort((a, b) => a - b);
  const slotChecks = coachYears.map((y) => gradeCheck(bandOf("coach-slots").rule, String(y), poolSeeds(coachRuns.map(({ inc, form }) => {
    const a = seasonRow(inc, y)?.slots ?? [], b = seasonRow(form, y)?.slots ?? [];
    if (a.length === 0 || a.length !== b.length) return null;
    return a.filter((x, i) => x !== b[i]).length / a.length;
  })), { value: null, se: null }));
  rows.push(row("coach-slots", slotChecks));
  const sdChecks = coachYears.map((y) => {
    const of = (pick: (c: (typeof coachRuns)[number]) => CareerCheckRows) => poolSeeds(coachRuns.map((c) => week8(pick(c), y)?.overall.pooledSd ?? null));
    const form = of((c) => c.form);
    return gradeCheck(bandOf("coach-sd").rule, String(y), of((c) => c.inc), { value: form.value, se: form.se });
  });
  rows.push(row("coach-sd", sdChecks, "The incumbent league's pooled sd against the form league's, as a share of the form league's."));

  // Ages, shares, rookies against the NFL's week 8, the league rows against the latest three real
  // seasons (2022-24): the judged years, then year 0 against the same band (reported), with the
  // NFL's season-by-season values and their trend in the note. Every NFL row reads the 53s counted
  // like the NFL (`week8Nfl`, rows version 5); the later window is shown beside the judged years.
  const nflW8 = nfl.weekEight;
  const firstSeason = runs[0]?.firstSeason ?? null;
  const w8Years = `${WEEK_EIGHT_LEAGUE_YEARS[0]}-${WEEK_EIGHT_LEAGUE_YEARS[1]}`;
  const laterLabel = `later window ${windowLabel(windows.later)}`;
  const NFL_COUNT_NOTE = "Read on the 53s counted like the NFL (week8Nfl): the men out 4+ weeks (an unhealed LONG or MAJOR injury) left out, as the real count leaves out injured reserve. ";
  const cross = (id: string, f: (p: RosterPicture) => number, key: W8Key, more: GradeCheck[] = []) => {
    const rule = bandOf(id).rule;
    const refE = weekEightLeagueReference(nfl, key);
    const y0 = gradeCheck(rule, `year 0 (${firstSeason ?? "-"}), against the same band`, perSeed((r) => { const p = year0(r, nflPicture); return p === null ? null : f(p); }), est(refE));
    const later = gradeCheck(rule, laterLabel, perSeed((r) => windowMean(r, windows.later, f, nflPicture)), est(refE));
    const seasons = nflW8.leagueBySeason.map((x) => x.season), values = nflW8.leagueBySeason.map((x) => x[key]);
    const slope = slopeOf(seasons, values);
    const v = (x: number) => (key === "meanAge" ? `${x.toFixed(2)}` : `${(100 * x).toFixed(1)}`);
    const unit = key === "meanAge" ? " years" : " points";
    const graded = refE === null
      ? `Graded against ${w8Years}, the latest three seasons (ADR-087 §11), but not all three are in the real side's numbers: no reference. `
      : `Graded against ${w8Years}, the latest three seasons (ADR-087 §11): their mean ${v(refE.value)}, SE their sample SD over √3. `;
    const note = values.length === 0 ? undefined
      : `NFL by season, ${seasons[0]}-${seasons[seasons.length - 1]}: ${values.map(v).join(", ")}${key === "meanAge" ? "" : " (%)"}; ` +
        `least-squares trend ${slope === null ? "-" : `${slope >= 0 ? "+" : ""}${v(slope)}`}${unit} a season. ` + graded +
        "Year 0 is the real league as the walk plays its first season, reported against the same band, not graded. " + NFL_COUNT_NOTE +
        `The later window (${windowLabel(windows.later)}) is reported beside the judged years.`;
    return row(id, [gradeCheck(rule, "league", perSeed((r) => windowMean(r, windows.early, f, nflPicture)), est(refE)), { ...y0, status: "REPORTED" }, ...more, laterCheck(later)], note);
  };
  rows.push(cross("age-league", (p) => p.age.mean, "meanAge"));
  const groupAge = (g: CareerGroup) => (p: RosterPicture) => (p.groups[g].n > 0 ? p.groups[g].age : NaN);
  rows.push(row("age-group", [
    ...CAREER_GROUPS.map((g) => gradeCheck(bandOf("age-group").rule, g, perSeed((r) => windowMean(r, windows.early, groupAge(g), nflPicture)), est(nflW8.byGroup[g].meanAge), g)),
    ...CAREER_GROUPS.map((g) => laterCheck(gradeCheck(bandOf("age-group").rule, `${g}, ${laterLabel}`,
      perSeed((r) => windowMean(r, windows.later, groupAge(g), nflPicture)), est(nflW8.byGroup[g].meanAge), g))),
  ], NFL_COUNT_NOTE + "Each group's later window is reported after the judged groups."));
  rows.push(cross("share-22", (p) => p.age.upTo22, "age22OrUnder"));
  rows.push(cross("share-31", (p) => p.age.from31, "age31Plus"));
  rows.push(cross("share-34", (p) => p.age.from34, "age34Plus"));

  // Peak usage age, seeds pooled.
  const usageGroups = CAREER_GROUPS.filter((g) => !SPECIALIST_GROUPS.has(g));
  const seedCells = runs.map((r) => windowCells(r, windows.early));
  const pooledCells: Record<string, Record<string, UsageCell>> = {};
  for (const c of seedCells) for (const [g, cells] of Object.entries(c)) addCells((pooledCells[g] ??= {}), cells);
  const peakOf = (cells: Record<string, UsageCell> | undefined, exit: boolean) => (cells === undefined ? null : usagePeak(cells, exit).peak);
  const peaks: Record<string, number | null> = {};
  const peakChecks: GradeCheck[] = [];
  for (const g of usageGroups) {
    const ref = nfl.peakUsage.byGroup[g as keyof NflCareers["peakUsage"]["byGroup"]];
    const se = poolSeeds(seedCells.map((c) => peakOf(c[g], false)));
    peaks[g] = peakOf(pooledCells[g], false);
    peakChecks.push(gradeCheck(bandOf("peak-usage").rule, g, { value: peaks[g]!, se: se.se, n: se.n }, est(ref.peakAge)));
    const seExit = poolSeeds(seedCells.map((c) => peakOf(c[g], true)));
    peakChecks.push(gradeCheck({ kind: "report" }, `${g} with exits`, { value: peakOf(pooledCells[g], true), se: seExit.se, n: seExit.n }, est(ref.peakAgeWithExits)));
  }
  // The later window, reported: the pairs with both seasons in it, seeds pooled.
  const laterCells = runs.map((r) => windowCells(r, windows.later));
  const pooledLater: Record<string, Record<string, UsageCell>> = {};
  for (const c of laterCells) for (const [g, cells] of Object.entries(c)) addCells((pooledLater[g] ??= {}), cells);
  for (const g of usageGroups) {
    const ref = nfl.peakUsage.byGroup[g as keyof NflCareers["peakUsage"]["byGroup"]];
    const se = poolSeeds(laterCells.map((c) => peakOf(c[g], false)));
    peakChecks.push(laterCheck(gradeCheck(bandOf("peak-usage").rule, `${g}, ${laterLabel}`, { value: peakOf(pooledLater[g], false), se: se.se, n: se.n }, est(ref.peakAge))));
  }
  rows.push(row("peak-usage", peakChecks, "The stayers' peak is graded; the variant with exits is shown beside it, and the later window after every group."));
  const rb = peaks.RB ?? null;
  const others = usageGroups.filter((g) => g !== "RB").map((g) => peaks[g]).filter((p): p is number => p !== null);
  const earliest = rb === null || others.length === 0 ? null : rb <= Math.min(...others);
  rows.push({
    ...row("peak-rb-earliest", []),
    status: earliest === null ? "NO_DATA" : earliest ? "PASS" : "FAIL",
    checks: [{ label: "RB against the earliest other group", sim: rb, seSim: null, seeds: runs.length, ref: others.length === 0 ? null : Math.min(...others), seRef: null, halfWidth: null, resolution: null, inBand: earliest, outside: null, status: earliest === null ? "NO_DATA" : earliest ? "PASS" : "FAIL" }],
    note: "RB's pooled peak at or before every other group's (ties allowed). The real league's stayers tie RB at 24 with QB, WR, LB and CB.",
  });

  // Careers by entry group, seeds pooled; the expected career over the real side's horizon, carried
  // flat past its longest follow-up.
  const seedEntrants = runs.map((r) => graded(r.careers.entrants, r.careers.lastSeason));
  const pooledEntrants = seedEntrants.flat();
  const followUp = nfl.careers.lastObserved - nfl.careers.entrySeasons[0] + 1;
  // Each unit (a group, a family, the league) is one Kaplan-Meier over its entrants, seeds pooled; its
  // SE is the seed-to-seed SE of the same reading on each seed's entrants.
  type CareerUnit = { readonly label: string; readonly keep: (e: CareerEntrant) => boolean; readonly ref: Pick<NflCareers["careers"]["league"], "expectedCareer" | "reach5" | "reach10"> };
  const groupUnits: CareerUnit[] = CAREER_GROUPS.map((g) => ({ label: g, keep: (e) => e.g === g, ref: nfl.careers.byGroup[g] }));
  const familyUnits: CareerUnit[] = CAREER_FAMILY_KEYS.map((f) => {
    const members = new Set<CareerGroup>(CAREER_FAMILIES[f]);
    return { label: familyLabel(f), keep: (e) => members.has(e.g), ref: nfl.careers.byFamily[f] };
  });
  const leagueUnits: CareerUnit[] = [{ label: "league", keep: () => true, ref: nfl.careers.league }];
  type CareerMeasure = "expectedCareer" | "reach5" | "reach10";
  const careerPick: Record<CareerMeasure, (km: ReturnType<typeof kaplanMeier>) => number | null> = {
    expectedCareer: (km) => expectedCareer(km.survival, nfl.careers.horizon, followUp),
    reach5: (km) => km.reach5,
    reach10: (km) => km.reach10,
  };
  const careerNote = (what: string) => `Entrants pooled over seeds: ${pooledEntrants.length}, ${what}, by the group of the 53 on the regular season's last day in their first credited season. ` +
    `Expected career: the mean to ${nfl.careers.horizon} seasons with the curve carried flat past ${followUp} (the real side's longest follow-up).`;
  const careerRow = (id: string, measure: CareerMeasure, units: readonly CareerUnit[], what: string) =>
    row(id, units.map((u) => {
      const pick = careerPick[measure];
      const km = kaplanMeier(lifeTable(pooledEntrants.filter(u.keep)));
      const se = poolSeeds(seedEntrants.map((es) => pick(kaplanMeier(lifeTable(es.filter(u.keep))))));
      return gradeCheck(bandOf(id).rule, u.label, { value: pick(km), se: se.se, n: se.n }, est(u.ref[measure]));
    }), careerNote(what));
  const byFamilyNote = `families pooled from their member groups' entrants (${CAREER_FAMILY_KEYS.map(familyLabel).join("; ")}), as the real side pools its`;
  for (const m of ["expectedCareer", "reach5", "reach10"] as const) {
    const id = m === "expectedCareer" ? "career-expected" : m === "reach5" ? "career-reach5" : "career-reach10";
    rows.push(careerRow(id, m, groupUnits, "graded by entry group"));
    rows.push(careerRow(`${id}-family`, m, familyUnits, byFamilyNote));
    rows.push(careerRow(`${id}-league`, m, leagueUnits, "every entrant together"));
  }

  // A rookie is a man in his first season in the league, as the real rosters' years_exp 0 reads; the
  // earlier reading (no credited season yet, which keeps a man who has never ended a season on a
  // 53 a rookie in his second year) is shown beside it, not graded.
  rows.push(cross("rookie", (p) => p.rookieShare, "rookie", [{
    ...gradeCheck({ kind: "report" }, "no credited season yet (the earlier reading, not graded)",
      perSeed((r) => windowMean(r, windows.early, (p) => p.noCreditShare ?? NaN, nflPicture)), est(weekEightLeagueReference(nfl, "rookie"))),
  }]));
  rows.push(cross("undrafted", (p) => p.undraftedShare, "undrafted"));

  // D7, switches on, against NFL_DRAFT (which carries no SE): the starter rate by round band gates,
  // ever a starter and the round-1 shares are reported (ADR-087 §11).
  const bands = ["1", "2", "3", "4-7"];
  rows.push(row("d7-starter", bands.map((b) => gradeCheck(bandOf("d7-starter").rule, `round ${b}`, perSeed((r) => r.draft.starterRate[b]), { value: nflDraft.starterRate[b] ?? null, se: null })),
    "Player-seasons on a 53 that ended as a starter, over all player-seasons on a 53, for men drafted during the walk (draftCheck.ts)."));
  rows.push(row("d7-ever", bands.map((b) => gradeCheck(bandOf("d7-ever").rule, `round ${b}`, perSeed((r) => r.draft.everStarter[b]), { value: nflDraft.everStarter[b] ?? null, se: null }))));
  rows.push(row("d7-round1", Object.keys(nflDraft.roundOneShare).map((g) => gradeCheck(bandOf("d7-round1").rule, g, perSeed((r) => r.draft.roundOneShare[g]), { value: nflDraft.roundOneShare[g] ?? null, se: null }))));

  // Teams: the win spread and how wins carry over.
  const seasonMean = (r: CareerCheckRows, pick: (s: SeasonRow) => number | null, w: readonly [number, number]) => {
    const xs = r.perSeason.filter((s) => inWindow(s.season, w)).map(pick).filter((x): x is number => x !== null);
    return xs.length === 0 ? null : mean(xs);
  };
  // The win spread: a floor the owner set (GATE; a fixed number, no SE), and the NFL's band beside it (reported).
  const spread = perSeed((r) => seasonMean(r, (s) => s.winSpread, windows.early));
  const floor = bandOf("win-spread").rule as Extract<BandRule, { kind: "atLeast" }>;
  const spreadLater = perSeed((r) => seasonMean(r, (s) => s.winSpread, windows.later));
  rows.push(row("win-spread", [
    gradeCheck(floor, `${windows.early[0]}-${windows.early[1]}`, spread, { value: floor.min, se: null }),
    laterCheck(gradeCheck(floor, laterLabel, spreadLater, { value: floor.min, se: null })),
  ], "The Even card's answer: at least 2.75 blocks below, nothing above; a league too uneven shows on the NFL band's row. The later window is reported, not graded."));
  rows.push(row("win-spread-nfl", [
    gradeCheck(bandOf("win-spread-nfl").rule, `${windows.early[0]}-${windows.early[1]}`, spread, est(nfl.winSpread.spread)),
    laterCheck(gradeCheck(bandOf("win-spread-nfl").rule, laterLabel, spreadLater, est(nfl.winSpread.spread))),
  ]));
  // The growth tuning's yardstick (the Floor card, 2026-11-01): the later seasons against season one, same seeds.
  const seasonOne = perSeed((r) => seasonRow(r, r.firstSeason)?.winSpread ?? null);
  rows.push(row("win-spread-season-one", [gradeCheck(bandOf("win-spread-season-one").rule, `${windows.early[0]}-${windows.early[1]}`, spread, { value: seasonOne.value, se: seasonOne.se })],
    "The Floor card's answer: 2.75 stays the line for the flip; a growth or draft-talent tuning round is judged on keeping the later seasons as spread out as season one " +
    "(the walk's first season, both switches on). At or above it passes; below it by no more than 2·√(SE_sim² + SE_ref²) is not resolvable; further below fails."));
  const rWindow: readonly [number, number] = [windows.early[0] + 1, windows.early[1]];
  const winR = gradeCheck({ kind: "range", lo: 0.25, hi: 0.55 }, `${windows.early[0]}-${windows.early[1]}`,
    perSeed((r) => seasonMean(r, (s) => s.winR, rWindow)), est(nfl.winYearOverYearR.r));
  const rLater: readonly [number, number] = [windows.later[0] + 1, windows.later[1]];
  const winRLater = gradeCheck({ kind: "range", lo: 0.25, hi: 0.55 }, laterLabel, perSeed((r) => seasonMean(r, (s) => s.winR, rLater)), est(nfl.winYearOverYearR.r));
  rows.push(row("win-r", [{ ...winR, status: "REPORTED" }, laterCheck(winRLater)]));

  // Reported: comebacks, unsigned retirements by wait, the free-agent pool's trend.
  const other: GradeCheck[] = [];
  const comeback = (r: CareerCheckRows, w: readonly [number, number]) => {
    const cs = r.careers.comebacks.filter((c) => inWindow(c.season, w));
    const out = cs.reduce((a, c) => a + c.out, 0);
    return out === 0 ? null : cs.reduce((a, c) => a + c.back, 0) / out;
  };
  const retiredShare = (r: CareerCheckRows, cls: "under1" | "1to2", w: readonly [number, number]) => {
    let k = 0, n = 0;
    for (const s of r.perSeason) {
      if (!inWindow(s.season, w)) continue;
      for (const x of Object.values(s.unsigned.retired)) { k += x[cls]; n += x.under1 + x["1to2"] + x["2plus"]; }
    }
    return n === 0 ? null : k / n;
  };
  const poolTrendIn = (w: readonly [number, number]) => perSeed((r) => trendShare(r.perSeason.filter((s) => inWindow(s.season, w)).map((s) => s.freeAgents.end)));
  const otherChecks = (w: readonly [number, number], suffix: string): GradeCheck[] => [
    gradeCheck({ kind: "report" }, `back after a season out${suffix}`, perSeed((r) => comeback(r, w)), est(nfl.comebacks.share)),
    gradeCheck({ kind: "report" }, `unsigned retirements after under a year (share of known waits)${suffix}`, perSeed((r) => retiredShare(r, "under1", w)), { value: null, se: null }),
    gradeCheck({ kind: "report" }, `unsigned retirements after one to two years${suffix}`, perSeed((r) => retiredShare(r, "1to2", w)), { value: null, se: null }),
    { ...gradeCheck({ kind: "abs", half: 0.05 }, `free-agent pool trend a year (band: under 5%)${suffix}`, poolTrendIn(w), { value: 0, se: 0 }), status: "REPORTED" },
  ];
  other.push(...otherChecks(windows.early, ""), ...otherChecks(windows.later, `, ${laterLabel}`).map(laterCheck));
  rows.push(row("other-report", other, "The unsigned retirements are the unsigned rule's alone (reason UNSIGNED), as the reader counts them from rows version 5."));

  // --- Added for the owner's aging rulings of 2026-11-06 (rows version 5): every row REPORT. ---

  // Shares 31+ and 34+ by group, on the 53s counted like the NFL: against 2022-24 (mean of the three
  // seasons, as the league rows) and 2018-24 pooled; the later window after every group. A row
  // written before version 5 has no group share (and no NFL count): no data.
  const groupShareRow = (id: string, pick: "from31" | "from34", key: "age31Plus" | "age34Plus") => {
    const rule = bandOf(id).rule;
    const f = (g: CareerGroup) => (p: RosterPicture) => (p.groups[g].n > 0 ? ((p.groups[g] as Partial<GroupPicture>)[pick] ?? NaN) : NaN);
    const checks: GradeCheck[] = [];
    for (const g of CAREER_GROUPS) {
      const sim = perSeed((r) => windowMean(r, windows.early, f(g), nflPicture));
      checks.push(gradeCheck(rule, `${g} vs ${w8Years}`, sim, est(groupSeasonReference(nfl, g, key)), g));
      checks.push(gradeCheck(rule, `${g} vs 2018-2024`, sim, est(nflW8.byGroup[g][key]), g));
    }
    for (const g of CAREER_GROUPS) {
      checks.push(laterCheck(gradeCheck(rule, `${g} vs ${w8Years}, ${laterLabel}`, perSeed((r) => windowMean(r, windows.later, f(g), nflPicture)), est(groupSeasonReference(nfl, g, key)), g)));
    }
    return row(id, checks, NFL_COUNT_NOTE + `R1's direct test: the groups' ages are to come from the abilities, with no aging rule by position. ` +
      "Kickers, punters and long snappers are about 32 real men a season, so their reference SE is near 4 points.");
  };
  rows.push(groupShareRow("share-31-group", "from31", "age31Plus"));
  rows.push(groupShareRow("share-34-group", "from34", "age34Plus"));

  // Signed again within two years, by age, against OverTheCap's REPORTED rates (no SE, no stated age
  // convention: the sim's age in the season the deal ran out and in the next are both shown).
  const otc: ReportedSignedAgain = OTC_SIGNED_AGAIN;
  const signedRule = bandOf("signed-again").rule;
  const signedShare = (w: readonly [number, number], within: 1 | 2, shift: 0 | 1, band?: string, cut: "out" | "only" | "in" = "out") => perSeed((r) => {
    const counts = signedAgainCounts(r, w, SIGNING_AGE_BANDS, { minCapShare: otc.minCapShare, within, shift, cut });
    if (band !== undefined) return shareOrNull(counts.get(band as (typeof SIGNING_AGE_BANDS)[number]["key"]));
    let n = 0, k = 0;
    for (const c of counts.values()) { n += c[0]; k += c[1]; }
    return n === 0 ? null : k / n;
  });
  const signedChecks: GradeCheck[] = [];
  for (const b of SIGNING_AGE_BANDS) signedChecks.push(gradeCheck(signedRule, `${b.key}, age in Y`, signedShare(windows.early, 2, 0, b.key), { value: otc.byAge[b.key], se: null }));
  for (const b of SIGNING_AGE_BANDS) signedChecks.push(gradeCheck(signedRule, `${b.key}, age in Y + 1`, signedShare(windows.early, 2, 1, b.key), { value: otc.byAge[b.key], se: null }));
  for (const b of SIGNING_AGE_BANDS) signedChecks.push(gradeCheck({ kind: "report" }, `${b.key}, within one league year, age in Y`, signedShare(windows.early, 1, 0, b.key), { value: null, se: null }));
  signedChecks.push(gradeCheck({ kind: "report" }, "every age, within two league years", signedShare(windows.early, 2, 0), { value: null, se: null }));
  signedChecks.push(gradeCheck({ kind: "report" }, "every age, the league file's cut deals alone (left out above)", signedShare(windows.early, 2, 0, undefined, "only"), { value: null, se: null }));
  signedChecks.push(gradeCheck({ kind: "report" }, "every age, with the league file's cut deals in", signedShare(windows.early, 2, 0, undefined, "in"), { value: null, se: null }));
  for (const b of SIGNING_AGE_BANDS) {
    signedChecks.push(laterCheck(gradeCheck(signedRule, `${b.key}, age in Y, ${laterLabel}`, signedShare(windows.later, 2, 0, b.key), { value: otc.byAge[b.key], se: null })));
  }
  const dealsIn = (cut: "out" | "only") => runs.reduce((a, r) => a + [...signedAgainCounts(r, windows.early, SIGNING_AGE_BANDS, { minCapShare: otc.minCapShare, within: 2, shift: 0, cut }).values()].reduce((x, c) => x + c[0], 0), 0);
  const dealsJudged = dealsIn("out"), dealsCut = dealsIn("only");
  rows.push(row("signed-again", signedChecks,
    `OverTheCap's rates are REPORTED by the cap thread (${otc.source}): deals of ${(100 * otc.minCapShare).toFixed(1)}%+ of the cap that ran out ${otc.seasons[0]}-${otc.seasons[1]}, ` +
    `n ${otc.n}, no SE and no stated age convention, so the sim's age in the season the deal ran out (Y) and in Y + 1 are both shown. ` +
    "The sim's readings (CHOSEN): APY = the deal's cap hits over its real years, over the cap of the league year it was signed in; signed again = any deal but a " +
    "practice-squad one, with any team, from that season's OFF_EVAL (re-signings and tags come before the expiry) to two league years on; a man who retired first " +
    "is not signed; a deal signed earlier that already ran past Y (an early extension) counts as signed. Judged: deals followed two full league years. " +
    "The league file's deals whose early years the importer cut (it keeps a deal's years from the file's season on; ExpiryRecord.t) read their later, mostly higher, " +
    "cap hits over the cap of the year signed, which overstates their share, so they are left out of the rates (CHOSEN) and shown apart, alone and with the rest; " +
    "they run out mostly in 2026-28, and the few that run out from 2029 on are long deals well above the line. " +
    `Deals judged, seeds pooled: ${dealsJudged}; the file's cut deals left out: ${dealsCut}.`));

  // The roster way, by age in Y: back on a 53 within two seasons; the starters among them gone two seasons.
  const exitCounts = <K extends string>(r: CareerCheckRows, w: readonly [number, number], pick: "backOnA53" | "startersGone", bands: readonly AgeBand<K>[]) => {
    const byAge: Record<string, [number, number]> = {};
    for (const c of r.exits?.[pick] ?? []) {
      if (!inWindow(c.y, w)) continue;
      for (const [a, [n, k]] of Object.entries(c.byAge)) { const t = (byAge[a] ??= [0, 0]); t[0] += n; t[1] += k; }
    }
    return bandCounts(bands, byAge);
  };
  const allOf = (m: ReadonlyMap<string, [number, number]>) => { let n = 0, k = 0; for (const c of m.values()) { n += c[0]; k += c[1]; } return n === 0 ? null : k / n; };
  const exitRow = <K extends string>(id: string, pick: "backOnA53" | "startersGone", bands: readonly AgeBand<K>[], ref: { readonly byAge: Readonly<Record<K, { readonly share: Estimate }>>; readonly all: { readonly share: Estimate } }, note: string) => {
    const rule = bandOf(id).rule;
    const checks: GradeCheck[] = bands.map((b) => gradeCheck(rule, b.key, perSeed((r) => shareOrNull(exitCounts(r, windows.early, pick, bands).get(b.key))), est(ref.byAge[b.key].share)));
    checks.push(gradeCheck(rule, "every age", perSeed((r) => allOf(exitCounts(r, windows.early, pick, bands))), est(ref.all.share)));
    for (const b of bands) checks.push(laterCheck(gradeCheck(rule, `${b.key}, ${laterLabel}`, perSeed((r) => shareOrNull(exitCounts(r, windows.later, pick, bands).get(b.key))), est(ref.byAge[b.key].share))));
    return row(id, checks, note);
  };
  rows.push(exitRow("back-on-53", "backOnA53", SIGNING_AGE_BANDS, nfl.exitsByAge.backOnA53,
    "Of the men on a final-week 53 (week 18 day 7) in Y, the share on a 53 on day 1 of some regular-season week of Y + 1 or Y + 2, by age in Y. " +
    "Both 53s are counted like the NFL (the men out 4+ weeks, an unhealed LONG or MAJOR injury, left out), as the real side's final-week 53 and its 53s " +
    "(exitsByAge.backOnA53) leave out injured reserve. Men still under contract count, so it is looser than signed again."));
  rows.push(exitRow("starters-gone", "startersGone", EXIT_AGE_BANDS, nfl.exitsByAge.startersGone,
    "Of the starters (50%+ of his main team's snaps on his side, CHOSEN on both sides) on a final-week 53 in Y (counted like the NFL), the share on no team's list " +
    "(any status, injured men included, as the real side's) on day 1 of every regular-season week of Y + 1 and Y + 2: a proxy for leaving while still wanted, " +
    "which also holds injuries and men cut in camp."));

  // Retirements: by his own choice while signed within a year of a final-week 53, against the
  // reserve/retired list (a lower bound on the real side); every way beside it; each way a season.
  const retiredCounts = (r: CareerCheckRows, w: readonly [number, number], way: RetirementWay | "any") => {
    const byAge: Record<string, [number, number]> = {};
    for (const c of r.exits?.retiredNextYear ?? []) {
      if (!inWindow(c.y, w)) continue;
      for (const [a, x] of Object.entries(c.byAge)) {
        const t = (byAge[a] ??= [0, 0]);
        t[0] += x.n;
        t[1] += way === "any" ? x.unsigned + x.ownSigned + x.ownUnsigned : x[way];
      }
    }
    return bandCounts(EXIT_AGE_BANDS, byAge);
  };
  const reported: BandRule = { kind: "report" };
  const retireChecks: GradeCheck[] = [];
  for (const b of EXIT_AGE_BANDS) retireChecks.push(gradeCheck(reported, `${b.key}, own choice while signed`, perSeed((r) => shareOrNull(retiredCounts(r, windows.early, "ownSigned").get(b.key))), est(nfl.retiredList.byAge[b.key].share)));
  for (const b of EXIT_AGE_BANDS) retireChecks.push(gradeCheck(reported, `${b.key}, any way`, perSeed((r) => shareOrNull(retiredCounts(r, windows.early, "any").get(b.key))), { value: null, se: null }));
  retireChecks.push(gradeCheck(reported, "every age, own choice while signed", perSeed((r) => allOf(retiredCounts(r, windows.early, "ownSigned"))), est(nfl.retiredList.all.share)));
  for (const way of RETIREMENT_WAYS) {
    retireChecks.push(gradeCheck(reported, `retirements a season, ${way}`, perSeed((r) => {
      const xs = r.perSeason.filter((s) => inWindow(s.season, windows.early) && s.retirements !== undefined).map((s) => s.retirements[way].n);
      return xs.length === 0 ? null : mean(xs);
    }), { value: null, se: null }));
  }
  for (const b of EXIT_AGE_BANDS) {
    retireChecks.push(laterCheck(gradeCheck(reported, `${b.key}, own choice while signed, ${laterLabel}`, perSeed((r) => shareOrNull(retiredCounts(r, windows.later, "ownSigned").get(b.key))), est(nfl.retiredList.byAge[b.key].share))));
  }
  rows.push(row("retired-signed", retireChecks,
    "Of the men on a final-week 53 in Y (counted like the NFL), the share who retired from that day (after the 53 is read; a retirement at Y's season end is Y's) " +
    "and before Y + 1's, by age in Y: his own choice while signed (a deal of his live when he retired, or ended RETIRED that season), against the real men on a " +
    "final-week 53 placed on the reserve/retired list the next season. " + nfl.retiredList.note +
    " Until a build lets a man retire by choice, the sim's own-choice shares are 0. The retirements by age, credited seasons and group, each way, are in the rows (SeasonRow.retirements)."));

  // Rookies' ages on the week-8 53s (counted like the NFL): the mean, and the whole-year shares.
  const rk = nfl.weekEight.rookieAge;
  const rookieRule = bandOf("rookie-age").rule;
  const rookieMean = (w: readonly [number, number]) => perSeed((r) => windowMean(r, w, (p) => (p.rookieAge !== undefined && p.rookieAge.n > 0 ? p.rookieAge.mean : NaN), nflPicture));
  const meanRef = { value: rk.meanWhole, se: rk.n > 0 ? rk.sd / Math.sqrt(rk.n) : null };
  const rookieBins = (r: CareerCheckRows, w: readonly [number, number]) => {
    const bins = new Map<string, number>();
    let n = 0;
    for (const s of r.perSeason) {
      const p = inWindow(s.season, w) ? nflPicture(s) : null;
      if (p === null || p === undefined || p.rookieAge === undefined) continue;
      for (const [a, k] of Object.entries(p.rookieAge.histogram)) { const b = rookieAgeBin(Number(a)); bins.set(b, (bins.get(b) ?? 0) + k); n += k; }
    }
    return { bins, n };
  };
  const rookieChecks: GradeCheck[] = [gradeCheck(rookieRule, "mean age (whole years)", rookieMean(windows.early), meanRef, "mean")];
  for (const bin of ROOKIE_AGE_BINS) {
    const q = rk.shareByWholeYear[bin];
    rookieChecks.push(gradeCheck(rookieRule, `share ${bin}`, perSeed((r) => { const x = rookieBins(r, windows.early); return x.n === 0 ? null : (x.bins.get(bin) ?? 0) / x.n; }),
      { value: q, se: rk.n > 0 ? Math.sqrt((q * (1 - q)) / rk.n) : null }));
  }
  rookieChecks.push(laterCheck(gradeCheck(rookieRule, `mean age (whole years), ${laterLabel}`, rookieMean(windows.later), meanRef, "mean")));
  rows.push(row("rookie-age", rookieChecks,
    "Rookies as the rookie share reads them (first season in the league), on the 53s counted like the NFL; the sim's ages are bio.age at week 8 (the league file's 23 October), " +
    `the real side's whole years on 23 October, 2018-24 pooled over ${rk.n} rookies (mean ${rk.meanWhole.toFixed(2)} whole, ${rk.meanFractional.toFixed(2)} fractional). ` +
    "Reference SEs (CHOSEN): the mean's is the real fractional ages' SD over √n; a share's the binomial √(p(1 - p)/n). Measured only: matching the made-up rookies' ages comes later."));

  // Expected availability by age: man-weeks on a 53 not out with an injury he cannot play on (ours only).
  const availabilityOf = (r: CareerCheckRows, w: readonly [number, number]) => {
    const byAge: Record<string, [number, number]> = {};
    for (const s of r.perSeason) {
      if (!inWindow(s.season, w)) continue;
      for (const [a, [n, k]] of Object.entries(s.availability ?? {})) { const t = (byAge[a] ??= [0, 0]); t[0] += n; t[1] += k; }
    }
    return bandCounts(EXIT_AGE_BANDS, byAge);
  };
  const available = (c: [number, number] | undefined) => (c === undefined || c[0] === 0 ? null : 1 - c[1] / c[0]);
  const availabilityChecks: GradeCheck[] = EXIT_AGE_BANDS.map((b) => gradeCheck(reported, b.key, perSeed((r) => available(availabilityOf(r, windows.early).get(b.key))), { value: null, se: null }));
  availabilityChecks.push(gradeCheck(reported, "every age", perSeed((r) => {
    let n = 0, k = 0;
    for (const c of availabilityOf(r, windows.early).values()) { n += c[0]; k += c[1]; }
    return n === 0 ? null : 1 - k / n;
  }), { value: null, se: null }));
  for (const b of EXIT_AGE_BANDS) availabilityChecks.push(laterCheck(gradeCheck(reported, `${b.key}, ${laterLabel}`, perSeed((r) => available(availabilityOf(r, windows.later).get(b.key))), { value: null, se: null })));
  rows.push(row("availability", availabilityChecks,
    "On day 1 of each regular-season week, the men on a 53 and of them those out with an injury they cannot play on, by age in the season; shown as the share available. " +
    "This is the sim's own reading, with no real reference; the real side's share of game weeks missed by age is merged on its own definition in the availability-aligned row " +
    "(rows version 6)."));

  // The NFL count itself: each NFL row's league reading on the weeks-left variant and on the whole 53s,
  // against the band reading the row is graded on; then the men each reading leaves out and the teams' sizes.
  const weeksLeftPicture: PictureOf = (s) => s.week8NflWeeksLeft ?? null;
  const countReadings: readonly [string, (p: RosterPicture) => number][] = [
    ["mean age", (p) => p.age.mean], ["22 or under", (p) => p.age.upTo22], ["31+", (p) => p.age.from31], ["34+", (p) => p.age.from34],
    ["rookies", (p) => p.rookieShare], ["undrafted", (p) => p.undraftedShare],
  ];
  const countChecks: GradeCheck[] = [];
  const countMean = (w: readonly [number, number], f: (c: NflCount) => number) => perSeed((r) => {
    // A row written before version 5 has no count: no data.
    const xs = r.perSeason.flatMap((s) => (inWindow(s.season, w) && s.nflCount !== null && s.nflCount !== undefined ? [f(s.nflCount)] : []))
      .filter((x) => Number.isFinite(x));
    return xs.length === 0 ? null : mean(xs);
  });
  const countWindow = (w: readonly [number, number], suffix: string): GradeCheck[] => {
    const checks: GradeCheck[] = [];
    for (const [label, f] of countReadings) {
      const band = perSeed((r) => windowMean(r, w, f, nflPicture));
      const ref = { value: band.value, se: band.se };
      checks.push(gradeCheck(reported, `${label}, weeks-left variant${suffix}`, perSeed((r) => windowMean(r, w, f, weeksLeftPicture)), ref));
      checks.push(gradeCheck(reported, `${label}, whole 53s${suffix}`, perSeed((r) => windowMean(r, w, f, plainPicture)), ref));
    }
    const none = { value: null, se: null };
    const min = (xs: readonly number[]) => (xs.length === 0 ? NaN : Math.min(...xs));
    const max = (xs: readonly number[]) => (xs.length === 0 ? NaN : Math.max(...xs));
    checks.push(gradeCheck(reported, `men left out a league-season, band${suffix}`, countMean(w, (c) => c.leftOut), none));
    checks.push(gradeCheck(reported, `men left out a league-season, weeks-left variant${suffix}`, countMean(w, (c) => c.leftOutWeeksLeft), none));
    checks.push(gradeCheck(reported, `men on the 53s a league-season, whole 53s${suffix}`, countMean(w, (c) => c.onRosters), none));
    checks.push(gradeCheck(reported, `smallest team, whole 53s${suffix}`, countMean(w, (c) => min(c.sizes.before)), none));
    checks.push(gradeCheck(reported, `largest team, whole 53s${suffix}`, countMean(w, (c) => max(c.sizes.before)), none));
    checks.push(gradeCheck(reported, `smallest team, band${suffix}`, countMean(w, (c) => min(c.sizes.after)), none));
    checks.push(gradeCheck(reported, `largest team, band${suffix}`, countMean(w, (c) => max(c.sizes.after)), none));
    checks.push(gradeCheck(reported, `smallest team, weeks-left variant${suffix}`, countMean(w, (c) => min(c.sizes.afterWeeksLeft)), none));
    checks.push(gradeCheck(reported, `largest team, weeks-left variant${suffix}`, countMean(w, (c) => max(c.sizes.afterWeeksLeft)), none));
    return checks;
  };
  countChecks.push(...countWindow(windows.early, ""), ...countWindow(windows.later, `, ${laterLabel}`).map(laterCheck));
  rows.push(row("nfl-count", countChecks,
    "The NFL rows (mean age, the 22-or-under, 31+ and 34+ shares, rookies, undrafted) are graded on the 53s counted like the NFL by the band at the draw " +
    "(week8Nfl: an unhealed LONG or MAJOR injury, 4+ weeks, left out; CHOSEN). Here each league reading on the weeks-left variant (week8NflWeeksLeft: 4+ weeks " +
    "still to go) and on the whole 53s (week8) is set beside the band reading as its reference, so the choice can be judged; then the men each reading leaves out " +
    "and the teams' sizes (nflCount; the smallest and largest team are each seed's mean over the window's seasons). Week 8, day 1."));

  // The aging redesign's measure-only rows (ADR-087 §12, AB1; rows version 6): all REPORT.
  rows.push(...agingRedesignRows(runs, windows, nfl, nflDraft, input.nflInjuries ?? NFL_INJURIES));

  // The owner's answers: an answered OWNER row takes the answer's mark.
  const marked = rows.map((r): GradeRow => {
    const answer = r.mark === "OWNER" && r.card !== null ? input.ownerAnswers?.[r.card] : undefined;
    return answer === undefined ? r : { ...r, mark: answer, status: rowStatus(answer, bandOf(r.id).rule, r.checks) };
  });
  const unresolvable = marked.filter((r) => r.mark === "GATE" || r.mark === "OWNER").flatMap((r) => r.checks
    .filter((c) => c.status !== "REPORTED" && c.halfWidth !== null && c.seRef !== null && c.halfWidth < 2 * c.seRef)
    .map((c) => `${r.id} ${c.label}: half-width ${fmt(c.halfWidth, 4)} under 2·SE_ref ${fmt(2 * c.seRef!, 4)}`));

  // The flip: every GATE row, and every OWNER row still waiting on its answer (fail closed).
  const passes = (r: GradeRow) => r.status === "PASS" || r.status === "NOT_RESOLVABLE";
  const gate = marked.filter((r) => r.mark === "GATE");
  const count = (st: RowStatus) => gate.filter((r) => r.status === st).length;
  const reasons: string[] = [];
  if (input.meta.smoke === true) reasons.push("a smoke run (windows clipped to the seasons played): never a graded report");
  if (missing.length > 0) reasons.push(`grade seeds missing: ${missing.join(", ")}`);
  if (graded_.length < 2) reasons.push(`${graded_.length} grade seed(s) in; the seed-to-seed SE needs at least two`);
  if (coachMissing.length > 0) reasons.push(`coach-style seeds missing (both arms needed): ${coachMissing.join(", ")}`);
  for (const r of gate) if (!passes(r)) reasons.push(`GATE row ${r.id}: ${r.status}`);
  const pendingBlocking = marked.filter((r) => r.mark === "OWNER" && !passes(r));
  for (const r of pendingBlocking) reasons.push(`OWNER row ${r.id} (${r.card} card, answer pending): ${r.status}`);
  const ownerBlocking = pendingBlocking.map((r) => `${r.id} (${r.card}): ${r.status}`);
  return {
    pass: input.pass,
    smoke: input.meta.smoke === true,
    meta: input.meta,
    windows,
    seeds: { asked: input.seeds, graded: graded_, missing },
    coachSeeds: { asked: input.coach.seeds, graded: coachGraded, missing: coachMissing },
    rows: marked,
    unresolvable,
    flip: {
      recommended: reasons.length === 0,
      reasons,
      gate: { pass: count("PASS"), notResolvable: count("NOT_RESOLVABLE"), fail: count("FAIL"), other: gate.length - count("PASS") - count("NOT_RESOLVABLE") - count("FAIL") },
      ownerBlocking,
    },
  };
}

// --- renderings ----------------------------------------------------------------------------------

const round = (x: number | null, places = 4): number | null => (x === null || !Number.isFinite(x) ? null : Math.round(x * 10 ** places) / 10 ** places);

/** The grade as JSON, numbers kept to four decimals. */
export function renderGradeJson(grade: CareerGrade): string {
  const rows = grade.rows.map((r) => ({
    ...r,
    checks: r.checks.map((c) => ({
      ...c, sim: round(c.sim), seSim: round(c.seSim), ref: round(c.ref), seRef: round(c.seRef), halfWidth: round(c.halfWidth), resolution: round(c.resolution),
      outside: round(c.outside),
    })),
  }));
  return `${JSON.stringify({ ...grade, rows, bands: CAREER_BANDS }, null, 2)}\n`;
}

const fmt = (x: number | null, places = 3) => (x === null ? "-" : x.toFixed(places));

/** The grade as Markdown: the header, the flip, the rows, then each row's checks. */
export function renderGradeMarkdown(grade: CareerGrade): string {
  const m = grade.meta;
  const lines: string[] = [];
  const say = (s = "") => lines.push(s);
  say(`# ADR-087 D5b: the 20-season check, pass ${grade.pass}${grade.smoke ? " (SMOKE: not a graded report)" : ""}`);
  say();
  say("The bands are the owner's answers of 2026-10-31 and 2026-11-01 and the readings recorded with them (ADR-087 §11): a row that names a card " +
    "(Drift, Close, Old, Even, Spread, Floor) carries the band or mark that card's answer set. The Old card's rows (the 34-and-over share, reaching ten seasons) " +
    "are GATE: they block the flip until teams cut old players sooner. The pooled sd is measured from the league file as loaded (Spread). The win spread's " +
    "2.75 floor gates the flip; growth tuning is judged against season one (Floor, reported). The week-8 league rows are set against the latest three real seasons, 2022-24.");
  say();
  say("Added for the owner's aging rulings of 2026-11-06 (rows version 5): the NFL comparison rows read the 53s counted like the NFL (the men out 4+ weeks left out, " +
    "as the real count leaves out injured reserve); the later window is reported beside each early check; and the group shares, signed again and back on a 53, " +
    "retirements and starters gone, rookies' ages, availability by age and the NFL count itself (its weeks-left variant and the men left out) are new rows, " +
    "all REPORT (shown, never blocking).");
  say();
  say("Added for the aging redesign (ADR-087 §12, step AB1; rows version 6), **measure-only**: ability-group means and combine measures by age, the 99s by group, age " +
    "and rating with the SMARTS share, injuries per snap by age and by spot, concussion lengths (first, later, by age) and durability by concussions had, contact per snap by " +
    "spot and career contact at 27, the share of game weeks missed by age on the real side's definition, retirements by moment and by years in the league, the teams' overall " +
    "spread and year-to-year r beside the win spread and win r, and D7 by round with starts by age. Every one is REPORT with no band: its checks are shown, never graded, " +
    "and no GATE row reads them. They come last.");
  const pending = grade.rows.filter((r) => r.mark === "OWNER");
  if (pending.length > 0) {
    say();
    say(`**OWNER rows wait on the owner's answer** (${pending.map((r) => `${r.id}, ${r.card ?? "-"} card`).join("; ")}): until it is given, any of them that does not pass or is not resolvable blocks the flip.`);
  }
  say();
  say(`The stand-in league \`${m.league.path}\` (sha256 \`${m.league.sha256.slice(0, 12)}\`), ${m.seasons} seasons a seed, engine rules \`${m.engineRules}\`, ` +
    `caller \`${m.callerVersion}\`. Fingerprints: ${Object.entries(m.fingerprints).map(([a, f]) => `${a} \`${f}\``).join(", ")}.`);
  say(`Grade seeds: ${grade.seeds.graded.length} of ${grade.seeds.asked.length} in` +
    `${grade.seeds.missing.length > 0 ? ` (missing: ${grade.seeds.missing.join(", ")})` : ""}. ` +
    `Coach-style seeds: ${grade.coachSeeds.graded.length} of ${grade.coachSeeds.asked.length} in` +
    `${grade.coachSeeds.missing.length > 0 ? ` (missing: ${grade.coachSeeds.missing.join(", ")})` : ""}.`);
  say(`Years judged: ${grade.windows.early[0]}-${grade.windows.early[1]} (the plan's 2029-45) and ${grade.windows.late[0]}-${grade.windows.late[1]} (2036-45); ` +
    `the later window ${grade.windows.later[0]}-${grade.windows.later[1]} (2033-45) is reported beside the early checks.` +
    (grade.smoke ? " Smoke windows: clipped to the seasons played." : ""));
  say();
  say("A check is **not resolvable** when its band's half-width is under 2·√(SE_sim² + SE_ref²) and its value is in the band or outside it by no more than that; " +
    "a value further outside its band fails. A floor (the win spread's 2.75, the coach-style 5% of slots) is never unresolved: below it fails. " +
    "Not below season one (the win spread's tuning yardstick) has no allowance: at or above it passes; below it follows the rule above. " +
    "The sim's SE is the seed-to-seed SD over √seeds.");
  say();
  say("## The flip");
  say();
  say(grade.flip.recommended ? "**Recommended**: every grade seed and coach-style seed is in and every GATE row passes or is not resolvable." : "**Not recommended.**");
  for (const r of grade.flip.reasons) say(`- ${r}`);
  say();
  say(`GATE rows: ${grade.flip.gate.pass} pass, ${grade.flip.gate.notResolvable} not resolvable, ${grade.flip.gate.fail} fail, ${grade.flip.gate.other} other.`);
  if (grade.flip.ownerBlocking.length > 0) {
    say();
    say("OWNER rows that block the flip until the owner answers their card:");
    for (const r of grade.flip.ownerBlocking) say(`- ${r}`);
  }
  if (grade.unresolvable.length > 0) {
    say();
    say("Checks the reference's own SE leaves unresolvable whatever the sim does (they fail only by a gross miss):");
    for (const c of grade.unresolvable) say(`- ${c}`);
  }
  say();
  say("## Rows");
  say();
  say("| Row | Band | Mark | Judged | Status | Checks (pass / fail / not resolvable / other) |");
  say("|---|---|---|---|---|---|");
  for (const r of grade.rows) {
    const n = (st: CheckStatus) => r.checks.filter((c) => c.status === st).length;
    const otherN = r.checks.length - n("PASS") - n("FAIL") - n("NOT_RESOLVABLE");
    say(`| ${r.row} | ${r.band} | ${r.mark}${r.card === null ? "" : ` (${r.card})`} | ${r.judged} | ${r.status} | ${n("PASS")} / ${n("FAIL")} / ${n("NOT_RESOLVABLE")} / ${otherN} |`);
  }
  for (const r of grade.rows) {
    say();
    say(`### ${r.row}: ${r.band} (${r.id})`);
    say();
    if (r.note !== undefined) { say(r.note); say(); }
    say("| Check | Sim | SE | Seeds | Reference | SE | Half-width | 2·SE | In band | Outside by | Status |");
    say("|---|---|---|---|---|---|---|---|---|---|---|");
    for (const c of r.checks) {
      say(`| ${c.label} | ${fmt(c.sim)} | ${fmt(c.seSim)} | ${c.seeds} | ${fmt(c.ref)} | ${fmt(c.seRef)} | ${fmt(c.halfWidth)} | ${fmt(c.resolution)} | ${c.inBand === null ? "-" : c.inBand ? "yes" : "no"} | ${fmt(c.outside)} | ${c.status} |`);
    }
  }
  say();
  return `${lines.join("\n")}`;
}
