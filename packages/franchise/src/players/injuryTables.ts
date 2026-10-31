/**
 * Injuries' numbers (ADR-087 §5, D3): every rate in one table (`INJURY_RATES`), and the kinds of
 * injury as data (`INJURY_KINDS`), so a kind is added or retuned here without touching the logic in
 * `injuries.ts`.
 *
 * Provenance (ADR-087's rules). Each number below says which of these it is:
 * - MEASURED = `packages/calibration/reports/injury-rates.md` (numbers in full in its `.json`):
 *   nflverse's public weekly injury reports, weekly rosters and PFR snap counts, regular seasons
 *   2019-2024 pooled (192 team-seasons, 3,198 team games; 2025 is held out). Its definitions are
 *   used as written there: a *time-loss injury* is a new run of team games missed for an injury,
 *   counted per *team interval* (a team game followed by another; "per team-game" below); a
 *   *day-to-day* injury is a new listing with a game designation that never cost a game; *weeks out*
 *   are calendar weeks from the first missed game's week to the week he is back, which is this
 *   module's `weeksRemaining`; bands are Kaplan-Meier shares, so season-ending injuries count for as
 *   long as they were seen. Where a number is worked out from the report's numbers, the sum is shown.
 * - MEASURED (fill) = worked out for this table from the same nflverse files the report cached
 *   (`packages/calibration/data-cache/injury-rates/raw/`, regular seasons 2019-2024): each position
 *   group's special-teams share of its snaps.
 * - REPORTED = the NFL's own injury counts for 2018 and 2019 (preseason and regular season, practices
 *   and games), as carried in public coverage of the league's releases (nfl.com, "NFL reveals 2019
 *   injury data, hopeful rule changes are working", Jan 2020; Postmedia, "NFL concussions slightly
 *   up, but knee-ligament tears drop 17%", Jan 2020): concussions in regular-season games 127 and
 *   136, regular-season practices 8 and 9, preseason practices 45 and 30, preseason games 34 and 49
 *   (the preseason totals, 79 and 79, less practices); ACL tears in regular-season games 24 and 23,
 *   regular-season practices 5 and 7, preseason practices 10 and 7, preseason games 18 and 10 (the
 *   preseason totals, 28 and 17, less practices).
 * - CHOSEN = what the data cannot say; tuned in D5.
 * - The bands' week limits are the ADR's ruled definitions (§5.3). The directions of the lasting
 *   marks (an ACL or Achilles costs speed and burst, more for an older player; a broken hand does
 *   not) are REPORTED from the public return-to-play literature (ADR-087 provenance table); their
 *   sizes are CHOSEN.
 *
 * What the reports cannot say, and how it is set here:
 * - *Game or practice.* The reports say who is hurt, not where. In season, games dominate: the
 *   report's bye-week estimate puts a week's practice and away injuries at 4.1% ± 4.4% of in-season
 *   time-loss injuries, and the NFL's own counts put 6% of regular-season concussions (17 of 280) and
 *   20% of regular-season ACL tears (12 of 59) in practice. In-season practice is set to about 6%
 *   of in-season time-loss injuries (CHOSEN in that range).
 * - *Before the season.* 6.2 new football injuries per team keep a player out of week 1 (MEASURED).
 *   The model has no preseason games yet (ADR-087 §3), which hold about half of the preseason's
 *   injuries (REPORTED: 83 of 158 preseason concussions and 28 of 45 preseason ACL tears in 2018-19
 *   were in games), and its teams are 53 players, not a 90-man camp. Camp and preseason practice are
 *   set so a 53-man team has about 2 new players out at week 1 from practice (CHOSEN: 6.2 × the
 *   practice half × the smaller roster).
 * - *Away from football.* Illness that cost a game, 1.12 per team-season in season (MEASURED); the
 *   non-football list at week 1, 0.39 per team-season (MEASURED; 0.29 in 2022-2024; an upper bound for
 *   this model, since it also holds rookies hurt before the draft). Car, bicycle and fireworks
 *   accidents are never named in the reports: their mix is CHOSEN.
 * - *Durability, age and a recent return.* The reports carry neither ratings nor ages: these factors
 *   stay CHOSEN, and the base rates are set for their average on an NFL-aged roster.
 */
import type { CalendarPhase, InjuryBand, InjurySetting, PositionGroup } from "@ff/contracts";
import type { BodyChange } from "./body.js";

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// INJURY_RATES: every rate. MEASURED where the reports can say; CHOSEN where they cannot.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

export const INJURY_RATES = {
  game: {
    /**
     * Injuries of any length, day to day included, per weighted snap played (offence, defence, and
     * special teams × `specialSnapWeight`), for a typical player (position factor 1, durability 65,
     * age 26 or under, no recent return). The draw's chance is 1 - exp(-rate × exposure).
     * MEASURED, worked out: 1.115 new time-loss injuries per 1,000 snaps after a game played (5,836
     * over 5.23 million snaps, injury-rates.md 2019-2024 "Rates") ÷ 1.085 for the special-teams
     * weighting (MEASURED (fill): 17% of all snaps are on special teams) = 1.028 per 1,000 weighted
     * snaps; × 0.968, the game's share of them (in-season practice and away injuries are about 7% of
     * new time-loss injuries, and the 3.7% that follow a game not played are not in this rate) =
     * 0.995; ÷ 0.714, the time-loss share of all designated injuries (MEASURED: 28.6% are day to day)
     * = 1.39 per 1,000 for the league's players. The last step, to a typical player, is fitted: 1.32
     * is what makes the test's season run (NFL ages, the generator's durability, NFL snaps by group)
     * give the measured 2.02 time-loss injuries per team-game in season, all settings; so the risk
     * factors below average about 1.05 there.
     */
    perSnap: 0.00132,
    /**
     * A special-teams snap (kicks, punts, their returns, field goals) counts as this many snaps.
     * CHOSEN: the reports count every snap alike, so they cannot price a kick-off against a snap
     * from scrimmage.
     */
    specialSnapWeight: 1.5,
    /**
     * Risk per weighted snap by position group, × perSnap. MEASURED: each group's new time-loss
     * injuries per 1,000 snaps after a game played (injury-rates.md 2019-2024, "By position group":
     * QB 0.87, RB 1.78, WR 1.32, TE 1.12, OL 0.90, DL 1.02, LB 1.03, DB 1.20, K/P 1.04), ÷ its
     * special-teams weighting (MEASURED (fill), its share of snaps on special teams: QB 0%, RB 24%,
     * WR 11%, TE 20%, OL 7%, DL 12%, LB 27%, DB 20%, K/P 100%), ÷ the league's 1.028, so the league's
     * snap-weighted factor is 1. nflverse counts a fullback as a running back (FB takes RB's), and
     * K, P and LS as one group (ST). The reports group 3-4 outside linebackers with LB and 4-3 ends
     * with DL, as POSITION_GROUP does.
     */
    byGroup: {
      QB: 0.85, RB: 1.55, FB: 1.55, WR: 1.22, TE: 0.99, OL: 0.84, DL: 0.94, LB: 0.89, DB: 1.06, ST: 0.67,
    } satisfies Record<PositionGroup, number>,
  },
  practice: {
    /**
     * Injuries of any length per player per week of full practice at load 1 (a training-camp week),
     * × the phase's load × `practiced` (0..1). CHOSEN so a 53-man team has about 2 new players out at
     * week 1 from camp and preseason practice (see the header: MEASURED 6.2 out at week 1, of which
     * about half is preseason games, REPORTED, which the model does not have yet).
     */
    perWeek: 0.0185,
    /**
     * How hard a week's practice is, by phase, against a camp week. 0 = no team practice (the early
     * offseason and summer). Camp is the heaviest (CHOSEN); preseason practice lighter around games
     * (CHOSEN); the spring programme has no pads or live contact (CHOSEN, after the CBA's OTA rules);
     * in-season practice is set so practice is about 6% of in-season time-loss injuries (CHOSEN in the
     * MEASURED bye-week range 4.1% ± 4.4%, beside the REPORTED 6% of regular-season concussions and 20%
     * of ACL tears in practice). That puts an in-season week's practice at about a fifth of the
     * camp-and-preseason average, inside the REPORTED range (a regular-season week of practice gave
     * 0.08 of a preseason week's practice concussions and 0.25 of its ACL tears).
     */
    phaseLoad: {
      TRAINING_CAMP: 1, PRESEASON: 0.7, OFF_ROOKIES_OTAS: 0.25, REGULAR_SEASON: 0.17, PLAYOFFS: 0.17,
      OFF_EVAL: 0, OFF_RESET_FA: 0, OFF_DRAFT: 0, OFF_SUMMER: 0,
    } satisfies Record<CalendarPhase, number>,
    /**
     * Risk per practice week by position group. CHOSEN: practice is not measured by group. Near
     * each group's MEASURED new time-loss injuries per player-game against the league's 0.044 (QB
     * 1.13, RB 1.12, WR 1.13, TE 0.93, OL 1.06, DL 0.86, LB 0.95, DB 1.24, K/P 0.22), except the
     * quarterback, who is not hit in practice (CHOSEN).
     */
    byGroup: {
      QB: 0.5, RB: 1.1, FB: 1.1, WR: 1.15, TE: 0.95, OL: 1.05, DL: 0.9, LB: 0.95, DB: 1.2, ST: 0.25,
    } satisfies Record<PositionGroup, number>,
  },
  away: {
    /**
     * Injuries and illnesses away from football, per player per calendar week, all 52 weeks, free
     * agents included. Flat: a car crash or the flu does not read his durability. It is the sum of the
     * kinds' AWAY shares (per 10,000 player-weeks): illness 35.8, MEASURED (1.12 illnesses that cost
     * a game per team-season = 215 over 3,006 team intervals, ÷ the about 50 healthy players of a
     * 53 who can fall ill = 14.3 per 10,000 player-weeks, ÷ the 40% of illnesses that cost a week,
     * CHOSEN); everything else 10, CHOSEN so a team has about 0.3 players still out at week 1 from
     * away-from-football injuries (MEASURED 0.39 on the non-football list at week 1, 0.29 in
     * 2022-2024).
     */
    perWeek: 0.00458,
  },
  /**
   * How true `durability` scales game and practice risk: × exp(-perPoint × (durability - typical)).
   * CHOSEN: the reports carry no ratings.
   */
  durability: {
    /** The rating at which the factor is 1. CHOSEN: the brief's "65 is typical", the generator's mean. */
    typical: 65,
    /** Log-risk per rating point: 85 → about 0.67×, 45 → about 1.5×. CHOSEN. */
    perPoint: 0.02,
  },
  /** How age scales game and practice risk: × (1 + perYear × years past `from`). CHOSEN: the report has no ages. */
  age: {
    /** Years of age up to which the factor is 1. CHOSEN. */
    from: 26,
    /** Extra risk per year past it: a 34-year-old about 1.32×. CHOSEN. */
    perYear: 0.04,
  },
  /**
   * A player back from an injury within the last `weeks` weeks (from his history) is at higher risk
   * in games and practice. CHOSEN: the report does not follow players after a return.
   */
  recentReturn: {
    /** Calendar weeks since he was healed. CHOSEN. */
    weeks: 4,
    /** × risk. CHOSEN. */
    factor: 1.3,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Bands, marks and reporting.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** ADR-087 §5.3 (ruled): the least weeks lost for each band. DAY_TO_DAY is 0, SHORT 1-3, LONG 4-8, MAJOR 9+. */
export const BAND_MIN_WEEKS: Readonly<Record<InjuryBand, number>> = { DAY_TO_DAY: 0, SHORT: 1, LONG: 4, MAJOR: 9 };

/** The bands, mildest first, for "at least this band" checks. */
export const BAND_ORDER: readonly InjuryBand[] = ["DAY_TO_DAY", "SHORT", "LONG", "MAJOR"];

/**
 * ADR-087 §5.4: a repeat of the same kind lowers true `durability` by this many whole points when he
 * is healthy again, by the repeat's band. A day-to-day knock leaves nothing, and illness and accidents
 * are never repeats (`InjuryKind.repeats`). CHOSEN (tuned in D5).
 */
export const REPEAT_DURABILITY: Readonly<Record<InjuryBand, number>> = { DAY_TO_DAY: 0, SHORT: 1, LONG: 2, MAJOR: 3 };

/**
 * ADR-087 §5.4: the same tear costs an older body more. A kind's lasting mark is written for a
 * 25-year-old and scaled by 1 + perYear × (age - 25), kept inside [min, max]: 23 → 0.8×, 29 → 1.4×,
 * 33 → 1.8×. REPORTED direction (return-to-play literature); sizes CHOSEN (tuned in D5).
 */
export const MARK_AGE = { refAge: 25, perYear: 0.1, min: 0.5, max: 2 } as const;

/**
 * Steps per unit at which body changes are reported in INJURY_HEALED: the 40 and 3-cone to 0.01 s,
 * the vertical to 0.5 in, the bench to 1 rep, weight to 1 lb. The same precision as the development
 * week's RATINGS_CHANGED (the build brief); the full-precision body stays in `development.body`.
 */
export const BODY_REPORT_STEPS = { forty: 100, cone: 100, vertical: 2, bench: 1, weightLb: 1 } as const;

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// How long: the weeks lost (ADR-087 §5.3).
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** A slice of a kind's weeks-lost spread: lose `min`..`max` calendar weeks (whole), with this weight. */
export type WeeksBucket = readonly [min: number, max: number, weight: number];

/** The three time-loss bands. */
export type TimeLossBand = Exclude<InjuryBand, "DAY_TO_DAY">;

/**
 * How time-loss injuries spread inside each band, in calendar weeks lost. MEASURED (injury-rates.md
 * 2019-2024, "How long: the survival curve", weeks): P(out at least k weeks) is 1, 0.698, 0.524,
 * 0.421, 0.342, 0.297, 0.269, 0.249, 0.229 for k = 1-9, 0.188 at 13 and 0.170 from 17. So of SHORT
 * injuries 52% lose 1 week, 30% 2 and 18% 3; of LONG 41% lose 4, 38% 5-6 and 21% 7-8; of MAJOR 18%
 * lose 9-12, 8% 13-16 and 74% 17 or more. The same shape is used for every kind (CHOSEN: the report
 * gives bands by body part, not whole curves). Past 17 weeks the reports see nothing (the season has
 * ended), so 17-50 is CHOSEN: with it about as many players are still out at the next season's first
 * game as the report counts (1.7 per team-season, MEASURED, "carried over").
 */
export const WEEKS_SHAPE: Readonly<Record<TimeLossBand, readonly WeeksBucket[]>> = {
  SHORT: [[1, 1, 0.522], [2, 2, 0.301], [3, 3, 0.177]],
  LONG: [[4, 4, 0.411], [5, 6, 0.378], [7, 8, 0.211]],
  MAJOR: [[9, 12, 0.178], [13, 16, 0.081], [17, 50, 0.741]],
};

/**
 * The share of a football kind's injuries that cost no week (day to day). MEASURED (injury-rates.md
 * 2019-2024, "Playing through"): 2,332 of 8,162 new designated injuries (28.6%) never cost a game. A
 * torn ACL or Achilles is never day to day, so every other football kind takes 29.3% and the whole is
 * 28.6%. One share for every kind is CHOSEN: the report has no day-to-day share by body part.
 */
export const DAY_TO_DAY_SHARE = 0.293;

/**
 * A football kind's weeks lost, from its time-loss band shares (MEASURED by body part, in weeks):
 * DAY_TO_DAY_SHARE costs no week, and the rest spreads over the bands by WEEKS_SHAPE.
 */
function spread(bands: Readonly<Record<TimeLossBand, number>>): WeeksBucket[] {
  const timeLoss = 1 - DAY_TO_DAY_SHARE;
  const out: WeeksBucket[] = [[0, 0, DAY_TO_DAY_SHARE]];
  for (const band of ["SHORT", "LONG", "MAJOR"] as const) {
    for (const [min, max, w] of WEEKS_SHAPE[band]) out.push([min, max, timeLoss * bands[band] * w]);
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// INJURY_KINDS: the kinds of injury, as data (ADR-087 §5.3, §5.4).
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** Where on the body an injury is. */
export type BodyPart =
  | "head" | "thigh" | "ankle" | "knee" | "lower-leg" | "shoulder" | "arm" | "hand" | "foot" | "hip" | "back" | "chest" | "whole-body";

/** What a kind leaves for good, written for a 25-year-old (scaled by `MARK_AGE`), applied when he is healthy again. */
export interface LastingMark {
  /** Only an injury at least this bad leaves it (a shoulder that needed surgery, not a sprain). */
  readonly minBand: InjuryBand;
  /** A change to his body, through `changeBody`: the ratings that follow it move with it. */
  readonly body?: BodyChange;
  /** Rating points beyond the body (never a body rating: those move only through the body). */
  readonly ratings?: Readonly<Record<string, number>>;
}

export interface InjuryKind {
  readonly part: BodyPart;
  /**
   * How often this kind is the one drawn in each setting, relative to the other kinds there.
   * Absent = never drawn in that setting. GAME and PRACTICE are percentages of the setting's
   * injuries (all lengths); AWAY is per 10,000 player-weeks, so the AWAY shares add up to
   * `INJURY_RATES.away.perWeek`.
   */
  readonly share: Readonly<Partial<Record<InjurySetting, number>>>;
  /** × share, by position group (absent = 1): a quarterback's shoulder, a kicker's groin. */
  readonly byGroup?: Readonly<Partial<Record<PositionGroup, number>>>;
  /** The weeks lost, so the band follows (§5.3). */
  readonly weeks: readonly WeeksBucket[];
  /** Rating points lost while he plays hurt (day to day), by registry id; always negative. CHOSEN (tuned in D5). */
  readonly playingHurt: Readonly<Record<string, number>>;
  /** What it costs him for good; absent = he comes back as he was. */
  readonly lasting?: LastingMark;
  /**
   * Whether a second one of this kind is a repeat that lowers his durability (§5.4). Absent = it is.
   * False for illness and accidents: a second flu or a second car crash says nothing about how his
   * body holds up, just as their risk does not read his durability (`INJURY_RATES.away`). CHOSEN.
   */
  readonly repeats?: boolean;
}

/**
 * The kinds, by the id carried in `Injury.kind` and INJURY_OCCURRED (public). Order matters only for
 * the draw: kinds are walked in this order, so keep it stable (add new kinds at the end).
 *
 * Football kinds, MEASURED (injury-rates.md 2019-2024, "Body parts" and "By position group"):
 * - `share.GAME`: set so that the in-season time-loss mix (games, with each group's `byGroup`, plus
 *   the practice and away mixes below) is each body part's share of the report's new in-season
 *   time-loss injuries: ankle 14.9%, other knee 14.6%, hamstring 12.5%, concussion 9.5%, groin/hip
 *   7.9%, shoulder 7.8%, back/neck 6.0%, foot 5.2%, chest/ribs 5.0%, calf/shin 4.5%, hand/wrist 3.6%,
 *   quad 3.0%, ACL 2.9%, elbow/arm 2.2%, Achilles tear 0.5%. In those, the 11% with no body part
 *   (players placed straight on reserve, 76% MAJOR) are spread over the parts band by band in
 *   proportion to the parts' own counts in that band (CHOSEN); the report's "knee" is split into
 *   `acl` and `knee-mcl` (every other knee injury) by the NFL's ACL count (REPORTED: 59
 *   regular-season ACL tears in 2018-19, 0.058 per team-game, 2.9% of time-loss injuries); its
 *   "achilles" MAJOR injuries are `achilles` tears and the rest go to `calf`. Shares are percentages
 *   of all game injuries, day to day included (a torn ACL or Achilles is never day to day).
 * - `byGroup`: each group's share of a body part against the league's (the report's top six parts
 *   for each group; its other parts share the rest in league proportion), shown where it differs from
 *   1 by 0.05 or more. `acl` and `knee-mcl` both take the knee's. FB takes RB's; ST takes K/P's
 *   (small: 85 injuries).
 * - `weeks`: each body part's own Kaplan-Meier LONG and MAJOR shares (in games, × the league's weeks
 *   to games ratios 0.96/1.12/1.01 for SHORT/LONG/MAJOR), spread by `spread`.
 * - `share.PRACTICE`: the game shares × a CHOSEN practice tilt (strains and the Achilles × 1.4,
 *   back × 1.2, ankle × 0.8, contact injuries × 0.6-0.7, concussion × 0.8 against the ACL's 1.15: the
 *   NFL's counts give 3.2 concussions per ACL tear in practice against 4.6 in games, REPORTED),
 *   as a percentage of all practice injuries.
 * - `share.AWAY`: CHOSEN (training on his own; the reports never say where).
 */
export const INJURY_KINDS: Readonly<Record<string, InjuryKind>> = {
  // Football injuries: games, practice and (some) away from football, e.g. training on his own.
  concussion: {
    part: "head",
    share: { GAME: 9.32, PRACTICE: 7.4 },
    byGroup: { QB: 1.31, RB: 0.81, FB: 0.81, WR: 1.25, TE: 1.56, OL: 1.07, LB: 0.89, ST: 0.66 },
    weeks: spread({ SHORT: 0.761, LONG: 0.084, MAJOR: 0.155 }),
    playingHurt: { reaction: -3, awareness: -2 },
  },
  hamstring: {
    part: "thigh",
    share: { GAME: 11.13, PRACTICE: 15.5, AWAY: 2.2 },
    byGroup: { QB: 0.62, RB: 1.06, FB: 1.06, WR: 1.57, TE: 0.81, OL: 0.65, DL: 0.52, LB: 1.28, DB: 1.41, ST: 0.87 },
    weeks: spread({ SHORT: 0.648, LONG: 0.237, MAJOR: 0.115 }),
    playingHurt: { speed: -4, acceleration: -4 },
  },
  ankle: {
    part: "ankle",
    share: { GAME: 15.39, PRACTICE: 12.2, AWAY: 0.9 },
    byGroup: { QB: 0.9, RB: 1.39, FB: 1.39, WR: 0.8, OL: 1.37, LB: 0.91, DB: 0.75, ST: 0.43 },
    weeks: spread({ SHORT: 0.594, LONG: 0.207, MAJOR: 0.199 }),
    playingHurt: { speed: -3, agility: -4 },
  },
  "knee-mcl": {
    part: "knee",
    share: { GAME: 14.92, PRACTICE: 14.8, AWAY: 0.55 },
    byGroup: { QB: 0.6, WR: 0.77, OL: 1.4, DL: 1.29, DB: 0.72, ST: 0.68 },
    weeks: spread({ SHORT: 0.545, LONG: 0.264, MAJOR: 0.191 }),
    playingHurt: { agility: -4, speed: -2 },
  },
  acl: {
    part: "knee",
    share: { GAME: 2.01, PRACTICE: 2.3, AWAY: 0.3 },
    byGroup: { QB: 0.6, WR: 0.77, OL: 1.4, DL: 1.29, DB: 0.72, ST: 0.68 },
    // REPORTED (ADR-087 provenance table): an ACL or Achilles return takes about 9-12 months.
    weeks: [[39, 52, 1]],
    playingHurt: { speed: -6, agility: -6 },
    // 40 and 3-cone a little slower for good, vertical a little lower (§5.4).
    lasting: { minBand: "MAJOR", body: { forty: 0.03, cone: 0.05, vertical: -0.75 } },
  },
  achilles: {
    part: "lower-leg",
    share: { GAME: 0.3, PRACTICE: 0.4, AWAY: 0.3 },
    byGroup: { QB: 0.62, RB: 0.83, FB: 0.83, WR: 0.89, TE: 0.85, OL: 0.65, LB: 0.95, ST: 0.66 },
    weeks: [[39, 52, 1]],
    playingHurt: { speed: -6, acceleration: -6 },
    // Larger than an ACL: acceleration and first step lower beyond what the slower 40 takes, vertical lower (§5.4).
    lasting: { minBand: "MAJOR", body: { forty: 0.06, cone: 0.04, vertical: -1.5 }, ratings: { acceleration: -3, firstStep: -3 } },
  },
  shoulder: {
    part: "shoulder",
    share: { GAME: 8.25, PRACTICE: 5.7 },
    byGroup: { QB: 2, RB: 0.83, FB: 0.83, WR: 1.14, TE: 0.85, OL: 0.65, DL: 1.21, LB: 0.95, ST: 0.66 },
    weeks: spread({ SHORT: 0.562, LONG: 0.141, MAJOR: 0.297 }),
    playingHurt: { armStrength: -3, strength: -2, tackling: -2 },
    // A shoulder that needed surgery: a little arm and a rep or two off the bench.
    lasting: { minBand: "MAJOR", body: { bench: -1.5 }, ratings: { armStrength: -2 } },
  },
  "hand-wrist": {
    part: "hand",
    share: { GAME: 3.68, PRACTICE: 2.6, AWAY: 0.8 },
    byGroup: { QB: 3.34, RB: 0.83, FB: 0.83, WR: 0.89, TE: 0.85, OL: 0.65, LB: 0.95, ST: 0.66 },
    weeks: spread({ SHORT: 0.556, LONG: 0.339, MAJOR: 0.105 }),
    playingHurt: { catching: -5, catchInTraffic: -3, ballSecurity: -3, accuracy: -2 },
    // None: a broken hand heals and does not slow him (§5.4).
  },
  foot: {
    part: "foot",
    share: { GAME: 5.94, PRACTICE: 5.9, AWAY: 0.55 },
    byGroup: { QB: 0.62, RB: 0.83, FB: 0.83, WR: 0.89, TE: 0.85, OL: 0.65, LB: 0.95, ST: 0.66 },
    weeks: spread({ SHORT: 0.467, LONG: 0.253, MAJOR: 0.28 }),
    playingHurt: { speed: -3, agility: -3, acceleration: -2 },
    // A Lisfranc or a fracture that needed surgery: a touch slower.
    lasting: { minBand: "MAJOR", body: { forty: 0.01, cone: 0.02 } },
  },
  groin: {
    part: "hip",
    share: { GAME: 7.89, PRACTICE: 11 },
    byGroup: { QB: 0.62, RB: 0.83, FB: 0.83, WR: 0.89, TE: 0.85, OL: 0.65, DB: 1.26, ST: 3.99 },
    weeks: spread({ SHORT: 0.66, LONG: 0.15, MAJOR: 0.19 }),
    playingHurt: { agility: -3, speed: -2, kickPower: -3, puntPower: -3 },
  },
  back: {
    part: "back",
    share: { GAME: 5.63, PRACTICE: 6.7, AWAY: 0.9 },
    byGroup: { QB: 0.62, RB: 0.83, FB: 0.83, WR: 0.89, TE: 1.27, OL: 1.43, LB: 0.95, ST: 0.66 },
    weeks: spread({ SHORT: 0.523, LONG: 0.089, MAJOR: 0.388 }),
    playingHurt: { strength: -3, power: -2, anchor: -2 },
  },
  ribs: {
    part: "chest",
    share: { GAME: 5.49, PRACTICE: 3.3 },
    byGroup: { QB: 2.01, RB: 1.26, FB: 1.26, WR: 0.89, TE: 0.85, OL: 0.65, LB: 0.95, ST: 0.66 },
    weeks: spread({ SHORT: 0.6, LONG: 0.127, MAJOR: 0.273 }),
    playingHurt: { strength: -2, ballSecurity: -2, armStrength: -1 },
  },
  // Away from football only (§5.1): accidents and illness, any week of the year. Per 10,000 player-weeks.
  "car-accident": {
    part: "whole-body",
    share: { AWAY: 1.25 },
    // CHOSEN: the reports never name an accident.
    weeks: [[0, 0, 0.2], [1, 3, 0.3], [4, 8, 0.25], [9, 30, 0.25]],
    playingHurt: { stamina: -3, reaction: -2 },
    repeats: false,
  },
  "bicycle-accident": {
    part: "whole-body",
    share: { AWAY: 0.75 },
    // CHOSEN, like the car's: milder.
    weeks: [[0, 0, 0.3], [1, 3, 0.4], [4, 8, 0.25], [9, 16, 0.05]],
    playingHurt: { stamina: -2, agility: -2 },
    repeats: false,
  },
  fireworks: {
    part: "hand",
    share: { AWAY: 0.5 },
    // CHOSEN, like the car's.
    weeks: [[0, 0, 0.1], [1, 3, 0.3], [4, 8, 0.3], [9, 20, 0.3]],
    playingHurt: { catching: -5, ballSecurity: -3, tackling: -2 },
    // A bad one costs fingers: catching and holding on for good (sizes CHOSEN, tuned in D5).
    lasting: { minBand: "MAJOR", ratings: { catching: -3, ballSecurity: -2, tackling: -2 } },
    repeats: false,
  },
  illness: {
    part: "whole-body",
    // MEASURED rate (INJURY_RATES.away): 14.3 illnesses that cost a game per 10,000 healthy player-weeks, ÷ the 40% below that cost a week.
    share: { AWAY: 35.8 },
    // CHOSEN: the report counts only illnesses that cost a game, not how long.
    weeks: [[0, 0, 0.6], [1, 2, 0.38], [3, 6, 0.02]],
    playingHurt: { stamina: -5 },
    repeats: false,
  },
  // Football kinds the report measures that the first table did not have (added at the end, so the
  // draws of the kinds above keep their order).
  calf: {
    part: "lower-leg",
    share: { GAME: 4.31, PRACTICE: 6, AWAY: 0.55 },
    byGroup: { QB: 0.62, RB: 0.83, FB: 0.83, WR: 0.89, TE: 0.85, OL: 1.38, LB: 0.95, ST: 0.66 },
    weeks: spread({ SHORT: 0.569, LONG: 0.32, MAJOR: 0.111 }),
    playingHurt: { speed: -3, acceleration: -3 },
  },
  quad: {
    part: "thigh",
    share: { GAME: 3.15, PRACTICE: 4.4, AWAY: 0.45 },
    byGroup: { QB: 0.62, RB: 0.83, FB: 0.83, WR: 0.89, TE: 0.85, OL: 0.65, LB: 0.95, ST: 3.08 },
    weeks: spread({ SHORT: 0.635, LONG: 0.297, MAJOR: 0.068 }),
    playingHurt: { speed: -3, acceleration: -2, kickPower: -3 },
  },
  "elbow-arm": {
    part: "arm",
    share: { GAME: 2.58, PRACTICE: 1.8 },
    byGroup: { QB: 0.62, RB: 0.83, FB: 0.83, WR: 0.89, TE: 0.85, OL: 0.65, LB: 0.95, ST: 0.66 },
    weeks: spread({ SHORT: 0.483, LONG: 0.101, MAJOR: 0.416 }),
    playingHurt: { armStrength: -3, catching: -2, tackling: -2 },
  },
};
