/**
 * The development week's numbers (ADR-087 §2.2, §2.3, §3, §4). Every number here is CHOSEN, provenance
 * NONE, a starting value tuned in D5 (ADR-087's provenance table: "every number in this note's
 * examples and splits ... chosen for illustration"), except where a line cites the ADR or a ruling.
 *
 * Units, unless a line says otherwise:
 * - rating points a year, for a player whose learning rate is 1 (a rookie) and whose growth rate is 1
 *   (typical): the development week scales them by both;
 * - shares of a year, which the week divides by the phase's length (`phaseWeeks`), so that changing a
 *   phase's length moves when a change lands but not how much lands in a year (§4.1);
 * - body measurements in their own units: seconds for the 40 and 3-cone, inches for the vertical,
 *   reps for the bench, pounds for weight.
 *
 * The target magnitudes the numbers are set for (the build brief's, CHOSEN, D5 tunes them), for a
 * typical player under average coaching, in his position's core skills, over a year: a rookie starter
 * about +4, a second-year player about +3, at 26 about +1.5, at 28-29 about +0.5, from 31 about -1,
 * from 34 about -2; a backup about 70% of a starter. `test/players.development.test.ts` prints them.
 */
import type { CalendarPhase, Position } from "@ff/contracts";
import type { RatingGroup } from "./types.js";

// ---------------------------------------------------------------------------------------------
// §2.3 The rating groups: what moves each rating.
// ---------------------------------------------------------------------------------------------

/**
 * Every active registry rating, by group, plus `disguise` (ADR-075 T7) for when the registry adds it.
 * The groups are ADR-087 §2.3's table. `gapDiscipline` is not named there (the ADR counts one
 * "knowledge" rating; the registry has two): it sits with `footballIQ`, the other knowledge rating, in
 * SMARTS, since staying in his gap is learned from snaps as much as from drills.
 */
export const GROUP_MEMBERS: Readonly<Record<RatingGroup, readonly string[]>> = {
  /** Only his body moves them (aging, workouts, an injury's lasting mark), so they always agree with his 40 (ADR-079). */
  BODY: ["speed", "agility", "jumping", "strength"],
  /** The body's change (body.ts `FOLLOWS`) plus `SKILL_INPUTS.bodyPracticeShare` of the skill gains. */
  BODY_PRACTICE: ["acceleration", "mobility", "firstStep", "pursuit", "power", "anchor"],
  /** Their own age curves (`OWN_CURVES`). */
  OWN_CURVE: ["armStrength", "kickPower", "puntPower", "stamina", "durability"],
  /** The weekly inputs; they fade in the 30s (`SKILL_FADE`). */
  SKILL: [
    "accuracy", "touch", "improvisation", "release",
    "passBlock", "runBlock", "footwork", "sustain", "pullSkill",
    "passRush", "runStuff", "powerMove", "finesseMove", "blockShed",
    "tackling", "zoneCoverage", "manCoverage", "press", "ballSkills",
    "routeRunning", "releaseWR", "catching", "catchInTraffic", "spectacularCatch", "yac",
    "elusiveness", "ballSecurity", "kickAccuracy", "puntHangTime",
    "disguise",
  ],
  /** The weekly inputs plus his snaps directly (`SMARTS_SNAPS`); they fade later and slower (`SMARTS_FADE`). */
  SMARTS: [
    "awareness", "reaction", "decisionMaking", "pocketPatience", "poise",
    "playRecognition", "instincts", "vision", "patience", "footballIQ", "gapDiscipline",
  ],
  /** Personality: they wait for Spec #14 and never move here. */
  FIXED: ["volatility", "discipline"],
};

/** Each rating's group (§2.3), read from `GROUP_MEMBERS`. */
export const RATING_GROUPS: Readonly<Record<string, RatingGroup>> = Object.fromEntries(
  (Object.entries(GROUP_MEMBERS) as [RatingGroup, readonly string[]][]).flatMap(([group, ids]) => ids.map((id) => [id, group])),
);

// ---------------------------------------------------------------------------------------------
// §2.2 The learning rate.
// ---------------------------------------------------------------------------------------------

/**
 * The learning rate (§2.2): `floor + (1 - floor) × ½^(years past fullUntilAge / ageHalfLife) ×
 * ½^(credited seasons / seasonHalfLife)`. 1 for a rookie of 22 or younger, about 0.76 in his second
 * season, about 0.36 at 26, about 0.2 at 28-29, and never below the floor. Seasons weigh more than
 * age, so a rookie who comes in at 24 (about 0.81) learns faster than a second-year man of 23.
 * CHOSEN (tuned in D5).
 */
export const LEARNING_RATE = {
  /** The lowest it goes: a veteran still learns a little. A share of a rookie's rate. */
  floor: 0.1,
  /** Years of age: up to here, age does not slow learning. */
  fullUntilAge: 22,
  /** Years of age past `fullUntilAge` that halve the part above the floor. */
  ageHalfLife: 6,
  /** Credited seasons that halve the part above the floor. */
  seasonHalfLife: 3.5,
} as const;

// ---------------------------------------------------------------------------------------------
// §2.3 The weekly inputs to SKILL, SMARTS and BODY_PRACTICE.
// ---------------------------------------------------------------------------------------------

/**
 * The sizes of practice and playing time, and how much of them the body-plus-practice ratings take.
 * A starter's year is practice + play, about 4 points for a rookie; a backup who does not play gets the
 * practice alone, about 70% (the brief's "a starter gains a little more than a backup", Q3).
 * CHOSEN (tuned in D5).
 */
export const SKILL_INPUTS = {
  /** Points a year from a full year's practice (every practice phase, `practiced` 1). */
  practicePointsPerYear: 2.8,
  /** Points a year from playing every snap of every regular-season game; a week gives this × playShare / gamesPerSeason. */
  playPointsPerYear: 1.2,
  /** A rookie's OTA weeks count this many times over (rookie minicamp, the install; §3: "larger for rookies"). */
  rookieOtaFactor: 1.5,
  /** The share of the skill gains that acceleration, mobility, firstStep, pursuit, power and anchor take (§2.3: "a smaller share"). */
  bodyPracticeShare: 0.4,
} as const;

/**
 * A year's practice, by phase, as a share (§3). Camp is the heaviest per week (0.10 a week), then the
 * spring programme and preseason (about 0.045), then in-season practice (about 0.021). The shares of a
 * year without the playoffs add to 1; a playoff team practises on at the in-season weekly rate. Phases
 * with no team practice are absent. The order (camp heaviest, in-season light) is ADR-087 §3's; the
 * shares are CHOSEN (tuned in D5).
 */
export const PRACTICE_SHARES: Readonly<Partial<Record<CalendarPhase, number>>> = {
  OFF_ROOKIES_OTAS: 0.18,
  TRAINING_CAMP: 0.3,
  PRESEASON: 0.14,
  REGULAR_SEASON: 0.38,
  PLAYOFFS: 0.1,
};

/**
 * Coaching (Q4, §2.3): the coordinator's `development` (0..100; absent = `neutral`) adds
 * `(skill - neutral) × pointsPerYearBestVsWorst / (best - worst)` points a year, spread over the year by
 * the practice shares and scaled by `practiced`, so a coach adds nothing in a week his player does not
 * practise. The ADR's size: the best against the worst is worth about one point a year on a young player.
 */
export const COACHING = {
  /** Points a year between a coach of `best` and one of `worst`, at learning rate 1. ADR-087 §2.3's "about one rating point a year". */
  pointsPerYearBestVsWorst: 1.0,
  best: 90,
  worst: 10,
  /** A skill that adds nothing, and the reading of an absent one (the brief: absent = 50). */
  neutral: 50,
  /** The coach rating scale (`PlayerWeek.coachDevelopment`, `dcTeaching`: 0..100); a value outside it is read at the nearer end. */
  scale: { min: 0, max: 100 },
} as const;

/**
 * Performance (§2.3): each rating he used in one-on-one checks moves by
 * `pointsPerWeekAtFullMargin × (won - lost) / (won + lost) × min(1, (won + lost) / contestsForFullWeight)`,
 * × learning rate × growth. Winning every check in a full week is worth this many points; losing every
 * one, as much down. A rookie corner who wins three in four of 8+ checks a week over 17 games gains about
 * 0.7 of a point more in the ratings he used; a veteran, less. CHOSEN (tuned in D5).
 */
export const PERFORMANCE = {
  /** Points a week, at learning rate 1. */
  pointsPerWeekAtFullMargin: 0.08,
  /** Checks in a week that count fully; fewer count in proportion. */
  contestsForFullWeight: 8,
} as const;

/**
 * Wobble (§2.3): a seeded step each week for each rating the inputs move, drawn evenly between ±a, with
 * `a` set so a year of them spreads by `yearlySd` points (a = yearlySd × √3 / √weeks in the year). Not
 * scaled by learning rate or growth: it is the week going well or badly, at any age. CHOSEN (the
 * brief's "about 1 point of yearly spread"; tuned in D5).
 */
export const WOBBLE = {
  /** Points: the standard deviation of a year's wobble, for one rating. The brief's "about 1 point of yearly spread". */
  yearlySd: 1,
} as const;

/**
 * Smarts learn from snaps directly (§2.3: "the inputs below plus career snaps directly"): each week's
 * snaps add this many points per thousand, × growth but not × learning rate, so the clever old safety
 * keeps rising after his learning has slowed. A starter plays about 1,100 snaps a year. CHOSEN (tuned in D5).
 */
export const SMARTS_SNAPS = {
  /** Points per 1,000 snaps. */
  pointsPerThousandSnaps: 0.6,
} as const;

// ---------------------------------------------------------------------------------------------
// Age curves: points a year by age, read by straight lines between the listed ages and held flat
// beyond the ends.
// ---------------------------------------------------------------------------------------------

/** `[age, value]` pairs in rising age order. */
export type AgeCurve = readonly (readonly [number, number])[];

/**
 * Skills fade in the 30s (§2.3: "as learning slows and the body declines"): points a year lost at each
 * age, spread over the year by `AGING_SHARES`. Set so that net of a starter's gains a core skill moves
 * about +0.5 at 28-29, -1 from 31 and -2 from 34. One curve for every position. CHOSEN (tuned in D5).
 */
export const SKILL_FADE: AgeCurve = [[27, 0], [28, 0.3], [29, 0.45], [30, 1.0], [31, 1.6], [32, 1.75], [34, 2.5], [38, 3.5]];

/** Smarts fade later and slower, so they keep rising into the early 30s (§2.3). Points a year. CHOSEN (tuned in D5). */
export const SMARTS_FADE: AgeCurve = [[29, 0], [31, 0.6], [33, 1.2], [36, 2.0], [40, 3.0]];

/**
 * The own-curve ratings (§2.3), points a year by age, spread over the year by `AGING_SHARES`. They grow
 * a little while young (gains are × growth); the arm holds into the late 30s, the kicking leg into the
 * 40s, stamina fades in the 30s, durability falls with age (repeat injuries are injuries.ts's, D3). The
 * shapes are §2.3's; the sizes and ages CHOSEN (tuned in D5).
 */
export const OWN_CURVES: Readonly<Record<"armStrength" | "kickPower" | "puntPower" | "stamina" | "durability", AgeCurve>> = {
  armStrength: [[21, 1.0], [25, 0.5], [28, 0], [36, 0], [38, -1], [41, -2.5]],
  kickPower: [[21, 1.0], [25, 0.5], [28, 0], [39, 0], [42, -1], [45, -2]],
  puntPower: [[21, 1.0], [25, 0.5], [28, 0], [39, 0], [42, -1], [45, -2]],
  stamina: [[21, 0.5], [25, 0.3], [28, 0], [30, -0.5], [33, -1.5], [36, -2.5]],
  durability: [[26, 0], [28, -0.3], [30, -0.8], [33, -1.5], [36, -2.5]],
};

// ---------------------------------------------------------------------------------------------
// §4 Aging.
// ---------------------------------------------------------------------------------------------

/**
 * §4.1: the share of a year's aging that lands in each phase. About three quarters land in the 23
 * offseason weeks (0.75 here), a quarter over camp, preseason, the season and the playoffs, for
 * everyone, by the calendar. The shares add to 1; a week takes its phase's share / `phaseWeeks`. Also
 * spreads the skill and smarts fades and the own curves, which are aging too. CHOSEN (the ADR's 75/25).
 */
export const AGING_SHARES: Readonly<Record<CalendarPhase, number>> = {
  TRAINING_CAMP: 0.026,
  PRESEASON: 0.026,
  REGULAR_SEASON: 0.155,
  PLAYOFFS: 0.043,
  OFF_EVAL: 0.13,
  OFF_RESET_FA: 0.16,
  OFF_DRAFT: 0.13,
  OFF_ROOKIES_OTAS: 0.13,
  OFF_SUMMER: 0.2,
};

/**
 * How one position's body ages (§4.2). `peak`: the last age at which the body does not lose; in the year
 * he is `peak + n` it loses `n × perYearPast` (n capped at `MAX_YEARS_PAST_PEAK`), so the decline
 * speeds up. The bench (strength) has its own peak, later for linemen ("strength holding longer").
 * Units: seconds (forty, cone), inches (vertical), reps (bench), per year past the peak.
 */
export interface AgingProfile {
  readonly peak: number;
  readonly strengthPeak: number;
  readonly perYearPast: { readonly forty: number; readonly cone: number; readonly vertical: number; readonly bench: number };
}

/** The decline stops speeding up this many years past the peak. Years. CHOSEN (tuned in D5b against real careers). */
export const MAX_YEARS_PAST_PEAK = 8;

/**
 * By position (§4.2). Only the order is REPORTED (approximate: "public aging-curve studies", ADR-087's
 * provenance table, running backs earliest, quarterbacks and kickers latest; checked in D5b against
 * nflverse); the peak ages are the brief's and, with the slopes, CHOSEN (tuned in D5). The running back
 * peaks earliest and steepest: with this
 * curve and the workouts below his 40 goes about 4.45 at 24, 4.46 at 28, 4.50 at 29, 4.57 at 30
 * (ADR-087 §4.2's example: 4.45, 4.47, 4.51, 4.57). Then receivers and corners (27), safeties and
 * linebackers (28), tight ends and edge rushers (28), linemen (29, strength to 31), quarterbacks (30,
 * his feet); kickers', punters' and snappers' bodies barely matter.
 */
const RB: AgingProfile = { peak: 25, strengthPeak: 26, perYearPast: { forty: 0.018, cone: 0.019, vertical: 0.6, bench: 0.3 } };
const FB: AgingProfile = { peak: 26, strengthPeak: 28, perYearPast: { forty: 0.015, cone: 0.016, vertical: 0.5, bench: 0.3 } };
const WR_CB: AgingProfile = { peak: 27, strengthPeak: 28, perYearPast: { forty: 0.014, cone: 0.015, vertical: 0.5, bench: 0.3 } };
const S_LB: AgingProfile = { peak: 28, strengthPeak: 29, perYearPast: { forty: 0.013, cone: 0.014, vertical: 0.45, bench: 0.3 } };
const TE_EDGE: AgingProfile = { peak: 28, strengthPeak: 30, perYearPast: { forty: 0.012, cone: 0.013, vertical: 0.4, bench: 0.3 } };
const LINE: AgingProfile = { peak: 29, strengthPeak: 31, perYearPast: { forty: 0.011, cone: 0.012, vertical: 0.35, bench: 0.25 } };
const QB: AgingProfile = { peak: 30, strengthPeak: 30, perYearPast: { forty: 0.011, cone: 0.012, vertical: 0.35, bench: 0.25 } };
const KICKER: AgingProfile = { peak: 30, strengthPeak: 30, perYearPast: { forty: 0.006, cone: 0.006, vertical: 0.2, bench: 0.15 } };

export const AGING_PROFILES: Readonly<Record<Position, AgingProfile>> = {
  QB, RB, FB, WR: WR_CB, TE: TE_EDGE,
  LT: LINE, LG: LINE, C: LINE, RG: LINE, RT: LINE,
  DE: TE_EDGE, DT: LINE, NT: LINE,
  OLB: S_LB, MLB: S_LB, ILB: S_LB,
  CB: WR_CB, FS: S_LB, SS: S_LB,
  K: KICKER, P: KICKER, LS: KICKER,
};

// ---------------------------------------------------------------------------------------------
// §3, §4.2 Workouts.
// ---------------------------------------------------------------------------------------------

/**
 * A year of workouts at 22 or younger, at growth 1, in the measurements' units (§4.2: "a few hundredths
 * off his 40", more vertical and bench; weight drifts up a little). × `WORKOUT_AGE` and × growth.
 * CHOSEN (tuned in D5).
 */
export const WORKOUTS = {
  forty: -0.02,
  cone: -0.02,
  vertical: 0.6,
  bench: 1.5,
  weightLb: 1.5,
} as const;

/**
 * Workouts shrink with age (§4.2): a share of `WORKOUTS` by age. Past his peak they add less than age
 * takes away (a receiver at 28: 0.007 s off his 40 against 0.014 s on). CHOSEN (tuned in D5).
 */
export const WORKOUT_AGE: AgeCurve = [[22, 1], [25, 0.6], [28, 0.35], [32, 0.2], [36, 0.1]];

/**
 * A year's workouts by phase, as shares (§3's table): the 13 early offseason weeks and the spring
 * programme work out fully (0.05 a week), the summer lightly (0.025 a week). They apply to everyone,
 * with a team or not. Camp, preseason and the season are practice instead. Which phases hold workouts
 * is §3's; the shares are CHOSEN (tuned in D5).
 */
export const WORKOUT_SHARES: Readonly<Partial<Record<CalendarPhase, number>>> = {
  OFF_EVAL: 0.2,
  OFF_RESET_FA: 0.25,
  OFF_DRAFT: 0.2,
  OFF_ROOKIES_OTAS: 0.2,
  OFF_SUMMER: 0.15,
};

/**
 * A player on his own while the season runs (a free agent, or his team's season is over) keeps working
 * out at a maintenance rate, half the summer's weekly rate (0.0125 a week). Shares of a year by phase.
 * §3 gives him "workouts"; the rate is CHOSEN (tuned in D5).
 */
export const ON_OWN_WORKOUT_SHARES: Readonly<Partial<Record<CalendarPhase, number>>> = {
  TRAINING_CAMP: 0.0375,
  PRESEASON: 0.0375,
  REGULAR_SEASON: 0.225,
  PLAYOFFS: 0.0625,
};

// ---------------------------------------------------------------------------------------------
// ADR-075 T7: disguise.
// ---------------------------------------------------------------------------------------------

/**
 * `disguise` grows in ADR-075 §4.6's windows (owner Q7: spring about a quarter, camp about half, the
 * season about a quarter; RULED), with no growth in a week he does not practise. Its practice is the
 * whole of a starter's skill year (`practicePointsPerYear + playPointsPerYear`, live snaps in disguised
 * looks included) spread by these shares, and its coach is the DC's `teaching` (ADR-075 Q4, RULED), read
 * like `COACHING`. The playoffs carry on at the season's weekly rate. The window shares are RULED (about
 * a quarter, a half, a quarter); the playoff share and the yearly size are CHOSEN (tuned in D5).
 */
export const DISGUISE_WINDOWS: Readonly<Partial<Record<CalendarPhase, number>>> = {
  OFF_ROOKIES_OTAS: 0.25,
  TRAINING_CAMP: 0.5,
  REGULAR_SEASON: 0.25,
  PLAYOFFS: 0.07,
};

// ---------------------------------------------------------------------------------------------
// Events.
// ---------------------------------------------------------------------------------------------

/**
 * The precision a body measure is reported at in RATINGS_CHANGED (the brief): steps per unit. The 40 and
 * 3-cone to 0.01 s, the vertical to 0.5 in, the bench to 1 rep, weight to 1 lb. A week's entry exists
 * only when the reported value changed; the full-precision body stays in `development.body`.
 */
export const REPORTING_STEPS_PER_UNIT = {
  forty: 100,
  cone: 100,
  vertical: 2,
  bench: 1,
  weightLb: 1,
} as const;
