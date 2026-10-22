/**
 * ADR-080: the coaching staff's fixed tables. Every number here is CHOSEN (provenance NONE) unless
 * a comment says otherwise, and tuned against the REPORTED NFL turnover in ADR-080 §8 (step C5).
 */
import type { PersonalityType, StaffRole } from "@ff/contracts";

/** The four coaching seats a team has in v1 (ADR-080 Q1). */
export type Seat = "HEAD_COACH" | "OC" | "DC" | "STC";
export const SEATS: readonly Seat[] = ["HEAD_COACH", "OC", "DC", "STC"];
export const COORDINATOR_SEATS: readonly Seat[] = ["OC", "DC", "STC"];

/** A coach's background, read from his scheme family. */
export type Side = "OFFENSE" | "DEFENSE" | "SPECIAL_TEAMS";

export const SEAT_SIDE: Readonly<Record<Exclude<Seat, "HEAD_COACH">, Side>> = {
  OC: "OFFENSE", DC: "DEFENSE", STC: "SPECIAL_TEAMS",
};

export const isSeat = (role: StaffRole): role is Seat =>
  role === "HEAD_COACH" || role === "OC" || role === "DC" || role === "STC";

/** Scheme families. The id goes in `StaffState.schemeFamily`; the side is looked up here, never parsed. */
export const SCHEMES: Readonly<Record<string, { name: string; side: Side }>> = {
  OFF_WEST_COAST: { name: "West Coast", side: "OFFENSE" },
  OFF_AIR_CORYELL: { name: "Air Coryell", side: "OFFENSE" },
  OFF_ERHARDT_PERKINS: { name: "Erhardt-Perkins", side: "OFFENSE" },
  OFF_SPREAD: { name: "Spread", side: "OFFENSE" },
  OFF_OUTSIDE_ZONE: { name: "Outside zone and play-action", side: "OFFENSE" },
  OFF_POWER_RUN: { name: "Power run", side: "OFFENSE" },
  DEF_43_OVER: { name: "4-3 Over", side: "DEFENSE" },
  DEF_34_TWO_GAP: { name: "3-4 two-gap", side: "DEFENSE" },
  DEF_34_ONE_GAP: { name: "3-4 one-gap", side: "DEFENSE" },
  DEF_NICKEL_425: { name: "Nickel 4-2-5", side: "DEFENSE" },
  DEF_TAMPA_2: { name: "Tampa 2", side: "DEFENSE" },
  DEF_TWO_HIGH_MATCH: { name: "Two-high match", side: "DEFENSE" },
  DEF_SINGLE_HIGH: { name: "Single-high Cover 3", side: "DEFENSE" },
  ST_SPECIAL_TEAMS: { name: "Special teams", side: "SPECIAL_TEAMS" },
};

export const SCHEMES_BY_SIDE: Readonly<Record<Side, readonly string[]>> = {
  OFFENSE: Object.keys(SCHEMES).filter((k) => SCHEMES[k]!.side === "OFFENSE"),
  DEFENSE: Object.keys(SCHEMES).filter((k) => SCHEMES[k]!.side === "DEFENSE"),
  SPECIAL_TEAMS: Object.keys(SCHEMES).filter((k) => SCHEMES[k]!.side === "SPECIAL_TEAMS"),
};

/** What each seat values (ADR-080 §4). Weights sum to 1. */
export const SEAT_WEIGHTS: Readonly<Record<Seat, Readonly<Record<string, number>>>> = {
  HEAD_COACH: {
    situationalJudgment: 0.15, culture: 0.15, gamePlanning: 0.10, inGameAdjustment: 0.10,
    motivation: 0.10, staffDevelopment: 0.10, talentEvaluation: 0.10, playCalling: 0.05,
    schemeDesign: 0.05, mediaHandling: 0.05, politics: 0.05,
  },
  OC: {
    gamePlanning: 0.20, playCalling: 0.20, schemeDesign: 0.15, inGameAdjustment: 0.15,
    teaching: 0.15, development: 0.10, situationalJudgment: 0.05,
  },
  DC: {
    gamePlanning: 0.20, playCalling: 0.20, schemeDesign: 0.15, inGameAdjustment: 0.15,
    teaching: 0.15, development: 0.10, situationalJudgment: 0.05,
  },
  STC: {
    teaching: 0.30, development: 0.20, gamePlanning: 0.20, motivation: 0.15, situationalJudgment: 0.15,
  },
};

/** Spec #11 §5 style match: coach type (row) against player type (column). Starting values (ADR-080 §5). */
export const STYLE_MATCH: Readonly<Record<PersonalityType, Readonly<Record<PersonalityType, number>>>> = {
  demanding:    { demanding: 0.4, playersCoach: -0.4, cerebral: 0.2, fiery: 0.1, quiet: -0.3 },
  playersCoach: { demanding: -0.2, playersCoach: 0.4, cerebral: 0, fiery: 0.1, quiet: 0.3 },
  cerebral:     { demanding: 0.1, playersCoach: -0.1, cerebral: 0.4, fiery: -0.3, quiet: 0.2 },
  fiery:        { demanding: 0.1, playersCoach: -0.1, cerebral: -0.3, fiery: 0.4, quiet: -0.3 },
  quiet:        { demanding: -0.1, playersCoach: 0.2, cerebral: 0.2, fiery: -0.2, quiet: 0.3 },
};

export const PERSONALITY_SHARES: readonly (readonly [PersonalityType, number])[] = [
  ["demanding", 0.25], ["playersCoach", 0.25], ["cerebral", 0.2], ["fiery", 0.15], ["quiet", 0.15],
];

/** The knobs. Grouped by the ADR-080 section that uses them. */
export const STAFF_TUNING = {
  // §4 ratings: skill = base + talent + spread, clamped 1..99. Fixed for a career in this build,
  // so a coach's age at creation does not lift them (or the old would outrank the young for good).
  ratingBase: 46,
  ratingTalentSd: 7,
  ratingSpreadSd: 9,

  // §3 the pool. The NFL has about 8 position coaches a team; they are where most coordinators
  // come from, so they are most of the pool.
  poolTarget: 300,
  positionCoachesPerTeamAtStart: 5,
  collegePrograms: 60,
  /** Share of new young coaches who start as NFL position coaches; the rest start in college. */
  newCoachNflShare: 0.75,
  /** Side of a new NFL position coach: offence, defence, special teams. */
  newCoachSideShares: [["OFFENSE", 0.45], ["DEFENSE", 0.45], ["SPECIAL_TEAMS", 0.1]] as readonly (readonly [Side, number])[],

  // §6 firing: logit = base + slope × shortfall + ...
  hcFireBase: -1.2,
  hcFireShortfall: 9,
  hcFireTrend: 4,
  hcFireCredit: 3,
  hcFireCreditDecay: 0.7,
  hcFirePlayoffTrip: 1.2,
  hcFirePerPlayoffWin: 0.5,
  hcHoneymoon: [1.6, 0.8, 0.25] as readonly number[],
  politicsShield: 0.35,
  contractEndFactor: 1.5,
  coordFireBase: -1.75,
  coordFireUnitRank: 3,
  coordScapegoat: 1.0,
  coordHoneymoon: 0.8,
  /** New head coach keeps an inherited coordinator with this chance, plus the terms below. */
  newHcKeepBase: 0.3,
  newHcKeepTree: 0.25,
  newHcKeepGoodUnit: 0.15,

  // §6 retirement by age (lower bound of band -> chance a year); out-of-work drift.
  retireByAge: [[0, 0.003], [55, 0.015], [60, 0.05], [65, 0.15], [70, 0.35], [75, 0.7]] as readonly (readonly [number, number])[],
  outOfWorkYearsToDrift: 3,
  outOfWorkDrift: 0.5,

  // §7 hiring.
  hcShortlist: 10,
  coordShortlist: 6,
  /**
   * Share of former NFL head coaches who will ever take a coordinator job again (one roll per coach,
   * kept for life). The rest sit out on the old contract's money, take TV or consulting work, or
   * wait for another head job (head coach searches still see them).
   */
  exHcStepDown: 0.3,
  treeShortlistMax: 4,
  /** Interview error (1 SD, rating points) = min + span × (1 - talentEvaluation / 100). */
  interviewErrorMin: 3,
  interviewErrorSpan: 15,
  /** Reputation buzz: a noisy hint of true seat skill that insiders hear. */
  buzzWeight: 0.4,
  buzzNoiseSd: 4,
  resumeRecency: 0.75,
  resumeCollegeWeight: 0.35,
  /** A college record is also read closer to .500: a strong programme makes anyone look good. */
  resumeCollegeValueScale: 0.25,
  resumeShrink: 1.5,
  /** Rating points per win-share point of performance above expectation. */
  resumeScale: 80,
  publicRosterCorrection: 0.25,
  experience: {
    hcPerYear: 0.4, hcCap: 2,
    nflCoordPerYear: 0.5, nflCoordCap: 2.5,
    collegeHcPerYear: 0.3, collegeHcCap: 1.5,
    positionPerYear: 0.3, positionCap: 1.5,
  },
  fitPoints: 4,
  treeBonus: 3,
  /** A head coach let go by his last NFL team carries a stigma in head coach searches (rating points). */
  firedHcStigmaRecent: 8,
  firedHcStigmaYears: 4,
  firedHcStigmaLater: 6,
  /**
   * Head coach searches lean to offensive minds and away from special teams coaches, by background
   * (rating points): the REPORTED hires since 2005 are 28% offensive and 19% defensive coordinators.
   * A league-wide lean for now; Spec #12's fashion layer may replace it.
   */
  hcSideLean: { OFFENSE: 4, DEFENSE: 0, SPECIAL_TEAMS: -3 } as Readonly<Record<Side, number>>,
  /** A head coach candidate who has never run a unit or a college programme (rating points). */
  hcUnprovenPenalty: 5,
  /** ... and one who has run them only in college. */
  hcCollegeOnlyPenalty: 2,
  /** Rating points per unit-rank step for a coordinator's résumé line (rank 1 = +scale/2). */
  unitValueScale: 0.4,
  hcAgeFrom: 52,
  coordAgeFrom: 58,
  agePenaltyPerYear: 0.6,

  // §7.5 contracts (dollars). Salary = floor + span × quality, quality in 0..1 from the judgement.
  salary: {
    HEAD_COACH: { floor: 4_000_000, span: 12_000_000 },
    OC: { floor: 1_000_000, span: 3_000_000 },
    DC: { floor: 1_000_000, span: 3_000_000 },
    STC: { floor: 800_000, span: 1_200_000 },
  } as Readonly<Record<Seat, { floor: number; span: number }>>,
  extensionYears: { HEAD_COACH: 3, OC: 2, DC: 2, STC: 2 } as Readonly<Record<Seat, number>>,
  extensionRaise: 1.1,
  defaultStaffBudget: 45_000_000,

  // §8 stand-in results.
  standIn: {
    unitSd: 0.17,
    persistence: 0.6,
    hcEffect: 0.03,
    coordEffect: 0.015,
    stcEffect: 0.005,
    unitNoiseSd: 0.06,
    games: 17,
    collegeGames: 12,
    collegeProgramSd: 0.2,
    collegeHcEffect: 0.05,
    /** Seat scores are read as z = (score - reference) / 7 for the coaching nudge. */
    hcReference: 59,
    coordReference: 55,
  },
  historySeasons: 20,

  // §8.1 the disguise habit (ADR-075 Q2: 10%-55%, league mean 31.5%).
  disguiseMean: 0.315,
  disguiseSd: 0.09,
  disguiseMin: 0.10,
  disguiseMax: 0.55,
} as const;

export const FIRST_NAMES: readonly string[] = [
  "Aaron", "Adam", "Alan", "Andre", "Andrew", "Anthony", "Austin", "Ben", "Bobby", "Brad", "Brandon", "Brent",
  "Brian", "Bruce", "Calvin", "Carl", "Chad", "Charles", "Chris", "Clay", "Cody", "Cole", "Corey", "Craig",
  "Curtis", "Dale", "Damon", "Dan", "Darnell", "Darren", "Dave", "Dennis", "Derek", "Derrick", "Don", "Doug",
  "Drew", "Dwayne", "Earl", "Eddie", "Eric", "Frank", "Gary", "Glenn", "Greg", "Hank", "Isaac", "Jack",
  "Jake", "Jamal", "James", "Jason", "Jeff", "Jerome", "Jim", "Joe", "Joel", "John", "Jon", "Jordan",
  "Josh", "Keith", "Ken", "Kevin", "Kurt", "Lamar", "Lance", "Larry", "Leon", "Luke", "Marcus", "Mark",
  "Matt", "Maurice", "Mike", "Mitch", "Nate", "Neil", "Nick", "Omar", "Pat", "Paul", "Pete", "Phil",
  "Ray", "Reggie", "Rick", "Rob", "Rod", "Ron", "Ross", "Russ", "Sam", "Scott", "Sean", "Shane",
  "Steve", "Terrell", "Terry", "Tim", "Todd", "Tom", "Tony", "Travis", "Trent", "Troy", "Tyler", "Vance",
  "Victor", "Walt", "Wayne", "Will", "Zach",
];

export const LAST_NAMES: readonly string[] = [
  "Abbott", "Acosta", "Aldridge", "Ambrose", "Archer", "Ashby", "Atwood", "Bain", "Barlow", "Barton",
  "Beckett", "Bishop", "Blair", "Booker", "Boone", "Bowen", "Bradford", "Brennan", "Briggs", "Burke",
  "Burton", "Calder", "Carver", "Chandler", "Cobb", "Coleman", "Collier", "Conway", "Crane", "Crawford",
  "Cross", "Dalton", "Daniels", "Davenport", "Dawson", "Decker", "Delaney", "Dixon", "Donovan", "Doyle",
  "Drake", "Dunn", "Easton", "Ellison", "Emery", "Farley", "Farrow", "Fleming", "Ford", "Foster",
  "Gaines", "Gentry", "Gibson", "Graves", "Greer", "Hale", "Hammond", "Hardin", "Harper", "Hayes",
  "Hendricks", "Hollis", "Holt", "Hooper", "Hudson", "Ingram", "Jarvis", "Jennings", "Keane", "Keller",
  "Kendall", "Kirby", "Knox", "Lambert", "Lane", "Langley", "Lawson", "Lowry", "Lyons", "Maddox",
  "Malone", "Marsh", "Mathis", "Maxwell", "Mercer", "Merritt", "Monroe", "Morrow", "Nash", "Norris",
  "Oakes", "Ogden", "Owens", "Parrish", "Pearce", "Pierce", "Porter", "Pratt", "Quarles", "Ramsey",
  "Rankin", "Reese", "Rhodes", "Riggs", "Rollins", "Rowe", "Sampson", "Sawyer", "Sexton", "Shaw",
  "Shelton", "Sloan", "Snyder", "Sparks", "Stanton", "Steele", "Stokes", "Strickland", "Sutton", "Talbot",
  "Tate", "Thornton", "Tolbert", "Truman", "Tucker", "Vaughn", "Walker", "Watts", "Webb", "Whitaker",
  "Wilder", "Wolfe", "Wyatt", "Yates",
];

/** Made-up college programmes for résumés. No real school is meant. */
export const COLLEGE_PROGRAMS: readonly string[] = [
  "Ashgrove State", "Bellmont University", "Briarwood Tech", "Carrow State", "Dunmere College",
  "Eastvale University", "Fallbrook State", "Glenhollow Tech", "Hartwell State", "Ironbridge University",
  "Juniper Valley State", "Kestrel Point College", "Larkspur University", "Millbrook State", "Northmoor Tech",
  "Oakhurst University", "Pellston State", "Quarry Hill College", "Redfern University", "Saltmarsh State",
  "Thornfield Tech", "Upland Plains University", "Valemont State", "Westbrook College", "Yarrow State",
  "Zephyr Coast University", "Amberly State", "Blackwater Tech", "Caddo Ridge University", "Driftwood State",
  "Elk Hollow College", "Foxmoor University", "Granger Plains State", "Hollins Bay Tech", "Isleton State",
  "Jasper Falls University", "Kingsley State", "Lowmoor College", "Marrow Creek University", "Newhaven Tech",
  "Orchard Valley State", "Pinemont University", "Ravensworth State", "Silverbend College", "Tallgrass University",
  "Umber Lake State", "Verity Tech", "Willowmere University", "Wrenfield State", "Yellowpine College",
  "Ardent Hills University", "Bramblewood State", "Copperfield Tech", "Deerhaven University", "Emberly State",
  "Frostvale College", "Gullwing University", "Highcastle State", "Ironwood Tech", "Lantern Bay University",
];
